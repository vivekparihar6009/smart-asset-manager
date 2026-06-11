import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../App';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  QrCode, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  AlertCircle, 
  Info,
  Check,
  RotateCcw,
  Wrench
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

const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];
const STATUSES = ['active', 'maintenance', 'damaged'];

const Assets = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Assets and Pagination States
  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 8
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); // Null for create, asset object for edit
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrCodeAsset, setQrCodeAsset] = useState(null);

  // Asset Details & Health History Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailedAsset, setDetailedAsset] = useState(null);
  const [detailedHistory, setDetailedHistory] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form Field States
  const [formFields, setFormFields] = useState({
    name: '',
    category: CATEGORIES[0],
    description: '',
    quantity_total: 1,
    condition: 'excellent',
    status: 'active'
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch Assets from API
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/assets', {
        params: {
          search: search || undefined,
          category: category || undefined,
          status: status || undefined,
          page,
          limit: pagination.limit
        }
      });
      setAssets(response.data.data.assets);
      setPagination(response.data.data.pagination);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError(err.message || 'An error occurred while loading assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [category, status, page]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPage(1);
    // Explicitly call fetch for cleared search
    setTimeout(() => {
      fetchAssets();
    }, 0);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingAsset(null);
    setFormFields({
      name: '',
      category: CATEGORIES[0],
      description: '',
      quantity_total: 1,
      condition: 'excellent',
      status: 'active'
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (asset) => {
    setEditingAsset(asset);
    setFormFields({
      name: asset.name,
      category: asset.category,
      description: asset.description || '',
      quantity_total: asset.quantity_total,
      condition: asset.condition,
      status: asset.status
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Asset Details & Maintenance History Timeline Modal
  const openDetailsModal = async (asset) => {
    setDetailedAsset(asset);
    setDetailedHistory([]);
    setIsDetailsModalOpen(true);
    try {
      setLoadingDetails(true);
      const response = await api.get(`/api/assets/${asset.id}`);
      setDetailedHistory(response.data.data.maintenanceHistory || []);
    } catch (err) {
      console.error('Failed to load asset details/history:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle Form Input Changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormFields(prev => ({
      ...prev,
      [name]: name === 'quantity_total' ? Math.max(0, parseInt(value, 10) || 0) : value
    }));
  };

  // Submit Create or Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formFields.name.trim()) {
      setFormError('Asset name is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');

      if (editingAsset) {
        // Edit Mode
        const response = await api.put(`/api/assets/${editingAsset.id}`, {
          name: formFields.name,
          category: formFields.category,
          description: formFields.description,
          quantity_total: formFields.quantity_total,
          condition: formFields.condition,
          status: formFields.status
        });
        
        // Update assets array
        setAssets(prev => prev.map(a => a.id === editingAsset.id ? response.data.data.asset : a));
      } else {
        // Create Mode
        const response = await api.post('/api/assets', {
          name: formFields.name,
          category: formFields.category,
          description: formFields.description,
          quantity_total: formFields.quantity_total,
          condition: formFields.condition
        });
        
        // Refresh items
        fetchAssets();
      }

      setIsFormModalOpen(false);
    } catch (err) {
      console.error('Failed to save asset:', err);
      setFormError(err.message || 'An error occurred while saving the asset.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (asset) => {
    setDeletingAsset(asset);
    setIsDeleteModalOpen(true);
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingAsset) return;
    try {
      setLoading(true);
      await api.delete(`/api/assets/${deletingAsset.id}`);
      setIsDeleteModalOpen(false);
      setDeletingAsset(null);
      
      // If we deleted the last item on the page, go to previous page
      const newPage = assets.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      fetchAssets();
    } catch (err) {
      console.error('Failed to delete asset:', err);
      setError(err.message || 'Failed to delete asset. Ensure it has no active reservations.');
      setIsDeleteModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Open QR Modal
  const openQRModal = (asset) => {
    setQrCodeAsset(asset);
    setIsQRModalOpen(true);
  };

  // Helper styles for badges
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'maintenance':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'damaged':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getConditionBadgeStyle = (condition) => {
    switch (condition) {
      case 'excellent':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'good':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'fair':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'poor':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'damaged':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTROL BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets by name or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <button
            type="submit"
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-violet-950/20 cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Action Buttons & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-9 pr-8 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-9 pr-8 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(stat => (
                <option key={stat} value={stat} className="capitalize">{stat}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(search || category || status) && (
            <button
              onClick={handleResetFilters}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-350 rounded-xl border border-slate-800 transition-colors flex items-center justify-center cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {/* Create Button (Admin Only) */}
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Asset
            </button>
          )}
        </div>
      </div>

      {/* 2. LOADING STATE */}
      {loading && assets.length === 0 ? (
        <div className="h-[50vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          <p className="text-slate-400 text-sm">Retrieving catalog records...</p>
        </div>
      ) : error ? (
        /* 3. ERROR STATE */
        <div className="glass-panel p-6 rounded-2xl border-red-500/20 max-w-lg mx-auto flex flex-col items-center text-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-100 font-sans">Query Error</h3>
            <p className="text-slate-400 text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={fetchAssets} 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      ) : assets.length === 0 ? (
        /* 4. EMPTY STATE */
        <div className="glass-panel py-16 px-6 rounded-2xl text-center max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="bg-slate-800/40 p-4 rounded-full text-slate-500 border border-slate-800/60">
            <Package className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200 uppercase tracking-wide">No Assets Found</h3>
            <p className="text-slate-400 text-sm mt-1.5">No equipment records matched the current search filters.</p>
          </div>
          {(search || category || status) && (
            <button
              onClick={handleResetFilters}
              className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 px-4 py-2 rounded-lg text-xs font-semibold border border-violet-500/20 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* 5. DATA RENDERING GRID */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <div 
                key={asset.id} 
                className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700/60 transition-all duration-300 group hover:-translate-y-0.5"
              >
                <div>
                  {/* Category and Status badges */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 px-2 py-0.5 bg-violet-950/20 border border-violet-850 rounded">
                      {asset.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 capitalize ${getStatusBadgeStyle(asset.status)}`}>
                      {asset.status}
                    </span>
                  </div>

                  {/* Asset Name and Details */}
                  <h3 className="text-base font-bold text-slate-100 line-clamp-1 mb-1" title={asset.name}>
                    {asset.name}
                  </h3>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 h-8 mb-4">
                    {asset.description || 'No description provided.'}
                  </p>

                  {/* Quantities indicator */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/40 rounded-xl border border-slate-800/50 mb-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Total Stock</p>
                      <p className="font-bold text-slate-200 mt-0.5">{asset.quantity_total}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Available</p>
                      <p className={`font-bold mt-0.5 ${asset.quantity_available > 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                        {asset.quantity_available}
                      </p>
                    </div>
                  </div>

                  {/* Condition badge */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-350">
                    <span>Condition:</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 capitalize ${getConditionBadgeStyle(asset.condition)}`}>
                      {asset.condition}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-slate-800/80 mt-4.5 pt-3">
                  {/* Action buttons left side (QR Code & Details) */}
                  <div className="flex items-center gap-2">
                    {asset.qr_code_base64 && (
                      <button
                        onClick={() => openQRModal(asset)}
                        className="text-slate-400 hover:text-violet-400 p-2 rounded-lg bg-slate-900/60 hover:bg-violet-955/20 border border-slate-800 hover:border-violet-500/20 transition-all cursor-pointer"
                        title="View QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openDetailsModal(asset)}
                      className="text-slate-400 hover:text-teal-400 p-2 rounded-lg bg-slate-900/60 hover:bg-teal-955/20 border border-slate-800 hover:border-teal-500/20 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title="Asset Details & History"
                    >
                      <Info className="h-4 w-4" />
                      <span>Details</span>
                    </button>
                  </div>

                  {/* Admin Edits */}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(asset)}
                        className="text-slate-400 hover:text-amber-400 p-2 rounded-lg bg-slate-900/60 hover:bg-amber-955/20 border border-slate-800 hover:border-amber-500/20 transition-all cursor-pointer"
                        title="Edit Asset"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(asset)}
                        className="text-slate-400 hover:text-red-400 p-2 rounded-lg bg-slate-900/60 hover:bg-red-955/20 border border-slate-800 hover:border-red-500/20 transition-all cursor-pointer"
                        title="Delete Asset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION METADATA AND CONTROLS */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-850/80 pt-6 gap-4 text-sm">
              <p className="text-slate-400">
                Showing <span className="font-semibold text-slate-200">{assets.length}</span> of{' '}
                <span className="font-semibold text-slate-200">{pagination.totalItems}</span> assets
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
                         ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-950/20'
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
        </>
      )}

      {/* 6. CREATE / EDIT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Package className="h-5 w-5 text-violet-400" />
                {editingAsset ? 'Modify Asset Details' : 'Register New Asset'}
              </h3>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Asset Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Asset Name</label>
                <input
                  type="text"
                  name="name"
                  value={formFields.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Sony Alpha 7 IV"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</label>
                  <select
                    name="category"
                    value={formFields.category}
                    onChange={handleFormChange}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-355 focus:outline-none focus:border-violet-500/50 cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Total Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Quantity</label>
                  <input
                    type="number"
                    name="quantity_total"
                    value={formFields.quantity_total}
                    onChange={handleFormChange}
                    min="0"
                    placeholder="1"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Description Details</label>
                <textarea
                  name="description"
                  value={formFields.description}
                  onChange={handleFormChange}
                  rows="3"
                  placeholder="Provide hardware specs, serial number, storage location, or accessories included..."
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Condition Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Condition</label>
                  <select
                    name="condition"
                    value={formFields.condition}
                    onChange={handleFormChange}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-355 focus:outline-none focus:border-violet-500/50 cursor-pointer capitalize"
                  >
                    {CONDITIONS.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>

                {/* Status Selection (Only for Edit Mode) */}
                {editingAsset && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Operational Status</label>
                    <select
                      name="status"
                      value={formFields.status}
                      onChange={handleFormChange}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-355 focus:outline-none focus:border-violet-500/50 cursor-pointer capitalize"
                    >
                      {STATUSES.map(stat => (
                        <option key={stat} value={stat}>{stat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-305 px-4.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-violet-650 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-violet-955 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingAsset ? 'Save Changes' : 'Create Asset'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-red-500/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto bg-red-500/10 text-red-500 p-3 rounded-full w-fit border border-red-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-slate-100 font-sans">Delete Equipment Record?</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Are you sure you want to permanently delete <strong className="text-slate-200">"{deletingAsset?.name}"</strong>? This will cascade-delete all related booking history records and maintenance tickets.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setDeletingAsset(null); }}
                  className="bg-slate-850 hover:bg-slate-805 text-slate-300 px-4.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  No, Keep it
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/20 cursor-pointer"
                >
                  Yes, Delete Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. QR CODE PREVIEW MODAL */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                <QrCode className="h-4.5 w-4.5 text-violet-400" />
                Asset QR Label
              </h3>
              <button 
                onClick={() => { setIsQRModalOpen(false); setQrCodeAsset(null); }}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center text-center gap-4 bg-slate-950/25">
              <div className="bg-white p-4 rounded-2xl shadow-xl">
                <img 
                  src={qrCodeAsset?.qr_code_base64} 
                  alt={`QR Code for ${qrCodeAsset?.name}`} 
                  className="h-44 w-44 object-contain"
                />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-100 line-clamp-1">{qrCodeAsset?.name}</h4>
                <p className="text-xs text-slate-405 capitalize mt-0.5">{qrCodeAsset?.category} • ID: {qrCodeAsset?.id}</p>
              </div>

              <div className="w-full flex flex-col gap-2 pt-2 text-xs text-slate-500 font-sans border-t border-slate-900">
                <div className="flex items-center justify-between">
                  <span>Current Status:</span>
                  <span className="font-semibold text-slate-300 capitalize">{qrCodeAsset?.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Condition:</span>
                  <span className="font-semibold text-slate-300 capitalize">{qrCodeAsset?.condition}</span>
                </div>
              </div>

              <a
                href={qrCodeAsset?.qr_code_base64}
                download={`QR_${qrCodeAsset?.name.replace(/\s+/g, '_')}.png`}
                className="w-full bg-violet-650 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-violet-955 cursor-pointer"
              >
                Download PNG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 9. ASSET DETAILS & TIMELINE MODAL */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-205 flex items-center gap-2 uppercase tracking-wider">
                <Info className="h-4.5 w-4.5 text-teal-400" />
                Asset Information Hub
              </h3>
              <button 
                onClick={() => { setIsDetailsModalOpen(false); setDetailedAsset(null); }}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-905 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Asset overview */}
              <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-850/80 space-y-2">
                <h4 className="text-base font-bold text-slate-200">{detailedAsset?.name}</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">{detailedAsset?.category} • ID: #{detailedAsset?.id}</p>
                <p className="text-xs text-slate-350 leading-relaxed pt-1">{detailedAsset?.description || 'No detailed specifications provided.'}</p>
              </div>

              {/* Maintenance timeline */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850/60 pb-1.5 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-violet-400" />
                  Health Status & Repair Timeline
                </h5>

                {loadingDetails ? (
                  <div className="py-8 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
                    <span className="text-xs text-slate-400">Fetching maintenance logs...</span>
                  </div>
                ) : detailedHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 italic">
                    This asset is in pristine condition. No repair or calibration events logged.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-800 pl-4 ml-2.5 space-y-5">
                    {detailedHistory.map((log) => {
                      const isResolved = log.status === 'resolved';
                      return (
                        <div key={log.id} className="relative space-y-1 text-xs">
                          {/* Dot indicator on timeline */}
                          <div className={`absolute -left-[22.5px] top-1 h-3 w-3 rounded-full border-2 ${
                            isResolved 
                              ? 'bg-emerald-500 border-slate-950' 
                              : 'bg-red-500 border-slate-950'
                          }`}></div>

                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-300">Issue Ticket #{log.id}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              isResolved 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {log.status}
                            </span>
                          </div>

                          <p className="text-slate-400 leading-normal">{log.issue_description}</p>

                          <div className="flex flex-wrap items-center justify-between text-[9px] text-slate-550 pt-0.5 font-sans">
                            <p>Reported by: <span className="text-slate-400">{log.reported_by_name || 'System Auto'}</span></p>
                            <p>{new Date(log.created_at).toLocaleDateString()}</p>
                          </div>

                          {isResolved && (
                            <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded border border-slate-800/60 text-[10px] text-slate-400 mt-1.5 font-mono">
                              <span>Repair Cost: INR {log.cost}</span>
                              <span>Resolved: {new Date(log.resolved_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
