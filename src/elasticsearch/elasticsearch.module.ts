import { Module } from '@nestjs/common';
import { EnvModule } from 'src/env/env.module';
import { ElasticsearchConnectionService } from './elasticsearch-connection.service';

@Module({
  imports: [EnvModule],
  providers: [ElasticsearchConnectionService],
  exports: [ElasticsearchConnectionService],
})
export class ElasticsearchModule {}
