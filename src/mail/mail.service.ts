import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/notification/email/email.service';

export interface MailSendOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  constructor(private readonly emailService: EmailService) {}

  async send(options: MailSendOptions): Promise<void> {
    await this.emailService.send(options.to, options.subject, options.html);
  }
}
