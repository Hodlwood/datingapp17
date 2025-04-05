/**
 * Firebase Storage Path Configuration
 * 
 * This file defines the path structure for all Firebase Storage uploads.
 * Using consistent paths helps with organization and makes it easier to manage
 * storage rules and cleanup.
 */

// Base paths for different types of content
export const STORAGE_PATHS = {
  // User-related paths
  USERS: {
    BASE: 'users',
    PROFILE_PICTURES: (userId: string) => `users/${userId}/profile`,
    PHOTOS: (userId: string) => `users/${userId}/photos`,
    DOCUMENTS: (userId: string) => `users/${userId}/documents`,
  },
  
  // Chat-related paths
  CHATS: {
    BASE: 'chats',
    ATTACHMENTS: (chatId: string) => `chats/${chatId}/attachments`,
    MEDIA: (chatId: string) => `chats/${chatId}/media`,
  },
  
  // Application-wide paths
  APP: {
    BASE: 'app',
    TEMP: 'app/temp',
    PUBLIC: 'app/public',
  },
  
  // Helper function to generate a unique filename with timestamp
  generateUniqueFilename: (originalFilename: string): string => {
    const timestamp = Date.now();
    const fileExtension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
    return `${timestamp}_${originalFilename.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  },
  
  // Helper function to get the full path for a user's profile picture
  getUserProfilePicturePath: (userId: string, filename: string): string => {
    return `${STORAGE_PATHS.USERS.PROFILE_PICTURES(userId)}/${filename}`;
  },
  
  // Helper function to get the full path for a user's photo
  getUserPhotoPath: (userId: string, filename: string): string => {
    return `${STORAGE_PATHS.USERS.PHOTOS(userId)}/${filename}`;
  },
  
  // Helper function to get the full path for a chat attachment
  getChatAttachmentPath: (chatId: string, filename: string): string => {
    return `${STORAGE_PATHS.CHATS.ATTACHMENTS(chatId)}/${filename}`;
  },
}; 