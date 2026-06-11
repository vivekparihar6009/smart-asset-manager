const bcrypt = require('bcryptjs');
const db = require('../config/db');

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding process...');

    // 1. Hash passwords
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
    const userPasswordHash = await bcrypt.hash('user123', saltRounds);

    console.log('Clearing existing data before seeding...');
    await db.query('TRUNCATE users, assets, bookings, booking_items, maintenance_logs, notifications, audit_logs RESTART IDENTITY CASCADE;');

    // 2. Insert Users
    console.log('Inserting seed users...');
    const userInsertQuery = `
      INSERT INTO users (name, email, password_hash, role) VALUES 
      ('Admin Coordinator', 'admin@iitr.ac.in', $1, 'admin'),
      ('Standard User', 'user@iitr.ac.in', $2, 'user'),
      ('Siddharth Sharma', 'siddharth@iitr.ac.in', $2, 'user'),
      ('Ananya Iyer', 'ananya@iitr.ac.in', $2, 'user'),
      ('Varun Verma', 'varun@iitr.ac.in', $2, 'user')
      RETURNING id, name, role;
    `;
    const usersResult = await db.query(userInsertQuery, [adminPasswordHash, userPasswordHash]);
    const users = usersResult.rows;
    console.log(`Seeded ${users.length} users successfully.`);

    const adminUser = users.find(u => u.role === 'admin');
    const sidUser = users.find(u => u.name === 'Siddharth Sharma');
    const ananyaUser = users.find(u => u.name === 'Ananya Iyer');

    // 3. Insert Assets
    console.log('Inserting seed assets across all categories...');
    const assetsData = [
      {
        name: 'Canon EOS R5 DSLR',
        category: 'DSLR Cameras',
        description: 'Professional mirrorless DSLR camera with 45MP resolution, ideal for event photography.',
        quantity_total: 3,
        quantity_available: 2, // 1 is currently checked out
        status: 'active',
        condition: 'excellent'
      },
      {
        name: 'Sony Alpha 7R V',
        category: 'DSLR Cameras',
        description: 'Full-frame mirrorless camera, optimized for high-detail captures.',
        quantity_total: 2,
        quantity_available: 2,
        status: 'active',
        condition: 'excellent'
      },
      {
        name: 'Aputure LS 600d Pro',
        category: 'Studio Lighting Equipment',
        description: 'High-intensity daylight LED fixture, ideal for studio shoots and stage plays.',
        quantity_total: 4,
        quantity_available: 4,
        status: 'active',
        condition: 'good'
      },
      {
        name: 'Godox SL-200W II',
        category: 'Studio Lighting Equipment',
        description: '200W continuous LED light source with softboxes.',
        quantity_total: 6,
        quantity_available: 5, // 1 in maintenance
        status: 'maintenance',
        condition: 'fair'
      },
      {
        name: 'JBL EON715 PA System',
        category: 'Audio Systems',
        description: '1300W 15-inch Powered PA Speaker with Bluetooth connectivity.',
        quantity_total: 4,
        quantity_available: 4,
        status: 'active',
        condition: 'good'
      },
      {
        name: 'Sennheiser G4 Wireless Lapel',
        category: 'Audio Systems',
        description: 'Wireless lavalier microphone system for crystal-clear voice pick up.',
        quantity_total: 8,
        quantity_available: 8,
        status: 'active',
        condition: 'excellent'
      },
      {
        name: 'Traditional Kathakali Costume Set',
        category: 'Costumes',
        description: 'Complete dance costume set, including heavy ornaments and headgear.',
        quantity_total: 5,
        quantity_available: 5,
        status: 'active',
        condition: 'good'
      },
      {
        name: 'Royal Durbar Backdrops & Props',
        category: 'Stage Props',
        description: 'Hand-painted wooden columns and thrones for historical theatrical plays.',
        quantity_total: 2,
        quantity_available: 2,
        status: 'active',
        condition: 'good'
      },
      {
        name: 'Zoom H8 Handy Recorder',
        category: 'Recording Equipment',
        description: '12-track portable handy recorder with interchangeable capsules.',
        quantity_total: 3,
        quantity_available: 3,
        status: 'active',
        condition: 'excellent'
      },
      {
        name: 'Heavy-Duty Crowd Control Barriers',
        category: 'Event Infrastructure',
        description: 'Metal barriers for dividing audience sections at large open-air concerts.',
        quantity_total: 50,
        quantity_available: 50,
        status: 'active',
        condition: 'good'
      }
    ];

    const assets = [];
    for (const item of assetsData) {
      // Mock QR codes as base64 strings containing the payload info
      const qrPayload = JSON.stringify({ name: item.name, category: item.category });
      const qrBase64 = `data:image/png;base64,${Buffer.from(qrPayload).toString('base64')}`;

      const res = await db.query(
        `INSERT INTO assets (name, category, description, quantity_total, quantity_available, status, condition, qr_code_base64)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name;`,
        [item.name, item.category, item.description, item.quantity_total, item.quantity_available, item.status, item.condition, qrBase64]
      );
      assets.push(res.rows[0]);
    }
    console.log(`Seeded ${assets.length} assets successfully.`);

    const r5Camera = assets.find(a => a.name === 'Canon EOS R5 DSLR');
    const lapelMic = assets.find(a => a.name === 'Sennheiser G4 Wireless Lapel');
    const light600d = assets.find(a => a.name === 'Aputure LS 600d Pro');
    const godoxLight = assets.find(a => a.name === 'Godox SL-200W II');

    // 4. Insert Bookings (Historical, Active, Pending)
    console.log('Inserting seed bookings and items...');
    
    // Booking 1: Historical Returned
    const booking1Result = await db.query(
      `INSERT INTO bookings (user_id, start_date, end_date, due_date, purpose, status, remarks) 
       VALUES ($1, '2026-05-01', '2026-05-03', '2026-05-03', 'Annual Cultural Fest - Thomso Photography', 'returned', 'All gear returned in pristine shape.') 
       RETURNING id;`,
      [sidUser.id]
    );
    const b1Id = booking1Result.rows[0].id;
    await db.query(
      `INSERT INTO booking_items (booking_id, asset_id, quantity, issued_at, returned_at, return_condition)
       VALUES ($1, $2, 1, '2026-05-01 09:00:00+05:30', '2026-05-03 17:00:00+05:30', 'excellent');`,
      [b1Id, r5Camera.id]
    );

    // Booking 2: Active Issued (Currently Borrowed)
    const booking2Result = await db.query(
      `INSERT INTO bookings (user_id, start_date, end_date, due_date, purpose, status) 
       VALUES ($1, '2026-06-07', '2026-06-10', '2026-06-10', 'Promo video shoot for Drama section', 'issued') 
       RETURNING id;`,
      [ananyaUser.id]
    );
    const b2Id = booking2Result.rows[0].id;
    await db.query(
      `INSERT INTO booking_items (booking_id, asset_id, quantity, issued_at)
       VALUES ($1, $2, 1, '2026-06-07 10:00:00+05:30');`,
      [b2Id, r5Camera.id]
    );

    // Booking 3: Pending Request (Awaiting admin approval)
    const booking3Result = await db.query(
      `INSERT INTO bookings (user_id, start_date, end_date, due_date, purpose, status) 
       VALUES ($1, '2026-06-15', '2026-06-17', '2026-06-17', 'Choreography section practice recording', 'pending') 
       RETURNING id;`,
      [sidUser.id]
    );
    const b3Id = booking3Result.rows[0].id;
    await db.query(
      `INSERT INTO booking_items (booking_id, asset_id, quantity)
       VALUES ($1, $2, 2), ($1, $3, 1);`,
      [b3Id, lapelMic.id, light600d.id]
    );

    console.log('Seeded bookings and items successfully.');

    // 5. Insert Notifications
    console.log('Inserting seed notifications...');
    await db.query(
      `INSERT INTO notifications (user_id, message, is_read) VALUES 
       ($1, 'Welcome to the Smart Asset Management Platform. Set up your bookings today!', true),
       ($1, 'Your booking request for Canon EOS R5 DSLR has been approved.', false),
       ($2, 'Reminder: Your active booking for Thomso photography was marked returned.', true);`,
      [sidUser.id, ananyaUser.id]
    );

    // 6. Insert Maintenance logs
    console.log('Inserting seed maintenance logs...');
    // Resolved log
    await db.query(
      `INSERT INTO maintenance_logs (asset_id, reported_by, issue_description, status, cost, resolved_at)
       VALUES ($1, $2, 'Lens mount calibration issues fixed.', 'resolved', 1500.00, '2026-05-10 14:00:00+05:30');`,
      [r5Camera.id, adminUser.id]
    );
    // Ongoing log
    await db.query(
      `INSERT INTO maintenance_logs (asset_id, reported_by, issue_description, status, cost)
       VALUES ($1, $2, 'Flickering bulb reported during drama section rehearsal.', 'pending', 0.00);`,
      [godoxLight.id, sidUser.id]
    );

    // 7. Log Seeding Audit Log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'SEED_DATABASE', 'Mock catalog data seeded into tables during database setup.');`,
      [adminUser.id]
    );

    console.log('Database seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
