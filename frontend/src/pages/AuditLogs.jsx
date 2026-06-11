import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  FileText, 
  Search, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Clock, 
  Database,
  ArrowRight
} from 'lucide-react';

const AuditLogs = () => {
  // Logs and pagination state
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/audit-logs', {
        params: {
          page,
          limit: pagination.limit
        }
      });
      setLogs(response.data.data.logs);
      setPagination(response.data.data.pagination);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'An error occurred while loading audit trails.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  // Helper styles for action tags
  const getActionBadgeStyle = (action) => {
    if (action.includes('CREATE')) {
      return 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20';
    }
    if (action.includes('UPDATE') || action.includes('RESOLVE') || action.includes('APPROVE')) {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('DAMAGED')) {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  };

  // Local filter for quick search
  const filteredLogs = logs.filter(log => {
    if (!filterAction) return true;
    return log.action.toLowerCase().includes(filterAction.toLowerCase()) || 
           log.details.toLowerCase().includes(filterAction.toLowerCase()) ||
           (log.user_name && log.user_name.toLowerCase().includes(filterAction.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTROL BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Local Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter audit entries locally..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Database className="h-4 w-4 text-slate-500" />
          <span>Showing records directly from system transactions logs</span>
        </div>
      </div>

      {/* 2. LOADING STATE */}
      {loading && logs.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          <p className="text-slate-400 text-sm">Accessing database audit trails...</p>
        </div>
      ) : error ? (
        /* 3. ERROR STATE */
        <div className="glass-panel p-6 rounded-2xl border-red-500/20 max-w-lg mx-auto flex flex-col items-center text-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">Failed to Load Audit Logs</h3>
            <p className="text-slate-400 text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={fetchAuditLogs} 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        /* 4. EMPTY STATE */
        <div className="glass-panel py-16 px-6 rounded-2xl text-center max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="bg-slate-800/40 p-4 rounded-full text-slate-500 border border-slate-800/60">
            <FileText className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200 uppercase tracking-wide">No Logs Matching</h3>
            <p className="text-slate-400 text-sm mt-1.5">No historical audit activities matched the current search terms.</p>
          </div>
        </div>
      ) : (
        /* 5. DATA RENDERING TABLE */
        <div className="glass-panel p-6 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Authorized User</th>
                  <th className="py-3 px-4">Operation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/10">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-400 min-w-28">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-600" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3 px-4 font-mono">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${getActionBadgeStyle(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>

                    {/* User */}
                    <td className="py-3 px-4">
                      {log.user_name ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-200">{log.user_name}</p>
                            <p className="text-[10px] text-slate-500 leading-none mt-0.5">{log.user_email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-550 italic">System Action</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-slate-350 leading-relaxed font-sans max-w-sm break-words">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-850/80 pt-6 gap-4 text-sm mt-6">
              <p className="text-slate-400">
                Showing page <span className="font-semibold text-slate-200">{pagination.currentPage}</span> of{' '}
                <span className="font-semibold text-slate-200">{pagination.totalPages}</span> ({pagination.totalItems} entries)
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="p-2 bg-slate-900/60 hover:bg-slate-800/60 disabled:opacity-40 disabled:hover:bg-slate-900/60 text-slate-350 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      p === page
                        ? 'bg-violet-650 border-violet-500 text-white shadow-lg shadow-violet-950/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  className="p-2 bg-slate-900/60 hover:bg-slate-800/60 disabled:opacity-40 disabled:hover:bg-slate-900/60 text-slate-350 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
