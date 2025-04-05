'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';
import { useImageUpload } from '@/lib/hooks/useImageUpload';

export default function TestUploadPage() {
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const { user } = useAuth();
  
  const { 
    uploadImage, 
    isUploading, 
    error, 
    progress, 
    reset 
  } = useImageUpload({
    onSuccess: (url) => {
      console.log('Upload successful, download URL:', url);
      setUploadedUrl(url);
    },
    onError: (err) => {
      console.error('Upload error:', err);
    },
    onProgress: (p) => {
      console.log('Upload progress:', p);
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Create preview URL
    setPreviewUrl(URL.createObjectURL(file));
    
    // Upload the file
    await uploadImage(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Test Photo Upload</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {isUploading && (
            <div className="mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <div className="mt-2 text-sm text-gray-600">
                Uploading: {Math.round(progress)}%
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {previewUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className="relative aspect-square">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              </div>
            )}

            {uploadedUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded</h3>
                <div className="relative aspect-square">
                  <Image
                    src={uploadedUrl}
                    alt="Uploaded"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 