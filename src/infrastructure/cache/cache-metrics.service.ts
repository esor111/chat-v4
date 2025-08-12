import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { ICacheService, CacheMetrics, CACHE_SERVICE_TOKEN } from './cache.interface';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DistributedLockService } from './distributed-lock.service';

export interface CacheMetricsSnapshot {
  timestamp: number;
  cache: CacheMetrics;
  circuitBreaker: any;
  locks: {
    activeCount: number;
    totalAcquired: number;
    totalReleased: number;
  };
  performance: {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
  };
}

export interface PerformanceMetric {
  operation: string;
  latency: number;
  timestamp: number;
  success: boolean;
}

@Injectable()
export class CacheMetricsService {
  private readonly logger = new Logger(CacheMetricsService.name);
  private readonly performanceMetrics: PerformanceMetric[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10k operations
  private lockAcquisitions = 0;
  private lockReleases = 0;

  constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cacheService: ICacheService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  /**
   * Record a performance metric
   */
  recordOperation(operation: string, latency: number, success: boolean = true): void {
    const metric: PerformanceMetric = {
      operation,
      latency,
      timestamp: Date.now(),
      success,
    };

    this.performanceMetrics.push(metric);

    // Keep only recent metrics to prevent memory leak
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Record lock acquisition
   */
  recordLockAcquisition(): void {
    this.lockAcquisitions++;
  }

  /**
   * Record lock release
   */
  recordLockRelease(): void {
    this.lockReleases++;
  }

  /**
   * Get current metrics snapshot
   */
  getMetricsSnapshot(): CacheMetricsSnapshot {
    const now = Date.now();
    const recentMetrics = this.performanceMetrics.filter(
      m => now - m.timestamp < 300000 // Last 5 minutes
    );

    const latencies = recentMetrics.map(m => m.latency).sort((a, b) => a - b);
    const successfulOps = recentMetrics.filter(m => m.success);

    return {
      timestamp: now,
      cache: this.getCacheMetrics(),
      circuitBreaker: this.circuitBreaker.getMetrics(),
      locks: {
        activeCount: this.distributedLock.getActiveLocks().length,
        totalAcquired: this.lockAcquisitions,
        totalReleased: this.lockReleases,
      },
      performance: {
        averageLatency: this.calculateAverage(latencies),
        p95Latency: this.calculatePercentile(latencies, 95),
        p99Latency: this.calculatePercentile(latencies, 99),
        throughput: successfulOps.length / 5, // Operations per minute over 5 minutes
      },
    };
  }

  /**
   * Get performance metrics for a specific operation
   */
  getOperationMetrics(operation: string, timeWindowMs: number = 300000): {
    count: number;
    averageLatency: number;
    successRate: number;
    p95Latency: number;
    p99Latency: number;
  } {
    const now = Date.now();
    const operationMetrics = this.performanceMetrics.filter(
      m => m.operation === operation && now - m.timestamp < timeWindowMs
    );

    if (operationMetrics.length === 0) {
      return {
        count: 0,
        averageLatency: 0,
        successRate: 0,
        p95Latency: 0,
        p99Latency: 0,
      };
    }

    const latencies = operationMetrics.map(m => m.latency).sort((a, b) => a - b);
    const successfulOps = operationMetrics.filter(m => m.success);

    return {
      count: operationMetrics.length,
      averageLatency: this.calculateAverage(latencies),
      successRate: successfulOps.length / operationMetrics.length,
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
    };
  }

  /**
   * Get cache hit rate for different time windows
   */
  getCacheHitRates(): {
    last5Minutes: number;
    last15Minutes: number;
    last1Hour: number;
    overall: number;
  } {
    const now = Date.now();
    
    const calculateHitRate = (timeWindowMs: number): number => {
      const windowMetrics = this.performanceMetrics.filter(
        m => now - m.timestamp < timeWindowMs && (m.operation === 'get' || m.operation === 'hit' || m.operation === 'miss')
      );
      
      const hits = windowMetrics.filter(m => m.operation === 'get' || m.operation === 'hit').length;
      const total = windowMetrics.length;
      
      return total > 0 ? hits / total : 0;
    };

    return {
      last5Minutes: calculateHitRate(5 * 60 * 1000),
      last15Minutes: calculateHitRate(15 * 60 * 1000),
      last1Hour: calculateHitRate(60 * 60 * 1000),
      overall: this.getCacheMetrics().hitRate,
    };
  }

  /**
   * Get top slowest operations
   */
  getSlowestOperations(limit: number = 10, timeWindowMs: number = 300000): PerformanceMetric[] {
    const now = Date.now();
    const recentMetrics = this.performanceMetrics.filter(
      m => now - m.timestamp < timeWindowMs
    );

    return recentMetrics
      .sort((a, b) => b.latency - a.latency)
      .slice(0, limit);
  }

  /**
   * Get error rate by operation
   */
  getErrorRates(timeWindowMs: number = 300000): Record<string, number> {
    const now = Date.now();
    const recentMetrics = this.performanceMetrics.filter(
      m => now - m.timestamp < timeWindowMs
    );

    const operationGroups = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = { total: 0, errors: 0 };
      }
      acc[metric.operation].total++;
      if (!metric.success) {
        acc[metric.operation].errors++;
      }
      return acc;
    }, {} as Record<string, { total: number; errors: number }>);

    const errorRates: Record<string, number> = {};
    for (const [operation, stats] of Object.entries(operationGroups)) {
      errorRates[operation] = stats.total > 0 ? stats.errors / stats.total : 0;
    }

    return errorRates;
  }

  /**
   * Export metrics for external monitoring systems (Prometheus format)
   */
  exportPrometheusMetrics(): string {
    const snapshot = this.getMetricsSnapshot();
    const hitRates = this.getCacheHitRates();
    const errorRates = this.getErrorRates();

    let metrics = '';

    // Cache metrics
    metrics += `# HELP cache_operations_total Total number of cache operations\n`;
    metrics += `# TYPE cache_operations_total counter\n`;
    metrics += `cache_operations_total{type="hits"} ${snapshot.cache.hits}\n`;
    metrics += `cache_operations_total{type="misses"} ${snapshot.cache.misses}\n`;
    metrics += `cache_operations_total{type="sets"} ${snapshot.cache.sets}\n`;
    metrics += `cache_operations_total{type="deletes"} ${snapshot.cache.deletes}\n`;

    // Hit rate
    metrics += `# HELP cache_hit_rate Cache hit rate\n`;
    metrics += `# TYPE cache_hit_rate gauge\n`;
    metrics += `cache_hit_rate{window="5m"} ${hitRates.last5Minutes}\n`;
    metrics += `cache_hit_rate{window="15m"} ${hitRates.last15Minutes}\n`;
    metrics += `cache_hit_rate{window="1h"} ${hitRates.last1Hour}\n`;
    metrics += `cache_hit_rate{window="overall"} ${hitRates.overall}\n`;

    // Performance metrics
    metrics += `# HELP cache_operation_latency_seconds Cache operation latency\n`;
    metrics += `# TYPE cache_operation_latency_seconds histogram\n`;
    metrics += `cache_operation_latency_seconds{quantile="0.95"} ${snapshot.performance.p95Latency / 1000}\n`;
    metrics += `cache_operation_latency_seconds{quantile="0.99"} ${snapshot.performance.p99Latency / 1000}\n`;

    // Circuit breaker state
    metrics += `# HELP cache_circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half-open)\n`;
    metrics += `# TYPE cache_circuit_breaker_state gauge\n`;
    const cbState = snapshot.circuitBreaker.state === 'CLOSED' ? 0 : 
                   snapshot.circuitBreaker.state === 'OPEN' ? 1 : 2;
    metrics += `cache_circuit_breaker_state ${cbState}\n`;

    // Lock metrics
    metrics += `# HELP cache_active_locks Number of active distributed locks\n`;
    metrics += `# TYPE cache_active_locks gauge\n`;
    metrics += `cache_active_locks ${snapshot.locks.activeCount}\n`;

    return metrics;
  }

  /**
   * Scheduled task to log metrics summary
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  private logMetricsSummary(): void {
    try {
      const snapshot = this.getMetricsSnapshot();
      const hitRates = this.getCacheHitRates();
      
      this.logger.log(`Cache Metrics Summary:
        Hit Rate (5m): ${(hitRates.last5Minutes * 100).toFixed(2)}%
        Avg Latency: ${snapshot.performance.averageLatency.toFixed(2)}ms
        P95 Latency: ${snapshot.performance.p95Latency.toFixed(2)}ms
        Throughput: ${snapshot.performance.throughput.toFixed(2)} ops/min
        Circuit Breaker: ${snapshot.circuitBreaker.state}
        Active Locks: ${snapshot.locks.activeCount}`);
    } catch (error) {
      this.logger.error('Error logging metrics summary:', error);
    }
  }

  /**
   * Cleanup old metrics
   */
  @Cron(CronExpression.EVERY_HOUR)
  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const initialLength = this.performanceMetrics.length;
    
    // Remove metrics older than 1 hour
    let i = 0;
    while (i < this.performanceMetrics.length) {
      if (this.performanceMetrics[i].timestamp < oneHourAgo) {
        this.performanceMetrics.splice(i, 1);
      } else {
        i++;
      }
    }

    const removedCount = initialLength - this.performanceMetrics.length;
    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} old performance metrics`);
    }
  }

  private getCacheMetrics(): CacheMetrics {
    if (typeof (this.cacheService as any).getMetrics === 'function') {
      return (this.cacheService as any).getMetrics();
    }
    
    // Return default metrics if not available
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      hitRate: 0,
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1;
    return sortedNumbers[Math.max(0, Math.min(index, sortedNumbers.length - 1))];
  }
}