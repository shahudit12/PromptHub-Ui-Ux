/**
 * src/services/avatarUploadService.ts
 * Standalone Client-Side Profile Photo & Avatar Upload Service
 */

import { securityUtils } from '../utils/security';

export interface AvatarUploadResult {
  url: string;
  source: 'compact_data_uri';
  bytes: number;
}

export const avatarUploadService = {
  async compressAvatar(
    input: File | Blob,
    dimension = 300,
    quality = 0.85
  ): Promise<{ blob: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(input);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement('canvas');
        canvas.width = dimension;
        canvas.height = dimension;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, dimension, dimension);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Failed to create avatar image blob'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for avatar compression'));
      };

      img.src = objectUrl;
    });
  },

  async uploadAvatar(
    fileOrBlob: File | Blob,
    _userId?: string,
    onProgress?: (percent: number) => void
  ): Promise<AvatarUploadResult> {
    if (onProgress) onProgress(25);
    const { blob, dataUrl } = await this.compressAvatar(fileOrBlob);
    if (onProgress) onProgress(100);

    return {
      url: dataUrl,
      source: 'compact_data_uri',
      bytes: blob.size,
    };
  },
};
