import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { ApiBearerAuth } from '@nestjs/swagger';

const destination = './public/uploads/products';

/* cái này để cho có Authorisation trong header nhé để test swagger còn dùng cookie thì phải sửa ở JwtStrategy thêm hàm check cookie */
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseInterceptors(
    // FileInterceptor('image', {
    FilesInterceptor('image', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
          }
          cb(null, destination);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  create(
    @Body() createProductDto: CreateProductDto,
    // upload 1 file
    // @UploadedFile() file: Express.Multer.File,

    // upload multiple files
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageFilenames = files.map((file) => file.filename);
    return this.productService.create({
      ...createProductDto,
      image: imageFilenames,
    });
  }

  @Roles(['admin', 'user'])
  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('type') type: string) {
    console.log('find product type', type);
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
