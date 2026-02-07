# Property Image Upload Workflow - Current Implementation

## 📸 **CURRENT WORKFLOW**

### **Two-Phase Upload Process**

The agent dashboard uses a **hybrid workflow** that combines Firebase Storage with base64 encoding:

---

## **Phase 1: Image Selection & Pre-Upload** (During Form Filling)

### **Step 1: User Selects Images**
- User picks images from gallery using `react-native-image-picker`
- Images are converted to base64 format
- Maximum 10 images allowed

**Location**: `src/screens/Agent/AddPropertyScreen.tsx:264-331`

### **Step 2: Upload to Firebase Storage**
- **Service**: `uploadPropertyImageWithModeration()` from `imageUpload.service.ts`
- **Workflow**:
  1. ✅ Upload image to **Firebase Storage** (images stored in Firebase)
  2. ✅ Send Firebase URL to backend moderation API (`/images/moderate-and-upload.php`)
  3. ✅ Backend performs Google Vision API moderation (does NOT store the file)
  4. ✅ Returns moderation status: `APPROVED`, `REJECTED`, or `PENDING`

**Code Flow**:
```typescript
// Step 1: Upload to Firebase Storage
const firebaseResult = await uploadPropertyImageToFirebase(
  imageUri,
  userId,
  propertyId, // null for new properties
  onProgress
);
firebaseUrl = firebaseResult.url; // Firebase Storage URL

// Step 2: Send Firebase URL to backend for moderation
const formData = new FormData();
formData.append('firebase_url', firebaseUrl);
// Backend moderates using Google Vision API
// Backend does NOT store the image file
```

**Storage Paths**:
- **New properties**: `properties/temp/{userId}/{filename}`
- **Existing properties**: `properties/{propertyId}/{filename}`

**Moderation Endpoint**: `POST /api/images/moderate-and-upload.php`

**Moderation Status**:
- `SAFE` / `APPROVED` → Image approved
- `UNSAFE` / `REJECTED` → Image rejected (with reason)
- `PENDING` / `NEEDS_REVIEW` → Under review

---

## **Phase 2: Property Creation** (On Submit)

### **Current Implementation: Base64 Strings**

**Issue**: Despite uploading to Firebase in Phase 1, the property creation still sends **base64 strings**:

**Location**: `src/screens/Agent/AddPropertyScreen.tsx:703-786`

```typescript
// CREATE MODE: Create new property
// Collect base64 for approved/pending images
const validImages = photos.filter(
  p => (p.moderationStatus === 'APPROVED' || p.moderationStatus === 'PENDING') && !!p.base64
);

const imageBase64Strings = validImages.map(p => p.base64).filter(Boolean);

const propertyData = {
  // ... other fields
  images: imageBase64Strings.length > 0 ? imageBase64Strings : undefined, // ⚠️ BASE64
};
```

**Problem**: 
- ✅ Images are already uploaded to Firebase Storage
- ✅ Firebase URLs are available (`imageUrl` field in photos array)
- ❌ But base64 strings are sent again during property creation
- ❌ This is **redundant** and **inefficient**

---

## 🔄 **WORKFLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Image Selection & Pre-Upload                       │
└─────────────────────────────────────────────────────────────┘

User Selects Image
       ↓
Convert to Base64 (for preview)
       ↓
Upload to Firebase Storage
  └─→ Firebase URL: https://firebase.../properties/temp/{userId}/img_xxx.jpg
       ↓
Send Firebase URL to Backend Moderation API
  └─→ POST /api/images/moderate-and-upload.php
  └─→ Backend uses Google Vision API
  └─→ Backend does NOT store the file
       ↓
Receive Moderation Status
  └─→ APPROVED / REJECTED / PENDING
       ↓
Store in photos array:
  {
    uri: "file://...",
    base64: "data:image/jpeg;base64,...",  ← Still kept
    imageUrl: "https://firebase.../img_xxx.jpg",  ← Firebase URL
    moderationStatus: "APPROVED"
  }

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Property Creation (On Submit)                     │
└─────────────────────────────────────────────────────────────┘

User Clicks "Publish Listing"
       ↓
Collect Approved/Pending Images
       ↓
Extract Base64 Strings (⚠️ REDUNDANT)
  └─→ Uses base64 from photos array
       ↓
Send Property Data with Base64 Images
  └─→ POST /api/seller/properties/add.php
  └─→ {
        ...propertyData,
        images: ["data:image/jpeg;base64,...", ...]  ← BASE64 AGAIN
      }
       ↓
Backend Receives Base64
  └─→ Backend processes base64 (stores in backend/uploads/)
  └─→ Firebase URLs are ignored
```

---

## ⚠️ **CURRENT ISSUES**

### **1. Redundant Upload**
- Images are uploaded to Firebase Storage in Phase 1
- But base64 strings are sent again in Phase 2
- Backend stores images from base64 (ignoring Firebase URLs)
- **Result**: Images stored in both Firebase AND backend

### **2. Inefficient**
- Base64 strings are large (increases request size)
- Firebase URLs are small and already available
- Network bandwidth wasted

### **3. Inconsistent Storage**
- Phase 1: Images in Firebase Storage
- Phase 2: Images stored again in backend/uploads/
- **Result**: Duplicate storage

---

## ✅ **RECOMMENDED WORKFLOW**

### **Option A: Use Firebase URLs Only** (Recommended)

**Phase 2 should send Firebase URLs instead of base64**:

```typescript
// CREATE MODE: Create new property
const validImages = photos.filter(
  p => (p.moderationStatus === 'APPROVED' || p.moderationStatus === 'PENDING') && !!p.imageUrl
);

const imageUrls = validImages
  .map(p => p.imageUrl) // Use Firebase URL
  .filter((url): url is string => !!url);

const propertyData = {
  // ... other fields
  images: imageUrls.length > 0 ? imageUrls : undefined, // Firebase URLs
};
```

**Benefits**:
- ✅ No redundant uploads
- ✅ Smaller request size
- ✅ Single source of truth (Firebase Storage)
- ✅ Faster property creation

### **Option B: Backend Stores from Firebase URLs**

Backend should download from Firebase URLs and store locally:

```php
// Backend receives Firebase URLs
foreach ($images as $firebaseUrl) {
  // Download from Firebase
  $imageContent = file_get_contents($firebaseUrl);
  // Store in backend/uploads/
  file_put_contents($localPath, $imageContent);
}
```

---

## 📋 **CURRENT IMPLEMENTATION DETAILS**

### **Services Used**

1. **Firebase Storage Upload**
   - **Service**: `firebaseStorageProperty.service.ts`
   - **Function**: `uploadPropertyImageToFirebase()`
   - **Storage**: Firebase Storage
   - **Path**: `properties/temp/{userId}/` or `properties/{propertyId}/`

2. **Moderation Service**
   - **Service**: `imageUpload.service.ts`
   - **Function**: `uploadPropertyImageWithModeration()`
   - **Endpoint**: `/api/images/moderate-and-upload.php`
   - **Moderation**: Google Vision API (via backend)

3. **Property Creation**
   - **Service**: `property.service.ts`
   - **Function**: `createProperty()`
   - **Endpoint**: `/api/seller/properties/add.php`
   - **Images**: Currently sends base64 strings

### **Image States**

```typescript
interface Photo {
  uri: string;                    // Local file URI
  base64?: string;                // Base64 string (for preview & fallback)
  imageUrl?: string;              // Firebase Storage URL (after upload)
  moderationStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking';
  moderationReason?: string;     // Rejection reason if rejected
}
```

### **Moderation Status Flow**

```
'checking' → Uploading to Firebase
     ↓
'PENDING' → Sent to backend, awaiting moderation
     ↓
'APPROVED' → Safe, can be used
'REJECTED' → Unsafe, cannot be used
```

---

## 🎯 **SUMMARY**

### **Current Workflow**
1. ✅ Images uploaded to Firebase Storage
2. ✅ Firebase URLs sent to backend for moderation
3. ✅ Moderation status received
4. ⚠️ **But base64 strings sent again during property creation**

### **What Should Happen**
1. ✅ Images uploaded to Firebase Storage
2. ✅ Firebase URLs sent to backend for moderation
3. ✅ Moderation status received
4. ✅ **Firebase URLs sent during property creation** (not base64)

### **Files Involved**
- `src/screens/Agent/AddPropertyScreen.tsx` - Image selection & property creation
- `src/services/imageUpload.service.ts` - Firebase upload & moderation
- `src/services/firebaseStorageProperty.service.ts` - Firebase Storage operations
- `src/services/property.service.ts` - Property creation API call

---

## 🔧 **RECOMMENDATION**

**Change property creation to use Firebase URLs instead of base64 strings**:

```typescript
// In AddPropertyScreen.tsx, line ~705-786
// CHANGE FROM:
const imageBase64Strings = validImages.map(p => p.base64).filter(Boolean);
images: imageBase64Strings

// TO:
const imageUrls = validImages.map(p => p.imageUrl).filter(Boolean);
images: imageUrls  // Firebase URLs instead of base64
```

This will:
- ✅ Eliminate redundant uploads
- ✅ Reduce request size
- ✅ Use Firebase Storage as single source of truth
- ✅ Speed up property creation

---

**Report Generated**: 2026-02-06
**Current Status**: ⚠️ **Hybrid workflow (Firebase + Base64)**
**Recommended**: ✅ **Use Firebase URLs only**
