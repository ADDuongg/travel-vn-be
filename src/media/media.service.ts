import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryResponse } from 'src/cloudinary/cloudinary.response';
import { UploadApiResponse } from 'cloudinary';

export type MediaUploadItem = {
  url: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
};

@Injectable()
export class MediaService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async uploadFile(file?: Express.Multer.File): Promise<MediaUploadItem> {
    if (!file) {
      throw new DomainException(
        'file is required',
        400,
        'BAD_REQUEST',
        'media.bad_request',
      );
    }
    const result = await this.cloudinaryService.uploadFile(file);
    return this.toMediaUploadItem(result);
  }

  async uploadFiles(files?: Express.Multer.File[]): Promise<MediaUploadItem[]> {
    if (!files?.length) {
      throw new DomainException(
        'files are required',
        400,
        'BAD_REQUEST',
        'media.bad_request',
      );
    }
    return Promise.all(files.map((f) => this.uploadFile(f)));
  }

  toMediaUploadItem(result: CloudinaryResponse): MediaUploadItem {
    if (
      result &&
      typeof result === 'object' &&
      'error' in result &&
      result.error
    ) {
      const err = (result as { error?: { message?: string } }).error;
      throw new DomainException(
        err?.message ?? 'Cloudinary upload error',
        400,
        'BAD_REQUEST',
        'media.bad_request',
      );
    }
    const r = result as UploadApiResponse;
    if (!r?.secure_url || !r?.public_id) {
      throw new DomainException(
        'Invalid upload result',
        400,
        'BAD_REQUEST',
        'media.bad_request',
      );
    }
    return {
      url: r.secure_url,
      publicId: r.public_id,
      format: r.format,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
    };
  }
}
