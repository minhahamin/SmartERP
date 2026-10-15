import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * SMTP_HOST가 설정돼 있으면 실제로 발송하고, 없으면 발송하지 않는다.
 * 개발 환경에서는 본문을 서버 로그에 남겨 재설정 링크를 직접 열어볼 수 있게 한다
 * (운영에서는 토큰이 로그에 남지 않도록 본문을 출력하지 않는다).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.from = config.get<string>('MAIL_FROM') ?? 'ERPilot <no-reply@erpilot.io>';
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: user && pass ? { user, pass } : undefined,
        })
      : null;
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      if (this.isProduction) {
        this.logger.warn(`SMTP가 설정되지 않아 메일을 보내지 못했습니다: ${subject}`);
      } else {
        this.logger.log(
          `[dev] SMTP 미설정 — 발송하지 않고 내용만 출력합니다.\nTo: ${to}\nSubject: ${subject}\n${text}`,
        );
      }
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
