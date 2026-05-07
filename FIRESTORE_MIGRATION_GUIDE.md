# Firestore Migration Guide

This repository now includes a migration-ready Firestore service layer under:

`backend/src/services/firestore/`

These services mirror the current in-memory backend models so controllers can be migrated incrementally instead of through one giant “hope this works” refactor.

---

## Added Services

- `appointmentsFirestoreService.js`
- `doctorsFirestoreService.js`
- `medicinesFirestoreService.js`
- `healthRecordsFirestoreService.js`
- `chatFirestoreService.js`
- `callsFirestoreService.js`
- `hospitalsFirestoreService.js`
- `equipmentFirestoreService.js`
- `firestoreHelpers.js`
- `index.js`

---

## Migration Strategy

### Phase 1: Keep controllers unchanged, swap model calls one controller at a time

Example current controller import:

- `const medicineModel = require('../models/medicines');`

Migration target:

- `const medicineService = require('../services/firestore/medicinesFirestoreService');`

Then convert sync controller methods to `async` and `await` service calls.

### Phase 2: Migrate least-coupled domains first

Recommended order:

1. hospitals
2. equipment
3. appointments
4. medicines
5. health records
6. doctors availability
7. chat
8. calls

### Phase 3: Remove in-memory models after endpoint parity is verified

---

## Example Controller Migration

### Before

```js
const medicineModel = require('../models/medicines');

const medicines = medicineModel.getUserMedicines(userId);
```

### After

```js
const medicineService = require('../services/firestore/medicinesFirestoreService');

const medicines = await medicineService.getUserMedicines(userId);
```

---

## Important Notes

### 1. Backend Admin SDK bypasses Firestore rules

The backend uses Firebase Admin SDK in `backend/src/config/firebase.js`, so `firestore.rules` mainly protect any future direct client access.

### 2. Some Firestore queries require indexes

After wiring controllers, Firestore may prompt you to create indexes for compound queries. That is normal, not a bug trying to gaslight you.

### 3. Chat unread-count queries may need schema refinement

For higher scale, add per-user unread counters on `chatSessions` to avoid scanning message subcollections repeatedly.

### 4. Geospatial lookups are app-layer filtered

`hospitalsFirestoreService` and `equipmentFirestoreService` currently fetch documents and compute radius filtering in Node.js. That is acceptable for small datasets. For larger datasets, move to geohashes.

---

## Suggested Next Migration Step

If you want a safe next step, migrate these controllers first:

- `hospitalsController.js`
- `equipmentController.js`
- `medicineController.js`

They are straightforward and provide the best value with the least drama.