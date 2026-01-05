# API Integration Guide

## Overview
The React Native app connects directly to your Hostinger-hosted backend API. No local backend server is needed.

## Quick Setup

### 1. Update API URL
Edit `src/config/api.config.ts`:

```typescript
export const apiConfig = {
  baseURL: 'https://your-hostinger-domain.com/api/v1', // Your Hostinger API URL
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

**Important:** Replace `your-hostinger-domain.com` with your actual Hostinger domain (e.g., `demo1.indiapropertys.com`)

### 2. Required API Endpoints

Your Hostinger backend must provide these endpoints:

#### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user  
- `GET /api/v1/auth/me` - Get current user (requires auth)
- `POST /api/v1/auth/logout` - Logout (requires auth)

#### Properties
- `GET /api/v1/properties` - List properties (public)
- `GET /api/v1/properties/:id` - Property details (public)
- `GET /api/v1/properties/my/list` - My properties (auth required)
- `POST /api/v1/properties` - Create property (auth required, seller/agent)
- `PUT /api/v1/properties/:id` - Update property (auth required, seller/agent)
- `DELETE /api/v1/properties/:id` - Delete property (auth required, seller/agent)

#### Favorites
- `GET /api/v1/favorites` - List favorites (auth required)
- `POST /api/v1/favorites` - Add favorite (auth required)
- `DELETE /api/v1/favorites/:property_id` - Remove favorite (auth required)

#### Inquiries
- `POST /api/v1/inquiries/send` - Send inquiry
- `GET /api/v1/inquiries?type=received|sent` - List inquiries (auth required)

#### User Profile
- `GET /api/v1/user/profile` - Get profile (auth required)
- `PUT /api/v1/user/profile` - Update profile (auth required)
- `PUT /api/v1/user/change-password` - Change password (auth required)

### 3. Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message"
}
```

### 4. Authentication

Include JWT token in requests:
```
Authorization: Bearer <token>
```

## Features Implemented

✅ User registration/login
✅ Property listing from database
✅ Property creation (saves to database)
✅ Property deletion
✅ Favorites management
✅ Inquiries system
✅ Role-based access (buyer/seller cross-access, agents restricted)

## Database

The app connects to your Hostinger database:
- **Database**: `u449667423_lastdata`
- **Server**: MariaDB 11.8.3

## Testing

1. Update API URL in `src/config/api.config.ts`
2. Start React Native: `npm start`
3. Run Android: `npm run android`
4. Test login/registration
5. Test property listing

## Troubleshooting

- **Connection failed**: Check API URL is correct and accessible
- **CORS errors**: Ensure backend allows CORS from mobile app
- **Auth errors**: Verify token format and expiry
- **404 errors**: Check API endpoint paths match exactly

See `HOSTINGER_API_SETUP.md` for detailed API specifications.

