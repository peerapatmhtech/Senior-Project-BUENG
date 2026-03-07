# Project Development Specifications (Derived from Chapter 3)

This document outlines the architectural, design, and technical rules for the **Find Friend** project, ensuring full alignment with the official project documentation.

## 1. Core Technology Stack
- **Frontend:** React + Vite
- **Styling:** Tailwind CSS (Utility-first, Responsive Design, Dark/Light Mode support)
- **Backend:** Node.js + Express (RESTful API)
- **Real-time:** Socket.IO (Bidirectional communication for Chat/Notifications/Status)
- **Databases (Hybrid Approach):**
  - **MongoDB:** Primary storage for persistent data (User profiles, Events, Friend relationships, Genre interests).
  - **Firestore (Firebase):** Dedicated to **Real-time Chat** and **Offline synchronization** due to its low-latency update capabilities.
  - **Firebase Auth:** Authentication management.
- **AI & Automation:** 
  - **Make.com:** Workflow orchestration via Webhooks and HTTP Modules.
  - **Gemini AI API:** Core engine for data analysis, user matching, and activity recommendations.
- **Deployment:** Vercel (Frontend), Render (Backend).

## 2. UI/UX Design Standards
### Typography
- **Headings:** `Poppins` (Bold, Modern)
- **Body Text:** `Inter` (Optimized for readability)

### Color Palette
- **Primary Colors:** Indigo (`#6366f1`) and Violet (`#818cf8`) - symbolizing friendship and energy.
- **Semantic Colors:**
  - Online Status: Green (`#2ECC71`)
  - Alerts/Errors: Red (`#EF4444`)
- **Backgrounds:**
  - Light Mode: `#F0F2F5`
  - Dark Mode: `#1A1A1A`

### Components & Aesthetics
- **Rounded Corners:** Consistent border radius between `12px` and `30px` for all cards and buttons.
- **Gradients:** Purple-to-Blue gradients for interactive elements and loading states.
- **Interaction Model:** **Tinder-like swiping** for activity matching (Swipe Left: Skip, Swipe Right: Interested).

## 3. Backend & API Rules
- **Layered Architecture:** Strict separation of concerns (Routes -> Controllers -> Services -> Models).
- **API Standards:** 
  - Paths must use Nouns (e.g., `/api/users/`, not `/api/getUser`).
  - Response Schema: `{ success: boolean, message: string, data: {} }`.
- **Database Logic:** Use transactions (`mongoose.startSession()`) for operations affecting multiple collections (e.g., creating an event and its associated user-event records).

## 4. AI Matching & Recommendation Logic
- **Process Flow:** 
  1. Frontend triggers **Make.com Webhook** with user interest/activity data.
  2. Make.com invokes **Gemini AI** to analyze and match based on overlapping interests.
  3. AI results are saved to MongoDB via Backend HTTP request and pushed to Frontend.
- **Matching Priority:** Users with overlapping "Hearted" activities and similar genre profiles.

## 5. Security & Authentication
- **University Restriction:** Registration is strictly restricted to **@bumail.net** email addresses.
- **Validation:** Mandatory input validation for all Request Body/Params to prevent bad data and injection.
- **State Management:** Leverage Firebase Auth SDK for real-time auth state synchronization across the app.

## 6. Real-time Communication (Socket.IO)
- **Functional Scope:**
  - Real-time online/offline status indicators.
  - Instant friend request notifications.
  - Live chat message delivery (synchronized with Firestore).
  - "It's a Match!" pop-up notifications.

## 7. Documentation & Asset Integrity (Critical Rule)
- **Image Preservation:** NEVER delete or remove images from the project documentation files (e.g., `.docx` reports). When editing documentation via scripts, always verify that the binary image data and its corresponding XML references remain intact. 
- **Formatting Consistency:** Maintain the established academic formatting (TH SarabunPSK, specific indentations) when updating reports.

---
**Note:** Adherence to these rules is mandatory to maintain consistency with the Chapter 3 project specifications.