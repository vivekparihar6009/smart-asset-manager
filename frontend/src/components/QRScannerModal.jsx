import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../App';
import { 
  X, 
  QrCode, 
  Loader2, 
  AlertCircle, 
  Package, 
  Check, 
  ExternalLink,
  Wrench,
  CalendarDays,
  CheckSquare,
  RotateCcw,
  User,
  ArrowRightLeft
} from 'lucide-react';

const QRScannerModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (!isOpen) return null;

  // List of assets to choose for simulation
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scannedAsset, setScannedAsset] = useState(null);
  const [activeBookings, setActiveBookings] = useState([]);
  const [fetchError, setFetchError] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Return operation fields
  const [returnCondition, setReturnCondition] = useState('excellent');
  const [damageReport, setDamageReport] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch assets list on mount
  const loadAssets = async () => {
    try {
      setLoadingAssets(true);
      const response = await api.get('/api/assets', { params: { limit: 100 } });
      setAssets(response.data.data.assets);
    } catch (err) {
      console.error('Failed to load assets for scanner:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Simulate scanning
  const handleSimulateScan = async (assetId) => {
    if (!assetId) return;
    
    setIsScanning(true);
    setScannedAsset(null);
    setActiveBookings([]);
    setFetchError('');
    setActionSuccess('');

    // Simulate viewfinder analysis delay (1.2 seconds)
    setTimeout(async () => {
      try {
        setLoadingDetails(true);
        const response = await api.get(`/api/assets/${assetId}`);
        setScannedAsset(response.data.data.asset);
        setActiveBookings(response.data.data.activeBookings || []);
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to load scanned asset details:', err);
        setFetchError(err.message || 'Scanned data payload is corrupt or invalid.');
        setIsScanning(false);
      } finally {
        setLoadingDetails(false);
      }
    }, 1200);
  };

  // Perform QR Issue operation
  const handleQRIssue = async (bookingId) => {
    try {
      setActionLoading(true);
      setFetchError('');
      await api.post(`/api/admin/bookings/${bookingId}/issue`);
      setActionSuccess('Asset checked out and issued successfully via QR scan!');
      // Reload details to update status
      const assetId = scannedAsset.id;
      setTimeout(() => handleSimulateScan(assetId), 1500);
    } catch (err) {
      console.error('Failed to issue asset via QR:', err);
      setFetchError(err.message || 'Failed to checkout asset. Please check quantity limits.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform QR Return operation
  const handleQRReturn = async (bookingId) => {
    try {
      setActionLoading(true);
      setFetchError('');
      await api.post(`/api/admin/bookings/${bookingId}/return`, {
        items: [
          {
            asset_id: scannedAsset.id,
            return_condition: returnCondition,
            damage_report: damageReport
          }
        ]
      });
      setActionSuccess('Asset returned successfully via QR scan!');
      setDamageReport('');
      // Reload details to update status
      const assetId = scannedAsset.id;
      setTimeout(() => handleSimulateScan(assetId), 1500);
    } catch (err) {
      console.error('Failed to return asset via QR:', err);
      setFetchError(err.message || 'Failed to log checkin return.');
    } finally {
      setActionLoading(false);
    }
  };

  // Redirect to Bookings to request this asset
  const handleBookRedirect = () => {
    onClose();
    navigate('/bookings');
  };

  // Redirect to Maintenance tab
  const handleMaintenanceRedirect = () => {
    onClose();
    navigate('/maintenance');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
            <QrCode className="h-4.5 w-4.5 text-violet-400" />
            QR Code Simulator Scanner
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Simulator */}
        <div className="p-6 space-y-4">
          {actionSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {fetchError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {!scannedAsset && !isScanning ? (
            /* Viewfinder Standby */
            <div className="relative aspect-video w-full border border-slate-800 bg-slate-950/45 rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-4">
              {/* Corner brackets simulating camera */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-slate-600"></div>
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-slate-600"></div>
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-slate-600"></div>
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-slate-600"></div>
              
              <QrCode className="h-10 w-10 text-slate-600 animate-pulse mb-2" />
              <p className="text-xs text-slate-500 font-sans">Camera standby. Select asset below to trigger simulation.</p>
            </div>
          ) : isScanning ? (
            /* Scanning Active */
            <div className="relative aspect-video w-full border border-violet-550/30 bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-4">
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-violet-500"></div>
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-violet-500"></div>
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-violet-500"></div>
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-violet-500"></div>
              
              {/* Animated laser line */}
              <div className="absolute left-0 right-0 h-0.5 bg-violet-500 shadow-md shadow-violet-500/80 animate-bounce"></div>
              
              <Loader2 className="h-6 w-6 text-violet-400 animate-spin mb-2" />
              <p className="text-xs text-violet-400 font-mono">Analyzing QR payload matrix...</p>
            </div>
          ) : (
            /* Scanned Result Card */
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/80 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Scan Successful
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Asset ID: #{scannedAsset.id}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-200 flex items-center gap-1.5">
                    <Package className="h-4.5 w-4.5 text-violet-400" />
                    {scannedAsset.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{scannedAsset.category}</p>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{scannedAsset.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-sans border-t border-slate-850/80 pt-3 text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">Available Stock</span>
                    <span className="font-bold text-slate-200">{scannedAsset.quantity_available} / {scannedAsset.quantity_total}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">Condition Status</span>
                    <span className="font-bold text-slate-200 capitalize">{scannedAsset.condition}</span>
                  </div>
                </div>

                {/* Standard user navigation */}
                {!isAdmin && (
                  <div className="border-t border-slate-850/80 pt-3">
                    {scannedAsset.status === 'active' ? (
                      <button
                        onClick={handleBookRedirect}
                        className="w-full bg-violet-650 hover:bg-violet-750 text-white py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CalendarDays className="h-4 w-4" />
                        <span>Book this Asset</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleMaintenanceRedirect}
                        className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Wrench className="h-4 w-4" />
                        <span>View Maintenance Details</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Actions Panel (QR Issue / QR Return) */}
              {isAdmin && (
                <div className="glass-panel p-4 rounded-xl border-slate-800 space-y-3 bg-slate-900/10">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <ArrowRightLeft className="h-4 w-4" />
                    Admin Handshake Actions
                  </h5>

                  {activeBookings.length === 0 ? (
                    <p className="text-xs text-slate-450 italic">No approved reservations or active loans logged for this asset.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeBookings.map((b) => {
                        const isApproved = b.status === 'approved';
                        const isIssued = b.status === 'issued';

                        return (
                          <div key={b.booking_id} className="p-3 bg-slate-950/65 rounded-lg border border-slate-900 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-300">Booking #{b.booking_id}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                                isApproved ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {b.status}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 space-y-0.5">
                              <p>Borrower: <strong className="text-slate-300">{b.borrower_name}</strong> ({b.borrower_email})</p>
                              <p>Requested Quantity: <strong className="text-slate-300">{b.quantity} units</strong></p>
                            </div>

                            {/* Issue Form */}
                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => handleQRIssue(b.booking_id)}
                                disabled={actionLoading}
                                className="w-full bg-emerald-650 hover:bg-emerald-755 text-white py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>Issue Asset (Checkout)</span>
                              </button>
                            )}

                            {/* Return Form */}
                            {isIssued && (
                              <div className="space-y-2 pt-2 border-t border-slate-900/60">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Return Condition</label>
                                    <select
                                      value={returnCondition}
                                      onChange={(e) => setReturnCondition(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                                    >
                                      <option value="excellent">Excellent</option>
                                      <option value="good">Good</option>
                                      <option value="fair">Fair</option>
                                      <option value="poor">Poor</option>
                                      <option value="damaged">Damaged</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide font-sans">Damage / Maintenance details (if poor/damaged)</label>
                                  <input
                                    type="text"
                                    placeholder="Enter description of defect..."
                                    value={damageReport}
                                    onChange={(e) => setDamageReport(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleQRReturn(b.booking_id)}
                                  disabled={actionLoading}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>Log Return Check-in</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setScannedAsset(null)}
                  className="w-full bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 py-2 rounded-xl border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Reset Scanner Viewfinder
                </button>
              </div>
            </div>
          )}

          {/* Asset Select Dropdown (Simulating scan trigger) */}
          <div className="space-y-1.5 border-t border-slate-850/80 pt-4">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Simulate Asset QR scan</label>
            <div className="flex gap-2">
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                disabled={loadingAssets || isScanning || actionLoading}
                className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-350 focus:outline-none focus:border-violet-500/50 cursor-pointer disabled:opacity-50 font-sans"
              >
                <option value="">Choose equipment barcode to scan...</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name} (ID: {a.id})</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleSimulateScan(selectedAssetId)}
                disabled={!selectedAssetId || isScanning || actionLoading}
                className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                Scan Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
