import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiRoleService } from './api-role.service';
import { ApiRoleController } from './api-role.controller';
import { ApiRole, ApiRoleSchema } from './schema/api-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ApiRole.name,
        schema: ApiRoleSchema,
      },
    ]),
  ],
  controllers: [ApiRoleController],
  providers: [ApiRoleService],
  exports: [ApiRoleService],
})
export class ApiRoleModule {}
