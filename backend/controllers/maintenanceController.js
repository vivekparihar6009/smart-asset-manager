const db = require('../config/db');

// 1. GET /api/maintenance (List all maintenance logs - User/Admin)
exports.getMaintenanceLogs = async (req, res, next) => {
  try {
    const query = `
      SELECT ml.*, a.name as asset_name, a.category as asset_category, u.name as reported_by_name
      FROM maintenance_logs ml
      JOIN assets a ON ml.asset_id = a.id
      LEFT JOIN users u ON ml.reported_by = u.id
      ORDER BY ml.created_at DESC;
    `;
    const result = await db.query(query);

    return res.status(200).json({
      status: 'success',
      data: {
        logs: result.rows
      }
    });

  } catch (error) {
    next(error);
  }
};

// 2. POST /api/maintenance (Report asset issue / trigger maintenance - User/Admin)
exports.createMaintenanceLog = async (req, res, next) => {
  const { asset_id, issue_description, severity } = req.body;
  const userId = req.user.id;
  const client = await db.pool.connect();

  try {
    if (!asset_id || !issue_description || issue_description.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide asset_id and issue_description.'
      });
    }

    await client.query('BEGIN'); // Start Transaction

    // Verify asset exists
    const assetRes = await client.query('SELECT name, status FROM assets WHERE id = $1 FOR UPDATE', [asset_id]);
    if (assetRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Asset with ID ${asset_id} not found.`
      });
    }

    const asset = assetRes.rows[0];

    // Toggle asset status to maintenance/damaged
    const nextStatus = severity === 'critical' ? 'damaged' : 'maintenance';
    await client.query(
      'UPDATE assets SET status = $1 WHERE id = $2',
      [nextStatus, asset_id]
    );

    // Insert maintenance log
    const logResult = await client.query(
      `INSERT INTO maintenance_logs (asset_id, reported_by, issue_description, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *;`,
      [asset_id, userId, issue_description.trim()]
    );

    // Record Action in Audit Logs
    await client.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'REPORT_MAINTENANCE', $2);`,
      [userId, `Reported maintenance issue for asset: ${asset.name} (ID: ${asset_id}). Description: ${issue_description.trim()}`]
    );

    await client.query('COMMIT'); // Commit Transaction

    return res.status(201).json({
      status: 'success',
      message: 'Maintenance ticket created successfully. Asset status set to ' + nextStatus,
      data: {
        log: logResult.rows[0]
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

// 3. PUT /api/maintenance/:id/resolve (Resolve maintenance and update status back to active - Admin only)
exports.resolveMaintenanceLog = async (req, res, next) => {
  const { id } = req.params;
  const { cost, condition_after } = req.body;
  const client = await db.pool.connect();

  try {
    const finalCost = cost !== undefined ? parseFloat(cost) : 0.00;
    if (isNaN(finalCost) || finalCost < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Maintenance cost must be a non-negative number.'
      });
    }

    await client.query('BEGIN'); // Start Transaction

    // Lock maintenance log
    const logRes = await client.query(
      'SELECT status, asset_id FROM maintenance_logs WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (logRes.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Maintenance ticket ID ${id} not found.`
      });
    }

    const mLog = logRes.rows[0];

    if (mLog.status === 'resolved') {
      return res.status(400).json({
        status: 'error',
        message: 'This maintenance ticket is already resolved.'
      });
    }

    // Update maintenance log status to resolved
    const updateLogRes = await client.query(
      `UPDATE maintenance_logs 
       SET status = 'resolved', cost = $1, resolved_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *;`,
      [finalCost, id]
    );

    // Update asset condition and toggle status back to 'active'
    const finalCondition = condition_after || 'good';
    await client.query(
      `UPDATE assets 
       SET status = 'active', condition = $1 
       WHERE id = $2;`,
      [finalCondition, mLog.asset_id]
    );

    // Record Action in Audit Logs
    await client.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, 'RESOLVE_MAINTENANCE', $2);`,
      [req.user.id, `Resolved maintenance ticket ID: ${id} for asset ID: ${mLog.asset_id}. Cost incurred: INR ${finalCost}`]
    );

    await client.query('COMMIT'); // Commit Transaction

    return res.status(200).json({
      status: 'success',
      message: 'Maintenance ticket resolved. Asset status restored to active.',
      data: {
        log: updateLogRes.rows[0]
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
