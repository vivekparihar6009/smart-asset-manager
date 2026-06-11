# 🎥 3-Minute Demonstration Video Script
**Smart Asset Management & Resource Allocation Platform**

This script outlines the storyboard, action cues, and spoken narration for a high-impact, 3-minute demonstration video. Follow this schedule to cover all mandatory evaluation points within the time limit.

---

## 🎬 Video Overview & Timing

| Start | End | Duration | Section Name | Focus Features Demonstrated |
| :--- | :--- | :--- | :--- | :--- |
| **0:00** | **0:30** | 30s | User Auth & Discover | Login, Catalog Discovery, Search & Filters |
| **0:30** | **1:10** | 40s | Booking Workflow | Multi-item Cart, Date Availability check, Submission |
| **1:10** | **1:40** | 30s | Admin Approvals | Admin login, Approval, Rejection comments |
| **1:40** | **2:10** | 30s | QR & Dispatch | Scan QR, Quick checkout issue, Active Loan tracking |
| **2:10** | **2:45** | 35s | Returns & Maintenance | Return item as damaged, Auto-maintenance creation, Resolution |
| **2:45** | **3:00** | 15s | Dashboard & Audit | Analytics updates, Notifications feed, Audit Logs |

---

## 📝 Storyboard and Narration Cues

### Section 1: User Authentication & Catalog Discovery (0:00 - 0:30)
* **Visual Action**:
  1. Open browser to `http://localhost:3000`. Show the Login page with glassmorphism UI.
  2. Input user credentials: `user@iitr.ac.in` / `user123` and click Login.
  3. Show the sidebar and catalog grid. Type "EOS" in search bar; check filters by changing category.
* **Narration Script**:
  > *"Welcome to the Smart Asset Management and Resource Allocation Platform, built for the Cultural Council at IIT Roorkee. We start by logging in as a standard user. Inside our modern glassmorphic dashboard, we can explore the Assets Discovery Catalog, search for gear, and filter by categories like DSLR Cameras or Audio Systems in real time."*

### Section 2: Asset Booking & Validation (0:30 - 1:10)
* **Visual Action**:
  1. Select a DSLR Camera and click **Add to Cart**.
  2. Open the Booking Cart panel.
  3. Select dates (e.g. tomorrow to day after). Notice the availability indicator verifies stock.
  4. Change quantity to 10 (exceeding total stock). Show the red error validation preventing overbooking.
  5. Reduce quantity to 1, input purpose: *"Shooting Annual Drama Fest"*, and click **Submit Request**.
  6. Go to "My Bookings" to show the pending request.
* **Narration Script**:
  > *"To check out gear, a user adds items to their booking cart. The booking system checks availability dynamically. If we request more items than available on those dates, the system prevents submission. We enter our booking duration, specify the event purpose, and submit our request. It now appears in our personal bookings history as Pending."*

### Section 3: Admin Approvals Console (1:10 - 1:40)
* **Visual Action**:
  1. Logout and log back in as Admin: `admin@iitr.ac.in` / `admin123`.
  2. Navigate to **Request Approvals** from the sidebar.
  3. Point to the pending request and click **Approve**.
  4. (Optional) Point to the **Rejections** history tab showing custom rejection reasons.
* **Narration Script**:
  > *"Logging in as an Admin Coordinator, we gain access to administrative dashboards. In the 'Request Approvals' center, we review pending reservations. We see the event purpose, verify stocks, and click 'Approve'. The request moves instantly to the Approved status, notifying the borrower."*

### Section 4: QR Scanning & Asset Issuance (1:40 - 2:10)
* **Visual Action**:
  1. Click the **QR Scanner** icon in the navbar.
  2. Click **Simulate Scanner** (which processes camera input). The scanner detects the DSLR Camera profile.
  3. In the QR Drawer popup, click **Issue Asset** for the approved booking.
  4. Navigate to **Approvals** -> **Active Loans (Issued)** tab to verify the loan is active.
* **Narration Script**:
  > *"In the field, coordinates dispatch equipment using QR codes. Scanning the asset's QR code opens the control drawer immediately. The system recognizes the approved booking, allowing the admin to click 'Issue Asset'. The database registers the dispatch, decrements the available shelf quantity, and marks the loan Active."*

### Section 5: Returns, Damage, & Maintenance (2:10 - 2:45)
* **Visual Action**:
  1. Open the QR Scanner again, scan the camera.
  2. Click **Process Return**.
  3. Select Return Condition: **Damaged** and write: *"Dropped during event, lens element loose"*.
  4. Submit. Show that the loan status changes to **Returned**, and the asset updates.
  5. Go to **Health & Maintenance** tab. Point to the automatically spawned ticket.
  6. Click **Resolve Ticket**. Enter cost: `1200`, change condition after repair to `Excellent`, and click Submit.
* **Narration Script**:
  > *"When the item is returned, we scan the QR code once more. If an item is returned in 'Damaged' condition, we log the issue. This changes the loan to 'Returned', restores shelf availability, and automatically creates a ticket in the Health and Maintenance Board. Here, admins can track the issue, resolve it post-repair, record costs, and restore the asset's condition."*

### Section 6: Analytics & Audit Logs (2:45 - 3:00)
* **Visual Action**:
  1. Click **Dashboard** to show updated KPIs (Availability, Top Borrowers, trends chart).
  2. Click **Notifications** bell to show the overdue/dispatch notifications.
  3. Click **Audit Logs** to show the ledger list of actions.
* **Narration Script**:
  > *"Finally, we check the Analytics Dashboard to see the latest charts, read in-app alerts on the Notifications page, and review the append-only Audit Logs for complete operational transparency. The platform is fully secure, reproducible, and ready for deployment!"*
