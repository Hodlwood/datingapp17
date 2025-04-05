import { useState } from 'react';
import { useAuth } from './useAuth';
import { uploadProfilePicture, validateImageFile } from '@/lib/firebase/firebaseUtils';
import { STORAGE_PATHS } from '@/lib/firebase/storageConfig';
import { 
  ErrorType, 
  ErrorSeverity, 
  createError, 
  handleError 
} from '@/lib/utils/errorUtils';

interface UseImageUploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  pathType?: 'profile' | 'photo' | 'document';
  chatId?: string;
}

interface UseImageUploadResult {
  uploadImage: (file: File) => Promise<string | null>;
  isUploading: boolean;
  error: string | null;
  progress: number;
  reset: () => void;
}

/**
 * A hook for handling image uploads with validation, progress tracking, and error handling
 */
export const useImageUpload = (options: UseImageUploadOptions = {}): UseImageUploadResult => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setError(null);
    setProgress(0);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) {
      const errorMsg = 'You must be logged in to upload images';
      const appError = createError(
        ErrorType.AUTH,
        errorMsg,
        ErrorSeverity.MEDIUM
      );
      handleError(appError);
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    // Validate the file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      const appError = createError(
        ErrorType.VALIDATION,
        validation.error || 'Invalid file',
        ErrorSeverity.MEDIUM,
        null,
        { fileName: file.name, fileSize: file.size, fileType: file.type }
      );
      handleError(appError);
      setError(validation.error || 'Invalid file');
      options.onError?.(validation.error || 'Invalid file');
      return null;
    }

    try {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      // Upload the file with the specified path type
      const downloadURL = await uploadProfilePicture(
        user.uid, 
        file, 
        (uploadProgress) => {
          setProgress(uploadProgress);
          options.onProgress?.(uploadProgress);
        },
        options.pathType || 'profile',
        options.chatId
      );

      // Call success callback if provided
      options.onSuccess?.(downloadURL);
      return downloadURL;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to upload image';
      const appError = createError(
        ErrorType.UPLOAD,
        errorMsg,
        ErrorSeverity.HIGH,
        err,
        { 
          fileName: file.name, 
          fileSize: file.size, 
          fileType: file.type,
          pathType: options.pathType,
          userId: user.uid
        }
      );
      handleError(appError);
      console.error('Upload error:', err);
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    isUploading,
    error,
    progress,
    reset
  };
}; 