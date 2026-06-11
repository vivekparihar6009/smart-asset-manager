import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../App';
import { 
  CheckSquare, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';

const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];

const Approvals = () => {
  const { user } = useAuth();
  
  // Tab states: 'pending', 'approved', 'issued'
  const [activeTab, setActiveTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Count metrics for tab badges
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    issued: 0
  });

  // Rejection modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Issue modal states
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issuingBooking, setIssuingBooking] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');

  // Return modal states
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningBooking, setReturningBooking] = useState(null);
  const [returnItemsState, setReturnItemsState] = useState([]); // [{ asset_id, name, return_condition, damage_report }]
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState('');

  // Fetch bookings based on status
  const fetchBookings = async (status) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/bookings', { params: { status } });
      setBookings(response.data.data.bookings);
    } catch (err) {
      console.error(`Failed to load ${status} bookings:`, err);
      setError(err.message || `An error occurred while loading ${status} requests.`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch counts for all states to update tab badges
  const fetchCounts = async () => {
    try {
      const statuses = ['pending', 'approved', 'issued'];
      const results = await Promise.all(
        statuses.map(s => api.get('/api/bookings', { params: { status: s } }))
      );
      setCounts({
        pending: results[0].data.data.bookings.length,
        approved: results[1].data.data.bookings.length,
        issued: results[2].data.data.bookings.length
      });
    } catch (err) {
      console.error('Failed to load stats counts:', err);
    }
  };

  useEffect(() => {
    fetchBookings(activeTab);
    fetchCounts();
  }, [activeTab]);

  // Refresh current view
  const refreshData = () => {
    fetchBookings(activeTab);
    fetchCounts();
  };

  // 1. APPROVE BOOKING
  const handleApprove = async (bookingId) => {
    if (!window.confirm(`Are you sure you want to APPROVE booking request #${bookingId}?`)) return;

    try {
      setError('');
      await api.post(`/api/bookings/${bookingId}/approve`);
      refreshData();
    } catch (err) {
      console.error('Approval failed:', err);
      alert(err.message || 'Failed to approve booking request.');
    }
  };

  // 2. REJECT BOOKING (Opens modal)
  const openRejectModal = (bookingId) => {
    setRejectBookingId(bookingId);
    setRejectionRemarks('');
    setRejectError('');
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionRemarks.trim()) {
      setRejectError('Please enter rejection feedback/remarks.');
      return;
    }

    try {
      setRejecting(true);
      setRejectError('');
      await api.post(`/api/bookings/${rejectBookingId}/reject`, {
        remarks: rejectionRemarks.trim()
      });
      setIsRejectModalOpen(false);
      setRejectBookingId(null);
      refreshData();
    } catch (err) {
      console.error('Rejection failed:', err);
      setRejectError(err.message || 'Failed to reject booking request.');
    } finally {
      setRejecting(false);
    }
  };

  // 3. ISSUE ASSETS (Opens confirmation modal)
  const openIssueModal = (booking) => {
    setIssuingBooking(booking);
    setIssueError('');
    setIsIssueModalOpen(true);
  };

  const handleIssueConfirm = async () => {
    if (!issuingBooking) return;

    try {
      setIssuing(true);
      setIssueError('');
      await api.post(`/api/admin/bookings/${issuingBooking.id}/issue`);
      setIsIssueModalOpen(false);
      setIssuingBooking(null);
      refreshData();
    } catch (err) {
      console.error('Issuing assets failed:', err);
      setIssueError(err.message || 'Failed to issue equipment assets.');
    } finally {
      setIssuing(false);
    }
  };

  // 4. RETURN ASSETS (Opens condition logger modal)
  const openReturnModal = (booking) => {
    setReturningBooking(booking);
    setReturnError('');
    
    // Initialize items return details
    const initialItems = booking.items.map(item => ({
      asset_id: item.asset_id,
      name: item.asset_name,
      return_condition: 'excellent',
      damage_report: ''
    }));
    setReturnItemsState(initialItems);
    setIsReturnModalOpen(true);
  };

  const handleReturnItemConditionChange = (idx, field, value) => {
    const updated = [...returnItemsState];
    updated[idx][field] = value;
    setReturnItemsState(updated);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    try {
      setReturning(true);
      setReturnError('');
      
      const payloadItems = returnItemsState.map(item => ({
        asset_id: item.asset_id,
        return_condition: item.return_condition,
        damage_report: (item.return_condition === 'poor' || item.return_condition === 'damaged') ? item.damage_report.trim() : undefined
      }));

      await api.post(`/api/admin/bookings/${returningBooking.id}/return`, {
        items: payloadItems
      });

      setIsReturnModalOpen(false);
      setReturningBooking(null);
      refreshData();
    } catch (err) {
      console.error('Processing return failed:', err);
      setReturnError(err.message || 'Failed to process asset return.');
    } finally {
      setReturning(false);
    }
  };

  // Helper: Checks if booking is overdue
  const checkIsOverdue = (booking) => {
    if (booking.status !== 'issued') return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(booking.due_date) < today;
  };

  // Helper: Get overdue count days
  const getDaysOverdue = (dueDate) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDate);
    due.setHours(0,0,0,0);
    const diffTime = Math.abs(today - due);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TABS BAR WITH METRICS COUNTS */}
      <div className="flex border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-violet-500 text-violet-400 bg-violet-600/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Pending Approvals</span>
          {counts.pending > 0 && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
              {counts.pending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'border-violet-500 text-violet-400 bg-violet-600/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Approved (To Issue)</span>
          {counts.approved > 0 && (
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
              {counts.approved}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('issued')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'issued'
              ? 'border-violet-500 text-violet-400 bg-violet-600/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Active Loans (Issued)</span>
          {counts.issued > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
              {counts.issued}
            </span>
          )}
        </button>
      </div>

      {/* 2. LOADING STATE */}
      {loading && bookings.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading coordination desk records...</p>
        </div>
      ) : error ? (
        /* 3. ERROR STATE */
        <div className="glass-panel p-6 rounded-2xl border-red-500/20 max-w-lg mx-auto flex flex-col items-center text-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">Failed to Fetch Bookings</h3>
            <p className="text-slate-400 text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={() => fetchBookings(activeTab)} 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Retry Loader
          </button>
        </div>
      ) : bookings.length === 0 ? (
        /* 4. EMPTY STATE */
        <div className="glass-panel py-16 px-6 rounded-2xl text-center max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="bg-slate-800/40 p-4 rounded-full text-slate-500 border border-slate-800/60">
            <CheckSquare className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200 uppercase tracking-wide">Queue Empty</h3>
            <p className="text-slate-400 text-sm mt-1.5">
              {activeTab === 'pending' && 'No pending equipment requests require review.'}
              {activeTab === 'approved' && 'No approved reservations are waiting for warehouse checkout dispatch.'}
              {activeTab === 'issued' && 'No equipment is currently checked out to borrowers.'}
            </p>
          </div>
        </div>
      ) : (
        /* 5. DATA RENDER PANEL */
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isOverdue = checkIsOverdue(booking);
            return (
              <div 
                key={booking.id} 
                className={`glass-panel rounded-2xl p-5 border transition-all duration-300 flex flex-col gap-4 ${
                  isOverdue ? 'border-red-500/25 bg-red-955/5 shadow-lg shadow-red-950/5' : 'border-slate-800/60'
                }`}
              >
                {/* Header: Reference, Borrower Details, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/60">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-mono text-violet-400 font-bold">#{booking.id}</span>
                    <span className="text-slate-600 font-sans text-xs">•</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-350">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-200">{booking.user_name}</span>
                      <span className="text-slate-500">({booking.user_email})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOverdue && (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded animate-pulse flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        OVERDUE
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">Requested {new Date(booking.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Details: Dates & Purpose */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      Date Window
                    </p>
                    <p className="text-slate-300 font-medium">
                      {new Date(booking.start_date).toLocaleDateString()} to {new Date(booking.end_date).toLocaleDateString()}
                    </p>
                  </div>

                  {(booking.status === 'issued' || booking.status === 'approved') && (
                    <div className="space-y-1">
                      <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        Return Deadline
                      </p>
                      <p className={`font-mono font-bold ${isOverdue ? 'text-red-405' : 'text-slate-300'}`}>
                        {new Date(booking.due_date).toLocaleDateString()}{' '}
                        {isOverdue && `(${getDaysOverdue(booking.due_date)} days late)`}
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-1">
                    <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3 text-slate-500" />
                      Borrowing Purpose
                    </p>
                    <p className="text-slate-350 line-clamp-1" title={booking.purpose}>{booking.purpose}</p>
                  </div>
                </div>

                {/* Booking Sub-items list */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Booked Inventory Items</h4>
                  <div className="bg-slate-950/20 rounded-xl border border-slate-900 overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-900">
                          <th className="py-2 px-3">Asset</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-center">Requested Qty</th>
                          <th className="py-2 px-3 text-right">Operational Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/40 text-slate-300">
                        {booking.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/10">
                            <td className="py-2 px-3 font-semibold text-slate-200">{item.asset_name || 'Deleted Asset'}</td>
                            <td className="py-2 px-3 text-slate-500 capitalize">{item.category}</td>
                            <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-[10px] font-mono text-slate-400">
                              {item.issued_at ? (
                                <div>
                                  <span className="text-emerald-500 font-sans">Issued </span>
                                  {new Date(item.issued_at).toLocaleDateString()}
                                  {item.returned_at && (
                                    <div>
                                      <span className="text-slate-500 font-sans">Returned </span>
                                      {new Date(item.returned_at).toLocaleDateString()}
                                      {item.return_condition && ` (${item.return_condition})`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-550">Awaiting checkout</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                  {/* PENDING: Approve & Reject */}
                  {booking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => openRejectModal(booking.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleApprove(booking.id)}
                        className="bg-violet-650 hover:bg-violet-700 text-white px-4.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-lg shadow-violet-950/20 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        Approve Request
                      </button>
                    </>
                  )}

                  {/* APPROVED: Dispatch checkout */}
                  {booking.status === 'approved' && (
                    <button
                      onClick={() => openIssueModal(booking)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-lg shadow-emerald-950/20 cursor-pointer"
                    >
                      <ArrowRight className="h-4.5 w-4.5" />
                      Issue Assets (Checkout)
                    </button>
                  )}

                  {/* ISSUED: Process Return */}
                  {booking.status === 'issued' && (
                    <button
                      onClick={() => openReturnModal(booking)}
                      className="bg-violet-650 hover:bg-violet-750 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-lg shadow-violet-950/20 cursor-pointer"
                    >
                      Process Return (Checkin)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. REJECTION REMARKS MODAL */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
                Reject Booking Request
              </h3>
              <button 
                onClick={() => { setIsRejectModalOpen(false); setRejectBookingId(null); }}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              {rejectError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{rejectError}</span>
                </div>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                Provide remarks specifying the reason for rejecting request **#{rejectBookingId}**. This will be visible to the borrower and logged in the system.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Rejection Reason</label>
                <textarea
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="e.g. Requested dates overlap with a major council event. Props are reserved."
                  rows="3"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder-slate-550 focus:outline-none focus:border-violet-500/50 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setIsRejectModalOpen(false); setRejectBookingId(null); }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/20 disabled:opacity-50 cursor-pointer"
                >
                  {rejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Reject Booking</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. ISSUE CONFIRMATION MODAL */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Confirm Warehouse Dispatch
              </h3>
              <button 
                onClick={() => { setIsIssueModalOpen(false); setIssuingBooking(null); }}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {issueError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{issueError}</span>
                </div>
              )}

              <p className="text-xs text-slate-450 leading-relaxed">
                You are checking out assets for booking request **#{issuingBooking?.id}** to user **{issuingBooking?.user_name}**. Ensure items are in operational condition before handoff.
              </p>

              <div className="bg-slate-950/20 rounded-xl border border-slate-900 p-3 space-y-2 text-xs">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Dispensing List:</p>
                {issuingBooking?.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-200">
                    <span>{item.asset_name}</span>
                    <span className="font-bold text-violet-400">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setIsIssueModalOpen(false); setIssuingBooking(null); }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIssueConfirm}
                  disabled={issuing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/20 disabled:opacity-50 cursor-pointer"
                >
                  {issuing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Dispensing...</span>
                    </>
                  ) : (
                    <span>Confirm Handout</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. RETURN MODAL WITH CONDITIONS & DAMAGE LOGGING */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Log Return Checkin Details
              </h3>
              <button 
                onClick={() => { setIsReturnModalOpen(false); setReturningBooking(null); }}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {returnError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{returnError}</span>
                </div>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluate condition of assets checked in for booking **#{returningBooking?.id}**. Poor or Damaged markings automatically trigger system maintenance logs.
              </p>

              {/* Items loops */}
              <div className="space-y-4">
                {returnItemsState.map((item, idx) => {
                  const requiresReport = item.return_condition === 'poor' || item.return_condition === 'damaged';
                  return (
                    <div key={item.asset_id} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-slate-250 truncate">{item.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Condition:</label>
                          <select
                            value={item.return_condition}
                            onChange={(e) => handleReturnItemConditionChange(idx, 'return_condition', e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-350 focus:outline-none cursor-pointer capitalize"
                          >
                            {CONDITIONS.map(cond => (
                              <option key={cond} value={cond}>{cond}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Damage reporting fields */}
                      {requiresReport && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                          <label className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Damage Report Details
                          </label>
                          <textarea
                            value={item.damage_report}
                            onChange={(e) => handleReturnItemConditionChange(idx, 'damage_report', e.target.value)}
                            placeholder="Provide physical evaluation details (e.g. lens glass scratch, missing power cable, battery depleted)..."
                            rows="2"
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/10 resize-none"
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80 mt-5">
                <button
                  type="button"
                  onClick={() => { setIsReturnModalOpen(false); setReturningBooking(null); }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returning}
                  className="bg-violet-650 hover:bg-violet-750 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-violet-950/20 disabled:opacity-50 cursor-pointer"
                >
                  {returning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Logging Return...</span>
                    </>
                  ) : (
                    <span>Log Checkin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
