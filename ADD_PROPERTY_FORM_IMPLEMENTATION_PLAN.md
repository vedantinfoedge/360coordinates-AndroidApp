# Add Property Form - Implementation Plan

## 📋 Current Status vs Specification

This document compares the current React Native implementation with the comprehensive specification and outlines what needs to be updated.

---

## ✅ Currently Implemented

### Step 1: Basic Information
- ✅ Property Title (required)
- ✅ Property Status (Sale/Rent toggle)
- ⚠️ Property Type (only 4 types: apartment, villa, house, rowhouse)

### Step 2: Property Details
- ✅ Location (text input)
- ❌ Location Auto-Suggest (not using LocationAutoSuggest component)
- ❌ Map Location Picker (not integrated)
- ❌ State field with autosuggest
- ❌ Additional Address field
- ✅ Bedrooms (number selector)
- ✅ Bathrooms (number selector)
- ✅ Balconies (number selector)
- ✅ Built-up Area
- ✅ Carpet Area
- ❌ Floor Number
- ✅ Total Floors
- ✅ Facing (dropdown)
- ✅ Property Age (dropdown)
- ✅ Furnishing (dropdown)

### Step 3: Amenities & Description
- ✅ Amenities selection (grid)
- ⚠️ Amenities list (limited, missing some)
- ✅ Property Description (textarea)
- ⚠️ Description validation (needs min 100 chars, mobile/email restriction)

### Step 4: Photos
- ✅ Image upload (multiple)
- ✅ Image moderation integration
- ✅ Moderation status display
- ✅ Image preview and removal

### Step 5: Pricing
- ✅ Price input
- ✅ Price Negotiable checkbox
- ❌ Security Deposit (for rent only)
- ✅ Maintenance Charges

---

## ❌ Missing Features

### 1. Property Types
**Current:** Only 4 types (apartment, villa, house, rowhouse)
**Required:** 14+ types as per specification

**Missing Types:**
- Studio Apartment
- Penthouse
- Commercial Office
- Commercial Shop
- Warehouse / Godown
- Plot / Land / Industrial Property
- PG / Hostel

**Action Required:**
- Update property type selection to include all types
- Add proper categorization (Residential, Commercial, Land, PG)
- Implement field visibility rules based on property type

---

### 2. Location Features
**Missing:**
- LocationAutoSuggest component integration
- StateAutoSuggest component integration
- LocationPicker (Map) component integration
- Additional Address field
- State field
- Latitude/Longitude capture

**Action Required:**
- Integrate LocationAutoSuggest for location input
- Add StateAutoSuggest for state selection
- Add LocationPicker button to open map
- Add Additional Address field
- Capture and store coordinates

---

### 3. Field Visibility Rules
**Missing:**
- Dynamic field visibility based on property type
- Studio Apartment: Auto-set bedrooms to 0, show "Studio" button
- Plot/Land: Hide bedrooms, bathrooms, balconies, carpet area, floor, furnishing, age
- Commercial: Different field requirements
- Farm House: Hide balconies

**Action Required:**
- Create `PROPERTY_TYPE_FIELDS` configuration
- Implement conditional field rendering
- Add field visibility logic

---

### 4. Amenities
**Current:** 15 amenities
**Required:** 17 amenities with proper filtering

**Missing Amenities:**
- `power_backup` (currently `power`)
- `swimming_pool` (currently `pool`)
- `playground` (currently `playarea`)
- `fire_safety` (currently `firesafety`)
- `water_supply` (currently `water`)
- `electricity` (for Plot/Land only)

**Action Required:**
- Update amenity IDs to match backend
- Add `electricity` amenity
- Implement amenity filtering by property type
- Update amenity labels and icons

---

### 5. Validation Rules
**Missing:**
- Description: Minimum 100 characters
- Description: Mobile number restriction
- Description: Email restriction
- Carpet Area: Must be ≤ Built-up Area
- Floor: Must be ≤ Total Floors (if provided)
- Price: Minimum value validation
- Deposit: Reasonable compared to rent

**Action Required:**
- Add description validation (min 100 chars)
- Add mobile/email detection in description
- Add carpet area validation
- Add floor validation
- Add price minimum validation

---

### 6. Additional Fields
**Missing:**
- Floor Number field
- Security Deposit field (for rent only)
- Additional Address field
- State field

**Action Required:**
- Add Floor Number input
- Add Security Deposit input (conditional on rent)
- Add Additional Address textarea
- Add State autosuggest field

---

### 7. Edit Restrictions (24-Hour Rule)
**Missing:**
- 24-hour edit restriction logic
- Field locking after 24 hours
- Edit mode detection

**Action Required:**
- Add property creation timestamp check
- Implement field locking logic
- Add edit mode UI indicators

---

## 🔧 Implementation Tasks

### Priority 1: Core Functionality

#### Task 1.1: Expand Property Types
```typescript
// Update property type selection to include all types
const propertyTypes = [
  // Residential
  {id: 'apartment', label: 'Apartment', icon: '🏢', category: 'residential'},
  {id: 'villa', label: 'Villa / Banglow', icon: '🏡', category: 'residential'},
  {id: 'independent-house', label: 'Independent House', icon: '🏘️', category: 'residential'},
  {id: 'rowhouse', label: 'Row House/ Farm House', icon: '🏘️', category: 'residential'},
  {id: 'penthouse', label: 'Penthouse', icon: '🌆', category: 'residential'},
  {id: 'studio-apartment', label: 'Studio Apartment', icon: '🛏️', category: 'residential'},
  // Commercial
  {id: 'commercial-office', label: 'Commercial Office', icon: '🏢', category: 'commercial'},
  {id: 'commercial-shop', label: 'Commercial Shop', icon: '🏪', category: 'commercial'},
  {id: 'warehouse-godown', label: 'Warehouse / Godown', icon: '🏪', category: 'commercial'},
  // Land
  {id: 'plot-land', label: 'Plot / Land / Industrial Property', icon: '📐', category: 'land'},
  // PG
  {id: 'pg-hostel', label: 'PG / Hostel', icon: '🛏️', category: 'pg'},
];
```

#### Task 1.2: Integrate Location Components
```typescript
// Add LocationAutoSuggest
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';

// Add StateAutoSuggest
import StateAutoSuggest from '../../components/search/StateAutoSuggest';

// Add LocationPicker
import LocationPicker from '../../components/map/LocationPicker';
```

#### Task 1.3: Add Missing Fields
- State field with StateAutoSuggest
- Additional Address field
- Floor Number field
- Security Deposit field (conditional)

---

### Priority 2: Field Visibility & Validation

#### Task 2.1: Create Property Type Configuration
```typescript
const PROPERTY_TYPE_FIELDS = {
  'apartment': {
    showBedrooms: true,
    showBathrooms: true,
    showBalconies: true,
    showFloor: true,
    showTotalFloors: true,
    showFacing: true,
    showFurnishing: true,
    showAge: true,
    showCarpetArea: true,
    areaLabel: 'Built-up Area',
  },
  'studio-apartment': {
    showBedrooms: false, // Auto-set to 0
    showBathrooms: true,
    showBalconies: true,
    // ... other fields
  },
  'plot-land': {
    showBedrooms: false,
    showBathrooms: false,
    showBalconies: false,
    showFloor: false,
    showTotalFloors: false,
    showFurnishing: false,
    showAge: false,
    showCarpetArea: false,
    areaLabel: 'Plot Area',
    showFacing: true,
  },
  // ... other types
};
```

#### Task 2.2: Implement Conditional Rendering
- Use `PROPERTY_TYPE_FIELDS` to show/hide fields
- Handle Studio Apartment special case (bedrooms = 0)
- Update area label based on property type

#### Task 2.3: Add Validation Rules
- Description: min 100 chars, no mobile/email
- Carpet Area ≤ Built-up Area
- Floor ≤ Total Floors
- Price minimum validation

---

### Priority 3: Amenities & UI Enhancements

#### Task 3.1: Update Amenities List
```typescript
const amenitiesList = [
  {id: 'parking', label: 'Parking', icon: '🚗'},
  {id: 'lift', label: 'Lift', icon: '🛗'},
  {id: 'security', label: '24x7 Security', icon: '👮'},
  {id: 'power_backup', label: 'Power Backup', icon: '⚡'}, // Updated ID
  {id: 'gym', label: 'Gym', icon: '🏋️'},
  {id: 'swimming_pool', label: 'Swimming Pool', icon: '🏊'}, // Updated ID
  {id: 'garden', label: 'Garden', icon: '🌳'},
  {id: 'clubhouse', label: 'Club House', icon: '🏛️'},
  {id: 'playground', label: "Children's Play Area", icon: '🎢'}, // Updated ID
  {id: 'cctv', label: 'CCTV', icon: '📹'},
  {id: 'intercom', label: 'Intercom', icon: '📞'},
  {id: 'fire_safety', label: 'Fire Safety', icon: '🔥'}, // Updated ID
  {id: 'water_supply', label: '24x7 Water', icon: '💧'}, // Updated ID
  {id: 'gas_pipeline', label: 'Gas Pipeline', icon: '🔥'},
  {id: 'wifi', label: 'WiFi', icon: '📶'},
  {id: 'ac', label: 'Air Conditioning', icon: '❄️'},
  {id: 'electricity', label: 'Electricity', icon: '⚡'}, // New for Plot/Land
];
```

#### Task 3.2: Implement Amenity Filtering
- Filter amenities based on property type
- Show only relevant amenities for each type

---

### Priority 4: Edit Restrictions

#### Task 4.1: Add 24-Hour Rule Logic
```typescript
const canEditField = (fieldName: string, createdAt: Date) => {
  const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCreation > 24) {
    // After 24 hours, only these fields can be edited
    const editableFields = ['title', 'price', 'priceNegotiable', 'maintenanceCharges', 'depositAmount'];
    return editableFields.includes(fieldName);
  }
  
  return true; // All fields editable within 24 hours
};
```

#### Task 4.2: Add Edit Mode UI
- Show locked field indicators
- Disable inputs for locked fields
- Show tooltip explaining 24-hour rule

---

## 📝 Field Mapping

### Current Field Names → Backend Field Names

| Current Field | Backend Field | Notes |
|--------------|---------------|-------|
| `propertyTitle` | `title` | ✅ Correct |
| `propertyType` | `status` | Maps to 'sale' or 'rent' |
| `propertyCategory` | `property_type` | Needs mapping to backend values |
| `location` | `location` | ✅ Correct |
| `bedrooms` | `bedrooms` | ✅ Correct |
| `bathrooms` | `bathrooms` | ✅ Correct |
| `balconies` | `balconies` | ✅ Correct |
| `builtUpArea` | `area` | ✅ Correct |
| `carpetArea` | `carpet_area` | ✅ Correct |
| `totalFloors` | `total_floors` | ✅ Correct |
| `facing` | `facing` | ✅ Correct |
| `propertyAge` | `age` | ✅ Correct |
| `furnishing` | `furnishing` | ✅ Correct |
| `selectedAmenities` | `amenities` | ✅ Correct (array) |
| `description` | `description` | ✅ Correct |
| `expectedPrice` | `price` | ✅ Correct |
| `priceNegotiable` | `price_negotiable` | ✅ Correct |
| `maintenance` | `maintenance_charges` | ✅ Correct |

### Missing Fields to Add

| Field | Backend Field | Type |
|-------|---------------|------|
| `state` | `state` | string |
| `additionalAddress` | `additional_address` | string |
| `floor` | `floor` | string |
| `depositAmount` | `deposit_amount` | number (rent only) |
| `latitude` | `latitude` | number |
| `longitude` | `longitude` | number |

---

## 🎯 Implementation Checklist

### Step 1: Basic Information
- [ ] Expand property types to 14+ types
- [ ] Add property type categorization
- [ ] Update property type selection UI
- [ ] Map property types to backend values

### Step 2: Property Details
- [ ] Integrate LocationAutoSuggest component
- [ ] Integrate StateAutoSuggest component
- [ ] Integrate LocationPicker component
- [ ] Add State field
- [ ] Add Additional Address field
- [ ] Add Floor Number field
- [ ] Capture latitude/longitude from map
- [ ] Implement field visibility rules
- [ ] Handle Studio Apartment (bedrooms = 0)
- [ ] Update area label based on property type

### Step 3: Amenities & Description
- [ ] Update amenities list (17 amenities)
- [ ] Fix amenity IDs to match backend
- [ ] Implement amenity filtering by property type
- [ ] Add description validation (min 100 chars)
- [ ] Add mobile number detection
- [ ] Add email detection

### Step 4: Photos
- [x] Image upload (already implemented)
- [x] Image moderation (already implemented)
- [x] Moderation status display (already implemented)

### Step 5: Pricing
- [ ] Add Security Deposit field (rent only)
- [ ] Add price minimum validation
- [ ] Add deposit validation (reasonable vs rent)

### General
- [ ] Add 24-hour edit restriction logic
- [ ] Add edit mode detection
- [ ] Add field locking UI
- [ ] Update form validation
- [ ] Test all property types
- [ ] Test field visibility rules
- [ ] Test validation rules

---

## 📚 Files to Update

1. **`src/screens/Seller/AddPropertyScreen.tsx`**
   - Expand property types
   - Add missing fields
   - Integrate location components
   - Implement field visibility
   - Add validation rules

2. **`src/screens/Agent/AddPropertyScreen.tsx`**
   - Same updates as Seller screen

3. **`src/data/propertyTypes.ts`** (if exists)
   - Update property type definitions
   - Add field visibility configuration

4. **`src/utils/validation.ts`**
   - Add description validation
   - Add mobile/email detection
   - Add area validation
   - Add floor validation

---

## 🔄 Backend API Compatibility

### Property Type Mapping
```typescript
const propertyTypeMap: {[key: string]: string} = {
  'apartment': 'Apartment',
  'villa': 'Villa / Banglow',
  'independent-house': 'Independent House',
  'rowhouse': 'Row House/ Farm House',
  'penthouse': 'Penthouse',
  'studio-apartment': 'Studio Apartment',
  'commercial-office': 'Commercial Office',
  'commercial-shop': 'Commercial Shop',
  'warehouse-godown': 'Warehouse / Godown',
  'plot-land': 'Plot / Land / Industrial Property',
  'pg-hostel': 'PG / Hostel',
};
```

### Amenity ID Mapping
```typescript
const amenityIdMap: {[key: string]: string} = {
  'power': 'power_backup',
  'pool': 'swimming_pool',
  'playarea': 'playground',
  'firesafety': 'fire_safety',
  'water': 'water_supply',
};
```

---

## ✅ Summary

**Current Implementation:** ~60% complete
**Required Updates:** ~40% remaining

**Priority Order:**
1. Expand property types (Critical)
2. Integrate location components (Critical)
3. Add missing fields (High)
4. Implement field visibility (High)
5. Update amenities (Medium)
6. Add validation rules (Medium)
7. Add edit restrictions (Low)

**Estimated Effort:** 
- Priority 1-2: 2-3 days
- Priority 3-4: 1-2 days
- Priority 5-7: 1 day

**Total:** ~4-6 days of development

---

**Last Updated:** Based on specification comparison
**Status:** Implementation plan ready

