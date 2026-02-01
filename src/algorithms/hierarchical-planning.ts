/**
 * 层次规划系统 (Hierarchical Planning)
 * 
 * 实现Hierarchical Task Network (HTN) 规划算法，支持：
 * 1. 任务分解 (Task Decomposition)
 * 2. 方法选择 (Method Selection)
 * 3. 偏序规划 (Partial Order Planning)
 * 4. 冲突检测与消解
 * 5. 计划执行与监控
 * 
 * 适用于复杂多步任务规划场景
 */

export interface PlanningConfig {
  /** 最大规划深度 */
  maxDepth: number;
  /** 最大分支因子 */
  maxBranchingFactor: number;
  /** 规划超时时间(ms) */
  timeout: number;
  /** 是否启用偏序规划 */
  enablePartialOrder: boolean;
  /** 是否启用计划优化 */
  enableOptimization: boolean;
  /** 优化迭代次数 */
  optimizationIterations: number;
  /** 是否启用计划修复 */
  enableReplanning: boolean;
  /** 重新规划阈值 */
  replanningThreshold: number;
  /** 执行监控间隔(ms) */
  monitoringInterval: number;
}

export interface Task {
  /** 任务唯一ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 任务类型 */
  type: 'primitive' | 'compound';
  /** 前置条件 */
  preconditions?: Condition[];
  /** 后置效果 */
  effects?: Effect[];
  /** 任务参数 */
  parameters?: Record<string, unknown>;
  /** 任务优先级 */
  priority?: number;
  /** 预估成本 */
  estimatedCost?: number;
  /** 父任务ID */
  parentId?: string;
  /** 子任务IDs */
  subtaskIds?: string[];
  /** 动作定义 */
  action?: TaskAction;
  /** 预估执行时间(ms) */
  estimatedDuration?: number;
}

export interface CompoundTask extends Task {
  type: 'compound';
  /** 可用的分解方法 */
  methods: Method[];
}

export interface TaskAction {
  /** 动作类型 */
  type: string;
  /** 动作参数 */
  params?: Record<string, unknown>;
}

export interface PrimitiveTask extends Task {
  type: 'primitive';
  /** 执行函数 */
  execute?: (context: ExecutionContext) => Promise<TaskResult>;
  /** 动作定义 */
  action?: TaskAction;
  /** 执行超时(ms) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 预估执行时间(ms) */
  estimatedDuration?: number;
  /** 是否为可选任务 */
  optional?: boolean;
}

export interface Method {
  /** 方法唯一ID */
  id: string;
  /** 方法名称 */
  name: string;
  /** 方法适用条件 */
  applicability: Condition[];
  /** 子任务列表 */
  subtasks: Task[];
  /** 子任务间的偏序约束 */
  orderingConstraints?: OrderingConstraint[];
  /** 因果约束 */
  causalConstraints?: CausalConstraint[];
  /** 方法优先级 */
  priority?: number;
  /** 预估成本 */
  estimatedCost?: number;
}

export interface Condition {
  /** 条件类型 */
  type: 'state' | 'resource' | 'temporal' | 'logical';
  /** 条件描述 */
  description: string;
  /** 条件目标 */
  target?: string;
  /** 条件检查函数 */
  check: (state: WorldState) => boolean;
  /** 条件参数 */
  parameters?: Record<string, unknown>;
}

export interface Effect {
  /** 效果类型 */
  type: 'add' | 'delete' | 'update';
  /** 目标状态 */
  target: string;
  /** 效果值 */
  value?: unknown;
  /** 效果应用函数 */
  apply: (state: WorldState) => WorldState;
}

/**
 * 目标定义
 */
export interface Goal {
  /** 目标ID */
  id: string;
  /** 目标名称 */
  name: string;
  /** 目标描述 */
  description?: string;
  /** 目标条件 */
  conditions: Condition[];
  /** 目标优先级 */
  priority?: number;
  /** 目标截止时间 */
  deadline?: Date;
}

export interface OrderingConstraint {
  /** 前置任务 */
  before: string;
  /** 后置任务 */
  after: string;
  /** 约束类型 */
  type: 'sequential' | 'parallel' | 'start' | 'end';
}

export interface CausalConstraint {
  /** 提供者任务 */
  provider: string;
  /** 接收者任务 */
  receiver: string;
  /** 因果条件 */
  condition: Condition;
}

export interface WorldState {
  /** 状态变量 */
  variables: Map<string, unknown>;
  /** 资源状态 */
  resources: Map<string, ResourceState>;
  /** 时间戳 */
  timestamp: number;
  /** 历史记录 */
  history: StateChange[];
}

export interface ResourceState {
  /** 资源ID */
  id: string;
  /** 资源数量 */
  quantity: number;
  /** 资源容量 */
  capacity?: number;
  /** 使用者 */
  usedBy?: string[];
}

export interface StateChange {
  /** 变化时间 */
  timestamp: number;
  /** 变化描述 */
  description: string;
  /** 变化前状态 */
  before?: unknown;
  /** 变化后状态 */
  after?: unknown;
}

export interface Plan {
  /** 计划唯一ID */
  id: string;
  /** 根任务 */
  rootTask: Task;
  /** 所有任务 */
  tasks: Map<string, Task>;
  /** 任务分解树 */
  decompositionTree: DecompositionNode;
  /** 偏序关系 */
  partialOrder: PartialOrderGraph;
  /** 线性化后的执行序列 */
  linearizedSequence?: PrimitiveTask[];
  /** 计划总成本 */
  totalCost: number;
  /** 预估执行时间(ms) */
  estimatedDuration: number;
  /** 创建时间 */
  createdAt: Date;
  /** 计划目标 */
  goal?: Goal;
}

export interface DecompositionNode {
  /** 节点任务 */
  task: Task;
  /** 子节点 */
  children: DecompositionNode[];
  /** 分解深度 */
  depth: number;
  /** 所使用的方法 */
  method?: Method;
}

export interface PartialOrderGraph {
  /** 任务节点 */
  nodes: Set<string>;
  /** 边集合 (before -> after) */
  edges: Map<string, Set<string>>;
  /** 开始任务 */
  startTasks: Set<string>;
  /** 结束任务 */
  endTasks: Set<string>;
}

export interface TaskResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  output?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 执行时间(ms) */
  executionTime?: number;
}

export interface ExecutionContext {
  /** 世界状态 */
  worldState: WorldState;
  /** 执行历史 */
  executionHistory: TaskResult[];
  /** 全局变量 */
  variables: Map<string, unknown>;
  /** 执行配置 */
  config?: PlanningConfig;
}

export interface PlanningStatistics {
  /** 规划耗时(ms) */
  planningTime: number;
  /** 探索的节点数 */
  nodesExplored: number;
  /** 最大深度 */
  maxDepthReached: number;
  /** 回溯次数 */
  backtracks: number;
  /** 生成的计划数 */
  plansGenerated: number;
}

/**
 * HTN规划器
 */
export class HTNPlanner {
  private config: PlanningConfig;
  private statistics: PlanningStatistics;

  constructor(config: Partial<PlanningConfig> = {}) {
    this.config = {
      maxDepth: 10,
      maxBranchingFactor: 5,
      timeout: 30000,
      enablePartialOrder: true,
      enableOptimization: true,
      optimizationIterations: 3,
      enableReplanning: true,
      replanningThreshold: 0.7,
      monitoringInterval: 1000,
      ...config
    };

    this.statistics = {
      planningTime: 0,
      nodesExplored: 0,
      maxDepthReached: 0,
      backtracks: 0,
      plansGenerated: 0
    };
  }

  /**
   * 生成计划
   */
  async generatePlan(
    rootTask: Task,
    initialState: WorldState,
    goal?: Goal
  ): Promise<Plan | null> {
    const startTime = Date.now();
    this.statistics = {
      planningTime: 0,
      nodesExplored: 0,
      maxDepthReached: 0,
      backtracks: 0,
      plansGenerated: 0
    };

    try {
      // 1. 任务分解
      const decompositionTree = await this.decomposeTask(
        rootTask,
        initialState,
        0
      );

      if (!decompositionTree) {
        return null;
      }

      // 2. 构建偏序关系
      const partialOrder = this.buildPartialOrder(decompositionTree);

      // 3. 线性化
      const linearizedSequence = this.linearizePartialOrder(
        decompositionTree,
        partialOrder
      );

      if (!linearizedSequence) {
        return null;
      }

      // 4. 计算成本和预估时间
      const { totalCost, estimatedDuration } = this.calculatePlanMetrics(
        decompositionTree,
        linearizedSequence
      );

      // 5. 优化计划 (可选)
      let optimizedSequence = linearizedSequence;
      if (this.config.enableOptimization) {
        optimizedSequence = await this.optimizePlan(
          linearizedSequence,
          initialState
        );
      }

      const plan: Plan = {
        id: `plan-${Date.now()}`,
        rootTask,
        tasks: this.extractAllTasks(decompositionTree),
        decompositionTree,
        partialOrder,
        linearizedSequence: optimizedSequence,
        totalCost,
        estimatedDuration,
        createdAt: new Date(),
        goal
      };

      this.statistics.planningTime = Date.now() - startTime;
      this.statistics.plansGenerated = 1;

      return plan;
    } catch (error) {
      console.error('Plan generation failed:', error);
      return null;
    }
  }

  /**
   * 执行任务分解
   */
  private async decomposeTask(
    task: Task,
    state: WorldState,
    depth: number
  ): Promise<DecompositionNode | null> {
    this.statistics.nodesExplored++;
    this.statistics.maxDepthReached = Math.max(this.statistics.maxDepthReached, depth);

    // 检查深度限制
    if (depth > this.config.maxDepth) {
      return null;
    }

    // 检查前置条件
    if (task.preconditions && !this.checkConditions(task.preconditions, state)) {
      return null;
    }

    // 基础任务直接返回
    if (task.type === 'primitive') {
      return {
        task,
        children: [],
        depth
      };
    }

    // 复合任务：选择方法并递归分解
    const compoundTask = task as CompoundTask;
    const selectedMethod = await this.selectMethod(compoundTask, state);

    if (!selectedMethod) {
      return null;
    }

    const children: DecompositionNode[] = [];
    let currentState = { ...state };

    for (const subtask of selectedMethod.subtasks) {
      const child = await this.decomposeTask(subtask, currentState, depth + 1);
      if (!child) {
        this.statistics.backtracks++;
        return null;
      }
      children.push(child);

      // 更新状态（模拟执行）
      if (subtask.effects) {
        currentState = this.applyEffects(subtask.effects, currentState);
      }
    }

    return {
      task,
      children,
      depth,
      method: selectedMethod
    };
  }

  /**
   * 选择最佳方法
   */
  private async selectMethod(
    task: CompoundTask,
    state: WorldState
  ): Promise<Method | null> {
    const applicableMethods = task.methods.filter(method =>
      this.checkConditions(method.applicability, state)
    );

    if (applicableMethods.length === 0) {
      return null;
    }

    // 按优先级排序
    applicableMethods.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // 选择第一个适用的方法
    return applicableMethods[0];
  }

  /**
   * 检查条件
   */
  private checkConditions(conditions: Condition[], state: WorldState): boolean {
    return conditions.every(condition => condition.check(state));
  }

  /**
   * 应用效果
   */
  private applyEffects(effects: Effect[], state: WorldState): WorldState {
    let newState = { ...state };

    for (const effect of effects) {
      newState = effect.apply(newState);
    }

    return newState;
  }

  /**
   * 构建偏序关系图
   */
  private buildPartialOrder(decompositionTree: DecompositionNode): PartialOrderGraph {
    const nodes = new Set<string>();
    const edges = new Map<string, Set<string>>();
    const startTasks = new Set<string>();
    const endTasks = new Set<string>();

    // 收集所有任务节点
    this.collectTasks(decompositionTree, nodes);

    // 构建边关系
    this.buildEdges(decompositionTree, edges);

    // 识别开始和结束任务
    for (const nodeId of nodes) {
      const hasIncoming = Array.from(edges.values()).some(set => set.has(nodeId));
      const hasOutgoing = edges.get(nodeId)?.size || 0;

      if (!hasIncoming) {
        startTasks.add(nodeId);
      }
      if (!hasOutgoing) {
        endTasks.add(nodeId);
      }
    }

    return {
      nodes,
      edges,
      startTasks,
      endTasks
    };
  }

  /**
   * 收集所有任务
   */
  private collectTasks(node: DecompositionNode, collection: Set<string>): void {
    collection.add(node.task.id);
    for (const child of node.children) {
      this.collectTasks(child, collection);
    }
  }

  /**
   * 构建边关系
   */
  private buildEdges(node: DecompositionNode, edges: Map<string, Set<string>>): void {
    // 初始化当前节点的边
    if (!edges.has(node.task.id)) {
      edges.set(node.task.id, new Set());
    }

    // 处理子节点的偏序约束
    if (node.method?.orderingConstraints) {
      for (const constraint of node.method.orderingConstraints) {
        if (!edges.has(constraint.before)) {
          edges.set(constraint.before, new Set());
        }
        edges.get(constraint.before)!.add(constraint.after);
      }
    }

    // 递归处理子节点
    for (const child of node.children) {
      this.buildEdges(child, edges);
    }
  }

  /**
   * 线性化偏序关系
   */
  private linearizePartialOrder(
    decompositionTree: DecompositionNode,
    partialOrder: PartialOrderGraph
  ): PrimitiveTask[] | null {
    const visited = new Set<string>();
    const result: PrimitiveTask[] = [];
    const tempMark = new Set<string>();

    // 拓扑排序
    const visit = (taskId: string): boolean => {
      if (tempMark.has(taskId)) {
        return false; // 检测到环
      }
      if (visited.has(taskId)) {
        return true;
      }

      tempMark.add(taskId);

      const neighbors = partialOrder.edges.get(taskId) || new Set();
      for (const neighbor of neighbors) {
        if (!visit(neighbor)) {
          return false;
        }
      }

      tempMark.delete(taskId);
      visited.add(taskId);

      const task = this.findTaskById(decompositionTree, taskId);
      if (task && task.type === 'primitive') {
        result.unshift(task as PrimitiveTask);
      }

      return true;
    };

    // 从所有开始任务开始遍历
    for (const startTask of partialOrder.startTasks) {
      if (!visit(startTask)) {
        return null; // 存在环，无法线性化
      }
    }

    return result;
  }

  /**
   * 根据ID查找任务
   */
  private findTaskById(node: DecompositionNode, id: string): Task | null {
    if (node.task.id === id) {
      return node.task;
    }

    for (const child of node.children) {
      const found = this.findTaskById(child, id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * 提取所有任务
   */
  private extractAllTasks(decompositionTree: DecompositionNode): Map<string, Task> {
    const tasks = new Map<string, Task>();

    const collect = (node: DecompositionNode) => {
      tasks.set(node.task.id, node.task);
      for (const child of node.children) {
        collect(child);
      }
    };

    collect(decompositionTree);
    return tasks;
  }

  /**
   * 计算计划指标
   */
  private calculatePlanMetrics(
    _decompositionTree: DecompositionNode,
    sequence: PrimitiveTask[]
  ): { totalCost: number; estimatedDuration: number } {
    let totalCost = 0;
    let estimatedDuration = 0;

    for (const task of sequence) {
      totalCost += task.estimatedCost || 1;
      estimatedDuration += task.timeout || 1000;
    }

    return { totalCost, estimatedDuration };
  }

  /**
   * 优化计划
   */
  private async optimizePlan(
    sequence: PrimitiveTask[],
    _initialState: WorldState
  ): Promise<PrimitiveTask[]> {
    // 简化的优化：移除不必要的任务
    const necessary = new Set<string>();
    const state = { ..._initialState };

    for (const task of sequence) {
      const canExecute = !task.preconditions || this.checkConditions(task.preconditions, state);

      if (canExecute) {
        necessary.add(task.id);

        // 应用效果
        if (task.effects) {
          for (const effect of task.effects) {
            (state as Record<string, unknown>)[effect.target] = effect.value;
          }
        }
      }
    }

    return sequence.filter(task => necessary.has(task.id));
  }

  /**
   * 执行计划
   */
  async executePlan(
    plan: Plan,
    context: ExecutionContext
  ): Promise<{ success: boolean; results: TaskResult[] }> {
    const results: TaskResult[] = [];

    for (const task of plan.linearizedSequence || []) {
      const result = await this.executeTask(task, context);
      results.push(result);

      if (!result.success && !task.optional) {
        // 非可选任务失败，尝试重新规划
        if (this.config.enableReplanning) {
          const regeneratedPlan = await this.tryRegeneratePlan(plan, task, context);
          if (regeneratedPlan) {
            return this.executePlan(regeneratedPlan, context);
          }
        }

        return { success: false, results };
      }

      // 更新上下文
      context.executionHistory.push(result);
    }

    return { success: true, results };
  }

  /**
   * 执行单个任务
   */
  private async executeTask(
    task: PrimitiveTask,
    context: ExecutionContext
  ): Promise<TaskResult> {
    const maxRetries = task.retries || 0;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const timeout = task.timeout || 30000;

        if (!task.execute) {
          throw new Error(`Task ${task.id} has no execute function`);
        }

        const result = await Promise.race([
          task.execute(context),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Task timeout')), timeout)
          )
        ]);

        return result;
      } catch (error) {
        if (i === maxRetries) {
          return {
            success: false,
            error: error as Error
          };
        }

        // 等待后重试
        await this.delay(1000 * Math.pow(2, i));
      }
    }

    return { success: false };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 尝试重新生成计划
   */
  private async tryRegeneratePlan(
    currentPlan: Plan,
    failedTask: PrimitiveTask,
    context: ExecutionContext
  ): Promise<Plan | null> {
    // 找到失败任务的索引
    const failedIndex = currentPlan.linearizedSequence?.findIndex(
      t => t.id === failedTask.id
    ) || -1;

    if (failedIndex === -1) {
      return null;
    }

    // 尝试跳过失败任务（如果是可选的）
    if (failedTask.optional) {
      const newSequence = currentPlan.linearizedSequence?.filter(
        (_, index) => index !== failedIndex
      ) || [];

      // 验证剩余任务是否仍然可以达到目标
      if (!currentPlan.goal) {
        return null;
      }

      const canAchieveGoal = await this.verifyPlanAchievesGoal(
        newSequence,
        context.worldState,
        currentPlan.goal
      );

      if (canAchieveGoal) {
        return {
          ...currentPlan,
          linearizedSequence: newSequence,
          totalCost: this.recalculateCost(newSequence),
          estimatedDuration: this.recalculateDuration(newSequence)
        };
      }
    }

    return null;
  }

  /**
   * 尝试分解任务
   */
  private async tryDecomposeTask(
    task: PrimitiveTask,
    _context: ExecutionContext
  ): Promise<PrimitiveTask[] | null> {
    // 获取任务的分解方法（如果有）
    const methods = (task as unknown as CompoundTask).methods || [];

    for (const method of methods) {
      if (this.checkConditions(method.applicability, _context.worldState)) {
        const decomposed = await this.decomposeWithMethod(task, method, _context);
        if (decomposed) {
          return decomposed;
        }
      }
    }

    return null;
  }

  /**
   * 使用方法分解任务
   */
  private async decomposeWithMethod(
    task: PrimitiveTask,
    method: Method,
    _context: ExecutionContext
  ): Promise<PrimitiveTask[] | null> {
    // 获取方法的子任务
    const subtasks = method.subtasks || [];

    // 将子任务转换为原始任务
    const primitiveSubtasks: PrimitiveTask[] = subtasks.map((subtask, index) => ({
      id: `${task.id}-sub-${index}`,
      name: subtask.name,
      type: 'primitive' as const,
      description: `Subtask of ${task.name}: ${subtask.name}`,
      action: subtask.action,
      preconditions: subtask.preconditions,
      effects: subtask.effects,
      estimatedCost: (task.estimatedCost || 0) / subtasks.length,
      estimatedDuration: (task.estimatedDuration || 0) / subtasks.length
    }));

    return primitiveSubtasks;
  }

  /**
   * 验证计划是否可以达到目标
   */
  private async verifyPlanAchievesGoal(
    sequence: PrimitiveTask[],
    initialState: WorldState,
    goal: Goal
  ): Promise<boolean> {
    let state = { ...initialState };

    // 模拟执行计划
    for (const task of sequence) {
      // 检查前置条件
      if (task.preconditions && !this.checkConditions(task.preconditions, state)) {
        return false;
      }

      // 应用效果
      if (task.effects) {
        state = this.applyEffects(task.effects, state);
      }
    }

    // 检查目标条件
    return this.checkConditions(goal.conditions, state);
  }

  /**
   * 重新计算成本
   */
  private recalculateCost(sequence: PrimitiveTask[]): number {
    return sequence.reduce((sum, task) => sum + (task.estimatedCost || 1), 0);
  }

  /**
   * 重新计算预估时间
   */
  private recalculateDuration(sequence: PrimitiveTask[]): number {
    return sequence.reduce((sum, task) => sum + (task.estimatedDuration || 1000), 0);
  }

  /**
   * 获取统计信息
   */
  getStatistics(): PlanningStatistics {
    return { ...this.statistics };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PlanningConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default HTNPlanner;
