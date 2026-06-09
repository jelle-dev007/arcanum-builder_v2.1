import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { preprocessLinks } from './utils/links';

// ── Helpers ──────────────────────────────────────────────────────────────────

const genId = () => `j-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const makeEntry = (title = 'Untitled Entry') => ({
  id: genId(),
  title,
  content: '',
  children: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const findEntry = (entries, id) => {
  for (const e of entries) {
    if (e.id === id) return e;
    const hit = findEntry(e.children, id);
    if (hit) return hit;
  }
  return null;
};

const updateEntry = (entries, id, patch) =>
  entries.map(e =>
    e.id === id
      ? { ...e, ...patch, updatedAt: Date.now() }
      : { ...e, children: updateEntry(e.children, id, patch) }
  );

const addChild = (entries, parentId, entry) =>
  entries.map(e =>
    e.id === parentId
      ? { ...e, children: [...e.children, entry] }
      : { ...e, children: addChild(e.children, parentId, entry) }
  );

const removeEntry = (entries, id) =>
  entries
    .filter(e => e.id !== id)
    .map(e => ({ ...e, children: removeEntry(e.children, id) }));

const journalKey = (realmId) => realmId ? `arcanum_journal_${realmId}` : 'arcanum_journal';

const load = (realmId) => {
  try { return JSON.parse(localStorage.getItem(journalKey(realmId))) || []; }
  catch { return []; }
};

// ── Sidebar entry row ─────────────────────────────────────────────────────────

const EntryRow = ({ entry, depth, selectedId, expandedIds, onSelect, onToggleExpand, onAddChild, onDelete }) => {
  const isSelected  = entry.id === selectedId;
  const isExpanded  = expandedIds.has(entry.id);
  const hasChildren = entry.children.length > 0;
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  return (
    <div>
      <div
        className="group flex items-center cursor-pointer rounded transition-colors duration-150"
        style={{
          paddingLeft:   depth * 16 + 10,
          paddingRight:  8,
          paddingTop:    5,
          paddingBottom: 5,
          background: isSelected ? 'rgba(var(--color-primary), 0.1)' : 'transparent',
        }}
        onClick={() => onSelect(entry.id)}
      >
        {/* Expand arrow */}
        <span
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            width: 14,
            fontSize: 9,
            color: 'rgba(var(--color-primary), 0.45)',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            opacity: hasChildren ? 1 : 0,
            pointerEvents: hasChildren ? 'auto' : 'none',
            display: 'inline-block',
          }}
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggleExpand(entry.id); }}
        >▶</span>

        {/* Title */}
        <span
          className="flex-1 truncate font-mono ml-1"
          style={{
            fontSize: 11,
            letterSpacing: '0.05em',
            color: isSelected
              ? 'rgb(var(--color-primary))'
              : 'rgba(var(--color-primary-soft), 0.65)',
          }}
        >
          {entry.title || 'Untitled'}
        </span>

        {/* Hover actions */}
        <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150 ml-1">
          {!confirmDelete && (
            <button
              onClick={e => { e.stopPropagation(); onAddChild(entry.id); }}
              title="Add sub-entry"
              style={{ fontSize: 13, color: 'rgba(var(--color-primary), 0.5)', padding: '0 3px', lineHeight: 1 }}
            >+</button>
          )}
          {confirmDelete ? (
            <>
              <span
                className="font-mono"
                style={{ fontSize: 8, color: 'rgba(180, 80, 80, 0.8)', letterSpacing: '0.04em', padding: '0 2px' }}
              >Are you sure?</span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
                title="Confirm delete"
                style={{ fontSize: 10, color: 'rgba(220, 60, 60, 0.9)', padding: '0 3px', lineHeight: 1, fontWeight: 700 }}
              >✕</button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                title="Cancel"
                style={{ fontSize: 9, color: 'rgba(var(--color-primary), 0.45)', padding: '0 3px', lineHeight: 1 }}
              >↩</button>
            </>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              title="Delete entry"
              style={{ fontSize: 10, color: 'rgba(180, 80, 80, 0.65)', padding: '0 3px', lineHeight: 1 }}
            >✕</button>
          )}
        </span>
      </div>

      {/* Children */}
      {isExpanded && entry.children.map(child => (
        <EntryRow
          key={child.id}
          entry={child}
          depth={depth + 1}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

// ── Toolbar button ────────────────────────────────────────────────────────────

const TBtn = ({ label, title, onClick, active }) => (
  <button
    title={title}
    onClick={onClick}
    className="font-mono rounded transition-all duration-150"
    style={{
      fontSize: 10,
      padding: '3px 7px',
      letterSpacing: '0.06em',
      color:      active ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary-soft), 0.55)',
      background: active ? 'rgba(var(--color-primary), 0.1)' : 'transparent',
      border:     active ? '1px solid rgba(var(--color-primary), 0.22)' : '1px solid transparent',
    }}
  >
    {label}
  </button>
);

// ── Journal ───────────────────────────────────────────────────────────────────

export default function Journal({ isFocusMode, mapData = [], onNavigateToRecord, realmId }) {
  const [entries,     setEntries]     = useState(() => load(realmId));
  const [selectedId,  setSelectedId]  = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [preview,     setPreview]     = useState(true);

  // Chronicle link state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [hoveredLink,     setHoveredLink]     = useState(null);
  const [tooltipPos,      setTooltipPos]      = useState({ x: 0, y: 0 });
  const [slideshowIdx,    setSlideshowIdx]    = useState(0);
  const [clickedLink,         setClickedLink]         = useState(null);
  const [clickedSlideshowIdx, setClickedSlideshowIdx] = useState(0);

  // Persist on every change, keyed by realm
  React.useEffect(() => {
    localStorage.setItem(journalKey(realmId), JSON.stringify(entries));
  }, [entries, realmId]);

  const selected = selectedId ? findEntry(entries, selectedId) : null;

  // ── Entry management ──────────────────────────────────────────────────
  const handleSelectEntry = (id) => {
    setSelectedId(id);
    setPreview(true);
  };

  const addRoot = () => {
    const e = makeEntry();
    setEntries(prev => [...prev, e]);
    setSelectedId(e.id);
    setPreview(false);
  };

  const addChildEntry = (parentId) => {
    const e = makeEntry();
    setEntries(prev => addChild(prev, parentId, e));
    setSelectedId(e.id);
    setExpandedIds(prev => new Set([...prev, parentId]));
    setPreview(false);
  };

  const deleteEntry = (id) => {
    setEntries(prev => removeEntry(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const setTitle   = val => setEntries(prev => updateEntry(prev, selectedId, { title: val }));
  const setContent = val => setEntries(prev => updateEntry(prev, selectedId, { content: val }));

  // ── Chronicle link helpers ────────────────────────────────────────────
  useEffect(() => {
    if (!hoveredLink?.images?.length || hoveredLink.images.length <= 1) { setSlideshowIdx(0); return; }
    const t = setInterval(() => setSlideshowIdx(i => (i + 1) % hoveredLink.images.length), 2500);
    return () => clearInterval(t);
  }, [hoveredLink]);

  useEffect(() => {
    if (!clickedLink?.images?.length || clickedLink.images.length <= 1) { setClickedSlideshowIdx(0); return; }
    const t = setInterval(() => setClickedSlideshowIdx(i => (i + 1) % clickedLink.images.length), 2500);
    return () => clearInterval(t);
  }, [clickedLink]);

  // Stable component map — only rebuilds when mapData changes, not on every hover state change
  const mdComponents = useMemo(() => ({
    a: ({ href, children }) => {
      if (href?.startsWith('chronicle://')) {
        const id = href.slice('chronicle://'.length);
        const text = Array.isArray(children) ? children.join('') : String(children || '');
        const target = mapData.find(e => String(e.id) === String(id));
        if (!target) return <span style={{ color: '#4b5563', textDecoration: 'line-through' }} title="Record not found">{text}</span>;
        return (
          <span
            style={{ color: target.color || 'rgb(var(--color-primary))', textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: '3px', textDecorationColor: 'rgba(var(--color-primary), 0.35)', cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={e => { setTooltipPos({ x: e.clientX, y: e.clientY }); setHoveredLink(target); setSlideshowIdx(0); }}
            onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHoveredLink(null)}
            onClick={e => { e.stopPropagation(); setClickedLink(target); setClickedSlideshowIdx(0); }}
            onDoubleClick={() => { setHoveredLink(null); setClickedLink(null); onNavigateToRecord?.(target.id); }}
          >{text}</span>
        );
      }
      return <a href={href} onClick={e => e.preventDefault()} style={{ color: 'rgb(var(--color-primary))', textDecoration: 'underline' }}>{children}</a>;
    }
  }), [mapData, onNavigateToRecord]); // eslint-disable-line

  const handleInsertLink = (id, name) => {
    const ta = document.getElementById('j-editor');
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || name;
    const next = ta.value.slice(0, s) + `[[${id}|${sel}]]` + ta.value.slice(e);
    setContent(next);
    setIsLinkModalOpen(false);
    setLinkSearchQuery('');
    setTimeout(() => ta.focus(), 0);
  };

  // ── Markdown toolbar ──────────────────────────────────────────────────
  const insert = useCallback((before, after = '', placeholder = 'text') => {
    const ta = document.getElementById('j-editor');
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || placeholder;
    const next = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    setContent(next);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd   = s + before.length + sel.length;
    }, 0);
  }, [selectedId]); // eslint-disable-line

  const mdTools = [
    { label: 'B',   title: 'Bold',        fn: () => insert('**', '**', 'bold text')     },
    { label: 'I',   title: 'Italic',      fn: () => insert('*', '*', 'italic text')     },
    { label: 'H1',  title: 'Heading 1',   fn: () => insert('# ', '', 'Heading')         },
    { label: 'H2',  title: 'Heading 2',   fn: () => insert('## ', '', 'Heading')        },
    { label: 'H3',  title: 'Heading 3',   fn: () => insert('### ', '', 'Heading')       },
    { label: '❝',   title: 'Blockquote',  fn: () => insert('> ', '', 'quote')           },
    { label: '`_`', title: 'Inline code', fn: () => insert('`', '`', 'code')            },
    { label: '```', title: 'Code block',  fn: () => insert('```\n', '\n```', 'code')    },
    { label: '—',   title: 'Divider',     fn: () => insert('\n\n---\n\n', '', '')       },
  ];

  // ── Layout ────────────────────────────────────────────────────────────
  const showSidebar = sidebarOpen && !fullscreen;

  return (
    <div
      className="flex overflow-hidden"
      style={
        fullscreen
          ? { position: 'fixed', inset: 0, zIndex: 60, background: 'rgb(var(--color-bg-main))' }
          : { width: '100%', height: '100%' }
      }
    >
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      {showSidebar && (
        <div
          data-tutorial="journal-sidebar"
          className="flex flex-col flex-shrink-0"
          style={{
            width: 258,
            borderRight: '1px solid rgba(var(--color-primary), 0.1)',
            background:  'rgba(var(--color-bg-surface), 0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.1)' }}
          >
            <span
              className="font-display tracking-[0.22em] uppercase"
              style={{ fontSize: 9, color: 'rgba(var(--color-primary), 0.5)' }}
            >
              Entries
            </span>
            <button
              onClick={addRoot}
              title="New entry"
              style={{
                fontSize: 20,
                lineHeight: 1,
                color: 'rgba(var(--color-primary), 0.5)',
                padding: '0 4px',
                transition: 'color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--color-primary))'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.5)'}
            >+</button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto arcane-scroll py-2">
            {entries.length === 0 ? (
              <p
                className="font-mono text-center"
                style={{ fontSize: 10, color: 'rgba(var(--color-primary-soft), 0.28)', padding: '28px 16px', lineHeight: 2 }}
              >
                No entries yet.<br />Press + to begin.
              </p>
            ) : (
              entries.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  depth={0}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={handleSelectEntry}
                  onToggleExpand={toggleExpand}
                  onAddChild={addChildEntry}
                  onDelete={deleteEntry}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div
          className="flex items-center gap-1 px-3 flex-shrink-0"
          style={{
            height: 44,
            borderBottom: '1px solid rgba(var(--color-primary), 0.1)',
            background:   'rgba(var(--color-bg-surface), 0.35)',
          }}
        >
          {/* Sidebar toggle */}
          {!fullscreen && (
            <>
              <button
                onClick={() => setSidebarOpen(o => !o)}
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                className="font-mono transition-colors duration-150"
                style={{ fontSize: 11, color: 'rgba(var(--color-primary), 0.4)', padding: '4px 6px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.4)'}
              >
                {sidebarOpen ? '◀' : '▶'}
              </button>
              <div style={{ width: 1, height: 16, background: 'rgba(var(--color-primary), 0.1)', margin: '0 4px' }} />
            </>
          )}

          {/* Markdown tools — only visible in edit mode with an entry open */}
          {selected && !preview && (
            <>
              {mdTools.map(({ label, title, fn }) => (
                <TBtn key={label} label={label} title={title} onClick={fn} />
              ))}
              {mapData.length > 0 && (
                <>
                  <div style={{ width: 1, height: 16, background: 'rgba(var(--color-primary), 0.1)', margin: '0 4px' }} />
                  <TBtn label="◈ Link" title="Link to a chronicle entry" onClick={() => setIsLinkModalOpen(true)} />
                </>
              )}
            </>
          )}

          <div className="flex-1" />

          {/* Preview toggle */}
          {selected && (
            <TBtn
              label={preview ? 'EDIT' : 'READ'}
              title={preview ? 'Back to editing' : 'Preview rendered markdown'}
              onClick={() => setPreview(p => !p)}
              active={preview}
            />
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: 'rgba(var(--color-primary), 0.1)', margin: '0 6px' }} />

          {/* Fullscreen */}
          <button
            onClick={() => setFullscreen(f => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="font-mono transition-colors duration-150"
            style={{ fontSize: 13, color: 'rgba(var(--color-primary), 0.4)', padding: '4px 6px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.4)'}
          >
            {fullscreen ? '⊡' : '⊞'}
          </button>
        </div>

        {/* Title */}
        {selected && (
          <div className="flex-shrink-0 px-10 pt-8 pb-3">
            <input
              value={selected.title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Entry title..."
              className="w-full bg-transparent outline-none font-display tracking-[0.14em] uppercase"
              style={{
                fontSize: 20,
                color: 'rgb(var(--color-primary))',
                borderBottom: '1px solid rgba(var(--color-primary), 0.15)',
                paddingBottom: 10,
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selected ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ opacity: 0.35 }}>
              <svg viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="1.1"
                style={{ width: 44, height: 44, color: 'rgb(var(--color-primary))' }}
              >
                <rect x="6" y="4" width="28" height="36" rx="1.5" />
                <line x1="12" y1="14" x2="28" y2="14" />
                <line x1="12" y1="20" x2="28" y2="20" />
                <line x1="12" y1="26" x2="22" y2="26" />
              </svg>
              <p className="font-mono tracking-[0.22em] uppercase"
                style={{ fontSize: 9, color: 'rgb(var(--color-primary))' }}
              >
                {entries.length === 0 ? 'No entries — press + to begin' : 'Select an entry'}
              </p>
            </div>
          ) : preview ? (
            <div className="w-full h-full overflow-y-auto arcane-scroll px-10 py-6 journal-prose">
              {selected.content
                ? <ReactMarkdown components={mdComponents} urlTransform={url => url}>{preprocessLinks(selected.content)}</ReactMarkdown>
                : <p style={{ color: 'rgba(var(--color-primary-soft), 0.22)', fontStyle: 'italic', fontSize: 14 }}>Nothing written yet.</p>
              }
            </div>
          ) : (
            <textarea
              id="j-editor"
              value={selected.content}
              onChange={e => setContent(e.target.value)}
              placeholder="Begin writing... (supports markdown)"
              className="w-full h-full resize-none outline-none arcane-scroll"
              style={{
                background:    'transparent',
                padding:       '24px 40px',
                fontSize:      14,
                lineHeight:    1.85,
                fontFamily:    'ui-monospace, "Cascadia Code", "Fira Code", monospace',
                color:         'rgba(var(--color-primary-soft), 0.82)',
                caretColor:    'rgb(var(--color-primary))',
                letterSpacing: '0.02em',
              }}
              autoFocus
              spellCheck={false}
            />
          )}
        </div>
      </div>

      {/* ── Record preview panel (single-click) ──────────────────────── */}
      {clickedLink && (
        <div
          className="flex flex-col flex-shrink-0 animate-fadeIn"
          style={{
            width: 272,
            borderLeft: '1px solid rgba(var(--color-primary), 0.1)',
            background: 'rgba(var(--color-bg-surface), 0.7)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 gap-2"
            style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.1)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: clickedLink.color || 'rgb(var(--color-primary))', boxShadow: `0 0 6px ${clickedLink.color || 'rgb(var(--color-primary))'}` }}
              />
              <span
                className="font-display text-[11px] tracking-[0.1em] uppercase truncate"
                style={{ color: clickedLink.color || 'rgb(var(--color-primary))' }}
              >
                {clickedLink.name || 'UNNAMED'}
              </span>
            </div>
            <button
              onClick={() => setClickedLink(null)}
              className="font-mono flex-shrink-0 transition-colors duration-150"
              style={{ fontSize: 12, color: 'rgba(var(--color-primary), 0.3)', padding: '2px 4px' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.3)'}
            >✕</button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto arcane-scroll px-4 py-4 space-y-4">
            {/* Type badge */}
            <span className="type-badge">
              {clickedLink.isFolder ? 'Compendium' : (clickedLink.subdivision || clickedLink.type || 'entry')}
            </span>

            {/* Image */}
            {clickedLink.images?.length > 0 && (
              <div
                className="w-full rounded overflow-hidden"
                style={{ height: 130, border: '1px solid rgba(var(--color-primary), 0.08)' }}
              >
                <img
                  src={clickedLink.images[clickedSlideshowIdx]}
                  alt="Record"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Synopsis */}
            {clickedLink.summary ? (
              <div>
                <span className="field-label block mb-1.5">Synopsis</span>
                <p
                  className="font-mono text-[11px] leading-relaxed"
                  style={{ color: 'rgba(var(--color-primary-soft), 0.62)' }}
                >
                  {clickedLink.summary}
                </p>
              </div>
            ) : (
              <p
                className="font-mono text-[10px]"
                style={{ color: 'rgba(var(--color-primary-soft), 0.22)', fontStyle: 'italic' }}
              >
                No synopsis recorded.
              </p>
            )}
          </div>

          {/* Footer actions */}
          <div
            className="flex-shrink-0 px-4 py-3 space-y-2"
            style={{ borderTop: '1px solid rgba(var(--color-primary), 0.1)' }}
          >
            <button
              onClick={() => { setClickedLink(null); onNavigateToRecord?.(clickedLink.id); }}
              className="btn-ghost w-full text-[9px] py-2"
            >
              Open in Chronicles →
            </button>
          </div>
        </div>
      )}

      {/* ── Hover tooltip for chronicle links ─────────────────────────── */}
      {hoveredLink && createPortal(
        <div className="fixed tooltip-arcane p-4 max-w-xs w-60 z-[9999] pointer-events-none space-y-2"
          style={{ top: tooltipPos.y + 15, left: tooltipPos.x + 15, borderRadius: '3px' }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: hoveredLink.color || 'rgb(var(--color-primary))' }} />
            <h4 className="font-display text-[11px] tracking-[0.12em] uppercase"
              style={{ color: hoveredLink.color || 'rgb(var(--color-primary))' }}>
              {hoveredLink.name || 'UNNAMED'}
            </h4>
          </div>
          {hoveredLink.images?.length > 0 && (
            <div className="w-full h-24 rounded overflow-hidden bg-black/40"
              style={{ border: '1px solid rgba(var(--color-primary), 0.08)' }}>
              <img src={hoveredLink.images[slideshowIdx]} alt="Ref" className="w-full h-full object-cover" />
            </div>
          )}
          <p className="font-mono text-[10px] text-gray-500 leading-relaxed line-clamp-3">
            {hoveredLink.summary || 'No lore recorded.'}
          </p>
          <span className="font-mono text-[7px] text-gray-700 block pt-1 uppercase tracking-widest">◈ Double-click to open in chronicles</span>
        </div>,
        document.body
      )}

      {/* ── Chronicle link picker modal ───────────────────────────────── */}
      {isLinkModalOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          style={{ background: 'rgba(2,2,5,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setIsLinkModalOpen(false); setLinkSearchQuery(''); }}>
          <div className="modal-panel p-6 max-w-lg w-full space-y-4 relative"
            style={{ borderRadius: '4px' }}
            onClick={e => e.stopPropagation()}>
            <div>
              <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.7)' }}>Link to Chronicle Entry</span>
              <p className="font-mono text-[9px] text-gray-600 mt-1">Select text first to wrap it, or the record name will be inserted.</p>
            </div>
            <input autoFocus type="text" placeholder="Search chronicles by name..."
              value={linkSearchQuery}
              onChange={e => setLinkSearchQuery(e.target.value)}
              className="input-arcane" />
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 arcane-scroll">
              {mapData
                .filter(e => (e.name || '').toLowerCase().includes(linkSearchQuery.toLowerCase()))
                .map(entry => (
                  <button key={entry.id}
                    onClick={() => handleInsertLink(entry.id, entry.name)}
                    className="w-full text-left p-3 transition-all duration-200 flex justify-between items-center"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(var(--color-primary), 0.07)', borderRadius: '3px' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.07)'}>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color || 'rgb(var(--color-primary))' }} />
                      <span className="font-display text-[11px] tracking-wide text-gray-300 uppercase">{entry.name || 'UNNAMED'}</span>
                    </div>
                    <span className="type-badge">{entry.isFolder ? 'folder' : (entry.subdivision || entry.type || 'entry')}</span>
                  </button>
                ))
              }
              {mapData.length === 0 && (
                <p className="font-mono text-[10px] text-gray-700 text-center py-6">No chronicle records found.</p>
              )}
            </div>
            <button onClick={() => { setIsLinkModalOpen(false); setLinkSearchQuery(''); }}
              className="btn-ghost w-full text-[9px] py-2">
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
