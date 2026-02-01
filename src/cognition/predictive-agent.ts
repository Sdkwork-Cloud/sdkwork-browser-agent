/**
 * 预测性智能体 (Predictive Agent)
 * 
 * 集成世界模型的下一代智能体架构，实现：
 * 1. 基于想象的决策 (Imagination-Based Decision Making)
 * 2. 反事实学习 (Counterfactual Learning)
 * 3. 预测性规划 (Predictive Planning)
 * 4. 不确定性量化决策 (Uncertainty-Aware Decision)
 * 
 * 这是从"反应式"到"预测式"智能的跃迁
 */

import { SmartAgent, SmartAgentConfig, AutoExecutionResult } from '../core/smart-agent';
import { Decision, DecisionContext } from '../core/decision-engine';
import { SkillResult } from '../types/unified';
import { 
  WorldModel, 
  Action, 
  Observation, 
  ImaginedTrajectory,
  CounterfactualScenario,
  WorldModelConfig 
} from './world-model';
import { AgentEventEmitter as EventEmitter } from '../agent/event-system';
import { isBrowser, environment } from '../utils/environment';

// ============================================
// 配置类型
// ============================================

export interface PredictiveAgentConfig extends SmartAgentConfig {
  worldModel?: Partial<WorldModelConfig>;
  imagination?: {
    /** 是否启用想象 */
    enabled: boolean;
    /** 想象轨迹数量 */
    numTrajectories: number;
    /** 想象深度 */
    horizon: number;
    /** 是否使用反事实推理 */
    useCounterfactual: boolean;
  };
  uncertainty?: {
    /** 不确定性阈值 */
    threshold: number;
    /** 是否要求置信度 */
    requireConfidence: number;
    /** 不确定性高时的策略 */
    highUncertaintyStrategy: 'explore' | 'clarify' | 'conservative';
  };
  learning?: {
    /** 是否在线学习 */
    onlineLearning: boolean;
    /** 学习频率 */
    learningFrequency: number;
    /** 是否使用反事实学习 */
    counterfactualLearning: boolean;
  };
}

// ============================================
// 决策结果类型
// ============================================

export interface PredictiveDecision extends Decision {
  /** 世界模型预测 */
  worldModelPrediction?: {
    /** 预期奖励 */
    expectedReward: number;
    /** 风险估计 */
    risk: number;
    /** 置信度 */
    confidence: number;
    /** 想象的轨迹 */
    imaginedTrajectories: ImaginedTrajectory[];
  };
  /** 反事实分析 */
  counterfactualAnalysis?: CounterfactualScenario[];
  /** 不确定性量化 */
  uncertaintyQuantification?: {
    /** 认知不确定性 (模型不确定性) */
    epistemic: number;
    /** 偶然不确定性 (数据噪声) */
    aleatoric: number;
    /** 总不确定性 */
    total: number;
  };
  /** 决策理由 */
  predictiveReasoning: string;
}

export interface PredictiveExecutionResult extends AutoExecutionResult {
  /** 世界模型统计 */
  worldModelStats?: {
    totalImaginedSteps: number;
    predictionAccuracy: number;
    replayBufferSize: number;
  };
  /** 反事实学习结果 */
  counterfactualLearning?: {
    lessons: string[];
    improvedStrategy?: string;
  };
}

// ============================================
// 预测性智能体
// ============================================

export class PredictiveAgent extends SmartAgent {
  private worldModel: WorldModel;
  private predictiveConfig: PredictiveAgentConfig;
  private decisionHistory: PredictiveDecision[] = [];
  private executionCounter: number = 0;

  constructor(config: PredictiveAgentConfig) {
    super(config);
    
    this.predictiveConfig = {
      ...config,
      imagination: {
        enabled: true,
        numTrajectories: 5,
        horizon: 10,
        useCounterfactual: true,
        ...config.imagination,
      },
      uncertainty: {
        threshold: 0.3,
        requireConfidence: 0.7,
        highUncertaintyStrategy: 'clarify',
        ...config.uncertainty,
      },
      learning: {
        onlineLearning: true,
        learningFrequency: 10,
        counterfactualLearning: true,
        ...config.learning,
      },
    };

    this.worldModel = new WorldModel(this.predictiveConfig.worldModel);
    this.setupEventListeners();
  }

  /**
   * 初始化预测性智能体
   */
  async initialize(): Promise<void> {
    await super.initialize();
    this.worldModel.initialize();
    console.log('[PredictiveAgent] Initialized with World Model');
  }

  /**
   * 核心处理流程 - 集成世界模型
   */
  async process(input: string, context?: string): Promise<PredictiveExecutionResult> {
    const startTime = Date.now();
    this.executionCounter++;

    // Step 1: 使用世界模型进行预测性决策
    const predictiveDecision = await this.makePredictiveDecision(input, context);

    // Step 2: 执行决策
    const result = await this.executePredictiveDecision(input, context, predictiveDecision);

    // Step 3: 更新世界模型
    await this.updateWorldModel(input, predictiveDecision, result);

    // Step 4: 反事实学习
    let counterfactualLearning;
    if (this.predictiveConfig.learning?.counterfactualLearning) {
      counterfactualLearning = await this.counterfactualLearning(
        input, 
        predictiveDecision, 
        result
      );
    }

    // Step 5: 在线学习
    if (this.predictiveConfig.learning?.onlineLearning && 
        this.executionCounter % (this.predictiveConfig.learning.learningFrequency || 10) === 0) {
      await this.worldModel.train(100);
    }

    const executionTime = Date.now() - startTime;

    return {
      ...result,
      decision: predictiveDecision,
      executionTime,
      worldModelStats: this.worldModel.getStats(),
      counterfactualLearning,
    };
  }

  /**
   * 预测性决策 - 核心创新
   */
  private async makePredictiveDecision(
    input: string, 
    context?: string
  ): Promise<PredictiveDecision> {
    // 1. 获取基础决策
    const baseDecision = await this.makeDecision(input, context);

    // 2. 如果没有启用想象，返回基础决策
    if (!this.predictiveConfig.imagination?.enabled) {
      return {
        ...baseDecision,
        predictiveReasoning: 'Imagination disabled, using base decision',
      };
    }

    // 3. 生成候选动作序列
    const candidateSequences = await this.generateCandidateSequences(baseDecision, input);

    // 4. 使用世界模型想象每个序列的结果
    const currentState = this.worldModel.getCurrentState();
    const { bestSequence, bestTrajectory, allTrajectories } = 
      this.worldModel.selectBestActionSequence(currentState, candidateSequences);

    // 5. 评估不确定性
    const uncertainty = this.evaluateUncertainty(allTrajectories);

    // 6. 反事实分析
    let counterfactualAnalysis: CounterfactualScenario[] | undefined;
    if (this.predictiveConfig.imagination?.useCounterfactual && 
        this.decisionHistory.length > 0) {
      counterfactualAnalysis = await this.performCounterfactualAnalysis(
        bestSequence[0]
      );
    }

    // 7. 构建预测性决策
    const predictiveDecision: PredictiveDecision = {
      ...baseDecision,
      worldModelPrediction: {
        expectedReward: bestTrajectory.cumulativeReturn,
        risk: this.calculateRisk(allTrajectories),
        confidence: this.calculateConfidence(bestTrajectory, uncertainty.total),
        imaginedTrajectories: allTrajectories,
      },
      counterfactualAnalysis,
      uncertaintyQuantification: uncertainty,
      predictiveReasoning: this.generatePredictiveReasoning(
        baseDecision,
        bestTrajectory,
        uncertainty
      ),
    };

    // 8. 存储决策历史
    this.decisionHistory.push(predictiveDecision);
    if (this.decisionHistory.length > 100) {
      this.decisionHistory.shift();
    }

    return predictiveDecision;
  }

  /**
   * 生成候选动作序列
   */
  private async generateCandidateSequences(
    decision: Decision, 
    input: string
  ): Promise<Action[][]> {
    const sequences: Action[][] = [];

    // 基于决策类型生成动作
    switch (decision.type) {
      case 'skill':
        if (decision.skills) {
          for (const skillName of decision.skills) {
            sequences.push([{
              id: `skill-${skillName}`,
              type: 'skill',
              parameters: { name: skillName, input },
            }]);
          }
        }
        break;

      case 'tool':
        if (decision.tools) {
          for (const toolName of decision.tools) {
            sequences.push([{
              id: `tool-${toolName}`,
              type: 'tool',
              parameters: { name: toolName, input },
            }]);
          }
        }
        break;

      case 'multi':
        // 组合动作
        const combined: Action[] = [];
        if (decision.skills) {
          combined.push(...decision.skills.map(name => ({
            id: `skill-${name}`,
            type: 'skill',
            parameters: { name, input },
          })));
        }
        if (decision.tools) {
          combined.push(...decision.tools.map(name => ({
            id: `tool-${name}`,
            type: 'tool',
            parameters: { name, input },
          })));
        }
        sequences.push(combined);
        break;

      case 'llm':
      default:
        sequences.push([{
          id: 'llm-response',
          type: 'llm',
          parameters: { input, context: decision.reasoning },
        }]);
    }

    // 添加变体序列 (探索)
    const variations = this.generateVariations(sequences);
    sequences.push(...variations);

    return sequences;
  }

  /**
   * 生成动作序列变体
   */
  private generateVariations(sequences: Action[][]): Action[][] {
    const variations: Action[][] = [];

    for (const seq of sequences) {
      // 添加顺序变体
      if (seq.length > 1) {
        variations.push([...seq].reverse());
      }

      // 添加延迟变体
      variations.push([
        { id: 'wait', type: 'wait', parameters: { duration: 100 } },
        ...seq,
      ]);
    }

    return variations;
  }

  /**
   * 评估不确定性
   */
  private evaluateUncertainty(trajectories: ImaginedTrajectory[]): {
    epistemic: number;
    aleatoric: number;
    total: number;
  } {
    if (trajectories.length === 0) {
      return { epistemic: 1, aleatoric: 1, total: 1 };
    }

    // 计算回报分布
    const returns = trajectories.map(t => t.cumulativeReturn);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;

    // 简化的不确定性分解
    // 认知不确定性: 轨迹间的差异
    const epistemic = Math.sqrt(variance);
    
    // 偶然不确定性: 基于预测方差 (简化)
    const aleatoric = 0.1; // 基础噪声

    return {
      epistemic,
      aleatoric,
      total: Math.sqrt(epistemic ** 2 + aleatoric ** 2),
    };
  }

  /**
   * 计算风险
   */
  private calculateRisk(trajectories: ImaginedTrajectory[]): number {
    const returns = trajectories.map(t => t.cumulativeReturn);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // 下行风险 (低于均值的回报)
    const downsideReturns = returns.filter(r => r < mean);
    if (downsideReturns.length === 0) return 0;
    
    const downsideVariance = downsideReturns.reduce(
      (sum, r) => sum + (r - mean) ** 2, 0
    ) / downsideReturns.length;
    
    return Math.sqrt(downsideVariance);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    bestTrajectory: ImaginedTrajectory, 
    uncertainty: number
  ): number {
    // 基于预期回报和不确定性计算置信度
    const normalizedReward = Math.tanh(bestTrajectory.cumulativeReturn / 10);
    const confidenceFromUncertainty = 1 / (1 + uncertainty);
    
    return (normalizedReward * 0.5 + confidenceFromUncertainty * 0.5);
  }

  /**
   * 执行预测性决策
   */
  private async executePredictiveDecision(
    input: string,
    context: string | undefined,
    decision: PredictiveDecision
  ): Promise<AutoExecutionResult> {
    // 检查不确定性
    if (decision.uncertaintyQuantification && 
        decision.uncertaintyQuantification.total > (this.predictiveConfig.uncertainty?.threshold || 0.3)) {
      
      const strategy = this.predictiveConfig.uncertainty?.highUncertaintyStrategy;
      
      switch (strategy) {
        case 'clarify':
          return {
            decision,
            result: '我需要更多信息才能做出可靠决策。请提供更多细节。',
            tokensUsed: 0,
            executionTime: 0,
          };

        case 'conservative':
          // 选择最保守的选项
          console.log('[PredictiveAgent] High uncertainty, using conservative strategy');
          break;

        case 'explore':
          // 继续执行以收集更多信息
          console.log('[PredictiveAgent] High uncertainty, exploring to learn');
          break;
      }
    }

    // 执行基础决策
    return super.process(input, context);
  }

  /**
   * 更新世界模型
   */
  private async updateWorldModel(
    input: string,
    decision: PredictiveDecision,
    result: AutoExecutionResult
  ): Promise<void> {
    // 构建观察
    const observation: Observation = {
      raw: {
        input,
        result: result.result,
        success: typeof result.result === 'object' ? 
          (result.result as SkillResult).success : true,
      },
      features: [], // 将由编码器填充
      timestamp: Date.now(),
    };

    // 构建动作
    const action: Action = {
      id: `action-${Date.now()}`,
      type: decision.type,
      parameters: {
        skills: decision.skills,
        tools: decision.tools,
      },
    };

    // 计算奖励
    const reward = this.calculateReward(result);

    // 更新世界模型
    this.worldModel.step(action, observation, reward, false);
  }

  /**
   * 计算奖励
   */
  private calculateReward(result: AutoExecutionResult): number {
    let reward = 0;

    // 基于执行成功度
    if (typeof result.result === 'object' && (result.result as SkillResult).success) {
      reward += 1;
    }

    // 基于执行时间 (越快越好)
    const timeBonus = Math.max(0, 1 - result.executionTime / 10000);
    reward += timeBonus * 0.5;

    // 基于评估结果
    if (result.evaluation?.passed) {
      reward += result.evaluation.score.overall;
    }

    return Math.min(reward, 2); // 限制最大奖励
  }

  /**
   * 反事实学习
   */
  private async counterfactualLearning(
    input: string,
    decision: PredictiveDecision,
    result: AutoExecutionResult
  ): Promise<{ lessons: string[]; improvedStrategy?: string }> {
    const lessons: string[] = [];

    // 1. 分析预测 vs 实际
    if (decision.worldModelPrediction) {
      const actualReward = this.calculateReward(result);
      const predictedReward = decision.worldModelPrediction.expectedReward;
      const predictionError = Math.abs(actualReward - predictedReward);

      if (predictionError > 0.5) {
        lessons.push(`Prediction accuracy needs improvement. Error: ${predictionError.toFixed(2)}`);
      }
    }

    // 2. 反事实分析
    if (decision.counterfactualAnalysis && decision.counterfactualAnalysis.length > 0) {
      const bestAlternative = decision.counterfactualAnalysis
        .sort((a, b) => b.comparison.counterfactualReward - a.comparison.counterfactualReward)[0];

      if (bestAlternative.comparison.difference > 0.5) {
        lessons.push(
          `Alternative action could have yielded ${bestAlternative.comparison.percentChange.toFixed(1)}% better result`
        );
      }
    }

    // 3. 生成改进策略
    let improvedStrategy: string | undefined;
    if (lessons.length > 0) {
      improvedStrategy = this.generateImprovedStrategy(lessons, decision);
    }

    return { lessons, improvedStrategy };
  }

  /**
   * 执行反事实分析
   */
  private async performCounterfactualAnalysis(
    chosenAction: Action
  ): Promise<CounterfactualScenario[]> {
    if (this.decisionHistory.length === 0) return [];

    const scenarios: CounterfactualScenario[] = [];
    const recentHistory = this.worldModel['replayBuffer'].getAll().slice(-10);

    // 对最近的几个决策点进行反事实分析
    for (let i = Math.max(0, recentHistory.length - 3); i < recentHistory.length; i++) {
      // 生成替代动作
      const alternativeActions = this.generateAlternativeActions(chosenAction);

      for (const altAction of alternativeActions) {
        const scenario = this.worldModel.counterfactualReasoning(
          recentHistory,
          i,
          altAction
        );
        scenarios.push(scenario);
      }
    }

    return scenarios;
  }

  /**
   * 生成替代动作
   */
  private generateAlternativeActions(action: Action): Action[] {
    const alternatives: Action[] = [];

    // 添加等待变体
    alternatives.push({
      id: `${action.id}-delayed`,
      type: action.type,
      parameters: { ...action.parameters, delay: 1000 },
    });

    // 添加参数变体
    alternatives.push({
      id: `${action.id}-modified`,
      type: action.type,
      parameters: { ...action.parameters, cautious: true },
    });

    return alternatives;
  }

  /**
   * 生成改进策略
   */
  private generateImprovedStrategy(
    lessons: string[], 
    decision: PredictiveDecision
  ): string {
    const strategies: string[] = [];

    if (lessons.some(l => l.includes('Prediction accuracy'))) {
      strategies.push('Increase imagination horizon for better prediction');
    }

    if (lessons.some(l => l.includes('Alternative action'))) {
      strategies.push('Explore more action variations before deciding');
    }

    if (decision.uncertaintyQuantification && 
        decision.uncertaintyQuantification.epistemic > 0.5) {
      strategies.push('Collect more diverse training data to reduce model uncertainty');
    }

    return strategies.join('; ');
  }

  /**
   * 生成预测性决策理由
   */
  private generatePredictiveReasoning(
    baseDecision: Decision,
    bestTrajectory: ImaginedTrajectory,
    uncertainty: { epistemic: number; aleatoric: number; total: number }
  ): string {
    const parts: string[] = [
      `Base decision: ${baseDecision.reasoning}`,
      ``,
      `World Model Analysis:`,
      `- Expected reward: ${bestTrajectory.cumulativeReturn.toFixed(2)}`,
      `- Number of steps imagined: ${bestTrajectory.actions.length}`,
      `- Epistemic uncertainty: ${(uncertainty.epistemic * 100).toFixed(1)}%`,
      `- Aleatoric uncertainty: ${(uncertainty.aleatoric * 100).toFixed(1)}%`,
    ];

    return parts.join('\n');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.worldModel.on('step', ({ transition }) => {
      // 可以在这里添加额外的处理逻辑
      console.log(`[WorldModel] Step recorded: ${transition.action.type}`);
    });

    this.worldModel.on('initialized', () => {
      console.log('[WorldModel] Initialized');
    });
  }

  /**
   * 获取世界模型统计
   */
  getWorldModelStats() {
    return this.worldModel.getStats();
  }

  /**
   * 手动触发训练
   */
  async trainWorldModel(steps: number = 100): Promise<{
    reconstructionLoss: number;
    rewardLoss: number;
    klLoss: number;
  }> {
    return this.worldModel.train(steps);
  }

  /**
   * 想象场景 (供外部使用)
   */
  imagineScenario(actionSequence: Action[]): ImaginedTrajectory {
    const currentState = this.worldModel.getCurrentState();
    return this.worldModel.imagineTrajectory(currentState, actionSequence);
  }

  /**
   * 反事实查询 (供外部使用)
   */
  whatIf(
    interventionPoint: number, 
    alternativeAction: Action
  ): CounterfactualScenario {
    const history = this.worldModel['replayBuffer'].getAll();
    return this.worldModel.counterfactualReasoning(
      history, 
      interventionPoint, 
      alternativeAction
    );
  }
}

export default PredictiveAgent;
