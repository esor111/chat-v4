/**
 * Result pattern for better error handling
 */
export class Result<T, E = Error> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result(true, value);
  }

  static failure<E>(error: E): Result<never, E> {
    return new Result(false, undefined, error);
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from failed result');
    }
    return this._value!;
  }

  get error(): E {
    if (this._isSuccess) {
      throw new Error('Cannot get error from successful result');
    }
    return this._error!;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.success(fn(this._value!));
    }
    return Result.failure(this._error!);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this._isSuccess) {
      return Result.success(this._value!);
    }
    return Result.failure(fn(this._error!));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isSuccess) {
      return fn(this._value!);
    }
    return Result.failure(this._error!);
  }
}

/**
 * WebSocket specific error types
 */
export interface WebSocketValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  field?: string;
}

export interface WebSocketAccessError {
  code: 'ACCESS_DENIED';
  message: string;
  conversationId?: string;
}

export interface WebSocketRateLimitError {
  code: 'RATE_LIMIT_EXCEEDED';
  message: string;
  retryAfter?: number;
}

export type WebSocketError = 
  | WebSocketValidationError 
  | WebSocketAccessError 
  | WebSocketRateLimitError;