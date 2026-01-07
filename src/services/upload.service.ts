import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export const uploadService = {
  // Upload profile image
  uploadProfileImage: async (imageUri: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);

    const response = await api.post(API_ENDPOINTS.UPLOAD_PROFILE_IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  // Upload property files (images, videos, brochures)
  uploadPropertyFiles: async (
    propertyId: string | number,
    files: Array<{
      uri: string;
      type?: string;
      name?: string;
    }>,
    type: 'image' | 'video' | 'brochure',
  ) => {
    const formData = new FormData();
    formData.append('property_id', String(propertyId));
    formData.append('type', type);

    files.forEach((file, index) => {
      const defaultType = 
        type === 'image' ? 'image/jpeg' : 
        type === 'video' ? 'video/mp4' : 
        'application/pdf';
      
      const defaultName = 
        type === 'image' ? `image_${index}.jpg` : 
        type === 'video' ? `video_${index}.mp4` : 
        `brochure_${index}.pdf`;

      formData.append('files[]', {
        uri: file.uri,
        type: file.type || defaultType,
        name: file.name || defaultName,
      } as any);
    });

    const response = await api.post(API_ENDPOINTS.UPLOAD_PROPERTY_FILES, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },
};

