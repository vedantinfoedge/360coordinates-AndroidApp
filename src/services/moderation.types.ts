/**
 * Moderation Detection Types
 * 
 * Defines TypeScript interfaces for human/animal detection data
 * returned by the Google Vision API via the backend moderation endpoint.
 */

// Backend API Response Types
export interface ModerationApiResponse {
  status: string; // "success" | "error"
  message?: string;
  data?: ModerationData;
  error_code?: string;
  moderation_reason?: string;
}

export interface ModerationData {
  moderation_status?: 'SAFE' | 'UNSAFE' | 'PENDING' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
  moderation_reason?: string;
  image_url?: string;
  image_id?: number;
  faces?: FaceDetection[];
  objects?: ObjectDetection[];
  labels?: LabelDetection[];
}

export interface FaceDetection {
  detection_confidence?: number;
  confidence?: number; // Alternative field name
}

export interface ObjectDetection {
  name: string;
  score: number;
}

export interface LabelDetection {
  description: string;
  score: number;
}

// Detection Analysis Result
export interface DetectionResult {
  humanDetected: boolean;
  animalDetected: boolean;
  facesCount: number;
  humanObjectsCount: number;
  animalObjectsCount: number;
  detectedAnimals: string[];
  humanConfidence: number; // Highest confidence across all methods
  animalConfidence: number; // Highest confidence across all methods
  detectionMethods: {
    faces: boolean;
    objects: boolean;
    labels: boolean;
  };
  details: {
    faces: FaceDetection[];
    humanObjects: ObjectDetection[];
    animalObjects: ObjectDetection[];
    humanLabels: LabelDetection[];
    animalLabels: LabelDetection[];
  };
}

// Enhanced Image Upload Result with Detection
export interface EnhancedImageUploadResult {
  status: 'success' | 'approved' | 'pending' | 'rejected' | 'failed';
  message: string;
  image_url?: string;
  moderation_status?: 'SAFE' | 'UNSAFE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
  moderation_reason?: string;
  detection?: DetectionResult; // New: Detection details
  rawData?: ModerationData; // Raw API response for debugging
}
