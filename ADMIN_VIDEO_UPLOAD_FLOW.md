# Admin Video Upload Flow - Complete Implementation Guide

## 📋 Overview

Implemented a complete **Admin Upload Flow** that:
1. **Detects search gaps** through analytics
2. **Allows admin video uploads** with comprehensive metadata
3. **Tracks video status** (pending → approved → published)
4. **Indexes videos** by symptoms, tags, and categories
5. **Automatically surfaces** videos to users

---

## 🏗️ System Architecture

### Backend Components

#### 1. **Video Model** (`backend/src/models/videos.js`)
- Stores video metadata with complete treatment information
- Tracks upload status and approval workflow
- Records view counts and metadata

```javascript
Video Schema:
{
  id: 'vid_001',
  title: 'CPR - Cardiopulmonary Resuscitation',
  description: 'Step-by-step guide...',
  category: 'Emergency',
  symptoms: ['chest pain', 'unconscious', 'no pulse'],
  videoUrl: 'https://...',
  duration: 180,
  thumbnailUrl: 'https://...',
  uploadedBy: 'admin_001',
  uploadedAt: Date,
  status: 'active' | 'pending' | 'archived' | 'rejected',
  viewCount: 1250,
  tags: ['first-aid', 'emergency', 'cardiac'],
  steps: [...],
  dos: [...],
  donts: [...],
  warnings: [...],
  approvedBy: 'admin_001',
  approvalNotes: '...',
}
```

#### 2. **Search Analytics Tracking**
Videos model tracks every search query:

```javascript
Analytics Record:
{
  id: 'search_timestamp_random',
  query: 'cpr',
  timestamp: Date,
  userId: 'user_123',
  videosFound: 1,
  videoIds: ['vid_001'],
  status: 'found' | 'not_found'
}
```

#### 3. **Video Controller** (`backend/src/controllers/videoController.js`)

**Public Endpoints:**
- `GET /api/videos/search?query=cpr` - Search videos
- `GET /api/videos` - Get all active videos
- `GET /api/videos/:id` - Get single video
- `POST /api/videos/search-by-symptoms` - Search by symptoms

**Admin Endpoints:**
- `POST /api/videos/upload` - Upload new video
- `PUT /api/videos/:id/metadata` - Update metadata
- `POST /api/videos/:id/approve` - Approve pending video
- `POST /api/videos/:id/reject` - Reject pending video
- `GET /api/videos/admin/pending` - Get pending videos for approval
- `GET /api/videos/admin/analytics` - Get statistics and search gaps
- `GET /api/videos/admin/search-analytics` - Get detailed search analytics

---

### Frontend Components

#### 1. **Video Service** (`frontend/src/services/videoService.js`)
Provides API wrapper methods for all video operations.

#### 2. **Admin Dashboard Screen** (`frontend/src/screens/AdminVideoUploadScreen.js`)

**Three-tab interface:**

##### Tab 1: Upload
- Form to upload new videos with metadata:
  - Basic info (title, description, category)
  - Symptoms (comma-separated)
  - Video URL and duration
  - Treatment steps, do's, don'ts, warnings
  - Tags and thumbnail
- Videos created with `status: 'pending'`

##### Tab 2: Pending Approval
- Lists all pending videos waiting for approval
- Admin can:
  - ✅ **Approve** → changes status to 'active' → published immediately
  - ❌ **Reject** → changes status to 'rejected'

##### Tab 3: Analytics
- **Statistics Dashboard:**
  - Total videos count
  - Active vs pending vs rejected
  - Total searches, successful vs failed searches
  
- **Search Gaps** (Top Priority for Video Creation):
  - Lists queries with no matching videos
  - Prioritized by search frequency (high/medium/low)
  - Example: "shoulder dislocation" searched 8 times but no video → HIGH priority
  
- **Top Searches:**
  - Shows most frequently searched terms
  - Helps identify content demand

---

## 🔄 Admin Upload Flow - Step by Step

### Step 1: Detect Search Gaps (Analytics)
```
User searches: "shoulder dislocation"
    ↓
No videos match
    ↓
Analytics recorded: {query: 'shoulder dislocation', status: 'not_found'}
    ↓
Admin sees in Analytics tab: "shoulder dislocation - 5 searches"
```

### Step 2: Admin Creates Video
Admin fills form with:
- Title: "Shoulder Dislocation - Reduction Technique"
- Symptoms: "shoulder pain, shoulder popped out, arm immobile"
- Steps, Do's, Don'ts, Warnings
- Video URL from hospital/training resource
- Tags: "orthopedics, emergency, joint-injury"

### Step 3: Upload & Approval
```
Upload video
    ↓
Video status: "pending" (waiting for approval)
    ↓
Appears in "Pending Approval" tab
    ↓
Admin reviews metadata and video preview
    ↓
Admin clicks "Approve"
    ↓
Video status: "active" (published)
    ↓
Video now searchable by users
```

### Step 4: Auto-Indexed
Video is automatically indexed by:
- ✅ Title: "Shoulder Dislocation..." → "shoulder dislocation" search works
- ✅ Symptoms: "shoulder pain" → symptoms search returns this video
- ✅ Tags: "orthopedics" → tag search works
- ✅ Description: Full-text search enabled

### Step 5: User Can Find It
```
User searches: "shoulder dislocation"
    ↓
Video found! (status: 'found')
    ↓
Video displayed to user
    ↓
View count incremented
```

---

## 📊 Analytics Features

### Search Gap Detection Algorithm

```javascript
// Groups all "not_found" searches
// Counts frequency of each unique query
// Prioritizes by search count:

Gap Priority:
- HIGH: > 5 searches
- MEDIUM: 2-5 searches  
- LOW: 1 search
```

### Example Analytics Report

```
Statistics:
- Total Videos: 45
- Active Videos: 42
- Pending Approval: 2
- Total Searches: 1,250
- Successful Searches: 1,100
- Failed Searches: 150

Search Gaps (Missing Videos):
1. 🔴 HIGH PRIORITY: "diabetic eye care" - 12 searches
2. 🟠 MEDIUM: "blood pressure management" - 4 searches
3. 🟢 LOW: "meditation technique" - 1 search

Top Searches:
1. "CPR" - 156 searches ✅ (video exists)
2. "choking" - 98 searches ✅ (video exists)
3. "diabetes management" - 76 searches ❌ (NO video)
```

---

## 🔐 Access Control

### Authentication
- All admin endpoints require Bearer token
- Checked via `auth` middleware
- `uploadedBy` and `approvedBy` track user actions

### Workflow Protection
- Only PENDING videos can be approved/rejected
- Only admins can upload/approve videos
- Users can only search and view active videos

---

## 🔍 Search Strategy

### Comprehensive Indexing
Video found if search matches ANY of:
1. **Title** (e.g., "CPR" matches "CPR - Resuscitation")
2. **Description** (full-text search)
3. **Symptoms** (e.g., "chest pain" matches symptom list)
4. **Tags** (e.g., "first-aid" matches tag)

### Search Analytics Enable Gap Detection
```javascript
searchVideos(query):
  results = search in video database
  
  // Record search for analytics
  trackSearchQuery(query, results, userId)
  
  // If no results, becomes gap
  if (results.length === 0) {
    analytics.status = 'not_found'
    // Admin sees in analytics dashboard
  }
  
  return results
```

---

## 📋 API Usage Examples

### 1. Search Videos (User)
```bash
GET /api/videos/search?query=cpr
```

Response:
```json
{
  "query": "cpr",
  "found": true,
  "count": 3,
  "videos": [
    {
      "id": "vid_001",
      "title": "CPR - Cardiopulmonary Resuscitation",
      "description": "...",
      "videoUrl": "https://...",
      "viewCount": 1250,
      ...
    }
  ]
}
```

### 2. Upload Video (Admin)
```bash
POST /api/videos/upload
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "New Emergency Treatment",
  "description": "Step-by-step guide",
  "category": "Emergency",
  "symptoms": ["symptom1", "symptom2"],
  "videoUrl": "https://video.mp4",
  "duration": 180,
  "thumbnailUrl": "https://thumb.jpg",
  "tags": ["tag1", "tag2"],
  "steps": ["Step 1", "Step 2"],
  "dos": ["Do 1", "Do 2"],
  "donts": ["Don't 1"],
  "warnings": ["Warning 1"]
}
```

Response:
```json
{
  "message": "Video uploaded successfully. Pending admin approval.",
  "video": {
    "id": "vid_new_123",
    "status": "pending",
    "uploadedAt": "2024-03-15",
    ...
  }
}
```

### 3. Approve Video (Admin)
```bash
POST /api/videos/vid_new_123/approve
Authorization: Bearer <admin_token>

{
  "approvalNotes": "Excellent quality content"
}
```

Response:
```json
{
  "message": "Video approved and published",
  "video": {
    "id": "vid_new_123",
    "status": "active",
    "approvedBy": "admin_001",
    "approvalNotes": "Excellent quality content"
  }
}
```

### 4. Get Analytics (Admin)
```bash
GET /api/videos/admin/analytics
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "statistics": {
    "totalVideos": 45,
    "activeVideos": 42,
    "pendingApproval": 2,
    "totalSearches": 1250,
    "successfulSearches": 1100,
    "failedSearches": 150,
    "topSearches": [...],
    "searchGaps": [
      {
        "query": "diabetic eye care",
        "count": 12,
        "priority": "high"
      }
    ]
  }
}
```

---

## 🎯 Workflow Summary

```
┌─────────────────────────────────────────────────────┐
│         USER SEARCHES FOR VIDEO                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├─► Video Found? ────YES──→ Video Displayed
                   │                          (View Count++)
                   │
                   └─► Video NOT Found
                       (Analytics Recorded)
                            ↓
                   Admin Reviews Analytics
                   Identifies Search Gap
                            ↓
                   Admin Uploads New Video
                   (Fills comprehensive form)
                            ↓
                   Video Status: PENDING
                            ↓
                   Admin Approves Video
                            ↓
                   Video Status: ACTIVE
                   (Indexed by symptoms/tags/title)
                            ↓
                   Next User Search
                   ✅ VIDEO FOUND!
```

---

## 🚀 Integration Steps

1. **Backend Setup:**
   - ✅ Add videoRoutes to server.js (`/api/videos`)
   - ✅ Ensure auth middleware is configured

2. **Frontend Setup:**
   - ✅ Add AdminVideoUploadScreen to navigation
   - ✅ Create auth context for token management
   - ✅ Integrate VideoService into app

3. **Admin Access:**
   - Admin must have valid authentication token
   - Pass token to AdminVideoUploadScreen via route params

4. **Monitoring:**
   - Check Analytics tab regularly
   - Create videos for HIGH priority gaps first
   - Track search success rate over time

---

## 📈 Key Benefits

✅ **Closed Loop:** Search gaps → Identifies need → Video created → Gap resolved  
✅ **Data-Driven:** Admin decisions based on actual user search patterns  
✅ **Quality Control:** Pending approval before publishing  
✅ **Comprehensive:** Metadata indexed for multiple search methods  
✅ **Scalable:** Simple to add more videos as demand detected  
✅ **Tracked:** All videos tracked by uploader, approver, and view count  

---

## 🔧 Advanced Features

### Option: Auto-Approve for Trusted Admins
```javascript
// Set admin_trusted flag to auto-approve
{
  "uploadedBy": "admin_001",
  "admin_trusted": true,
  "status": "active" // Auto-approved
}
```

### Option: Video Expiration
```javascript
{
  "expiresAt": "2025-03-15",
  // After this date, video archived automatically
}
```

### Option: Multi-Language Support
```javascript
{
  "title": "CPR - English",
  "titleKannada": "CPR - ಕನ್ನಡ",
  "titleHindi": "CPR - हिंदी",
  // Search works in all languages
}
```
