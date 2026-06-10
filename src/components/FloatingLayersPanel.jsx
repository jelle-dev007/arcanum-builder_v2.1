import React, { useState, useRef } from 'react';

const FloatingLayersPanel = ({
  layers,
  activeLayerId,
  onSetActiveLayer,
  onToggleVisibility,
  onAddLayer,
  onRenameLayer,
  onDeleteLayer,
  onReorderLayers,
  onSetLayerOpacity,
  onClose,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ x: null, y: null });
  const dragStart = useRef(null);
  const dragLayerId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  // ── Panel drag (move panel around) ─────────────────────────────────────────
  const handleDragMouseDown = (e) => {
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panelX: rect.left, panelY: rect.top };

    const onMove = (me) => {
      const dx = me.clientX - dragStart.current.mouseX;
      const dy = me.clientY - dragStart.current.mouseY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - rect.width, dragStart.current.panelX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - rect.height, dragStart.current.panelY + dy)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dragStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Layer row drag-to-reorder ───────────────────────────────────────────────
  const handleRowDragStart = (e, layerId) => {
    dragLayerId.current = layerId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  };

  const handleRowDragOver = (e, layerId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(layerId);
  };

  const handleRowDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = dragLayerId.current;
    if (!sourceId || sourceId === targetId) return;
    const next = [...layers];
    const fromIdx = next.findIndex(l => l.id === sourceId);
    const toIdx   = next.findIndex(l => l.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorderLayers(next);
    dragLayerId.current = null;
  };

  const handleRowDragEnd = () => {
    setDragOverId(null);
    dragLayerId.current = null;
  };

  // ── Rename ──────────────────────────────────────────────────────────────────
  const startRename = (layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const commitRename = () => {
    if (editName.trim() && editingId) {
      onRenameLayer(editingId, editName.trim().toUpperCase());
    }
    setEditingId(null);
    setEditName('');
  };

  const panelStyle = pos.x !== null
    ? { position: 'fixed', left: pos.x, top: pos.y }
    : { position: 'absolute', top: 8, right: 8 };

  return (
    <div
      ref={panelRef}
      className="z-[300] animate-fadeIn"
      style={{
        ...panelStyle,
        width: 268,
        background: 'rgba(8,7,14,0.97)',
        border: '1px solid rgba(var(--color-primary), 0.28)',
        borderRadius: '3px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        userSelect: 'none',
      }}
    >
      {/* Header — draggable */}
      <div
        onMouseDown={handleDragMouseDown}
        className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing"
        style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.12)' }}
      >
        <span className="font-mono text-[10px] tracking-[.22em] uppercase" style={{ color: 'rgba(var(--color-primary), 0.6)' }}>
          ⊞ Layers
        </span>
        <span className="font-mono text-[8px] text-gray-700 tracking-wider mr-auto ml-3">top = in front</span>
        <button
          onClick={onClose}
          className="font-mono text-[11px] text-gray-700 hover:text-gray-300 transition-colors leading-none"
        >
          ×
        </button>
      </div>

      {/* Layer rows */}
      <div className="py-1">
        {layers.map(layer => {
          const isActive  = layer.id === activeLayerId;
          const isDragTarget = layer.id === dragOverId;
          const opacity = layer.opacity ?? 1;
          return (
            <div
              key={layer.id}
              onDragOver={e => handleRowDragOver(e, layer.id)}
              onDrop={e => handleRowDrop(e, layer.id)}
              onDragEnd={handleRowDragEnd}
              className="group"
              style={{
                background: isActive ? 'rgba(var(--color-primary), 0.06)' : isDragTarget ? 'rgba(var(--color-primary), 0.04)' : 'transparent',
                borderLeft: isActive ? '2px solid rgba(var(--color-primary), 0.5)' : isDragTarget ? '2px solid rgba(var(--color-primary), 0.25)' : '2px solid transparent',
                borderTop: isDragTarget ? '1px solid rgba(var(--color-primary), 0.2)' : '1px solid transparent',
              }}
            >
              {/* Main row */}
              <div className="flex items-center gap-2 px-3 py-1.5">
                {/* Drag handle */}
                <span
                  draggable
                  onDragStart={e => handleRowDragStart(e, layer.id)}
                  className="font-mono text-[10px] flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'rgba(var(--color-primary), 0.3)', lineHeight: 1 }}
                  title="Drag to reorder — top layer renders in front"
                >⠿</span>

                {/* Visibility toggle */}
                <button
                  onClick={() => onToggleVisibility(layer.id)}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  className="font-mono text-[11px] leading-none transition-colors flex-shrink-0 w-4 text-center"
                  style={{ color: layer.visible ? 'rgba(var(--color-primary), 0.6)' : '#374151' }}
                >
                  {layer.visible ? '◉' : '○'}
                </button>

                {/* Active indicator */}
                <button
                  onClick={() => onSetActiveLayer(layer.id)}
                  title="Draw on this layer"
                  className="font-mono text-[9px] leading-none transition-colors flex-shrink-0 w-3 text-center"
                  style={{ color: isActive ? 'rgb(var(--color-primary))' : '#374151' }}
                >
                  {isActive ? '●' : '─'}
                </button>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {editingId === layer.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                      }}
                      className="w-full bg-transparent outline-none font-mono text-[10px] tracking-wider"
                      style={{
                        color: 'rgb(var(--color-primary))',
                        border: '1px solid rgba(var(--color-primary), 0.3)',
                        borderRadius: '2px',
                        padding: '1px 4px',
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startRename(layer)}
                      title="Double-click to rename"
                      className="font-mono text-[10px] tracking-wider truncate block cursor-default"
                      style={{ color: isActive ? 'rgb(var(--color-primary))' : '#9ca3af' }}
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                {/* Delete */}
                {layers.length > 1 && editingId !== layer.id && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete layer "${layer.name}"? Its drawings will move to the base layer.`)) {
                        onDeleteLayer(layer.id);
                      }
                    }}
                    title="Delete layer"
                    className="font-mono text-[9px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: 'rgba(220,80,80,0.6)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(248,113,113,1)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(220,80,80,0.6)'}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Opacity row */}
              <div
                className="flex items-center gap-2 px-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ marginTop: '-2px' }}
              >
                <span className="font-mono text-[8px] tracking-wider flex-shrink-0" style={{ color: '#4b5563', minWidth: 40 }}>
                  Opacity
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={e => onSetLayerOpacity(layer.id, Number(e.target.value) / 100)}
                  className="flex-1"
                  style={{ accentColor: 'rgb(var(--color-primary))', height: 2, cursor: 'pointer' }}
                  onClick={e => e.stopPropagation()}
                />
                <span className="font-mono text-[8px] tracking-wider flex-shrink-0 text-right" style={{ color: '#4b5563', minWidth: 28 }}>
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add layer */}
      <div style={{ borderTop: '1px solid rgba(var(--color-primary), 0.08)', padding: '6px 8px' }}>
        <button
          onClick={onAddLayer}
          className="w-full font-mono text-[9px] tracking-wider uppercase py-1.5 transition-all duration-150"
          style={{
            color: 'rgba(var(--color-primary), 0.45)',
            border: '1px solid rgba(var(--color-primary), 0.1)',
            borderRadius: '2px',
            background: 'transparent',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.background = 'rgba(var(--color-primary), 0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--color-primary), 0.45)'; e.currentTarget.style.background = 'transparent'; }}
        >
          + New Layer
        </button>
      </div>
    </div>
  );
};

export default FloatingLayersPanel;
