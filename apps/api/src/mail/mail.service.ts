import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const user = config.get<string>('SMTP_USER');
    this.from =
      config.get<string>('MAIL_FROM') ??
      'Gnoud Book <no-reply@gnoud-book.local>';
    // Dev: Mailpit nhận ở localhost:1025. Production: điền thông tin SMTP thật vào .env.
    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST') ?? 'localhost',
      port: Number(config.get<string>('SMTP_PORT') ?? 1025),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
