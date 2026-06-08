import React, { useState, useEffect, useMemo, useRef } from 'react';

const RecordHall = ({ 
  mapData = [], 
  setMapData, 
  isFocusMode,
  currentPoints = [],
  setCurrentPoints,
  navigatedRecordId,
  setNavigatedRecordId
}) => {
  const [editingId, setEditingId] = useState(null);
  const [fullscreenRecord, setFullscreenRecord] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeExpandedField, setActiveExpandedField] = useState(null);

  // Search Engine State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');

  // Form Inputs
  const [name, setName] = useState("");
  const [subdivision, setSubdivision] = useState("region"); 
  const [summary, setSummary] = useState("");
  const [lore, setLore] = useState("");
  const [characters, setCharacters] = useState("");
  const [images, setImages] = useState([]);
  const [color, setColor] = useState("#fbbf24");

  // Hyperlink Tool State
  const [hoveredLinkTarget, setHoveredLinkTarget] = useState(null);
  const [linkTooltipPos, setLinkTooltipPos] = useState({ x: 0, y: 0 });
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const textAreaRef = useRef(null);

  useEffect(() => {
    if (navigatedRecordId) {
      const targetEntry = mapData.find(item => String(item.id) === String(navigatedRecordId));
      if (targetEntry) setFullscreenRecord(targetEntry);
      if (setNavigatedRecordId) setNavigatedRecordId(null);
    }
  }, [navigatedRecordId, mapData, setNavigatedRecordId]);

  useEffect(() => {
    if (isFocusMode) {
      setIsFormOpen(false);
      setEditingId(null);
      setActiveExpandedField(null);
    }
  }, [isFocusMode]);

  // ================= GRIMOIRE WEB LINK COMPONENT =================
  const LoreLink = ({ targetId, displayText }) => {
    const targetEntry = mapData.find(e => String(e.id) === String(targetId));
    
    if (!targetEntry) {
      return <span className="text-gray-600 line-through decoration-red-900/50 cursor-help" title="Record Erased">{displayText}</span>;
    }

    return (
      <span
        className="cursor-pointer font-bold transition-all duration-300"
        style={{ 
          color: targetEntry.color || 'rgb(var(--color-primary))',
          textDecoration: 'underline',
          textDecorationStyle: 'dashed',
          textUnderlineOffset: '3px',
          textDecorationColor: 'rgba(var(--color-primary), 0.4)'
        }}
        onMouseEnter={(e) => {
          setLinkTooltipPos({ x: e.clientX, y: e.clientY });
          setHoveredLinkTarget(targetEntry);
        }}
        onMouseMove={(e) => setLinkTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHoveredLinkTarget(null)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setHoveredLinkTarget(null);
          setFullscreenRecord(targetEntry);
        }}
      >
        {displayText}
      </span>
    );
  };

  // ================= TEXT SELECTION & LINK INJECTION =================
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

  // ================= TEXT PARSER ENGINE =================
  const renderFormattedText = (text) => {
    if (!text) return "";
    const lines = text.split('\n');
    
    return lines.map((line, lineIdx) => {
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
            const id = innerContent.substring(0, firstPipeIdx);
            const text = innerContent.substring(firstPipeIdx + 1);
            return <LoreLink key={tokenIdx} targetId={id} displayText={text} />;
          }
        }
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={tokenIdx} className="font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]">{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          return <em key={tokenIdx} className="italic text-amber-300/90">{token.slice(1, -1)}</em>;
        }
        return token;
      });

      if (isListItem) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 pl-2 my-1.5 animate-fadeIn">
            <span className="font-bold select-none mt-[3px] text-[9px] drop-shadow-[0_0_3px_rgb(var(--color-primary))]" style={{ color: 'rgb(var(--color-primary))' }}>✦</span>
            <span className="flex-1 text-gray-300">{formattedLine}</span>
          </div>
        );
      }

      return (
        <React.Fragment key={lineIdx}>
          {formattedLine}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const filteredRecords = useMemo(() => {
    return mapData.filter((entry) => {
      const searchTarget = `${entry.name || ''} ${entry.summary || ''} ${entry.characters || ''}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
      const matchesFilter = activeTypeFilter === 'all' || entry.subdivision === activeTypeFilter || entry.type === activeTypeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [mapData, searchQuery, activeTypeFilter]);

  const handleInscribe = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      const updatedEntry = { name, subdivision, type: subdivision, summary, lore, characters, images, color };
      setMapData(mapData.map(entry => entry.id === editingId ? { ...entry, ...updatedEntry } : entry));
      setEditingId(null);
    } else {
      const newEntry = {
        id: Date.now(), name, subdivision, type: subdivision, 
        points: currentPoints.length > 0 ? [...currentPoints] : null, 
        summary, lore, characters, images, color
      };
      setMapData([...mapData, newEntry]);
    }
    
    if (setCurrentPoints) setCurrentPoints([]);
    resetForm();
    setIsFormOpen(false);
  };

  const handleEditInit = (entry, e) => {
    e.stopPropagation(); 
    setIsFormOpen(true);
    setEditingId(entry.id);
    setName(entry.name);
    setSubdivision(entry.subdivision || entry.type || "region");
    setSummary(entry.summary || "");
    setLore(entry.lore || "");
    setCharacters(entry.characters || "");
    setImages(entry.images || []);
    setColor(entry.color || "#fbbf24");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleErase = (id, e) => {
    e.stopPropagation(); 
    if (window.confirm("Permanently erase chronicle trace data from the database files?")) {
      setMapData(mapData.filter(entry => entry.id !== id));
    }
  };

  const handleImageAppend = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => setImages(images.filter((_, i) => i !== index));

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSubdivision("region");
    setSummary("");
    setLore("");
    setCharacters("");
    setImages([]);
    setColor("#fbbf24");
    setActiveExpandedField(null);
    if (setCurrentPoints) setCurrentPoints([]); 
  };

  return (
    <div className="space-y-8 py-4 animate-fadeIn">
      
      {/* GLOBAL HOVER TOOLTIP FOR LORE LINKS */}
      {hoveredLinkTarget && !isFocusMode && (
        <div 
          className="fixed bg-black/95 border border-gray-800 p-4 rounded-lg max-w-xs w-64 z-[9999] pointer-events-none shadow-2xl space-y-2 backdrop-blur-md"
          style={{ top: linkTooltipPos.y + 15, left: linkTooltipPos.x + 15 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredLinkTarget.color || 'rgb(var(--color-primary))' }} />
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: hoveredLinkTarget.color || 'rgb(var(--color-primary))' }}>
              {hoveredLinkTarget.name}
            </h4>
          </div>
          <p className="text-gray-400 text-[11px] font-mono leading-normal line-clamp-3">
            {hoveredLinkTarget.summary || "No parchment lore logged here."}
          </p>
          <span className="text-[8px] text-gray-600 font-mono block pt-1 uppercase tracking-widest">[ Double-Click to Open ]</span>
        </div>
      )}

      {/* CONTROL TRIGGER BAR */}
      {!isFocusMode && (
        <div className="flex justify-center animate-fadeIn">
          <button 
              type="button"
              onClick={() => {
                if (isFormOpen) resetForm();
                setIsFormOpen(!isFormOpen);
              }}
              className="border font-mono text-xs font-bold py-3 px-8 rounded-xl tracking-widest uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              style={{
                backgroundColor: isFormOpen ? 'rgba(153, 27, 27, 0.2)' : 'rgba(var(--color-primary), 0.05)',
                borderColor: isFormOpen ? 'rgba(153, 27, 27, 0.6)' : 'rgba(var(--color-primary), 0.2)',
                color: isFormOpen ? '#f87171' : 'rgb(var(--color-primary))'
              }}
            >
              {isFormOpen ? "✕ Close Inscription Panel" : "＋ Begin New Chronicle Entry"}
          </button>
        </div>
      )}

      {/* INSCRIPTION INPUT WRITER PANEL */}
      {!isFocusMode && isFormOpen && (
        <div className="border border-gray-900/60 bg-gray-950/20 backdrop-blur-md p-6 rounded-2xl max-w-3xl mx-auto relative animate-fadeInDown">
          <div className="absolute top-0 right-6 font-mono text-[9px] text-gray-700 tracking-widest uppercase py-1">LOG_STREAM: ENTRY_WRITER</div>
          <h2 className="font-mono text-xs tracking-[0.2em] text-amber-500 uppercase mb-4">
            {editingId ? "⚡ Overwrite Record Matrix" : "✍️ Inscribe New Chronicle Profile"}
          </h2>

          <form onSubmit={handleInscribe} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="font-mono text-[9px] text-gray-500 tracking-wider block">IDENTITY DESIGNATION</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  placeholder="e.g., AVALON CRAG..." 
                  className="w-full bg-black border border-gray-900 p-2.5 text-xs font-mono text-white rounded layout-box outline-none focus:border-amber-500/40" 
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[9px] text-gray-500 tracking-wider block">SUBDIVISION TYPE</label>
                <select value={subdivision} onChange={(e) => setSubdivision(e.target.value)} className="w-full bg-black border border-gray-900 p-2.5 text-xs font-mono text-gray-300 rounded layout-box outline-none focus:border-amber-500/40">
                  <option value="region">REGION</option>
                  <option value="landmark">LANDMARK</option>
                  <option value="character">KEY FIGURE (NON-MAP)</option>
                </select>
              </div>
            </div>

            {subdivision !== 'character' && (
              <div className="bg-black/40 border border-gray-900 px-3 py-2 rounded font-mono text-[10px] flex justify-between items-center">
                <span className="text-gray-500">BOUND GEOMETRY VECTOR DATA:</span>
                {currentPoints.length > 0 ? (
                  <span className="text-emerald-400 font-bold animate-pulse">⚡ READY ({subdivision === 'landmark' ? 'POINT OBJECT' : `${currentPoints.length / 2} NODES CAPTURED`})</span>
                ) : (
                  <span className="text-amber-500/70">⚠️ NO DRAWING RECORDED (WILL SAVE AS TEXT ONLY)</span>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-mono text-[9px] text-gray-500 tracking-wider block">CHRONICLE SYNOPSIS (COMPACT MAPPING LINE)</label>
              <input 
                type="text" 
                value={summary} 
                onChange={(e) => setSummary(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Summary lines..." 
                className="w-full bg-black border border-gray-900 p-2.5 text-xs font-mono text-white rounded layout-box outline-none focus:border-amber-500/40" 
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="font-mono text-[9px] text-gray-500 tracking-wider block">HISTORICAL ANNAL LORE</label>
                  <button type="button" onClick={() => setActiveExpandedField('lore')} className="text-[9px] font-mono text-amber-400 opacity-70 hover:opacity-100 transition-opacity uppercase tracking-wider">⛶ Expand Page</button>
                </div>
                <textarea value={lore} onChange={(e) => setLore(e.target.value)} placeholder="Deep history logs..." className="w-full bg-black border border-gray-900 p-2.5 text-xs font-mono text-white rounded layout-box h-24 resize-none outline-none focus:border-amber-500/40" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="font-mono text-[9px] text-gray-500 tracking-wider block">ASSOCIATED KEY FIGURES / CHARACTERS</label>
                  <button type="button" onClick={() => setActiveExpandedField('characters')} className="text-[9px] font-mono text-amber-400 opacity-70 hover:opacity-100 transition-opacity uppercase tracking-wider">⛶ Expand Page</button>
                </div>
                <textarea value={characters} onChange={(e) => setCharacters(e.target.value)} placeholder="Names tracking context..." className="w-full bg-black border border-gray-900 p-2.5 text-xs font-mono text-white rounded layout-box h-24 resize-none outline-none focus:border-amber-500/40" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 items-center border-t border-gray-900/40 pt-4">
              <div className="space-y-1 md:col-span-2">
                <label className="font-mono text-[9px] text-gray-500 tracking-wider block">LANDSCAPE GRAPHICS ATTACHMENTS</label>
                <input type="file" multiple onChange={handleImageAppend} className="text-xs font-mono text-gray-500 file:bg-gray-900 file:border-0 file:text-white file:text-xs file:px-3 file:py-1.5 file:rounded" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[9px] text-gray-500 tracking-wider block">SIGNATURE COLOR EMBLEM</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 bg-transparent border-0 cursor-pointer" />
                  <span className="font-mono text-[10px] text-gray-400 uppercase">{color}</span>
                </div>
              </div>
            </div>

            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2 max-h-24 overflow-y-auto">
                {images.map((src, idx) => (
                  <div key={idx} className="w-16 h-16 border border-gray-900 rounded layout-box relative group overflow-hidden bg-black">
                    <img src={src} alt="Upload thumb" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute inset-0 bg-red-950/80 text-white font-mono text-[10px] items-center justify-center hidden group-hover:flex">REMOVE</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold py-2.5 rounded-lg tracking-widest uppercase transition-colors">
                {editingId ? "Execute Overwrite Vector" : "Commit Inscription Entry"}
              </button>
              <button type="button" onClick={() => { resetForm(); setIsFormOpen(false); }} className="bg-gray-900 text-gray-400 font-mono text-xs px-4 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH INDEXER TERMINAL */}
      <div className="max-w-5xl mx-auto bg-gray-950/30 border border-gray-900/80 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-2/3">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Query matrix by name, summary, or characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-gray-800 text-gray-300 text-xs font-mono tracking-wide rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto bg-black/40 p-1 rounded-lg border border-gray-800">
            {['all', 'region', 'landmark', 'character'].map((type) => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className="px-4 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest transition-all"
                style={{
                  backgroundColor: activeTypeFilter === type ? 'rgba(var(--color-primary), 0.15)' : 'transparent',
                  borderColor: activeTypeFilter === type ? 'rgba(var(--color-primary), 0.3)' : 'transparent',
                  color: activeTypeFilter === type ? 'rgb(var(--color-primary))' : '#6b7280'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STORAGE WALL DISPLAY */}
      <div className="space-y-3 max-w-5xl mx-auto">
        <h3 className="font-mono text-[10px] tracking-widest text-gray-500 uppercase px-1">
          LOGGED PROFILES COMPENDIUM ({filteredRecords.length})
        </h3>
        
        {filteredRecords.length === 0 ? (
           <div className="text-center py-12 border border-gray-800/50 border-dashed rounded-xl bg-gray-950/20">
             <span className="font-mono text-gray-600 tracking-widest text-xs uppercase">No traces match current parameters.</span>
           </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredRecords.map((entry) => (
              <div 
                key={entry.id} 
                onClick={() => setFullscreenRecord(entry)}
                className="border border-gray-900/60 bg-gray-950/10 hover:bg-gray-950/30 p-5 rounded-xl flex flex-col justify-between gap-4 relative group transition-all duration-300 hover:border-gray-700 cursor-pointer shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || '#fbbf24' }} />
                      <h4 className="font-mono text-sm font-bold text-gray-200 tracking-wide uppercase">{entry.name}</h4>
                    </div>
                    <span className="font-mono text-[8px] border border-gray-800 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-widest">
                      {entry.subdivision || entry.type || "region"}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-gray-400 leading-normal line-clamp-2">{entry.summary || "No description cataloged."}</p>
                </div>

                {!isFocusMode && (
                  <div className="flex justify-end gap-2 border-t border-gray-900/40 pt-3 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleEditInit(entry, e)} className="bg-gray-900/60 hover:bg-amber-500/10 border border-gray-800 hover:border-amber-500/30 text-gray-400 hover:text-amber-400 font-mono text-[9px] px-2.5 py-1 rounded transition-colors uppercase tracking-wider">Edit</button>
                    <button onClick={(e) => handleErase(entry.id, e)} className="bg-gray-900/60 hover:bg-red-500/10 border border-gray-800 hover:border-red-500/30 text-gray-500 hover:text-red-400 font-mono text-[9px] px-2.5 py-1 rounded transition-colors uppercase tracking-wider">Erase</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OVERLAY SYSTEM PREVIEW SCREEN */}
      {fullscreenRecord && (
        <div className="fixed inset-0 bg-black/90 z-[999] backdrop-blur-md flex items-center justify-center p-6" onClick={() => setFullscreenRecord(null)}>
          <div className="border border-[rgba(var(--color-primary),0.15)] rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-8 relative space-y-6 shadow-2xl" style={{ background: 'linear-gradient(145deg, rgb(var(--color-bg-surface)), rgb(var(--color-bg-main)))' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-[rgba(var(--color-primary),0.1)] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fullscreenRecord.color || 'rgb(var(--color-primary))' }} />
                  <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'rgb(var(--color-primary))' }}>SYSTEM_ARCHIVE_LOG // {fullscreenRecord.subdivision || fullscreenRecord.type || "REGION"}</span>
                </div>
                <h2 className="text-3xl font-light tracking-wide uppercase text-white">{fullscreenRecord.name}</h2>
              </div>
              <button onClick={() => setFullscreenRecord(null)} className="font-mono text-xs text-gray-500 hover:text-[rgb(var(--color-primary))] border border-[rgba(var(--color-primary),0.15)] bg-[rgba(var(--color-primary),0.05)] px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors">[ Close Terminus ]</button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-5 border-r border-[rgba(var(--color-primary),0.08)] pr-4">
                <div className="space-y-1.5">
                  <span className="font-mono text-[9px] text-gray-600 tracking-widest block uppercase">SYNOPSIS EXTRACT</span>
                  <p className="font-mono text-xs text-gray-300 leading-relaxed bg-[rgba(var(--color-primary),0.04)] border border-[rgba(var(--color-primary),0.08)] p-3 rounded-lg">{fullscreenRecord.summary || "No summary file mapped."}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="font-mono text-[9px] text-gray-600 tracking-widest block uppercase">KEY ATTUNED FIGURES</span>
                  <div className="font-mono text-xs leading-relaxed bg-[rgba(var(--color-primary),0.05)] border border-[rgba(var(--color-primary),0.1)] p-3 rounded-lg" style={{ color: 'rgb(var(--color-primary))' }}>
                    {fullscreenRecord.characters ? renderFormattedText(fullscreenRecord.characters) : "No identities tracked."}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div className="space-y-2">
                  <span className="font-mono text-[9px] text-gray-600 tracking-widest block uppercase">CHRONICLE STORIES COMPREHENSIVE LORE</span>
                  <div className="font-lore text-sm text-gray-400 leading-loose pl-2 border-l border-[rgba(var(--color-primary),0.3)]">
                    {fullscreenRecord.lore ? renderFormattedText(fullscreenRecord.lore) : "No narratives mapped."}
                  </div>
                </div>

                {fullscreenRecord.images && fullscreenRecord.images.length > 0 && (
                  <div className="space-y-2 border-t border-[rgba(var(--color-primary),0.08)] pt-4">
                    <span className="font-mono text-[9px] text-gray-600 tracking-widest block uppercase">IMAGE MANIFEST ASSETS</span>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {fullscreenRecord.images.map((src, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-gray-900 aspect-video">
                          <img src={src} alt="Chronicle capture piece" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN EXPANDED WORKSPACE */}
      {activeExpandedField && (
        <div className="fixed inset-0 bg-black/95 z-[1000] backdrop-blur-xl flex flex-col p-6 animate-fadeIn">
          <div className="max-w-5xl w-full mx-auto flex flex-col h-full space-y-4 pt-4">
            <div className="flex justify-between items-center border-b border-gray-900 pb-4">
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-amber-400 tracking-widest uppercase">MATRIX EXPANSION // DEEP TRANSCRIBER TERMINAL</span>
                <h2 className="text-xl font-light tracking-wide uppercase text-white">
                  Focused Editor: {activeExpandedField === 'lore' ? "Historical Annal Lore" : "Associated Key Figures / Characters"}
                </h2>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsLinkModalOpen(true)} 
                  className="font-mono text-xs text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 px-4 py-2.5 rounded-xl uppercase tracking-widest transition-colors"
                >
                  🔗 Link Entity
                </button>
                <button type="button" onClick={() => setActiveExpandedField(null)} className="font-mono text-xs text-black bg-amber-500 hover:bg-amber-600 px-5 py-2.5 rounded-xl uppercase font-bold tracking-widest transition-colors">
                  [ Keep & Return ]
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 bg-black/40 border border-gray-900 px-4 py-2 rounded-xl font-mono text-[10px] text-gray-500">
              <span className="text-amber-400 font-bold uppercase tracking-wider">⚡ Formatting Guide:</span>
              <div>Use <code className="text-gray-300 bg-gray-900 px-1 py-0.5 rounded">**text**</code> for <strong className="text-white font-bold">Bold</strong></div>
              <div>Use <code className="text-gray-300 bg-gray-900 px-1 py-0.5 rounded">*text*</code> for <em className="text-amber-300 italic">Italics</em></div>
              <div>Start lines with <code className="text-gray-300 bg-gray-900 px-1 py-0.5 rounded">- </code>, <code className="text-gray-300 bg-gray-900 px-1 py-0.5 rounded">* </code>, or <code className="text-gray-300 bg-gray-900 px-1 py-0.5 rounded">• </code> to render <span className="text-amber-400 font-bold">✦ Bullet Lists</span></div>
            </div>

            <div className="flex-1 w-full pb-4 relative">
              <textarea
                ref={textAreaRef}
                value={activeExpandedField === 'lore' ? lore : characters}
                onChange={(e) => {
                  if (activeExpandedField === 'lore') setLore(e.target.value);
                  else setCharacters(e.target.value);
                }}
                placeholder={activeExpandedField === 'lore' ? "Begin writing extensive records. Highlight text and click 'Link Entity' to weave connections..." : "Catalog entities. Highlight text and click 'Link Entity' to weave connections..."}
                className="w-full h-full bg-black/60 border border-gray-800 p-6 text-sm font-mono text-gray-200 rounded-xl outline-none focus:border-amber-500/60 resize-none leading-relaxed shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= LINK SELECTION MODAL ================= */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={() => setIsLinkModalOpen(false)}>
          <div className="bg-[#0b0f19] border border-gray-800 p-6 rounded-xl max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-mono text-sm font-bold text-amber-400 uppercase tracking-wider">🔗 Weave Grimoire Link</h3>
              <p className="text-gray-400 text-xs font-mono mt-1">Search the archive for the entity you wish to bind to the selected text.</p>
            </div>

            <input
              autoFocus
              type="text"
              placeholder="Query archive by name..."
              value={linkSearchQuery}
              onChange={(e) => setLinkSearchQuery(e.target.value)}
              className="w-full bg-black border border-gray-800 text-gray-200 text-xs font-mono p-2.5 rounded outline-none focus:border-amber-500/40"
            />

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {mapData
                .filter(e => e.name.toLowerCase().includes(linkSearchQuery.toLowerCase()) && e.id !== editingId)
                .map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => handleInsertLink(entry.id, entry.name)}
                    className="w-full text-left bg-gray-950/50 hover:bg-[rgba(var(--color-primary),0.1)] border border-gray-900 hover:border-[rgba(var(--color-primary),0.3)] p-3 rounded-lg transition-colors flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || '#fbbf24' }} />
                      <span className="font-mono text-xs text-gray-300 group-hover:text-white uppercase tracking-wider">{entry.name}</span>
                    </div>
                    <span className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">{entry.subdivision || entry.type}</span>
                  </button>
                ))
              }
              {mapData.filter(e => e.name.toLowerCase().includes(linkSearchQuery.toLowerCase()) && e.id !== editingId).length === 0 && (
                 <p className="text-center font-mono text-xs text-gray-600 py-4 uppercase">No matching entities found.</p>
              )}
            </div>

            <button 
              onClick={() => setIsLinkModalOpen(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-gray-400 font-mono text-xs py-2 rounded uppercase transition-colors mt-2"
            >
              Cancel Binding
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecordHall;