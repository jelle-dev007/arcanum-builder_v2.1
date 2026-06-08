import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import DrawingLayer from './DrawingLayer';

const MapComponent = ({ mapData, setMapData, onNavigateToRecord, currentMap, updateMapImage, isFocusMode }) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [creationType, setCreationType] = useState('region'); 
  const [currentPoints, setCurrentPoints] = useState([]);
  
  const [showRegions, setShowRegions] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);

  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  
  const [sidebarEntry, setSidebarEntry] = useState(null);
  const [isQuickEditing, setIsQuickEditing] = useState(false);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [reshapeTargetId, setReshapeTargetId] = useState(null);

  // KEYBOARD EVENT LISTENER: ESCAPE HOTKEY
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (reshapeTargetId) {
          setReshapeTargetId(null);
        }
        if (isDrawingMode) {
          setIsDrawingMode(false);
          setCurrentPoints([]);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [reshapeTargetId, isDrawingMode]);

  useEffect(() => {
    if (!hoveredEntry || !hoveredEntry.images || hoveredEntry.images.length <= 1) {
      setSlideshowIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setSlideshowIndex((prevIndex) => (prevIndex + 1) % hoveredEntry.images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [hoveredEntry]);

  useEffect(() => {
    if (isFocusMode) {
      setIsQuickEditing(false);
      setReshapeTargetId(null);
      setIsDrawingMode(false);
    }
  }, [isFocusMode]);

  const handleFinishDrawing = () => {
    if (creationType !== 'landmark' && currentPoints.length < 4) {
      alert("Incomplete geometric leylines. Plot more anchor points first.");
      return;
    }
    setShowLinkModal(true);
  };

  const linkShapeToEntry = () => {
    if (!selectedEntryId) return;
    setMapData(mapData.map(entry => {
      if (entry.id === Number(selectedEntryId)) {
        return { ...entry, type: creationType, points: currentPoints, color: entry.color || 'rgb(var(--color-primary))' };
      }
      return entry;
    }));
    setCurrentPoints([]);
    setShowLinkModal(false);
    setSelectedEntryId("");
    setIsDrawingMode(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateMapImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickEditSave = (field, value) => {
    if (!sidebarEntry) return;
    const updatedEntry = { ...sidebarEntry, [field]: value };
    setSidebarEntry(updatedEntry);
    setMapData(mapData.map(entry => entry.id === sidebarEntry.id ? updatedEntry : entry));
  };

  const toggleReshapeBordersMode = () => {
    if (!sidebarEntry) return;
    if (reshapeTargetId === sidebarEntry.id) {
      setReshapeTargetId(null);
    } else {
      setReshapeTargetId(sidebarEntry.id);
      setIsDrawingMode(false); setCurrentPoints([]);
    }
  };

  const handleDeleteEntryPoints = () => {
    if (window.confirm("Dissolve ink boundaries and sever this geographical bond?")) {
      setMapData(mapData.map(entry => entry.id === sidebarEntry.id ? { ...entry, points: null } : entry));
      setSidebarEntry(null); setReshapeTargetId(null);
    }
  };

  const isDrawingLandmarkStructure = creationType === 'landmark' || creationType === 'road';
  const filteredBindingCandidates = mapData.filter(entry => {
    if (isDrawingLandmarkStructure) {
      return entry.subdivision === 'landmark';
    } else {
      return !entry.subdivision || entry.subdivision === 'region';
    }
  });

  return (
    <div className="flex relative w-full border border-gray-800/60 rounded-2xl bg-black/10 overflow-hidden min-h-[780px]">
      
      {/* GLOBAL CARTOGRAPHY INK FILTERS */}
      <svg className="absolute w-0 h-0 invisible">
        <defs>
          {/* Rough, hand-inked parchment line displacement filter */}
          <filter id="hand-drawn-edge" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* ================= MAP CONSOLE LAYER ================= */}
      <div className="flex-1 flex flex-col items-center p-6 relative">
        
        {/* INTERACTIVE CONTROLS BAR */}
        {!isFocusMode ? (
          <div className="w-full max-w-4xl bg-[rgb(var(--color-bg-surface)_/_0.6)] backdrop-blur-md border border-gray-800/80 p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 z-20 animate-fadeIn">
            <div className="flex gap-5 font-mono text-[10px] tracking-widest text-gray-400">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={showRegions} 
                  onChange={() => setShowRegions(!showRegions)} 
                  className="rounded bg-black border-gray-700 checked:bg-[rgb(var(--color-primary))] checked:border-[rgb(var(--color-primary))]" 
                  style={{ accentColor: 'rgb(var(--color-primary))' }}
                /> TERRITORIES
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={showLandmarks} 
                  onChange={() => setShowLandmarks(!showLandmarks)} 
                  className="rounded bg-black border-gray-700 checked:bg-[rgb(var(--color-primary))] checked:border-[rgb(var(--color-primary))]"
                  style={{ accentColor: 'rgb(var(--color-primary))' }}
                /> LEYLINES & SANCTUARIES
              </label>
            </div>

            <div className="flex items-center gap-3">
              <select 
                value={creationType} 
                onChange={(e) => { setCreationType(e.target.value); setCurrentPoints([]); }}
                className="bg-black/60 border border-gray-800 text-gray-300 font-mono text-[11px] p-2 rounded outline-none focus:border-[rgb(var(--color-primary)_/_0.5)] transition-colors"
                disabled={isDrawingMode || !!reshapeTargetId}
              >
                <option value="region">REALM VEIL</option>
                <option value="landmark">SANCTUARY NODE</option>
                <option value="road">MYSTICAL PATHWAY</option>
              </select>

              <button 
                onClick={() => { setIsDrawingMode(!isDrawingMode); setCurrentPoints([]); setReshapeTargetId(null); }} 
                className={`font-mono text-[11px] px-4 py-2 rounded border tracking-wider transition-all duration-300 ${
                  isDrawingMode 
                    ? 'bg-[rgb(var(--color-primary)_/_0.15)] text-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))] shadow-[0_0_15px_rgb(var(--color-primary)_/_0.2)]' 
                    : 'bg-black/40 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
                }`}
                disabled={!!reshapeTargetId}
              >
                {isDrawingMode ? "INSCRIBING BOUNDARIES..." : "COMMENCE CARTOGRAPHY"}
              </button>
              
              {isDrawingMode && (
                <button 
                  onClick={handleFinishDrawing} 
                  className="bg-emerald-950/20 border border-emerald-500/50 hover:border-emerald-400 text-emerald-400 font-mono text-[11px] px-4 py-2 rounded tracking-wider transition-colors"
                >
                  SEAL INK
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* COMPACT HOVER TOOLTIP */}
        {hoveredEntry && !isDrawingMode && !reshapeTargetId && (
          <div className="fixed bg-black/95 border border-gray-800 p-4 rounded-lg max-w-xs w-64 z-[300] pointer-events-none shadow-2xl space-y-2 backdrop-blur-md" style={{ top: tooltipPos.y, left: tooltipPos.x }}>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: hoveredEntry.color || 'rgb(var(--color-primary))', textShadow: '0 0 8px currentColor' }}>{hoveredEntry.name}</h4>
            {hoveredEntry.images && hoveredEntry.images.length > 0 && (
              <div className="w-full h-28 relative rounded overflow-hidden bg-black/40 border border-gray-900 mt-1 mb-1">
                <img src={hoveredEntry.images[slideshowIndex]} alt="Archive Presentation" className="w-full h-full object-cover transition-all duration-500" />
                {hoveredEntry.images.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 text-[8px] font-mono text-gray-400 rounded border border-gray-800">
                    {slideshowIndex + 1} / {hoveredEntry.images.length}
                  </div>
                )}
              </div>
            )}
            <p className="text-gray-400 text-[11px] font-mono leading-normal line-clamp-3">{hoveredEntry.summary || "No parchment lore logged here."}</p>
            <span className="text-[8px] text-gray-600 font-mono block pt-1 uppercase tracking-widest">[ Double-Click to Consult Grimoire ]</span>
          </div>
        )}

        {/* TETHER LINK MODAL INTERFACE */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[rgb(var(--color-bg-surface))] border border-gray-800 p-6 rounded-xl max-w-sm w-full space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              <h3 className="font-mono text-xs text-[rgb(var(--color-primary))] tracking-widest uppercase">Weave Leyline</h3>
              <select className="w-full bg-black/50 border border-gray-800 p-2.5 text-xs font-mono text-white rounded outline-none focus:border-[rgb(var(--color-primary)_/_0.4)]" value={selectedEntryId} onChange={(e) => setSelectedEntryId(e.target.value)}>
                <option value="">-- SELECT CHRONICLE PROFILE --</option>
                {filteredBindingCandidates.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button 
                  onClick={linkShapeToEntry} 
                  disabled={!selectedEntryId} 
                  className="flex-1 bg-[rgb(var(--color-primary))] disabled:opacity-20 text-black font-mono text-xs font-bold py-2 rounded transition-opacity"
                >
                  Weave Soul-Tether
                </button>
                <button onClick={() => { setShowLinkModal(false); setCurrentPoints([]); }} className="flex-1 bg-gray-950 border border-gray-800 text-gray-400 font-mono text-xs py-2 rounded hover:text-white transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE CANVAS GRAPHICS PLATFORM */}
        <div className="mt-6 border border-gray-800/80 p-1 bg-black/40 rounded-xl shadow-2xl relative">
          <div className="overflow-hidden rounded-lg">
            <TransformWrapper disabled={isDrawingMode || !!reshapeTargetId}>
              <TransformComponent>
                <div className="relative">
                  {currentMap.imageUrl ? (
                    <img src={currentMap.imageUrl} alt="Arcane Map Plane" className="max-w-[700px]" />
                  ) : (
                    <div className="w-[1200px] h-[800px] flex items-center justify-center border-2 border-dashed border-gray-800/60 bg-black/20 hover:border-[rgb(var(--color-primary)_/_0.4)] transition-colors group">
                      <input type="file" onChange={handleImageUpload} className="text-gray-500 font-mono text-xs cursor-pointer group-hover:text-gray-300 transition-colors" />
                    </div>
                  )}

                  <DrawingLayer 
                    width={1200} height={800} 
                    isDrawingMode={isDrawingMode}
                    reshapeTargetId={reshapeTargetId}
                    mapData={mapData} setMapData={setMapData}
                    sidebarEntry={sidebarEntry} setSidebarEntry={setSidebarEntry}
                    currentPoints={currentPoints} setCurrentPoints={setCurrentPoints}
                    onHoverEntry={(e, entry) => { setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 }); if(hoveredEntry?.id !== entry.id) setHoveredEntry(entry); }}
                    onLeaveEntry={() => setHoveredEntry(null)}
                    onClickEntry={(entry) => { setSidebarEntry(entry); setIsQuickEditing(false); setReshapeTargetId(null); }}
                    onDoubleClickEntry={(entry) => { if (onNavigateToRecord) onNavigateToRecord(entry.id); }}
                    showRegions={showRegions} showLandmarks={showLandmarks}
                    creationType={creationType}
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      </div>

      {/* ================= SIDEBAR PROFILE SCROLL DRAWER ================= */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-[rgb(var(--color-bg-surface)_/_0.95)] border-l border-l-gray-800/80 p-6 z-[400] transform transition-transform duration-300 flex flex-col justify-between backdrop-blur-xl ${sidebarEntry ? 'translate-x-0' : 'translate-x-full'}`}>
        {sidebarEntry && (
          <div className="flex flex-col h-full justify-between pt-12 overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-800/60 pb-3">
                <div>
                  <span className="font-mono text-[9px] text-gray-500 tracking-wider uppercase">{sidebarEntry.type || 'Entity'} Chronicle Scroll</span>
                  <h3 className="text-xl font-light tracking-wide uppercase text-gray-200" style={{ color: sidebarEntry.color || 'rgb(var(--color-primary))', textShadow: '0 0 10px currentColor' }}>{sidebarEntry.name}</h3>
                </div>
                <button onClick={() => { setSidebarEntry(null); setReshapeTargetId(null); setIsQuickEditing(false); }} className="font-mono text-[9px] text-gray-500 hover:text-[rgb(var(--color-primary))] uppercase transition-colors">[ CLOSE ]</button>
              </div>

              <div className="space-y-5">
                {!isQuickEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block">TRUE NAME</span>
                      <p className="font-mono text-xs text-gray-300 tracking-wide">{sidebarEntry.name}</p>
                    </div>
                    
                    {sidebarEntry.images && sidebarEntry.images.length > 0 && (
                      <div className="space-y-2 border-t border-gray-800/40 pt-3">
                        <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block">VISUAL ILLUSIONS</span>
                        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                          {sidebarEntry.images.map((imgSrc, i) => (
                            <div key={i} className="h-16 rounded overflow-hidden bg-black border border-gray-900 relative">
                              <img src={imgSrc} alt="Locked asset segment" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 border-t border-gray-800/40 pt-3">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block">PARCHMENT LORE</span>
                      <p className="font-serif text-xs text-gray-400 leading-relaxed italic">{sidebarEntry.summary || "No parchment lore logged here yet."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-1">
                      <span className="font-mono text-[9px] text-[rgb(var(--color-primary)_/_0.6)] uppercase tracking-widest block">RENAME ENTITY</span>
                      <input className="w-full bg-black/60 border border-gray-800 p-2 text-xs font-mono text-white rounded outline-none focus:border-[rgb(var(--color-primary)_/_0.4)]" value={sidebarEntry.name || ""} onChange={(e) => handleQuickEditSave('name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[9px] text-[rgb(var(--color-primary)_/_0.6)] uppercase tracking-widest block">REWRITE LORE</span>
                      <textarea className="w-full bg-black/60 border border-gray-800 p-2 text-xs font-mono text-white rounded h-20 resize-none outline-none focus:border-[rgb(var(--color-primary)_/_0.4)]" value={sidebarEntry.summary || ""} onChange={(e) => handleQuickEditSave('summary', e.target.value)} />
                    </div>
                    <button 
                      onClick={() => setIsQuickEditing(false)} 
                      className="w-full bg-[rgb(var(--color-primary)_/_0.1)] text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary)_/_0.3)] font-mono text-[10px] font-bold py-2 rounded uppercase tracking-wider hover:bg-[rgb(var(--color-primary)_/_0.2)] transition-all"
                    >
                      Inscribe Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ================= OPERATOR ACTIONS ================= */}
            <div className="border-t border-gray-800/60 pt-4 space-y-2 mt-6 pb-6">
              {!isFocusMode && (
                <>
                  {!isQuickEditing && (
                    <button 
                      onClick={() => setIsQuickEditing(true)}
                      className="w-full bg-gray-950 border border-gray-800 text-gray-300 font-mono text-[10px] py-2.5 rounded-lg tracking-widest uppercase hover:text-white hover:border-gray-700 transition-colors"
                    >
                      🖋️ Edit Lore
                    </button>
                  )}

                  {sidebarEntry.points && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {reshapeTargetId === sidebarEntry.id ? (
                          <>
                            <button 
                              onClick={toggleReshapeBordersMode}
                              className="bg-[rgb(var(--color-primary))] text-black font-mono text-[9px] py-2.5 rounded-lg tracking-wider uppercase font-bold shadow-[0_0_15px_rgb(var(--color-primary)_/_0.4)]"
                            >
                              🔒 Seal Borders
                            </button>
                            <button 
                              onClick={() => setReshapeTargetId(null)}
                              className="bg-gray-950 border border-gray-800 text-gray-400 font-mono text-[9px] py-2.5 rounded-lg tracking-wider uppercase hover:text-white transition-colors"
                            >
                              ✕ Cancel [Esc]
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={toggleReshapeBordersMode}
                            className="bg-black text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary)_/_0.2)] hover:border-[rgb(var(--color-primary)_/_0.5)] font-mono text-[9px] py-2.5 rounded-lg tracking-wider uppercase transition-all"
                          >
                            📐 Reshape Realm
                          </button>
                        )}
                        
                        {reshapeTargetId !== sidebarEntry.id && (
                          <button 
                            onClick={handleDeleteEntryPoints}
                            className="bg-black hover:bg-red-950/20 text-gray-500 hover:text-red-400 border border-gray-900 hover:border-red-900/40 font-mono text-[9px] py-2.5 rounded-lg tracking-wider uppercase transition-colors"
                          >
                            🗑️ Dissolve Ink
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button 
                onClick={() => { if (onNavigateToRecord) onNavigateToRecord(sidebarEntry.id); }}
                className="w-full bg-[rgb(var(--color-primary)_/_0.05)] hover:bg-[rgb(var(--color-primary)_/_0.1)] border border-[rgb(var(--color-primary)_/_0.2)] hover:border-[rgb(var(--color-primary)_/_0.6)] text-[rgb(var(--color-primary))] font-mono text-[10px] py-2.5 rounded-lg tracking-widest uppercase transition-all shadow-[inset_0_0_10px_rgb(var(--color-primary)_/_0.05)]"
              >
                📖 Open Full Grimoire
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default MapComponent;