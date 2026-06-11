import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../App';
import { 
  Wrench, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  User, 
  Calendar, 
  IndianRupee, 
  Activity,
  Heart,
  Info
} from 'lucide-react';

const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

const Maintenance = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State lists
  const [logs, setLogs] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'resolved'

  // Report issue modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [severity, setSeverity] = useState('standard'); // 'standard' or 'critical'
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState('');

  // Resolve modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolvingLog, setResolvingLog] = useState(null);
  const [cost, setCost] = useState('0.00');
  const [conditionAfter, setConditionAfter] = useState('good');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // Fetch all maintenance records
  const fetchMaintenanceLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/maintenance');
      setLogs(response.data.data.logs);
    } catch (err) {
      console.error('Failed to fetch maintenance logs:', err);
      setError(err.message || 'An error occurred while loading maintenance tickets.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch active assets (for reporting dropdown selection)
  const fetchAssetsList = async () => {
    try {
      const response = await api.get('/api/assets', { params: { limit: 100 } });
      // Filter out already damaged/maintenance assets if you want, or show all active assets
      const activeAssets = response.data.data.assets.filter(a => a.status === 'active');
      setAssetsList(activeAssets);
    } catch (err) {
      console.error('Failed to load assets list:', err);
    }
  };

  useEffect(() => {
    fetchMaintenanceLogs();
    fetchAssetsList();
  }, []);

  // Filtered maintenance logs list
  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  // Handle Report Issue Submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssetId) {
      setReportError('Please select an equipment asset.');
      return;
    }
    if (!issueDescription.trim()) {
      setReportError('Please provide a description of the issue.');
      return;
    }

    try {
      setReporting(true);
      setReportError('');
      await api.post('/api/maintenance', {
        asset_id: parseInt(selectedAssetId, 10),
        issue_description: issueDescription.trim(),
        severity
      });
      setIsReportModalOpen(false);
      // Reset form
      setSelectedAssetId('');
      setIssueDescription('');
      setSeverity('standard');
      fetchMaintenanceLogs();
      fetchAssetsList(); // Refresh list to remove reported item
    } catch (err) {
      console.error('Failed to report issue:', err);
      setReportError(err.message || 'Failed to submit maintenance report.');
    } finally {
      setReporting(false);
    }
  };

  // Open Resolve Modal
  const openResolveModal = (log) => {
    setResolvingLog(log);
    setCost('0.00');
    setConditionAfter('good');
    setResolveError('');
    setIsResolveModalOpen(true);
  };

  // Handle Resolve Submission
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    const finalCost = parseFloat(cost);
    if (isNaN(finalCost) || finalCost < 0) {
      setResolveError('Maintenance cost must be a non-negative number.');
      return;
    }

    try {
      setResolving(true);
      setResolveError('');
      await api.put(`/api/maintenance/${resolvingLog.id}/resolve`, {
        cost: finalCost,
        condition_after: conditionAfter
      });
      setIsResolveModalOpen(false);
      setResolvingLog(null);
      fetchMaintenanceLogs();
      fetchAssetsList(); // Refresh active assets list
    } catch (err) {
      console.error('Failed to resolve maintenance log:', err);
      setResolveError(err.message || 'Failed to resolve maintenance ticket.');
    } finally {
      setResolving(false);
    }
  };

  // Helper styles for status badges
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Tab buttons */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 w-fit">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Tickets
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'pending' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Issues
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'resolved' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Resolved Tickets
          </button>
        </div>

        {/* Report Button */}
        <button
          onClick={() => {
            setReportError('');
            setIsReportModalOpen(true);
          }}
          className="bg-red-600/90 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/20 w-fit cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Report Broken Equipment
        </button>
      </div>

      {/* 2. LOADING STATE */}
      {loading && logs.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          <p className="text-slate-400 text-sm">Compiling health maintenance records...</p>
        </div>
      ) : error ? (
        /* 3. ERROR STATE */
        <div className="glass-panel p-6 rounded-2xl border-red-500/20 max-w-lg mx-auto flex flex-col items-center text-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">Failed to Load Maintenance Logs</h3>
            <p className="text-slate-400 text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={fetchMaintenanceLogs} 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Retry Loader
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        /* 4. EMPTY STATE */
        <div className="glass-panel py-16 px-6 rounded-2xl text-center max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="bg-slate-800/40 p-4 rounded-full text-slate-500 border border-slate-800/60">
            <Wrench className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200 uppercase tracking-wide">No Tickets Found</h3>
            <p className="text-slate-400 text-sm mt-1.5">
              {filterStatus === 'all' && 'All equipment is currently operational. Outstanding!'}
              {filterStatus === 'pending' && 'No active calibration or repair tickets are logged.'}
              {filterStatus === 'resolved' && 'No historical repair records logged.'}
            </p>
          </div>
        </div>
      ) : (
        /* 5. DATA RENDER LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 hover:border-slate-700/60 ${
                log.status === 'pending' ? 'border-amber-500/10' : 'border-slate-800/60'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-violet-400 font-bold">Ticket #{log.id}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-0.5 bg-slate-900 border border-slate-850 rounded">
                      {log.asset_category}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 capitalize ${getStatusBadgeStyle(log.status)}`}>
                    {log.status}
                  </span>
                </div>

                {/* Details */}
                <h3 className="text-base font-bold text-slate-200 line-clamp-1 mb-1">{log.asset_name}</h3>
                
                <p className="text-xs text-slate-400 min-h-8 mb-4 break-words">
                  {log.issue_description}
                </p>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/40 rounded-xl border border-slate-800/50 mb-3 text-[11px] text-slate-400 font-sans">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">By: {log.reported_by_name || 'System Auto'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Resolution Cost & Condition details */}
                {log.status === 'resolved' && (
                  <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-emerald-400">
                      <span className="font-semibold flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" /> Resolved Log:
                      </span>
                      <span className="font-mono flex items-center">
                        <IndianRupee className="h-3 w-3" /> {log.cost}
                      </span>
                    </div>
                    {log.resolved_at && (
                      <p className="text-[10px] text-slate-500">
                        Resolved on {new Date(log.resolved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Resolve button */}
              {log.status === 'pending' && isAdmin && (
                <button
                  onClick={() => openResolveModal(log)}
                  className="w-full bg-violet-650 hover:bg-violet-750 text-white mt-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-lg shadow-violet-950/20 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Resolve Ticket (Mark Active)
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 6. REPORT BROKEN EQUIPMENT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-red-500" />
                Report Equipment Issue
              </h3>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              {reportError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{reportError}</span>
                </div>
              )}

              {/* Equipment Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Select Asset</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-350 focus:outline-none focus:border-violet-500/50 cursor-pointer"
                  required
                >
                  <option value="">Choose Asset...</option>
                  {assetsList.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (ID: {a.id})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">Only active assets can be placed on maintenance tickets.</p>
              </div>

              {/* Severity Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Issue Severity</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="severity"
                      value="standard"
                      checked={severity === 'standard'}
                      onChange={() => setSeverity('standard')}
                      className="accent-violet-600"
                    />
                    <span>Standard Maintenance (Calibrations/Minor Issues)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="severity"
                      value="critical"
                      checked={severity === 'critical'}
                      onChange={() => setSeverity('critical')}
                      className="accent-red-650"
                    />
                    <span className="text-red-400">Critical Damage (Non-operational)</span>
                  </label>
                </div>
              </div>

              {/* Issue Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Issue Description Details</label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Explain exactly what is broken or malfunctioning..."
                  rows="3"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder-slate-550 focus:outline-none focus:border-violet-500/50 resize-none"
                  required
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="bg-red-600 hover:bg-red-750 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-red-950/20 disabled:opacity-50 cursor-pointer"
                >
                  {reporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. RESOLVE TICKET MODAL (Admin only) */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Resolve Maintenance Ticket
              </h3>
              <button 
                onClick={() => { setIsResolveModalOpen(false); setResolvingLog(null); }}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
              {resolveError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{resolveError}</span>
                </div>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                Confirm resolution of ticket **#{resolvingLog?.id}** for asset **{resolvingLog?.asset_name}**. This will set the operational status back to active.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Cost Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-0.5">
                    Repair Cost (<IndianRupee className="h-3 w-3" />)
                  </label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-250 focus:outline-none focus:border-violet-500/50"
                    required
                  />
                </div>

                {/* Condition Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Condition After Repair</label>
                  <select
                    value={conditionAfter}
                    onChange={(e) => setConditionAfter(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-350 focus:outline-none focus:border-violet-500/50 cursor-pointer capitalize"
                  >
                    {CONDITIONS.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setIsResolveModalOpen(false); setResolvingLog(null); }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="bg-violet-650 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-violet-950/20 disabled:opacity-50 cursor-pointer"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Resolving Ticket...</span>
                    </>
                  ) : (
                    <span>Resolve Ticket</span>
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

export default Maintenance;
