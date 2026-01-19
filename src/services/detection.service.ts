/**
 * Detection Analysis Service
 * 
 * Parses backend detection data (faces, objects, labels) to determine
 * if humans or animals are detected in images.
 */

import {
  DetectionResult,
  ModerationData,
  FaceDetection,
  ObjectDetection,
  LabelDetection,
} from './moderation.types';

/**
 * Human detection keywords
 */
const HUMAN_KEYWORDS = ['person', 'people', 'human', 'man', 'woman', 'child', 'face'];

/**
 * Animal detection keywords
 */
const ANIMAL_KEYWORDS = [
  'dog',
  'cat',
  'pet',
  'animal',
  'bird',
  'horse',
  'cow',
  'sheep',
  'goat',
  'wildlife',
  'mammal',
  'puppy',
  'kitten',
  'bird',
  'fish',
  'rabbit',
  'hamster',
  'mouse',
  'rat',
];

/**
 * Confidence thresholds
 */
const HUMAN_LABEL_CONFIDENCE_THRESHOLD = 0.6;
const ANIMAL_LABEL_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Analyze moderation data to detect humans and animals
 */
export function analyzeDetection(data: ModerationData | null | undefined): DetectionResult {
  if (!data) {
    return createEmptyDetectionResult();
  }

  const faces = data.faces || [];
  const objects = data.objects || [];
  const labels = data.labels || [];

  // Human Detection Logic
  const humanObjects = objects.filter(obj =>
    HUMAN_KEYWORDS.some(keyword =>
      obj.name.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const humanLabels = labels.filter(label =>
    HUMAN_KEYWORDS.some(keyword =>
      label.description.toLowerCase().includes(keyword.toLowerCase())
    ) && label.score >= HUMAN_LABEL_CONFIDENCE_THRESHOLD
  );

  // Human detected if: faces exist OR human objects exist OR high-confidence human labels
  const humanDetected = faces.length > 0 || humanObjects.length > 0 || humanLabels.length > 0;

  // Calculate human confidence (highest across all methods)
  const humanConfidences: number[] = [
    ...faces.map(f => f.detection_confidence || f.confidence || 0),
    ...humanObjects.map(o => o.score),
    ...humanLabels.map(l => l.score),
  ];
  const humanConfidence = humanConfidences.length > 0
    ? Math.max(...humanConfidences)
    : 0;

  // Animal Detection Logic
  const animalObjects = objects.filter(obj =>
    ANIMAL_KEYWORDS.some(keyword =>
      obj.name.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const animalLabels = labels.filter(label =>
    ANIMAL_KEYWORDS.some(keyword =>
      label.description.toLowerCase().includes(keyword.toLowerCase())
    ) && label.score >= ANIMAL_LABEL_CONFIDENCE_THRESHOLD
  );

  // Animal detected if: animal objects exist OR high-confidence animal labels
  const animalDetected = animalObjects.length > 0 || animalLabels.length > 0;

  // Calculate animal confidence (highest across all methods)
  const animalConfidences: number[] = [
    ...animalObjects.map(o => o.score),
    ...animalLabels.map(l => l.score),
  ];
  const animalConfidence = animalConfidences.length > 0
    ? Math.max(...animalConfidences)
    : 0;

  // Collect detected animal names
  const detectedAnimals = [
    ...animalObjects.map(o => o.name),
    ...animalLabels.map(l => l.description),
  ].filter((name, index, self) => self.indexOf(name) === index); // Unique names

  return {
    humanDetected,
    animalDetected,
    facesCount: faces.length,
    humanObjectsCount: humanObjects.length,
    animalObjectsCount: animalObjects.length,
    detectedAnimals,
    humanConfidence,
    animalConfidence,
    detectionMethods: {
      faces: faces.length > 0,
      objects: humanObjects.length > 0 || animalObjects.length > 0,
      labels: humanLabels.length > 0 || animalLabels.length > 0,
    },
    details: {
      faces,
      humanObjects,
      animalObjects,
      humanLabels,
      animalLabels,
    },
  };
}

/**
 * Create empty detection result
 */
function createEmptyDetectionResult(): DetectionResult {
  return {
    humanDetected: false,
    animalDetected: false,
    facesCount: 0,
    humanObjectsCount: 0,
    animalObjectsCount: 0,
    detectedAnimals: [],
    humanConfidence: 0,
    animalConfidence: 0,
    detectionMethods: {
      faces: false,
      objects: false,
      labels: false,
    },
    details: {
      faces: [],
      humanObjects: [],
      animalObjects: [],
      humanLabels: [],
      animalLabels: [],
    },
  };
}

/**
 * Format detection result as readable text
 */
export function formatDetectionSummary(detection: DetectionResult): string {
  const lines: string[] = [];

  // Human Detection Section
  lines.push(`Human Detection: ${detection.humanDetected ? '✅ DETECTED' : '❌ Not detected'}`);
  if (detection.humanDetected) {
    if (detection.facesCount > 0) {
      lines.push(`  • Faces: ${detection.facesCount}`);
    }
    if (detection.humanObjectsCount > 0) {
      lines.push(`  • Human objects: ${detection.humanObjectsCount}`);
    }
    if (detection.humanConfidence > 0) {
      lines.push(`  • Confidence: ${(detection.humanConfidence * 100).toFixed(1)}%`);
    }
    if (detection.details.humanObjects.length > 0) {
      const objectNames = detection.details.humanObjects.map(o => o.name).join(', ');
      lines.push(`  • Detected: ${objectNames}`);
    }
  }

  lines.push(''); // Empty line

  // Animal Detection Section
  lines.push(`Animal Detection: ${detection.animalDetected ? '✅ DETECTED' : '❌ Not detected'}`);
  if (detection.animalDetected) {
    if (detection.animalObjectsCount > 0) {
      lines.push(`  • Animal objects: ${detection.animalObjectsCount}`);
    }
    if (detection.detectedAnimals.length > 0) {
      lines.push(`  • Detected animals: ${detection.detectedAnimals.join(', ')}`);
    }
    if (detection.animalConfidence > 0) {
      lines.push(`  • Confidence: ${(detection.animalConfidence * 100).toFixed(1)}%`);
    }
  }

  return lines.join('\n');
}

/**
 * Format detection result as single-line summary
 */
export function formatDetectionShort(detection: DetectionResult): string {
  const parts: string[] = [];

  if (detection.humanDetected) {
    parts.push(`Human (${detection.facesCount + detection.humanObjectsCount})`);
  }
  if (detection.animalDetected) {
    parts.push(`Animal (${detection.detectedAnimals.length})`);
  }

  return parts.length > 0 ? parts.join(', ') : 'None detected';
}
