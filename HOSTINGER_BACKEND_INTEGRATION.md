# Hostinger Backend Integration Guide

## Backend Information

- **Base URL**: `https://demo1.indiapropertys.com/backend`
- **API Base URL**: `https://demo1.indiapropertys.com/backend/api`
- **Uploads URL**: `https://demo1.indiapropertys.com/backend/uploads`
- **Database**: `u449667423_lastdata` (MariaDB 11.8.3)

## API Endpoints Structure

All endpoints are PHP files in the `/backend/api/` directory:

### Authentication (`/auth/`)
- `register.php` - POST - Register new user
- `login.php` - POST - Login user
- `verify-otp.php` - POST - Verify OTP after registration
- `resend-otp.php` - POST - Resend OTP
- `forgot-password.php` - POST - Request password reset
- `reset-password.php` - POST - Reset password with OTP

### User Management (`/user/`)
- `profile.php` - GET - Get user profile
- `update-profile.php` - PUT - Update profile
- `upload-profile-picture.php` - POST - Upload profile picture (FormData)
- `change-password.php` - PUT - Change password

### Properties (`/properties/`)
- `list.php` - GET - List properties (with query params)
- `details.php` - GET - Get property details (?id=)
- `search.php` - POST - Search properties
- `create.php` - POST - Create property (auth required)
- `update.php` - PUT - Update property (auth required)
- `delete.php` - DELETE - Delete property (?id=) (auth required)
- `my-properties.php` - GET - Get user's properties (auth required)
- `upload-images.php` - POST - Upload property images (FormData, auth required)

### Favorites (`/favorites/`)
- `list.php` - GET - Get favorites (auth required)
- `add.php` - POST - Add favorite (auth required)
- `remove.php` - DELETE - Remove favorite (?property_id=) (auth required)
- `check.php` - GET - Check if favorited (?property_id=) (auth required)

### Inquiries (`/inquiries/`)
- `send.php` - POST - Send inquiry (auth required)
- `inbox.php` - GET - Get received inquiries (auth required, seller/agent)
- `sent.php` - GET - Get sent inquiries (auth required, buyer)
- `mark-read.php` - PUT - Mark inquiry as read (auth required)

### Common (`/`)
- `cities/list.php` - GET - Get cities list
- `property-types/list.php` - GET - Get property types
- `amenities/list.php` - GET - Get amenities list

## Request/Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## Authentication

- Include JWT token in Authorization header:
  ```
  Authorization: Bearer <token>
  ```

- Token is returned on login/register and stored in AsyncStorage
- Token expires after 24 hours (or as per backend config)

## Image Uploads

- Use FormData for image uploads
- Property images: `images[]` array in FormData
- Profile picture: `profile_picture` in FormData
- Images are stored in `/backend/uploads/`

## Implementation Status

✅ API configuration updated
✅ All service files updated to match PHP endpoints
✅ Authentication flow integrated
✅ Property services integrated
✅ Favorites services integrated
✅ Inquiries services integrated
✅ User services integrated

## Testing

Test API endpoints using:
```bash
# Test login
curl -X POST https://demo1.indiapropertys.com/backend/api/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test properties list
curl https://demo1.indiapropertys.com/backend/api/properties/list.php?page=1&limit=10
```

## Notes

- All endpoints return JSON
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Handle errors gracefully
- Show loading states during API calls
- Cache data when appropriate
- Handle network errors

