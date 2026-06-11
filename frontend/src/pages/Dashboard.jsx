import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement 
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  Package, 
  Layers, 
  CalendarCheck, 
  AlertTriangle, 
  HelpCircle,
  Loader2, 
  AlertCircle,
  User,
  Clock,
  CheckCircle2,
  TrendingUp,
  Percent
} from 'lucide-react';

// Register Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/analytics/dashboard');
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'An error occurred while fetching dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm">Compiling platform statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-6 rounded-2xl border-red-500/20 max-w-lg mx-auto mt-12 flex flex-col items-center text-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div>
          <h3 className="text-lg font-bold text-slate-100">Failed to Load Dashboard</h3>
          <p className="text-slate-400 text-sm mt-1">{error}</p>
        </div>
        <button 
          onClick={fetchDashboardData} 
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const { summaryCards, topAssets, categoryUtilization, bookingTrends, monthlyTrends, overdueDetails, topBorrowers } = data;

  // 1. Chart Configuration: Top Assets Bar Chart
  const barChartData = {
    labels: topAssets.map(item => item.name),
    datasets: [
      {
        label: 'Times Borrowed',
        data: topAssets.map(item => item.borrowCount),
        backgroundColor: 'rgba(124, 58, 237, 0.6)', // violet-600
        borderColor: '#7c3aed',
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#94a3b8', stepSize: 1, font: { family: 'Outfit' } }
      }
    }
  };

  // 2. Chart Configuration: Category Utilization Pie Chart
  const pieChartData = {
    labels: categoryUtilization.map(item => item.category),
    datasets: [
      {
        data: categoryUtilization.map(item => item.utilizationRate),
        backgroundColor: [
          'rgba(124, 58, 237, 0.65)', // violet
          'rgba(20, 184, 166, 0.65)',  // teal
          'rgba(16, 185, 129, 0.65)',  // emerald
          'rgba(245, 158, 11, 0.65)',  // amber
          'rgba(239, 68, 68, 0.65)',   // red
          'rgba(99, 102, 241, 0.65)',  // indigo
          'rgba(236, 72, 153, 0.65)',  // pink
        ],
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Outfit', size: 10 },
          boxWidth: 10
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw}% Utilized`
        },
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
      }
    }
  };

  // 3. Chart Configuration: Monthly Booking Trends Line Chart
  const lineChartData = {
    labels: monthlyTrends.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Bookings',
        data: monthlyTrends.map(item => item.count),
        fill: true,
        backgroundColor: 'rgba(20, 184, 166, 0.05)', // teal tint
        borderColor: '#14b8a6', // teal-500
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: '#14b8a6',
        pointHoverRadius: 6,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#94a3b8', stepSize: 1, font: { family: 'Outfit' } }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SUMMARY CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {/* Total Assets */}
        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
          <div className="bg-violet-600/20 p-2.5 rounded-lg text-violet-400">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Total Assets</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{summaryCards.totalAssets}</h3>
          </div>
        </div>

        {/* Available Inventory */}
        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
          <div className="bg-teal-600/20 p-2.5 rounded-lg text-teal-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Available</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{summaryCards.availableInventory}</h3>
          </div>
        </div>

        {/* Active Allocations */}
        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
          <div className="bg-emerald-600/20 p-2.5 rounded-lg text-emerald-400">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Active Loans</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{summaryCards.activeAllocations}</h3>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
          <div className="bg-indigo-600/20 p-2.5 rounded-lg text-indigo-400">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Pending Appr.</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{summaryCards.pendingApprovals}</h3>
          </div>
        </div>

        {/* Overdue Returns */}
        <div className={`glass-panel p-4 rounded-xl flex items-center gap-3 border ${summaryCards.overdueReturns > 0 ? 'border-red-500/25 bg-red-950/5' : 'border-transparent'}`}>
          <div className={`p-2.5 rounded-lg ${summaryCards.overdueReturns > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800/40 text-slate-400'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-455 font-semibold uppercase tracking-wider">Overdue</p>
            <h3 className={`text-xl font-bold mt-0.5 ${summaryCards.overdueReturns > 0 ? 'text-red-400' : 'text-slate-100'}`}>{summaryCards.overdueReturns}</h3>
          </div>
        </div>

        {/* Average Loan Duration */}
        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
          <div className="bg-amber-600/20 p-2.5 rounded-lg text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Avg Duration</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{summaryCards.avgLoanDuration}d</h3>
          </div>
        </div>

        {/* Asset Availability Ratio */}
        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
          <div className="bg-cyan-600/20 p-2.5 rounded-lg text-cyan-400">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Avail. Ratio</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{summaryCards.availabilityRatio}%</h3>
          </div>
        </div>
      </div>

      {/* 2. CHARTS SECTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Assets (Bar) */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col h-80">
          <h4 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            Most Borrowed Assets
          </h4>
          <div className="flex-1 relative">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Category Rates (Pie) */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col h-80">
          <h4 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-violet-400" />
            Category Utilization Rate
          </h4>
          <div className="flex-1 relative">
            <Pie data={pieChartData} options={pieChartOptions} />
          </div>
        </div>

        {/* Booking Volume Trends (Line) */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col h-80">
          <h4 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4 text-violet-400" />
            Monthly Borrowing Trend
          </h4>
          <div className="flex-1 relative">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* 3. LEADERBOARD & OVERDUE DUAL PANEL ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Overdue Allocations */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Overdue Alerts Queue</h4>
          </div>

          {overdueDetails.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm flex-1 flex items-center justify-center">
              No active allocations are currently overdue. Excellent!
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-450 font-semibold">
                    <th className="py-2 px-3">Borrower</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3">Overdue</th>
                    <th className="py-2 px-3">Assets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {overdueDetails.map((row) => (
                    <tr key={row.booking_id} className="hover:bg-slate-800/20 text-slate-350">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-250 leading-none">{row.borrower_name}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{row.borrower_email}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{new Date(row.due_date).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {row.days_overdue}d late
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {row.items.map((item, i) => (
                            <span key={i} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                              {item.asset_name} (x{item.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Top Borrowers Leaderboard */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-teal-405" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Top Borrowers Leaderboard</h4>
          </div>

          {topBorrowers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm flex-1 flex items-center justify-center">
              No borrowing statistics recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-450 font-semibold">
                    <th className="py-2 px-3">Rank</th>
                    <th className="py-2 px-3">Borrower Name</th>
                    <th className="py-2 px-3">Email Address</th>
                    <th className="py-2 px-3 text-right">Successful Bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {topBorrowers.map((row, i) => (
                    <tr key={row.email} className="hover:bg-slate-800/20 text-slate-350">
                      <td className="py-3 px-3 font-mono font-bold text-violet-400">#{i + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-250">{row.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-450">{row.email}</td>
                      <td className="py-3 px-3 text-right font-bold text-teal-400">{row.bookingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
