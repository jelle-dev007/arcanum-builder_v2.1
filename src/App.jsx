import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import MapComponent from './MapComponent';
import RecordHall from './RecordHall';

const hexToRgbObj = (hex) => {
  if (!hex) return { r: 212, g: 175, b: 55 };
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
};

const hexToRgbString = (hex) => {
  const obj = hexToRgbObj(hex);
  return `${obj.r}, ${obj.g}, ${obj.b}`;
};

// ================= ASTRAL HALO BACKGROUND =================
const AstralHaloBackground = ({ activeThemeHex }) => {
  const canvasRef = useRef(null);
  const currentColor = useRef(hexToRgbObj(activeThemeHex));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const ringDefs = [
      { radiusFactor: 0.10, speed: 0.00012, lineW: 1.5, baseAlpha: 0.20, offXFactor: 0.01, offYFactor: -0.01 },
      { radiusFactor: 0.25, speed: -0.00008, lineW: 0.8, baseAlpha: 0.15, offXFactor: -0.02, offYFactor: 0.03 },
      { radiusFactor: 0.37, speed: 0.00010, lineW: 1.2, baseAlpha: 0.20, offXFactor: 0.04, offYFactor: 0.01 },
      { radiusFactor: 0.55, speed: -0.00005, lineW: 2.0, baseAlpha: 0.22, offXFactor: -0.03, offYFactor: -0.05 },
      { radiusFactor: 0.54, speed: 0.00004, lineW: 0.7, baseAlpha: 0.12, offXFactor: 0.06, offYFactor: 0.04 },
      { radiusFactor: 0.86, speed: -0.00003, lineW: 1.1, baseAlpha: 0.15, offXFactor: -0.04, offYFactor: 0.07 },
      { radiusFactor: 0.98, speed: 0.00002, lineW: 0.5, baseAlpha: 0.10, offXFactor: 0.02, offYFactor: -0.02 },
    ];

    const rings = ringDefs.map((def) => ({
      ...def,
      angle: Math.random() * Math.PI * 2,
      glow: 0,
      pulseOffset: Math.random() * Math.PI * 2,
      pulseSpeed: 0.0002 + Math.random() * 0.0003
    }));

    let mouse = { x: -9999, y: -9999, smoothX: -9999, smoothY: -9999 };
    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const targetRgb = hexToRgbObj(activeThemeHex);
      currentColor.current.r += (targetRgb.r - currentColor.current.r) * 0.02;
      currentColor.current.g += (targetRgb.g - currentColor.current.g) * 0.02;
      currentColor.current.b += (targetRgb.b - currentColor.current.b) * 0.02;

      const rgbStr = `${Math.round(currentColor.current.r)}, ${Math.round(currentColor.current.g)}, ${Math.round(currentColor.current.b)}`;

      mouse.smoothX += (mouse.x - mouse.smoothX) * 0.08;
      mouse.smoothY += (mouse.y - mouse.smoothY) * 0.08;

      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.max(width, height);

      if (mouse.smoothX > -1000) {
        const torchGrad = ctx.createRadialGradient(mouse.smoothX, mouse.smoothY, 0, mouse.smoothX, mouse.smoothY, 500);
        torchGrad.addColorStop(0, `rgba(${rgbStr}, 0.06)`);
        torchGrad.addColorStop(1, `rgba(${rgbStr}, 0)`);
        ctx.fillStyle = torchGrad;
        ctx.fillRect(0, 0, width, height);
      }

      rings.forEach((r) => {
        r.angle += r.speed;
        r.pulseOffset += r.pulseSpeed;

        const ringCx = cx + (r.offXFactor * scale);
        const ringCy = cy + (r.offYFactor * scale);
        const radiusPx = r.radiusFactor * scale;

        const dx = mouse.smoothX - ringCx;
        const dy = mouse.smoothY - ringCy;
        const distFromCenterToMouse = Math.sqrt(dx * dx + dy * dy);

        const distToRingEdge = Math.abs(distFromCenterToMouse - radiusPx);
        const RIPPLE_RADIUS = 200;
        const RIPPLE_THICKNESS = 160;
        const distToRipplePeak = Math.abs(distToRingEdge - RIPPLE_RADIUS);

        const targetGlow = distToRipplePeak < RIPPLE_THICKNESS
          ? Math.pow(1 - (distToRipplePeak / RIPPLE_THICKNESS), 2.5) * 0.8
          : 0;

        r.glow += (targetGlow - r.glow) * 0.02;
        const ambientPulse = (Math.sin(r.pulseOffset) * 0.5 + 0.5) * 0.5;

        ctx.save();
        ctx.translate(ringCx, ringCy);
        ctx.rotate(r.angle);
        ctx.beginPath();
        ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
        ctx.setLineDash([]);

        const finalAlpha = r.baseAlpha + (ambientPulse * 0.05) + (r.glow * 0.5);
        ctx.strokeStyle = `rgba(${rgbStr}, ${finalAlpha})`;
        ctx.lineWidth = r.lineW + (r.glow * 1.8);
        ctx.shadowBlur = 8 + (r.glow * 25);
        ctx.shadowColor = `rgba(${rgbStr}, ${0.3 + (r.glow * 0.4)})`;
        ctx.stroke();
        ctx.restore();
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [activeThemeHex]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" />;
};

// ================= MAIN APP =================
function App() {
  const { themeId, setThemeId, allThemes } = useTheme();
  const [view, setView] = useState('home');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);

  // FIX: navigatedRecordId lives here so both Map and RecordHall can share it
  const [navigatedRecordId, setNavigatedRecordId] = useState(null);

  const activeTheme = allThemes?.find(t => t.id === themeId) || { primary: '#d4af37', bgMain: '8, 8, 8', bgSurface: '14, 14, 14' };

  const tabs = [
    { id: 'home', label: 'Sanctum' },
    { id: 'map', label: 'Cartograph' },
    { id: 'recordhall', label: 'Hall of Records' }
  ];

  const [maps, setMaps] = useState(() => JSON.parse(localStorage.getItem('world_archive_maps')) || [{ id: 'map-prime', name: "PRIME MATERIAL PLANE", imageUrl: null, data: [] }]);
  const [activeMapId, setActiveMapId] = useState(() => localStorage.getItem('world_archive_active_id') || 'map-prime');

  // Home screen plane-management UI state
  const [isAddingPlane, setIsAddingPlane] = useState(false);
  const [newPlaneName, setNewPlaneName]   = useState('');
  const [importError, setImportError]     = useState('');
  const importFileRef = useRef(null);

  useEffect(() => { localStorage.setItem('world_archive_maps', JSON.stringify(maps)); }, [maps]);
  useEffect(() => { localStorage.setItem('world_archive_active_id', activeMapId); }, [activeMapId]);

  const currentMap = maps.find(m => m.id === activeMapId) || maps[0] || { id: 'empty', name: 'VOID', data: [] };
  const mapData = currentMap.data;

  const setMapData = React.useCallback((updater) => {
    setMaps(prev =>
      prev.map(m =>
        m.id === activeMapId
          ? { ...m, data: typeof updater === 'function' ? updater(m.data) : updater }
          : m
      )
    );
  }, [activeMapId]);

  const updateMapImage = (newUrl) => setMaps(prev => prev.map(m => m.id === activeMapId ? { ...m, imageUrl: newUrl } : m));

  const handleAddPlane = () => {
    const trimmed = newPlaneName.trim();
    if (!trimmed) return;
    const newMap = { id: `map-${Date.now()}`, name: trimmed.toUpperCase(), imageUrl: null, data: [] };
    setMaps(prev => [...prev, newMap]);
    setActiveMapId(newMap.id);
    setNewPlaneName('');
    setIsAddingPlane(false);
    setView('map');
  };

  const handleSelectPlane = (mapId) => {
    setActiveMapId(mapId);
    setView('map');
  };

  const deleteMap = (e, idToDelete) => {
    e.stopPropagation();
    if (maps.length === 1) { alert("The last plane cannot be severed — the archive must contain at least one."); return; }
    if (window.confirm("Sever this plane and all its chronicle data from the archive?")) {
      setMaps(prev => prev.filter(m => m.id !== idToDelete));
      if (activeMapId === idToDelete) {
        const remaining = maps.filter(m => m.id !== idToDelete);
        setActiveMapId(remaining[0]?.id || null);
      }
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(maps));
    const a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", "arcanum_archive.json");
    document.body.appendChild(a); a.click(); a.remove();
  };

  const handleImportFile = (e) => {
    setImportError('');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = Array.isArray(parsed) ? parsed : [parsed];
        if (!incoming.every(m => m.id && m.name && Array.isArray(m.data))) {
          throw new Error("Unrecognised archive format.");
        }
        setMaps(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const fresh = incoming.filter(m => !existingIds.has(m.id));
          return [...prev, ...fresh];
        });
        setActiveMapId(incoming[0].id);
        setView('map');
      } catch (err) {
        setImportError(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // FIX: handleNavigateToRecord is now correctly inside App, not AstralHaloBackground
  const handleNavigateToRecord = (recordId) => {
    setNavigatedRecordId(recordId);
    setView('recordhall');
  };

  useEffect(() => {
    if (!activeTheme) return;
    const primaryRgbStr = hexToRgbString(activeTheme.primary);
    document.documentElement.style.setProperty('--color-primary', primaryRgbStr);
    document.documentElement.style.setProperty('--color-bg-main', activeTheme.bgMain || '8, 8, 8');
    document.documentElement.style.setProperty('--color-bg-surface', activeTheme.bgSurface || '14, 14, 14');
  }, [activeTheme]);

  const viewIndex = tabs.findIndex(t => t.id === view);

  return (
    <div className="min-h-screen text-gray-300 relative transition-colors duration-1000 ease-in-out overflow-hidden"
      style={{ backgroundColor: `rgb(${activeTheme.bgMain || '8, 8, 8'})` }}>

      <AstralHaloBackground activeThemeHex={activeTheme.primary || '#d4af37'} />

      <style>{`
        .grain-surface::before {
          content: ''; position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
          pointer-events: none; z-index: 1; border-radius: inherit;
          opacity: 0.5; mix-blend-mode: overlay;
        }
        .ethereal-panel {
          background: linear-gradient(145deg, rgba(var(--color-bg-surface), 0.8) 0%, rgba(var(--color-bg-main), 0.9) 100%);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5);
          border: 1px solid rgba(var(--color-primary), 0.08);
          border-top: 1px solid rgba(var(--color-primary), 0.2);
        }
        @keyframes sigilBreathe {
          0%,100% { opacity:0.6; filter:drop-shadow(0 0 4px rgb(var(--color-primary)/0.4)); }
          50%     { opacity:1;  filter:drop-shadow(0 0 12px rgb(var(--color-primary)/0.8)); }
        }
        .sigil-breathe { animation: sigilBreathe 5s ease-in-out infinite; }
        .arcane-scroll::-webkit-scrollbar { width:3px; }
        .arcane-scroll::-webkit-scrollbar-track { background:transparent; }
        .arcane-scroll::-webkit-scrollbar-thumb { background:rgba(var(--color-primary),0.2); border-radius:3px; }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .slide-in-right { animation: slideInFromRight 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
        .slide-in-left  { animation: slideInFromLeft  0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .home-card { animation: fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
        .home-card:nth-child(1) { animation-delay: 0.05s; }
        .home-card:nth-child(2) { animation-delay: 0.15s; }
        .home-card:nth-child(3) { animation-delay: 0.25s; }
        .home-card:nth-child(4) { animation-delay: 0.35s; }
      `}</style>

      {/* HEADER */}
      <header className="relative z-50 backdrop-blur-3xl bg-[rgb(var(--color-bg-surface)_/_0.6)] border-b border-white/5 px-10 py-5 grid grid-cols-3 items-center grain-surface shadow-[0_4px_30px_rgba(0,0,0,0.4)] transition-colors duration-1000">

        {/* Left */}
        <div className="flex items-center gap-5 justify-self-start">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-7 h-7 sigil-breathe">
              <div className="absolute w-full h-full border-[0.5px] border-[rgb(var(--color-primary))] rounded-full opacity-60 transition-colors duration-1000" />
              <div className="absolute w-4 h-4 border-[0.5px] border-[rgb(var(--color-primary))] rotate-45 transition-colors duration-1000" />
              <div className="w-1.5 h-1.5 bg-[rgb(var(--color-primary))] rounded-full transition-colors duration-1000" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif italic tracking-[0.2em] text-[13px] text-[rgb(var(--color-primary))] transition-colors duration-1000">Arcanum</span>
              <span className="font-mono tracking-[0.15em] text-[7px] text-gray-500 uppercase mt-0.5 max-w-[120px] truncate">{currentMap?.name || 'Planar Archive'}</span>
            </div>
          </div>
          {!isFocusMode && (
            <div className="flex gap-2.5 border-l border-white/5 pl-5 ml-2">
              {allThemes?.map((t) => (
                <button key={t.id} onClick={() => setThemeId(t.id)} title={t.name}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${themeId === t.id ? 'ring-1 ring-offset-2 ring-offset-[rgb(var(--color-bg-surface))] scale-110' : 'opacity-30 hover:opacity-100'}`}
                  style={{ backgroundColor: t.primary, boxShadow: themeId === t.id ? `0 0 10px ${t.primary}` : 'none' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Center */}
        <div className="flex justify-center justify-self-center">
          {!isFocusMode && (
            <nav className="flex items-center gap-2">
              {tabs.map((tab) => {
                const isActive = view === tab.id;
                return (
                  <button key={tab.id} onClick={() => setView(tab.id)}
                    className="relative flex flex-col items-center px-6 py-2 font-serif text-[12px] cursor-pointer outline-none transition-all duration-500"
                    style={{ letterSpacing: '0.15em' }}>
                    <span style={{ fontStyle: 'italic', color: isActive ? 'rgb(var(--color-primary))' : '#6b7280', transition: 'color 1s ease' }}>
                      {tab.label}
                    </span>
                    <div className="absolute bottom-1 h-px transition-all duration-700" style={{
                      width: isActive ? '40%' : '0%',
                      background: 'rgb(var(--color-primary))',
                      boxShadow: isActive ? '0 0 6px rgb(var(--color-primary))' : 'none',
                    }} />
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center justify-end justify-self-end">
          <button onClick={() => setIsFocusMode(!isFocusMode)}
            className="font-mono text-[9px] px-6 py-2.5 tracking-[0.25em] uppercase border border-white/5 text-gray-500 hover:text-[rgb(var(--color-primary))] transition-all duration-1000 rounded-full">
            {isFocusMode ? 'Return' : 'Scry'}
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 w-full h-[calc(100vh-80px)] overflow-hidden relative">

        {/* VIEW: HOME / SANCTUM */}
        {view === 'home' && (
          <div className="w-full h-full overflow-y-auto px-6 py-10 slide-in-left">
            <div className="max-w-4xl mx-auto space-y-10">

              {/* Hero */}
              <div className="flex flex-col items-center gap-3 sigil-breathe pt-2">
                <div className="relative flex items-center justify-center w-14 h-14">
                  <div className="absolute w-full h-full border border-[rgb(var(--color-primary))] rounded-full opacity-30 animate-cosmic-rotate" />
                  <div className="absolute w-9 h-9 border border-[rgb(var(--color-primary))] rotate-45 opacity-50" />
                  <div className="w-2.5 h-2.5 bg-[rgb(var(--color-primary))] rounded-full" style={{ boxShadow: '0 0 14px rgb(var(--color-primary))' }} />
                </div>
                <p className="font-serif italic text-3xl tracking-[0.25em] text-[rgb(var(--color-primary))]" style={{ textShadow: '0 0 28px rgba(var(--color-primary),0.35)' }}>Arcanum</p>
                <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-gray-600">Planar Archive — Sanctum Interface</p>
              </div>

              {/* Planes manager */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-gray-600">Registered Planes</p>
                    <p className="font-serif italic text-[rgb(var(--color-primary))] text-sm mt-0.5">
                      {maps.length} plane{maps.length !== 1 ? 's' : ''} in the archive
                      {currentMap && <span className="font-mono text-[10px] text-gray-500 ml-3 not-italic">active: {currentMap.name}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                    <button
                      onClick={() => importFileRef.current?.click()}
                      className="font-mono text-[9px] px-3 py-2 rounded-lg border border-gray-800 text-gray-500 hover:text-gray-200 hover:border-gray-600 uppercase tracking-widest transition-all duration-200"
                    >↑ Import .json</button>
                    <button
                      onClick={handleExport}
                      className="font-mono text-[9px] px-3 py-2 rounded-lg border border-gray-800 text-gray-500 hover:text-gray-200 hover:border-gray-600 uppercase tracking-widest transition-all duration-200"
                    >↓ Export .json</button>
                  </div>
                </div>

                {importError && (
                  <div className="rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-2 font-mono text-[10px] text-red-400 flex justify-between items-center">
                    {importError}
                    <button onClick={() => setImportError('')} className="text-red-600 hover:text-red-400 ml-4">✕</button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {maps.map((m, idx) => {
                    const isActive = m.id === activeMapId;
                    const entryCount = m.data?.length || 0;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectPlane(m.id)}
                        className="home-card group relative text-left rounded-xl border p-4 transition-all duration-300 overflow-hidden"
                        style={{
                          animationDelay: `${idx * 0.06}s`,
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(var(--color-primary),0.1), rgba(var(--color-bg-surface),0.9))'
                            : 'linear-gradient(145deg, rgba(var(--color-bg-surface),0.6), rgba(var(--color-bg-main),0.85))',
                          borderColor: isActive ? 'rgba(var(--color-primary),0.5)' : 'rgba(var(--color-primary),0.1)',
                          boxShadow: isActive ? '0 0 20px rgba(var(--color-primary),0.12)' : '0 4px 20px rgba(0,0,0,0.3)',
                        }}
                      >
                        {isActive && (
                          <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-primary))]"
                            style={{ boxShadow: '0 0 6px rgb(var(--color-primary))' }} />
                        )}
                        <div className="w-full h-20 rounded-lg mb-3 overflow-hidden border border-white/5 bg-black/30 flex items-center justify-center">
                          {m.imageUrl
                            ? <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                            : <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest">No map loaded</span>
                          }
                        </div>
                        <p className="font-serif italic text-[11px] tracking-wide truncate"
                          style={{ color: isActive ? 'rgb(var(--color-primary))' : '#9ca3af' }}>
                          {m.name}
                        </p>
                        <p className="font-mono text-[8px] text-gray-600 mt-0.5 uppercase tracking-widest">
                          {entryCount} chronicle entr{entryCount !== 1 ? 'ies' : 'y'}
                        </p>
                        {maps.length > 1 && (
                          <button
                            onClick={(e) => deleteMap(e, m.id)}
                            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 font-mono text-[8px] text-gray-600 hover:text-red-400 transition-all duration-200 uppercase tracking-wider"
                          >✕ sever</button>
                        )}
                      </button>
                    );
                  })}

                  {!isAddingPlane ? (
                    <button
                      onClick={() => setIsAddingPlane(true)}
                      className="home-card rounded-xl border border-dashed p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 min-h-[148px]"
                      style={{
                        animationDelay: `${maps.length * 0.06}s`,
                        borderColor: 'rgba(var(--color-primary),0.15)',
                        background: 'transparent',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary),0.4)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary),0.15)'}
                    >
                      <span className="text-2xl opacity-40" style={{ color: 'rgb(var(--color-primary))' }}>＋</span>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-gray-600">New Plane</span>
                    </button>
                  ) : (
                    <div
                      className="home-card rounded-xl border p-4 flex flex-col gap-3 min-h-[148px]"
                      style={{
                        animationDelay: `${maps.length * 0.06}s`,
                        borderColor: 'rgba(var(--color-primary),0.3)',
                        background: 'linear-gradient(145deg, rgba(var(--color-bg-surface),0.7), rgba(var(--color-bg-main),0.9))',
                      }}
                    >
                      <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">Name this plane</p>
                      <input
                        autoFocus
                        value={newPlaneName}
                        onChange={e => setNewPlaneName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddPlane();
                          if (e.key === 'Escape') { setIsAddingPlane(false); setNewPlaneName(''); }
                        }}
                        placeholder="e.g. SHADOW REALM..."
                        className="w-full bg-black/50 border border-gray-800 focus:border-[rgb(var(--color-primary))] text-white text-xs font-mono px-3 py-2 rounded-lg outline-none transition-colors placeholder-gray-700"
                      />
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={handleAddPlane}
                          disabled={!newPlaneName.trim()}
                          className="flex-1 font-mono text-[9px] py-1.5 rounded-lg uppercase tracking-widest transition-all duration-200 disabled:opacity-30"
                          style={{ background: 'rgba(var(--color-primary),0.15)', color: 'rgb(var(--color-primary))', border: '1px solid rgba(var(--color-primary),0.3)' }}
                        >Manifest Plane</button>
                        <button
                          onClick={() => { setIsAddingPlane(false); setNewPlaneName(''); }}
                          className="font-mono text-[9px] px-3 py-1.5 rounded-lg border border-gray-800 text-gray-600 hover:text-gray-300 uppercase tracking-widest transition-colors"
                        >Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick-nav row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '🗺️', title: 'Cartograph', desc: 'Navigate and annotate the active plane map.', target: 'map' },
                  { icon: '📖', title: 'Hall of Records', desc: 'Chronicle entries for the active plane.', target: 'recordhall' },
                  { icon: '🔭', title: 'Scry Mode', desc: 'Immersive view — no editing tools.', action: () => { setView('map'); setIsFocusMode(true); } },
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={() => card.action ? card.action() : setView(card.target)}
                    className="home-card text-left p-4 rounded-xl border transition-all duration-300"
                    style={{
                      background: 'linear-gradient(145deg, rgba(var(--color-bg-surface),0.6), rgba(var(--color-bg-main),0.85))',
                      borderColor: 'rgba(var(--color-primary),0.1)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary),0.35)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--color-primary),0.1)'}
                  >
                    <div className="text-xl mb-2">{card.icon}</div>
                    <h3 className="font-serif italic text-[rgb(var(--color-primary))] text-sm tracking-wide mb-1">{card.title}</h3>
                    <p className="font-mono text-[9px] text-gray-600 leading-relaxed">{card.desc}</p>
                  </button>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* VIEW: CARTOGRAPH */}
        {view === 'map' && (
          <div key="map" className="w-full h-full overflow-auto slide-in-right">
            <MapComponent
              mapData={mapData}
              setMapData={setMapData}
              currentMap={currentMap}
              updateMapImage={updateMapImage}
              onNavigateToRecord={handleNavigateToRecord}
              isFocusMode={isFocusMode}
            />
          </div>
        )}

        {/* VIEW: HALL OF RECORDS */}
        {view === 'recordhall' && (
          <div key="recordhall" className="w-full h-full overflow-y-auto slide-in-right">
            <RecordHall
              mapData={mapData}
              setMapData={setMapData}
              isFocusMode={isFocusMode}
              currentPoints={currentPoints}
              setCurrentPoints={setCurrentPoints}
              navigatedRecordId={navigatedRecordId}
              setNavigatedRecordId={setNavigatedRecordId}
            />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;