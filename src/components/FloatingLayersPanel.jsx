import React, { useState, useRef } from 'react';

const FloatingLayersPanel = ({
  layers,
  activeLayerId,
  onSetActiveLayer,
  onToggleVisibility,
  onAddLayer,
  onRenameLayer,
  onDeleteLayer,
  onClose,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ x: null, y: null });
  const dragStart = useRef(null);

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

  const panelStyle = pos.x !== null
    ? { position: 'fixed', left: pos.x, top: pos.y }
    : { position: 'absolute', top: 8, right: 8 };

  return (
    <div
      ref={panelRef}
      className="z-[300] animate-fadeIn"
      style={{
        ...panelStyle,
        width: 248,
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
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              className="flex items-center gap-2 px-3 py-2 group"
              style={{
                background: isActive ? 'rgba(var(--color-primary), 0.06)' : 'transparent',
                borderLeft: isActive ? '2px solid rgba(var(--color-primary), 0.5)' : '2px solid transparent',
              }}
            >
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

              {/* Delete — hidden unless > 1 layer, shown on hover */}
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
