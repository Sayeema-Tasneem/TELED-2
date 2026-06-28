# Video Upload Flow - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEMEDICINE APP                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐        ┌──────────────────────┐  │
│  │   USER INTERFACE     │        │  ADMIN INTERFACE     │  │
│  ├──────────────────────┤        ├──────────────────────┤  │
│  │  • Search Videos     │        │  • Upload Videos     │  │
│  │  • View Videos       │        │  • Approve/Reject    │  │
│  │  • Browse Treatment  │        │  • View Analytics    │  │
│  │    Guides            │        │  • Monitor Gaps      │  │
│  └──────────┬───────────┘        └──────────┬───────────┘  │
│             │                               │               │
│             └─────────────┬─────────────────┘               │
│                           │                                 │
│                    ┌──────▼───────┐                         │
│                    │ VideoService │                         │
│                    │ (Frontend)   │                         │
│                    └──────┬───────┘                         │
│                           │                                 │
│                           │ API Calls                       │
│                           ▼                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   EXPRESS API  │
                    │  (Backend)     │
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    ┌────────┐      ┌──────────────┐     ┌────────────┐
    │ Routes │      │ Controllers  │     │   Models   │
    └────────┘      └──────────────┘     └────────────┘
        │                   │                   │
        │    Video Routes   │  Video Service    │  Videos Data
        │    Search Routes  │  Gap Detection    │  Analytics
        └───────┬───────────┴────────┬──────────┘
                │                    │
                └────────────────────┘
                        │
                ┌───────▼────────┐
                │   DATABASE     │
                ├────────────────┤
                │ • Videos       │
                │ • Analytics    │
                │ • Approval Log │
                └────────────────┘
```

---

## Data Flow Diagram

### User Search Flow
```
┌──────────┐
│ USER     │
│ Searches │
└────┬─────┘
     │
     │ "shoulder dislocation"
     ▼
┌──────────────────────┐
│ GET /api/videos/     │
│ search?query=shoulder│
└────┬────────────────┘
     │
     ▼
┌──────────────────────────┐
│ videoController.search() │
├──────────────────────────┤
│ • Search database        │
│ • Found: 0 results       │
│ • Track analytics        │
└────┬────────────────────┘
     │
     ├──► Database: Save analytics
     │    {query: 'shoulder', status: 'not_found'}
     │
     ▼
┌──────────────────────┐
│ Return: Empty        │
│ Results              │
└────┬────────────────┘
     │
     ▼
┌──────────────────────┐
│ USER SCREEN          │
│ "No video found"     │
└──────────────────────┘

↓ Analytics accumulate
↓ Admin checks dashboard
↓ Sees: "shoulder dislocation - 5 searches"
↓ HIGH PRIORITY gap
```

### Admin Upload Flow
```
┌──────────┐
│ ADMIN    │
│ Opens    │
│ Dashboard│
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│ AdminVideoUploadScreen│
├──────────────────────┤
│ 3 Tabs:              │
│ • Upload             │
│ • Pending            │
│ • Analytics          │
└────┬────────────────┘
     │
     ▼
┌──────────────────────┐
│ ANALYTICS TAB        │
├──────────────────────┤
│ Search Gaps:         │
│ "shoulder dislocation"
│ - 5 searches         │
│ - HIGH priority      │
└────┬────────────────┘
     │
     │ Admin decides to create video
     ▼
┌──────────────────────┐
│ UPLOAD TAB           │
├──────────────────────┤
│ Form:                │
│ • Title              │
│ • Description        │
│ • Symptoms[]         │
│ • Video URL          │
│ • Steps, Do's, Don'ts│
└────┬────────────────┘
     │
     │ Admin fills form
     ▼
┌──────────────────────────┐
│ POST /api/videos/upload  │
├──────────────────────────┤
│ • Validate input         │
│ • Save to database       │
│ • Set status: "pending"  │
└────┬────────────────────┘
     │
     ├──► Database: Video created
     │    status: 'pending'
     │
     ▼
┌──────────────────────┐
│ Response:            │
│ "Video pending       │
│  approval"           │
└────┬────────────────┘
     │
     ▼
┌──────────────────────┐
│ PENDING TAB          │
├──────────────────────┤
│ New video appears    │
│ • Shows full details │
│ • [✅ Approve]       │
│ • [❌ Reject]        │
└────┬────────────────┘
     │
     │ Admin clicks Approve
     ▼
┌──────────────────────────┐
│ POST /api/videos/:id/    │
│ approve                  │
├──────────────────────────┤
│ • Find video by ID       │
│ • Set status: "active"   │
│ • Set approvedBy field   │
└────┬────────────────────┘
     │
     ├──► Database: Video published
     │    status: 'active'
     │
     ▼
┌──────────────────────┐
│ Response:            │
│ "Video published"    │
└────┬────────────────┘
     │
     ▼
┌──────────────────────┐
│ ✅ VIDEO LIVE        │
│ Indexed by:          │
│ • Title              │
│ • Symptoms           │
│ • Tags               │
│ • Description        │
└──────────────────────┘

↓ Next search finds it
↓ Gap resolved!
```

---

## Database Schema Visualization

```
┌──────────────────────────────────────────────┐
│              VIDEOS TABLE                    │
├──────────────────────────────────────────────┤
│ id                  (unique identifier)      │
│ title               (video name)             │
│ description         (full description)      │
│ category            (Emergency/Medical/etc)│
│ symptoms[]          (searchable symptoms)    │
│ videoUrl            (video file location)    │
│ duration            (seconds)                │
│ thumbnailUrl        (preview image)          │
│ tags[]              (searchable tags)        │
│ steps[]             (treatment steps)        │
│ dos[]               (recommended actions)    │
│ donts[]             (actions to avoid)       │
│ warnings[]          (medical warnings)       │
│ uploadedBy          (admin user ID)          │
│ uploadedAt          (timestamp)              │
│ approvedBy          (approving admin ID)     │
│ approvalNotes       (approval message)       │
│ lastModified        (timestamp)              │
│ status              (pending/active/reject)  │
│ viewCount           (number of views)        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│         SEARCH_ANALYTICS TABLE               │
├──────────────────────────────────────────────┤
│ id                  (unique ID)              │
│ query               (search term)            │
│ timestamp           (when searched)          │
│ userId              (who searched)           │
│ videosFound         (number of results)      │
│ videoIds[]          (which videos found)     │
│ status              (found/not_found)        │
└──────────────────────────────────────────────┘
```

---

## Video Approval Workflow

```
                    ┌─────────────────┐
                    │  VIDEO UPLOAD   │
                    │  (Admin Form)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  SEND TO API    │
                    │  POST /upload   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
        ┌──────────▶│  PENDING        │◀──────────┐
        │           │  STATUS         │           │
        │           └────────┬────────┘           │
        │                    │                    │
        │            ┌───────┴────────┐           │
        │            │                │           │
        │            ▼                ▼           │
        │      ┌────────┐      ┌────────┐        │
        │      │ REVIEW │      │ REVIEW │        │
        │      │ PASS   │      │ FAIL   │        │
        │      └────┬───┘      └────┬───┘        │
        │           │                │           │
        │           ▼                ▼           │
        │    ┌────────────┐  ┌──────────────┐   │
        │    │ APPROVED   │  │  REJECTED    │   │
        │    │ (Active)   │  │  (Archived)  │   │
        │    └────┬───────┘  └──────┬───────┘   │
        │         │                 │            │
        │         ▼                 ▼            │
        │    ┌─────────────┐  ┌──────────┐      │
        │    │ PUBLISHED   │  │ NOTIFY   │      │
        │    │ SEARCHABLE  │  │ ADMIN    │      │
        │    │ by Users    │  │          │      │
        │    └─────────────┘  └──────────┘      │
        │                                       │
        └───────────────────────────────────────┘
             Can revert to PENDING if needed
```

---

## Analytics Gap Detection Algorithm

```
┌─────────────────────────────────────────────┐
│        COLLECT SEARCH QUERIES               │
├─────────────────────────────────────────────┤
│                                             │
│  Search 1: "cpr"         → Found: ✓         │
│  Search 2: "choking"     → Found: ✓         │
│  Search 3: "bp high"     → Found: ✗ (GAP)  │
│  Search 4: "heart"       → Found: ✓         │
│  Search 5: "bp high"     → Found: ✗ (GAP)  │
│  Search 6: "diabetes"    → Found: ✓         │
│  Search 7: "bp high"     → Found: ✗ (GAP)  │
│  Search 8: "burn"        → Found: ✓         │
│  Search 9: "bp high"     → Found: ✗ (GAP)  │
│  Search 10: "shoulder"   → Found: ✗ (GAP)  │
│                                             │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│      GROUP BY QUERY & COUNT GAPS            │
├─────────────────────────────────────────────┤
│                                             │
│  "bp high"        → 4 not_found            │
│  "shoulder"       → 1 not_found            │
│  "knee pain"      → 0 not_found (no search)│
│                                             │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│       PRIORITIZE BY FREQUENCY               │
├─────────────────────────────────────────────┤
│                                             │
│  🔴 HIGH   (>5 gaps):  none                │
│  🟠 MEDIUM (2-5 gaps): "bp high" (4)       │
│  🟢 LOW    (1 gap):    "shoulder" (1)      │
│                                             │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│    DISPLAY IN ADMIN DASHBOARD              │
├─────────────────────────────────────────────┤
│                                             │
│  Search Gaps:                               │
│  🟠 "bp high" - 4 searches (MEDIUM)        │
│  🟢 "shoulder" - 1 search (LOW)            │
│                                             │
│  👉 Admin creates video for "bp high"      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Component Communication

```
┌─────────────────────────────────────────────────────────┐
│                FRONTEND (React Native)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  AdminVideoUploadScreen                        │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • Upload Form                                 │    │
│  │  • Pending List                                │    │
│  │  • Analytics Dashboard                         │    │
│  └────────────────┬─────────────────────────────┘    │
│                   │                                   │
│                   │ Calls                            │
│                   ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │  VideoService                                  │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • searchVideos()                              │    │
│  │  • uploadVideo()                               │    │
│  │  • approveVideo()                              │    │
│  │  • getAnalytics()                              │    │
│  └────────────────┬─────────────────────────────┘    │
│                   │                                   │
│                   │ axios.get/post/put/delete         │
│                   ▼                                   │
└────────────────────────────────────────────────────────┘
                     │
              HTTP/REST API
                     │
┌────────────────────────────────────────────────────────┐
│                BACKEND (Express.js)                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  videoRoutes.js                              │    │
│  ├──────────────────────────────────────────────┤    │
│  │  GET  /search                                │    │
│  │  POST /upload                                │    │
│  │  POST /:id/approve                           │    │
│  │  GET  /admin/analytics                       │    │
│  └──────────────┬───────────────────────────────┘    │
│                 │                                    │
│                 │ Routes to                          │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐    │
│  │  videoController.js                          │    │
│  ├──────────────────────────────────────────────┤    │
│  │  • searchVideos()                            │    │
│  │  • uploadVideo()                             │    │
│  │  • approveVideo()                            │    │
│  │  • getAnalytics()                            │    │
│  │  • etc.                                      │    │
│  └──────────────┬───────────────────────────────┘    │
│                 │                                    │
│                 │ Calls                              │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐    │
│  │  videos.js (Model)                           │    │
│  ├──────────────────────────────────────────────┤    │
│  │  • getAllVideos()                            │    │
│  │  • searchVideos()                            │    │
│  │  • getSearchGaps()                           │    │
│  │  • trackSearchQuery()                        │    │
│  │  • approveVideo()                            │    │
│  │  • etc.                                      │    │
│  └──────────────┬───────────────────────────────┘    │
│                 │                                    │
│                 │ Reads/Writes                       │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐    │
│  │  In-Memory Database (Mock)                   │    │
│  ├──────────────────────────────────────────────┤    │
│  │  • videosDatabase[]                          │    │
│  │  • searchAnalytics[]                         │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## State Management During Upload

```
INITIAL STATE:
formData = {
  title: '',
  description: '',
  category: 'Emergency',
  symptoms: '',
  videoUrl: '',
  ... (all empty)
}

↓ (User fills form)

FILLED STATE:
formData = {
  title: 'CPR Technique',
  description: 'Step-by-step CPR guide',
  category: 'Emergency',
  symptoms: 'chest pain, unconscious',
  videoUrl: 'https://...',
  ... (all filled)
}

↓ (User clicks Upload)

UPLOADING STATE:
loading = true
[disabled button showing spinner]

↓ (API response received)

SUCCESS STATE:
Alert: "Video uploaded. Pending approval."
formData = reset to empty
loading = false

OR

ERROR STATE:
Alert: "Upload failed: [error message]"
formData = kept (user can fix)
loading = false
```

---

## End-to-End Timeline Example

```
DAY 1:
  08:00 - User A searches "diabetic eye care" → NOT FOUND
  10:30 - User B searches "diabetic eye care" → NOT FOUND
  14:15 - User C searches "diabetic eye care" → NOT FOUND
  
DAY 2:
  11:45 - User D searches "diabetic eye care" → NOT FOUND
  
DAY 3:
  09:00 - Admin checks Analytics tab
         Sees: "diabetic eye care - 4 searches"
  09:15 - Admin goes to Upload tab
  09:30 - Admin uploads video with metadata
         Video created: status = "pending"
  09:31 - Video appears in "Pending" tab
  09:40 - Admin reviews video details
  09:45 - Admin clicks "Approve"
         Video status changed to "active"
  09:46 - Success: "Video approved and published"
  
DAY 4:
  08:00 - User E searches "diabetic eye care"
         ✅ VIDEO FOUND!
         View count incremented
         Analytics: status = "found"
  
DAY 5:
  10:00 - Admin checks Analytics
         Gap "diabetic eye care" is GONE
         Successfully resolved!
```

---

## Summary

- **User searches** trigger analytics
- **Failed searches** identified as gaps
- **Admin dashboard** shows gaps with priority
- **Admin uploads** video with rich metadata
- **Video indexed** by multiple fields (title, symptoms, tags)
- **Admin approves** to publish
- **Next search** finds the video
- **Gap resolved** ✅
