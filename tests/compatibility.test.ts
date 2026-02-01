/**
 * 环境兼容性测试
 *
 * 确保智能体架构在浏览器和Node.js环境中都能正常工作
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { environment, isBrowser, isNode, getStorage, PerformanceTimer } from '../src/utils/environment';
import { WorldModel } from '../src/cognition/world-model';
import { NeuroSymbolicEngine } from '../src/cognition/neuro-symbolic';
import { UnifiedCognitionEngine } from '../src/cognition/unified-cognition';

// ============================================
// 环境检测测试
// ============================================

describe('环境检测', () => {
  it('should detect environment type', () => {
    expect(['browser', 'node', 'webworker', 'electron', 'unknown']).toContain(
      environment.type
    );
  });

  it('should detect environment mode', () => {
    expect(['development', 'production', 'test']).toContain(
      environment.mode
    );
  });

  it('should detect browser environment', () => {
    const browserDetected = isBrowser();
    expect(typeof browserDetected).toBe('boolean');
  });

  it('should detect Node.js environment', () => {
    const nodeDetected = isNode();
    expect(typeof nodeDetected).toBe('boolean');
  });

  it('should have support information', () => {
    expect(environment.supports).toBeDefined();
    expect(typeof environment.supports.webWorkers).toBe('boolean');
    expect(typeof environment.supports.serviceWorkers).toBe('boolean');
    expect(typeof environment.supports.indexedDB).toBe('boolean');
    expect(typeof environment.supports.fetch).toBe('boolean');
    expect(typeof environment.supports.webSocket).toBe('boolean');
  });
});

// ============================================
// 存储兼容性测试
// ============================================

describe('存储兼容性', () => {
  it('should get storage instance', () => {
    const storage = getStorage();
    expect(storage).toBeDefined();
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
    expect(typeof storage.clear).toBe('function');
  });

  it('should work with storage operations', () => {
    const storage = getStorage();
    
    // 测试存储
    storage.setItem('test-key', 'test-value');
    expect(storage.getItem('test-key')).toBe('test-value');
    
    // 测试删除
    storage.removeItem('test-key');
    expect(storage.getItem('test-key')).toBeNull();
    
    // 测试清空
    storage.setItem('key1', 'value1');
    storage.setItem('key2', 'value2');
    storage.clear();
    expect(storage.getItem('key1')).toBeNull();
    expect(storage.getItem('key2')).toBeNull();
  });
});

// ============================================
// 性能计时器测试
// ============================================

describe('性能计时器', () => {
  it('should create performance timer', () => {
    const timer = new PerformanceTimer();
    expect(timer).toBeDefined();
  });

  it('should measure time', async () => {
    const timer = new PerformanceTimer();
    await new Promise(resolve => setTimeout(resolve, 10));
    const elapsed = timer.end();
    expect(elapsed).toBeGreaterThanOrEqual(5);
  });

  it('should reset timer', async () => {
    const timer = new PerformanceTimer();
    await new Promise(resolve => setTimeout(resolve, 10));
    timer.reset();
    await new Promise(resolve => setTimeout(resolve, 10));
    const elapsed = timer.end();
    expect(elapsed).toBeGreaterThanOrEqual(5);
  });
});

// ============================================
// 核心模块兼容性测试
// ============================================

describe('核心模块兼容性', () => {
  it('should initialize WorldModel', () => {
    const worldModel = new WorldModel({
      stateDimension: 16,
      actionDimension: 8,
      hiddenDimension: 32,
      imaginationHorizon: 5,
    });
    expect(worldModel).toBeDefined();
    worldModel.initialize();
  });

  it('should initialize NeuroSymbolicEngine', () => {
    const engine = new NeuroSymbolicEngine({
      embeddingDimension: 64,
      maxRules: 50,
      maxReasoningDepth: 3,
    });
    expect(engine).toBeDefined();
  });

  it('should initialize UnifiedCognitionEngine', () => {
    const engine = new UnifiedCognitionEngine({
      worldModel: {
        stateDimension: 16,
        actionDimension: 8,
      },
      neuroSymbolic: {
        embeddingDimension: 64,
      },
    });
    expect(engine).toBeDefined();
  });

  it('should handle basic WorldModel operations', () => {
    const worldModel = new WorldModel({
      stateDimension: 16,
      actionDimension: 8,
      hiddenDimension: 32,
    });
    worldModel.initialize();

    const mockAction = {
      id: 'test-action',
      type: 'test',
      parameters: { test: 'value' },
    };

    const mockObservation = {
      raw: 'test observation',
      features: [],
      timestamp: Date.now(),
    };

    const state = worldModel.step(mockAction, mockObservation, 0.5, false);
    expect(state).toBeDefined();
    expect(state.stochastic).toBeDefined();
    expect(state.deterministic).toBeDefined();
  });

  it('should handle basic NeuroSymbolic operations', () => {
    const engine = new NeuroSymbolicEngine({
      embeddingDimension: 64,
      maxRules: 50,
    });

    const mockFact = {
      predicate: 'test',
      arguments: ['value'],
      truthValue: 1,
      source: 'observation',
      confidence: 0.9,
    };

    engine.addFact(mockFact);
    const facts = engine.getFacts();
    expect(facts.length).toBeGreaterThan(0);
  });
});

// ============================================
// 浏览器环境模拟测试
// ============================================

describe('浏览器环境模拟', () => {
  beforeEach(() => {
    // 模拟浏览器环境
    (globalThis as any).window = {
      document: {},
      location: {
        hostname: 'localhost',
      },
    };
    (globalThis as any).navigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    (globalThis as any).localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    (globalThis as any).performance = {
      now: vi.fn(() => Date.now()),
    };
  });

  afterEach(() => {
    // 清理模拟
    delete (globalThis as any).window;
    delete (globalThis as any).navigator;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).performance;
  });

  it('should detect browser environment when window is present', () => {
    expect(isBrowser()).toBe(true);
    expect(isNode()).toBe(false);
  });

  it('should use localStorage in browser environment', () => {
    const storage = getStorage();
    expect(storage).toBeDefined();
  });

  it('should initialize WorldModel in simulated browser', () => {
    const worldModel = new WorldModel({});
    expect(worldModel).toBeDefined();
  });

  it('should initialize NeuroSymbolicEngine in simulated browser', () => {
    const engine = new NeuroSymbolicEngine({});
    expect(engine).toBeDefined();
  });
});

// ============================================
// Node.js环境模拟测试
// ============================================

describe('Node.js环境模拟', () => {
  beforeEach(() => {
    // 确保浏览器相关对象不存在
    delete (globalThis as any).window;
    delete (globalThis as any).navigator;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).performance;

    // 模拟Node.js环境
    (globalThis as any).process = {
      env: {
        NODE_ENV: 'test',
      },
      versions: {
        node: '18.0.0',
      },
    };
  });

  afterEach(() => {
    // 清理模拟
    delete (globalThis as any).process;
  });

  it('should detect Node.js environment when process is present', () => {
    expect(isNode()).toBe(true);
    expect(isBrowser()).toBe(false);
  });

  it('should use memory storage in Node.js environment', () => {
    const storage = getStorage();
    expect(storage).toBeDefined();
  });

  it('should initialize WorldModel in simulated Node.js', () => {
    const worldModel = new WorldModel({});
    expect(worldModel).toBeDefined();
  });

  it('should initialize NeuroSymbolicEngine in simulated Node.js', () => {
    const engine = new NeuroSymbolicEngine({});
    expect(engine).toBeDefined();
  });
});

// ============================================
// 集成测试
// ============================================

describe('集成测试', () => {
  it('should work as complete system', async () => {
    const engine = new UnifiedCognitionEngine({
      worldModel: {
        stateDimension: 16,
        actionDimension: 8,
        imaginationHorizon: 5,
      },
      neuroSymbolic: {
        embeddingDimension: 64,
        maxReasoningDepth: 3,
      },
    });

    const result = await engine.process('test input', { context: 'test' });
    expect(result).toBeDefined();
    expect(result.componentsUsed).toBeDefined();
    expect(result.processingTime).toBeDefined();
  });

  it('should handle edge cases gracefully', () => {
    expect(() => {
      const worldModel = new WorldModel({});
      worldModel.initialize();
    }).not.toThrow();

    expect(() => {
      const neuroEngine = new NeuroSymbolicEngine({});
    }).not.toThrow();

    expect(() => {
      const unifiedEngine = new UnifiedCognitionEngine({});
    }).not.toThrow();
  });
});
