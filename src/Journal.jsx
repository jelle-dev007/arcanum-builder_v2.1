import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

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

const load = () => {
  try { return JSON.parse(localStorage.getItem('arcanum_journal')) || []; }
  catch { return []; }
};

// ── Sidebar entry row ─────────────────────────────────────────────────────────

const EntryRow = ({ entry, depth, selectedId, expandedIds, onSelect, onToggleExpand, onAddChild, onDelete }) => {
  const isSelected  = entry.id === selectedId;
  const isExpanded  = expandedIds.has(entry.id);
  const hasChildren = entry.children.length > 0;

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
          <button
            onClick={e => { e.stopPropagation(); onAddChild(entry.id); }}
            title="Add sub-entry"
            style={{ fontSize: 13, color: 'rgba(var(--color-primary), 0.5)', padding: '0 3px', lineHeight: 1 }}
          >+</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
            title="Delete entry"
            style={{ fontSize: 10, color: 'rgba(180, 80, 80, 0.65)', padding: '0 3px', lineHeight: 1 }}
          >✕</button>
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

export default function Journal({ isFocusMode }) {
  const [entries,     setEntries]     = useState(load);
  const [selectedId,  setSelectedId]  = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [preview,     setPreview]     = useState(false);

  // Persist on every change
  React.useEffect(() => {
    localStorage.setItem('arcanum_journal', JSON.stringify(entries));
  }, [entries]);

  const selected = selectedId ? findEntry(entries, selectedId) : null;

  // ── Entry management ──────────────────────────────────────────────────
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
                  onSelect={setSelectedId}
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
          {selected && !preview && mdTools.map(({ label, title, fn }) => (
            <TBtn key={label} label={label} title={title} onClick={fn} />
          ))}

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
                ? <ReactMarkdown>{selected.content}</ReactMarkdown>
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
    </div>
  );
}
