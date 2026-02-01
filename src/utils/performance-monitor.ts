/**
 * Performance Monitor
 *
 * Provides comprehensive performance monitoring and metrics collection.
 * Compatible with both browser and Node.js environments.
 */

// ============================================
// Types
// ============================================

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface MetricsReport {
  [name: string]: {
    avg: number;
    min: number;
    max: number;
    count: number;
    p95: number;
    p99: number;
  };
}

export interface MemoryMetrics {
  used: number;
  total: number;
  limit: number;
  timestamp: number;
}

// ============================================
// Performance Monitor
// ============================================

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private memoryMetrics: MemoryMetrics[] = [];
  private isRecording = false;
  private memoryCheckInterval?: ReturnType<typeof setInterval>;

  /**
   * Start recording performance metrics
   */
  start(): void {
    this.isRecording = true;
    this.startMemoryMonitoring();
  }

  /**
   * Stop recording
   */
  stop(): void {
    this.isRecording = false;
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }
  }

  /**
   * Measure synchronous function execution time
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    if (!this.isRecording) return fn();

    const start = this.getNow();
    try {
      return fn();
    } finally {
      const duration = this.getNow() - start;
      this.recordMetric(name, duration, metadata);
    }
  }

  /**
   * Measure asynchronous function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!this.isRecording) return fn();

    const start = this.getNow();
    try {
      return await fn();
    } finally {
      const duration = this.getNow() - start;
      this.recordMetric(name, duration, metadata);
    }
  }

  /**
   * Create a timer for manual measurement
   */
  createTimer(name: string, metadata?: Record<string, unknown>): () => void {
    if (!this.isRecording) return () => {};

    const start = this.getNow();
    return () => {
      const duration = this.getNow() - start;
      this.recordMetric(name, duration, metadata);
    };
  }

  /**
   * Record a metric
   */
  private recordMetric(name: string, duration: number, metadata?: Record<string, unknown>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Keep only last 1000 measurements per metric
    const measurements = this.metrics.get(name)!;
    if (measurements.length > 1000) {
      measurements.shift();
    }
  }

  /**
   * Get performance report
   */
  getReport(): MetricsReport {
    const report: MetricsReport = {};

    this.metrics.forEach((times, name) => {
      if (times.length === 0) return;

      const sorted = [...times].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);

      report[name] = {
        avg: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: sorted.length,
        p95: this.getPercentile(sorted, 0.95),
        p99: this.getPercentile(sorted, 0.99),
      };
    });

    return report;
  }

  /**
   * Get memory metrics
   */
  getMemoryMetrics(): MemoryMetrics[] {
    return [...this.memoryMetrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.memoryMetrics = [];
  }

  /**
   * Get current timestamp
   */
  private getNow(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * Calculate percentile
   */
  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const memory = this.getMemoryUsage();
      if (memory) {
        this.memoryMetrics.push({
          used: memory.used,
          total: memory.total,
          limit: memory.limit,
          timestamp: Date.now(),
        });

        // Keep only last 100 measurements
        if (this.memoryMetrics.length > 100) {
          this.memoryMetrics.shift();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): { used: number; total: number; limit: number } | null {
    // Node.js
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed / 1024 / 1024,
        total: usage.heapTotal / 1024 / 1024,
        limit: usage.heapTotal / 1024 / 1024,
      };
    }

    // Browser
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024,
        total: memory.totalJSHeapSize / 1024 / 1024,
        limit: memory.jsHeapSizeLimit / 1024 / 1024,
      };
    }

    return null;
  }
}

// ============================================
// Optimized String Builder
// ============================================

export class StringBuilder {
  private chunks: string[] = [];
  private length = 0;

  append(str: string): this {
    this.chunks.push(str);
    this.length += str.length;
    return this;
  }

  appendLine(str: string): this {
    return this.append(str).append('\n');
  }

  toString(): string {
    return this.chunks.join('');
  }

  clear(): void {
    this.chunks = [];
    this.length = 0;
  }

  getLength(): number {
    return this.length;
  }
}

// ============================================
// Object Pool
// ============================================

export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, maxSize = 10) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }
}

// ============================================
// Debounce and Throttle
// ============================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================
// Batch Processor
// ============================================

export interface BatchProcessorConfig<T, R> {
  processBatch: (items: T[]) => Promise<R[]>;
  maxBatchSize: number;
  maxWaitTime: number;
}

export class BatchProcessor<T, R> {
  private queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: Error) => void }> = [];
  private config: BatchProcessorConfig<T, R>;
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(config: BatchProcessorConfig<T, R>) {
    this.config = config;
  }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });

      if (this.queue.length >= this.config.maxBatchSize) {
        this.flush();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flush(), this.config.maxWaitTime);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    const batch = this.queue.splice(0, this.config.maxBatchSize);

    try {
      const results = await this.config.processBatch(batch.map(b => b.item));
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (error) {
      batch.forEach(b => b.reject(error instanceof Error ? error : new Error(String(error))));
    }
  }
}

// ============================================
// Memoization
// ============================================

export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  maxSize = 100
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;

    // LRU eviction
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================
// Export singleton
// ============================================

export const defaultPerformanceMonitor = new PerformanceMonitor();
