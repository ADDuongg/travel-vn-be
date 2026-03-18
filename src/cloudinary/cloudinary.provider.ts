import { v2 as cloudinary } from 'cloudinary';
import { EnvService } from 'src/env/env.service';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  inject: [EnvService],
  useFactory: (env: EnvService) => {
    const cloudName = env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = env.get('CLOUDINARY_API_KEY');
    const apiSecret = env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Missing Cloudinary environment variables111');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    return cloudinary;
  },
};
