import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  // exports: [ProductService],
  // imports: [TypeOrmModule.forFeature([Product])],
})
export class ProductModule {}
