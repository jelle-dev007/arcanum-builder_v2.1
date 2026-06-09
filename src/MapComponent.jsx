import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import DrawingLayer from './DrawingLayer';

// Reusable bracket corners (same as App.jsx)
const BracketCorners = ({ size = 14, opacity = 0.7 }) => (
    <>
      <span className="absolute top-0 left-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1px solid rgba(var(--color-primary), ${opacity})`, borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
      <span className="absolute top-0 right-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1px solid rgba(var(--color-primary), ${opacity})`, borderRight: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
      <span className="absolute bottom-0 left-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`, borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
      <span className="absolute bottom-0 right-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`, borderRight: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
    </>
);

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

  const mapContainerRef = useRef(null);
  const transformRef    = useRef(null);
  const mapUploadRef    = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container dimensions for fit-scale calculation
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const CONTENT_W = 1200;
  const CONTENT_H = 800;
  const fitScale = containerSize.width > 0 && containerSize.height > 0
    ? Math.min(containerSize.width / CONTENT_W, containerSize.height / CONTENT_H)
    : 1;

  // Sync transform when container is resized
  useEffect(() => {
    if (containerSize.width > 0 && transformRef.current) {
      transformRef.current.centerView(fitScale, 0);
    }
  }, [fitScale]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (reshapeTargetId) setReshapeTargetId(null);
        if (isDrawingMode) { setIsDrawingMode(false); setCurrentPoints([]); }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [reshapeTargetId, isDrawingMode]);

  useEffect(() => {
    if (!hoveredEntry || !hoveredEntry.images || hoveredEntry.images.length <= 1) {
      setSlideshowIndex(0); return;
    }
    const interval = setInterval(() => {
      setSlideshowIndex((prev) => (prev + 1) % hoveredEntry.images.length);
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
    setSelectedEntryId("new");
    setShowLinkModal(true);
  };

  const executeBinding = () => {
    if (selectedEntryId === "new") {
      const newEntry = {
        id: Date.now(),
        name: `UNNAMED ${creationType.toUpperCase()}`,
        subdivision: creationType,
        type: creationType,
        points: [...currentPoints],
        summary: "Drawn from canvas. Click to update profile.",
        lore: "",
        characters: "",
        color: creationType === 'landmark' ? '#ef4444' : '#c9a84c',
        images: []
      };
      setMapData([...mapData, newEntry]);
    } else {
      setMapData(mapData.map(entry =>
          String(entry.id) === String(selectedEntryId)
              ? { ...entry, points: [...currentPoints], type: creationType, subdivision: creationType }
              : entry
      ));
    }
    setCurrentPoints([]);
    setIsDrawingMode(false);
    setShowLinkModal(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateMapImage(reader.result);
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleQuickEditSave = (field, value) => {
    if (!sidebarEntry) return;
    const updatedEntry = { ...sidebarEntry, [field]: value };
    setSidebarEntry(updatedEntry);
    setMapData(mapData.map(entry =>
        String(entry.id) === String(sidebarEntry.id) ? updatedEntry : entry
    ));
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
      setMapData(mapData.map(entry =>
          String(entry.id) === String(sidebarEntry.id) ? { ...entry, points: null } : entry
      ));
      setSidebarEntry(null); setReshapeTargetId(null);
    }
  };

  const availableLinkOptions = mapData.filter(entry =>
      entry.subdivision !== 'character' && entry.type !== 'character'
  );

  const typeLabel = { region: 'Territory', landmark: 'Landmark', road: 'Route' };

  return (
      <div className="w-full h-full overflow-auto custom-scrollbar">
        <div
            className="flex relative w-full overflow-visible min-h-[780px]"
            style={{
              border: '1px solid rgba(var(--color-primary), 0.08)',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.08)'
            }}
        >
          {/* GLOBAL CARTOGRAPHY INK FILTERS */}
          <svg className="absolute w-0 h-0 invisible">
            <defs>
              <filter id="hand-drawn-edge" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>

          {/* ================= MAP CONSOLE ================= */}
          <div className="flex-1 flex flex-col items-center p-5 relative">

            {/* CONTROLS BAR */}
            {!isFocusMode && (
                <div
                    className="w-full max-w-4xl p-3 rounded flex flex-wrap justify-between items-center gap-4 z-20 animate-fadeIn mb-2"
                    style={{
                      background: 'rgba(var(--color-bg-surface), 0.75)',
                      border: '1px solid rgba(var(--color-primary), 0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                >
                  {/* Visibility toggles */}
                  <div className="flex gap-5 font-mono text-[9px] tracking-[0.18em] text-gray-500">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-gray-300 transition-colors">
                      <input
                          type="checkbox" checked={showRegions}
                          onChange={() => setShowRegions(!showRegions)}
                          className="rounded bg-black border-gray-800"
                          style={{ accentColor: 'rgb(var(--color-primary))' }}
                      />
                      TERRITORIES
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-gray-300 transition-colors">
                      <input
                          type="checkbox" checked={showLandmarks}
                          onChange={() => setShowLandmarks(!showLandmarks)}
                          className="rounded bg-black border-gray-800"
                          style={{ accentColor: 'rgb(var(--color-primary))' }}
                      />
                      LANDMARKS & ROUTES
                    </label>
                  </div>

                  {/* Drawing controls */}
                  <div className="flex items-center gap-2">
                    <select
                        value={creationType}
                        onChange={(e) => { setCreationType(e.target.value); setCurrentPoints([]); }}
                        disabled={isDrawingMode || !!reshapeTargetId}
                        className="input-arcane text-[10px] py-1.5 px-2 w-auto"
                        style={{ borderRadius: '2px' }}
                    >
                      <option value="region">TERRITORY</option>
                      <option value="landmark">LANDMARK</option>
                      <option value="road">ROUTE</option>
                    </select>

                    <button
                        onClick={() => { setIsDrawingMode(!isDrawingMode); setCurrentPoints([]); setReshapeTargetId(null); }}
                        disabled={!!reshapeTargetId}
                        className="font-mono text-[9px] px-4 py-1.5 tracking-[0.18em] uppercase border transition-all duration-300"
                        style={{
                          borderRadius: '2px',
                          background: isDrawingMode
                              ? 'rgba(var(--color-primary), 0.12)'
                              : 'rgba(0,0,0,0.4)',
                          color: isDrawingMode ? 'rgb(var(--color-primary))' : '#4b5563',
                          borderColor: isDrawingMode
                              ? 'rgba(var(--color-primary), 0.5)'
                              : 'rgba(var(--color-primary), 0.1)',
                          boxShadow: isDrawingMode ? '0 0 12px rgba(var(--color-primary), 0.15)' : 'none',
                        }}
                    >
                      {isDrawingMode ? "Inscribing..." : "Commence Cartography"}
                    </button>

                    {isDrawingMode && (
                        <button
                            onClick={handleFinishDrawing}
                            className="font-mono text-[9px] px-4 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                            style={{
                              borderRadius: '2px',
                              background: 'rgba(34, 197, 94, 0.08)',
                              color: 'rgba(74, 222, 128, 0.85)',
                              borderColor: 'rgba(74, 222, 128, 0.3)',
                            }}
                        >
                          Seal Ink
                        </button>
                    )}

                    <div style={{ width: 1, height: 16, background: 'rgba(var(--color-primary), 0.12)', margin: '0 2px' }} />
                    <button
                        onClick={() => mapUploadRef.current?.click()}
                        className="font-mono text-[9px] px-3 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                        style={{
                          borderRadius: '2px',
                          background: 'rgba(0,0,0,0.4)',
                          color: 'rgba(var(--color-primary), 0.5)',
                          borderColor: 'rgba(var(--color-primary), 0.1)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.35)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--color-primary), 0.5)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.1)'; }}
                        title={currentMap.imageUrl ? 'Replace map image' : 'Upload map image'}
                    >
                      ↑ {currentMap.imageUrl ? 'Replace Map' : 'Upload Map'}
                    </button>
                  </div>
                </div>
            )}

            {/* HOVER TOOLTIP */}
            {hoveredEntry && !isDrawingMode && !reshapeTargetId && (
                <div
                    className="fixed tooltip-arcane p-4 rounded max-w-xs w-60 z-[999] pointer-events-none space-y-2"
                    style={{ top: tooltipPos.y, left: tooltipPos.x, borderRadius: '3px' }}
                >
                  <h4
                      className="font-display text-[11px] tracking-[0.14em] uppercase"
                      style={{ color: hoveredEntry.color || 'rgb(var(--color-primary))', textShadow: '0 0 8px currentColor' }}
                  >
                    {hoveredEntry.name}
                  </h4>
                  {hoveredEntry.images && hoveredEntry.images.length > 0 && (
                      <div className="w-full h-24 relative rounded overflow-hidden bg-black/40 mt-1 mb-1"
                           style={{ border: '1px solid rgba(var(--color-primary), 0.08)' }}>
                        <img src={hoveredEntry.images[slideshowIndex]} alt="Archive Presentation" className="w-full h-full object-cover" />
                        {hoveredEntry.images.length > 1 && (
                            <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 text-[7px] font-mono text-gray-500 rounded">
                              {slideshowIndex + 1} / {hoveredEntry.images.length}
                            </div>
                        )}
                      </div>
                  )}
                  <p className="font-mono text-[10px] text-gray-500 leading-relaxed line-clamp-3">
                    {hoveredEntry.summary || "No lore recorded."}
                  </p>
                  <span className="font-mono text-[7px] text-gray-700 block pt-1 uppercase tracking-widest">
                ◈ Double-click to open Grimoire
              </span>
                </div>
            )}

            {/* MAP CANVAS */}
            <div
                ref={mapContainerRef}
                className="mt-2 p-px relative w-full"
                style={{
                  height: '70vh',
                  borderRadius: '4px',
                  border: '1px solid rgba(var(--color-primary), 0.1)',
                  overflow: 'hidden',
                }}
            >
              <BracketCorners size={12} opacity={0.3} />
              <TransformWrapper
                  ref={transformRef}
                  disabled={isDrawingMode || !!reshapeTargetId}
                  initialScale={fitScale > 0 ? fitScale : 1}
                  minScale={fitScale > 0 ? fitScale : 0.1}
                  maxScale={Math.max((fitScale > 0 ? fitScale : 1) * 6, 4)}
                  limitToBounds={true}
                  centerOnInit={true}
                  panning={{ velocityDisabled: true }}
                  onPanningStop={(ref) => {
                    const min = fitScale > 0 ? fitScale : 1;
                    if (ref.state.scale <= min * 1.01) {
                      transformRef.current?.centerView(min, 200);
                    }
                  }}
              >
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                  <div className="relative w-[1200px] h-[800px]">
                    {/* Hidden file input — triggered by buttons below */}
                    <input
                        ref={mapUploadRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />

                    {currentMap.imageUrl ? (
                        <img
                            src={currentMap.imageUrl}
                            alt="Arcane Map Plane"
                            className="w-full h-full object-contain pointer-events-none"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex flex-col items-center justify-center gap-4 transition-colors group cursor-pointer"
                            style={{
                              border: '1px dashed rgba(var(--color-primary), 0.12)',
                              background: 'rgba(0,0,0,0.15)',
                              position: 'relative',
                              zIndex: 20,
                            }}
                            onClick={() => mapUploadRef.current?.click()}
                        >
                          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1"
                            style={{ width: 44, height: 44, color: 'rgba(var(--color-primary), 0.3)', transition: 'color .3s' }}
                            className="group-hover:!text-[rgba(var(--color-primary),0.7)]"
                          >
                            <rect x="4" y="8" width="32" height="24" rx="1.5" />
                            <polyline points="4,28 12,18 18,24 26,14 36,28" strokeLinejoin="round" />
                            <circle cx="29" cy="15" r="3" />
                          </svg>
                          <div className="text-center" style={{ pointerEvents: 'none' }}>
                            <p className="font-display tracking-[0.22em] uppercase"
                              style={{ fontSize: 11, color: 'rgba(var(--color-primary), 0.45)', transition: 'color .3s' }}>
                              Upload Map Image
                            </p>
                            <p className="font-mono mt-1"
                              style={{ fontSize: 9, color: 'rgba(var(--color-primary-soft), 0.25)', letterSpacing: '0.1em' }}>
                              Click to select from your computer
                            </p>
                          </div>
                        </div>
                    )}
                    <div className="absolute inset-0 z-10">
                      <DrawingLayer
                          width={1200} height={800}
                          isDrawingMode={isDrawingMode}
                          reshapeTargetId={reshapeTargetId}
                          mapData={mapData} setMapData={setMapData}
                          sidebarEntry={sidebarEntry} setSidebarEntry={setSidebarEntry}
                          currentPoints={currentPoints} setCurrentPoints={setCurrentPoints}
                          onHoverEntry={(e, entry) => {
                            setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
                            setHoveredEntry(entry);
                          }}
                          onLeaveEntry={() => setHoveredEntry(null)}
                          onClickEntry={(entry) => { setSidebarEntry(entry); setIsQuickEditing(false); setReshapeTargetId(null); }}
                          onDoubleClickEntry={(entry) => { if (onNavigateToRecord) onNavigateToRecord(entry.id); }}
                          showRegions={showRegions} showLandmarks={showLandmarks}
                          creationType={creationType}
                      />
                    </div>
                  </div>
                </TransformComponent>
              </TransformWrapper>
            </div>
          </div>

          {/* ================= BINDING MODAL ================= */}
          {showLinkModal && (
              <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[1000] p-4">
                <div
                    className="modal-panel p-6 max-w-md w-full space-y-4 animate-fadeIn relative"
                    style={{ borderRadius: '4px' }}
                >
                  <BracketCorners size={10} opacity={0.4} />
                  <div>
                <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.6)' }}>
                  Bind Geometric Boundary
                </span>
                    <h3 className="font-display text-sm tracking-wide mt-1" style={{ color: 'rgb(var(--color-primary))' }}>
                      Seal the Inscription
                    </h3>
                    <p className="font-mono text-[9px] text-gray-600 mt-1">
                      Select an existing record to bind, or manifest a new ledger entry.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="field-label">Target Chronicle</label>
                    <select
                        value={selectedEntryId}
                        onChange={(e) => setSelectedEntryId(e.target.value)}
                        className="input-arcane"
                    >
                      <option value="new">＋ Create New Chronicle Ledger</option>
                      {availableLinkOptions.map(option => (
                          <option key={option.id} value={option.id}>
                            Bind to: {option.name.toUpperCase()} ({typeLabel[option.type] || option.type || 'Territory'})
                          </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={executeBinding} className="btn-primary flex-1">
                      Confirm Placement
                    </button>
                    <button onClick={() => setShowLinkModal(false)} className="btn-ghost px-4">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
          )}

          {/* ================= SIDEBAR PROFILE DRAWER ================= */}
          <div
              className={`absolute top-0 right-0 h-full w-80 z-[400] transform transition-transform duration-300 flex flex-col sidebar-obsidian ${sidebarEntry ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {sidebarEntry && (
                <div className="flex flex-col h-full justify-between pt-14 pb-4 overflow-y-auto px-5 arcane-scroll">
                  <div className="space-y-5">
                    {/* Entry header */}
                    <div className="space-y-2 pb-4" style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.08)' }}>
                      <div className="flex justify-between items-start">
                        <span className="field-label">{typeLabel[sidebarEntry.type] || sidebarEntry.type || 'Entity'} Chronicle</span>
                        <button
                            onClick={() => { setSidebarEntry(null); setReshapeTargetId(null); setIsQuickEditing(false); }}
                            className="font-mono text-[8px] text-gray-600 hover:text-gray-300 uppercase tracking-widest transition-colors"
                        >
                          [ close ]
                        </button>
                      </div>
                      <h3
                          className="font-display text-lg tracking-[0.1em] uppercase"
                          style={{
                            color: sidebarEntry.color || 'rgb(var(--color-primary))',
                            textShadow: '0 0 14px rgba(var(--color-primary), 0.3)'
                          }}
                      >
                        {sidebarEntry.name}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {!isQuickEditing ? (
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <span className="field-label">True Name</span>
                              <p className="font-mono text-[11px] text-gray-400 tracking-wide">{sidebarEntry.name}</p>
                            </div>

                            {sidebarEntry.images && sidebarEntry.images.length > 0 && (
                                <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(var(--color-primary), 0.06)' }}>
                                  <span className="field-label">Visual Records</span>
                                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                                    {sidebarEntry.images.map((imgSrc, i) => (
                                        <div
                                            key={i}
                                            className="h-16 overflow-hidden bg-black relative"
                                            style={{ borderRadius: '2px', border: '1px solid rgba(var(--color-primary), 0.06)' }}
                                        >
                                          <img src={imgSrc} alt="Chronicle" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                  </div>
                                </div>
                            )}

                            <div className="space-y-1 pt-3" style={{ borderTop: '1px solid rgba(var(--color-primary), 0.06)' }}>
                              <span className="field-label">Parchment Lore</span>
                              <p className="font-mono text-[10px] text-gray-500 leading-relaxed italic">
                                {sidebarEntry.summary || "No lore recorded yet."}
                              </p>
                            </div>
                          </div>
                      ) : (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-1">
                              <label className="field-label">Rename Entity</label>
                              <input
                                  className="input-arcane text-[11px]"
                                  value={sidebarEntry.name || ""}
                                  onChange={(e) => handleQuickEditSave('name', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="field-label">Rewrite Lore</label>
                              <textarea
                                  className="input-arcane text-[11px] h-24 resize-none"
                                  value={sidebarEntry.summary || ""}
                                  onChange={(e) => handleQuickEditSave('summary', e.target.value)}
                              />
                            </div>
                            <button
                                onClick={() => setIsQuickEditing(false)}
                                className="btn-ghost w-full text-[9px] py-2"
                            >
                              Inscribe Changes
                            </button>
                          </div>
                      )}
                    </div>
                  </div>

                  {/* Operator Actions */}
                  <div className="space-y-2 pt-4 mt-4" style={{ borderTop: '1px solid rgba(var(--color-primary), 0.08)' }}>
                    {!isFocusMode && (
                        <>
                          {!isQuickEditing && (
                              <button
                                  onClick={() => setIsQuickEditing(true)}
                                  className="btn-ghost w-full text-[9px] py-2"
                              >
                                ◈ Edit Lore
                              </button>
                          )}

                          {sidebarEntry.points && (
                              <div className="grid grid-cols-2 gap-2">
                                {reshapeTargetId === sidebarEntry.id ? (
                                    <>
                                      <button
                                          onClick={toggleReshapeBordersMode}
                                          className="btn-primary text-[9px] py-2"
                                      >
                                        ◉ Seal Borders
                                      </button>
                                      <button
                                          onClick={() => setReshapeTargetId(null)}
                                          className="btn-ghost text-[9px] py-2"
                                      >
                                        ✕ Cancel
                                      </button>
                                    </>
                                ) : (
                                    <>
                                      <button
                                          onClick={toggleReshapeBordersMode}
                                          className="btn-ghost text-[9px] py-2"
                                      >
                                        ◎ Reshape
                                      </button>
                                      <button
                                          onClick={handleDeleteEntryPoints}
                                          className="btn-danger text-[9px] py-2"
                                      >
                                        ✕ Dissolve
                                      </button>
                                    </>
                                )}
                              </div>
                          )}
                        </>
                    )}

                    <button
                        onClick={() => { if (onNavigateToRecord) onNavigateToRecord(sidebarEntry.id); }}
                        className="btn-primary w-full text-[9px] py-2.5"
                    >
                      ◈ Open Full Grimoire
                    </button>
                  </div>
                </div>
            )}
          </div>

        </div>
      </div>
  );
};

export default MapComponent;