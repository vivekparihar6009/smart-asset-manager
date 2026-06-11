import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../App';
import { 
  Bell, 
  Check, 
  CheckSquare, 
  Inbox, 
  Loader2, 
  AlertCircle,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/notifications');
      setNotifications(response.data.data.notifications);
    } catch (err) {
      console.error('Failed to load notifications page:', err);
      setError(err.message || 'Could not fetch notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark a single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadList = notifications.filter(n => !n.is_read);
    if (unreadList.length === 0) return;

    try {
      setMarkingAll(true);
      await Promise.all(unreadList.map(n => api.put(`/api/notifications/${n.id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const getFilteredNotifications = () => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.is_read);
    }
    return notifications;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredList = getFilteredNotifications();

  // Helper to determine notification category icon
  const getNotificationIcon = (message) => {
    const text = message.toLowerCase();
    if (text.includes('approved')) {
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    } else if (text.includes('rejected')) {
      return <XCircle className="h-5 w-5 text-rose-450" />;
    } else if (text.includes('warning') || text.includes('overdue')) {
      return <AlertCircle className="h-5 w-5 text-red-400" />;
    } else if (text.includes('reminder') || text.includes('approaching')) {
      return <CalendarDays className="h-5 w-5 text-amber-400" />;
    }
    return <Bell className="h-5 w-5 text-violet-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. HEADER CONTROL BOX */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-600/15 text-violet-400 rounded-xl border border-violet-500/25">
            <Bell className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-sans">Notification Center</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage and track your account alerts, return reminders, and approvals.</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="bg-violet-650 hover:bg-violet-750 disabled:bg-violet-850 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-950/20"
          >
            {markingAll ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Marking...</span>
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                <span>Mark All as Read</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 2. FILTER & LIST BOX */}
      <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
        {/* Tab filters */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/20 px-6 py-3 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-950/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-950/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <button 
            onClick={fetchNotifications}
            className="text-xs text-violet-400 hover:text-violet-300 font-semibold cursor-pointer transition-colors"
          >
            Refresh Feed
          </button>
        </div>

        {/* Dynamic Lists */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            <p className="text-slate-400 text-sm">Loading notification alerts...</p>
          </div>
        ) : error ? (
          <div className="py-12 px-6 flex flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-slate-350 text-sm">{error}</p>
            <button
              onClick={fetchNotifications}
              className="bg-slate-805 hover:bg-slate-800 text-slate-300 px-4 py-1.5 rounded-lg text-xs border border-slate-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 px-6 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto">
            <div className="bg-slate-800/40 p-4 rounded-full text-slate-500 border border-slate-800/60">
              <Inbox className="h-8 w-8 text-slate-600" />
            </div>
            <div>
              <h4 className="text-slate-200 text-sm font-bold uppercase tracking-wide">No Alerts Found</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                {filter === 'unread' 
                  ? 'Great job! You have cleared all notification alerts.' 
                  : 'Your inbox feed is currently empty.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-850/60">
            {filteredList.map((notif) => (
              <div 
                key={notif.id}
                className={`p-5 flex items-start gap-4 transition-colors ${
                  notif.is_read ? 'opacity-60 bg-slate-900/5 hover:bg-slate-900/10' : 'bg-violet-955/5 hover:bg-violet-955/10'
                }`}
              >
                {/* Category Icon */}
                <div className="shrink-0 mt-0.5 p-2 bg-slate-850 rounded-lg border border-slate-800">
                  {getNotificationIcon(notif.message)}
                </div>

                {/* Message Body */}
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">{notif.message}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(notif.created_at).toLocaleString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>

                {/* Mark Read Action Button */}
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="shrink-0 text-slate-500 hover:text-emerald-400 p-1.5 hover:bg-slate-900/60 rounded border border-transparent hover:border-slate-800 transition-all cursor-pointer"
                    title="Mark as Read"
                  >
                    <Check className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
