const db = require('../config/db');

// 1. GET /api/notifications (Fetch active user notifications feed + dynamically trigger due reminders & overdue alerts)
exports.getNotifications = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // A. Check for bookings approaching return due date (due within the next 2 days)
    const approachingBookings = await db.query(
      `SELECT id, due_date FROM bookings 
       WHERE user_id = $1 AND status = 'issued' 
         AND due_date >= CURRENT_DATE 
         AND due_date <= CURRENT_DATE + INTERVAL '2 days'`,
      [userId]
    );

    for (const b of approachingBookings.rows) {
      const msg = `Reminder: Your return deadline for booking request ID #${b.id} is approaching (Due: ${new Date(b.due_date).toLocaleDateString()}).`;
      
      // Ensure we don't insert duplicate alerts
      const dupCheck = await db.query(
        'SELECT id FROM notifications WHERE user_id = $1 AND message = $2',
        [userId, msg]
      );
      if (dupCheck.rows.length === 0) {
        await db.query(
          'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
          [userId, msg]
        );
      }
    }

    // B. Check for overdue bookings (due date < current date)
    const overdueBookings = await db.query(
      `SELECT id, due_date FROM bookings 
       WHERE user_id = $1 AND status = 'issued' 
         AND due_date < CURRENT_DATE`,
      [userId]
    );

    for (const b of overdueBookings.rows) {
      const msg = `Warning: Your borrowed assets for booking request ID #${b.id} are OVERDUE (Passed Due: ${new Date(b.due_date).toLocaleDateString()}). Please return them immediately.`;
      
      const dupCheck = await db.query(
        'SELECT id FROM notifications WHERE user_id = $1 AND message = $2',
        [userId, msg]
      );
      if (dupCheck.rows.length === 0) {
        await db.query(
          'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
          [userId, msg]
        );
      }
    }

    // C. Fetch final notifications list
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC;
    `;
    const result = await db.query(query, [userId]);

    return res.status(200).json({
      status: 'success',
      data: {
        notifications: result.rows
      }
    });

  } catch (error) {
    next(error);
  }
};

// 2. PUT /api/notifications/:id/read (Mark user notification as read)
exports.markAsRead = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await db.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 AND user_id = $2 
       RETURNING *;`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Notification ID ${id} not found or does not belong to you.`
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        notification: result.rows[0]
      }
    });

  } catch (error) {
    next(error);
  }
};

// 3. GET /api/audit-logs (Fetch audit logs - Admin only - Pagination supported)
exports.getAuditLogs = async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Get total items
    const countResult = await db.query('SELECT COUNT(*) FROM audit_logs');
    const totalItems = parseInt(countResult.rows[0].count, 10);

    // Fetch paginated audit logs joining user details
    const query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT $1 OFFSET $2;
    `;
    const result = await db.query(query, [limitNum, offset]);

    const totalPages = Math.ceil(totalItems / limitNum);

    return res.status(200).json({
      status: 'success',
      data: {
        logs: result.rows,
        pagination: {
          totalItems,
          totalPages,
          currentPage: pageNum,
          limit: limitNum
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
