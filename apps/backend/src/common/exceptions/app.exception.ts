import { HttpException } from '@nestjs/common';

/**
 * docs/08-api-design.md 8.1 — 에러 코드 체계 `{DOMAIN}_{REASON}` (예: PAYROLL_ALREADY_CONFIRMED).
 * 프론트엔드는 `error.code`로 분기하고 `error.message`는 그대로 사용자에게 노출한다.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: number,
  ) {
    super({ code, message, statusCode }, statusCode);
  }
}
