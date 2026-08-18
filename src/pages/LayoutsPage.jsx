import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, Sliders, Plus, Edit2, Copy, Trash2, ArrowLeft, ArrowUp, ArrowDown, 
  Search, Check, Play, Settings, AlertCircle, X, Filter, ListOrdered
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function LayoutsPage() {
  const { variant } = useParams();
  
  // Zustand store data
  const excelTasks = useStore(state => state.excelTasks || []);
  const layouts = useStore(state => state.layouts || []);
  const addLayout = useStore(state => state.addLayout);
  const updateLayout = useStore(state => state.updateLayout);
  const deleteLayout = useStore(state => state.deleteLayout);
  const loadDatabase = useStore(state => state.loadDatabase);

  // Layout View Modes
  // 'list' | 'create' | 'edit' | 'view'
  const [mode, setMode] = useState('list');
  const [activeLayoutId, setActiveLayoutId] = useState(null);

  // Active form state for editing/creating layouts
  const [layoutForm, setLayoutForm] = useState({
    name: '',
    columns: [],
    filters: []
  });

  // Viewer state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Dynamically extract all Excel column keys from excelTasks
  const availableColumns = useMemo(() => {
    if (excelTasks.length === 0) return [];
    const keys = new Set();
    excelTasks.forEach(t => {
      Object.keys(t).forEach(k => {
        if (k !== 'rawRow' && k !== 'sno' && k !== 'owners' && k !== 'todayFTs' && k !== 'dailyRemarks' && k !== 'last_updated') {
          keys.add(k);
        }
      });
    });
    return Array.from(keys);
  }, [excelTasks]);

  // Map camelCase keys to human-readable names
  const getColLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Id', 'ID')
      .replace('Sw', 'SW')
      .replace('Otd', 'OTD')
      .replace('Ftr', 'FTR')
      .replace('Pt', 'PT')
      .replace('Cdr', 'CDR');
  };

  // Get unique values in a column dynamically for filters
  const getColUniqueValues = (key) => {
    if (!key || excelTasks.length === 0) return [];
    return [...new Set(excelTasks.map(t => t[key]))]
      .filter(v => v !== undefined && v !== null && v !== '')
      .map(String)
      .sort();
  };

  // Switch to layout creation form
  const handleOpenCreate = () => {
    setLayoutForm({
      name: '',
      columns: availableColumns.slice(0, 5), // default select first 5
      filters: []
    });
    setMode('create');
  };

  // Switch to layout editing form
  const handleOpenEdit = (layout) => {
    setLayoutForm({
      name: layout.name,
      columns: layout.columns || [],
      filters: layout.filters || []
    });
    setActiveLayoutId(layout.id);
    setMode('edit');
  };

  // Duplicate a layout
  const handleDuplicate = (layout) => {
    addLayout({
      name: `${layout.name} (Copy)`,
      columns: [...layout.columns],
      filters: layout.filters ? JSON.parse(JSON.stringify(layout.filters)) : []
    });
  };

  // Save the form (create or update)
  const handleSave = () => {
    if (!layoutForm.name.trim()) {
      alert('Please enter a Layout Name.');
      return;
    }
    if (layoutForm.columns.length === 0) {
      alert('Please select at least one column to display.');
      return;
    }

    if (mode === 'create') {
      addLayout(layoutForm);
    } else {
      updateLayout(activeLayoutId, layoutForm);
    }
    setMode('list');
  };

  // Delete layout
  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this custom layout? The original Excel data will not be modified.')) {
      deleteLayout(id);
    }
  };

  // Open viewer mode
  const handleOpenView = (layoutId) => {
    setActiveLayoutId(layoutId);
    setSearchQuery('');
    setCurrentPage(1);
    setMode('view');
  };

  const activeLayoutObj = useMemo(() => {
    return layouts.find(l => l.id === activeLayoutId) || null;
  }, [layouts, activeLayoutId]);

  // Reordering helpers
  const moveColumn = (index, direction) => {
    const cols = [...layoutForm.columns];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= cols.length) return;
    
    // Swap columns
    const temp = cols[index];
    cols[index] = cols[targetIdx];
    cols[targetIdx] = temp;
    
    setLayoutForm({ ...layoutForm, columns: cols });
  };

  // Toggle selected columns
  const handleToggleColumn = (col) => {
    let cols = [...layoutForm.columns];
    if (cols.includes(col)) {
      cols = cols.filter(c => c !== col);
    } else {
      cols.push(col);
    }
    setLayoutForm({ ...layoutForm, columns: cols });
  };

  // Filter configuration helpers
  const handleAddFilter = () => {
    setLayoutForm({
      ...layoutForm,
      filters: [...layoutForm.filters, { column: availableColumns[0] || '', operator: 'equals', value: '' }]
    });
  };

  const handleRemoveFilter = (index) => {
    setLayoutForm({
      ...layoutForm,
      filters: layoutForm.filters.filter((_, idx) => idx !== index)
    });
  };

  const handleUpdateFilter = (index, field, val) => {
    const updatedFilters = layoutForm.filters.map((f, idx) => {
      if (idx !== index) return f;
      const updated = { ...f, [field]: val };
      if (field === 'column') {
        updated.value = ''; // reset value if column changes
      }
      return updated;
    });
    setLayoutForm({ ...layoutForm, filters: updatedFilters });
  };

  // Filter and process tasks list based on a layout config
  const processLayoutData = (layout, searchStr) => {
    if (!layout || excelTasks.length === 0) return [];
    
    let result = excelTasks;
    const filterConfig = layout.filters || [];

    // Apply layout filters
    filterConfig.forEach(f => {
      const col = f.column;
      const op = f.operator;
      const val = String(f.value).toLowerCase().trim();
      
      if (!col) return;
      
      result = result.filter(t => {
        const itemVal = String(t[col] !== undefined ? t[col] : '').toLowerCase().trim();
        switch (op) {
          case 'equals':
            return itemVal === val;
          case 'not_equals':
            return itemVal !== val;
          case 'contains':
            return itemVal.includes(val);
          case 'starts_with':
            return itemVal.startsWith(val);
          case 'ends_with':
            return itemVal.endsWith(val);
          case 'greater_than':
            return Number(itemVal) > Number(val);
          case 'less_than':
            return Number(itemVal) < Number(val);
          default:
            return true;
        }
      });
    });

    // Apply search query
    if (searchStr) {
      const q = searchStr.toLowerCase().trim();
      result = result.filter(t => {
        return layout.columns.some(col => 
          String(t[col] || '').toLowerCase().includes(q)
        );
      });
    }

    return result;
  };

  // Preview tasks based on form data (for creator/editor view)
  const previewTasks = useMemo(() => {
    return processLayoutData(layoutForm, '');
  }, [excelTasks, layoutForm]);

  // Viewer tasks
  const viewerTasks = useMemo(() => {
    return processLayoutData(activeLayoutObj, searchQuery);
  }, [excelTasks, activeLayoutObj, searchQuery]);

  // Paginated tasks for viewer
  const paginatedViewerTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return viewerTasks.slice(startIndex, startIndex + pageSize);
  }, [viewerTasks, currentPage, pageSize]);

  const totalViewerPages = Math.ceil(viewerTasks.length / pageSize);

  // Reset viewer pagination on search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* -------------------- 1. LIST MODE -------------------- */}
      {mode === 'list' && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={28} color="var(--primary)" /> Custom Table Layouts
              </h1>
              <p className="subtitle">Build, customize, and save tailored task grids dynamically from Excel.</p>
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', padding: '10px 20px' }}
            >
              <Plus size={18} /> Create Layout
            </button>
          </div>

          {/* Warning if no Excel tasks are available */}
          {excelTasks.length === 0 && (
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.05)', 
              border: '1px solid rgba(245, 158, 11, 0.15)', 
              borderRadius: '12px', 
              padding: '20px', 
              display: 'flex', 
              gap: '16px' 
            }}>
              <AlertCircle size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: 0, color: 'var(--warning)', fontSize: '1rem', fontWeight: 700 }}>Excel Workbook Data Missing</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  There are currently no tasks imported in the Excel database. Please go to the **Manager Hub** page first to scan and load the Excel delivery workbook.
                </p>
              </div>
            </div>
          )}

          {/* Grid Layout Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {layouts.map(layout => (
              <div key={layout.id} className="card glass hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                    {layout.name}
                  </h3>
                  <FileText size={18} color="var(--primary)" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Columns display: <strong>{layout.columns?.length || 0} columns</strong></span>
                  <span>Active Filters: <strong>{layout.filters?.length || 0} filters</strong></span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <button 
                    onClick={() => handleOpenView(layout.id)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', gap: '4px' }}
                  >
                    <Play size={14} /> Open
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(layout)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem' }}
                    title="Edit Layout"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDuplicate(layout)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem' }}
                    title="Duplicate Layout"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(layout.id)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.15)' }}
                    title="Delete Layout"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {layouts.length === 0 && excelTasks.length > 0 && (
              <div className="card" style={{ gridColumn: '1 / -1', padding: '50px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sliders size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <h3 style={{ margin: 0, color: 'var(--text)' }}>No Custom Layouts Found</h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>Create a custom layout to select specific table columns and filter delivery data.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* -------------------- 2. CREATE / EDIT VIEW -------------------- */}
      {(mode === 'create' || mode === 'edit') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setMode('list')} 
                className="btn btn-secondary"
                style={{ padding: '8px 12px', borderRadius: '8px' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                  {mode === 'create' ? 'Build Custom Layout' : 'Edit Layout'}
                </h1>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configure layout name, column structure, order, and rules.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setMode('list')} className="btn btn-secondary" style={{ borderRadius: '8px' }}>
                Cancel
              </button>
              <button onClick={handleSave} className="btn btn-primary" style={{ borderRadius: '8px', padding: '8px 24px' }}>
                Save Layout
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
            {/* Left Panel: Name, Columns configuration, and Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Layout Name Card */}
              <div className="card glass" style={{ padding: '24px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Layout Title / Table Name</span>
                  <input 
                    type="text" 
                    placeholder="Enter Layout name (e.g., delivered_vsm_summary)..." 
                    value={layoutForm.name}
                    onChange={(e) => setLayoutForm({ ...layoutForm, name: e.target.value })}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', width: '100%', background: 'white' }}
                  />
                </label>
              </div>

              {/* Column Selectors Grid */}
              <div className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListOrdered size={18} color="var(--primary)" /> 1. Select Columns to Display
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {availableColumns.map(col => {
                    const isChecked = layoutForm.columns.includes(col);
                    return (
                      <label 
                        key={col} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '8px 12px', 
                          borderRadius: '8px', 
                          border: `1px solid ${isChecked ? 'rgba(37,99,235,0.2)' : 'var(--border)'}`,
                          background: isChecked ? 'rgba(37,99,235,0.03)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleColumn(col)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 'normal' }}>{getColLabel(col)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Filter Configuration */}
              <div className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={18} color="var(--purple)" /> 2. Configure Filters (Optional)
                  </h2>
                  <button 
                    onClick={handleAddFilter}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add Filter Rule
                  </button>
                </div>

                {layoutForm.filters.length === 0 ? (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                    No filter rules applied. Showing all tasks in the selected columns.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {layoutForm.filters.map((filter, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        
                        {/* Select Column */}
                        <select 
                          value={filter.column}
                          onChange={(e) => handleUpdateFilter(idx, 'column', e.target.value)}
                          style={{ flex: 1.2, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem', background: 'white' }}
                        >
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{getColLabel(col)}</option>
                          ))}
                        </select>

                        {/* Select Operator */}
                        <select 
                          value={filter.operator}
                          onChange={(e) => handleUpdateFilter(idx, 'operator', e.target.value)}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem', background: 'white' }}
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="starts_with">Starts With</option>
                          <option value="ends_with">Ends With</option>
                          <option value="greater_than">&gt; (Greater Than)</option>
                          <option value="less_than">&lt; (Less Than)</option>
                        </select>

                        {/* Datalist Input to support free-text AND unique Excel options */}
                        <div style={{ flex: 1.5, position: 'relative' }}>
                          <input 
                            list={`unique-vals-${idx}`} 
                            placeholder="Enter or select value..."
                            value={filter.value}
                            onChange={(e) => handleUpdateFilter(idx, 'value', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem', background: 'white' }}
                          />
                          <datalist id={`unique-vals-${idx}`}>
                            {getColUniqueValues(filter.column).map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </datalist>
                        </div>

                        <button 
                          onClick={() => handleRemoveFilter(idx)}
                          className="btn btn-icon-sm"
                          style={{ padding: '6px', color: 'var(--danger)' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Panel: Column Ordering */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListOrdered size={18} color="var(--success)" /> Column Order
                </h2>
                
                {layoutForm.columns.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No columns selected. Check columns on the left to include them.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {layoutForm.columns.map((col, idx) => (
                      <div 
                        key={col} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '8px 12px', 
                          background: '#f8fafc', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {idx + 1}. {getColLabel(col)}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button 
                            onClick={() => moveColumn(idx, -1)}
                            disabled={idx === 0}
                            style={{ border: 'none', background: 'transparent', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            onClick={() => moveColumn(idx, 1)}
                            disabled={idx === layoutForm.columns.length - 1}
                            style={{ border: 'none', background: 'transparent', cursor: idx === layoutForm.columns.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === layoutForm.columns.length - 1 ? 0.3 : 1 }}
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Preview Table */}
          <div className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Live Layout Preview (Matches found: {previewTasks.length})
            </h2>
            
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem', background: 'white' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '50px', borderRight: '1px solid var(--border)' }}>#</th>
                    {layoutForm.columns.map(col => (
                      <th key={col} style={{ padding: '8px 12px', textAlign: 'left', borderRight: '1px solid var(--border)' }}>
                        {getColLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewTasks.slice(0, 5).map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', textAlign: 'center', background: '#f8fafc', borderRight: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </td>
                      {layoutForm.columns.map(col => (
                        <td key={col} style={{ padding: '8px 12px', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {t[col] !== undefined && t[col] !== null ? String(t[col]) : '--'}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {previewTasks.length === 0 && (
                    <tr>
                      <td colSpan={layoutForm.columns.length + 1} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No records match the active layout and filter settings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {previewTasks.length > 5 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Showing first 5 preview rows. Open layout to view all {previewTasks.length} matching rows.
              </span>
            )}
          </div>

        </div>
      )}

      {/* -------------------- 3. VIEWER MODE -------------------- */}
      {mode === 'view' && activeLayoutObj && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header Dashboard Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setMode('list')} 
                className="btn btn-secondary"
                style={{ padding: '8px 12px', borderRadius: '8px' }}
              >
                <ArrowLeft size={16} /> Exit View
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {activeLayoutObj.name}
                </h1>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Dynamic Grid. Columns: <strong>{activeLayoutObj.columns?.length || 0}</strong> | Active Filters: <strong>{activeLayoutObj.filters?.length || 0}</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleOpenEdit(activeLayoutObj)}
                className="btn btn-primary"
                style={{ borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Edit2 size={16} /> Modify Layout
              </button>
            </div>
          </div>

          {/* Active Layout Metadata Summary Card */}
          {activeLayoutObj.filters && activeLayoutObj.filters.length > 0 && (
            <div className="card glass" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: 'rgba(37,99,235,0.02)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={14} /> Applied Filter Rules:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeLayoutObj.filters.map((f, idx) => (
                  <span 
                    key={idx} 
                    className="badge badge-neutral"
                    style={{ fontSize: '0.78rem', background: 'white', border: '1px solid var(--border)', padding: '4px 10px' }}
                  >
                    <strong>{getColLabel(f.column)}</strong> {f.operator.replace('_', ' ')} <strong style={{ color: 'var(--primary)' }}>"{f.value}"</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Table Container Card */}
          <div className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {viewerTasks.length === 0 ? 'No matching rows.' : `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, viewerTasks.length)} of ${viewerTasks.length} tasks`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search within layout..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      padding: '8px 12px 8px 36px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)',
                      width: '240px',
                      background: 'white'
                    }}
                  />
                </div>

                {/* Page Size */}
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>
            </div>

            {/* Table Grid */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem', background: 'white' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '60px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: 'var(--text-muted)' }}>#</th>
                    {activeLayoutObj.columns.map((col, idx) => (
                      <th 
                        key={col} 
                        style={{ padding: '10px 14px', textAlign: 'left', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700 }}
                      >
                        {getColLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedViewerTasks.map((t, idx) => {
                    const globalIndex = ((currentPage - 1) * pageSize) + idx + 1;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {globalIndex}
                        </td>
                        {activeLayoutObj.columns.map(col => {
                          const val = t[col];
                          const isStatus = col === 'status' || col === 'deliveryStatus';
                          const isProgress = col === 'progress';
                          const valStr = val !== undefined && val !== null ? String(val) : '--';
                          
                          return (
                            <td key={col} style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                              {isStatus ? (
                                <span className={`badge ${
                                  valStr.toLowerCase() === 'delivered' ? 'badge-success' : 
                                  valStr.toLowerCase() === 'in progress' ? 'badge-info' : 
                                  (valStr.toLowerCase() === 'blocked' || valStr.toLowerCase() === 'blocked pbo') ? 'badge-danger' : 'badge-neutral'
                                }`}>
                                  {valStr}
                                </span>
                              ) : isProgress ? (
                                <strong>{Math.round(Number(val || 0) * 100)}%</strong>
                              ) : (
                                valStr
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {viewerTasks.length === 0 && (
                    <tr>
                      <td colSpan={activeLayoutObj.columns.length + 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No records found matching filters or search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalViewerPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  First
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  Prev
                </button>

                {Array.from({ length: Math.min(5, totalViewerPages) }, (_, i) => {
                  let pNum = i + 1;
                  if (currentPage > 3) pNum = currentPage - 3 + i;
                  if (pNum + (4 - i) > totalViewerPages) pNum = Math.max(1, totalViewerPages - 4 + i);
                  if (pNum > totalViewerPages) return null;
                  
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        border: '1px solid var(--border)',
                        background: currentPage === pNum ? 'var(--primary)' : 'white',
                        color: currentPage === pNum ? 'white' : 'var(--text)',
                        fontWeight: currentPage === pNum ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalViewerPages))} 
                  disabled={currentPage === totalViewerPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  Next
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCurrentPage(totalViewerPages)} 
                  disabled={currentPage === totalViewerPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  Last
                </button>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
