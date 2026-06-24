import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary with
 * automatic optimization (format + quality auto, size cap).
 */
export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  options: { width?: number; height?: number; crop?: string } = {}
): Promise<{ url: string; publicId: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `connecthub/${folder}`,
        resource_type: 'image',
        transformation: [
          {
            width: options.width ?? 1600,
            height: options.height,
            crop: options.crop ?? 'limit',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId).catch(() => {
    // Non-fatal: log only. We don't want a failed cleanup to break the request.
    console.warn(`Failed to delete Cloudinary asset: ${publicId}`);
  });
}
