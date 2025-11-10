import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class AvatarStorageService {
  private uploadsDir: string;

  constructor() {
    // Store avatars in public/uploads directory
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('[AvatarStorage] Error creating upload directory:', error);
    }
  }

  /**
   * Upload and optimize avatar image
   * @param buffer - Image buffer from multer
   * @param mimetype - Original image mimetype
   * @returns URL path to the uploaded avatar
   */
  async uploadAvatar(buffer: Buffer, mimetype: string): Promise<string> {
    try {
      // Generate unique filename
      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(this.uploadsDir, filename);

      // Optimize image: resize to 400x400, convert to JPEG, compress
      await sharp(buffer)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toFile(filepath);

      // Return URL path (will be served by Express static middleware)
      return `/uploads/avatars/${filename}`;
    } catch (error) {
      console.error('[AvatarStorage] Error uploading avatar:', error);
      throw new Error('Failed to upload avatar');
    }
  }

  /**
   * Delete avatar file
   * @param avatarUrl - URL path to the avatar (e.g., /uploads/avatars/xxx.jpg)
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = path.basename(avatarUrl);
      const filepath = path.join(this.uploadsDir, filename);

      // Check if file exists before deleting
      try {
        await fs.access(filepath);
        await fs.unlink(filepath);
        console.log(`[AvatarStorage] Deleted avatar: ${filename}`);
      } catch (error) {
        // File doesn't exist, that's fine
        console.log(`[AvatarStorage] Avatar not found: ${filename}`);
      }
    } catch (error) {
      console.error('[AvatarStorage] Error deleting avatar:', error);
      // Don't throw - deletion failures shouldn't break the flow
    }
  }

  /**
   * Convert base64 data URI to file
   * Used for migrating existing base64 avatars
   */
  async convertBase64ToFile(base64Data: string): Promise<string> {
    try {
      // Extract base64 string from data URI
      const base64Match = base64Data.match(/^data:image\/[a-z]+;base64,(.+)$/);
      if (!base64Match) {
        throw new Error('Invalid base64 data URI');
      }

      const buffer = Buffer.from(base64Match[1], 'base64');
      return this.uploadAvatar(buffer, 'image/jpeg');
    } catch (error) {
      console.error('[AvatarStorage] Error converting base64 to file:', error);
      throw new Error('Failed to convert base64 avatar');
    }
  }
}

export const avatarStorageService = new AvatarStorageService();
