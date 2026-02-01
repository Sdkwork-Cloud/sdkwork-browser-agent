/**
 * 世界模型 (World Model) - 智能体的"大脑皮层"
 * 
 * 实现基于 MuZero/Dreamer 架构的世界模型，提供：
 * 1. 状态表示学习 (State Representation Learning)
 * 2. 动力学预测 (Dynamics Prediction) 
 * 3. 奖励预测 (Reward Prediction)
 * 4. 想象训练 (Imagination Training)
 * 5. 反事实推理 (Counterfactual Reasoning)
 * 
 * 这是智能体从"反应式"跃迁到"预测式"智能的核心组件
 */

import { AgentEventEmitter as EventEmitter } from '../agent/event-system';
import { isBrowser, getEnvironment, environment } from '../utils/environment';

// ============================================
// 核心类型定义
// ============================================

export interface WorldModelConfig {
  /** 状态空间维度 */
  stateDimension: number;
  /** 动作空间维度 */
  actionDimension: number;
  /** 隐藏层维度 */
  hiddenDimension: number;
  /** 想象轨迹长度 */
  imaginationHorizon: number;
  /** 想象批次大小 */
  imaginationBatchSize: number;
  /** 折扣因子 */
  discountFactor: number;
  /** 学习率 */
  learningRate: number;
  /** 经验回放缓冲区大小 */
  replayBufferSize: number;
  /** 是否使用递归状态空间模型 */
  useRSSM: boolean;
  /** 是否使用离散潜在变量 */
  useDiscreteLatents: boolean;
  /** 离散类别数量 */
  numCategories: number;
}

export interface State {
  /** 确定性状态 (h) */
  deterministic: number[];
  /** 随机状态 (s) - 潜在表示 */
  stochastic: number[];
  /** 时间戳 */
  timestamp: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

export interface Action {
  /** 动作ID */
  id: string;
  /** 动作类型 */
  type: string;
  /** 动作参数 */
  parameters: Record<string, unknown>;
  /** 动作嵌入向量 */
  embedding?: number[];
}

export interface Observation {
  /** 原始观察数据 */
  raw: unknown;
  /** 特征向量 */
  features: number[];
  /** 时间戳 */
  timestamp: number;
}

export interface Transition {
  /** 当前状态 */
  state: State;
  /** 执行的动作 */
  action: Action;
  /** 下一个观察 */
  nextObservation: Observation;
  /** 奖励 */
  reward: number;
  /** 是否终止 */
  done: boolean;
  /** 时间戳 */
  timestamp: number;
}

export interface ImaginedTrajectory {
  /** 起始状态 */
  initialState: State;
  /** 动作序列 */
  actions: Action[];
  /** 预测的状态序列 */
  predictedStates: State[];
  /** 预测的奖励序列 */
  predictedRewards: number[];
  /** 预测的价值序列 */
  predictedValues: number[];
  /** 累积回报 */
  cumulativeReturn: number;
  /** 是否预测终止 */
  predictedDone: boolean;
}

export interface CounterfactualScenario {
  /** 原始历史 */
  originalHistory: Transition[];
  /** 干预点索引 */
  interventionPoint: number;
  /** 替代动作 */
  alternativeAction: Action;
  /** 预测的未来轨迹 */
  predictedTrajectory: ImaginedTrajectory;
  /** 与原始结果的对比 */
  comparison: {
    originalReward: number;
    counterfactualReward: number;
    difference: number;
    percentChange: number;
  };
}

// ============================================
// 递归状态空间模型 (RSSM)
// 基于 DeepMind 的 RSSM 架构
// ============================================
//

export class RSSM {
  private config: WorldModelConfig;
  
  constructor(config: WorldModelConfig) {
    this.config = config;
  }

  /**
   * 初始化状态
   */
  initState(): State {
    return {
      deterministic: new Array(this.config.hiddenDimension).fill(0),
      stochastic: new Array(this.config.stateDimension).fill(0),
      timestamp: Date.now(),
    };
  }

  /**
   * 状态转移: h_{t+1} = f(h_t, s_t, a_t)
   * 确定性路径 (GRU/Linear)
   */
  transitionDeterministic(
    prevDeterministic: number[],
    prevStochastic: number[],
    action: Action
  ): number[] {
    const input = this.concatVectors([
      prevDeterministic,
      prevStochastic,
      action.embedding || this.encodeAction(action),
    ]);
    
    // 简化的 GRU 单元实现
    return this.gruCell(input, prevDeterministic);
  }

  /**
   * 先验分布: p(s_{t+1} | h_{t+1})
   * 从确定性状态预测随机状态
   */
  priorDistribution(deterministic: number[]): {
    mean: number[];
    logVar: number[];
  } {
    // 简化的先验分布参数计算
    const mean = this.linearLayer(deterministic, this.config.stateDimension);
    const logVar = this.linearLayer(deterministic, this.config.stateDimension);
    return { mean, logVar };
  }

  /**
   * 后验分布: q(s_t | h_t, o_t)
   * 结合观察更新状态
   */
  posteriorDistribution(
    deterministic: number[],
    observation: Observation
  ): {
    mean: number[];
    logVar: number[];
  } {
    const input = this.concatVectors([
      deterministic,
      observation.features,
    ]);
    
    const mean = this.linearLayer(input, this.config.stateDimension);
    const logVar = this.linearLayer(input, this.config.stateDimension);
    return { mean, logVar };
  }

  /**
   * 重参数化采样
   */
  sampleFromDistribution(
    mean: number[],
    logVar: number[]
  ): number[] {
    const std = logVar.map(v => Math.exp(0.5 * v));
    const noise = std.map(() => this.randomNormal());
    return mean.map((m, i) => m + std[i] * noise[i]);
  }

  /**
   * 状态转移完整流程
   */
  transition(state: State, action: Action, observation?: Observation): State {
    // 1. 更新确定性状态
    const newDeterministic = this.transitionDeterministic(
      state.deterministic,
      state.stochastic,
      action
    );

    let newStochastic: number[];

    if (observation) {
      // 2a. 有观察: 使用后验分布
      const posterior = this.posteriorDistribution(newDeterministic, observation);
      newStochastic = this.sampleFromDistribution(posterior.mean, posterior.logVar);
    } else {
      // 2b. 无观察 (想象): 使用先验分布
      const prior = this.priorDistribution(newDeterministic);
      newStochastic = this.sampleFromDistribution(prior.mean, prior.logVar);
    }

    return {
      deterministic: newDeterministic,
      stochastic: newStochastic,
      timestamp: Date.now(),
    };
  }

  // 辅助方法
  private concatVectors(vectors: number[][]): number[] {
    return vectors.reduce((acc, v) => [...acc, ...v], []);
  }

  private gruCell(input: number[], hidden: number[]): number[] {
    // 简化的 GRU 实现
    const updateGate = input.map((x, i) => this.sigmoid(x + (hidden[i] || 0)));
    const resetGate = input.map((x, i) => this.sigmoid(x - (hidden[i] || 0)));
    const candidate = input.map((x, i) => 
      Math.tanh(x + resetGate[i] * (hidden[i] || 0))
    );
    return updateGate.map((z, i) => 
      z * (hidden[i] || 0) + (1 - z) * candidate[i]
    );
  }

  private linearLayer(input: number[], outputDim: number): number[] {
    // 简化的线性层
    return new Array(outputDim).fill(0).map((_, i) => {
      const weight = Math.random() * 2 - 1;
      return input.reduce((sum, x) => sum + x * weight, 0) / input.length;
    });
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private randomNormal(): number {
    // Box-Muller 变换
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private encodeAction(action: Action): number[] {
    // 将动作编码为向量
    const typeHash = action.type.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const paramFeatures = Object.values(action.parameters)
      .map(v => typeof v === 'number' ? v : String(v).length);
    
    return [
      typeHash / 1000000,
      ...paramFeatures.slice(0, this.config.actionDimension - 1),
    ].slice(0, this.config.actionDimension);
  }
}

// ============================================
// 观察编码器
// ============================================

export class ObservationEncoder {
  private config: WorldModelConfig;

  constructor(config: WorldModelConfig) {
    this.config = config;
  }

  /**
   * 编码观察为特征向量
   */
  encode(observation: unknown): number[] {
    if (typeof observation === 'string') {
      return this.encodeText(observation);
    } else if (typeof observation === 'object' && observation !== null) {
      return this.encodeObject(observation);
    } else if (typeof observation === 'number') {
      return this.encodeNumber(observation);
    } else {
      return new Array(this.config.stateDimension).fill(0);
    }
  }

  private encodeText(text: string): number[] {
    // 简化的文本编码 (基于字符频率)
    const features = new Array(this.config.stateDimension).fill(0);
    const normalized = text.toLowerCase();
    
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i) % this.config.stateDimension;
      features[charCode] += 1 / normalized.length;
    }
    
    return features;
  }

  private encodeObject(obj: Record<string, unknown>): number[] {
    const features: number[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      // 编码键
      const keyHash = key.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      features.push(keyHash / 1000000);
      
      // 编码值
      if (typeof value === 'number') {
        features.push(value);
      } else if (typeof value === 'boolean') {
        features.push(value ? 1 : 0);
      } else {
        features.push(String(value).length / 100);
      }
    }
    
    // 填充或截断到指定维度
    while (features.length < this.config.stateDimension) {
      features.push(0);
    }
    return features.slice(0, this.config.stateDimension);
  }

  private encodeNumber(num: number): number[] {
    const features = new Array(this.config.stateDimension).fill(0);
    features[0] = num;
    features[1] = Math.sign(num);
    features[2] = Math.log10(Math.abs(num) + 1);
    return features;
  }
}

// ============================================
// 奖励预测器
// ============================================

export class RewardPredictor {
  private config: WorldModelConfig;
  private rewardHistory: number[] = [];

  constructor(config: WorldModelConfig) {
    this.config = config;
  }

  /**
   * 预测给定状态的奖励
   */
  predict(state: State): number {
    // 结合确定性状态和随机状态预测奖励
    const combined = [
      ...state.deterministic.slice(0, this.config.hiddenDimension / 2),
      ...state.stochastic.slice(0, this.config.stateDimension / 2),
    ];
    
    // 简化的奖励预测 (加权平均 + 非线性变换)
    const rawPrediction = combined.reduce((sum, x, i) => 
      sum + x * Math.sin(i + 1), 0
    ) / combined.length;
    
    // 使用历史奖励进行校准
    if (this.rewardHistory.length > 0) {
      const historicalMean = this.rewardHistory.reduce((a, b) => a + b, 0) / 
        this.rewardHistory.length;
      return rawPrediction * 0.7 + historicalMean * 0.3;
    }
    
    return Math.tanh(rawPrediction); // 归一化到 [-1, 1]
  }

  /**
   * 预测动作序列的累积奖励
   */
  predictSequence(states: State[]): number {
    let cumulativeReward = 0;
    let discount = 1;
    
    for (const state of states) {
      const reward = this.predict(state);
      cumulativeReward += discount * reward;
      discount *= this.config.discountFactor;
    }
    
    return cumulativeReward;
  }

  /**
   * 更新历史奖励
   */
  updateHistory(reward: number): void {
    this.rewardHistory.push(reward);
    if (this.rewardHistory.length > 1000) {
      this.rewardHistory = this.rewardHistory.slice(-500);
    }
  }
}

// ============================================
// 价值网络
// ============================================

export class ValueNetwork {
  private config: WorldModelConfig;

  constructor(config: WorldModelConfig) {
    this.config = config;
  }

  /**
   * 估计状态的长期价值
   */
  estimate(state: State): number {
    // 结合确定性和随机状态特征
    const features = this.extractFeatures(state);
    
    // 简化的价值估计
    const value = features.reduce((sum, x, i) => 
      sum + x * Math.cos(i * 0.5), 0
    ) / features.length;
    
    return Math.tanh(value) * 10; // 归一化并放大
  }

  /**
   * 估计动作序列的价值 (用于想象训练)
   */
  estimateTrajectory(trajectory: ImaginedTrajectory): number {
    // 结合即时奖励和长期价值
    const immediateReward = trajectory.cumulativeReturn;
    const finalValue = this.estimate(
      trajectory.predictedStates[trajectory.predictedStates.length - 1]
    );
    
    return immediateReward + this.config.discountFactor ** trajectory.actions.length * finalValue;
  }

  private extractFeatures(state: State): number[] {
    return [
      ...state.deterministic,
      ...state.stochastic,
    ];
  }
}

// ============================================
// 经验回放缓冲区
// ============================================

export class ReplayBuffer {
  private buffer: Transition[] = [];
  private config: WorldModelConfig;

  constructor(config: WorldModelConfig) {
    this.config = config;
  }

  /**
   * 添加经验
   */
  add(transition: Transition): void {
    this.buffer.push(transition);
    
    if (this.buffer.length > this.config.replayBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * 采样批次
   */
  sample(batchSize: number): Transition[] {
    const samples: Transition[] = [];
    const indices = new Set<number>();
    
    while (indices.size < Math.min(batchSize, this.buffer.length)) {
      const idx = Math.floor(Math.random() * this.buffer.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        samples.push(this.buffer[idx]);
      }
    }
    
    return samples;
  }

  /**
   * 获取序列样本 (用于训练 RSSM)
   */
  sampleSequences(sequenceLength: number, batchSize: number): Transition[][] {
    const sequences: Transition[][] = [];
    
    for (let i = 0; i < batchSize; i++) {
      if (this.buffer.length < sequenceLength) break;
      
      const startIdx = Math.floor(
        Math.random() * (this.buffer.length - sequenceLength)
      );
      sequences.push(this.buffer.slice(startIdx, startIdx + sequenceLength));
    }
    
    return sequences;
  }

  /**
   * 获取所有经验
   */
  getAll(): Transition[] {
    return [...this.buffer];
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * 获取大小
   */
  size(): number {
    return this.buffer.length;
  }
}

// ============================================
// 世界模型主类
// ============================================

export class WorldModel extends EventEmitter {
  private config: WorldModelConfig;
  private rssm: RSSM;
  private encoder: ObservationEncoder;
  private rewardPredictor: RewardPredictor;
  private valueNetwork: ValueNetwork;
  private replayBuffer: ReplayBuffer;
  
  private currentState: State;
  private isTraining: boolean = false;
  private trainingStats = {
    totalTransitions: 0,
    totalImaginedSteps: 0,
    predictionAccuracy: 0,
  };

  constructor(config: Partial<WorldModelConfig> = {}) {
    super();
    
    this.config = {
      stateDimension: 32,
      actionDimension: 16,
      hiddenDimension: 64,
      imaginationHorizon: 15,
      imaginationBatchSize: 50,
      discountFactor: 0.99,
      learningRate: 0.001,
      replayBufferSize: 100000,
      useRSSM: true,
      useDiscreteLatents: false,
      numCategories: 32,
      ...config,
    };

    this.rssm = new RSSM(this.config);
    this.encoder = new ObservationEncoder(this.config);
    this.rewardPredictor = new RewardPredictor(this.config);
    this.valueNetwork = new ValueNetwork(this.config);
    this.replayBuffer = new ReplayBuffer(this.config);
    
    this.currentState = this.rssm.initState();
  }

  /**
   * 初始化世界模型
   */
  initialize(): void {
    this.currentState = this.rssm.initState();
    this.emit({ id: 'init', type: 'agent:initialized', timestamp: Date.now(), traceId: 'init', conversationId: 'init', messageId: 'init' });
  }

  /**
   * 执行一步观察-更新循环
   */
  step(action: Action, observation: Observation, reward: number, done: boolean): State {
    // 1. 编码观察
    observation.features = this.encoder.encode(observation.raw);
    
    // 2. 状态转移
    const nextState = this.rssm.transition(this.currentState, action, observation);
    
    // 3. 存储经验
    const transition: Transition = {
      state: { ...this.currentState },
      action,
      nextObservation: observation,
      reward,
      done,
      timestamp: Date.now(),
    };
    this.replayBuffer.add(transition);
    
    // 4. 更新统计
    this.trainingStats.totalTransitions++;
    this.rewardPredictor.updateHistory(reward);
    
    // 5. 更新当前状态
    this.currentState = nextState;
    
    // 6. 触发事件
    this.emit({ id: 'step', type: 'agent:initialized', timestamp: Date.now(), traceId: 'step', conversationId: 'step', messageId: 'step' });
    
    return nextState;
  }

  /**
   * 想象未来轨迹 (核心功能)
   */
  imagineTrajectory(
    initialState: State,
    actionSequence: Action[]
  ): ImaginedTrajectory {
    const predictedStates: State[] = [];
    const predictedRewards: number[] = [];
    const predictedValues: number[] = [];
    
    let currentState = initialState;
    let cumulativeReturn = 0;
    let discount = 1;
    
    for (const action of actionSequence) {
      // 想象状态转移 (无真实观察)
      currentState = this.rssm.transition(currentState, action);
      predictedStates.push(currentState);
      
      // 预测奖励
      const reward = this.rewardPredictor.predict(currentState);
      predictedRewards.push(reward);
      cumulativeReturn += discount * reward;
      
      // 估计价值
      const value = this.valueNetwork.estimate(currentState);
      predictedValues.push(value);
      
      discount *= this.config.discountFactor;
    }
    
    this.trainingStats.totalImaginedSteps += actionSequence.length;
    
    return {
      initialState,
      actions: actionSequence,
      predictedStates,
      predictedRewards,
      predictedValues,
      cumulativeReturn,
      predictedDone: false,
    };
  }

  /**
   * 批量想象多个轨迹
   */
  imagineBatch(
    initialState: State,
    candidateActions: Action[][]
  ): ImaginedTrajectory[] {
    return candidateActions.map(actions => 
      this.imagineTrajectory(initialState, actions)
    );
  }

  /**
   * 选择最优动作序列
   */
  selectBestActionSequence(
    initialState: State,
    candidateSequences: Action[][]
  ): { bestSequence: Action[]; bestTrajectory: ImaginedTrajectory; allTrajectories: ImaginedTrajectory[] } {
    const trajectories = this.imagineBatch(initialState, candidateSequences);
    
    // 按累积回报排序
    trajectories.sort((a, b) => b.cumulativeReturn - a.cumulativeReturn);
    
    const bestTrajectory = trajectories[0];
    
    return {
      bestSequence: bestTrajectory.actions,
      bestTrajectory,
      allTrajectories: trajectories,
    };
  }

  /**
   * 反事实推理: "如果我当时做了不同的选择..."
   */
  counterfactualReasoning(
    history: Transition[],
    interventionPoint: number,
    alternativeAction: Action
  ): CounterfactualScenario {
    if (interventionPoint >= history.length) {
      throw new Error('Intervention point beyond history length');
    }

    // 1. 重建干预点的状态
    let counterfactualState = history[interventionPoint].state;
    
    // 2. 从干预点开始想象
    const remainingSteps = this.config.imaginationHorizon;
    const imaginedActions: Action[] = [alternativeAction];
    
    // 生成后续动作 (这里简化处理，实际应使用策略网络)
    for (let i = 1; i < remainingSteps; i++) {
      imaginedActions.push(this.generateRandomAction());
    }
    
    // 3. 想象轨迹
    const predictedTrajectory = this.imagineTrajectory(
      counterfactualState,
      imaginedActions
    );
    
    // 4. 计算原始结果
    const originalReward = history
      .slice(interventionPoint)
      .reduce((sum, t) => sum + t.reward, 0);
    
    const counterfactualReward = predictedTrajectory.cumulativeReturn;
    const difference = counterfactualReward - originalReward;
    
    return {
      originalHistory: history,
      interventionPoint,
      alternativeAction,
      predictedTrajectory,
      comparison: {
        originalReward,
        counterfactualReward,
        difference,
        percentChange: originalReward !== 0 
          ? (difference / Math.abs(originalReward)) * 100 
          : 0,
      },
    };
  }

  /**
   * 评估动作效果 (用于决策前的预评估)
   */
  evaluateAction(
    currentState: State,
    action: Action,
    horizon: number = 5
  ): {
    expectedReward: number;
    expectedValue: number;
    risk: number;
    confidence: number;
  } {
    // 想象多个可能的未来
    const numSimulations = 10;
    const results: number[] = [];
    
    for (let i = 0; i < numSimulations; i++) {
      const actions: Action[] = [action];
      // 填充剩余步骤
      for (let j = 1; j < horizon; j++) {
        actions.push(this.generateRandomAction());
      }
      
      const trajectory = this.imagineTrajectory(currentState, actions);
      results.push(trajectory.cumulativeReturn);
    }
    
    // 计算统计量
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.reduce((sum, r) => sum + (r - mean) ** 2, 0) / results.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      expectedReward: mean,
      expectedValue: this.valueNetwork.estimate(currentState),
      risk: stdDev,
      confidence: 1 / (1 + stdDev), // 风险越低，置信度越高
    };
  }

  /**
   * 训练世界模型 (从经验中学习)
   */
  async train(steps: number = 100): Promise<{
    reconstructionLoss: number;
    rewardLoss: number;
    klLoss: number;
  }> {
    if (this.replayBuffer.size() < 100) {
      return { reconstructionLoss: 0, rewardLoss: 0, klLoss: 0 };
    }

    this.isTraining = true;
    
    let totalReconstructionLoss = 0;
    let totalRewardLoss = 0;
    let totalKLLoss = 0;
    
    for (let i = 0; i < steps; i++) {
      // 采样序列
      const sequences = this.replayBuffer.sampleSequences(10, 8);
      
      for (const sequence of sequences) {
        // 训练 RSSM (简化的训练过程)
        const loss = this.trainStep(sequence);
        totalReconstructionLoss += loss.reconstruction;
        totalRewardLoss += loss.reward;
        totalKLLoss += loss.kl;
      }
    }
    
    this.isTraining = false;
    
    const avgSteps = Math.max(1, steps);
    return {
      reconstructionLoss: totalReconstructionLoss / avgSteps,
      rewardLoss: totalRewardLoss / avgSteps,
      klLoss: totalKLLoss / avgSteps,
    };
  }

  private trainStep(sequence: Transition[]): {
    reconstruction: number;
    reward: number;
    kl: number;
  } {
    // 简化的训练步骤
    let state = sequence[0].state;
    let reconstructionLoss = 0;
    let rewardLoss = 0;
    let klLoss = 0;
    
    for (const transition of sequence) {
      // 预测下一个状态
      const predictedState = this.rssm.transition(state, transition.action);
      
      // 计算重建损失 (观察重构)
      const obsError = predictedState.stochastic.reduce(
        (sum, s, i) => sum + Math.abs(s - (transition.nextObservation.features[i] || 0)),
        0
      );
      reconstructionLoss += obsError / predictedState.stochastic.length;
      
      // 计算奖励损失
      const predictedReward = this.rewardPredictor.predict(predictedState);
      rewardLoss += (predictedReward - transition.reward) ** 2;
      
      // KL 散度 (简化计算)
      klLoss += 0.01; // 占位符
      
      state = predictedState;
    }
    
    return {
      reconstruction: reconstructionLoss / sequence.length,
      reward: rewardLoss / sequence.length,
      kl: klLoss / sequence.length,
    };
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): State {
    return { ...this.currentState };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.trainingStats,
      replayBufferSize: this.replayBuffer.size(),
      isTraining: this.isTraining,
    };
  }

  /**
   * 重置世界模型
   */
  reset(): void {
    this.currentState = this.rssm.initState();
    this.replayBuffer.clear();
    this.trainingStats = {
      totalTransitions: 0,
      totalImaginedSteps: 0,
      predictionAccuracy: 0,
    };
    this.emit({ id: 'reset', type: 'agent:initialized', timestamp: Date.now(), traceId: 'reset', conversationId: 'reset', messageId: 'reset' });
  }

  private generateRandomAction(): Action {
    return {
      id: `random-${Date.now()}`,
      type: 'random',
      parameters: {},
      embedding: new Array(this.config.actionDimension)
        .fill(0)
        .map(() => Math.random() * 2 - 1),
    };
  }
}

export default WorldModel;
