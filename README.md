# Smart Asset Management and Resource Allocation Platform

This platform is a web application designed for university clubs (Cultural Council, IIT Roorkee) to coordinate shared equipment inventories, book multi-item equipment requests, prevent overbooking conflicts, log checkout dispatches and returns, track maintenance tickets, and maintain a complete audit trail.

---

## 🚀 Technology Stack

* **Frontend**: React (Vite) + Tailwind CSS v3 + Lucide Icons + Chart.js
* **Backend**: Node.js + Express.js + node-postgres (`pg` client pool)
* **Database**: PostgreSQL (ACID relational transactional safety)
* **Deployment**: Docker & Docker Compose

---

## 🛠️ Local Development Setup

### Prerequisites
* **Node.js**: Version 18 or 20+
* **PostgreSQL**: Version 14+ running locally or in a container

### 1. Database Setup
Create a PostgreSQL database named `smart_asset_manager`. Run the SQL commands in [schema.sql](file:///C:/Users/vivek%20parihar/.gemini/antigravity/scratch/smart-asset-manager/backend/database/schema.sql) to set up native ENUM types, tables, constraints, cascades, and database indexes:

```bash
# Log in to Postgres CLI and create database
createdb -U postgres smart_asset_manager

# Initialize tables and seed database with starter credentials and inventory items
cd backend
npm run db:init
```

### 2. Backend Environment Variables
Create a `.env` file inside `/backend` (see [env.example](file:///C:/Users/vivek%20parihar/.gemini/antigravity/scratch/smart-asset-manager/backend/.env.example)):

```env
PORT=5000
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_asset_manager
JWT_SECRET=iitr_cultural_council_secret_token_key_2026
NODE_ENV=development
```

### 3. Running Services Locally

#### Start Backend
```bash
cd backend
npm install
npm run dev
```
The Express server will run on `http://localhost:5000` and output database connection verifications.

#### Start Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start on `http://localhost:3000` (auto-proxied to `/api`).

---

## 🐳 Dockerized Deployment (Single Command)

You can launch the entire ecosystem (PostgreSQL, Node backend, Nginx frontend reverse-proxy) using Docker Compose:

```bash
# In the project root directory containing docker-compose.yml
docker-compose up --build
```

The services will configure automatically:
* **PostgreSQL Database** initialized inside the `sam-db` container.
* **Express API service** running in `sam-backend`.
* **Nginx React SPA** served on `http://localhost:3000`.

---

## 🔑 Default Credentials for Evaluation

The database is seeded with two roles to verify permission rules:

| Role | Email Address | Password | Navigation Access |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@iitr.ac.in` | `admin123` | Analytics, Assets CRUD, Approvals desk, Health Board, Audit logs |
| **Standard User** | `user@iitr.ac.in` | `user123` | Assets Discovery catalog, Personal bookings history, Issue reporting |

---

## 🎥 Evaluation & Demo Video Outline

To demonstrate the platform's features, follow this flow:
1. **Login as Standard User (`user@iitr.ac.in`)**:
   * Browse the assets grid catalog. Show search filtering.
   * Go to "My Bookings" and request a camera for tomorrow.
   * Notice that the visualizer verifies date availability dynamically.
   * Add the items to the cart, input purpose details, and submit.
2. **Login as Admin Coordinator (`admin@iitr.ac.in`)**:
   * Navigate to "Request Approvals". Review the submitted pending request and click "Approve".
   * Move to the "Approved (To Issue)" tab and dispatch the assets (Checkout).
   * View the "Analytics Dashboard" to see cards update, top borrowings charts shift, and active loans record.
3. **Trigger Returns and Maintenance**:
   * Go back to approvals, select "Active Loans (Issued)" tab.
   * Click "Process Return". Select condition `damaged` for one of the assets and write a damage explanation.
   * Submit and verify that the asset quantity returns to shelf available stock, the asset condition updates, and a maintenance ticket is spawned.
   * Navigate to "Health & Maintenance" and show the logged maintenance ticket.
   * Click "Resolve Ticket" as Admin, input cost (e.g. `1200`), set condition after repair to `excellent`, and submit to restore availability.
4. **Audit trails**:
   * Navigate to "Audit Logs" to show the complete history list of all coordinates logs (creates, approvals, dispatches, returns, repairs).
