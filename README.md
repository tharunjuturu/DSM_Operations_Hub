# DSM Operations Hub

**DSM Operations Hub** is an internal web-based application built to serve as an all-in-one portal for the team's operational tracking, task lifecycle management, review coordination, and individual workflow monitoring. It effectively transitions the legacy "Golden Lion Work Tracker" desktop utility into a modern multi-user web ecosystem.

---

## 🛠 Technology Stack

### Frontend
- **Framework:** React.js via Vite
- **State Management:** Zustand (in `src/store/useStore.js`)
- **Routing:** React Router (`react-router-dom`)
- **Data Visualization:** Recharts
- **Icons:** Lucide React
- **Date Utilities:** date-fns

### Backend
- **Server:** Node.js with Express
- **Database:** Flat JSON database (`database.json`) mapping application state persistently using `fs/promises`.
- **API Setup:** CORS-enabled minimal REST API saving and retrieving the entire application state on every meaningful trigger.

---

## 🚀 Key Features

### 1. **Dashboard**
Real-time summary of team availability, live tracker of ongoing/assigned work items, completed task charting, and pending daily counts.

### 2. **Task Info & Work Distribution**
Allows for tracking end-to-end task flows. Support includes task mapping, function naming, ID generation, assigning deliverables, and dynamically updating completion/review statuses. 

### 3. **Task Review**
Dedicated component for peer-reviewers and senior members to manage files awaiting quality check (QC) and approve/reject outputs. Monitors 'total sheets' against 'completed sheets' tracking FTR (First Time Right) and OTD (On-Time Delivery).

### 4. **My Tracker (Golden Lion Built-in)**
A detailed, tabbed system built right into the app to log the day-to-day routine on an individual level. Offers a powerful interface for 1:1 parity with the standalone golden lion utility, including metrics such as:
* Personal task creation and status tracking
* Delivery date logging
* Internal personal analytics and graphing 

### 5. **Daily Status Report (DSR)**
Automates the compilation of activities across the team into an easy-to-export reporting structure. DSR tabs provide a direct view for managers of all deliverables generated across varying dates.

### 6. **Archiving System**
Allows retaining completed tasks into a separate 'Archive' environment to keep the active Task/Review queues un-cluttered, while preserving history (such as delivery dates and final FTR/OTD flags) for analytical uses.

---

## 📈 Database Schema (`database.json`)

The application state relies heavily on a centralized persistent store containing:
* `users` - Array of team members and their statuses (`WFO`, `WFH`, `LEAVE`, etc.)
* `taskGroups` - Main parent tasks mapped down to sub-items.
* `reviews` - Logs tracking QC metrics for completed work.
* `archives` - Tasks formally tagged as `Delivered` and pushed out of active cycles.
* `tracker_data` - Personal work logs and legacy migrated inputs.

*(Data syncs automatically upon changes triggered via Zustand actions interacting with `POST /db` via `useStore.syncToDB()`.)*

---

## 💻 Local Setup & Deployment

### Quick Start
To launch the application locally without manually running commands, you can simply run the `start.bat` script included in the root directory. 

### Manual Execution:

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Start the Express API Server (Data Store):**
   ```bash
   node server.js
   ```
   *(Server starts on Port 3001. A `database.json` file will automatically be created in the root if one doesn't exist).*

3. **Start the Frontend Development Server:**
   ```bash
   npm run dev
   ```
   *(Vite will serve the UI on `localhost:5173`).*

### Building for Production
To bundle the dashboard for a full server deployment:
```bash
npm run build
node server.js
```
The node server is configured to serve the `/dist` output automatically on production.
