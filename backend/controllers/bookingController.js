const db = require('../config/db');

// Reusable Helper to calculate temporal availability of an asset during a date window
const checkAssetAvailability = async (client, assetId, startDate, endDate, useLock = false) => {
  // 1. Fetch total stock and status/condition details of the asset (conditional locking)
  const queryText = useLock 
    ? 'SELECT name, quantity_total, status FROM assets WHERE id = $1 FOR UPDATE'
    : 'SELECT name, quantity_total, status FROM assets WHERE id = $1';
    
  const assetRes = await client.query(queryText, [assetId]);

  if (assetRes.rows.length === 0) {
    throw new Error(`Asset ID ${assetId} does not exist.`);
  }

  const { name, quantity_total, status } = assetRes.rows[0];

  if (status !== 'active') {
    throw new Error(`Asset "${name}" is currently ${status} and cannot be booked.`);
  }

  // 2. Query overlapping approved/issued bookings during the range [startDate, endDate]
  const overlapQuery = `
    SELECT COALESCE(SUM(bi.quantity), 0) as booked_qty
    FROM booking_items bi
    JOIN bookings b ON bi.booking_id = b.id
    WHERE bi.asset_id = $1
      AND b.status IN ('approved', 'issued')
      AND NOT (b.end_date < $2 OR b.start_date > $3);
  `;
  
  const overlapRes = await client.query(overlapQuery, [assetId, startDate, endDate]);
  const bookedQty = parseInt(overlapRes.rows[0].booked_qty, 10);
  const availableQty = quantity_total - bookedQty;

  return {
    assetName: name,
    quantityTotal: quantity_total,
    quantityBooked: bookedQty,
    quantityAvailable: availableQty >= 0 ? availableQty : 0
  };
};

// 1. GET /api/assets/availability (Verify quantity of an asset over date range)
exports.getAvailability = async (req, res, next) => {
  const { asset_id, start_date, end_date } = req.query;

  try {
    if (!asset_id || !start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide asset_id, start_date, and end_date.'
      });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Start date cannot be after end date.'
      });
    }

    const availability = await checkAssetAvailability(db, asset_id, start_date, end_date);

    return res.status(200).json({
      status: 'success',
      data: {
        asset_id: parseInt(asset_id, 10),
        start_date,
        end_date,
        ...availability
      }
    });

  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// 2. POST /api/bookings (Create a new multi-item booking request - User/Admin)
exports.createBooking = async (req, res, next) => {
  const { start_date, end_date, purpose, items } = req.body;
  const userId = req.user.id;

  // Start PostgreSQL transaction client
  const client = await db.pool.connect();

  try {
    // Input validations
    if (!start_date || !end_date || !purpose || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide start_date, end_date, purpose, and at least one item.'
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start > end) {
      return res.status(400).json({
        status: 'error',
        message: 'Start date cannot be after end date.'
      });
    }

    if (start < today) {
      return res.status(400).json({
        status: 'error',
        message: 'Start date cannot be in the past.'
      });
    }

    await client.query('BEGIN'); // Begin Transaction block

    // Iterate through requested items and verify temporal stock limits
    for (const item of items) {
      const { asset_id, quantity } = item;
      
      if (!asset_id || quantity === undefined || parseInt(quantity, 10) <= 0) {
        throw new Error('Each booking item must have a valid asset_id and a quantity greater than zero.');
      }

      const requestedQty = parseInt(quantity, 10);
      const avail = await checkAssetAvailability(client, asset_id, start_date, end_date);

      if (avail.quantityAvailable < requestedQty) {
        throw new Error(
          `Conflict: Only ${avail.quantityAvailable} units of "${avail.assetName}" are available between ${start_date} and ${end_date}. Requested: ${requestedQty}.`
        );
      }
    }

    // Insert Parent Booking (starts as 'pending', due_date defaults to end_date)
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, start_date, end_date, due_date, purpose, status)
       VALUES ($1, $2, $3, $3, $4, 'pending')
       RETURNING *;`,
      [userId, start_date, end_date, purpose.trim()]
    );

    const newBooking = bookingResult.rows[0];

    // Insert Child Items
    const insertedItems = [];
    for (const item of items) {
      const { asset_id, quantity } = item;
      const itemResult = await client.query(
        `INSERT INTO booking_items (booking_id, asset_id, quantity)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [newBooking.id, asset_id, quantity]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    // Log in Audit logs
    await client.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'CREATE_BOOKING', $2);`,
      [userId, `Placed pending booking request ID: ${newBooking.id} with ${items.length} items.`]
    );

    await client.query('COMMIT'); // Commit Transaction

    return res.status(201).json({
      status: 'success',
      message: 'Booking request placed successfully and is pending administrator review.',
      data: {
        booking: {
          ...newBooking,
          items: insertedItems
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback Transaction on error
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  } finally {
    client.release(); // Release client back to pool
  }
};

// 3. GET /api/bookings/my (Fetch borrowing history for standard users)
exports.getMyBookings = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT b.*, 
        json_agg(
          json_build_object(
            'item_id', bi.id,
            'asset_id', a.id,
            'asset_name', a.name,
            'category', a.category,
            'quantity', bi.quantity,
            'issued_at', bi.issued_at,
            'returned_at', bi.returned_at,
            'return_condition', bi.return_condition
          )
        ) as items
      FROM bookings b
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      LEFT JOIN assets a ON bi.asset_id = a.id
      WHERE b.user_id = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC;
    `;

    const result = await db.query(query, [userId]);

    return res.status(200).json({
      status: 'success',
      data: {
        bookings: result.rows
      }
    });

  } catch (error) {
    next(error);
  }
};

// 4. GET /api/bookings (Admin list all and filter by status / active allocations)
exports.getBookings = async (req, res, next) => {
  const { status } = req.query;

  try {
    let queryText = `
      SELECT b.*, u.name as user_name, u.email as user_email,
        json_agg(
          json_build_object(
            'item_id', bi.id,
            'asset_id', a.id,
            'asset_name', a.name,
            'category', a.category,
            'quantity', bi.quantity,
            'issued_at', bi.issued_at,
            'returned_at', bi.returned_at,
            'return_condition', bi.return_condition
          )
        ) as items
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      LEFT JOIN assets a ON bi.asset_id = a.id
    `;
    
    const queryParams = [];

    if (status) {
      queryText += ' WHERE b.status = $1';
      queryParams.push(status);
    }

    queryText += `
      GROUP BY b.id, u.id
      ORDER BY b.created_at DESC;
    `;

    const result = await db.query(queryText, queryParams);

    return res.status(200).json({
      status: 'success',
      data: {
        bookings: result.rows
      }
    });

  } catch (error) {
    next(error);
  }
};

// 5. POST /api/bookings/:id/approve (Admin approves a pending request)
exports.approveBooking = async (req, res, next) => {
  const { id } = req.params;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN'); // Start Transaction

    // Fetch booking to verify status
    const bookingRes = await client.query(
      'SELECT status, start_date, end_date, user_id FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Booking request ID ${id} not found.`
      });
    }

    const booking = bookingRes.rows[0];

    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Booking status is currently "${booking.status}". Only "pending" requests can be approved.`
      });
    }

    // Fetch items belonging to this booking
    const itemsRes = await client.query(
      'SELECT asset_id, quantity FROM booking_items WHERE booking_id = $1',
      [id]
    );
    const items = itemsRes.rows;

    // Verify booking date availability in transaction block (prevents race conditions)
    for (const item of items) {
      const avail = await checkAssetAvailability(client, item.asset_id, booking.start_date, booking.end_date, true);
      if (avail.quantityAvailable < item.quantity) {
        throw new Error(
          `Conflict: Stock for "${avail.assetName}" is no longer sufficient during ${booking.start_date} to ${booking.end_date} (Available: ${avail.quantityAvailable}, Required: ${item.quantity}). Request must be rejected.`
        );
      }
    }

    // Update status to 'approved' and finalize due_date
    const updateRes = await client.query(
      `UPDATE bookings 
       SET status = 'approved', due_date = end_date 
       WHERE id = $1 
       RETURNING *;`,
      [id]
    );

    const updatedBooking = updateRes.rows[0];

    // Push Notification to User
    await client.query(
      `INSERT INTO notifications (user_id, message) 
       VALUES ($1, $2);`,
      [booking.user_id, `Your booking request ID #${id} for dates ${booking.start_date} to ${booking.end_date} has been APPROVED.`]
    );

    // Record Action in Audit Logs
    await client.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'APPROVE_BOOKING', $2);`,
      [req.user.id, `Approved booking request ID: ${id} for user ID: ${booking.user_id}`]
    );

    await client.query('COMMIT'); // Commit

    return res.status(200).json({
      status: 'success',
      message: 'Booking request has been approved successfully.',
      data: {
        booking: updatedBooking
      }
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback transaction on conflict
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  } finally {
    client.release();
  }
};

// 6. POST /api/bookings/:id/reject (Admin rejects a pending request)
exports.rejectBooking = async (req, res, next) => {
  const { id } = req.params;
  const { remarks } = req.body;

  try {
    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide feedback/remarks detailing the rejection reason.'
      });
    }

    const bookingRes = await db.query(
      'SELECT status, user_id FROM bookings WHERE id = $1',
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Booking request ID ${id} not found.`
      });
    }

    const booking = bookingRes.rows[0];

    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Booking status is currently "${booking.status}". Only "pending" requests can be rejected.`
      });
    }

    // Update status to 'rejected'
    const updateRes = await db.query(
      `UPDATE bookings 
       SET status = 'rejected', remarks = $1 
       WHERE id = $2 
       RETURNING *;`,
      [remarks.trim(), id]
    );

    const updatedBooking = updateRes.rows[0];

    // Push Notification to User
    await db.query(
      `INSERT INTO notifications (user_id, message) 
       VALUES ($1, $2);`,
      [booking.user_id, `Your booking request ID #${id} has been REJECTED. Reason: ${remarks.trim()}`]
    );

    // Record Action in Audit Logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'REJECT_BOOKING', $2);`,
      [req.user.id, `Rejected booking request ID: ${id}. Reason: ${remarks.trim()}`]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Booking request has been rejected.',
      data: {
        booking: updatedBooking
      }
    });

  } catch (error) {
    next(error);
  }
};
