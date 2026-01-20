# Add Property - Field Changes by Property Type

This document describes how form fields change dynamically based on the selected property type in the Add Property form.

## Property Types Overview

The form supports the following property types, grouped by category:

### Residential Properties
- **Apartment** (standard)
- **Villa / Banglow** (independent)
- **Independent House** (independent)
- **Row House/ Farm House** (standard)
- **Penthouse** (luxury) - *uses standard residential config*
- **Studio Apartment** (studio)

### Commercial Properties
- **Commercial Office** (office)
- **Commercial Shop** (shop)
- **Warehouse / Godown** (shop)

### Land Properties
- **Plot / Land / Industrial Property** (plot)

### Accommodation Properties
- **PG / Hostel** (accommodation)

---

## Field Visibility by Property Type

### Standard Residential Properties
**Applies to:** Apartment, Row House/ Farm House, Penthouse

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ✅ Yes | ✅ Yes |
| Bathrooms | ✅ Yes | ✅ Yes |
| Balconies | ✅ Yes | - |
| Floor | ✅ Yes | - |
| Total Floors | ✅ Yes | - |
| Facing | ✅ Yes | - |
| Furnishing | ✅ Yes | - |
| Age | ✅ Yes | - |
| Carpet Area | ✅ Yes | - |

---

### Independent Residential Properties
**Applies to:** Villa / Banglow, Independent House

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ✅ Yes | ✅ Yes |
| Bathrooms | ✅ Yes | ✅ Yes |
| Balconies | ✅ Yes | - |
| Floor | ✅ Yes | - |
| Total Floors | ✅ Yes | - |
| Facing | ✅ Yes | - |
| Furnishing | ✅ Yes | - |
| Age | ✅ Yes | - |
| Carpet Area | ✅ Yes | - |

---

### Studio Apartment
**Applies to:** Studio Apartment

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ❌ No | ❌ No |
| Bathrooms | ✅ Yes | ✅ Yes |
| Balconies | ✅ Yes | - |
| Floor     | ✅ Yes | - |
| Total Flo | ✅ Yes | - |
| Facing | ✅ Yes | - |
| Furnishing | ✅ Yes | - |
| Age | ✅ Yes | - |
| Carpet Area | ✅ Yes | - |

**Note:** Studio apartments don't have separate bedrooms (combined living/sleeping space).

---

### Farm House
**Applies to:** Row House/ Farm House (when treated as farmhouse)

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ✅ Yes | ✅ Yes |
| Bathrooms | ✅ Yes | ✅ Yes |
| Balconies | ❌ No | - |
| Floor | ✅ Yes | - |
| Total Floors | ✅ Yes | - |
| Facing | ✅ Yes | - |
| Furnishing | ✅ Yes | - |
| Age | ✅ Yes | - |
| Carpet Area | ✅ Yes | - |

**Note:** Farm houses typically don't have balconies.

---

### Commercial Office
**Applies to:** Commercial Office

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ❌ No | ❌ No |
| Bathrooms | ✅ Yes | ❌ No |
| Balconies | ❌ No | - |
| Floor | ✅ Yes | - |
| Total Floors | ✅ Yes | - |
| Facing | ✅ Yes | - |
| Furnishing | ✅ Yes | - |
| Age | ✅ Yes | - |
| Carpet Area | ✅ Yes | - |

**Note:** Commercial offices don't have bedrooms. Bathrooms are optional.

---

### Commercial Shop
**Applies to:** Commercial Shop, Warehouse / Godown

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ❌ No | ❌ No |
| Bathrooms | ✅ Yes | ❌ No |
| Balconies | ❌ No | - |
| Floor | ✅ Yes | - |
| Total Floors | ✅ Yes | - |
| Facing | ✅ Yes | - |
| Furnishing | ❌ No | - |
| Age | ✅ Yes | - |
| Carpet Area | ✅ Yes | - |

**Note:** Shops usually don't have bedrooms or furnishing options. Facing is important for shops.

---

### Plot / Land
**Applies to:** Plot / Land / Industrial Property

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ❌ No | ❌ No |
| Bathrooms | ❌ No | ❌ No |
| Balconies | ❌ No | - |
| Floor | ❌ No | - |
| Total Floors | ❌ No | - |
| Facing | ✅ Yes | - |
| Furnishing | ❌ No | - |
| Age | ❌ No | - |
| Carpet Area | ❌ No | - |

**Note:** Plots only show facing direction. Plot area is used instead of carpet area.

---

### PG / Hostel
**Applies to:** PG / Hostel

| Field | Visible | Required |
|-------|---------|----------|
| Bedrooms | ✅ Yes | ✅ Yes |
| Bathrooms | ✅ Yes | ✅ Yes |
| Balconies | ❌ No | - |
| Floor | ✅ Yes | - |
| Total Floors | ✅ Yes | - |
| Facing | ✅ Yes | - |
| Furnishing | ✅ Yes | - |
| Age | ✅ Yes | - |
| Carpet Area | ✅ Yes | - |

**Note:** Bedrooms field represents number of beds/rooms in PG/Hostel context.

---

## Amenities by Property Type

### Residential Properties
**Available amenities:** Parking, Lift, 24x7 Security, Power Backup, Gym, Swimming Pool, Garden, Club House, Children's Play Area, CCTV, Intercom, Fire Safety, 24x7 Water, Gas Pipeline, WiFi, Air Conditioning

### Farm House
**Available amenities:** Parking, Security, Power Backup, Gym, Swimming Pool, Garden, Club House, Children's Play Area, CCTV, Fire Safety, 24x7 Water, Gas Pipeline, WiFi, Air Conditioning

**Note:** Lift is typically not available for farm houses.

### Commercial Office
**Available amenities:** Parking, Lift, Security, Power Backup, CCTV, Fire Safety, 24x7 Water, WiFi, Air Conditioning, Intercom

### Commercial Shop
**Available amenities:** Parking, Security, Power Backup, CCTV, Fire Safety, 24x7 Water, WiFi, Air Conditioning

### Plot / Land
**Available amenities:** Security, 24x7 Water, CCTV, Electricity

**Note:** Minimal amenities for land plots.

### PG / Hostel
**Available amenities:** Parking, Security, Power Backup, CCTV, Fire Safety, 24x7 Water, WiFi, Air Conditioning, Intercom

---

## Configuration Logic

The form uses a configuration object `PROPERTY_TYPE_FIELDS` that maps property categories and subcategories to field visibility rules:

- **Configuration Key Format:** `{category}_{subCategory}`
- **Example:** `residential_standard`, `commercial_office`, `land_plot`
- **Fallback:** If a configuration doesn't exist, defaults to `residential_standard`

### Property Type Mapping

| Property Type | Category | SubCategory | Config Key |
|--------------|----------|-------------|------------|
| Apartment | residential | standard | `residential_standard` |
| Villa / Banglow | residential | independent | `residential_independent` |
| Independent House | residential | independent | `residential_independent` |
| Row House/ Farm House | residential | standard | `residential_standard` |
| Penthouse | residential | luxury | `residential_standard` (fallback) |
| Studio Apartment | residential | studio | `residential_studio` |
| Commercial Office | commercial | office | `commercial_office` |
| Commercial Shop | commercial | shop | `commercial_shop` |
| Warehouse / Godown | commercial | shop | `commercial_shop` |
| Plot / Land | land | plot | `land_plot` |
| PG / Hostel | pg | accommodation | `pg_accommodation` |

---

## Summary Table

| Property Type | Bedrooms | Bathrooms | Balconies | Floor | Total Floors | Facing | Furnishing | Age | Carpet Area |
|--------------|----------|-----------|-----------|-------|--------------|--------|------------|-----|-------------|
| **Residential Standard** | ✅ Req | ✅ Req | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Residential Independent** | ✅ Req | ✅ Req | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Studio Apartment** | ❌ | ✅ Req | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Farm House** | ✅ Req | ✅ Req | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Commercial Office** | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Commercial Shop** | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Plot / Land** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **PG / Hostel** | ✅ Req | ✅ Req | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ = Field is visible
- ❌ = Field is hidden
- Req = Field is required when visible
