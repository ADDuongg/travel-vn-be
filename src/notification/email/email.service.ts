import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EnvService } from 'src/env/env.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend?: Resend;
  private readonly fromEmail?: string;

  constructor(private readonly envService: EnvService) {
    const apiKey = this.envService.get('RESEND_API_KEY');
    this.fromEmail = this.envService.get('RESEND_FROM_EMAIL');

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set, email sending is disabled');
      return;
    }

    this.resend = new Resend(apiKey);
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Resend client not initialized, skipping email send');
      return;
    }

    if (!this.fromEmail) {
      this.logger.warn('RESEND_FROM_EMAIL not set, skipping email send');
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: "${subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
