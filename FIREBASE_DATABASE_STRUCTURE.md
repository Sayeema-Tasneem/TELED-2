# Firebase Database Structure

This project is already wired for **Firebase Firestore** on the backend via `backend/src/config/firebase.js`, so the recommended database structure is Firestore-first, with Firebase Storage used for uploaded files.

---

## Recommended Firebase Services

- **Firebase Authentication**: phone-based identity if you later replace the custom OTP/JWT flow
- **Cloud Firestore**: primary application database
- **Firebase Storage**: chat uploads, reports, prescriptions, profile assets
- **Cloud Messaging**: push notifications for reminders, bookings, and alerts

---

## Firestore Top-Level Collections

```text
users/{userId}
doctors/{doctorId}
appointments/{appointmentId}
chatSessions/{sessionId}
calls/{callId}
hospitals/{hospitalId}
equipment/{equipmentId}
equipmentBookings/{bookingId}
symptomRules/{ruleId}
notifications/{notificationId}
analyticsDaily/{yyyy-mm-dd}
```

> Recommended convention: use stable IDs like `userId`, `doctorId`, `appointmentId` rather than phone numbers as document IDs. Store phone number as a field and index it.

---

## 1) Users Collection

Path:

```text
users/{userId}
```

Suggested document:

```json
{
  "phoneNumber": "+919900000000",
  "firstName": "Asha",
  "lastName": "Devi",
  "email": "asha@example.com",
  "dateOfBirth": "1992-10-14",
  "gender": "female",
  "bloodType": "O+",
  "address": "Village Road, Bangalore Rural",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "preferredLanguage": "hi",
  "role": "patient",
  "authProvider": "phone_otp",
  "profileCompleted": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Useful subcollections:

```text
users/{userId}/medicineSchedules/{medicineId}
users/{userId}/medicineIntakeLogs/{logId}
users/{userId}/prescriptions/{prescriptionId}
users/{userId}/consultations/{consultationId}
users/{userId}/healthTimeline/{eventId}
users/{userId}/notificationPreferences/{preferenceId}
users/{userId}/savedLocations/{locationId}
```

---

## 2) Doctors Collection

Path:

```text
doctors/{doctorId}
```

Suggested document:

```json
{
  "name": "Dr. Rajesh Singh",
  "specialization": "General Physician",
  "qualification": "MBBS, MD",
  "experience": 12,
  "hospital": "City General Hospital",
  "rating": 4.8,
  "reviews": 156,
  "consultationFee": 500,
  "about": "Experienced general physician in rural healthcare.",
  "languages": ["English", "Hindi", "Punjabi"],
  "consultationTypes": ["In-Person", "Video Call", "Audio Call"],
  "isActive": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Recommended subcollection for bookable slots:

```text
doctors/{doctorId}/availability/{date}
```

Availability document example:

```json
{
  "date": "2026-03-12",
  "slots": [
    { "time": "09:00 AM", "available": true },
    { "time": "09:30 AM", "available": false }
  ],
  "updatedAt": "serverTimestamp"
}
```

---

## 3) Appointments Collection

Path:

```text
appointments/{appointmentId}
```

This matches `backend/src/models/appointments.js`.

Suggested document:

```json
{
  "userId": "user_001",
  "doctorId": "doc_001",
  "doctorName": "Dr. Rajesh Singh",
  "doctorSpecialization": "General Physician",
  "date": "2026-03-12",
  "time": "09:00 AM",
  "status": "confirmed",
  "consultationType": "Video Call",
  "consultationFee": 500,
  "symptoms": "Cold and cough",
  "notes": "",
  "prescriptionId": null,
  "cancelReason": null,
  "cancelledAt": null,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Recommended query patterns:

- by `userId + date`
- by `doctorId + date`
- by `userId + status`

---

## 4) Medicines

Best stored under the owning user:

```text
users/{userId}/medicineSchedules/{medicineId}
users/{userId}/medicineIntakeLogs/{logId}
```

### Medicine schedule document

This matches `backend/src/models/medicines.js`.

```json
{
  "name": "Paracetamol",
  "dosage": "1 tablet",
  "frequency": "Twice daily",
  "times": ["08:00", "20:00"],
  "instructions": "After food",
  "startDate": "2026-03-11",
  "endDate": "2026-03-16",
  "daysToTake": "daily",
  "specificDays": [],
  "purpose": "Fever",
  "sideEffects": "Drowsiness",
  "prescribedBy": "Dr. Priya Sharma",
  "status": "active",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Intake log document

```json
{
  "medicineId": "med_123",
  "date": "2026-03-11",
  "scheduledTime": "08:00",
  "taken": true,
  "takenAt": "serverTimestamp",
  "note": "Taken after breakfast"
}
```

This split is better than embedding all intake history inside the medicine document because logs can grow indefinitely.

---

## 5) Health Records

From `backend/src/models/healthRecords.js`, the clean Firebase structure is user-scoped:

```text
users/{userId}/prescriptions/{prescriptionId}
users/{userId}/consultations/{consultationId}
users/{userId}/healthTimeline/{eventId}
```

### Prescription document

```json
{
  "doctorId": "doc_001",
  "doctorName": "Dr. Rajesh Singh",
  "consultationId": "cons_001",
  "date": "2026-03-11",
  "diagnosis": "Upper respiratory infection",
  "medicines": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "3x daily",
      "duration": "5 days"
    }
  ],
  "advice": "Rest and hydration",
  "followUpDate": "2026-03-18",
  "notes": "Monitor fever",
  "status": "active",
  "attachments": ["gs://bucket/prescriptions/rx_001/report.pdf"],
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Consultation document

```json
{
  "doctorId": "doc_001",
  "doctorName": "Dr. Rajesh Singh",
  "appointmentId": "apt_001",
  "date": "2026-03-11",
  "time": "10:30 AM",
  "type": "video",
  "chiefComplaint": "Fever and cough",
  "symptoms": ["fever", "cough"],
  "diagnosis": "Viral fever",
  "medicines": [],
  "advice": "Rest",
  "testRecommendations": ["CBC"],
  "followUpDate": null,
  "callDuration": 18,
  "notes": "Stable vitals",
  "attachments": [],
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Timeline event document

```json
{
  "type": "consultation",
  "referenceId": "cons_001",
  "date": "2026-03-11",
  "title": "Consultation with Dr. Rajesh Singh",
  "description": "Fever and cough",
  "tags": ["consultation", "general-physician"],
  "attachments": [],
  "timestamp": "serverTimestamp"
}
```

---

## 6) Chat Sessions

From `backend/src/models/chats.js`.

Path:

```text
chatSessions/{sessionId}
chatSessions/{sessionId}/messages/{messageId}
```

### Chat session document

```json
{
  "participantIds": ["user_001", "doc_001"],
  "participantOne": {
    "userId": "user_001",
    "name": "Asha Devi",
    "role": "patient",
    "avatar": "👤"
  },
  "participantTwo": {
    "userId": "doc_001",
    "name": "Dr. Rajesh Singh",
    "role": "doctor",
    "avatar": "👨‍⚕️"
  },
  "appointmentId": "apt_001",
  "callId": null,
  "status": "active",
  "lastMessageTime": "serverTimestamp",
  "lastMessagePreview": "Please take rest for 3 days",
  "messageCount": 12,
  "typingUsers": {
    "user_001": false,
    "doc_001": false
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Message document

```json
{
  "senderId": "doc_001",
  "senderName": "Dr. Rajesh Singh",
  "senderRole": "doctor",
  "content": "Please take rest for 3 days",
  "messageType": "text",
  "mediaUrl": null,
  "mediaType": null,
  "fileName": null,
  "fileSize": null,
  "replyToMessageId": null,
  "isRead": false,
  "readAt": null,
  "reactions": {},
  "timestamp": "serverTimestamp"
}
```

---

## 7) Calls

From `backend/src/models/calls.js`.

Path:

```text
calls/{callId}
```

Suggested document:

```json
{
  "callType": "video",
  "initiatorUserId": "user_001",
  "initiatorName": "Asha Devi",
  "recipientUserId": "doc_001",
  "recipientName": "Dr. Rajesh Singh",
  "appointmentId": "apt_001",
  "status": "active",
  "agoraChannel": "call_abc123",
  "agoraToken": "temporary-token",
  "startTime": "serverTimestamp",
  "endTime": null,
  "duration": null,
  "initiatorQuality": "good",
  "recipientQuality": "good",
  "networkCondition": "good",
  "callQualityMetrics": {
    "videoBitrate": [250, 275],
    "audioBitrate": [32, 30],
    "jitter": [10, 14],
    "packetLoss": [0, 1],
    "roundTripTime": [120, 140]
  },
  "disconnectReason": null,
  "notes": ""
}
```

If call history grows, archive ended calls into:

```text
callHistory/{callId}
```

or keep a `status = ended` flag and query by status.

---

## 8) Hospitals Collection

From `backend/src/models/hospitals.js`.

Path:

```text
hospitals/{hospitalId}
```

Suggested document:

```json
{
  "name": "Apollo Hospital",
  "type": "hospital",
  "address": "123 Main St, Bangalore, KA 560001",
  "city": "Bangalore",
  "state": "Karnataka",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "phone": "+91-80-40961000",
  "email": "info@apollohospital.com",
  "website": "www.apollohospital.com",
  "rating": 4.8,
  "reviewCount": 245,
  "services": ["Emergency", "ICU", "Surgery"],
  "operatingHours": "24/7",
  "emergencyAvailable": true,
  "ambulanceAvailable": true,
  "acceptingNewPatients": true,
  "imageUrl": "https://...",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

---

## 9) Equipment Collection (Phase 13)

From `backend/src/models/equipment.js`.

Path:

```text
equipment/{equipmentId}
equipmentBookings/{bookingId}
```

### Equipment document

```json
{
  "name": "Portable Oxygen Concentrator",
  "category": "respiratory",
  "description": "Battery-backed oxygen concentrator for short-term respiratory support.",
  "providerName": "Apollo Hospital Outreach Van",
  "ownerType": "hospital",
  "address": "123 Main St, Bangalore, KA 560001",
  "city": "Bangalore",
  "state": "Karnataka",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "contactPhone": "+91-80-40961000",
  "totalUnits": 3,
  "tags": ["oxygen", "portable", "respiratory"],
  "condition": "Excellent",
  "depositAmount": 500,
  "usageInstructions": "Use only with prescribed flow rate settings.",
  "maintenanceStatus": "ready",
  "imageUrl": "https://...",
  "availabilitySummary": {
    "status": "available",
    "availableSlotsCount": 12,
    "bookedSlotsCount": 3,
    "todayAvailableSlots": 2,
    "nextAvailableSlot": {
      "date": "2026-03-12",
      "startTime": "09:00",
      "endTime": "10:00"
    }
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Equipment slot subcollection

Recommended path:

```text
equipment/{equipmentId}/slots/{slotId}
```

Slot document:

```json
{
  "date": "2026-03-12",
  "startTime": "09:00",
  "endTime": "10:00",
  "status": "available",
  "bookedBy": null,
  "bookingId": null,
  "updatedAt": "serverTimestamp"
}
```

### Equipment booking document

```json
{
  "equipmentId": "equip_oxygen_1",
  "equipmentName": "Portable Oxygen Concentrator",
  "providerName": "Apollo Hospital Outreach Van",
  "userId": "user_001",
  "userName": "Asha Devi",
  "contactPhone": "+919900000000",
  "date": "2026-03-12",
  "slotId": "slot_001",
  "startTime": "09:00",
  "endTime": "10:00",
  "purpose": "Short-term home oxygen support",
  "address": "123 Main St, Bangalore, KA 560001",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "status": "confirmed",
  "createdAt": "serverTimestamp"
}
```

Recommended additional user shortcut:

```text
users/{userId}/equipmentBookings/{bookingId}
```

This supports fast booking-history queries.

---

## 10) Notifications Collection

Path:

```text
notifications/{notificationId}
```

Suggested document:

```json
{
  "userId": "user_001",
  "type": "equipment_booking",
  "title": "Equipment Booked",
  "body": "Portable Oxygen Concentrator booked for 2026-03-12 at 09:00",
  "referenceId": "booking_001",
  "isRead": false,
  "channel": "push",
  "scheduledFor": null,
  "createdAt": "serverTimestamp"
}
```

---

## 11) Symptom Checker Rules

Path:

```text
symptomRules/{ruleId}
```

Suggested document:

```json
{
  "symptoms": ["fever", "cough", "fatigue"],
  "likelyCondition": "Viral fever",
  "severity": "medium",
  "confidence": 0.76,
  "recommendedSpecialist": "General Physician",
  "selfCareTips": ["Hydrate", "Rest", "Monitor temperature"],
  "isActive": true,
  "updatedAt": "serverTimestamp"
}
```

---

## Firebase Storage Structure

Recommended storage buckets/folders:

```text
profile-images/{userId}/{fileName}
chat-uploads/{sessionId}/{messageId}/{fileName}
prescriptions/{userId}/{prescriptionId}/{fileName}
health-records/{userId}/{recordType}/{fileName}
reports/{userId}/{consultationId}/{fileName}
```

Examples:

- `chat-uploads/chat_001/msg_045/report.pdf`
- `prescriptions/user_001/rx_002/prescription.jpg`
- `health-records/user_001/lab/cbc-report.pdf`

---

## Suggested Composite Indexes

For Firestore performance, create indexes for common queries:

1. `appointments`: `userId ASC, date DESC`
2. `appointments`: `doctorId ASC, date ASC`
3. `chatSessions`: `participantIds ARRAY_CONTAINS, lastMessageTime DESC`
4. `calls`: `appointmentId ASC, startTime DESC`
5. `equipmentBookings`: `userId ASC, createdAt DESC`
6. `equipment`: `category ASC, city ASC`
7. `hospitals`: `type ASC, city ASC, rating DESC`
8. `notifications`: `userId ASC, isRead ASC, createdAt DESC`

---

## Security Rules Direction

High-level Firestore rules should enforce:

- users can read/update only their own user document
- patients can read only their own appointments, prescriptions, consultations, medicine logs, notifications, and equipment bookings
- doctors can read records linked to their consultations/appointments
- admins can manage doctors, hospitals, equipment inventories, and rules
- chat messages only readable by participants
- storage files only readable by owning user and authorized doctor/admin

---

## Migration Notes From Current Code

The codebase currently mixes:

- **Firestore-backed auth/profile** via `users`
- **in-memory backend models** for appointments, medicines, chats, calls, hospitals, health records, and equipment

Recommended migration order:

1. `users`
2. `doctors`
3. `appointments`
4. `users/{userId}/medicineSchedules` + intake logs
5. `users/{userId}/prescriptions` and `consultations`
6. `chatSessions/{sessionId}/messages`
7. `calls`
8. `hospitals`
9. `equipment` + `equipmentBookings`

---

## Recommended Final Shape

If you want the cleanest long-term structure for this app, use:

- **global collections** for shared resources: `doctors`, `appointments`, `chatSessions`, `calls`, `hospitals`, `equipment`, `equipmentBookings`
- **user subcollections** for personal medical history: `medicineSchedules`, `medicineIntakeLogs`, `prescriptions`, `consultations`, `healthTimeline`, `notifications`
- **Firebase Storage** for all binary files

That gives you good security boundaries, efficient queries, and a straightforward migration path from the current models.
