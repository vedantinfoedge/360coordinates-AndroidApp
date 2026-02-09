# Seller Dashboard – Add Property Screen Verification

## Which screen is shown when the user clicks "Add Property"?

**Answer:** The **Seller Add Property** screen is used:  
`src/screens/Seller/AddPropertyScreen.tsx`

- It is the only screen registered for the `AddProperty` route in the **Seller** flow.
- It renders the "List Your Property" modal form (5 steps: Basic Info → Property Details → Amenities → Photos → Pricing).

---

## Navigation flow

1. **Seller stack (SellerNavigator)**  
   - File: `src/navigation/SellerNavigator.tsx`  
   - Defines a single route:  
     `AddProperty` → `AddPropertyScreen` (imported from `../screens/Seller/AddPropertyScreen`).  
   - So there is **one** Add Property screen in the Seller stack.

2. **Where "Add Property" is triggered (Seller flow)**  
   - **SellerDashboardScreen** (Home tab):  
     - Header button: `navigation.navigate('AddProperty')`  
     - Quick action card "Add New Property": `navigation.navigate('AddProperty')`  
     - Empty state "No Properties Listed": `navigation.navigate('AddProperty')`  
   - **SellerPropertiesScreen** (My Properties / All Listings):  
     - Add button: `navigation.navigate('AddProperty')`  
     - Edit: `navigation.navigate('AddProperty', { propertyId, ... })`  
   - **SellerPropertyDetailsScreen**:  
     - Edit: `navigation.navigate('AddProperty', { propertyId, isLimitedEdit, ... })`  

   In all cases, `navigation` is from the same **Seller stack**, so every click goes to the same **AddProperty** screen: `src/screens/Seller/AddPropertyScreen.tsx`.

---

## Duplicate check

- **No duplicate screen:**  
  Only one component is used for Seller Add Property:  
  `src/screens/Seller/AddPropertyScreen.tsx`.

- **No duplicate route:**  
  `SellerNavigator` declares `AddProperty` only once and maps it to that screen.

- **Other "AddProperty" screens in the app (different flows, not Seller):**  
  - `src/screens/Agent/AddPropertyScreen.tsx` – used only in **AgentNavigator** (Agent flow).  
  - `src/screens/Builder/AddPropertyScreen.tsx` – used only in **BuilderNavigator** (Builder flow).  

  Seller users never use Agent or Builder navigator when they tap "Add Property" from the Seller dashboard, so there is no conflict or duplicate for the Seller flow.

---

## Summary

| Question | Result |
|----------|--------|
| Screen shown when Seller user taps "Add Property" | `src/screens/Seller/AddPropertyScreen.tsx` |
| Duplicate Add Property screen in Seller flow? | **No** – single screen, single route. |
| All Seller "Add Property" entry points go to same screen? | **Yes** – Dashboard (3 places), Properties list, Property details edit. |
