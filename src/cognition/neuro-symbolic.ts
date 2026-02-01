/**
 * 神经符号推理层 (Neuro-Symbolic Reasoning Layer)
 *
 * 实现神经符号 AI 架构，结合神经网络的模式识别能力和符号推理的逻辑严谨性：
 * 1. 可微分逻辑 (Differentiable Logic)
 * 2. 神经定理证明 (Neural Theorem Proving)
 * 3. 符号-神经双向转换
 * 4. 知识图谱嵌入推理
 *
 * 这是实现真正理解能力的关键
 */

import { AgentEventEmitter as EventEmitter } from '../agent/event-system';
import { isBrowser, environment } from '../utils/environment';

// ============================================
// 核心类型定义
// ============================================

export interface NeuroSymbolicConfig {
  /** 嵌入维度 */
  embeddingDimension: number;
  /** 逻辑规则库大小 */
  maxRules: number;
  /** 推理深度限制 */
  maxReasoningDepth: number;
  /** 置信度阈值 */
  confidenceThreshold: number;
  /** 是否启用神经定理证明 */
  enableNeuralTheoremProving: boolean;
  /** 是否启用反绎推理 */
  enableAbduction: boolean;
}

export interface SymbolicAtom {
  /** 谓词 */
  predicate: string;
  /** 参数 */
  arguments: string[];
  /** 真值 (0-1) */
  truthValue: number;
  /** 来源 */
  source: 'observation' | 'inference' | 'axiom';
  /** 置信度 */
  confidence: number;
}

export interface LogicalRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 前提 */
  premises: SymbolicAtom[];
  /** 结论 */
  conclusion: SymbolicAtom;
  /** 规则权重 (可学习) */
  weight: number;
  /** 规则类型 */
  type: 'deductive' | 'inductive' | 'abductive';
}

export interface KnowledgeGraph {
  /** 实体节点 */
  entities: Map<string, Entity>;
  /** 关系边 */
  relations: Relation[];
  /** 嵌入矩阵 */
  embeddings: Map<string, number[]>;
}

export interface Entity {
  /** 实体ID */
  id: string;
  /** 实体类型 */
  type: string;
  /** 实体属性 */
  attributes: Record<string, unknown>;
  /** 嵌入向量 */
  embedding?: number[];
}

export interface Relation {
  /** 关系类型 */
  type: string;
  /** 头实体 */
  head: string;
  /** 尾实体 */
  tail: string;
  /** 关系强度 */
  strength: number;
  /** 时间戳 */
  timestamp: number;
}

export interface ReasoningResult {
  /** 结论 */
  conclusion: SymbolicAtom;
  /** 推理链 */
  proof: ReasoningStep[];
  /** 总置信度 */
  confidence: number;
  /** 推理深度 */
  depth: number;
  /** 使用的规则 */
  rulesApplied: string[];
}

export interface ReasoningStep {
  /** 步骤编号 */
  step: number;
  /** 当前状态 */
  state: SymbolicAtom[];
  /** 应用的规则 */
  rule: LogicalRule;
  /** 产生的结论 */
  conclusion: SymbolicAtom;
}

export interface NeuralProof {
  /** 证明目标 */
  goal: SymbolicAtom;
  /** 证明路径 */
  path: NeuralProofNode[];
  /** 证明得分 */
  score: number;
  /** 是否成功 */
  success: boolean;
}

export interface NeuralProofNode {
  /** 节点ID */
  id: string;
  /** 当前子目标 */
  subgoal: SymbolicAtom;
  /** 子节点 */
  children: NeuralProofNode[];
  /** 应用的规则 */
  rule?: LogicalRule;
  /** 节点得分 */
  score: number;
}

// ============================================
// 符号编码器
// ============================================

export class SymbolicEncoder {
  private config: NeuroSymbolicConfig;
  private vocabulary: Map<string, number> = new Map();

  constructor(config: NeuroSymbolicConfig) {
    this.config = config;
  }

  /**
   * 将符号原子编码为向量
   */
  encodeAtom(atom: SymbolicAtom): number[] {
    // 编码谓词
    const predicateEmbedding = this.encodeText(atom.predicate);

    // 编码参数
    const argEmbeddings = atom.arguments.map(arg => this.encodeText(arg));

    // 合并并添加真值信息
    const combined = [
      ...predicateEmbedding,
      ...argEmbeddings.flat(),
      atom.truthValue,
      atom.confidence,
    ];

    // 填充或截断到指定维度
    return this.normalizeVector(combined, this.config.embeddingDimension);
  }

  /**
   * 将规则编码为向量
   */
  encodeRule(rule: LogicalRule): number[] {
    // 编码前提
    const premiseEmbeddings = rule.premises.map(p => this.encodeAtom(p));

    // 编码结论
    const conclusionEmbedding = this.encodeAtom(rule.conclusion);

    // 合并
    const combined = [
      ...premiseEmbeddings.flat(),
      ...conclusionEmbedding,
      rule.weight,
    ];

    return this.normalizeVector(combined, this.config.embeddingDimension);
  }

  /**
   * 文本编码
   */
  private encodeText(text: string): number[] {
    if (!this.vocabulary.has(text)) {
      this.vocabulary.set(text, this.vocabulary.size);
    }

    const index = this.vocabulary.get(text)!;
    const embedding = new Array(this.config.embeddingDimension / 4).fill(0);

    // 使用哈希位置编码
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const position = (charCode + index * 31) % embedding.length;
      embedding[position] += 1 / text.length;
    }

    return embedding;
  }

  private normalizeVector(vector: number[], targetDim: number): number[] {
    if (vector.length < targetDim) {
      return [...vector, ...new Array(targetDim - vector.length).fill(0)];
    }
    return vector.slice(0, targetDim);
  }
}

// ============================================
// 可微分逻辑层
// ============================================

export class DifferentiableLogic {
  private config: NeuroSymbolicConfig;
  private encoder: SymbolicEncoder;

  constructor(config: NeuroSymbolicConfig) {
    this.config = config;
    this.encoder = new SymbolicEncoder(config);
  }

  /**
   * 可微分 AND 操作
   */
  and(atoms: SymbolicAtom[]): SymbolicAtom {
    const embeddings = atoms.map(a => this.encoder.encodeAtom(a));

    // 计算平均真值 (可微分)
    const avgTruth = atoms.reduce((sum, a) => sum + a.truthValue, 0) / atoms.length;

    // 计算最小置信度
    const minConfidence = Math.min(...atoms.map(a => a.confidence));

    return {
      predicate: `and(${atoms.map(a => a.predicate).join(', ')})`,
      arguments: atoms.flatMap(a => a.arguments),
      truthValue: avgTruth,
      source: 'inference',
      confidence: minConfidence,
    };
  }

  /**
   * 可微分 OR 操作
   */
  or(atoms: SymbolicAtom[]): SymbolicAtom {
    const maxTruth = Math.max(...atoms.map(a => a.truthValue));
    const maxConfidence = Math.max(...atoms.map(a => a.confidence));

    return {
      predicate: `or(${atoms.map(a => a.predicate).join(', ')})`,
      arguments: atoms.flatMap(a => a.arguments),
      truthValue: maxTruth,
      source: 'inference',
      confidence: maxConfidence,
    };
  }

  /**
   * 可微分 NOT 操作
   */
  not(atom: SymbolicAtom): SymbolicAtom {
    return {
      predicate: `not(${atom.predicate})`,
      arguments: atom.arguments,
      truthValue: 1 - atom.truthValue,
      source: 'inference',
      confidence: atom.confidence,
    };
  }

  /**
   * 可微分蕴含 (Fuzzy Implication)
   */
  implies(premise: SymbolicAtom, conclusion: SymbolicAtom): number {
    // Łukasiewicz 蕴含: min(1, 1 - a + b)
    return Math.min(1, 1 - premise.truthValue + conclusion.truthValue);
  }

  /**
   * 规则应用 (前向推理)
   */
  applyRule(rule: LogicalRule, facts: SymbolicAtom[]): SymbolicAtom | null {
    // 检查前提是否匹配
    const matchedPremises: SymbolicAtom[] = [];

    for (const premise of rule.premises) {
      const match = this.findBestMatch(premise, facts);
      if (match && match.confidence >= this.config.confidenceThreshold) {
        matchedPremises.push(match);
      } else {
        return null; // 前提不满足
      }
    }

    // 应用规则
    const combinedTruth = this.and(matchedPremises).truthValue;
    const confidence = Math.min(
      ...matchedPremises.map(p => p.confidence)
    ) * rule.weight;

    return {
      ...rule.conclusion,
      truthValue: combinedTruth,
      confidence,
      source: 'inference',
    };
  }

  /**
   * 寻找最佳匹配
   */
  private findBestMatch(
    premise: SymbolicAtom,
    facts: SymbolicAtom[]
  ): SymbolicAtom | null {
    let bestMatch: SymbolicAtom | null = null;
    let bestScore = 0;

    for (const fact of facts) {
      const score = this.calculateMatchScore(premise, fact);
      if (score > bestScore && score >= this.config.confidenceThreshold) {
        bestScore = score;
        bestMatch = fact;
      }
    }

    return bestMatch;
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(premise: SymbolicAtom, fact: SymbolicAtom): number {
    if (premise.predicate !== fact.predicate) return 0;

    // 参数匹配度
    let argMatchScore = 0;
    for (let i = 0; i < Math.min(premise.arguments.length, fact.arguments.length); i++) {
      if (premise.arguments[i] === fact.arguments[i] || premise.arguments[i].startsWith('?')) {
        argMatchScore += 1;
      }
    }
    argMatchScore /= Math.max(premise.arguments.length, fact.arguments.length);

    // 综合分数
    return argMatchScore * fact.truthValue * fact.confidence;
  }
}

// ============================================
// 神经定理证明器
// ============================================

export class NeuralTheoremProver {
  private config: NeuroSymbolicConfig;
  private encoder: SymbolicEncoder;
  private logic: DifferentiableLogic;

  constructor(config: NeuroSymbolicConfig) {
    this.config = config;
    this.encoder = new SymbolicEncoder(config);
    this.logic = new DifferentiableLogic(config);
  }

  /**
   * 尝试证明目标
   */
  prove(
    goal: SymbolicAtom,
    facts: SymbolicAtom[],
    rules: LogicalRule[],
    maxDepth: number = this.config.maxReasoningDepth
  ): NeuralProof {
    const root: NeuralProofNode = {
      id: 'root',
      subgoal: goal,
      children: [],
      score: goal.confidence,
    };

    const success = this.proveRecursive(root, facts, rules, 0, maxDepth);

    return {
      goal,
      path: this.extractProofPath(root),
      score: root.score,
      success,
    };
  }

  private proveRecursive(
    node: NeuralProofNode,
    facts: SymbolicAtom[],
    rules: LogicalRule[],
    depth: number,
    maxDepth: number
  ): boolean {
    // 检查深度限制
    if (depth >= maxDepth) {
      node.score *= 0.5; // 深度惩罚
      return false;
    }

    // 1. 检查是否在事实中
    const directMatch = facts.find(f =>
      f.predicate === node.subgoal.predicate &&
      this.matchArguments(f.arguments, node.subgoal.arguments)
    );

    if (directMatch && directMatch.truthValue >= this.config.confidenceThreshold) {
      node.score = directMatch.confidence;
      return true;
    }

    // 2. 尝试应用规则
    for (const rule of rules) {
      if (rule.conclusion.predicate === node.subgoal.predicate) {
        // 创建子目标
        const childNodes: NeuralProofNode[] = [];
        let allChildrenSuccess = true;

        for (const premise of rule.premises) {
          const childNode: NeuralProofNode = {
            id: `${node.id}-${childNodes.length}`,
            subgoal: premise,
            children: [],
            score: premise.confidence,
            rule,
          };

          const childSuccess = this.proveRecursive(
            childNode, facts, rules, depth + 1, maxDepth
          );

          childNodes.push(childNode);
          if (!childSuccess) {
            allChildrenSuccess = false;
          }
        }

        node.children = childNodes;

        if (allChildrenSuccess) {
          // 计算综合得分
          node.score = childNodes.reduce((sum, c) => sum + c.score, 0) /
            childNodes.length * rule.weight;
          return true;
        }
      }
    }

    // 3. 尝试反绎推理 (如果启用)
    if (this.config.enableAbduction) {
      const abduced = this.attemptAbduction(node.subgoal, facts, rules);
      if (abduced) {
        node.children = [abduced];
        node.score = abduced.score * 0.8; // 反绎推理置信度降低
        return true;
      }
    }

    node.score *= 0.3; // 失败惩罚
    return false;
  }

  /**
   * 尝试反绎推理
   */
  private attemptAbduction(
    goal: SymbolicAtom,
    facts: SymbolicAtom[],
    rules: LogicalRule[]
  ): NeuralProofNode | null {
    // 寻找可以推出目标的规则
    for (const rule of rules) {
      if (rule.type === 'abductive' &&
          this.matchArguments(rule.conclusion.arguments, goal.arguments)) {
        // 反绎: 假设前提为真
        const abducedNode: NeuralProofNode = {
          id: 'abduced',
          subgoal: rule.premises[0],
          children: [],
          score: 0.6, // 反绎假设的默认置信度
          rule,
        };
        return abducedNode;
      }
    }
    return null;
  }

  /**
   * 匹配参数
   */
  private matchArguments(args1: string[], args2: string[]): boolean {
    if (args1.length !== args2.length) return false;

    for (let i = 0; i < args1.length; i++) {
      // 变量可以匹配任何值
      if (args1[i].startsWith('?') || args2[i].startsWith('?')) continue;
      if (args1[i] !== args2[i]) return false;
    }

    return true;
  }

  /**
   * 提取证明路径
   */
  private extractProofPath(root: NeuralProofNode): NeuralProofNode[] {
    const path: NeuralProofNode[] = [root];

    for (const child of root.children) {
      if (child.score > 0.5) {
        path.push(...this.extractProofPath(child));
      }
    }

    return path;
  }
}

// ============================================
// 知识图谱推理
// ============================================

export class KnowledgeGraphReasoner {
  private kg: KnowledgeGraph;
  private config: NeuroSymbolicConfig;

  constructor(config: NeuroSymbolicConfig) {
    this.config = config;
    this.kg = {
      entities: new Map(),
      relations: [],
      embeddings: new Map(),
    };
  }

  /**
   * 添加实体
   */
  addEntity(entity: Entity): void {
    // 生成嵌入
    if (!entity.embedding) {
      entity.embedding = this.generateEmbedding(entity);
    }

    this.kg.entities.set(entity.id, entity);
    this.kg.embeddings.set(entity.id, entity.embedding);
  }

  /**
   * 添加关系
   */
  addRelation(relation: Relation): void {
    this.kg.relations.push(relation);
  }

  /**
   * 关系推理 (TransE 风格)
   */
  inferRelation(headId: string, tailId: string): string | null {
    const head = this.kg.embeddings.get(headId);
    const tail = this.kg.embeddings.get(tailId);

    if (!head || !tail) return null;

    // 预测关系: r ≈ h - t
    const predictedRelation = head.map((h, i) => h - tail[i]);

    // 找到最相似的关系
    let bestRelation: string | null = null;
    let bestScore = -Infinity;

    for (const relation of this.kg.relations) {
      const relationEmbedding = this.encodeRelationType(relation.type);
      const similarity = this.cosineSimilarity(predictedRelation, relationEmbedding);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestRelation = relation.type;
      }
    }

    return bestScore > 0.7 ? bestRelation : null;
  }

  /**
   * 路径推理
   */
  findPath(
    startId: string,
    endId: string,
    maxLength: number = 3
  ): Relation[][] {
    const paths: Relation[][] = [];
    const visited = new Set<string>();

    this.dfsPath(startId, endId, [], paths, visited, maxLength);

    return paths.sort((a, b) => b.length - a.length);
  }

  private dfsPath(
    current: string,
    target: string,
    currentPath: Relation[],
    allPaths: Relation[][],
    visited: Set<string>,
    maxLength: number
  ): void {
    if (current === target && currentPath.length > 0) {
      allPaths.push([...currentPath]);
      return;
    }

    if (currentPath.length >= maxLength) return;
    if (visited.has(current)) return;

    visited.add(current);

    // 找到所有从当前实体出发的关系
    const outgoing = this.kg.relations.filter(r => r.head === current);

    for (const relation of outgoing) {
      currentPath.push(relation);
      this.dfsPath(relation.tail, target, currentPath, allPaths, visited, maxLength);
      currentPath.pop();
    }

    visited.delete(current);
  }

  /**
   * 相似实体查询
   */
  findSimilarEntities(entityId: string, topK: number = 5): Entity[] {
    const targetEmbedding = this.kg.embeddings.get(entityId);
    if (!targetEmbedding) return [];

    const similarities: { entity: Entity; score: number }[] = [];

    for (const [id, embedding] of this.kg.embeddings) {
      if (id !== entityId) {
        const entity = this.kg.entities.get(id);
        if (entity) {
          const score = this.cosineSimilarity(targetEmbedding, embedding);
          similarities.push({ entity, score });
        }
      }
    }

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => s.entity);
  }

  private generateEmbedding(entity: Entity): number[] {
    // 基于属性和类型生成嵌入
    const features: number[] = [];

    // 类型编码
    features.push(...this.encodeText(entity.type));

    // 属性编码
    for (const [key, value] of Object.entries(entity.attributes)) {
      features.push(...this.encodeText(`${key}:${JSON.stringify(value)}`));
    }

    return this.normalizeVector(features, this.config.embeddingDimension);
  }

  private encodeRelationType(type: string): number[] {
    return this.encodeText(type);
  }

  private encodeText(text: string): number[] {
    const embedding = new Array(this.config.embeddingDimension / 4).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[charCode % embedding.length] += 1 / text.length;
    }
    return embedding;
  }

  private normalizeVector(vector: number[], targetDim: number): number[] {
    if (vector.length < targetDim) {
      return [...vector, ...new Array(targetDim - vector.length).fill(0)];
    }
    return vector.slice(0, targetDim);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 获取知识图谱
   */
  getKnowledgeGraph(): KnowledgeGraph {
    return this.kg;
  }
}

// ============================================
// 神经符号推理引擎主类
// ============================================

export class NeuroSymbolicEngine extends EventEmitter {
  private config: NeuroSymbolicConfig;
  private encoder: SymbolicEncoder;
  private logic: DifferentiableLogic;
  private prover: NeuralTheoremProver;
  private kgReasoner: KnowledgeGraphReasoner;

  private facts: SymbolicAtom[] = [];
  private rules: LogicalRule[] = [];

  constructor(config: Partial<NeuroSymbolicConfig> = {}) {
    super();

    this.config = {
      embeddingDimension: 128,
      maxRules: 1000,
      maxReasoningDepth: 5,
      confidenceThreshold: 0.6,
      enableNeuralTheoremProving: true,
      enableAbduction: true,
      ...config,
    };

    this.encoder = new SymbolicEncoder(this.config);
    this.logic = new DifferentiableLogic(this.config);
    this.prover = new NeuralTheoremProver(this.config);
    this.kgReasoner = new KnowledgeGraphReasoner(this.config);
  }

  /**
   * 添加事实
   */
  addFact(fact: SymbolicAtom): void {
    this.facts.push(fact);
    this.emit({ id: 'fact', type: 'agent:initialized', timestamp: Date.now(), traceId: 'fact', conversationId: 'fact', messageId: 'fact' });
  }

  /**
   * 添加规则
   */
  addRule(rule: LogicalRule): void {
    if (this.rules.length >= this.config.maxRules) {
      this.rules.shift();
    }
    this.rules.push(rule);
    this.emit({ id: 'rule', type: 'agent:initialized', timestamp: Date.now(), traceId: 'rule', conversationId: 'rule', messageId: 'rule' });
  }

  /**
   * 推理查询
   */
  query(query: SymbolicAtom): ReasoningResult {
    // 1. 直接匹配
    const directMatch = this.facts.find(f =>
      f.predicate === query.predicate &&
      this.matchArguments(f.arguments, query.arguments)
    );

    if (directMatch) {
      return {
        conclusion: directMatch,
        proof: [],
        confidence: directMatch.confidence,
        depth: 0,
        rulesApplied: [],
      };
    }

    // 2. 前向推理
    const forwardResult = this.forwardReasoning(query);
    if (forwardResult) return forwardResult;

    // 3. 神经定理证明
    if (this.config.enableNeuralTheoremProving) {
      const neuralProof = this.prover.prove(query, this.facts, this.rules);
      if (neuralProof.success) {
        return this.convertNeuralProofToResult(neuralProof);
      }
    }

    // 4. 知识图谱推理
    const kgResult = this.kgQuery(query);
    if (kgResult) return kgResult;

    // 失败返回
    return {
      conclusion: { ...query, truthValue: 0, confidence: 0, source: 'inference' },
      proof: [],
      confidence: 0,
      depth: 0,
      rulesApplied: [],
    };
  }

  /**
   * 前向推理
   */
  private forwardReasoning(query: SymbolicAtom): ReasoningResult | null {
    const applied: ReasoningStep[] = [];
    const rulesApplied: string[] = [];
    let currentFacts = [...this.facts];

    for (let depth = 0; depth < this.config.maxReasoningDepth; depth++) {
      let newFactAdded = false;

      for (const rule of this.rules) {
        const conclusion = this.logic.applyRule(rule, currentFacts);

        if (conclusion) {
          // 检查是否匹配查询
          if (conclusion.predicate === query.predicate &&
              this.matchArguments(conclusion.arguments, query.arguments)) {
            return {
              conclusion,
              proof: applied,
              confidence: conclusion.confidence,
              depth: applied.length,
              rulesApplied,
            };
          }

          // 添加新事实
          if (!currentFacts.some(f =>
            f.predicate === conclusion.predicate &&
            this.matchArguments(f.arguments, conclusion.arguments)
          )) {
            currentFacts.push(conclusion);
            applied.push({
              step: applied.length + 1,
              state: [...currentFacts],
              rule,
              conclusion,
            });
            rulesApplied.push(rule.id);
            newFactAdded = true;
          }
        }
      }

      if (!newFactAdded) break;
    }

    return null;
  }

  /**
   * 知识图谱查询
   */
  private kgQuery(query: SymbolicAtom): ReasoningResult | null {
    // 解析查询中的实体
    const entities = query.arguments.filter(arg =>
      this.kgReasoner['kg'].entities.has(arg)
    );

    if (entities.length >= 2) {
      const inferredRelation = this.kgReasoner.inferRelation(entities[0], entities[1]);

      if (inferredRelation && inferredRelation === query.predicate) {
        return {
          conclusion: {
            ...query,
            truthValue: 0.8,
            confidence: 0.7,
            source: 'inference',
          },
          proof: [],
          confidence: 0.7,
          depth: 1,
          rulesApplied: ['kg_inference'],
        };
      }
    }

    return null;
  }

  /**
   * 学习新规则 (归纳学习)
   */
  learnRule(examples: { premises: SymbolicAtom[]; conclusion: SymbolicAtom }[]): LogicalRule | null {
    if (examples.length < 2) return null;

    // 简化的规则学习: 寻找共同模式
    const commonPremises = this.findCommonPatterns(examples.map(e => e.premises));
    const commonConclusion = this.findCommonConclusion(examples.map(e => e.conclusion));

    if (commonPremises.length > 0 && commonConclusion) {
      const newRule: LogicalRule = {
        id: `learned-${Date.now()}`,
        name: 'Learned Rule',
        premises: commonPremises,
        conclusion: commonConclusion,
        weight: 0.7, // 学习规则的默认权重
        type: 'inductive',
      };

      this.addRule(newRule);
      return newRule;
    }

    return null;
  }

  private findCommonPatterns(premisesList: SymbolicAtom[][]): SymbolicAtom[] {
    // 简化实现: 返回第一个例子的前提
    return premisesList[0] || [];
  }

  private findCommonConclusion(conclusions: SymbolicAtom[]): SymbolicAtom | null {
    // 简化实现: 返回第一个结论
    return conclusions[0] || null;
  }

  private matchArguments(args1: string[], args2: string[]): boolean {
    if (args1.length !== args2.length) return false;

    for (let i = 0; i < args1.length; i++) {
      if (args1[i].startsWith('?') || args2[i].startsWith('?')) continue;
      if (args1[i] !== args2[i]) return false;
    }

    return true;
  }

  private convertNeuralProofToResult(proof: NeuralProof): ReasoningResult {
    return {
      conclusion: { ...proof.goal, truthValue: proof.score, confidence: proof.score },
      proof: proof.path.map((node, i) => ({
        step: i + 1,
        state: [node.subgoal],
        rule: node.rule!,
        conclusion: node.subgoal,
      })),
      confidence: proof.score,
      depth: proof.path.length,
      rulesApplied: proof.path.map(n => n.rule?.id || 'unknown'),
    };
  }

  /**
   * 获取知识图谱推理器
   */
  getKGReasoner(): KnowledgeGraphReasoner {
    return this.kgReasoner;
  }

  /**
   * 获取所有事实
   */
  getFacts(): SymbolicAtom[] {
    return [...this.facts];
  }

  /**
   * 获取所有规则
   */
  getRules(): LogicalRule[] {
    return [...this.rules];
  }

  /**
   * 清空知识库
   */
  clear(): void {
    this.facts = [];
    this.rules = [];
    this.emit({ id: 'cleared', type: 'agent:initialized', timestamp: Date.now(), traceId: 'cleared', conversationId: 'cleared', messageId: 'cleared' });
  }
}

export default NeuroSymbolicEngine;
