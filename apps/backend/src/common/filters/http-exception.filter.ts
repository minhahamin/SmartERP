import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from '../exceptions/app.exception';

/** "Exception" 접미사를 뗀 클래스명을 대문자 스네이크 코드로 변환 (예: ForbiddenException → FORBIDDEN) */
function codeFromExceptionName(exception: HttpException): string {
  const className = exception.constructor.name.replace(/Exception$/, '');
  return className
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

/** docs/08-api-design.md 8.1 — 모든 에러를 `{ success: false, error: { code, message, statusCode } }`로 통일 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      const statusCode = exception.getStatus();
      response.status(statusCode).json({ success: false, error: { code: exception.code, message: exception.message, statusCode } });
      return;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      const rawMessage = typeof body === 'object' && body && 'message' in body ? (body as { message: unknown }).message : exception.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : String(rawMessage);
      const code = statusCode === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : codeFromExceptionName(exception);
      response.status(statusCode).json({ success: false, error: { code, message, statusCode } });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: '서버 오류가 발생했습니다.', statusCode: 500 } });
  }
}
