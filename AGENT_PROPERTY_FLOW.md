# Agent Property Upload Flow (aligned with website)

This document describes how the app implements the same property add/update/upload flow as the website for **agents** and **sellers**.

## Backend endpoints (shared by seller and agent)

| Action | Endpoint | Auth |
|--------|----------|------|
| Add property | `backend/api/seller/properties/add.php` | `requireUserType(['seller', 'agent'])` |
| Update property | `backend/api/seller/properties/update.php` | `requireUserType(['seller', 'agent'])` |
| Delete property | `backend/api/seller/properties/delete.php` | `requireUserType(['seller', 'agent'])` |
| List properties | `backend/api/seller/properties/list.php` | `requireUserType(['seller', 'agent'])` |
| Video / property files | `backend/api/upload/property-files.php` | `requireUserType(['seller', 'agent'])` |
| Image moderation + upload | `backend/api/images/moderate-and-upload.php` | `getCurrentUser()` (any logged-in user); backend checks `property.user_id == userId` |

**Agents can:**
- Add, update, delete, list properties (same APIs as seller)
- Upload property files (e.g. video) via `upload/property-files.php`
- Upload images (moderation) for properties they own (`user_id` = agent’s id)

---

## App implementation

### Services and endpoints

- **seller.service**
  - `getProperties` → `SELLER_PROPERTIES_LIST` (`/seller/properties/list.php`)
  - `deleteProperty` → `SELLER_PROPERTIES_DELETE` (`/seller/properties/delete.php`)
  - `updateProperty` → `SELLER_PROPERTIES_UPDATE` (`/seller/properties/update.php`)

- **property.service**
  - `createProperty(data, userType)` → `SELLER_PROPERTIES_ADD` (`/seller/properties/add.php`) for both `'seller'` and `'agent'`.

- **moderation.service**
  - `moderateAndUpload` → `MODERATE_AND_UPLOAD` (`/images/moderate-and-upload.php`)

- **upload.service**
  - `uploadPropertyFiles` → `UPLOAD_PROPERTY_FILES` (`/upload/property-files.php`)

### Who uses what

| Flow | Add | Update | Delete | List | Images | Video/files |
|------|-----|--------|--------|------|--------|-------------|
| **Seller** | `propertyService.createProperty(_, 'seller')` | `sellerService.updateProperty` | `sellerService.deleteProperty` | `sellerService.getProperties` | `moderationService` | `uploadService.uploadPropertyFiles` |
| **Agent** | `propertyService.createProperty(_, 'agent')` | `sellerService.updateProperty` | `sellerService.deleteProperty` | `sellerService.getProperties` | `moderationService` | `uploadService.uploadPropertyFiles` |

Add, update, delete, list, and file upload use the **same seller endpoints** for both. The only difference is `userType` passed to `createProperty` for logging; the URL is always `/seller/properties/add.php`.

### Add property: agent vs seller

- **Backend (`add.php`):**
  - **Sellers:** property count limited by subscription (free, basic, pro, premium).
  - **Agents:** limit checks are **skipped**; they can add properties without that limit.

- **App:**
  - **Seller** `AddPropertyScreen`: runs `checkPropertyLimit()` before navigate to Add; `createProperty(data, 'seller')`.
  - **Agent** `AddPropertyScreen`: **no** `checkPropertyLimit()`; `createProperty(data, 'agent')`.

---

## Config (api.config.ts)

- `SELLER_PROPERTIES_ADD` – add (seller + agent)
- `SELLER_PROPERTIES_UPDATE` – update (seller + agent)
- `SELLER_PROPERTIES_DELETE` – delete (seller + agent)
- `SELLER_PROPERTIES_LIST` – list (seller + agent)
- `MODERATE_AND_UPLOAD` – image moderation + upload (shared)
- `UPLOAD_PROPERTY_FILES` – video / property files (seller + agent)

---

## Screens

- **Agent:** `AddPropertyScreen`, `EditPropertyScreen`, `AgentPropertiesScreen` use `sellerService` and `propertyService.createProperty(_, 'agent')` as above.
- **Builder:** Uses same seller endpoints; `AddPropertyScreen` / `EditPropertyScreen` call `createProperty(_, 'agent')` and `sellerService.updateProperty` (builders log in as agent).
- **Seller:** `AddPropertyScreen`, `SellerPropertiesScreen` use `sellerService` and `createProperty(_, 'seller')`.
