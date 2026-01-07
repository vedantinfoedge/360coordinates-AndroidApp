# Image Assets Guide

## Where to Add Images

### Logo Images
**Location:** `/src/assets/logo.jpeg` (or create new files like `logo.png`, `logo-dark.png`, etc.)

Currently used in:
- Login Screen (`src/screens/Auth/LoginScreen.tsx`)
- Register Screen (`src/screens/Auth/RegisterScreen.tsx`)
- Other components that display the app logo

**Recommended:**
- Format: PNG or JPEG
- Size: 300x100px or similar aspect ratio
- Transparent background (PNG) preferred for logos

### Background Images
**Location:** `/src/assets/` (create files like `bg-login.jpeg`, `bg-register.jpeg`, `background.png`, etc.)

Currently used in:
- Login Screen background (`src/screens/Auth/LoginScreen.tsx` - line 154)
- Register Screen background (`src/screens/Auth/RegisterScreen.tsx` - line 183)

**Recommended:**
- Format: JPEG or PNG
- Size: 1080x1920px or higher (mobile screen dimensions)
- File size: Keep under 500KB for better performance
- Consider using compressed images

### How to Use New Images

1. **Add your image file** to the appropriate folder:
   ```
   /src/assets/logo.jpeg          (for logo)
   /src/assets/bg-login.jpeg      (for background)
   ```

2. **Update the import** in the screen file:
   ```typescript
   // Change from:
   source={require('../../assets/logo.jpeg')}
   
   // To:
   source={require('../../assets/your-new-image.jpeg')}
   ```

3. **For background images**, you can also add them to:
   - `/src/assets/images/` folder for better organization

### Current Image Structure
```
src/assets/
├── logo.jpeg              # Main app logo
├── broserlogo.jpeg        # Browser logo variant
├── images/
│   └── property-images/   # Property-related images
└── icons/                 # Icon files
```

### Tips
- Use descriptive filenames (e.g., `logo-light.png`, `bg-auth-screen.jpg`)
- Optimize images before adding (use tools like TinyPNG or ImageOptim)
- For React Native, prefer JPEG for photos and PNG for logos/icons
- Consider creating different sizes for different screen densities (@2x, @3x)

