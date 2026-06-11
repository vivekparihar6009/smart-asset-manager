const db = require('../config/db');

// GET /api/analytics/dashboard (Retrieve aggregate system statistics for admin dashboard)
exports.getDashboardData = async (req, res, next) => {
  try {
    // 1. Fetch Summary Card Metrics
    const totalAssetsRes = await db.query('SELECT COALESCE(SUM(quantity_total), 0) as total FROM assets');
    const availableInventoryRes = await db.query('SELECT COALESCE(SUM(quantity_available), 0) as available FROM assets');
    const activeBookingsRes = await db.query("SELECT COUNT(*) as active FROM bookings WHERE status = 'issued'");
    const pendingBookingsRes = await db.query("SELECT COUNT(*) as pending FROM bookings WHERE status = 'pending'");
    
    // Calculate Overdue Returns dynamically using due_date (status is issued and current date > due_date)
    const overdueBookingsRes = await db.query(
      "SELECT COUNT(*) as overdue FROM bookings WHERE status = 'issued' AND due_date < CURRENT_DATE"
    );

    // Calculate Average Loan Duration (returned bookings)
    const avgDurationRes = await db.query(
      "SELECT COALESCE(ROUND(AVG(end_date - start_date), 1), 0.0) as avg_duration FROM bookings WHERE status = 'returned'"
    );

    // Calculate Asset Availability Ratio (%)
    const availabilityRatioRes = await db.query(
      "SELECT COALESCE(ROUND((SUM(quantity_available)::NUMERIC / NULLIF(SUM(quantity_total), 0)) * 100, 1), 0.0) as ratio FROM assets"
    );

    const summaryCards = {
      totalAssets: parseInt(totalAssetsRes.rows[0].total, 10),
      availableInventory: parseInt(availableInventoryRes.rows[0].available, 10),
      activeAllocations: parseInt(activeBookingsRes.rows[0].active, 10),
      pendingApprovals: parseInt(pendingBookingsRes.rows[0].pending, 10),
      overdueReturns: parseInt(overdueBookingsRes.rows[0].overdue, 10),
      avgLoanDuration: parseFloat(avgDurationRes.rows[0].avg_duration),
      availabilityRatio: parseFloat(availabilityRatioRes.rows[0].ratio)
    };

    // 2. Fetch Most Frequently Utilized Assets (Top 5 Bar Chart Data)
    const topAssetsQuery = `
      SELECT a.name, SUM(bi.quantity) as borrow_count
      FROM booking_items bi
      JOIN assets a ON bi.asset_id = a.id
      JOIN bookings b ON bi.booking_id = b.id
      WHERE b.status IN ('approved', 'issued', 'returned', 'overdue')
      GROUP BY a.id, a.name
      ORDER BY borrow_count DESC
      LIMIT 5;
    `;
    const topAssetsRes = await db.query(topAssetsQuery);
    const topAssets = topAssetsRes.rows.map(row => ({
      name: row.name,
      borrowCount: parseInt(row.borrow_count, 10)
    }));

    // 3. Fetch Category Utilization Rates (Pie Chart Data)
    const categoryQuery = `
      SELECT 
        category,
        SUM(quantity_total) as total_qty,
        SUM(quantity_total - quantity_available) as occupied_qty,
        ROUND(
          COALESCE(
            (SUM(quantity_total - quantity_available)::NUMERIC / NULLIF(SUM(quantity_total), 0)) * 100, 
            0
          ), 
          2
        ) as utilization_rate
      FROM assets
      GROUP BY category
      ORDER BY category ASC;
    `;
    const categoryRes = await db.query(categoryQuery);
    const categoryUtilization = categoryRes.rows.map(row => ({
      category: row.category,
      totalQty: parseInt(row.total_qty, 10),
      occupiedQty: parseInt(row.occupied_qty, 10),
      utilizationRate: parseFloat(row.utilization_rate)
    }));

    // 4. Fetch Booking Trends over past 14 days (Line Chart Data)
    const trendsQuery = `
      SELECT gs.date::DATE as date, COALESCE(COUNT(b.id), 0) as count
      FROM GENERATE_SERIES(
        CURRENT_DATE - INTERVAL '13 days', 
        CURRENT_DATE, 
        '1 day'::INTERVAL
      ) gs(date)
      LEFT JOIN bookings b ON DATE_TRUNC('day', b.created_at)::DATE = gs.date::DATE
      GROUP BY gs.date
      ORDER BY gs.date ASC;
    `;
    const trendsRes = await db.query(trendsQuery);
    const bookingTrends = trendsRes.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
      count: parseInt(row.count, 10)
    }));

    // 4.b Fetch Monthly Booking Trends for current year
    const monthlyTrendsQuery = `
      SELECT 
        TO_CHAR(gs.date, 'Mon') as month_name,
        COALESCE(COUNT(b.id), 0) as count
      FROM GENERATE_SERIES(
        DATE_TRUNC('year', CURRENT_DATE), 
        DATE_TRUNC('month', CURRENT_DATE), 
        '1 month'::INTERVAL
      ) gs(date)
      LEFT JOIN bookings b ON DATE_TRUNC('month', b.created_at)::DATE = gs.date::DATE
      GROUP BY gs.date
      ORDER BY gs.date ASC;
    `;
    const monthlyTrendsRes = await db.query(monthlyTrendsQuery);
    const monthlyTrends = monthlyTrendsRes.rows.map(row => ({
      month: row.month_name,
      count: parseInt(row.count, 10)
    }));

    // 5. Fetch Detailed Overdue Allocations List for Admin Warnings
    const overdueDetailsQuery = `
      SELECT 
        b.id as booking_id,
        u.name as borrower_name,
        u.email as borrower_email,
        b.due_date,
        (CURRENT_DATE - b.due_date) as days_overdue,
        json_agg(
          json_build_object(
            'asset_name', a.name,
            'quantity', bi.quantity
          )
        ) as items
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN booking_items bi ON b.id = bi.booking_id
      JOIN assets a ON bi.asset_id = a.id
      WHERE b.status = 'issued' AND b.due_date < CURRENT_DATE
      GROUP BY b.id, u.id
      ORDER BY days_overdue DESC;
    `;
    const overdueDetailsRes = await db.query(overdueDetailsQuery);
    const overdueDetails = overdueDetailsRes.rows;

    // 6. Fetch Top 5 Borrowers
    const topBorrowersQuery = `
      SELECT u.name, u.email, COUNT(b.id) as booking_count
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      GROUP BY u.id, u.name, u.email
      ORDER BY booking_count DESC
      LIMIT 5;
    `;
    const topBorrowersRes = await db.query(topBorrowersQuery);
    const topBorrowers = topBorrowersRes.rows.map(row => ({
      name: row.name,
      email: row.email,
      bookingCount: parseInt(row.booking_count, 10)
    }));

    // Return combined structured JSON response
    return res.status(200).json({
      status: 'success',
      data: {
        summaryCards,
        topAssets,
        categoryUtilization,
        bookingTrends,
        monthlyTrends,
        overdueDetails,
        topBorrowers
      }
    });

  } catch (error) {
    next(error);
  }
};
