import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

const CommandPalette = ({
  isOpen,
  onClose,
  planes,
  mapData,
  currentMapId,
  onSelectRecord,
  onSelectPlane,
  onSelectJournal,
}) => {
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);

  const journalEntries = useMemo(() => {
    if (!isOpen) return [];
    try {
      const raw = JSON.parse(localStorage.getItem(`arcanum_journal_${currentMapId}`) || '[]');
      const flatten = (entries) =>
        entries.flatMap(e => [{ id: e.id, title: e.title }, ...flatten(e.children || [])]);
      return flatten(raw);
    } catch {
      return [];
    }
  }, [isOpen, currentMapId]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const records = (mapData || [])
      .filter(r => !r.isFolder && (r.name || '').toLowerCase().includes(q))
      .sort((a, b) => (b.isFavourite ? 1 : 0) - (a.isFavourite ? 1 : 0))
      .slice(0, 8)
      .map(r => ({ type: 'record', id: r.id, name: r.isFavourite ? `★ ${r.name}` : r.name, sub: r.subdivision || r.type, color: r.color }));

    const planeResults = (planes || [])
      .filter(p => (p.name || '').toLowerCase().includes(q))
      .slice(0, 4)
      .map(p => ({ type: 'plane', id: p.id, name: p.name, sub: `${p.data?.length || 0} entries` }));

    const journal = journalEntries
      .filter(e => (e.title || '').toLowerCase().includes(q))
      .slice(0, 4)
      .map(e => ({ type: 'journal', id: e.id, name: e.title || 'Untitled', sub: 'Journal' }));

    return [...records, ...planeResults, ...journal];
  }, [query, mapData, planes, journalEntries]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [results.length]);

  const handleSelect = (result) => {
    if (result.type === 'record') onSelectRecord(result.id);
    else if (result.type === 'plane') onSelectPlane(result.id);
    else if (result.type === 'journal') onSelectJournal();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[highlightIdx]) {
      handleSelect(results[highlightIdx]);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[5000] flex items-start justify-center"
      style={{ paddingTop: '14vh', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="w-full animate-fadeIn"
        style={{ maxWidth: 560, margin: '0 16px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search row */}
        <div
          style={{
            background: 'rgba(10,9,16,0.99)',
            border: '1px solid rgba(var(--color-primary), 0.4)',
            borderRadius: results.length > 0 || query ? '4px 4px 0 0' : '4px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--color-primary),0.4)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search records, planes, journal…"
            className="flex-1 bg-transparent outline-none font-mono"
            style={{
              fontSize: 13,
              color: '#e5e3dc',
              padding: '16px 0',
              letterSpacing: '0.04em',
              caretColor: 'rgb(var(--color-primary))',
            }}
          />
          <span className="font-mono text-gray-700" style={{ fontSize: 9, letterSpacing: '.2em', flexShrink: 0 }}>ESC</span>
        </div>

        {/* Results */}
        {query.trim() && (
          <div
            className="arcane-scroll"
            style={{
              background: 'rgba(7,6,12,0.99)',
              border: '1px solid rgba(var(--color-primary), 0.15)',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {results.length === 0 ? (
              <div className="py-6 text-center font-mono text-gray-700" style={{ fontSize: 10, letterSpacing: '.22em' }}>
                NO MATCHES IN THE ARCHIVE
              </div>
            ) : results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setHighlightIdx(idx)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-75"
                style={{
                  background: idx === highlightIdx ? 'rgba(var(--color-primary), 0.08)' : 'transparent',
                  borderBottom: idx < results.length - 1 ? '1px solid rgba(var(--color-primary), 0.04)' : 'none',
                }}
              >
                {result.type === 'record' && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: result.color || 'rgb(var(--color-primary))' }}
                  />
                )}
                {result.type === 'plane' && (
                  <span style={{ fontSize: 12, color: 'rgba(var(--color-primary), 0.45)', flexShrink: 0 }}>◎</span>
                )}
                {result.type === 'journal' && (
                  <span style={{ fontSize: 12, color: 'rgba(var(--color-primary), 0.45)', flexShrink: 0 }}>✦</span>
                )}
                <span
                  className="font-display flex-1 truncate uppercase"
                  style={{ fontSize: 12, letterSpacing: '.09em', color: idx === highlightIdx ? 'rgb(var(--color-primary))' : '#d1d5db' }}
                >
                  {result.name}
                </span>
                <span className="font-mono text-gray-700 flex-shrink-0" style={{ fontSize: 8, letterSpacing: '.22em' }}>
                  {result.sub}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="font-mono text-center mt-3" style={{ fontSize: 8, letterSpacing: '.22em', color: 'rgba(var(--color-primary), 0.2)' }}>
          ↑↓ NAVIGATE · ENTER SELECT · ESC CLOSE
        </p>
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
