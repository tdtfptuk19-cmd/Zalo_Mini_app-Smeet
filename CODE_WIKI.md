# Code Wiki

## 1. Project Overview

This repository implements **Smeet**, a meeting management application built for the **Zalo Mini App** platform.

The system is split into two main parts:

- A **frontend** in React + Vite under `src/`
- A **backend API** in Express + MongoDB under `server/`

Core product capabilities include:

- Zalo-based login and account linking
- Meeting scheduling and calendar views
- Per-meeting notes and polls
- AI-generated meeting reports via Gemini
- Notification and reminder flows
- Packaging for Zalo Mini App deployment

## 2. High-Level Architecture

```text
+---------------------------+
| Zalo Mini App / Browser   |
| React + Vite Frontend     |
+------------+--------------+
             |
             | HTTP / JSON
             v
+---------------------------+
| Express API               |
| server/server.js          |
+------------+--------------+
             |
             | Mongoose
             v
+---------------------------+
| MongoDB                   |
| Users, Meetings, Notes,   |
| Polls, Reports, Config    |
+---------------------------+

Supporting integrations:
- Zalo SDK for user identity inside the mini app
- Gemini API for report generation
- Nodemailer / Resend-compatible email flow
- Zalo OA API for group reminder delivery
```

## 3. Repository Structure

```text
/workspace
|- src/
|  |- components/        React UI building blocks
|  |- hooks/             Stateful business logic
|  |- utils/             API client and browser helpers
|  |- App.jsx            Main app shell and navigation
|  |- main.jsx           React entry point
|  `- index.css          Global styles
|- public/               Static assets
|- server/
|  |- models/
|  |  `- Schemas.js      Mongoose schema definitions
|  |- db.js              MongoDB connection + seed data
|  `- server.js          Express app and all API routes
|- scripts/
|  `- postbuild-zmp.mjs  Post-build packaging for Zalo Mini App
|- app-config.json       Zalo Mini App runtime config
|- vercel.json           Backend deployment routing
|- vite.config.js        Frontend build/dev configuration
`- package.json          Root workspace scripts
```

## 4. Runtime Architecture

### Frontend flow

1. `src/main.jsx` mounts the React application.
2. `src/App.jsx` initializes session state, performs Zalo authorization, restores cached login, and chooses which screen to render.
3. Custom hooks encapsulate the main business areas:
   - authentication and membership
   - meetings and scheduling
   - meeting room behavior
4. UI components render calendar, dashboard, meeting room, reports, and settings screens.
5. `src/utils/storage.js` acts as the single frontend gateway to backend APIs.

### Backend flow

1. `server/server.js` creates the Express app and loads middleware.
2. Requests pass through DB-connect middleware that ensures MongoDB is connected before most API calls.
3. `requireAuth` reads the `x-user-id` header and resolves the authenticated user.
4. Route handlers query and mutate MongoDB through Mongoose models defined in `server/models/Schemas.js`.
5. Auxiliary integrations handle reminders, bug-report email delivery, and Gemini report generation.

## 5. Frontend Modules

### `src/main.jsx`

Responsibility:

- Bootstraps React and renders `App`

Key behavior:

- Creates the root render target for the mini app UI

### `src/App.jsx`

Responsibility:

- Main application shell
- Tab navigation between dashboard, calendar, meeting room, and report archive
- Session bootstrap and initial data loading
- Theme, font-size, and language preferences

Key functions and state:

- `triggerNotification(message)`: shows in-app toast-like notifications
- `refreshReports()`: loads persisted meeting reports from the backend
- `switchTab(newTab)`: guards tab changes and saves meeting notes before leaving the meeting room
- Initial `useEffect(...)`: runs Zalo authorization, restores session, loads users and meetings, and handles deep linking via `meetingId`

Dependencies:

- `useAuth`
- `useMeetings`
- `useMeetingRoom`
- `Storage`
- `zmp-sdk/apis`
- presentation components in `src/components/`

### `src/hooks/useAuth.js`

Responsibility:

- Manages authentication state and user profile lifecycle
- Supports Zalo login and Zalo-to-email account linking
- Handles member management actions for admins

Key exports:

- `hasRole(user, roleToCheck)`: normalizes role checks across legacy `role` and newer `roles`
- `getRoleLabel(user, lang)`: returns a readable role label for the UI
- `useAuth(triggerNotification)`: main auth hook

Important hook actions:

- `initUsers()`: loads users after login
- `refreshUsers()`: refresh wrapper around `initUsers`
- `handleZaloLogin()`: authenticates via Zalo SDK and falls back to a mock browser user during simulation
- `handleLinkEmailAndLogin(email, roles)`: completes Zalo account linking
- `handleLogout()`: clears local session
- `handleSavePersonalPhone(newPhone)`: updates the current user's phone
- `handleAddMember(...)` / `handleDeleteMember(...)`: admin user management
- `toggleUserRole(...)`: updates a member role
- `handleAvatarChange(...)`: persists a new avatar

Dependencies:

- `Storage`
- `requestNotificationPermission`

### `src/hooks/useMeetings.js`

Responsibility:

- Owns meeting list state, calendar selection state, modal state, and meeting lifecycle actions

Important hook actions:

- `refreshMeetings()`: loads meetings from the backend and triggers local notification checks
- `openEditMeetingForm(meeting)`: opens the edit modal
- `handleDeleteMeeting(meetingId)`
- `handleCancelMeeting(meetingId)`
- `handleCompleteMeeting(meetingId)`
- `handleSaveMeeting(meetingData)`: create or update a meeting

Derived state:

- `selectedDateMeetings`: meetings visible for the selected date and current user
- `searchedMeetings`: free-text filtered meetings

Dependencies:

- `Storage`
- `checkAndSendMeetingNotifications`
- `sendMeetingCreatedNotification`
- `hasRole`

### `src/hooks/useMeetingRoom.js`

Responsibility:

- Encapsulates the live meeting workspace: notes, polls, online meeting settings, and AI reports

Important hook actions:

- `syncMeetingData(meetingId, userId)`: loads notes, polls, and online config for a meeting
- `saveNoteNow(noteContent)`: persists the current user's note
- `handleSaveOnlineConfig()`: saves meeting link and online options
- `handleVote(pollId, optionId)`: submits a poll vote
- `handleAddPoll(question, type, options)`: creates a new poll
- `handleDeletePoll(pollId)`: removes a poll
- `setupRealtimePolls(...)`: polling-based placeholder for future real-time updates
- `generateAIReport(retryCount)`: calls the backend Gemini endpoint with retry and cancellation support
- `cancelAIReport()`: aborts report generation
- `handleSaveReport(...)`: stores the generated report

Notable behavior:

- Debounced autosave writes notes 3 seconds after typing stops
- Tracks unsaved changes and warns before page unload

Dependencies:

- `Storage`
- `formatExternalUrl`

### `src/utils/storage.js`

Responsibility:

- Central frontend API adapter
- Session persistence and API base URL resolution

Key functions:

- `getApiBase()`: chooses local proxy, custom URL, env var, or deployed Vercel backend
- `safeFetch(url, options)`: standardizes headers and HTTP error handling
- `Storage.*`: grouped methods for users, auth, meetings, notes, polls, reports, dashboard, notifications, and session management

Design role:

- This is the frontend's service layer. Most hooks and components do not call `fetch` directly.

### `src/utils/calendarHelper.js`

Responsibility:

- External meeting link normalization
- Calendar export helpers

Key functions:

- `formatExternalUrl(...)`
- `openExternalUrl(...)`
- `generateGoogleCalendarUrl(...)`
- `downloadIcsFile(...)`

### `src/utils/notificationHelper.js`

Responsibility:

- Browser notifications, permission flow, notification sounds, and meeting reminder checks

Key functions:

- `isNotificationSupported()`
- `getNotificationPermission()`
- `requestNotificationPermission()`
- `sendNativeNotification(...)`
- `sendMeetingCreatedNotification(...)`
- `checkAndSendMeetingNotifications(...)`

## 6. Frontend UI Components

### Primary screens

- `src/components/Auth.jsx`: login and account-linking interface
- `src/components/Dashboard.jsx`: summary cards, meeting overview, and report reminders
- `src/components/CalendarView.jsx`: calendar month grid and day selection
- `src/components/MeetingList.jsx`: meetings for a selected date with action controls
- `src/components/MeetingRoom.jsx`: the main collaborative workspace
- `src/components/SettingsDrawer.jsx`: profile settings, theme, language, bug reporting, and member admin tools

### Supporting UI

- `src/components/MeetingFormModal.jsx`: multi-step create/edit meeting wizard
- `src/components/QuickMeetingModal.jsx`: accelerated creation flow for immediate meetings
- `src/components/NotificationSim.jsx`: in-app toast simulator
- `src/components/SplashScreen.jsx`: first-load splash experience
- `src/components/TermsModal.jsx`: terms/privacy display inside the client

## 7. Backend Modules

### `server/server.js`

Responsibility:

- Single-file Express application
- Hosts nearly all route handlers and integration logic

Main concerns implemented here:

- CORS and JSON middleware
- root and health endpoints
- terms/privacy page response
- DB-connect middleware for request-time connection assurance
- auth and user APIs
- meeting CRUD and status transitions
- note and poll APIs
- report APIs
- dashboard summary API
- notification config and manual reminder triggers
- Zalo webhook handling
- Gemini report generation

Important helper functions:

- `sendZaloOAGroupMessage(message)`: sends group notifications through Zalo OA
- `runReminderCheck()`: scans active meetings and sends 24-hour and 30-minute reminders
- `requireAuth(req, res, next)`: validates `x-user-id`
- `checkConflict(newMeeting)`: prevents overlapping offline-room meetings
- `sendEmailHelper(...)`: dispatches bug reports via email provider or simulation fallback

Architecture note:

- This file is intentionally monolithic right now. There is no separate controller, router, or service layer.

### `server/db.js`

Responsibility:

- Connects to MongoDB with Mongoose
- Reuses the connection through a cached promise
- Seeds demo data on first successful connection

Key functions:

- `seedDatabase()`: inserts sample meetings, notes, polls, reports, and notification config
- `db.connect()`: initializes MongoDB and triggers seeding when needed

### `server/models/Schemas.js`

Responsibility:

- Declares all persistence models used by the backend

Exported models:

- `User`
- `Meeting`
- `Note`
- `Poll`
- `Report`
- `NotifConfig`

## 8. Data Model

### `User`

Fields:

- `id`, `name`, `email`, `phone`
- `role` for backward compatibility
- `roles` for multi-role support
- `avatar`
- `defaultMeet`

Role in the system:

- Represents authenticated participants, admins, and delegated users

### `Meeting`

Fields:

- `id`, `title`, `startTime`, `endTime`, `duration`
- `locationType`, `locationDetail`
- `hostName`, `hostPhone`
- `note`, `preparationContent`
- `files`
- `createdBy`, `createdAt`
- `status`, `completedAt`

Role in the system:

- Primary scheduling entity used by calendar, dashboard, reminders, and meeting-room features

### `Note`

Fields:

- `id`, `meetingId`, `userId`, `content`, `updatedAt`

Role in the system:

- Stores each participant's personal meeting notes

### `Poll`

Fields:

- `id`, `meetingId`, `question`, `pollType`, `isActive`
- `options[]`
- `answers[]`

Role in the system:

- Stores structured meeting polls and voting results

### `Report`

Fields:

- `id`, `meetingId`, `title`, `summaryContent`
- `status`, `createdBy`, `createdAt`

Role in the system:

- Stores generated or manually saved meeting summaries

### `NotifConfig`

Fields:

- `zaloOaLinked`, `zaloAppId`
- `smsProvider`, `smsApiKey`
- `notifEnabled`

Role in the system:

- Stores notification channel configuration

## 9. API Surface

### Public endpoints

- `GET /`
- `GET /api/health`
- `GET /terms`
- `GET /privacy`
- `ALL /api/zalo/webhook`
- `POST /api/auth/zalo`
- `POST /api/auth/zalo-link-email`
- `POST /api/auth/send-email-otp`
- `POST /api/auth/verify-email-otp`
- `POST /api/auth/register`
- `GET /api/users/lookup`
- `POST /api/reports/bug`

### Protected endpoints

These require `x-user-id` to be present and valid:

- `GET /api/users`
- `POST /api/users`
- `DELETE /api/users/:id`
- `GET /api/meetings`
- `POST /api/meetings`
- `PATCH /api/meetings/:id/status`
- `DELETE /api/meetings/:id`
- `GET /api/meetings/:meetingId/notes`
- `POST /api/meetings/:meetingId/notes`
- `GET /api/meetings/:meetingId/polls`
- `POST /api/meetings/:meetingId/polls`
- `POST /api/meetings/:meetingId/polls/:pollId/vote`
- `POST /api/polls/:pollId/vote`
- `DELETE /api/meetings/:meetingId/polls/:pollId`
- `GET /api/reports`
- `POST /api/reports`
- `DELETE /api/reports/:id`
- `GET /api/notif-config`
- `POST /api/notif-config`
- `GET /api/dashboard`
- `POST /api/meetings/:meetingId/generate-report`
- `POST /api/notify/test`
- `POST /api/notify/run-check`

## 10. Dependency Relationships

### Frontend dependency graph

```text
App.jsx
|- useAuth.js
|  `- storage.js
|- useMeetings.js
|  |- storage.js
|  `- notificationHelper.js
|- useMeetingRoom.js
|  |- storage.js
|  `- calendarHelper.js
`- components/*

components/*
|- use hook outputs from App.jsx
|- use calendarHelper.js
|- use storage.js selectively
`- use lucide-react for icons
```

### Backend dependency graph

```text
server.js
|- db.js
|- models/Schemas.js
|- @google/generative-ai
|- nodemailer
|- https/http
`- express/cors/dotenv

db.js
|- mongoose
`- models/Schemas.js
```

### External dependencies by concern

- Frontend framework: `react`, `react-dom`
- Frontend build: `vite`, `@vitejs/plugin-react`
- Frontend icons: `lucide-react`
- Zalo client integration: `zmp-sdk`
- Backend web server: `express`, `cors`
- Configuration: `dotenv`
- Persistence: `mongoose`
- Email delivery: `nodemailer`
- AI report generation: `@google/generative-ai`
- Dev tooling: `concurrently`, `nodemon`, `oxlint`

## 11. Build and Deployment

### Frontend build

Root build command:

```bash
npm run build
```

What it does:

1. Runs `vite build`
2. Executes `scripts/postbuild-zmp.mjs`
3. Rewrites the built frontend into the structure expected by Zalo Mini App packaging

### Zalo packaging

`scripts/postbuild-zmp.mjs` performs these steps:

- verifies that `dist/` exists
- copies `app-config.json` into `dist/`
- creates `dist/pages/index.html`
- rewrites the script tag in the built root HTML for Zalo-compatible loading

### Backend deployment

`vercel.json` maps:

- `/`
- `/api/*`
- `/terms`

to `server/server.js` using `@vercel/node`.

## 12. How To Run The Project

### Prerequisites

- Node.js 18+ is recommended
- npm
- MongoDB, either local or remote

### Install dependencies

From the repository root:

```bash
npm install
npm --prefix server install
```

### Recommended environment variables

Backend variables used by the code:

- `PORT`: backend port, default `5000`
- `MONGODB_URI`: MongoDB connection string
- `GEMINI_API_KEY`: enables AI-generated reports
- `ZALO_OA_ACCESS_TOKEN`: enables Zalo OA reminder delivery
- `ZALO_OA_GROUP_ID`: target group for OA reminders
- `RESEND_API_KEY`: optional bug-report email via Resend API
- `EMAIL_USER`: optional SMTP sender account
- `EMAIL_PASS`: optional SMTP password
- `EMAIL_SERVICE`: optional SMTP service name, default `gmail`
- `NODE_ENV`
- `VERCEL`

Frontend variable:

- `VITE_API_URL`: optional explicit backend base URL

### Start development mode

Run frontend and backend together:

```bash
npm run dev
```

This starts:

- Vite frontend dev server
- backend dev server via `npm --prefix server run dev`

### Start backend only

From the repo root:

```bash
npm run server
```

Or from `server/`:

```bash
npm run dev
```

### Preview production frontend locally

```bash
npm run build
npm run preview
```

### Lint the project

```bash
npm run lint
```

### Notes about local development

- In local browser development, the frontend uses a Vite proxy for `/api` to `http://localhost:5000`
- On real devices or in deployed contexts, the frontend defaults to the configured Vercel backend unless overridden
- The backend seeds demo content automatically when collections are empty

## 13. Notable Design Characteristics

### Strengths

- Clear frontend/backend split
- Hooks encapsulate the main UI business flows
- `storage.js` provides a single API-access abstraction
- Mongoose schemas keep persistence definitions centralized
- Post-build automation explicitly supports Zalo Mini App packaging

### Current architectural limitations

- `server/server.js` is large and mixes routing, business logic, and integration logic
- The backend lacks service, controller, and router separation
- The default `README.md` is still the generic Vite template and does not describe the actual application
- Some routes exist in duplicate form, such as Zalo webhook and terms/privacy handlers

## 14. Suggested Refactoring Directions

- Split `server/server.js` into `routes/`, `services/`, and `middleware/`
- Move auth, meeting, poll, report, and notification logic into separate backend modules
- Replace ad hoc role handling with a single normalized authorization layer
- Add a formal API contract document for frontend/backend coordination
- Add test coverage around meeting conflict detection, auth flows, and AI report generation fallbacks

## 15. Quick Reference

### Most important frontend files

- `src/App.jsx`
- `src/hooks/useAuth.js`
- `src/hooks/useMeetings.js`
- `src/hooks/useMeetingRoom.js`
- `src/utils/storage.js`
- `src/components/MeetingRoom.jsx`

### Most important backend files

- `server/server.js`
- `server/db.js`
- `server/models/Schemas.js`

### Best starting points for new contributors

1. Read `src/App.jsx` to understand top-level UI flow
2. Read `src/utils/storage.js` to understand client/server communication
3. Read `server/server.js` route groups to understand backend capabilities
4. Read `server/models/Schemas.js` to understand persisted entities
