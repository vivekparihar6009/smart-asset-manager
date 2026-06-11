import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  CalendarDays, 
  CheckSquare, 
  Wrench, 
  History, 
  Bell, 
  User, 
  LogOut, 
  Menu, 
  X,
  FileText,
  ShieldCheck,
  Check,
  QrCode
} from 'lucide-react';
import api from './utils/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Bookings from './pages/Bookings';
import Approvals from './pages/Approvals';
import Maintenance from './pages/Maintenance';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import QRScannerModal from './components/QRScannerModal';

// ----------------------------------------------------
// 1. AUTHENTICATION STATE & CONTEXT PROVIDER
// ----------------------------------------------------
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          localStorage.setItem('token', token);
          const response = await api.get('/api/auth/me');
          setUser(response.data.data.user);
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          logout();
        }
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [token]);

  const login = (jwtToken) => {
    setToken(jwtToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ----------------------------------------------------
// 2. ROUTE PROTECTION MIDDLEWARES
// ----------------------------------------------------
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/assets" replace />;
  }

  return children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/assets" replace />;
};

// ----------------------------------------------------
// 4. MAIN RESPONSIVE SHELL LAYOUT
// ----------------------------------------------------
const MainLayout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data.data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'admin' },
    { name: 'Assets Catalog', path: '/assets', icon: Package, role: 'all' },
    { name: 'My Bookings', path: '/bookings', icon: CalendarDays, role: 'all' },
    { name: 'Request Approvals', path: '/approvals', icon: CheckSquare, role: 'admin' },
    { name: 'Health & Maintenance', path: '/maintenance', icon: Wrench, role: 'all' },
    { name: 'Notifications', path: '/notifications', icon: Bell, role: 'all' },
    { name: 'Audit Logs', path: '/audit-logs', icon: FileText, role: 'admin' },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen flex bg-brand-dark">
      {/* Sidebar - Desktop Layout */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-slate-800 p-4 transition-transform duration-300 transform md:translate-x-0 md:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8 px-2">
          <span className="text-lg font-bold flex items-center gap-2 text-violet-400">
            <ShieldCheck className="h-6 w-6" />
            Asset Manager
          </span>
          <button className="md:hidden text-slate-400 hover:text-slate-200" onClick={toggleSidebar}>
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            if (item.role === 'admin' && user?.role !== 'admin') return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-violet-600/20 text-violet-400 border-l-2 border-violet-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => setScannerOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-violet-500/20 mb-3 cursor-pointer"
          >
            <QrCode className="h-4.5 w-4.5" />
            Scan QR Code
          </button>

          <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800/60 mb-3">
            <div className="bg-violet-600/30 p-2 rounded-lg text-violet-400">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role} Access</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-slate-850 hover:bg-rose-950/20 hover:text-rose-400 text-slate-400 py-2 rounded-lg text-sm transition-colors border border-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-400 hover:text-slate-200" onClick={toggleSidebar}>
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-200 capitalize">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Notification Bell Feed */}
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 rounded-lg border border-slate-800/60 cursor-pointer"
              title="Notification Feed"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-violet-500 rounded-full"></span>
              )}
            </button>

            {/* Dropdown panel */}
            {notificationsOpen && (
              <div className="absolute right-0 top-11 z-[90] w-80 glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alerts Feed</span>
                  {unreadCount > 0 && (
                    <span className="bg-violet-605/20 text-violet-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-violet-500/20">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-850/60">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-xs">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3.5 text-xs transition-colors flex justify-between gap-3 ${
                          notif.is_read ? 'opacity-55 hover:bg-slate-900/10' : 'bg-violet-955/5 hover:bg-violet-955/10'
                        }`}
                      >
                        <div className="flex-1 space-y-1">
                          <p className="text-slate-200 leading-relaxed font-sans">{notif.message}</p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-slate-500 hover:text-emerald-400 p-1 self-start cursor-pointer hover:bg-slate-900/40 rounded border border-transparent hover:border-slate-800 transition-colors"
                            title="Mark as Read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/approvals" element={<ProtectedRoute requireAdmin><Approvals /></ProtectedRoute>} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/audit-logs" element={<ProtectedRoute requireAdmin><AuditLogs /></ProtectedRoute>} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 5. MASTER ROUTER WRAPPER
// ----------------------------------------------------
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
