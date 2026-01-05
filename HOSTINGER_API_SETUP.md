# Hostinger API Integration Setup

## Overview
The app connects directly to your Hostinger-hosted backend API. No local backend server is needed.

## Configuration

### 1. Update API Base URL

Edit `src/config/api.config.ts` and set your Hostinger API URL:

```typescript
export const apiConfig = {
  baseURL: 'https://your-hostinger-domain.com/api/v1', // Your Hostinger API URL
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

**Common Hostinger API URLs:**
- `https://demo1.indiapropertys.com/api/v1`
- `https://yourdomain.com/api/v1`
- `https://yourdomain.com/backend/api/v1`

### 2. API Endpoints Expected

Your Hostinger backend should provide these endpoints:

#### Authentication
- `POST /api/v1/auth/register` - Register user
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "password": "password123",
    "user_type": "buyer"
  }
  ```

- `POST /api/v1/auth/login` - Login
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
  Response:
  ```json
  {
    "success": true,
    "data": {
      "token": "jwt_token_here",
      "user": {
        "id": 1,
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "user_type": "buyer"
      }
    }
  }
  ```

- `GET /api/v1/auth/me` - Get current user (requires Authorization: Bearer token)

- `POST /api/v1/auth/logout` - Logout (requires Authorization: Bearer token)

#### Properties
- `GET /api/v1/properties` - List properties
  Query params: `status`, `property_type`, `state`, `city`, `min_price`, `max_price`, `page`, `limit`, `search`
  
- `GET /api/v1/properties/:id` - Get property details

- `GET /api/v1/properties/my/list` - Get my properties (requires auth, seller/agent)

- `POST /api/v1/properties` - Create property (requires auth, seller/agent)
  ```json
  {
    "title": "Spacious 3BHK Apartment",
    "status": "sale",
    "property_type": "Apartment",
    "location": "Pune, Maharashtra",
    "bedrooms": "3",
    "bathrooms": "2",
    "area": 1200,
    "price": 8500000,
    "amenities": ["parking", "lift", "security"]
  }
  ```

- `PUT /api/v1/properties/:id` - Update property (requires auth, seller/agent)

- `DELETE /api/v1/properties/:id` - Delete property (requires auth, seller/agent)

#### Favorites
- `GET /api/v1/favorites` - List favorites (requires auth)
- `POST /api/v1/favorites` - Add favorite (requires auth)
  ```json
  {
    "property_id": "123"
  }
  ```
- `DELETE /api/v1/favorites/:property_id` - Remove favorite (requires auth)

#### Inquiries
- `POST /api/v1/inquiries/send` - Send inquiry
  ```json
  {
    "property_id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "1234567890",
    "message": "I'm interested in this property"
  }
  ```

- `GET /api/v1/inquiries?type=received|sent` - List inquiries (requires auth)

#### User Profile
- `GET /api/v1/user/profile` - Get profile (requires auth)
- `PUT /api/v1/user/profile` - Update profile (requires auth)
- `PUT /api/v1/user/change-password` - Change password (requires auth)

### 3. Response Format

All API responses should follow this format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (optional)"
}
```

### 4. Authentication

- Include JWT token in Authorization header:
  ```
  Authorization: Bearer <token>
  ```

- Token should be returned on login/register
- Token expires after 24 hours (or as per your backend config)

### 5. CORS Configuration

Ensure your Hostinger backend allows CORS from your React Native app:
- Allow origin: `*` (or specific domains)
- Allow methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allow headers: `Content-Type, Authorization`

### 6. Testing

Test your API endpoints:

```bash
# Test health/availability
curl https://your-hostinger-domain.com/api/v1/health

# Test login
curl -X POST https://your-hostinger-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 7. Database Connection

Your Hostinger backend should connect to:
- **Database**: `u449667423_lastdata`
- **Server**: MariaDB 11.8.3
- **Character Set**: utf8mb4

## Troubleshooting

### Connection Issues
- Verify API URL is correct in `api.config.ts`
- Check if HTTPS is required (use `https://` not `http://`)
- Ensure backend is accessible from internet
- Check CORS settings on backend

### Authentication Errors
- Verify token format (should be JWT)
- Check token expiry
- Ensure Authorization header is sent correctly

### API Errors
- Check response format matches expected structure
- Verify database connection on Hostinger
- Check API endpoint paths match exactly

## Notes

- The app expects RESTful API endpoints
- All endpoints should return JSON
- Use proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Implement proper error handling on backend
- Use prepared statements to prevent SQL injection
- Hash passwords using bcrypt or similar

