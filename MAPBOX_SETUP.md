# Mapbox Integration Setup Guide

## ✅ Completed

1. **Package Installed**: `@rnmapbox/maps` ✅
2. **Android Permissions**: Added location permissions ✅
3. **Components Created**:
   - `MapView.tsx` - Basic map component
   - `LocationPicker.tsx` - Location selection modal
   - `PropertyMapView.tsx` - Property map with markers
4. **Configuration**: `mapbox.config.ts` created ✅

## 🔧 Setup Required

### Step 1: Get Mapbox Access Token

1. Sign up at https://account.mapbox.com/
2. Go to Account > Access tokens
3. Copy your default public token or create a new one
4. Update `src/config/mapbox.config.ts`:
   ```typescript
   export const MAPBOX_ACCESS_TOKEN = 'pk.your_actual_token_here';
   ```

### Step 2: Android Configuration

The package should auto-link, but verify:

1. **Check `android/build.gradle`** - Should have:
   ```gradle
   repositories {
       google()
       mavenCentral()
   }
   ```

2. **Check `android/app/build.gradle`** - Should have:
   ```gradle
   dependencies {
       implementation("com.facebook.react:react-android")
       // Mapbox should be auto-linked
   }
   ```

3. **Permissions** - Already added to `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   ```

### Step 3: Initialize Mapbox in App

Add to `App.tsx` or `index.js`:

```typescript
import {initializeMapbox} from './src/config/mapbox.config';

// Initialize Mapbox on app start
initializeMapbox();
```

## 📱 Usage Examples

### 1. Basic Map View

```typescript
import MapView from './src/components/map/MapView';

<MapView
  initialCenter={[77.2090, 28.6139]} // [longitude, latitude]
  initialZoom={12}
  showUserLocation={true}
/>
```

### 2. Location Picker

```typescript
import LocationPicker from './src/components/map/LocationPicker';

const [pickerVisible, setPickerVisible] = useState(false);
const [selectedLocation, setSelectedLocation] = useState(null);

<LocationPicker
  visible={pickerVisible}
  onLocationSelect={(location) => {
    setSelectedLocation(location);
    console.log('Selected:', location.latitude, location.longitude);
  }}
  onClose={() => setPickerVisible(false)}
/>
```

### 3. Property Map with Markers

```typescript
import PropertyMapView from './src/components/map/PropertyMapView';

<PropertyMapView
  properties={propertiesArray}
  onPropertyPress={(property) => {
    navigation.navigate('PropertyDetails', {propertyId: property.id});
  }}
  showListToggle={true}
/>
```

### 4. Custom Markers

```typescript
<MapView
  markers={[
    {
      id: '1',
      coordinate: [77.2090, 28.6139],
      title: 'Property Title',
      description: 'Property description',
      color: '#4CAF50', // Green for sale
      onPress: () => console.log('Marker pressed'),
    },
  ]}
/>
```

## 🎨 Customization

### Map Styles

Available styles in `mapbox.config.ts`:
- `mapbox://styles/mapbox/streets-v12` (default)
- `mapbox://styles/mapbox/satellite-v9`
- `mapbox://styles/mapbox/dark-v11`
- `mapbox://styles/mapbox/light-v11`

### Marker Colors

Default colors:
- Sale: `#4CAF50` (Green)
- Rent: `#2196F3` (Blue)
- Selected: `#F44336` (Red)

## 🔍 Features

### MapView Component
- ✅ Interactive map
- ✅ Custom markers
- ✅ User location
- ✅ Map press handler
- ✅ Camera controls
- ✅ Loading states

### LocationPicker Component
- ✅ Full-screen modal
- ✅ Tap to select location
- ✅ Reverse geocoding (address lookup)
- ✅ Current location button (placeholder)
- ✅ Coordinate display

### PropertyMapView Component
- ✅ Property markers on map
- ✅ Map/List toggle
- ✅ Property cards
- ✅ Color-coded markers (sale/rent)
- ✅ Property details on marker press

## 🐛 Troubleshooting

### Map not loading
1. Check if token is set correctly
2. Verify internet connection
3. Check console for errors
4. Ensure permissions are granted

### Markers not showing
1. Verify coordinates are valid [longitude, latitude]
2. Check marker data structure
3. Ensure map is loaded before adding markers

### Location permission denied
1. Check AndroidManifest.xml has permissions
2. Request permission at runtime
3. Check device location settings

## 📝 Next Steps

1. **Get Mapbox Token** - Update `mapbox.config.ts`
2. **Test Basic Map** - Add MapView to a screen
3. **Integrate Location Picker** - Add to property creation form
4. **Add Property Map** - Show properties on map in list view
5. **Add Current Location** - Install `react-native-geolocation-service`

## 🔗 Resources

- [Mapbox Docs](https://docs.mapbox.com/)
- [@rnmapbox/maps Docs](https://github.com/rnmapbox/maps)
- [Mapbox Account](https://account.mapbox.com/)

## ⚠️ Important Notes

1. **Token Security**: In production, fetch token from backend API
2. **Rate Limits**: Mapbox has usage limits on free tier
3. **Offline Maps**: Requires additional setup for offline support
4. **Current Location**: Needs `react-native-geolocation-service` for better location accuracy

