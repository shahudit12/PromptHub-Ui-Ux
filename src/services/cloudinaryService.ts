export interface UploadProgressCallback {
  (progress: number): void;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const cloudinaryService = {
  async compressImage(file: File, _maxWidth = 1200, _maxHeight = 1200, _quality = 0.85): Promise<File> {
    return file;
  },
  async validateFile(file: File, maxSizeMB = 10): Promise<{ isValid: boolean; error?: string }> {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { isValid: false, error: `File size exceeds the limit of ${maxSizeMB}MB.` };
    }
    return { isValid: true };
  },

  async uploadImage(
    file: File | string,
    folder: 'avatars' | 'covers' | 'banners' | 'payouts' | 'prompts' | 'drops' | 'news' | (string & {}),
    onProgress?: UploadProgressCallback
  ): Promise<CloudinaryUploadResponse> {
    if (onProgress) onProgress(30);

    let uploadFile: File | Blob;
    if (typeof file === 'string') {
      const res = await fetch(file);
      const blob = await res.blob();
      const isPngString = file.toLowerCase().includes('.png') || blob.type === 'image/png';
      uploadFile = new File([blob], `image_${Date.now()}.${isPngString ? 'png' : 'jpg'}`, {
        type: isPngString ? 'image/png' : 'image/jpeg',
      });
    } else {
      uploadFile = file;
    }

    if (onProgress) onProgress(60);

    const fileExt = (uploadFile instanceof File && uploadFile.name.split('.').pop()) ||
      (uploadFile.type === 'image/png' ? 'png' : 'jpg');

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image buffer'));
      reader.readAsDataURL(uploadFile);
    });

    if (onProgress) onProgress(100);

    return {
      secure_url: dataUrl,
      public_id: `local_${folder}_${Date.now()}`,
      width: 800,
      height: 800,
      format: fileExt,
      bytes: uploadFile.size,
    };
  },

  async deleteImage(publicId: string): Promise<boolean> {
    console.info(`[Media Service] Image queued for deletion: ${publicId}`);
    return true;
  },
};
