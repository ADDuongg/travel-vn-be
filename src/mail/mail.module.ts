import { Module } from '@nestjs/common';
import { EnvModule } from 'src/env/env.module';
import { EmailService } from 'src/notification/email/email.service';
import { MailService } from './mail.service';

@Module({
  imports: [EnvModule],
  providers: [MailService, EmailService],
  exports: [MailService],
})
export class MailModule {}
