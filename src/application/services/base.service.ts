import { Injectable, Logger } from '@nestjs/common';
import { Result } from '@infrastructure/common/result';

@Injectable()
export abstract class BaseService {
  protected readonly logger = new Logger(this.constructor.name);

  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<Result<T, Error>> {
    try {
      const result = await operation();
      return Result.success(result);
    } catch (error) {
      this.logger.error(`${errorMessage}: ${error.message}`, error.stack);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  protected validateRequired(value: any, fieldName: string): void {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      throw new Error(`${fieldName} is required`);
    }
  }
}