# Google Vision API Integration - React Native App

## ✅ Implementation Complete

The React Native app now integrates with Google Vision API for automatic image moderation. Images are validated in real-time when selected, and moderation status is displayed to users.

---

## 🔑 Google Cloud Credentials

**Note**: Google Vision API is **backend-only**. The React Native app does not need Google Cloud credentials.

**Backend Credentials:**
- **Production Path**: `/home/u449667423/domains/indiapropertys.com/Secure/indiapropertys-8fab286d41e4.json`
- **Development Path**: `backend/config/google-cloud-credentials.json`
- **File Name**: `indiapropertys-8fab286d41e4.json`

The backend handles all Google Vision API calls. The React Native app only uploads images to the moderation endpoint.

---

## 📦 Components Updated

### 1. **API Configuration** (`src/config/api.config.ts`)

**Added Endpoints:**
```typescript
// Image Moderation (Google Vision API)
MODERATE_AND_UPLOAD: '/images/moderate-and-upload.php',

// Admin Moderation Queue
ADMIN_MODERATION_QUEUE: '/admin/moderation-queue/list.php',
ADMIN_MODERATION_APPROVE: '/admin/moderation-queue/approve.php',
ADMIN_MODERATION_REJECT: '/admin/moderation-queue/reject.php',
```

---

### 2. **Moderation Service** (`src/services/moderation.service.ts`)

**Key Methods:**

#### `uploadWithModeration(imageUri, propertyId?)`
- Uploads image to moderation endpoint
- Returns moderation status: `APPROVED`, `REJECTED`, `PENDING`
- Handles response format from backend
- Maps backend status to app format

**Response Format:**
```typescript
{
  status: 'success' | 'approved' | 'pending' | 'rejected' | 'failed',
  message: string,
  image_url?: string,
  moderation_status?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'SAFE' | 'UNSAFE',
  moderation_reason?: string,
}
```

#### `approveImage(imageId)` - Admin only
- Approves a pending image

#### `rejectImage(imageId, reason?)` - Admin only
- Rejects a pending image

#### `getPendingImages()` - Admin only
- Gets list of images pending review

---

### 3. **Image Upload Component** (`src/components/common/ImageUploadWithModeration.tsx`)

**Features:**
- ✅ Real-time moderation validation
- ✅ Moderation status badges (✓ Approved, ✗ Rejected, ⏳ Pending)
- ✅ Rejection reason display
- ✅ Loading indicators during validation
- ✅ Automatic alerts for rejected images

**Usage:**
```typescript
<ImageUploadWithModeration
  images={images}
  onImagesChange={setImages}
  maxImages={10}
  propertyId={propertyId}
  showModerationStatus={true}
  onImageValidated={(image, result) => {
    console.log('Image validated:', result);
  }}
/>
```

---

### 4. **Property Forms Updated**

#### A. **Seller AddPropertyScreen** (`src/screens/Seller/AddPropertyScreen.tsx`)

**Changes:**
- ✅ Real-time image validation on selection
- ✅ Moderation status display for each image
- ✅ Automatic rejection alerts
- ✅ Status badges (✓, ✗, ⏳)
- ✅ Rejection reason display
- ✅ Only approved/pending images are uploaded

**Image State:**
```typescript
const [photos, setPhotos] = useState<Array<{
  uri: string;
  moderationStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking';
  moderationReason?: string;
  imageUrl?: string;
}>>([]);
```

**Validation Flow:**
1. User selects images from gallery
2. Images are immediately validated through moderation endpoint
3. Status badges appear on each image
4. Rejected images show rejection reason
5. User can remove rejected images
6. Only approved/pending images are saved

#### B. **Agent AddPropertyScreen** (`src/screens/Agent/AddPropertyScreen.tsx`)

**Changes:**
- ✅ Same real-time validation as Seller form
- ✅ Moderation status display
- ✅ Status badges and rejection reasons
- ✅ Automatic alerts

---

## 🔄 API Usage Flow

### Image Upload with Moderation:

1. **User selects image** in property form
2. **App immediately calls** `POST /api/images/moderate-and-upload.php`
3. **Backend validates** file (type, size, dimensions)
4. **Backend calls Google Vision API** for moderation
5. **Backend evaluates** moderation rules:
   - SafeSearch (adult, violence, racy, medical)
   - Human detection (faces, person objects)
   - Animal detection (60+ animal types)
   - Property context scoring
   - Blur detection
6. **Backend returns** moderation status:
   - `APPROVED` - Image passed all checks
   - `REJECTED` - Image failed moderation
   - `PENDING` - Needs manual review
7. **App displays** status badge on image
8. **App shows alert** if image is rejected
9. **User can remove** rejected images
10. **On property submit**, only approved/pending images are saved

---

## 📊 Moderation Status Values

| Status | Meaning | User Action |
|--------|---------|-------------|
| `APPROVED` | Image passed moderation | ✅ Can proceed |
| `REJECTED` | Image failed moderation | ❌ Remove and select different image |
| `PENDING` | Needs admin review | ⏳ Can proceed, will be reviewed |
| `checking` | Validation in progress | ⏳ Wait for result |

---

## 🎨 UI Features

### Moderation Status Badges:
- **✓ Approved** (Green) - Image passed moderation
- **✗ Rejected** (Red) - Image failed moderation
- **⏳ Pending** (Orange) - Needs admin review
- **... Checking** (Gray) - Validation in progress

### Rejection Reasons:
- Displayed below rejected images
- Shows specific reason (e.g., "Animal detected", "Adult content")
- Helps user understand why image was rejected

---

## 🛡️ Moderation Rules (Backend)

### SafeSearch Thresholds:
- **Adult**: 0.6 (60%)
- **Racy**: 0.7 (70%)
- **Violence**: 0.5 (50%)
- **Medical**: 0.6 (60%)

### Detection Thresholds:
- **Face detection**: 0.7 (70%)
- **Human object**: 0.7 (70%)
- **Animal object**: 0.6 (60%)
- **Animal label**: 0.7 (70%)

### Image Quality:
- **Min width**: 400px
- **Min height**: 300px
- **Max blur**: HIGH_BLUR_THRESHOLD (50 variance)

---

## 📝 Error Handling

### Network Errors:
- Shows "Failed to validate image" alert
- Image marked as `REJECTED`
- User can retry by removing and re-selecting

### Backend Errors:
- Parses error message from backend
- Displays user-friendly message
- Logs detailed error for debugging

### Timeout:
- 30-second timeout for moderation calls
- Falls back to error state if timeout occurs

---

## 🔍 Admin Moderation Queue

**Note**: Admin moderation queue interface is backend-only. The React Native app can call admin endpoints if needed:

```typescript
// Get pending images
const pending = await moderationService.getPendingImages();

// Approve image
await moderationService.approveImage(imageId);

// Reject image
await moderationService.rejectImage(imageId, 'Reason');
```

---

## ✅ Testing Checklist

- [x] API endpoint configured
- [x] Moderation service implemented
- [x] Real-time validation on image selection
- [x] Status badges display correctly
- [x] Rejection reasons shown
- [x] Alerts for rejected images
- [x] Only approved/pending images saved
- [x] Error handling for network issues
- [x] Timeout handling
- [x] Seller form integration
- [x] Agent form integration

---

## 📚 Related Files

- `src/config/api.config.ts` - API endpoints
- `src/services/moderation.service.ts` - Moderation service
- `src/components/common/ImageUploadWithModeration.tsx` - Reusable component
- `src/screens/Seller/AddPropertyScreen.tsx` - Seller property form
- `src/screens/Agent/AddPropertyScreen.tsx` - Agent property form

---

## 🎯 Key Features

1. **Real-time Validation**: Images validated immediately on selection
2. **Visual Feedback**: Status badges show moderation result instantly
3. **User-Friendly**: Clear rejection reasons help users understand issues
4. **Automatic Filtering**: Only approved/pending images are saved
5. **Error Handling**: Graceful handling of network and API errors
6. **Backend Integration**: Seamless integration with Google Vision API via backend

---

**Last Updated**: Google Vision API integration complete. Images are now automatically moderated when selected in property forms.

