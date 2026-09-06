/**
 * NestJS側の共通例外フィルタ（AllExceptionsFilter）が返すエラー形式。
 * { statusCode, error, message, path, timestamp }
 */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody | null;

  constructor(statusCode: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}
