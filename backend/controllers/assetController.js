const QRCode = require('qrcode');
const db = require('../config/db');

// List of allowed categories for database check consistency
const ALLOWED_CATEGORIES = [
  'DSLR Cameras',
  'Studio Lighting Equipment',
  'Audio Systems',
  'Costumes',
  'Stage Props',
  'Recording Equipment',
  'Event Infrastructure'
];

// 1. GET /api/assets (Retrieve all with search, filter, and pagination)
exports.getAssets = async (req, res, next) => {
  const { search, category, status, page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let queryText = 'SELECT * FROM assets WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    // Apply Search Filter (Case insensitive)
    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Apply Category Filter
    if (category) {
      queryText += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    // Apply Status Filter
    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Get Total count for pagination metadata
    let countQueryText = queryText.replace('SELECT * FROM assets', 'SELECT COUNT(*) FROM assets');
    const countResult = await db.query(countQueryText, queryParams);
    const totalItems = parseInt(countResult.rows[0].count, 10);

    // Apply Sorting and Pagination
    queryText += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limitNum, offset);

    const result = await db.query(queryText, queryParams);

    const totalPages = Math.ceil(totalItems / limitNum);

    return res.status(200).json({
      status: 'success',
      data: {
        assets: result.rows,
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

// 2. GET /api/assets/:id (Retrieve single asset details + active bookings & maintenance history)
exports.getAssetById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.query('SELECT * FROM assets WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Asset with ID ${id} not found.`
      });
    }

    const asset = result.rows[0];

    // Fetch related active/approved bookings for QR actions (issue/return)
    const bookingsQuery = `
      SELECT b.id as booking_id, b.status, u.name as borrower_name, u.email as borrower_email, bi.quantity
      FROM bookings b
      JOIN booking_items bi ON b.id = bi.booking_id
      JOIN users u ON b.user_id = u.id
      WHERE bi.asset_id = $1 AND b.status IN ('approved', 'issued')
      ORDER BY b.status ASC, b.created_at ASC;
    `;
    const bookingsRes = await db.query(bookingsQuery, [id]);

    // Fetch detailed maintenance history (repair timeline) for this asset
    const maintenanceQuery = `
      SELECT ml.*, u.name as reported_by_name
      FROM maintenance_logs ml
      LEFT JOIN users u ON ml.reported_by = u.id
      WHERE ml.asset_id = $1
      ORDER BY ml.created_at DESC;
    `;
    const maintenanceRes = await db.query(maintenanceQuery, [id]);

    return res.status(200).json({
      status: 'success',
      data: {
        asset,
        activeBookings: bookingsRes.rows,
        maintenanceHistory: maintenanceRes.rows
      }
    });

  } catch (error) {
    next(error);
  }
};

// 3. POST /api/assets (Add new asset - Admin only)
exports.createAsset = async (req, res, next) => {
  const { name, category, description, quantity_total, condition } = req.body;

  try {
    // Basic Input Validations
    if (!name || !category || quantity_total === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, category, and total quantity.'
      });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
      });
    }

    const qtyTotal = parseInt(quantity_total, 10);
    if (isNaN(qtyTotal) || qtyTotal < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Total quantity must be a non-negative integer.'
      });
    }

    // Insert Asset details first to get autoincremented ID
    const initialInsert = await db.query(
      `INSERT INTO assets (name, category, description, quantity_total, quantity_available, status, condition) 
       VALUES ($1, $2, $3, $4, $4, 'active', $5) 
       RETURNING id, name, category, quantity_total, quantity_available, status, condition;`,
      [name.trim(), category, description ? description.trim() : null, qtyTotal, condition || 'excellent']
    );

    const newAsset = initialInsert.rows[0];

    // Generate QR code data URL containing asset metadata
    const qrPayload = JSON.stringify({ id: newAsset.id, name: newAsset.name, category: newAsset.category });
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload);

    // Update the row with generated QR code
    const updateResult = await db.query(
      'UPDATE assets SET qr_code_base64 = $1 WHERE id = $2 RETURNING *',
      [qrCodeBase64, newAsset.id]
    );

    const finalAsset = updateResult.rows[0];

    // Record Action in Audit Logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details) 
       VALUES ($1, 'CREATE_ASSET', $2);`,
      [req.user.id, `Created asset: ${finalAsset.name} (ID: ${finalAsset.id}) with total stock of ${finalAsset.quantity_total}`]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Asset added successfully.',
      data: {
        asset: finalAsset
      }
    });

  } catch (error) {
    next(error);
  }
};

// 4. PUT /api/assets/:id (Update asset details - Admin only)
exports.updateAsset = async (req, res, next) => {
  const { id } = req.params;
  const { name, category, description, quantity_total, status, condition } = req.body;

  try {
    // 1. Fetch current asset state to calculate stock changes
    const assetResult = await db.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Asset with ID ${id} not found.`
      });
    }

    const currentAsset = assetResult.rows[0];

    // 2. Perform validations
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category selection.'
      });
    }

    let nextQtyTotal = currentAsset.quantity_total;
    let nextQtyAvailable = currentAsset.quantity_available;

    // 3. Re-calculate quantity limits if quantity_total is edited
    if (quantity_total !== undefined) {
      nextQtyTotal = parseInt(quantity_total, 10);
      if (isNaN(nextQtyTotal) || nextQtyTotal < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Total quantity must be a non-negative integer.'
        });
      }

      // Active checked out count = quantity_total - quantity_available
      const activeCheckedOut = currentAsset.quantity_total - currentAsset.quantity_available;

      // New available quantity = new_total - active_checked_out
      nextQtyAvailable = nextQtyTotal - activeCheckedOut;

      if (nextQtyAvailable < 0) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot reduce total quantity to ${nextQtyTotal}. There are currently ${activeCheckedOut} items actively checked out. Return them before reducing stock.`
        });
      }
    }

    // 4. Generate new QR Code if name or category shifts
    let qrCodeBase64 = currentAsset.qr_code_base64;
    const finalName = name ? name.trim() : currentAsset.name;
    const finalCategory = category || currentAsset.category;
    
    if (name || category) {
      const qrPayload = JSON.stringify({ id: currentAsset.id, name: finalName, category: finalCategory });
      qrCodeBase64 = await QRCode.toDataURL(qrPayload);
    }

    // 5. Update asset in Database
    const updateQuery = `
      UPDATE assets SET 
        name = $1, 
        category = $2, 
        description = $3, 
        quantity_total = $4, 
        quantity_available = $5, 
        status = $6, 
        condition = $7,
        qr_code_base64 = $8
      WHERE id = $9 
      RETURNING *;
    `;

    const updatedResult = await db.query(updateQuery, [
      finalName,
      finalCategory,
      description !== undefined ? (description ? description.trim() : null) : currentAsset.description,
      nextQtyTotal,
      nextQtyAvailable,
      status || currentAsset.status,
      condition || currentAsset.condition,
      qrCodeBase64,
      id
    ]);

    const updatedAsset = updatedResult.rows[0];

    // Log Action in Audit Logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details) 
       VALUES ($1, 'UPDATE_ASSET', $2);`,
      [req.user.id, `Updated asset ID: ${id}. Stock: ${updatedAsset.quantity_total}, Status: ${updatedAsset.status}`]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Asset updated successfully.',
      data: {
        asset: updatedAsset
      }
    });

  } catch (error) {
    next(error);
  }
};

// 5. DELETE /api/assets/:id (Remove asset - Admin only)
exports.deleteAsset = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Check if asset exists
    const assetResult = await db.query('SELECT name FROM assets WHERE id = $1', [id]);
    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Asset with ID ${id} not found.`
      });
    }

    const assetName = assetResult.rows[0].name;

    // Reject deletion if asset is associated with any active pending, approved, or issued booking
    const activeBookingCheck = await db.query(
      `SELECT COUNT(*) FROM booking_items bi
       JOIN bookings b ON bi.booking_id = b.id
       WHERE bi.asset_id = $1 AND b.status IN ('pending', 'approved', 'issued')`,
      [id]
    );

    const activeCount = parseInt(activeBookingCheck.rows[0].count, 10);
    if (activeCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete asset. There are currently ${activeCount} pending requests, approved reservations, or checked-out items associated with it.`
      });
    }

    // Delete asset (booking_items, maintenance_logs cascade automatically via DB foreign key definitions)
    await db.query('DELETE FROM assets WHERE id = $1', [id]);

    // Log Action in Audit Logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details) 
       VALUES ($1, 'DELETE_ASSET', $2);`,
      [req.user.id, `Deleted asset: ${assetName} (ID: ${id})`]
    );

    return res.status(200).json({
      status: 'success',
      message: `Asset "${assetName}" was deleted successfully.`
    });

  } catch (error) {
    next(error);
  }
};
