# API Integration Summary

This document summarizes the API integration updates made to align with the backend API documentation.

## ✅ Completed Updates

### 1. API Configuration (`src/config/api.config.ts`)
- ✅ Updated base URLs to match backend:
  - API Base URL: `https://demo1.indiapropertys.com/backend/api`
  - Upload Base URL: `https://demo1.indiapropertys.com/backend/uploads`
- ✅ Added new endpoint structure:
  - Buyer-specific endpoints (`/buyer/*`)
  - Seller-specific endpoints (`/seller/*`)
  - OTP endpoints (`/otp/*`)
  - Upload endpoints (`/upload/*`)
- ✅ Maintained legacy endpoints for backward compatibility

### 2. Authentication Service (`src/services/auth.service.ts`)
- ✅ Updated `register()` to use new API structure:
  - Parameters: `fullName`, `email`, `phone`, `password`, `userType`
  - Optional: `emailVerificationToken`, `phoneVerificationToken`
- ✅ Updated `login()` to require `userType` parameter
- ✅ Added `forgotPassword()` for password reset initiation
- ✅ Updated `resetPassword()` to use token-based reset
- ✅ Added `verifyEmail()` for email verification
- ✅ Updated `getCurrentUser()` to support buyer/seller profiles

### 3. OTP Service (`src/services/otp.service.ts`) - NEW
- ✅ Created new service for OTP operations:
  - `sendSMS()` - Send SMS OTP
  - `verifySMS()` - Verify SMS OTP
  - `sendEmail()` - Send Email OTP
  - `verifyEmail()` - Verify Email OTP
  - `resendSMS()` - Resend SMS OTP

### 4. Property Service (`src/services/property.service.ts`)
- ✅ Updated `getProperties()` to use `/buyer/properties/list.php`
- ✅ Updated `getPropertyDetails()` to use `/buyer/properties/details.php`
- ✅ Updated `createProperty()` to use `/seller/properties/add.php` with multipart/form-data
- ✅ Updated `updateProperty()` to use `/seller/properties/update.php`
- ✅ Updated `deleteProperty()` to use `/seller/properties/delete.php`
- ✅ Updated `getMyProperties()` to use `/seller/properties/list.php` with pagination
- ✅ Added `uploadPropertyFiles()` for images, videos, and brochures
- ✅ Maintained legacy `uploadImages()` for backward compatibility

### 5. Favorite Service (`src/services/favorite.service.ts`)
- ✅ Updated `getFavorites()` to use `/buyer/favorites/list.php` with pagination
- ✅ Updated to use `toggleFavorite()` endpoint (`/buyer/favorites/toggle.php`)
- ✅ Maintained legacy methods for backward compatibility

### 6. Inquiry Service (`src/services/inquiry.service.ts`)
- ✅ Updated `sendInquiry()` to use `/buyer/inquiries/send.php`
- ✅ Updated `getInbox()` to use `/seller/inquiries/list.php` with filters
- ✅ Added `updateInquiryStatus()` for seller inquiry management
- ✅ Maintained legacy methods for backward compatibility

### 7. User Service (`src/services/user.service.ts`)
- ✅ Added `getBuyerProfile()` - `/buyer/profile/get.php`
- ✅ Added `updateBuyerProfile()` - `/buyer/profile/update.php`
- ✅ Added `getSellerProfile()` - `/seller/profile/get.php`
- ✅ Added `updateSellerProfile()` - `/seller/profile/update.php`
- ✅ Added `getSellerDashboardStats()` - `/seller/dashboard/stats.php`
- ✅ Added `getBuyersList()` - `/seller/buyers/get.php`
- ✅ Updated `uploadProfilePicture()` to use `/upload/profile-image.php`
- ✅ Maintained legacy methods for backward compatibility

### 8. Upload Service (`src/services/upload.service.ts`) - NEW
- ✅ Created new service for file uploads:
  - `uploadProfileImage()` - Upload user profile image
  - `uploadPropertyFiles()` - Upload property images, videos, or brochures

### 9. Buyer Service (`src/services/buyer.service.ts`) - NEW
- ✅ Created new service for buyer-specific operations:
  - `recordInteraction()` - Record property interactions (view, call, whatsapp, email)
  - `checkInteractionLimit()` - Check remaining interaction limits

### 10. Chat Service (`src/services/chat.service.ts`)
- ✅ Added `createRoom()` using `/chat/create-room.php`
- ✅ Updated `initConversation()` to use new endpoint
- ✅ Maintained legacy methods for backward compatibility

### 11. Services Index (`src/services/index.ts`) - NEW
- ✅ Created centralized export file for easier imports

### 12. Auth Context (`src/context/AuthContext.tsx`)
- ✅ Updated `login()` to support `userType` parameter
- ✅ Updated `register()` to support verification tokens
- ✅ Updated `getCurrentUser()` to use user type-specific endpoints
- ✅ Updated OTP methods to use new OTP service
- ✅ Maintained backward compatibility

## 📋 API Endpoint Mapping

### Authentication
| Old Endpoint | New Endpoint | Status |
|-------------|--------------|--------|
| `/auth/register.php` | `/auth/register.php` | ✅ Updated |
| `/auth/login.php` | `/auth/login.php` | ✅ Updated |
| `/auth/forgot-password.php` | `/auth/forgot-password-init.php` | ✅ Updated |
| `/auth/reset-password.php` | `/auth/reset-password.php` | ✅ Updated |
| N/A | `/auth/verify.php` | ✅ Added |

### OTP
| Endpoint | Status |
|----------|--------|
| `/otp/send-sms.php` | ✅ Created |
| `/otp/verify-sms.php` | ✅ Created |
| `/otp/send-email.php` | ✅ Created |
| `/otp/verify-email.php` | ✅ Created |
| `/otp/resend-sms.php` | ✅ Created |

### Buyer APIs
| Old Endpoint | New Endpoint | Status |
|-------------|--------------|--------|
| `/properties/list.php` | `/buyer/properties/list.php` | ✅ Updated |
| `/properties/details.php` | `/buyer/properties/details.php` | ✅ Updated |
| `/inquiries/send.php` | `/buyer/inquiries/send.php` | ✅ Updated |
| `/favorites/list.php` | `/buyer/favorites/list.php` | ✅ Updated |
| `/favorites/add.php` | `/buyer/favorites/toggle.php` | ✅ Updated |
| `/user/profile.php` | `/buyer/profile/get.php` | ✅ Updated |
| `/user/update-profile.php` | `/buyer/profile/update.php` | ✅ Updated |
| N/A | `/buyer/interactions/record.php` | ✅ Added |
| N/A | `/buyer/interactions/check.php` | ✅ Added |

### Seller APIs
| Old Endpoint | New Endpoint | Status |
|-------------|--------------|--------|
| `/properties/create.php` | `/seller/properties/add.php` | ✅ Updated |
| `/properties/my-properties.php` | `/seller/properties/list.php` | ✅ Updated |
| `/properties/update.php` | `/seller/properties/update.php` | ✅ Updated |
| `/properties/delete.php` | `/seller/properties/delete.php` | ✅ Updated |
| `/inquiries/inbox.php` | `/seller/inquiries/list.php` | ✅ Updated |
| `/user/profile.php` | `/seller/profile/get.php` | ✅ Updated |
| `/user/update-profile.php` | `/seller/profile/update.php` | ✅ Updated |
| N/A | `/seller/inquiries/updateStatus.php` | ✅ Added |
| N/A | `/seller/dashboard/stats.php` | ✅ Added |
| N/A | `/seller/buyers/get.php` | ✅ Added |

### Upload APIs
| Old Endpoint | New Endpoint | Status |
|-------------|--------------|--------|
| `/user/upload-profile-picture.php` | `/upload/profile-image.php` | ✅ Updated |
| `/properties/upload-images.php` | `/upload/property-files.php` | ✅ Updated |

## 🔧 Usage Examples

### Authentication
```typescript
import {authService} from './services/auth.service';

// Register
await authService.register({
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+919876543210',
  password: 'SecurePassword123!',
  userType: 'buyer',
  emailVerificationToken: 'msg91_email_token',
  phoneVerificationToken: 'msg91_phone_token',
});

// Login
await authService.login('john@example.com', 'password123', 'buyer');
```

### OTP
```typescript
import {otpService} from './services/otp.service';

// Send SMS OTP
await otpService.sendSMS('+919876543210');

// Verify SMS OTP
await otpService.verifySMS('+919876543210', '123456');
```

### Properties (Buyer)
```typescript
import {propertyService} from './services/property.service';

// List properties
const properties = await propertyService.getProperties({
  page: 1,
  limit: 20,
  city: 'Mumbai',
  min_price: 500000,
  max_price: 5000000,
});

// Get property details
const property = await propertyService.getPropertyDetails(1);
```

### Properties (Seller)
```typescript
import {propertyService} from './services/property.service';

// Create property (multipart/form-data)
const formData = new FormData();
formData.append('title', '2 BHK Apartment');
formData.append('price', '5000000');
// ... add other fields
formData.append('images[]', {uri: imageUri, type: 'image/jpeg', name: 'image.jpg'});

await propertyService.createProperty(formData);

// List seller's properties
const myProperties = await propertyService.getMyProperties({status: 'approved'});
```

### Favorites
```typescript
import {favoriteService} from './services/favorite.service';

// Toggle favorite
await favoriteService.toggleFavorite(1);

// Get favorites
const favorites = await favoriteService.getFavorites(1, 20);
```

### Inquiries
```typescript
import {inquiryService} from './services/inquiry.service';

// Send inquiry (Buyer)
await inquiryService.sendInquiry(1, 'I am interested in this property');

// Get inquiries (Seller)
const inquiries = await inquiryService.getInbox({status: 'unread'});

// Update inquiry status (Seller)
await inquiryService.updateInquiryStatus(1, 'read');
```

### User Profile
```typescript
import {userService} from './services/user.service';

// Get buyer profile
const buyerProfile = await userService.getBuyerProfile();

// Update buyer profile
await userService.updateBuyerProfile({
  full_name: 'John Doe Updated',
  phone: '+919876543210',
});

// Get seller dashboard stats
const stats = await userService.getSellerDashboardStats();
```

### Uploads
```typescript
import {uploadService} from './services/upload.service';

// Upload profile image
const result = await uploadService.uploadProfileImage(imageUri);

// Upload property files
await uploadService.uploadPropertyFiles(
  1,
  [{uri: imageUri, type: 'image/jpeg', name: 'image.jpg'}],
  'image'
);
```

### Buyer Interactions
```typescript
import {buyerService} from './services/buyer.service';

// Record interaction
await buyerService.recordInteraction(1, 'view');

// Check interaction limit
const limit = await buyerService.checkInteractionLimit(1);
```

## 🔄 Backward Compatibility

All legacy endpoints and methods are maintained for backward compatibility. The codebase can gradually migrate to new endpoints while existing code continues to work.

## 📝 Notes

1. **Token Storage**: JWT tokens are stored in `@auth_token` key in AsyncStorage
2. **User Data**: User data is stored in `@propertyapp_user` key in AsyncStorage
3. **File Uploads**: All file uploads use `multipart/form-data` content type
4. **Pagination**: Most list endpoints support `page` and `limit` parameters
5. **Error Handling**: All services use the centralized API service with error interceptors
6. **Image URLs**: Image URLs are automatically fixed using `fixImageUrl` utility

## 🚀 Next Steps

1. Update screens to use new service methods
2. Test all API endpoints with the backend
3. Remove legacy endpoints once migration is complete
4. Update TypeScript types/interfaces if needed
5. Add error handling for specific error codes

## 📞 Support

For API issues:
- Backend URL: `https://demo1.indiapropertys.com/backend/api`
- Health Check: `GET /api/index.php`
- All endpoints return JSON with `success`, `message`, and `data` fields

