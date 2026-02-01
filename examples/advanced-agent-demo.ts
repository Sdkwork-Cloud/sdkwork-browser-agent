/**
 * 高级智能体架构演示
 * 
 * 展示业界最顶尖的智能体能力：
 * 1. 世界模型预测性决策
 * 2. 神经符号推理
 * 3. 元认知监控
 * 4. 反事实学习
 */

import { UnifiedCognitionEngine } from '../src/cognition/unified-cognition';
import { WorldModel, Action, Observation } from '../src/cognition/world-model';
import { NeuroSymbolicEngine, SymbolicAtom, LogicalRule } from '../src/cognition/neuro-symbolic';

// ============================================
// 演示 1: 世界模型 - 预测性决策
// ============================================

async function demoWorldModel() {
  console.log('\n========================================');
  console.log('演示 1: 世界模型 - 预测性决策');
  console.log('========================================\n');

  const worldModel = new WorldModel({
    stateDimension: 32,
    actionDimension: 16,
    hiddenDimension: 64,
    imaginationHorizon: 10,
    imaginationBatchSize: 5,
    discountFactor: 0.99,
  });

  worldModel.initialize();

  // 模拟智能体在环境中的交互
  console.log('模拟智能体学习环境动态...\n');

  // 步骤 1: 观察环境并采取行动
  const action1: Action = {
    id: 'explore',
    type: 'explore',
    parameters: { direction: 'forward' },
  };

  const observation1: Observation = {
    raw: { position: [0, 0], objects: ['wall', 'door'] },
    features: [],
    timestamp: Date.now(),
  };

  const state1 = worldModel.step(action1, observation1, 0.5, false);
  console.log('步骤 1: 执行探索动作');
  console.log('  奖励: 0.5');
  console.log('  状态维度:', state1.stochastic.length);

  // 步骤 2: 采取另一个动作
  const action2: Action = {
    id: 'open_door',
    type: 'interact',
    parameters: { target: 'door' },
  };

  const observation2: Observation = {
    raw: { position: [1, 0], objects: ['open_door', 'room'], reward_signal: 1.0 },
    features: [],
    timestamp: Date.now(),
  };

  const state2 = worldModel.step(action2, observation2, 1.0, false);
  console.log('\n步骤 2: 执行开门动作');
  console.log('  奖励: 1.0 (成功!)');

  // 步骤 3: 想象未来
  console.log('\n--- 想象未来场景 ---');
  const candidateActions: Action[][] = [
    [{ id: 'go_left', type: 'move', parameters: { direction: 'left' } }],
    [{ id: 'go_right', type: 'move', parameters: { direction: 'right' } }],
    [{ id: 'search', type: 'explore', parameters: { thorough: true } }],
  ];

  const { bestSequence, bestTrajectory, allTrajectories } = 
    worldModel.selectBestActionSequence(state2, candidateActions);

  console.log('想象了', allTrajectories.length, '个可能的未来轨迹');
  console.log('最佳动作序列:', bestSequence.map(a => a.id).join(' → '));
  console.log('预期累积奖励:', bestTrajectory.cumulativeReturn.toFixed(2));
  console.log('预测步数:', bestTrajectory.predictedStates.length);

  // 步骤 4: 反事实推理
  console.log('\n--- 反事实推理 ---');
  const history = worldModel['replayBuffer'].getAll();
  
  if (history.length > 0) {
    const alternativeAction: Action = {
      id: 'ignore_door',
      type: 'move',
      parameters: { direction: 'away' },
    };

    const counterfactual = worldModel.counterfactualReasoning(
      history,
      0,
      alternativeAction
    );

    console.log('反事实场景: 如果在步骤1选择忽略门...');
    console.log('  原始奖励:', counterfactual.comparison.originalReward.toFixed(2));
    console.log('  反事实奖励:', counterfactual.comparison.counterfactualReward.toFixed(2));
    console.log('  差异:', counterfactual.comparison.difference.toFixed(2));
  }

  // 训练世界模型
  console.log('\n--- 训练世界模型 ---');
  const trainingResult = await worldModel.train(50);
  console.log('训练完成:');
  console.log('  重建损失:', trainingResult.reconstructionLoss.toFixed(4));
  console.log('  奖励损失:', trainingResult.rewardLoss.toFixed(4));
  console.log('  KL损失:', trainingResult.klLoss.toFixed(4));

  console.log('\n世界模型统计:');
  console.log(worldModel.getStats());
}

// ============================================
// 演示 2: 神经符号推理
// ============================================

async function demoNeuroSymbolic() {
  console.log('\n========================================');
  console.log('演示 2: 神经符号推理');
  console.log('========================================\n');

  const engine = new NeuroSymbolicEngine({
    embeddingDimension: 128,
    maxRules: 100,
    maxReasoningDepth: 5,
    confidenceThreshold: 0.6,
    enableNeuralTheoremProving: true,
    enableAbduction: true,
  });

  // 添加事实
  console.log('添加事实到知识库...');
  
  const facts: SymbolicAtom[] = [
    {
      predicate: 'human',
      arguments: ['socrates'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.95,
    },
    {
      predicate: 'human',
      arguments: ['plato'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.95,
    },
    {
      predicate: 'mortal',
      arguments: ['socrates'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.9,
    },
    {
      predicate: 'philosopher',
      arguments: ['socrates'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.98,
    },
    {
      predicate: 'philosopher',
      arguments: ['plato'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.98,
    },
  ];

  facts.forEach(fact => engine.addFact(fact));
  console.log('已添加', facts.length, '个事实');

  // 添加规则
  console.log('\n添加推理规则...');
  
  const rules: LogicalRule[] = [
    {
      id: 'rule1',
      name: 'All humans are mortal',
      premises: [
        { predicate: 'human', arguments: ['?X'], truthValue: 1, source: 'observation', confidence: 1 },
      ],
      conclusion: { predicate: 'mortal', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 0.9 },
      weight: 0.95,
      type: 'deductive',
    },
    {
      id: 'rule2',
      name: 'Philosophers are wise',
      premises: [
        { predicate: 'philosopher', arguments: ['?X'], truthValue: 1, source: 'observation', confidence: 1 },
      ],
      conclusion: { predicate: 'wise', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 0.8 },
      weight: 0.85,
      type: 'deductive',
    },
    {
      id: 'rule3',
      name: 'Wise beings contemplate',
      premises: [
        { predicate: 'wise', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 1 },
      ],
      conclusion: { predicate: 'contemplates', arguments: ['?X'], truthValue: 1, source: 'inference', confidence: 0.75 },
      weight: 0.8,
      type: 'deductive',
    },
  ];

  rules.forEach(rule => engine.addRule(rule));
  console.log('已添加', rules.length, '个规则');

  // 进行推理查询
  console.log('\n--- 推理查询 ---');

  const queries: SymbolicAtom[] = [
    { predicate: 'mortal', arguments: ['plato'], truthValue: 0, source: 'observation', confidence: 0 },
    { predicate: 'wise', arguments: ['socrates'], truthValue: 0, source: 'observation', confidence: 0 },
    { predicate: 'contemplates', arguments: ['plato'], truthValue: 0, source: 'observation', confidence: 0 },
    { predicate: 'immortal', arguments: ['socrates'], truthValue: 0, source: 'observation', confidence: 0 },
  ];

  for (const query of queries) {
    console.log(`\n查询: ${query.predicate}(${query.arguments.join(', ')})`);
    const result = engine.query(query);
    
    console.log('  结论:', result.conclusion.truthValue > 0 ? '成立' : '不成立');
    console.log('  置信度:', (result.confidence * 100).toFixed(1) + '%');
    console.log('  推理深度:', result.depth);
    console.log('  应用的规则:', result.rulesApplied.join(', ') || '无');
    
    if (result.proof.length > 0) {
      console.log('  推理链:');
      result.proof.forEach((step, i) => {
        console.log(`    ${i + 1}. ${step.rule.name} → ${step.conclusion.predicate}`);
      });
    }
  }

  // 知识图谱演示
  console.log('\n--- 知识图谱推理 ---');
  const kgReasoner = engine.getKGReasoner();

  // 添加实体
  kgReasoner.addEntity({
    id: 'socrates',
    type: 'philosopher',
    attributes: { era: 'ancient_greece', field: 'ethics' },
  });

  kgReasoner.addEntity({
    id: 'plato',
    type: 'philosopher',
    attributes: { era: 'ancient_greece', field: 'metaphysics', teacher: 'socrates' },
  });

  kgReasoner.addEntity({
    id: 'aristotle',
    type: 'philosopher',
    attributes: { era: 'ancient_greece', field: 'logic', teacher: 'plato' },
  });

  // 添加关系
  kgReasoner.addRelation({
    type: 'teacher_of',
    head: 'socrates',
    tail: 'plato',
    strength: 1.0,
    timestamp: Date.now(),
  });

  kgReasoner.addRelation({
    type: 'teacher_of',
    head: 'plato',
    tail: 'aristotle',
    strength: 1.0,
    timestamp: Date.now(),
  });

  // 查找相似实体
  console.log('与 Socrates 相似的实体:');
  const similar = kgReasoner.findSimilarEntities('socrates', 3);
  similar.forEach((entity, i) => {
    console.log(`  ${i + 1}. ${entity.id} (${entity.type})`);
  });

  // 路径推理
  console.log('\n从 Socrates 到 Aristotle 的路径:');
  const paths = kgReasoner.findPath('socrates', 'aristotle', 3);
  paths.forEach((path, i) => {
    const pathStr = path.map(r => `${r.type}(${r.head}→${r.tail})`).join(' → ');
    console.log(`  路径 ${i + 1}: ${pathStr}`);
  });
}

// ============================================
// 演示 3: 统一认知架构
// ============================================

async function demoUnifiedCognition() {
  console.log('\n========================================');
  console.log('演示 3: 统一认知架构');
  console.log('========================================\n');

  const engine = new UnifiedCognitionEngine({
    worldModel: {
      stateDimension: 32,
      actionDimension: 16,
      imaginationHorizon: 10,
    },
    neuroSymbolic: {
      embeddingDimension: 128,
      maxReasoningDepth: 5,
    },
    metacognition: {
      monitoringFrequency: 100,
      strategyThreshold: 0.7,
      resourceStrategy: 'balanced',
    },
  });

  console.log('初始化统一认知引擎...');
  console.log('组件状态:');
  console.log('  - 世界模型: 已初始化');
  console.log('  - 神经符号引擎: 已初始化');
  console.log('  - 元认知控制器: 已初始化');

  // 处理输入
  const testInputs = [
    'What is the best way to learn programming?',
    'Explain quantum computing to a 10-year-old',
    'Should I invest in stocks or bonds?',
  ];

  for (const input of testInputs) {
    console.log(`\n--- 处理输入: "${input}" ---`);
    
    const startTime = Date.now();
    const result = await engine.process(input, { userLevel: 'intermediate' });
    const processingTime = Date.now() - startTime;

    console.log('认知处理完成:');
    console.log('  总处理时间:', processingTime, 'ms');
    console.log('  使用的组件:', result.componentsUsed.join(', '));
    
    console.log('\n  认知轨迹:');
    console.log('    感知阶段:', result.cognitiveTrace.perception.end - result.cognitiveTrace.perception.start, 'ms');
    console.log('    理解阶段:', result.cognitiveTrace.understanding.end - result.cognitiveTrace.understanding.start, 'ms');
    console.log('    推理阶段:', result.cognitiveTrace.reasoning.end - result.cognitiveTrace.reasoning.start, 'ms');
    console.log('    决策阶段:', result.cognitiveTrace.decision.end - result.cognitiveTrace.decision.start, 'ms');

    console.log('\n  资源消耗:');
    console.log('    计算成本:', result.resourceConsumption.computationCost, 'ms');
    console.log('    内存使用:', result.resourceConsumption.memoryUsage, 'bytes');
    console.log('    查询次数:', result.resourceConsumption.queryCount);

    // 显示认知状态
    const cognitiveState = engine.getCognitiveState();
    console.log('\n  当前认知状态:');
    console.log('    感知不确定性:', (cognitiveState.perception.uncertainty * 100).toFixed(1) + '%');
    console.log('    理解置信度:', (cognitiveState.understanding.confidence * 100).toFixed(1) + '%');
    console.log('    识别意图:', cognitiveState.understanding.recognizedIntent);
    console.log('    工作记忆负载:', (cognitiveState.workingMemory.loadLevel * 100).toFixed(1) + '%');
    console.log('    元认知状态:', cognitiveState.metacognition.monitoringStatus);
    console.log('    当前策略:', cognitiveState.metacognition.currentStrategy);
  }

  // 显示处理历史统计
  console.log('\n--- 处理历史统计 ---');
  const history = engine.getProcessingHistory();
  console.log('总处理次数:', history.length);
  
  const avgTime = history.reduce((sum, h) => sum + h.processingTime, 0) / history.length;
  console.log('平均处理时间:', avgTime.toFixed(2), 'ms');

  const componentUsage = new Map<string, number>();
  history.forEach(h => {
    h.componentsUsed.forEach(c => {
      componentUsage.set(c, (componentUsage.get(c) || 0) + 1);
    });
  });

  console.log('组件使用频率:');
  componentUsage.forEach((count, component) => {
    console.log(`  ${component}: ${count} 次`);
  });
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     高级智能体架构演示 - 业界最顶尖的认知系统               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n本演示展示以下核心能力:');
  console.log('  1. 世界模型 - 预测性决策与反事实推理');
  console.log('  2. 神经符号推理 - 可微分逻辑与定理证明');
  console.log('  3. 统一认知架构 - 分层处理与元认知监控');
  console.log('');

  try {
    await demoWorldModel();
    await demoNeuroSymbolic();
    await demoUnifiedCognition();

    console.log('\n\n========================================');
    console.log('所有演示完成!');
    console.log('========================================\n');

    console.log('架构亮点:');
    console.log('✓ 世界模型实现"想象"能力，可在执行前预测结果');
    console.log('✓ 神经符号推理结合神经网络与逻辑推理');
    console.log('✓ 元认知监控实现自我监控和策略自适应');
    console.log('✓ 分层认知处理模拟人类认知流程');
    console.log('✓ 支持反事实学习和持续学习');

  } catch (error) {
    console.error('演示出错:', error);
  }
}

// 运行演示
main().catch(console.error);
