import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';

// ── Markdown toolbar button ───────────────────────────────────────────────────
const TBtn = ({ label, title, onClick }) => (
  <button
    title={title}
    onClick={onClick}
    className="font-mono rounded transition-all duration-150"
    style={{
      fontSize: 10,
      padding: '3px 7px',
      letterSpacing: '0.06em',
      color:      'rgba(var(--color-primary-soft), 0.55)',
      background: 'transparent',
      border:     '1px solid transparent',
    }}
    onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.background = 'rgba(var(--color-primary), 0.08)'; e.currentTarget.style.border = '1px solid rgba(var(--color-primary), 0.18)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--color-primary-soft), 0.55)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid transparent'; }}
  >
    {label}
  </button>
);

// ── Link syntax preprocessor ─────────────────────────────────────────────────
const preprocessLinks = (text) =>
  (text || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[$2](chronicle://$1)');

// Shared bracket corners component
const BracketCorners = ({ size = 14, opacity = 0.7 }) => (
    <>
      <span className="absolute top-0 left-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1px solid rgba(var(--color-primary), ${opacity})`, borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
      <span className="absolute top-0 right-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1px solid rgba(var(--color-primary), ${opacity})`, borderRight: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
      <span className="absolute bottom-0 left-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`, borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
      <span className="absolute bottom-0 right-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`, borderRight: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
    </>
);

const RecordHall = ({
                      mapData = [],
                      setMapData,
                      isFocusMode,
                      currentPoints = [],
                      setCurrentPoints,
                      navigatedRecordId,
                      setNavigatedRecordId,
                      onGoBack,
                    }) => {
  const [editingId, setEditingId] = useState(null);
  const [fullscreenRecord, setFullscreenRecord] = useState(null);
  const [recordHistory, setRecordHistory] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeExpandedField, setActiveExpandedField] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');

  const [name, setName] = useState("");
  const [subdivision, setSubdivision] = useState("region");
  const [summary, setSummary] = useState("");
  const [lore, setLore] = useState("");
  const [characters, setCharacters] = useState("");
  const [images, setImages] = useState([]);
  const [color, setColor] = useState("#c9a84c");
  const [isFolder, setIsFolder] = useState(false);

  const [hoveredLinkTarget, setHoveredLinkTarget] = useState(null);
  const [linkTooltipPos, setLinkTooltipPos] = useState({ x: 0, y: 0 });
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const textAreaRef = useRef(null);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const [folderPath, setFolderPath] = useState([]);
  const [moveTargetId, setMoveTargetId] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;

  useEffect(() => {
    if (navigatedRecordId) {
      const targetEntry = mapData.find(item => String(item.id) === String(navigatedRecordId));
      if (targetEntry) {
        setRecordHistory([]);
        setFullscreenRecord(targetEntry);
      }
      if (setNavigatedRecordId) setNavigatedRecordId(null);
    }
  }, [navigatedRecordId, mapData, setNavigatedRecordId]);

  useEffect(() => {
    if (isFocusMode) {
      setIsFormOpen(false);
      setEditingId(null);
      setActiveExpandedField(null);
      setFolderPath([]);
    }
  }, [isFocusMode]);

  useEffect(() => {
    if (!hoveredLinkTarget || !hoveredLinkTarget.images || hoveredLinkTarget.images.length <= 1) {
      setSlideshowIndex(0); return;
    }
    const interval = setInterval(() => {
      setSlideshowIndex((prev) => (prev + 1) % hoveredLinkTarget.images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [hoveredLinkTarget]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const handleNavigateToFullscreen = useCallback((entry) => {
    if (fullscreenRecord) setRecordHistory(prev => [...prev, fullscreenRecord]);
    setFullscreenRecord(entry);
  }, [fullscreenRecord]);

  const handleCloseFullscreen = useCallback(() => {
    if (recordHistory.length > 0) {
      const prev = recordHistory[recordHistory.length - 1];
      setRecordHistory(h => h.slice(0, -1));
      setFullscreenRecord(prev);
    } else {
      setFullscreenRecord(null);
      if (onGoBack) onGoBack();
    }
  }, [recordHistory, onGoBack]);

  // Stable components map — avoids remounting link subtrees on hover state changes
  const mdComponents = useMemo(() => ({
    a: ({ href, children }) => {
      if (href?.startsWith('chronicle://')) {
        const id = href.slice('chronicle://'.length);
        const text = Array.isArray(children) ? children.join('') : String(children || '');
        const targetEntry = mapData.find(e => String(e.id) === String(id));
        if (!targetEntry) return <span className="text-gray-700 line-through cursor-help" title="Record Erased">{text}</span>;
        return (
          <span
            className="cursor-pointer font-medium transition-all duration-300"
            style={{ color: targetEntry.color || 'rgb(var(--color-primary))', textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: '3px', textDecorationColor: 'rgba(var(--color-primary), 0.35)' }}
            onMouseEnter={e => { setLinkTooltipPos({ x: e.clientX, y: e.clientY }); setHoveredLinkTarget(targetEntry); }}
            onMouseMove={e => setLinkTooltipPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHoveredLinkTarget(null)}
            onDoubleClick={e => { e.stopPropagation(); setHoveredLinkTarget(null); handleNavigateToFullscreen(targetEntry); }}
          >{text}</span>
        );
      }
      return <a href={href} onClick={e => e.preventDefault()} style={{ color: 'rgb(var(--color-primary))', textDecoration: 'underline' }}>{children}</a>;
    }
  }), [mapData, handleNavigateToFullscreen]); // eslint-disable-line

  // ── Markdown toolbar insert ───────────────────────────────────────────────
  const insertMd = useCallback((before, after = '', placeholder = 'text') => {
    const ta = textAreaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || placeholder;
    const next = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    if (activeExpandedField === 'lore') setLore(next);
    else setCharacters(next);
    setTimeout(() => { ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length; }, 0);
  }, [activeExpandedField]);

  const rhMdTools = [
    { label: 'B',   title: 'Bold',        fn: () => insertMd('**', '**', 'bold text')  },
    { label: 'I',   title: 'Italic',      fn: () => insertMd('*', '*', 'italic text')  },
    { label: 'H1',  title: 'Heading 1',   fn: () => insertMd('# ', '', 'Heading')      },
    { label: 'H2',  title: 'Heading 2',   fn: () => insertMd('## ', '', 'Heading')     },
    { label: 'H3',  title: 'Heading 3',   fn: () => insertMd('### ', '', 'Heading')    },
    { label: '❝',   title: 'Blockquote',  fn: () => insertMd('> ', '', 'quote')        },
    { label: '`_`', title: 'Inline code', fn: () => insertMd('`', '`', 'code')         },
    { label: '—',   title: 'Divider',     fn: () => insertMd('\n\n---\n\n', '', '')    },
  ];


  // ================= LINK INJECTION =================
  const handleInsertLink = (targetId, targetName) => {
    if (!textAreaRef.current) return;
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    const currentText = activeExpandedField === 'lore' ? lore : characters;
    const selectedText = currentText.substring(start, end);
    const textToWrap = selectedText || targetName;
    const newText = currentText.substring(0, start) + `[[${targetId}|${textToWrap}]]` + currentText.substring(end);
    if (activeExpandedField === 'lore') setLore(newText);
    else setCharacters(newText);
    setIsLinkModalOpen(false);
    setLinkSearchQuery('');
    setTimeout(() => textAreaRef.current?.focus(), 0);
  };

  // ================= TEXT PARSER =================
  const renderFormattedText = (text) => {
    if (!text) return "";
    return text.split('\n').map((line, lineIdx) => {
      let isListItem = false;
      let displayLine = line;
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
        isListItem = true;
        displayLine = line.trim().replace(/^([-*•]\s*)/, '');
      }
      const regex = /(\[\[.*?\|.*?\]\]|\*\*.*?\*\*|\*.*?\*)/g;
      const tokens = displayLine.split(regex);
      const formattedLine = tokens.map((token, tokenIdx) => {
        if (token.startsWith('[[') && token.endsWith(']]')) {
          const innerContent = token.slice(2, -2);
          const firstPipeIdx = innerContent.indexOf('|');
          if (firstPipeIdx > -1) {
            return <LoreLink key={tokenIdx} targetId={innerContent.substring(0, firstPipeIdx)} displayText={innerContent.substring(firstPipeIdx + 1)} />;
          }
        }
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={tokenIdx} className="font-semibold text-gray-200">{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          return <em key={tokenIdx} className="italic" style={{ color: 'rgba(var(--color-primary), 0.75)' }}>{token.slice(1, -1)}</em>;
        }
        return token;
      });
      if (isListItem) {
        return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2 my-1.5">
              <span className="mt-[3px] text-[8px]" style={{ color: 'rgb(var(--color-primary))' }}>✦</span>
              <span className="flex-1 text-gray-400">{formattedLine}</span>
            </div>
        );
      }
      return (
          <React.Fragment key={lineIdx}>
            {formattedLine}
            {lineIdx < text.split('\n').length - 1 && <br />}
          </React.Fragment>
      );
    });
  };

  // ================= FILTER LOGIC =================
  const filteredRecords = useMemo(() => {
    return mapData.filter((entry) => {
      const searchTarget = `${entry.name || ''} ${entry.summary || ''} ${entry.characters || ''}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
      const matchesFilter = activeTypeFilter === 'all' || entry.subdivision === activeTypeFilter || entry.type === activeTypeFilter;
      if (searchQuery) return matchesSearch && matchesFilter;
      const matchesParent = (entry.parentId || null) === currentFolderId;
      return matchesParent && matchesFilter;
    });
  }, [mapData, searchQuery, activeTypeFilter, currentFolderId]);

  // ================= CRUD =================
  const handleInscribe = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      setMapData(mapData.map(entry =>
          entry.id === editingId ? { ...entry, name, subdivision, type: subdivision, summary, lore, characters, images, color, isFolder } : entry
      ));
      setEditingId(null);
    } else {
      setMapData([...mapData, {
        id: Date.now(), name, subdivision, type: subdivision,
        points: currentPoints.length > 0 ? [...currentPoints] : null,
        summary, lore, characters, images, color, isFolder,
        parentId: currentFolderId
      }]);
    }
    if (setCurrentPoints) setCurrentPoints([]);
    resetForm();
    setIsFormOpen(false);
  };

  const handleEditInit = (entry, e) => {
    if (e) e.stopPropagation();
    setIsFormOpen(true);
    setEditingId(entry.id);
    setName(entry.name || "");
    setSubdivision(entry.subdivision || entry.type || "region");
    setSummary(entry.summary || "");
    setLore(entry.lore || "");
    setCharacters(entry.characters || "");
    setImages(entry.images || []);
    setColor(entry.color || "#c9a84c");
    setIsFolder(entry.isFolder || false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleErase = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Permanently erase this chronicle trace? (Items inside this folder will lose their parent.)")) {
      setMapData(mapData.filter(entry => entry.id !== id));
    }
  };

  const handleMoveEntry = (targetFolderId) => {
    setMapData(mapData.map(entry => entry.id === moveTargetId ? { ...entry, parentId: targetFolderId } : entry));
    setIsMoveModalOpen(false);
    setMoveTargetId(null);
  };

  const handleImageAppend = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => setImages(images.filter((_, i) => i !== index));

  const resetForm = () => {
    setEditingId(null);
    setName(""); setSubdivision("region"); setSummary("");
    setLore(""); setCharacters(""); setImages([]);
    setColor("#c9a84c"); setIsFolder(false);
    setActiveExpandedField(null);
    if (setCurrentPoints) setCurrentPoints([]);
  };

  // ================= CARD GRID =================
  const renderCardGrid = (records) => (
      <div className="grid md:grid-cols-2 gap-3">
        {records.map((entry) => (
            <div
                key={entry.id}
                onClick={() => {
                  if (entry.isFolder) {
                    setSearchQuery('');
                    setFolderPath([...folderPath, entry]);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    setFullscreenRecord(entry);
                  }
                }}
                className="card-arcane relative group cursor-pointer p-5 flex flex-col justify-between gap-4 animate-fadeIn"
                style={{
                  borderRadius: '4px',
                  borderColor: entry.isFolder ? 'rgba(var(--color-primary), 0.22)' : undefined,
                }}
            >
              <BracketCorners size={7} opacity={entry.isFolder ? 0.4 : 0.15} />

              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {entry.isFolder ? (
                        <span className="text-sm" style={{ color: entry.color || 'rgb(var(--color-primary))' }}>◈</span>
                    ) : (
                        <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: entry.color || 'rgb(var(--color-primary))',
                              boxShadow: `0 0 4px ${entry.color || 'rgb(var(--color-primary))'}`
                            }}
                        />
                    )}
                    <h4 className="font-display text-[12px] tracking-[0.12em] text-gray-200 uppercase">
                      {entry.name || "UNNAMED"}
                    </h4>
                  </div>
                  <span className="type-badge">
                {entry.isFolder ? "COMPENDIUM" : (entry.subdivision || entry.type || "region")}
              </span>
                </div>
                <p className="font-mono text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                  {entry.summary || "No description cataloged."}
                </p>
              </div>

              {!isFocusMode && (
                  <div
                      className="flex justify-end gap-2 pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ borderTop: '1px solid rgba(var(--color-primary), 0.06)' }}
                  >
                    <button
                        onClick={(e) => { e.stopPropagation(); setMoveTargetId(entry.id); setIsMoveModalOpen(true); }}
                        className="font-mono text-[8px] px-2.5 py-1 uppercase tracking-wider text-gray-600 hover:text-blue-400 transition-colors"
                        style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}
                    >Move</button>
                    <button
                        onClick={(e) => handleEditInit(entry, e)}
                        className="font-mono text-[8px] px-2.5 py-1 uppercase tracking-wider text-gray-600 transition-colors"
                        style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px', color: undefined }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--color-primary))'}
                        onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                    >Edit</button>
                    <button
                        onClick={(e) => handleErase(entry.id, e)}
                        className="font-mono text-[8px] px-2.5 py-1 uppercase tracking-wider text-gray-600 hover:text-red-400 transition-colors"
                        style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}
                    >Erase</button>
                  </div>
              )}
            </div>
        ))}
      </div>
  );

  return (
      <div className="space-y-8 py-6 px-6 animate-fadeIn relative min-h-screen">

        {/* GLOBAL HOVER TOOLTIP */}
        {hoveredLinkTarget && !isFocusMode && createPortal(
            <div
                className="fixed tooltip-arcane p-4 max-w-xs w-60 z-[9999] pointer-events-none space-y-2"
                style={{ top: linkTooltipPos.y + 15, left: linkTooltipPos.x + 15, borderRadius: '3px' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                     style={{ backgroundColor: hoveredLinkTarget.color || 'rgb(var(--color-primary))' }} />
                <h4
                    className="font-display text-[11px] tracking-[0.12em] uppercase"
                    style={{ color: hoveredLinkTarget.color || 'rgb(var(--color-primary))' }}
                >
                  {hoveredLinkTarget.name || "UNNAMED"}
                </h4>
              </div>
              {hoveredLinkTarget.images && hoveredLinkTarget.images.length > 0 && (
                  <div className="w-full h-24 rounded overflow-hidden bg-black/40 mt-1 mb-1"
                       style={{ border: '1px solid rgba(var(--color-primary), 0.08)' }}>
                    <img src={hoveredLinkTarget.images[slideshowIndex]} alt="Ref" className="w-full h-full object-cover" />
                  </div>
              )}
              <p className="font-mono text-[10px] text-gray-500 leading-relaxed line-clamp-3">
                {hoveredLinkTarget.summary || "No lore recorded."}
              </p>
              <span className="font-mono text-[7px] text-gray-700 block pt-1 uppercase tracking-widest">◈ Double-click to open</span>
            </div>,
            document.body
        )}

        {/* NEW ENTRY BUTTON */}
        {!isFocusMode && !searchQuery && folderPath.length === 0 && (
            <div className="flex justify-center animate-fadeIn">
              <button
                  type="button"
                  onClick={() => { if (isFormOpen) resetForm(); setIsFormOpen(!isFormOpen); }}
                  className="relative font-mono text-[10px] py-3 px-8 tracking-[0.22em] uppercase border transition-all duration-300"
                  style={{
                    borderRadius: '3px',
                    background: isFormOpen ? 'rgba(153,27,27,0.08)' : 'rgba(var(--color-primary), 0.04)',
                    borderColor: isFormOpen ? 'rgba(153,27,27,0.4)' : 'rgba(var(--color-primary), 0.18)',
                    color: isFormOpen ? '#f87171' : 'rgb(var(--color-primary))',
                    boxShadow: isFormOpen ? 'none' : '0 0 16px rgba(var(--color-primary), 0.06)',
                  }}
              >
                <BracketCorners size={6} opacity={isFormOpen ? 0.3 : 0.5} />
                {isFormOpen ? "✕ Close Inscription Panel" : "＋ Begin New Chronicle Entry"}
              </button>
            </div>
        )}

        {/* INSCRIPTION FORM MODAL */}
        {!isFocusMode && isFormOpen && createPortal(
            <div
                className="fixed inset-0 z-[900] overflow-y-auto p-4 flex items-start justify-center"
                style={{ background: 'rgba(2,2,5,0.85)', backdropFilter: 'blur(8px)' }}
                onClick={() => setIsFormOpen(false)}
            >
              <div
                  className="modal-panel p-6 md:p-8 max-w-4xl w-full relative animate-fadeInDown mt-10 mb-10"
                  style={{ borderRadius: '4px' }}
                  onClick={(e) => e.stopPropagation()}
              >
                <BracketCorners size={12} opacity={0.4} />

                <div className="absolute top-4 right-6 font-mono text-[8px] text-gray-800 tracking-widest uppercase">
                  inscription_stream.active
                </div>

                <div className="mb-5">
              <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.7)' }}>
                {editingId ? "Overwrite Record" : "Inscribe Chronicle Profile"}
              </span>
                  <h2 className="font-display text-base tracking-[0.18em] mt-1" style={{ color: 'rgb(var(--color-primary))' }}>
                    {editingId ? "Edit Entry" : "New Chronicle Entry"}
                  </h2>
                </div>

                <form onSubmit={handleInscribe} className="space-y-4">
                  {/* Folder toggle */}
                  <div
                      className="flex items-center justify-between px-4 py-3 rounded"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(var(--color-primary), 0.08)' }}
                  >
                    <div>
                      <span className="font-mono text-[11px] text-gray-300 uppercase tracking-wider block">Act as Compendium Folder</span>
                      <span className="font-mono text-[9px] text-gray-600 block">Nest other entries inside this record.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={isFolder} onChange={() => setIsFolder(!isFolder)} className="sr-only peer" />
                      <div
                          className="w-10 h-5 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"
                          style={{
                            background: isFolder ? 'rgba(var(--color-primary), 0.7)' : 'rgba(30,30,35,1)',
                            border: '1px solid rgba(var(--color-primary), 0.2)',
                            position: 'relative',
                          }}
                      />
                    </label>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="field-label">Identity Designation</label>
                      <input
                          type="text" value={name} onChange={(e) => setName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          placeholder={isFolder ? "e.g., THE KNIGHTS ARCHIVE..." : "e.g., AVALON CRAG..."}
                          className="input-arcane"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="field-label">Subdivision Type</label>
                      <select value={subdivision} onChange={(e) => setSubdivision(e.target.value)} className="input-arcane">
                        <option value="region">REGION</option>
                        <option value="landmark">LANDMARK</option>
                        <option value="character">KEY FIGURE</option>
                      </select>
                    </div>
                  </div>

                  {subdivision !== 'character' && !isFolder && (
                      <div
                          className="flex justify-between items-center px-3 py-2 rounded font-mono text-[9px]"
                          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--color-primary), 0.07)' }}
                      >
                        <span className="text-gray-600 uppercase tracking-widest">Bound Geometry</span>
                        {currentPoints.length > 0 ? (
                            <span className="text-emerald-500 font-medium animate-pulse">
                      ⚡ Ready — {subdivision === 'landmark' ? 'Point Object' : `${currentPoints.length / 2} nodes`}
                    </span>
                        ) : (
                            <span style={{ color: 'rgba(var(--color-primary), 0.45)' }}>
                      No drawing recorded
                    </span>
                        )}
                      </div>
                  )}

                  <div className="space-y-1">
                    <label className="field-label">Chronicle Synopsis</label>
                    <textarea
                        value={summary} onChange={(e) => setSummary(e.target.value)}
                        placeholder="Summary lines..."
                        className="input-arcane resize-none"
                        style={{ height: 72 }}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="field-label">Historical Lore</label>
                        <button type="button" onClick={() => setActiveExpandedField('lore')}
                                className="font-mono text-[8px] uppercase tracking-wider transition-opacity hover:opacity-100 opacity-60"
                                style={{ color: 'rgb(var(--color-primary))' }}
                        >
                          ⛶ Expand
                        </button>
                      </div>
                      <textarea
                          value={lore} onChange={(e) => setLore(e.target.value)}
                          placeholder="Deep history logs..."
                          className="input-arcane h-44 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="field-label">Key Figures / Characters</label>
                        <button type="button" onClick={() => setActiveExpandedField('characters')}
                                className="font-mono text-[8px] uppercase tracking-wider transition-opacity hover:opacity-100 opacity-60"
                                style={{ color: 'rgb(var(--color-primary))' }}
                        >
                          ⛶ Expand
                        </button>
                      </div>
                      <textarea
                          value={characters} onChange={(e) => setCharacters(e.target.value)}
                          placeholder="Names and context..."
                          className="input-arcane h-44 resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 items-center pt-3"
                       style={{ borderTop: '1px solid rgba(var(--color-primary), 0.07)' }}>
                    <div className="space-y-1 md:col-span-2">
                      <label className="field-label">Landscape Attachments</label>
                      <input
                          type="file" multiple accept="image/*" onChange={handleImageAppend}
                          className="font-mono text-[10px] file:font-mono file:text-[10px] file:px-3 file:py-1.5 file:rounded-sm file:cursor-pointer file:border file:uppercase file:tracking-widest"
                          style={{ color: 'rgba(var(--color-primary-soft), 0.4)' }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="field-label">Signature Color</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                               className="w-7 h-7 bg-transparent border-0 cursor-pointer" />
                        <span className="font-mono text-[9px] text-gray-500 uppercase">{color}</span>
                      </div>
                    </div>
                  </div>

                  {images.length > 0 && (
                      <div className="flex gap-2 flex-wrap pt-2 max-h-24 overflow-y-auto">
                        {images.map((src, idx) => (
                            <div key={idx}
                                 className="w-14 h-14 relative group overflow-hidden bg-black"
                                 style={{ borderRadius: '2px', border: '1px solid rgba(var(--color-primary), 0.08)' }}
                            >
                              <img src={src} alt="Thumb" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => handleRemoveImage(idx)}
                                      className="absolute inset-0 bg-red-950/90 text-white font-mono text-[8px] items-center justify-center hidden group-hover:flex uppercase">
                                Remove
                              </button>
                            </div>
                        ))}
                      </div>
                  )}

                  <div className="flex gap-2 pt-3">
                    <button type="submit" className="btn-primary flex-1">
                      {editingId ? "Execute Overwrite" : "Commit Inscription"}
                    </button>
                    <button type="button" onClick={() => { resetForm(); setIsFormOpen(false); }} className="btn-ghost px-5">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
        )}

        {/* SEARCH + FILTER BAR */}
        {folderPath.length === 0 && (
            <div
                className="max-w-5xl mx-auto p-4 rounded animate-fadeIn"
                style={{
                  background: 'rgba(var(--color-bg-surface), 0.4)',
                  border: '1px solid rgba(var(--color-primary), 0.08)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '4px',
                }}
            >
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-2/3">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                      type="text"
                      placeholder="Query archive by name, summary, or characters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-arcane pl-15 text-[11px]"
                  />
                </div>

                <div
                    className="flex gap-1 p-1 w-full md:w-auto"
                    style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '3px', border: '1px solid rgba(var(--color-primary), 0.07)' }}
                >
                  {['all', 'region', 'landmark', 'character'].map((type) => (
                      <button
                          key={type}
                          onClick={() => setActiveTypeFilter(type)}
                          className="font-mono text-[9px] px-3 py-1.5 uppercase tracking-widest transition-all duration-200"
                          style={{
                            borderRadius: '2px',
                            background: activeTypeFilter === type ? 'rgba(var(--color-primary), 0.12)' : 'transparent',
                            color: activeTypeFilter === type ? 'rgb(var(--color-primary))' : '#4b5563',
                            border: activeTypeFilter === type ? '1px solid rgba(var(--color-primary), 0.25)' : '1px solid transparent',
                          }}
                      >
                        {type}
                      </button>
                  ))}
                </div>
              </div>
            </div>
        )}

        {/* DIVIDER */}
        <div className="max-w-5xl mx-auto">
          <div className="rule-gold" />
        </div>

        {/* ROOT / SEARCH RESULTS */}
        {folderPath.length === 0 && (
            <div className="space-y-3 max-w-5xl mx-auto">
              <div className="flex items-center gap-3 px-1">
                <div className="mote" />
                <span className="field-label">
              {searchQuery ? "Search Results" : "Root Archive"} — {filteredRecords.length} entries
            </span>
              </div>

              {filteredRecords.length === 0 ? (
                  <div
                      className="text-center py-16 animate-fadeIn"
                      style={{
                        border: '1px dashed rgba(var(--color-primary), 0.08)',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.1)',
                      }}
                  >
              <span className="font-mono text-[10px] text-gray-700 uppercase tracking-widest">
                No traces match current parameters.
              </span>
                  </div>
              ) : renderCardGrid(filteredRecords)}
            </div>
        )}

        {/* FOLDER VIEW */}
        {folderPath.length > 0 && !searchQuery && (
            <div
                className="max-w-6xl mx-auto flex overflow-hidden animate-fadeIn"
                style={{
                  border: '1px solid rgba(var(--color-primary), 0.1)',
                  borderRadius: '4px',
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(8px)',
                  minHeight: '600px',
                }}
            >
              {/* Left pane */}
              <div
                  className="w-1/3 p-8 flex flex-col justify-between"
                  style={{ borderRight: '1px solid rgba(var(--color-primary), 0.07)', background: 'rgba(var(--color-bg-surface), 0.5)' }}
              >
                <div className="space-y-6">
                  <button
                      onClick={() => setFolderPath(folderPath.slice(0, -1))}
                      className="font-mono text-[9px] text-gray-600 hover:text-gray-300 uppercase tracking-widest flex items-center gap-2 transition-colors mb-6"
                  >
                    ← {folderPath.length > 1 ? folderPath[folderPath.length - 2].name : "Root Archive"}
                  </button>

                  <div className="space-y-2">
                    <span className="field-label">Active Compendium</span>
                    <h2
                        className="font-display text-2xl tracking-[0.1em] uppercase leading-tight"
                        style={{ color: folderPath[folderPath.length - 1].color || 'rgb(var(--color-primary))' }}
                    >
                      {folderPath[folderPath.length - 1].name || "UNNAMED"}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <span className="field-label">Synopsis</span>
                    <p
                        className="font-mono text-[10px] text-gray-500 leading-relaxed p-3 rounded"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(var(--color-primary), 0.07)' }}
                    >
                      {folderPath[folderPath.length - 1].summary || "No description cataloged."}
                    </p>
                  </div>

                  <button
                      onClick={() => setFullscreenRecord(folderPath[folderPath.length - 1])}
                      className="btn-ghost w-full py-2.5 text-[9px]"
                  >
                    ◈ Expand Grimoire
                  </button>
                </div>

                <button
                    onClick={() => { setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="btn-ghost w-full py-2.5 text-[9px] mt-8"
                >
                  ＋ Add Entry Inside
                </button>
              </div>

              {/* Right pane */}
              <div
                  className="w-2/3 p-8 overflow-y-auto arcane-scroll"
                  style={{ background: 'linear-gradient(135deg, transparent, rgba(0,0,0,0.3))' }}
              >
                <div
                    className="mb-5 flex items-center justify-between pb-4"
                    style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.07)' }}
                >
              <span className="field-label">
                Contents of {folderPath[folderPath.length - 1].name || "UNNAMED"}
              </span>
                  <span
                      className="font-mono text-[9px] text-gray-700 px-3 py-1 rounded"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(var(--color-primary), 0.06)' }}
                  >
                {filteredRecords.length} items
              </span>
                </div>

                {filteredRecords.length === 0 ? (
                    <div
                        className="text-center py-20"
                        style={{ border: '1px dashed rgba(var(--color-primary), 0.07)', borderRadius: '4px' }}
                    >
                <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest block">
                  This compendium is empty.
                </span>
                      <span className="font-mono text-[8px] text-gray-800 uppercase tracking-widest mt-2 block">
                  Add an entry from the left panel.
                </span>
                    </div>
                ) : renderCardGrid(filteredRecords)}
              </div>
            </div>
        )}

        {/* ================= FULLSCREEN RECORD ================= */}
        {fullscreenRecord && createPortal(
            <div
                className="fixed inset-0 z-[999] flex flex-col animate-fadeIn"
                style={{ background: 'rgba(3,3,10,0.98)', backdropFilter: 'blur(16px)' }}
            >
              {/* Sticky top bar */}
              <div
                  className="flex-shrink-0 flex justify-between items-center px-10 py-4"
                  style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.12)', background: 'rgba(var(--color-bg-surface), 0.6)' }}
              >
                <div className="flex items-center gap-4">
                  <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: fullscreenRecord.color || 'rgb(var(--color-primary))', boxShadow: `0 0 8px ${fullscreenRecord.color || 'rgb(var(--color-primary))'}` }}
                  />
                  <div>
                    <span className="field-label block">
                      Archive Log — {fullscreenRecord.isFolder ? "Compendium" : (fullscreenRecord.subdivision || fullscreenRecord.type || "region")}
                    </span>
                    <h2 className="font-display text-xl tracking-[0.12em] uppercase text-gray-100 mt-0.5">
                      {fullscreenRecord.name || "UNNAMED"}
                    </h2>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {!isFocusMode && (
                    <button
                      onClick={() => { setFullscreenRecord(null); handleEditInit(fullscreenRecord); }}
                      className="btn-ghost text-[9px] py-1.5 px-4"
                    >
                      [ Edit ]
                    </button>
                  )}
                  <button
                    onClick={handleCloseFullscreen}
                    className="btn-ghost text-[9px] py-1.5 px-4"
                  >
                    {recordHistory.length > 0 || onGoBack ? '[ ← Back ]' : '[ Close ]'}
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto arcane-scroll px-10 py-8">
                <div className="max-w-6xl mx-auto">
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Left column — synopsis, key figures */}
                    <div
                        className="md:col-span-1 space-y-5 pr-6"
                        style={{ borderRight: '1px solid rgba(var(--color-primary), 0.07)' }}
                    >
                      <div className="space-y-2">
                        <span className="field-label">Synopsis</span>
                        <p
                            className="font-mono text-[10px] text-gray-400 leading-relaxed p-3 rounded"
                            style={{ background: 'rgba(var(--color-primary), 0.03)', border: '1px solid rgba(var(--color-primary), 0.07)', whiteSpace: 'pre-wrap' }}
                        >
                          {fullscreenRecord.summary || "No summary mapped."}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="field-label">Key Figures</span>
                        <div
                            className="journal-prose p-3 rounded"
                            style={{ background: 'rgba(var(--color-primary), 0.04)', border: '1px solid rgba(var(--color-primary), 0.08)', fontSize: 12 }}
                        >
                          {fullscreenRecord.characters
                            ? <ReactMarkdown components={mdComponents} urlTransform={url => url}>{preprocessLinks(fullscreenRecord.characters)}</ReactMarkdown>
                            : <span style={{ color: 'rgba(var(--color-primary-soft), 0.3)', fontStyle: 'italic' }}>No identities tracked.</span>
                          }
                        </div>
                      </div>
                    </div>

                    {/* Right column — lore, images */}
                    <div className="md:col-span-2 space-y-5">
                      <div className="space-y-2">
                        <span className="field-label">Chronicle Lore</span>
                        <div className="record-lore-block journal-prose" style={{ fontSize: 13 }}>
                          {fullscreenRecord.lore
                            ? <ReactMarkdown components={mdComponents} urlTransform={url => url}>{preprocessLinks(fullscreenRecord.lore)}</ReactMarkdown>
                            : <span style={{ color: 'rgba(var(--color-primary-soft), 0.3)', fontStyle: 'italic' }}>No narratives mapped.</span>
                          }
                        </div>
                      </div>

                      {fullscreenRecord.images && fullscreenRecord.images.length > 0 && (
                          <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(var(--color-primary), 0.07)' }}>
                            <span className="field-label">Image Assets</span>
                            <div className="grid grid-cols-2 gap-3">
                              {fullscreenRecord.images.map((src, idx) => (
                                  <div key={idx} className="rounded overflow-hidden aspect-video"
                                       style={{ border: '1px solid rgba(var(--color-primary), 0.07)' }}>
                                    <img src={src} alt="Chronicle" className="w-full h-full object-cover" />
                                  </div>
                              ))}
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
        )}

        {/* EXPANDED TEXT EDITOR */}
        {activeExpandedField && createPortal(
            <div
                className="fixed inset-0 z-[1000] flex flex-col p-6 animate-fadeIn"
                style={{ background: 'rgba(2,2,5,0.97)', backdropFilter: 'blur(16px)' }}
            >
              <div className="max-w-5xl w-full mx-auto flex flex-col h-full space-y-4 pt-4">
                <div
                    className="flex justify-between items-center pb-4"
                    style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.1)' }}
                >
                  <div className="space-y-1">
                <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.7)' }}>
                  Deep Transcriber Terminal
                </span>
                    <h2 className="font-display text-xl tracking-[0.15em] uppercase text-gray-100">
                      {activeExpandedField === 'lore' ? "Historical Annal Lore" : "Associated Key Figures"}
                    </h2>
                  </div>
                  <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setIsLinkModalOpen(true)}
                        className="btn-ghost text-[10px]"
                    >
                      ◈ Link Entity
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveExpandedField(null)}
                        className="btn-primary text-[10px]"
                    >
                      Keep & Return
                    </button>
                  </div>
                </div>

                {/* Markdown toolbar */}
                <div className="flex items-center gap-1 flex-wrap"
                  style={{ padding: '6px 2px', borderBottom: '1px solid rgba(var(--color-primary), 0.08)' }}>
                  {rhMdTools.map(({ label, title, fn }) => (
                    <TBtn key={label} label={label} title={title} onClick={fn} />
                  ))}
                </div>

                <div className="flex-1 w-full pb-4 relative">
              <textarea
                  ref={textAreaRef}
                  value={activeExpandedField === 'lore' ? lore : characters}
                  onChange={(e) => {
                    if (activeExpandedField === 'lore') setLore(e.target.value);
                    else setCharacters(e.target.value);
                  }}
                  placeholder={activeExpandedField === 'lore'
                      ? "Begin writing. Highlight text and click 'Link Entity' to weave connections..."
                      : "Catalog entities and figures..."}
                  className="w-full h-full input-arcane p-6 text-[13px] leading-relaxed resize-none font-mono"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
                </div>
              </div>
            </div>,
            document.body
        )}

        {/* LINK SELECTION MODAL */}
        {isLinkModalOpen && createPortal(
            <div
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
                style={{ background: 'rgba(2,2,5,0.85)', backdropFilter: 'blur(8px)' }}
                onClick={() => setIsLinkModalOpen(false)}
            >
              <div
                  className="modal-panel p-6 max-w-lg w-full space-y-4 animate-fadeIn relative"
                  style={{ borderRadius: '4px' }}
                  onClick={e => e.stopPropagation()}
              >
                <BracketCorners size={10} opacity={0.4} />
                <div>
                  <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.7)' }}>Weave Grimoire Link</span>
                  <p className="font-mono text-[9px] text-gray-600 mt-1">
                    Search for the entity to bind to the selected text.
                  </p>
                </div>
                <input
                    autoFocus type="text"
                    placeholder="Query archive by name..."
                    value={linkSearchQuery}
                    onChange={(e) => setLinkSearchQuery(e.target.value)}
                    className="input-arcane"
                />
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 arcane-scroll">
                  {mapData
                      .filter(e => (e.name || '').toLowerCase().includes(linkSearchQuery.toLowerCase()) && e.id !== editingId)
                      .map(entry => (
                          <button
                              key={entry.id}
                              onClick={() => handleInsertLink(entry.id, entry.name)}
                              className="w-full text-left p-3 transition-all duration-200 flex justify-between items-center group"
                              style={{
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(var(--color-primary), 0.07)',
                                borderRadius: '3px',
                              }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.3)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.07)'}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || 'rgb(var(--color-primary))' }} />
                              <span className="font-display text-[11px] tracking-wide text-gray-300 uppercase">{entry.name || "UNNAMED"}</span>
                            </div>
                            <span className="type-badge">{entry.isFolder ? "folder" : (entry.subdivision || entry.type)}</span>
                          </button>
                      ))
                  }
                </div>
                <button onClick={() => setIsLinkModalOpen(false)} className="btn-ghost w-full text-[9px] py-2 mt-1">
                  Cancel Binding
                </button>
              </div>
            </div>,
            document.body
        )}

        {/* MOVE MODAL */}
        {isMoveModalOpen && createPortal(
            <div
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
                style={{ background: 'rgba(2,2,5,0.85)', backdropFilter: 'blur(8px)' }}
                onClick={() => { setIsMoveModalOpen(false); setMoveTargetId(null); }}
            >
              <div
                  className="modal-panel p-6 max-w-lg w-full space-y-4 animate-fadeInDown relative"
                  style={{ borderRadius: '4px' }}
                  onClick={(e) => e.stopPropagation()}
              >
                <BracketCorners size={10} opacity={0.4} />
                <div>
                  <span className="field-label" style={{ color: 'rgba(96,165,250,0.6)' }}>Relocate Entry</span>
                  <p className="font-mono text-[9px] text-gray-600 mt-1">Select a Compendium Folder to house this record.</p>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 arcane-scroll mt-3">
                  <button
                      onClick={() => handleMoveEntry(null)}
                      className="w-full text-left p-3 flex items-center gap-3 transition-all group"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(var(--color-primary), 0.07)', borderRadius: '3px' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.07)'}
                  >
                    <span className="font-mono text-sm text-gray-600">◎</span>
                    <span className="font-mono text-[11px] text-gray-400 uppercase tracking-wider">Root Archive</span>
                  </button>
                  {mapData.filter(e => e.isFolder && e.id !== moveTargetId).map(folder => (
                      <button
                          key={folder.id}
                          onClick={() => handleMoveEntry(folder.id)}
                          className="w-full text-left p-3 flex items-center gap-3 transition-all group"
                          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(var(--color-primary), 0.07)', borderRadius: '3px' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.07)'}
                      >
                        <span className="font-mono text-sm" style={{ color: 'rgba(var(--color-primary), 0.5)' }}>◈</span>
                        <span className="font-mono text-[11px] text-gray-400 uppercase tracking-wider">{folder.name || "UNNAMED FOLDER"}</span>
                      </button>
                  ))}
                </div>
                <button onClick={() => { setIsMoveModalOpen(false); setMoveTargetId(null); }} className="btn-ghost w-full text-[9px] py-2 mt-1">
                  Cancel
                </button>
              </div>
            </div>,
            document.body
        )}

      </div>
  );
};

export default RecordHall;