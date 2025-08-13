import { Injectable } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user.entity';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

interface PerformanceMetrics {
  operationName: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

@Injectable()
export class PerformanceMonitoringUserRepository implements IUserRepository {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(
    private readonly baseRepository: IUserRepository,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(userId: string): Promise<User | null> {
    return await this.executeWithMonitoring(
      'findById',
      () => this.baseRepository.findById(userId),
      { userId }
    );
  }

  async findByIds(userIds: string[]): Promise<User[]> {
    return await this.executeWithMonitoring(
      'findByIds',
      () => this.baseRepository.findByIds(userIds),
      { userIds, count: userIds.length }
    );
  }

  async exists(userId: string): Promise<boolean> {
    return await this.executeWithMonitoring(
      'exists',
      () => this.baseRepository.exists(userId),
      { userId }
    );
  }

  async save(user: User): Promise<User> {
    return await this.executeWithMonitoring(
      'save',
      () => this.baseRepository.save(user),
      { userId: user.userId }
    );
  }

  async delete(userId: string): Promise<void> {
    return await this.executeWithMonitoring(
      'delete',
      () => this.baseRepository.delete(userId),
      { userId }
    );
  }

  private async executeWithMonitoring<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await operation();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record metrics
      const metric: PerformanceMetrics = {
        operationName,
        duration,
        timestamp: new Date(),
        success,
        error,
      };
      
      this.recordMetric(metric);
      
      // Log performance
      this.logger.performance(
        `UserRepository.${operationName}`,
        duration,
        {
          service: 'PerformanceMonitoringUserRepository',
          operation: operationName,
          success,
          error,
          ...context,
        }
      );

      // Log slow queries
      if (duration > 1000) { // More than 1 second
        this.logger.warn('Slow repository operation detected', {
          service: 'PerformanceMonitoringUserRepository',
          operation: operationName,
          duration: `${duration}ms`,
          ...context,
        });
      }
    }
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  // Performance reporting methods
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageResponseTime(operationName?: string): number {
    const filteredMetrics = operationName 
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const totalDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / filteredMetrics.length;
  }

  getSuccessRate(operationName?: string): number {
    const filteredMetrics = operationName 
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const successCount = filteredMetrics.filter(m => m.success).length;
    return (successCount / filteredMetrics.length) * 100;
  }

  getSlowOperations(thresholdMs: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  clearMetrics(): void {
    this.metrics = [];
    this.logger.debug('Performance metrics cleared', {
      service: 'PerformanceMonitoringUserRepository',
      operation: 'clearMetrics',
    });
  }
}