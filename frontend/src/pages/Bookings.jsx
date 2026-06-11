import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../App';
import { 
  Calendar, 
  Clock, 
  Check, 
  X, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Loader2, 
  BookOpen, 
  Info,
  ChevronRight, 
  History, 
  ShoppingCart,
  User,
  HelpCircle,
  FileText
} from 'lucide-react';

const CATEGORIES = [
  'DSLR Cameras',
  'Studio Lighting Equipment',
  'Audio Systems',
  'Costumes',
  'Stage Props',
  'Recording Equipment',
  'Event Infrastructure'
];

const Bookings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'new'

  // History states
  const [bookings, setBookings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  // Asset list (for request dropdown selection)
  const [assetsList, setAssetsList] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('sam_booking_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (err) {
      console.error('Failed to load cart from localStorage:', err);
      return [];
    }
  });
  
  // Selection states (for currently chosen asset to add)
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState(null); // { quantityAvailable, assetName }
  const [selectionError, setSelectionError] = useState('');

  // Global submit states
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch borrowing history
  const fetchMyBookings = async () => {
    try {
      setLoadingHistory(true);
      setHistoryError('');
      const response = await api.get('/api/bookings/my');
      setBookings(response.data.data.bookings);
    } catch (err) {
      console.error('Failed to load personal bookings:', err);
      setHistoryError(err.message || 'An error occurred while loading your booking history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch active assets for selection dropdown
  const fetchAssetsList = async () => {
    try {
      setLoadingAssets(true);
      const response = await api.get('/api/assets', { params: { limit: 100 } });
      // Only show active assets for new bookings
      const activeAssets = response.data.data.assets.filter(a => a.status === 'active');
      setAssetsList(activeAssets);
    } catch (err) {
      console.error('Failed to load assets list:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
    fetchAssetsList();
  }, []);

  // Pre-select asset if navigated from catalog with selectAsset param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectAssetId = params.get('selectAsset');
    if (selectAssetId && assetsList.length > 0) {
      const exists = assetsList.some(a => a.id === parseInt(selectAssetId, 10));
      if (exists) {
        // Add to cart directly if not already in cart
        const asset = assetsList.find(a => a.id === parseInt(selectAssetId, 10));
        if (asset) {
          const cartExists = cart.some(item => item.asset_id === asset.id);
          if (!cartExists) {
            setCart(prev => [
              ...prev,
              {
                asset_id: asset.id,
                name: asset.name,
                category: asset.category,
                quantity: 1,
                quantityAvailable: asset.quantity_available
              }
            ]);
          }
        }
        setActiveTab('new');
        // Clean URL query parameter so it doesn't run on fresh reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [assetsList]);

  // Synchronize cart state back to localStorage
  useEffect(() => {
    localStorage.setItem('sam_booking_cart', JSON.stringify(cart));
  }, [cart]);

  // Check availability when date range or selected asset changes
  useEffect(() => {
    const checkSelectedAvailability = async () => {
      if (!selectedAssetId || !startDate || !endDate) {
        setSelectedAvailability(null);
        setSelectionError('');
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        setSelectionError('Start date cannot be after end date.');
        setSelectedAvailability(null);
        return;
      }

      const today = new Date();
      today.setHours(0,0,0,0);
      if (new Date(startDate) < today) {
        setSelectionError('Start date cannot be in the past.');
        setSelectedAvailability(null);
        return;
      }

      try {
        setCheckingAvailability(true);
        setSelectionError('');
        const response = await api.get('/api/bookings/availability', {
          params: {
            asset_id: selectedAssetId,
            start_date: startDate,
            end_date: endDate
          }
        });
        setSelectedAvailability(response.data.data);
      } catch (err) {
        console.error('Availability check failed:', err);
        setSelectionError(err.message || 'Failed to verify availability.');
        setSelectedAvailability(null);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkSelectedAvailability();
  }, [selectedAssetId, startDate, endDate]);

  // Recalculate cart availability dynamically when dates change
  useEffect(() => {
    const refreshCartAvailability = async () => {
      if (cart.length === 0 || !startDate || !endDate || new Date(startDate) > new Date(endDate)) {
        return;
      }

      const updatedCart = [...cart];
      for (let i = 0; i < updatedCart.length; i++) {
        try {
          const response = await api.get('/api/bookings/availability', {
            params: {
              asset_id: updatedCart[i].asset_id,
              start_date: startDate,
              end_date: endDate
            }
          });
          updatedCart[i].quantityAvailable = response.data.data.quantityAvailable;
        } catch (err) {
          console.error(`Failed to refresh availability for asset ${updatedCart[i].asset_id}:`, err);
        }
      }
      setCart(updatedCart);
    };

    refreshCartAvailability();
  }, [startDate, endDate]);

  // Add Item to cart
  const handleAddToCart = () => {
    if (!selectedAssetId) return;

    const asset = assetsList.find(a => a.id === parseInt(selectedAssetId, 10));
    if (!asset) return;

    const availableQty = selectedAvailability ? selectedAvailability.quantityAvailable : 0;

    // Verify quantity limits
    if (selectedQty <= 0) {
      setSelectionError('Quantity must be greater than zero.');
      return;
    }

    if (selectedQty > availableQty) {
      setSelectionError(`Conflict: Only ${availableQty} units are available during these dates.`);
      return;
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(item => item.asset_id === asset.id);
    if (existingIndex > -1) {
      const newQty = cart[existingIndex].quantity + selectedQty;
      if (newQty > availableQty) {
        setSelectionError(`Conflict: Combined cart quantity (${newQty}) exceeds available stock (${availableQty}).`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity = newQty;
      setCart(updatedCart);
    } else {
      setCart(prev => [
        ...prev,
        {
          asset_id: asset.id,
          name: asset.name,
          category: asset.category,
          quantity: selectedQty,
          quantityAvailable: availableQty
        }
      ]);
    }

    // Reset selectors
    setSelectedAssetId('');
    setSelectedQty(1);
    setSelectedAvailability(null);
    setSelectionError('');
  };

  // Remove Item from cart
  const handleRemoveFromCart = (assetId) => {
    setCart(prev => prev.filter(item => item.asset_id !== assetId));
  };

  // Submit Booking Request
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    // Validations
    if (!startDate || !endDate) {
      setSubmitError('Please select both start and end dates.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setSubmitError('Start date cannot be after end date.');
      return;
    }
    if (!purpose.trim()) {
      setSubmitError('Please provide a purpose for the request.');
      return;
    }
    if (cart.length === 0) {
      setSubmitError('Your cart is empty. Add at least one asset.');
      return;
    }

    // Double check availability
    const conflict = cart.find(item => item.quantity > item.quantityAvailable);
    if (conflict) {
      setSubmitError(`Conflict: "${conflict.name}" exceeds available stock (${conflict.quantityAvailable}) for selected dates.`);
      return;
    }

    try {
      setSubmitting(true);
      const itemsPayload = cart.map(item => ({
        asset_id: item.asset_id,
        quantity: item.quantity
      }));

      await api.post('/api/bookings', {
        start_date: startDate,
        end_date: endDate,
        purpose: purpose,
        items: itemsPayload
      });

      setSubmitSuccess('Booking request submitted successfully! Pending approval.');
      
      // Reset form fields
      setStartDate('');
      setEndDate('');
      setPurpose('');
      setCart([]);
      
      // Reload history and redirect to history tab
      fetchMyBookings();
      setTimeout(() => {
        setActiveTab('history');
        setSubmitSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Submit booking failed:', err);
      setSubmitError(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper styles for status badges
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'approved':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'issued':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'returned':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TABS NAVIGATION */}
      <div className="flex border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-violet-500 text-violet-400 bg-violet-600/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          My Borrowings
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'new'
              ? 'border-violet-500 text-violet-400 bg-violet-600/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Request Equipment
        </button>
      </div>

      {/* 2. TAB CONTENT: BOOKING REQUEST FORM */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Booking Form */}
          <form onSubmit={handleSubmitBooking} className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
              <Calendar className="h-5 w-5 text-violet-400" />
              Request Details
            </h3>

            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && new Date(e.target.value) > new Date(endDate)) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-250 focus:outline-none focus:border-violet-500/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">End Date (Due Date)</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-250 focus:outline-none focus:border-violet-500/50"
                  required
                />
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Borrowing Purpose</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Explain what the equipment will be used for (e.g. cultural festival stage lighting, photography workshop)..."
                rows="3"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder-slate-550 focus:outline-none focus:border-violet-500/50 resize-none"
                required
              />
            </div>

            {/* Cart Display */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-405 uppercase tracking-wider">Allocation Items ({cart.length})</h4>
                {cart.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setCart([])} 
                    className="text-xs text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                  Cart is empty. Select assets from the side catalog panel.
                </div>
              ) : (
                <div className="border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800/60">
                  {cart.map((item) => {
                    const hasConflict = item.quantity > item.quantityAvailable;
                    return (
                      <div key={item.asset_id} className={`flex items-center justify-between p-3.5 bg-slate-900/20 ${hasConflict ? 'bg-red-500/5' : ''}`}>
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{item.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{item.category}</p>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* Availability visual checking */}
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400">Qty: </span>
                            <span className="font-bold text-slate-200">{item.quantity}</span>
                            <div className="mt-0.5">
                              {hasConflict ? (
                                <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                                  Conflict: Only {item.quantityAvailable} available
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                  Available: {item.quantityAvailable}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.asset_id)}
                            className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-950/20 border border-transparent hover:border-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submission buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setPurpose('');
                  setCart([]);
                  setActiveTab('history');
                }}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || cart.length === 0 || cart.some(item => item.quantity > item.quantityAvailable)}
                className="bg-violet-650 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-violet-950/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Asset Drawer selector (Right sidebar helper) */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-400" />
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Add Items</h4>
            </div>
            
            <p className="text-xs text-slate-400">
              Select an operational asset and configure borrow quantities to queue them in your request bundle.
            </p>

            {/* Asset select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset</label>
              <select
                value={selectedAssetId}
                onChange={(e) => {
                  setSelectedAssetId(e.target.value);
                  setSelectedQty(1);
                }}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-350 focus:outline-none focus:border-violet-500/50 cursor-pointer"
              >
                <option value="">Select Equipment...</option>
                {/* Group by category */}
                {CATEGORIES.map(categoryName => {
                  const assetsInCat = assetsList.filter(a => a.category === categoryName);
                  if (assetsInCat.length === 0) return null;
                  return (
                    <optgroup key={categoryName} label={categoryName} className="bg-slate-900 text-slate-300 font-sans">
                      {assetsInCat.map(asset => (
                        <option key={asset.id} value={asset.id} className="bg-slate-900">
                          {asset.name} (Total: {asset.quantity_total})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Availability Checker Response visualizer */}
            {selectedAssetId && (
              <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2 text-xs">
                {checkingAvailability ? (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin" />
                    <span>Verifying date calendar availability...</span>
                  </div>
                ) : selectionError ? (
                  <div className="flex items-center gap-2 text-rose-400 py-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{selectionError}</span>
                  </div>
                ) : selectedAvailability ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-450">Active Range Status:</span>
                      <span className={`font-semibold ${selectedAvailability.quantityAvailable > 0 ? 'text-emerald-450' : 'text-red-400'}`}>
                        {selectedAvailability.quantityAvailable > 0 ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-455">Total Stock:</span>
                      <span className="text-slate-300 font-semibold">{selectedAvailability.quantityTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-455">Overlapping Booked:</span>
                      <span className="text-slate-305">{selectedAvailability.quantityBooked}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5 mt-1">
                      <span className="font-semibold text-slate-400">Available Limit:</span>
                      <span className="font-bold text-violet-400 text-sm">{selectedAvailability.quantityAvailable}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 py-1">
                    <Info className="h-4 w-4" />
                    <span>Enter date range to check availability.</span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity select */}
            {selectedAssetId && selectedAvailability && selectedAvailability.quantityAvailable > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min="1"
                    max={selectedAvailability.quantityAvailable}
                    className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: BOOKING HISTORY LIST */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="h-[40vh] flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
              <p className="text-slate-400 text-sm">Compiling borrow transactions...</p>
            </div>
          ) : historyError ? (
            <div className="glass-panel p-6 rounded-2xl border-red-500/20 max-w-lg mx-auto flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">Failed to Load History</h3>
                <p className="text-slate-400 text-sm mt-1">{historyError}</p>
              </div>
              <button 
                onClick={fetchMyBookings} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="glass-panel py-16 px-6 rounded-2xl text-center max-w-md mx-auto flex flex-col items-center gap-4">
              <div className="bg-slate-800/40 p-4 rounded-full text-slate-500 border border-slate-800/60">
                <BookOpen className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200 uppercase tracking-wide">No Booking History</h3>
                <p className="text-slate-400 text-sm mt-1.5">You have not requested or checked out any council equipment yet.</p>
              </div>
              <button
                onClick={() => setActiveTab('new')}
                className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 px-4 py-2 rounded-lg text-xs font-semibold border border-violet-500/20 transition-colors cursor-pointer"
              >
                Request First Asset
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="glass-panel rounded-2xl p-5 border border-slate-800/60 flex flex-col gap-4">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-violet-400 font-bold">#{booking.id}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">• Requested on {new Date(booking.created_at).toLocaleDateString()}</span>
                    </div>

                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 w-fit ${getStatusBadgeStyle(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>

                  {/* Card Details: Dates & Purpose */}
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

                    {booking.status === 'issued' && (
                      <div className="space-y-1">
                        <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          Return Deadline
                        </p>
                        <p className="text-slate-300 font-medium font-mono">
                          {new Date(booking.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <div className="md:col-span-2 space-y-1">
                      <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1">
                        <FileText className="h-3 w-3 text-slate-500" />
                        Borrow Purpose
                      </p>
                      <p className="text-slate-300 line-clamp-1">{booking.purpose}</p>
                    </div>
                  </div>

                  {/* Rejection comments drawer */}
                  {booking.status === 'rejected' && booking.remarks && (
                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400 font-sans">
                      <strong>Rejection remarks: </strong> {booking.remarks}
                    </div>
                  )}

                  {/* Booking items list */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Booked Items</h4>
                    <div className="bg-slate-950/20 rounded-xl border border-slate-900 overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-900">
                            <th className="py-2 px-3">Asset</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Fulfillment Logs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/40 text-slate-300">
                          {booking.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/10">
                              <td className="py-2.5 px-3 font-medium text-slate-200">{item.asset_name || 'Deleted Asset'}</td>
                              <td className="py-2.5 px-3 text-slate-500 capitalize">{item.category}</td>
                              <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                              <td className="py-2.5 px-3 text-right text-[10px] font-mono text-slate-400">
                                {item.issued_at ? (
                                  <div>
                                    <span className="text-emerald-500 font-sans">Checked Out </span>
                                    {new Date(item.issued_at).toLocaleDateString()}
                                    {item.returned_at && (
                                      <div>
                                        <span className="text-slate-500 font-sans">Checked In </span>
                                        {new Date(item.returned_at).toLocaleDateString()} 
                                        {item.return_condition && ` (${item.return_condition})`}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-550">Not checked out yet</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Bookings;
