const db = require('../config/db');

// 1. POST /api/admin/bookings/:id/issue (Admin issues approved booking items)
exports.issueAssets = async (req, res, next) => {
  const { id } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN'); // Start Transaction

    // 1. Fetch parent booking with locking (FOR UPDATE)
    const bookingRes = await client.query(
      'SELECT status, user_id FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Booking request ID ${id} not found.`
      });
    }

    const booking = bookingRes.rows[0];

    // 2. Validate booking state: Only 'approved' requests can be checked out
    if (booking.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        message: `Booking is currently "${booking.status}". Only "approved" bookings can be checked out (issued).`
      });
    }

    // 3. Fetch items in this booking
    const itemsRes = await client.query(
      'SELECT asset_id, quantity FROM booking_items WHERE booking_id = $1',
      [id]
    );
    const items = itemsRes.rows;

    // 4. Update assets stocks and issue times
    for (const item of items) {
      // Fetch asset with locking to verify stock limits
      const assetRes = await client.query(
        'SELECT name, quantity_available FROM assets WHERE id = $1 FOR UPDATE',
        [item.asset_id]
      );
      
      const asset = assetRes.rows[0];

      if (asset.quantity_available < item.quantity) {
        throw new Error(
          `Negative Stock Lock: Cannot issue asset "${asset.name}". Shelf stock is ${asset.quantity_available}, but booking requires ${item.quantity}.`
        );
      }

      // Decrement available quantity on shelf
      await client.query(
        'UPDATE assets SET quantity_available = quantity_available - $1 WHERE id = $2',
        [item.quantity, item.asset_id]
      );

      // Record checkout timestamp in booking_items
      await client.query(
        'UPDATE booking_items SET issued_at = CURRENT_TIMESTAMP WHERE booking_id = $1 AND asset_id = $2',
        [id, item.asset_id]
      );
    }

    // 5. Update parent booking status to 'issued'
    const updateBookingRes = await client.query(
      "UPDATE bookings SET status = 'issued' WHERE id = $1 RETURNING *;",
      [id]
    );

    const updatedBooking = updateBookingRes.rows[0];

    // 6. Create User notification
    await client.query(
      `INSERT INTO notifications (user_id, message) 
       VALUES ($1, $2);`,
      [booking.user_id, `Your borrowed assets for booking ID #${id} have been issued. Please return them by the due date: ${updatedBooking.due_date}.`]
    );

    // 7. Write Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'ISSUE_ASSETS', $2);`,
      [req.user.id, `Issued assets for booking ID: ${id} to user ID: ${booking.user_id}`]
    );

    await client.query('COMMIT'); // Commit Transaction

    return res.status(200).json({
      status: 'success',
      message: 'Booking items checked out successfully (issued).',
      data: {
        booking: updatedBooking
      }
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback Transaction
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  } finally {
    client.release();
  }
};

// 2. POST /api/admin/bookings/:id/return (Admin returns issued items, logs conditions & damages)
exports.returnAssets = async (req, res, next) => {
  const { id } = req.params;
  const { items } = req.body; 
  // items array format: [{ asset_id: 1, return_condition: 'excellent', damage_report: '...' }]

  const client = await db.pool.connect();

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide return details containing at least one item.'
      });
    }

    await client.query('BEGIN'); // Start Transaction

    // 1. Fetch parent booking with lock
    const bookingRes = await client.query(
      'SELECT status, user_id FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Booking ID ${id} not found.`
      });
    }

    const booking = bookingRes.rows[0];

    // 2. Validate booking state: Only active checked-out ('issued') bookings can be returned
    if (booking.status !== 'issued') {
      return res.status(400).json({
        status: 'error',
        message: `Booking is currently "${booking.status}". Only active checked-out ("issued") bookings can be returned.`
      });
    }

    const ALLOWED_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];

    // 3. Process return conditions for each item
    for (const returnItem of items) {
      const { asset_id, return_condition, damage_report } = returnItem;

      if (!asset_id || !return_condition) {
        throw new Error('Each returned item details must specify asset_id and return_condition.');
      }

      if (!ALLOWED_CONDITIONS.includes(return_condition)) {
        throw new Error(`Invalid return condition: "${return_condition}". Must be one of: ${ALLOWED_CONDITIONS.join(', ')}`);
      }

      // Check if item was actually checked out and not already returned
      const checkItemRes = await client.query(
        'SELECT quantity, returned_at FROM booking_items WHERE booking_id = $1 AND asset_id = $2 FOR UPDATE',
        [id, asset_id]
      );

      if (checkItemRes.rows.length === 0) {
        throw new Error(`Asset ID ${asset_id} is not associated with booking request ID ${id}.`);
      }

      const itemDetails = checkItemRes.rows[0];

      if (itemDetails.returned_at) {
        // Skip or ignore if already returned to allow idempotent or multi-batch returns
        continue;
      }

      // Restore asset available stock
      await client.query(
        'UPDATE assets SET quantity_available = quantity_available + $1 WHERE id = $2',
        [itemDetails.quantity, asset_id]
      );

      // Log returned timestamps and conditions
      await client.query(
        `UPDATE booking_items 
         SET returned_at = CURRENT_TIMESTAMP, return_condition = $1 
         WHERE booking_id = $2 AND asset_id = $3`,
        [return_condition, id, asset_id]
      );

      // 4. Trigger damage reporting and maintenance workflow
      if (return_condition === 'poor' || return_condition === 'damaged') {
        const desc = damage_report && damage_report.trim() !== '' 
          ? `Damage reported on return for booking ID #${id}: ${damage_report.trim()}`
          : `Asset returned in ${return_condition} condition for booking ID #${id}. Requires maintenance calibration.`;

        // Toggle asset status to maintenance/damaged
        const assetStatus = return_condition === 'damaged' ? 'damaged' : 'maintenance';
        await client.query(
          'UPDATE assets SET status = $1, condition = $2 WHERE id = $3',
          [assetStatus, return_condition, asset_id]
        );

        // Insert Maintenance ticket
        await client.query(
          `INSERT INTO maintenance_logs (asset_id, reported_by, issue_description, status)
           VALUES ($1, $2, $3, 'pending')`,
          [asset_id, req.user.id, desc]
        );
      }
    }

    // 5. Verify if all items for this booking have been returned
    const pendingReturnsRes = await client.query(
      'SELECT COUNT(*) FROM booking_items WHERE booking_id = $1 AND returned_at IS NULL',
      [id]
    );

    const pendingCount = parseInt(pendingReturnsRes.rows[0].count, 10);

    let finalBookingStatus = booking.status;
    if (pendingCount === 0) {
      // Transition parent booking status to 'returned'
      await client.query(
        "UPDATE bookings SET status = 'returned' WHERE id = $1",
        [id]
      );
      finalBookingStatus = 'returned';
    }

    // 6. Push notification to User
    await client.query(
      `INSERT INTO notifications (user_id, message) 
       VALUES ($1, $2);`,
      [booking.user_id, `Your borrowed items for booking request ID #${id} have been marked returned (${pendingCount === 0 ? 'Full return complete' : 'Partial return logged'}).`]
    );

    // 7. Write Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'RETURN_ASSETS', $2);`,
      [req.user.id, `Logged return of assets for booking ID: ${id}. Parent status is now: ${finalBookingStatus}`]
    );

    await client.query('COMMIT'); // Commit Transaction

    return res.status(200).json({
      status: 'success',
      message: pendingCount === 0 
        ? 'All items in booking returned successfully. Request closed.' 
        : 'Returned items processed successfully. Remaining items are still checked out.',
      data: {
        booking_id: parseInt(id, 10),
        status: finalBookingStatus,
        pending_items_left: pendingCount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on conflict
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  } finally {
    client.release();
  }
};
