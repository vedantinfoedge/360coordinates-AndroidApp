# Price Range by Property Type and Listing Type

This document describes how **price (budget) ranges** change based on **property type** and **listing type** (Buy / Rent).  
Source: `frontend/src/UserDashboard/components/CompactSearchBar.jsx` and `backend/api/buyer/properties/list.php`.

---

## Listing type vs budget set

| Listing type | Budget set used (when property type is residential) | Budget set used (when property type is commercial/land) |
|-------------|-----------------------------------------------------|---------------------------------------------------------|
| **Buy**     | Sale residential or Rent residential (for PG/Hostel) | Commercial sale or Commercial rent (by property type)  |
| **Rent**    | Rent residential                                   | Commercial rent                                         |
| **All**     | Same as Buy (sale residential default)              | Same as Buy                                             |

---

## Budget range definitions

### Rent residential (₹/month)

Used for: **Rent** listings — Apartment, Studio, Villa/Row/Bungalow/Farm, Penthouse, PG/Hostel.

| Range label | Min (₹) | Max (₹) |
|-------------|--------|--------|
| 0K-5K       | 0      | 5,000  |
| 5K-10K      | 5,000  | 10,000 |
| 10K-20K     | 10,000 | 20,000 |
| 20K-30K     | 20,000 | 30,000 |
| 30K-50K     | 30,000 | 50,000 |
| 50K-75K     | 50,000 | 75,000 |
| 75K-1L      | 75,000 | 1,00,000 |
| 1L-2L       | 1,00,000 | 2,00,000 |
| 2L+         | 2,00,000 | (no max) |

**Rent page only** (no “0K-5K”): 5K-10K, 10K-20K, … 2L+.

---

### Sale residential (₹)

Used for: **Buy** listings — Apartment, Studio, Villa/Row/Bungalow/Farm, Penthouse.

| Range label | Min (₹)  | Max (₹)   |
|-------------|----------|-----------|
| 0-25L       | 0        | 25,00,000 |
| 25L-50L     | 25,00,000 | 50,00,000 |
| 50L-75L     | 50,00,000 | 75,00,000 |
| 75L-1Cr     | 75,00,000 | 1,00,00,000 |
| 1Cr-2Cr     | 1,00,00,000 | 2,00,00,000 |
| 2Cr-5Cr     | 2,00,00,000 | 5,00,00,000 |
| 5Cr+        | 5,00,00,000 | (no max)   |

---

### Commercial sale (₹)

Used for: **Buy** — Plot / Land / Industrial, Commercial Office, Commercial Shop.

| Range label | Min (₹)   | Max (₹)    |
|-------------|-----------|------------|
| 0-50L       | 0         | 50,00,000  |
| 50L-1Cr     | 50,00,000 | 1,00,00,000 |
| 1Cr-2Cr     | 1,00,00,000 | 2,00,00,000 |
| 2Cr-5Cr     | 2,00,00,000 | 5,00,00,000 |
| 5Cr-10Cr    | 5,00,00,000 | 10,00,00,000 |
| 10Cr-25Cr   | 10,00,00,000 | 25,00,00,000 |
| 25Cr+       | 25,00,00,000 | (no max)    |

---

### Commercial rent (₹/month)

Used for: **Rent** — Plot/Land/Industrial, Commercial Office/Shop, Co-working, Warehouse.  
Also for **Buy** — Co-working Space, Warehouse / Godown (treated as rent-style budgets in UI).

| Range label | Min (₹) | Max (₹)   |
|-------------|--------|-----------|
| 0-10K       | 0      | 10,000    |
| 10K-25K     | 10,000 | 25,000    |
| 25K-50K     | 25,000 | 50,000    |
| 50K-1L      | 50,000 | 1,00,000  |
| 1L-2L       | 1,00,000 | 2,00,000  |
| 2L-5L       | 2,00,000 | 5,00,000  |
| 5L+         | 5,00,000 | (no max)  |

**Rent page only** (no “0-10K”): 10K-25K, 25K-50K, … 5L+.

---

## Property type → price range (summary)

### When listing type is **Buy**

| Property type                          | Price range set        |
|----------------------------------------|------------------------|
| Apartment                              | Sale residential       |
| Studio Apartment                       | Sale residential       |
| Villa / Row House / Bungalow / Farm House | Sale residential    |
| Penthouse                              | Sale residential       |
| PG / Hostel                            | **Rent residential**   |
| Plot / Land / Industrial Property      | Commercial sale        |
| Commercial Office                      | Commercial sale        |
| Commercial Shop                        | Commercial sale        |
| Co-working Space                       | Commercial rent        |
| Warehouse / Godown                     | Commercial rent        |

### When listing type is **Rent**

| Property type                          | Price range set           |
|----------------------------------------|---------------------------|
| Apartment                              | Rent residential          |
| Studio Apartment                       | Rent residential          |
| Villa / Row House / Bungalow / Farm House | Rent residential       |
| Penthouse                              | Rent residential          |
| PG / Hostel                            | Rent residential          |
| Plot / Land / Industrial Property      | Commercial rent           |
| Commercial Office                      | Commercial rent           |
| Commercial Shop                        | Commercial rent           |
| Co-working Space                       | Commercial rent           |
| Warehouse / Godown                     | Commercial rent           |

### When listing type is **All** (e.g. from Home)

Same mapping as **Buy** (sale residential for residential types, commercial sale/rent by property type as above).

---

## Page-specific behaviour

- **Rent page** uses slightly reduced options: no “0K-5K” for residential rent, no “0-10K” for commercial rent.
- **PG/Hostel page** only enables **Apartment** and **PG / Hostel**; both use **Rent residential** budget ranges.
- **Buy page**: PG/Hostel still uses **Rent residential** ranges (monthly rent even in Buy context).

---

## Backend mapping

The API (`backend/api/buyer/properties/list.php`) maps the **budget** query parameter (e.g. `25L-50L`, `5K-10K`) to `min_price` and `max_price` using the same range labels.  
Ensure any new range label added in the frontend is also added in the backend `$budgetMap` (and vice versa) so filtering works correctly.
