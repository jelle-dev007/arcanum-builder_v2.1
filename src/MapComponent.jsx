import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { toPng } from 'html-to-image';
import DrawingLayer from './DrawingLayer';
import BracketCorners from './BracketCorners';
import FloatingLayersPanel from './components/FloatingLayersPanel';
import { CANVAS_W, CANVAS_H, DEFAULT_REGION_COLOR, DEFAULT_LANDMARK_COLOR } from './constants';

const MapComponent = ({
  mapData, setMapData,
  onNavigateToRecord,
  currentMap,
  updateMapImage,
  isFocusMode,
  textLabels, setTextLabels,
  layers, activeLayerId, setLayers, setActiveLayerId,
}) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isLabelMode, setIsLabelMode] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [pendingLabelPos, setPendingLabelPos] = useState(null);
  const [labelText, setLabelText] = useState('');
  const [labelColor, setLabelColor] = useState('#c9a84c');
  const [labelLoreModal, setLabelLoreModal] = useState(null);
  const [labelLoreSearch, setLabelLoreSearch] = useState('');
  const [labelSidebar, setLabelSidebar] = useState(null);
  const [creationType, setCreationType] = useState('region');
  const [currentPoints, setCurrentPoints] = useState([]);
  const [showRegions, setShowRegions] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [inkIntensity, setInkIntensity] = useState(15);
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [sidebarEntry, setSidebarEntry] = useState(null);
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [reshapeTargetId, setReshapeTargetId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapCanvasRef    = useRef(null);
  const transformRef    = useRef(null);
  const mapUploadRef    = useRef(null);
  const undoStackRef    = useRef([]);
  const redoStackRef    = useRef([]);
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

  const fitScale = containerSize.width > 0 && containerSize.height > 0
    ? Math.min(containerSize.width / CANVAS_W, containerSize.height / CANVAS_H)
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
        if (isDrawingMode) exitDrawingMode();
        if (isLabelMode) setIsLabelMode(false);
        if (pendingLabelPos) setPendingLabelPos(null);
      }
      if (isDrawingMode && e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (undoStackRef.current.length > 0) {
          redoStackRef.current.push([...currentPoints]);
          setCurrentPoints(undoStackRef.current.pop());
        }
      }
      if (isDrawingMode && e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        if (redoStackRef.current.length > 0) {
          undoStackRef.current.push([...currentPoints]);
          setCurrentPoints(redoStackRef.current.pop());
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [reshapeTargetId, isDrawingMode, isLabelMode, pendingLabelPos, currentPoints]);

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
      setIsLabelMode(false);
      setShowLayersPanel(false);
      setPendingLabelPos(null);
      setLabelSidebar(null);
    }
  }, [isFocusMode]);

  const exitDrawingMode = () => {
    setIsDrawingMode(false);
    setCurrentPoints([]);
    undoStackRef.current = [];
    redoStackRef.current = [];
  };
  const closeSidebar = () => { setSidebarEntry(null); setReshapeTargetId(null); setIsQuickEditing(false); };

  const onAddPoint = (x, y, replace = false) => {
    undoStackRef.current.push([...currentPoints]);
    redoStackRef.current = [];
    if (replace) {
      setCurrentPoints([x, y]);
    } else {
      setCurrentPoints(prev => [...prev, x, y]);
    }
  };

  const handleFinishDrawing = () => {
    if (creationType !== 'landmark' && currentPoints.length < 4) {
      alert("Incomplete geometric leylines. Plot more anchor points first.");
      return;
    }
    setSelectedEntryId("new");
    setShowLinkModal(true);
  };

  const handleExportPng = async () => {
    if (!mapCanvasRef.current) return;
    try {
      const dataUrl = await toPng(mapCanvasRef.current, { cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'arcanum-map.png';
      a.click();
    } catch (err) {
      console.error('PNG export failed', err);
    }
  };

  const handleLabelClick = (x, y) => {
    setLabelSidebar(null);
    setPendingLabelPos({ x, y });
    setLabelText('');
    setLabelColor('#c9a84c');
  };

  const commitLabel = () => {
    if (!labelText.trim() || !pendingLabelPos) return;
    if (pendingLabelPos.editingId) {
      if (setTextLabels) setTextLabels(prev =>
        prev.map(l => l.id === pendingLabelPos.editingId
          ? { ...l, text: labelText.trim().toUpperCase(), color: labelColor }
          : l
        )
      );
    } else {
      const newLabel = {
        id: Date.now(),
        x: pendingLabelPos.x,
        y: pendingLabelPos.y,
        text: labelText.trim().toUpperCase(),
        color: labelColor,
        fontSize: 20,
      };
      if (setTextLabels) setTextLabels(prev => [...prev, newLabel]);
    }
    setPendingLabelPos(null);
    setLabelText('');
  };

  const handleClickLabel = (label) => {
    setSidebarEntry(null);
    setReshapeTargetId(null);
    setIsQuickEditing(false);
    setLabelSidebar(label);
  };

  const handleHoverLabel = (label, e) => {
    const record = mapData.find(r => r.id === label.recordId);
    if (record) {
      setHoveredEntry(record);
      setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 });
    }
  };

  const handleLeaveLabel = () => setHoveredEntry(null);

  const handleConnectLabelLore = (recordId) => {
    if (!labelLoreModal) return;
    setTextLabels(prev => prev.map(l => l.id === labelLoreModal.label.id ? { ...l, recordId } : l));
    setLabelLoreModal(null);
    setLabelLoreSearch('');
  };

  const handleCreateLabelLore = (labelOverride = null) => {
    const target = labelOverride || labelLoreModal?.label;
    if (!target) return;
    const newRecord = {
      id: Date.now(),
      name: target.text,
      type: 'place',
      subdivision: 'place',
      summary: '',
      lore: '',
      characters: '',
      images: [],
      color: target.color || '#c9a84c',
    };
    setMapData(prev => [...prev, newRecord]);
    setTextLabels(prev => prev.map(l => l.id === target.id ? { ...l, recordId: newRecord.id } : l));
    if (labelOverride) {
      setLabelSidebar(null);
    } else {
      setLabelLoreModal(null);
      setLabelLoreSearch('');
    }
    if (onNavigateToRecord) onNavigateToRecord(newRecord.id);
  };

  const updateLabelSidebar = (changes) => {
    if (!labelSidebar) return;
    const updated = { ...labelSidebar, ...changes };
    setLabelSidebar(updated);
    setTextLabels(prev => prev.map(l => l.id === labelSidebar.id ? updated : l));
  };

  const handleDeleteLabel = (labelId) => {
    if (setTextLabels) setTextLabels(prev => prev.filter(l => l.id !== labelId));
  };

  const handleMoveLabel = (labelId, newX, newY) => {
    if (setTextLabels) setTextLabels(prev =>
      prev.map(l => l.id === labelId ? { ...l, x: newX, y: newY } : l)
    );
  };

  const handleAddLayer = () => {
    const newLayer = { id: `layer-${Date.now()}`, name: `LAYER ${(layers || []).length + 1}`, visible: true, opacity: 1 };
    if (setLayers) setLayers(prev => [...prev, newLayer]);
    if (setActiveLayerId) setActiveLayerId(newLayer.id);
  };

  const handleReorderLayers = (newOrder) => {
    if (setLayers) setLayers(newOrder);
  };

  const handleSetLayerOpacity = (id, value) => {
    if (setLayers) setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity: value } : l));
  };

  const handleRenameLayer = (id, name) => {
    if (setLayers) setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  };

  const handleToggleLayerVisibility = (id) => {
    if (setLayers) setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleDeleteLayer = (id) => {
    if (setLayers) setLayers(prev => prev.filter(l => l.id !== id));
    // Reassign entries on that layer to the base layer
    setMapData(prev => prev.map(e => e.layerId === id ? { ...e, layerId: null } : e));
    if (activeLayerId === id && setActiveLayerId) {
      const remaining = (layers || []).filter(l => l.id !== id);
      setActiveLayerId(remaining[0]?.id || null);
    }
  };

  const executeBinding = () => {
    if (selectedEntryId === "new") {
      const newEntry = {
        id: Date.now(),
        name: `UNNAMED ${creationType.toUpperCase()}`,
        type: creationType,
        points: [...currentPoints],
        summary: "Drawn from canvas. Click to update profile.",
        lore: "",
        characters: "",
        color: creationType === 'landmark' ? DEFAULT_LANDMARK_COLOR : DEFAULT_REGION_COLOR,
        images: [],
        ...(creationType === 'road' && { lineStyle: 'solid' }),
        ...(activeLayerId ? { layerId: activeLayerId } : {}),
      };
      setMapData([...mapData, newEntry]);
    } else {
      setMapData(mapData.map(entry =>
          String(entry.id) === String(selectedEntryId)
              ? { ...entry, points: [...currentPoints], type: creationType }
              : entry
      ));
    }
    exitDrawingMode();
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
      exitDrawingMode();
    }
  };

  const handleDeleteEntryPoints = () => {
    if (window.confirm("Dissolve ink boundaries and sever this geographical bond?")) {
      setMapData(mapData.map(entry =>
          String(entry.id) === String(sidebarEntry.id) ? { ...entry, points: null } : entry
      ));
      closeSidebar();
    }
  };

  const availableLinkOptions = mapData.filter(entry => {
    if (entry.type === 'character' || entry.subdivision === 'character') return false;
    if (creationType === 'region') return entry.type === 'region';
    if (creationType === 'landmark') return entry.type === 'landmark';
    return true;
  });

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
          {/* ================= MAP CONSOLE ================= */}
          <div className="flex-1 flex flex-col items-center p-5 relative">

            {/* CONTROLS BAR */}
            {!isFocusMode && (
                <div
                    data-tutorial="controls-bar"
                    className="w-full px-4 py-2.5 rounded flex items-center justify-center gap-3 z-20 animate-fadeIn mb-2"
                    style={{
                      background: 'rgba(var(--color-bg-surface), 0.75)',
                      border: '1px solid rgba(var(--color-primary), 0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                >
                  {/*
                    Flex row: [left flex-1, right-aligned] [fixed spacer = button width] [right flex-1, left-aligned]
                    COMMENCE is position:absolute at left:50% — pixel-perfect centre regardless of content.
                    Both side containers are flex-1 (equal allocated width) so the bar looks balanced.
                    The spacer reserves layout space for the button so side items don't slide under it.
                    Seal Ink sits at the right end of the left container — adjacent to centre.
                    Cancel sits at the left end of the right container — adjacent to centre.
                  */}
                  <div className="font-mono text-[9px] tracking-[0.18em] text-gray-500 w-full"
                       style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

                    {/* LEFT — flex-1, right-aligned; normal controls collapse, Seal Ink expands adjacent to centre */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden', minWidth: 0 }}>
                      {/* Normal left controls */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        opacity: isDrawingMode ? 0 : 1,
                        maxWidth: isDrawingMode ? '0px' : '600px',
                        overflow: 'hidden',
                        transition: 'opacity 0.22s ease, max-width 0.32s ease',
                        pointerEvents: isDrawingMode ? 'none' : 'auto',
                        whiteSpace: 'nowrap',
                      }}>
                        <div data-tutorial="visibility-toggles" className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer hover:text-gray-300 transition-colors">
                            <input type="checkbox" checked={showRegions} onChange={() => setShowRegions(!showRegions)}
                                className="rounded bg-black border-gray-800" style={{ accentColor: 'rgb(var(--color-primary))' }} />
                            TERRITORIES
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:text-gray-300 transition-colors">
                            <input type="checkbox" checked={showLandmarks} onChange={() => setShowLandmarks(!showLandmarks)}
                                className="rounded bg-black border-gray-800" style={{ accentColor: 'rgb(var(--color-primary))' }} />
                            LANDMARKS & ROUTES
                          </label>
                        </div>
                        <div style={{ width: 1, height: 16, background: 'rgba(var(--color-primary), 0.15)', flexShrink: 0 }} />
                        <button
                            data-tutorial="label-btn"
                            onClick={() => { setIsLabelMode(!isLabelMode); setIsDrawingMode(false); setCurrentPoints([]); setReshapeTargetId(null); }}
                            disabled={!!reshapeTargetId || isDrawingMode}
                            title="Place text labels on the map"
                            className="font-mono text-[9px] px-3 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                            style={{
                              borderRadius: '2px',
                              background: isLabelMode ? 'rgba(var(--color-primary), 0.12)' : 'rgba(0,0,0,0.4)',
                              color: isLabelMode ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary), 0.5)',
                              borderColor: isLabelMode ? 'rgba(var(--color-primary), 0.5)' : 'rgba(var(--color-primary), 0.1)',
                              boxShadow: isLabelMode ? '0 0 12px rgba(var(--color-primary), 0.15)' : 'none',
                            }}
                            onMouseEnter={e => { if (!isLabelMode && !isDrawingMode && !reshapeTargetId) { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.4)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(var(--color-primary), 0.16)'; } }}
                            onMouseLeave={e => { if (!isLabelMode) { e.currentTarget.style.color = 'rgba(var(--color-primary), 0.5)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.1)'; e.currentTarget.style.boxShadow = 'none'; } }}
                        >
                          {isLabelMode ? 'Labelling…' : 'Labels'}
                        </button>
                        <button
                            data-tutorial="layers-btn"
                            onClick={() => setShowLayersPanel(!showLayersPanel)}
                            title="Manage map layers"
                            className="font-mono text-[9px] px-3 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                            style={{
                              borderRadius: '2px',
                              background: showLayersPanel ? 'rgba(var(--color-primary), 0.12)' : 'rgba(0,0,0,0.4)',
                              color: showLayersPanel ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary), 0.5)',
                              borderColor: showLayersPanel ? 'rgba(var(--color-primary), 0.5)' : 'rgba(var(--color-primary), 0.1)',
                            }}
                            onMouseEnter={e => { if (!showLayersPanel) { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.4)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(var(--color-primary), 0.16)'; } }}
                            onMouseLeave={e => { if (!showLayersPanel) { e.currentTarget.style.color = 'rgba(var(--color-primary), 0.5)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.1)'; e.currentTarget.style.boxShadow = 'none'; } }}
                        >
                          ⊞ Layers
                        </button>
                      </div>
                      {/* Seal Ink — always rendered, expands adjacent to centre button */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        opacity: isDrawingMode ? 1 : 0,
                        maxWidth: isDrawingMode ? '120px' : '0px',
                        overflow: 'hidden',
                        transition: isDrawingMode
                          ? 'opacity 0.2s ease 0.18s, max-width 0.28s ease 0.12s'
                          : 'opacity 0.15s ease, max-width 0.2s ease',
                        pointerEvents: isDrawingMode ? 'auto' : 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        <button onClick={handleFinishDrawing}
                            className="font-mono text-[9px] px-4 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                            style={{ borderRadius: '2px', background: 'rgba(34,197,94,0.08)', color: 'rgba(74,222,128,0.85)', borderColor: 'rgba(74,222,128,0.3)' }}
                            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(34,197,94,0.18)'; el.style.color = 'rgba(74,222,128,1)'; el.style.borderColor = 'rgba(74,222,128,0.7)'; el.style.boxShadow = '0 0 14px rgba(74,222,128,0.45), inset 0 0 8px rgba(74,222,128,0.1)'; }}
                            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(34,197,94,0.08)'; el.style.color = 'rgba(74,222,128,0.85)'; el.style.borderColor = 'rgba(74,222,128,0.3)'; el.style.boxShadow = 'none'; }}>
                          Seal Ink
                        </button>
                      </div>
                    </div>

                    {/* Centre spacer — reserves layout space equal to button width + padding so sides don't overlap it */}
                    <div style={{ flexShrink: 0, width: 'calc(11rem + 1.5rem)' }} />

                    {/* RIGHT — flex-1, left-aligned; Cancel expands adjacent to centre, normal controls collapse */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', overflow: 'hidden', minWidth: 0 }}>
                      {/* Cancel — always rendered, expands adjacent to centre button */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        opacity: isDrawingMode ? 1 : 0,
                        maxWidth: isDrawingMode ? '100px' : '0px',
                        overflow: 'hidden',
                        transition: isDrawingMode
                          ? 'opacity 0.2s ease 0.18s, max-width 0.28s ease 0.12s'
                          : 'opacity 0.15s ease, max-width 0.2s ease',
                        pointerEvents: isDrawingMode ? 'auto' : 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        <button onClick={exitDrawingMode}
                            className="font-mono text-[9px] px-3 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                            style={{ borderRadius: '2px', background: 'rgba(153,27,27,0.08)', color: 'rgba(248,113,113,0.85)', borderColor: 'rgba(248,113,113,0.3)' }}
                            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(153,27,27,0.2)'; el.style.color = 'rgba(248,113,113,1)'; el.style.borderColor = 'rgba(248,113,113,0.7)'; el.style.boxShadow = '0 0 14px rgba(248,113,113,0.45), inset 0 0 8px rgba(248,113,113,0.1)'; }}
                            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(153,27,27,0.08)'; el.style.color = 'rgba(248,113,113,0.85)'; el.style.borderColor = 'rgba(248,113,113,0.3)'; el.style.boxShadow = 'none'; }}>
                          ✕ Cancel
                        </button>
                      </div>
                      {/* Normal right controls */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        opacity: isDrawingMode ? 0 : 1,
                        maxWidth: isDrawingMode ? '0px' : '600px',
                        overflow: 'hidden',
                        transition: 'opacity 0.22s ease, max-width 0.32s ease',
                        pointerEvents: isDrawingMode ? 'none' : 'auto',
                        whiteSpace: 'nowrap',
                      }}>
                        <select data-tutorial="ink-style" value={inkIntensity} onChange={(e) => setInkIntensity(Number(e.target.value))}
                            className="font-mono text-[10px] tracking-[0.14em] cursor-pointer outline-none transition-all duration-200"
                            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(var(--color-primary), 0.12)', color: 'rgba(var(--color-primary), 0.85)', borderRadius: '2px', padding: '0.375rem 0.5rem', textAlign: 'center', lineHeight: '1', boxSizing: 'border-box' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.4)'; e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.boxShadow = '0 0 8px rgba(var(--color-primary), 0.14)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.12)'; e.currentTarget.style.color = 'rgba(var(--color-primary), 0.85)'; e.currentTarget.style.boxShadow = 'none'; }}>
                          <option value={15}>Cartographer's Hand</option>
                          <option value={0}>Straight Lines</option>
                        </select>
                        <div style={{ width: 1, height: 16, background: 'rgba(var(--color-primary), 0.15)', flexShrink: 0 }} />
                        <select data-tutorial="drawing-type" value={creationType} onChange={(e) => { setCreationType(e.target.value); setCurrentPoints([]); }}
                            className="font-mono text-[10px] tracking-[0.14em] cursor-pointer outline-none transition-all duration-200"
                            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(var(--color-primary), 0.12)', color: 'rgba(var(--color-primary), 0.85)', borderRadius: '2px', padding: '0.375rem 0.5rem', textAlign: 'center', lineHeight: '1', boxSizing: 'border-box' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.4)'; e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.boxShadow = '0 0 8px rgba(var(--color-primary), 0.14)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.12)'; e.currentTarget.style.color = 'rgba(var(--color-primary), 0.85)'; e.currentTarget.style.boxShadow = 'none'; }}>
                          <option value="region">TERRITORY</option>
                          <option value="landmark">LANDMARK</option>
                          <option value="road">ROUTE</option>
                        </select>
                        <div style={{ width: 1, height: 16, background: 'rgba(var(--color-primary), 0.15)', flexShrink: 0 }} />
                        <button onClick={() => mapUploadRef.current?.click()}
                            className="font-mono text-[9px] px-3 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                            style={{ borderRadius: '2px', background: 'rgba(0,0,0,0.4)', color: 'rgba(var(--color-primary), 0.5)', borderColor: 'rgba(var(--color-primary), 0.1)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--color-primary), 0.5)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.1)'; }}
                            title={currentMap.imageUrl ? 'Replace map image' : 'Upload map image'}>
                          ↑ {currentMap.imageUrl ? 'Replace Map' : 'Upload Map'}
                        </button>
                        <button
                            data-tutorial="export-btn"
                            onClick={handleExportPng}
                            className="font-mono text-[9px] px-3 py-1.5 tracking-[0.18em] uppercase border transition-all duration-200"
                            style={{ borderRadius: '2px', background: 'rgba(0,0,0,0.4)', color: 'rgba(var(--color-primary), 0.5)', borderColor: 'rgba(var(--color-primary), 0.1)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--color-primary), 0.5)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.1)'; }}
                            title="Export map as PNG">
                          ↓ Export PNG
                        </button>
                      </div>
                    </div>

                    {/* COMMENCE button — absolutely pinned at 50%; z-index 1 keeps it above collapsing side items */}
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 1, padding: '0 0.75rem' }}>
                      <button
                          data-tutorial="draw-btn"
                          onClick={() => { setIsDrawingMode(!isDrawingMode); setCurrentPoints([]); setReshapeTargetId(null); }}
                          disabled={!!reshapeTargetId}
                          className="font-mono text-[9px] px-4 py-1.5 tracking-[0.18em] uppercase border transition-all duration-300"
                          style={{
                            borderRadius: '2px',
                            minWidth: '11rem',
                            background: isDrawingMode ? 'rgba(var(--color-primary), 0.12)' : 'rgba(0,0,0,0.4)',
                            color: isDrawingMode ? 'rgb(var(--color-primary))' : '#4b5563',
                            borderColor: isDrawingMode ? 'rgba(var(--color-primary), 0.5)' : 'rgba(var(--color-primary), 0.1)',
                            boxShadow: isDrawingMode ? '0 0 12px rgba(var(--color-primary), 0.15)' : 'none',
                          }}
                          onMouseEnter={e => { if (!isDrawingMode && !reshapeTargetId) { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.45)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(var(--color-primary), 0.22)'; e.currentTarget.style.background = 'rgba(var(--color-primary), 0.07)'; } }}
                          onMouseLeave={e => { if (!isDrawingMode) { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; } }}
                      >
                        {isDrawingMode ? "Inscribing..." : "Commence Cartography"}
                      </button>
                    </div>

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
                data-tutorial="map-canvas"
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
                  disabled={isDrawingMode || !!reshapeTargetId || isLabelMode}
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
                  <div ref={mapCanvasRef} className="relative w-[1200px] h-[800px]">
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
                          width={CANVAS_W} height={CANVAS_H}
                          isDrawingMode={isDrawingMode}
                          reshapeTargetId={reshapeTargetId}
                          mapData={mapData} setMapData={setMapData}
                          sidebarEntry={sidebarEntry} setSidebarEntry={setSidebarEntry}
                          currentPoints={currentPoints} setCurrentPoints={setCurrentPoints} onAddPoint={onAddPoint}
                          onHoverEntry={(e, entry) => {
                            setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
                            setHoveredEntry(entry);
                          }}
                          onLeaveEntry={() => setHoveredEntry(null)}
                          onClickEntry={(entry) => { setSidebarEntry(entry); setLabelSidebar(null); setIsQuickEditing(false); setReshapeTargetId(null); }}
                          onDoubleClickEntry={(entry) => { if (onNavigateToRecord) onNavigateToRecord(entry.id); }}
                          showRegions={showRegions} showLandmarks={showLandmarks}
                          creationType={creationType}
                          onFinishDrawing={handleFinishDrawing}
                          inkIntensity={inkIntensity}
                          isLabelMode={isLabelMode}
                          textLabels={textLabels || []}
                          onLabelClick={handleLabelClick}
                          onDeleteLabel={handleDeleteLabel}
                          onMoveLabel={handleMoveLabel}
                          onClickLabel={handleClickLabel}
                          onHoverLabel={handleHoverLabel}
                          onLeaveLabel={handleLeaveLabel}
                          layers={layers}
                      />
                    </div>
                  </div>
                </TransformComponent>
              </TransformWrapper>

              {/* Floating layers panel — outside TransformComponent so it doesn't pan with the canvas */}
              {showLayersPanel && layers && (
                <FloatingLayersPanel
                  layers={layers}
                  activeLayerId={activeLayerId}
                  onSetActiveLayer={(id) => { if (setActiveLayerId) setActiveLayerId(id); }}
                  onToggleVisibility={handleToggleLayerVisibility}
                  onAddLayer={handleAddLayer}
                  onRenameLayer={handleRenameLayer}
                  onDeleteLayer={handleDeleteLayer}
                  onReorderLayers={handleReorderLayers}
                  onSetLayerOpacity={handleSetLayerOpacity}
                  onClose={() => setShowLayersPanel(false)}
                />
              )}
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

          {/* ================= LABEL PLACEMENT MODAL ================= */}
          {pendingLabelPos && (
              <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[1000] p-4">
                <div
                    className="modal-panel p-6 max-w-sm w-full space-y-4 animate-fadeIn relative"
                    style={{ borderRadius: '4px' }}
                >
                  <BracketCorners size={10} opacity={0.4} />
                  <div>
                    <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.6)' }}>
                      {pendingLabelPos.editingId ? 'Edit Map Label' : 'Place Map Label'}
                    </span>
                    <p className="font-mono text-[9px] text-gray-600 mt-1">
                      This label floats on the map canvas. Right-click a label to remove it.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="field-label">Label Text</label>
                    <input
                        autoFocus
                        value={labelText}
                        onChange={e => setLabelText(e.target.value)}
                        onKeyDown={e => {
                          e.stopPropagation();
                          if (e.key === 'Enter') commitLabel();
                          if (e.key === 'Escape') setPendingLabelPos(null);
                        }}
                        placeholder="e.g. AVALON FORD..."
                        className="input-arcane uppercase"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="field-label">Color</label>
                    <input
                        type="color"
                        value={labelColor}
                        onChange={e => setLabelColor(e.target.value)}
                        className="w-7 h-7 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="font-mono text-[9px] text-gray-500 uppercase">{labelColor}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                        onClick={commitLabel}
                        disabled={!labelText.trim()}
                        className="btn-primary flex-1"
                    >
                      {pendingLabelPos.editingId ? 'Update Label' : 'Place Label'}
                    </button>
                    <button onClick={() => setPendingLabelPos(null)} className="btn-ghost px-4">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
          )}

          {/* ================= LABEL LORE MODAL ================= */}
          {labelLoreModal && (
              <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[1000] p-4">
                <div className="modal-panel p-6 max-w-sm w-full space-y-4 animate-fadeIn relative" style={{ borderRadius: '4px' }}>
                  <BracketCorners size={10} opacity={0.4} />
                  <div>
                    <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.6)' }}>
                      Inscribe Lore — "{labelLoreModal.label.text}"
                    </span>
                    <p className="font-mono text-[9px] text-gray-600 mt-1">
                      Create a new Place record for this label, or connect it to an existing chronicle entry.
                    </p>
                  </div>

                  <button
                      onClick={handleCreateLabelLore}
                      className="w-full font-mono text-[9px] uppercase tracking-wider py-2.5 border transition-all duration-150"
                      style={{ borderRadius: '2px', background: 'rgba(var(--color-primary), 0.08)', color: 'rgb(var(--color-primary))', borderColor: 'rgba(var(--color-primary), 0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.16)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.08)'; }}
                  >
                    + Create new lore entry (Place)
                  </button>

                  <div className="flex items-center gap-2">
                    <div style={{ flex: 1, height: 1, background: 'rgba(var(--color-primary), 0.08)' }} />
                    <span className="font-mono text-[8px] uppercase tracking-wider text-gray-700">or connect existing</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(var(--color-primary), 0.08)' }} />
                  </div>

                  <input
                      placeholder="Search records..."
                      value={labelLoreSearch}
                      onChange={e => setLabelLoreSearch(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="input-arcane text-[10px]"
                  />

                  <div className="space-y-0.5 max-h-48 overflow-y-auto arcane-scroll">
                    {mapData
                      .filter(r => !r.isFolder && r.type === 'place')
                      .filter(r => !labelLoreSearch || r.name?.toLowerCase().includes(labelLoreSearch.toLowerCase()))
                      .map(record => (
                        <button
                            key={record.id}
                            onClick={() => handleConnectLabelLore(record.id)}
                            className="w-full text-left font-mono text-[9px] px-3 py-1.5 transition-all duration-100"
                            style={{ borderRadius: '2px', background: 'transparent', color: '#9ca3af', border: '1px solid transparent' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.07)'; e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.border = '1px solid rgba(var(--color-primary), 0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.border = '1px solid transparent'; }}
                        >
                          <span style={{ color: 'rgba(var(--color-primary), 0.4)', marginRight: 6, textTransform: 'uppercase', fontSize: 8 }}>
                            {record.subdivision || record.type}
                          </span>
                          {record.name}
                        </button>
                      ))
                    }
                    {mapData.filter(r => !r.isFolder && r.type === 'place' && (!labelLoreSearch || r.name?.toLowerCase().includes(labelLoreSearch.toLowerCase()))).length === 0 && (
                      <p className="font-mono text-[9px] text-gray-700 text-center py-3">No Place records found.</p>
                    )}
                  </div>

                  <button
                      onClick={() => { setLabelLoreModal(null); setLabelLoreSearch(''); }}
                      className="w-full font-mono text-[9px] uppercase tracking-wider transition-colors"
                      style={{ color: 'rgba(var(--color-primary), 0.3)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.65)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.3)'}
                  >Cancel</button>
                </div>
              </div>
          )}

          {/* ================= SIDEBAR PROFILE DRAWER ================= */}
          <div
              className={`absolute top-0 right-0 h-full w-80 z-[400] transform transition-transform duration-300 flex flex-col sidebar-obsidian ${(sidebarEntry || labelSidebar) ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {sidebarEntry && (
                <div className="flex flex-col h-full justify-between pt-14 pb-4 overflow-y-auto px-5 arcane-scroll">
                  <div className="space-y-5">
                    {/* Entry header */}
                    <div className="space-y-2 pb-4" style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.08)' }}>
                      <div className="flex justify-between items-start">
                        <span className="field-label">{typeLabel[sidebarEntry.type] || sidebarEntry.type || 'Entity'} Chronicle</span>
                        <button
                            onClick={closeSidebar}
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

                    {/* Road line style picker */}
                    {sidebarEntry.type === 'road' && (
                      <div className="space-y-1.5 pb-2" style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.06)' }}>
                        <span className="field-label">Line Style</span>
                        <div className="flex gap-1.5">
                          {[
                            { value: 'solid',  label: '─ Solid'  },
                            { value: 'dashed', label: '╌ Dash'   },
                            { value: 'dotted', label: '· Dot'    },
                            { value: 'double', label: '═ Rail'   },
                          ].map(({ value, label }) => {
                            const active = (sidebarEntry.lineStyle || 'solid') === value;
                            return (
                              <button key={value} onClick={() => handleQuickEditSave('lineStyle', value)}
                                className="font-mono text-[9px] px-2 py-1 border transition-all duration-150"
                                style={{ borderRadius: '2px', background: active ? 'rgba(var(--color-primary), 0.12)' : 'rgba(0,0,0,0.3)', color: active ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary), 0.38)', borderColor: active ? 'rgba(var(--color-primary), 0.35)' : 'rgba(var(--color-primary), 0.1)' }}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

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

            {/* ── LABEL SIDEBAR — VIEW MODE (not labelling) ── */}
            {!sidebarEntry && labelSidebar && !isLabelMode && (
              <div className="flex flex-col h-full justify-between pt-14 pb-4 overflow-y-auto px-5 arcane-scroll">
                <div className="space-y-5">
                  <div className="space-y-2 pb-4" style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.08)' }}>
                    <div className="flex justify-between items-start">
                      <span className="field-label">Map Label</span>
                      <button onClick={() => setLabelSidebar(null)} className="font-mono text-[8px] text-gray-600 hover:text-gray-300 uppercase tracking-widest transition-colors">[ close ]</button>
                    </div>
                    <h3 className="font-display text-lg tracking-[0.1em] uppercase" style={{ color: labelSidebar.color || 'rgb(var(--color-primary))', textShadow: '0 0 14px rgba(var(--color-primary), 0.3)' }}>
                      {labelSidebar.text}
                    </h3>
                  </div>
                  {labelSidebar.recordId ? (() => {
                    const rec = mapData.find(r => r.id === labelSidebar.recordId);
                    return rec ? (
                      <div className="space-y-4">
                        {rec.images && rec.images.length > 0 && (
                          <div className="w-full h-24 overflow-hidden bg-black/40" style={{ borderRadius: '3px', border: '1px solid rgba(var(--color-primary), 0.08)' }}>
                            <img src={rec.images[0]} alt="Lore" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <span className="field-label">Lore</span>
                          <p className="font-mono text-[10px] text-gray-500 leading-relaxed italic">{rec.summary || "No lore recorded."}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-[10px] text-gray-600 italic">Linked record no longer exists.</p>
                    );
                  })() : (
                    <p className="font-mono text-[10px] text-gray-600 italic">No lore attached to this label.</p>
                  )}
                </div>
                {labelSidebar.recordId && mapData.find(r => r.id === labelSidebar.recordId) && (
                  <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(var(--color-primary), 0.08)' }}>
                    <button onClick={() => { if (onNavigateToRecord) onNavigateToRecord(labelSidebar.recordId); }} className="btn-primary w-full text-[9px] py-2.5">◈ Open in Chronicle</button>
                  </div>
                )}
              </div>
            )}

            {/* ── LABEL SIDEBAR — EDIT MODE (labelling active) ── */}
            {!sidebarEntry && labelSidebar && isLabelMode && (
              <div className="flex flex-col h-full justify-between pt-14 pb-4 overflow-y-auto px-5 arcane-scroll">
                <div className="space-y-4">
                  <div className="space-y-2 pb-4" style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.08)' }}>
                    <div className="flex justify-between items-start">
                      <span className="field-label">Edit Label</span>
                      <button onClick={() => setLabelSidebar(null)} className="font-mono text-[8px] text-gray-600 hover:text-gray-300 uppercase tracking-widest transition-colors">[ close ]</button>
                    </div>
                    <h3 className="font-display text-lg tracking-[0.1em] uppercase" style={{ color: labelSidebar.color || 'rgb(var(--color-primary))', textShadow: '0 0 14px rgba(var(--color-primary), 0.3)' }}>
                      {labelSidebar.text}
                    </h3>
                  </div>

                  <div className="space-y-1">
                    <label className="field-label">Label Text</label>
                    <input
                      className="input-arcane text-[11px] uppercase"
                      value={labelSidebar.text}
                      onChange={(e) => updateLabelSidebar({ text: e.target.value.toUpperCase() })}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="field-label">Color</label>
                    <input
                      type="color"
                      value={labelSidebar.color || '#c9a84c'}
                      onChange={(e) => updateLabelSidebar({ color: e.target.value })}
                      className="w-7 h-7 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="font-mono text-[9px] text-gray-500">{labelSidebar.color || '#c9a84c'}</span>
                  </div>

                  <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(var(--color-primary), 0.06)' }}>
                    <span className="field-label">Lore</span>
                    {labelSidebar.recordId ? (() => {
                      const rec = mapData.find(r => r.id === labelSidebar.recordId);
                      return (
                        <div className="space-y-1.5">
                          <p className="font-mono text-[10px]" style={{ color: 'rgba(var(--color-primary), 0.7)' }}>
                            Connected: <span style={{ color: 'rgb(var(--color-primary))' }}>{rec?.name || '(record deleted)'}</span>
                          </p>
                          <button onClick={() => updateLabelSidebar({ recordId: null })} className="btn-ghost w-full text-[9px] py-1.5">Disconnect Lore</button>
                          {rec && (
                            <button onClick={() => { if (onNavigateToRecord) onNavigateToRecord(labelSidebar.recordId); }} className="btn-ghost w-full text-[9px] py-1.5">◈ Open in Chronicle</button>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => { setLabelLoreModal({ label: labelSidebar }); setLabelLoreSearch(''); setLabelSidebar(null); }}
                          className="btn-ghost w-full text-[9px] py-2"
                        >+ Connect to existing Place</button>
                        <button
                          onClick={() => handleCreateLabelLore(labelSidebar)}
                          className="font-mono text-[9px] uppercase tracking-wider py-2 border w-full transition-all duration-150"
                          style={{ borderRadius: '2px', background: 'rgba(var(--color-primary), 0.08)', color: 'rgb(var(--color-primary))', borderColor: 'rgba(var(--color-primary), 0.3)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.16)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.08)'; }}
                        >+ Create new lore entry</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(var(--color-primary), 0.08)' }}>
                  <button
                    onClick={() => { handleDeleteLabel(labelSidebar.id); setLabelSidebar(null); }}
                    className="btn-danger w-full text-[9px] py-2"
                  >✕ Delete Label</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
  );
};

export default MapComponent;