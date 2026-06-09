import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import MapComponent from './MapComponent';
import RecordHall from './RecordHall';

const hexToRgbObj = (hex) => {
  if (!hex) return { r: 201, g: 168, b: 76 };
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
      { radiusFactor: 0.10, speed: 0.00012, lineW: 1.0, baseAlpha: 0.14, offXFactor: 0.01,  offYFactor: -0.01 },
      { radiusFactor: 0.25, speed: -0.00008, lineW: 0.6, baseAlpha: 0.10, offXFactor: -0.02, offYFactor: 0.03 },
      { radiusFactor: 0.37, speed: 0.00010,  lineW: 0.9, baseAlpha: 0.13, offXFactor: 0.04,  offYFactor: 0.01 },
      { radiusFactor: 0.55, speed: -0.00005, lineW: 1.4, baseAlpha: 0.14, offXFactor: -0.03, offYFactor: -0.05 },
      { radiusFactor: 0.54, speed: 0.00004,  lineW: 0.5, baseAlpha: 0.08, offXFactor: 0.06,  offYFactor: 0.04 },
      { radiusFactor: 0.86, speed: -0.00003, lineW: 0.8, baseAlpha: 0.09, offXFactor: -0.04, offYFactor: 0.07 },
      { radiusFactor: 0.98, speed: 0.00002,  lineW: 0.4, baseAlpha: 0.06, offXFactor: 0.02,  offYFactor: -0.02 },
    ];

    const rings = ringDefs.map((def) => ({
      ...def,
      angle: Math.random() * Math.PI * 2,
      glow: 0,
      pulseOffset: Math.random() * Math.PI * 2,
      pulseSpeed: 0.0001 + Math.random() * 0.0002
    }));

    // Faint star field
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 0.8 + 0.2,
      alpha: Math.random() * 0.35 + 0.05,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.0003 + Math.random() * 0.0005,
      breatheOffset: Math.random() * Math.PI * 2,
      breatheSpeed: 0.004 + Math.random() * 0.005,
      glowMax: Math.random() * 5 + 6,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
    }));

    let mouse = { x: -9999, y: -9999, smoothX: -9999, smoothY: -9999 };
    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const targetRgb = hexToRgbObj(activeThemeHex);
      currentColor.current.r += (targetRgb.r - currentColor.current.r) * 0.015;
      currentColor.current.g += (targetRgb.g - currentColor.current.g) * 0.015;
      currentColor.current.b += (targetRgb.b - currentColor.current.b) * 0.015;
      const rgbStr = `${Math.round(currentColor.current.r)}, ${Math.round(currentColor.current.g)}, ${Math.round(currentColor.current.b)}`;

      mouse.smoothX += (mouse.x - mouse.smoothX) * 0.06;
      mouse.smoothY += (mouse.y - mouse.smoothY) * 0.06;

      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.max(width, height);

      // Star field
      stars.forEach(star => {
        star.x = (star.x + star.vx + width) % width;
        star.y = (star.y + star.vy + height) % height;
        star.twinkleOffset += star.twinkleSpeed;
        star.breatheOffset += star.breatheSpeed;
        const twinkle = (Math.sin(star.twinkleOffset) * 0.5 + 0.5) * 0.3;
        const breathe = Math.pow(Math.sin(star.breatheOffset) * 0.5 + 0.5, 3);
        // Soft outer halo — radial gradient so it fades out smoothly
        const haloR = star.r * 6 + breathe * 10;
        const haloGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, haloR);
        haloGrad.addColorStop(0, `rgba(${rgbStr}, ${breathe * 0.10})`);
        haloGrad.addColorStop(1, `rgba(${rgbStr}, 0)`);
        ctx.beginPath();
        ctx.arc(star.x, star.y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();
        // Core dot with shadow glow
        ctx.save();
        ctx.shadowBlur = breathe * star.glowMax;
        ctx.shadowColor = `rgba(${rgbStr}, 0.8)`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r + breathe * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgbStr}, ${star.alpha + twinkle + breathe * 0.15})`;
        ctx.fill();
        ctx.restore();
      });

      // Proximity torch — soft cursor aura
      if (mouse.smoothX > -1000) {
        const torchGrad = ctx.createRadialGradient(
            mouse.smoothX, mouse.smoothY, 0,
            mouse.smoothX, mouse.smoothY, 420
        );
        torchGrad.addColorStop(0, `rgba(${rgbStr}, 0.04)`);
        torchGrad.addColorStop(1, `rgba(${rgbStr}, 0)`);
        ctx.fillStyle = torchGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Orbital rings with proximity glow
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
        const RIPPLE_RADIUS = 180;
        const RIPPLE_THICKNESS = 140;
        const distToRipplePeak = Math.abs(distToRingEdge - RIPPLE_RADIUS);

        const targetGlow = distToRipplePeak < RIPPLE_THICKNESS
            ? Math.pow(1 - (distToRipplePeak / RIPPLE_THICKNESS), 2.5) * 0.7
            : 0;

        r.glow += (targetGlow - r.glow) * 0.018;
        const ambientPulse = (Math.sin(r.pulseOffset) * 0.5 + 0.5) * 0.4;

        ctx.save();
        ctx.translate(ringCx, ringCy);
        ctx.rotate(r.angle);
        ctx.beginPath();
        ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
        ctx.setLineDash([]);

        const finalAlpha = r.baseAlpha + (ambientPulse * 0.04) + (r.glow * 0.45);
        ctx.strokeStyle = `rgba(${rgbStr}, ${finalAlpha})`;
        ctx.lineWidth = r.lineW + (r.glow * 1.4);
        ctx.shadowBlur = 6 + (r.glow * 20);
        ctx.shadowColor = `rgba(${rgbStr}, ${0.2 + (r.glow * 0.35)})`;
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

// ================= BRACKET CORNER COMPONENT =================
// The signature etched-corner frame element
const BracketCorners = ({ size = 14, opacity = 0.7 }) => (
    <>
      {/* TL */}
      <span className="absolute top-0 left-0 pointer-events-none" style={{
        width: size, height: size,
        borderTop: `1px solid rgba(var(--color-primary), ${opacity})`,
        borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`,
        zIndex: 2
      }} />
      {/* TR */}
      <span className="absolute top-0 right-0 pointer-events-none" style={{
        width: size, height: size,
        borderTop: `1px solid rgba(var(--color-primary), ${opacity})`,
        borderRight: `1px solid rgba(var(--color-primary), ${opacity})`,
        zIndex: 2
      }} />
      {/* BL */}
      <span className="absolute bottom-0 left-0 pointer-events-none" style={{
        width: size, height: size,
        borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`,
        borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`,
        zIndex: 2
      }} />
      {/* BR */}
      <span className="absolute bottom-0 right-0 pointer-events-none" style={{
        width: size, height: size,
        borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`,
        borderRight: `1px solid rgba(var(--color-primary), ${opacity})`,
        zIndex: 2
      }} />
    </>
);

// ================= MAIN APP =================
function App() {
  const { themeId, setThemeId, allThemes } = useTheme();
  const [view, setView] = useState('home');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [navigatedRecordId, setNavigatedRecordId] = useState(null);

  const activeTheme = allThemes?.find(t => t.id === themeId) || {
    primary: '#c9a84c', bgMain: '5, 5, 8', bgSurface: '11, 11, 16'
  };

  const tabs = [
    { id: 'home',       label: 'Sanctum' },
    { id: 'map',        label: 'Cartograph' },
    { id: 'recordhall', label: 'Hall of Records' }
  ];

  const [maps, setMaps] = useState(() =>
      JSON.parse(localStorage.getItem('world_archive_maps')) ||
      [{ id: 'map-prime', name: "PRIME MATERIAL PLANE", imageUrl: null, data: [] }]
  );
  const [activeMapId, setActiveMapId] = useState(() =>
      localStorage.getItem('world_archive_active_id') || 'map-prime'
  );

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

  const updateMapImage = (newUrl) =>
      setMaps(prev => prev.map(m => m.id === activeMapId ? { ...m, imageUrl: newUrl } : m));

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
    if (maps.length === 1) {
      alert("The last plane cannot be severed — the archive must contain at least one.");
      return;
    }
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
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "arcanum_archive.json");
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

  const handleNavigateToRecord = (recordId) => {
    setNavigatedRecordId(recordId);
    setView('recordhall');
  };

  useEffect(() => {
    if (!activeTheme) return;
    const primaryRgbStr = hexToRgbString(activeTheme.primary);
    document.documentElement.style.setProperty('--color-primary', primaryRgbStr);
    document.documentElement.style.setProperty('--color-bg-main', activeTheme.bgMain || '5, 5, 8');
    document.documentElement.style.setProperty('--color-bg-surface', activeTheme.bgSurface || '11, 11, 16');
  }, [activeTheme]);

  return (
      <div
          className="min-h-screen text-gray-300 relative transition-colors duration-1000 ease-in-out overflow-hidden"
          style={{ backgroundColor: `rgb(${activeTheme.bgMain || '5, 5, 8'})` }}
      >
        <AstralHaloBackground activeThemeHex={activeTheme.primary || '#c9a84c'} />

        {/* ============ HEADER ============ */}
        <header className="relative z-50 header-arcane grain-surface px-8 py-0 grid grid-cols-3 items-stretch transition-colors duration-1000"
                style={{ minHeight: '62px' }}>

          {/* Left — Sigil + Wordmark + Theme dots */}
          <div className="flex items-center gap-5 justify-self-start">
            {/* The icon — kept exactly as original, just refined glow */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-7 h-7 sigil-breathe">
                <div
                    className="absolute w-full h-full rounded-full transition-colors duration-1000"
                    style={{ border: '0.5px solid rgb(var(--color-primary))', opacity: 0.6 }}
                />
                <div
                    className="absolute w-4 h-4 rotate-45 transition-colors duration-1000"
                    style={{ border: '0.5px solid rgb(var(--color-primary))' }}
                />
                <div
                    className="w-1.5 h-1.5 rounded-full transition-colors duration-1000"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary))',
                      boxShadow: '0 0 8px rgb(var(--color-primary))'
                    }}
                />
              </div>
              <div className="flex flex-col leading-tight">
              <span
                  className="font-display tracking-[0.22em] text-[13px] transition-colors duration-1000"
                  style={{ color: 'rgb(var(--color-primary))' }}
              >
                Arcanum
              </span>
                <span className="font-mono tracking-[0.18em] text-[7px] text-gray-600 uppercase mt-0.5 max-w-[140px] truncate">
                {currentMap?.name || 'Planar Archive'}
              </span>
              </div>
            </div>

            {/* Theme selector */}
            {!isFocusMode && (
                <div className="flex gap-2 border-l pl-5 ml-1" style={{ borderColor: 'rgba(var(--color-primary), 0.08)' }}>
                  {allThemes?.map((t) => (
                      <button
                          key={t.id}
                          onClick={() => setThemeId(t.id)}
                          title={t.name}
                          className={`w-2.5 h-2.5 rounded-full theme-dot ${
                              themeId === t.id ? 'theme-dot-active' : 'theme-dot-inactive'
                          }`}
                          style={{
                            backgroundColor: t.primary,
                            boxShadow: themeId === t.id ? `0 0 10px ${t.primary}` : 'none',
                            color: t.primary,
                          }}
                      />
                  ))}
                </div>
            )}
          </div>

          {/* Center — Navigation */}
          <div className="flex justify-center items-center justify-self-center">
            {!isFocusMode && (
                <nav className="flex items-stretch h-full gap-0">
                  {tabs.map((tab) => {
                    const isActive = view === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className="relative flex flex-col items-center justify-center px-7 py-0 outline-none transition-all duration-500 group"
                            style={{ height: '62px' }}
                        >
                    <span
                        className="font-display text-[11px] tracking-[0.18em] transition-colors duration-500"
                        style={{
                          color: isActive ? 'rgb(var(--color-primary))' : '#4b5563',
                          fontStyle: 'normal',
                        }}
                    >
                      {tab.label}
                    </span>
                          {/* Underline indicator with gold glow */}
                          <span
                              className="absolute bottom-0 left-1/2 h-px transition-all duration-500"
                              style={{
                                width: isActive ? '55%' : '0%',
                                transform: 'translateX(-50%)',
                                background: `linear-gradient(90deg, transparent, rgb(var(--color-primary)), transparent)`,
                                boxShadow: isActive ? '0 0 8px rgb(var(--color-primary))' : 'none',
                              }}
                          />
                          {/* Hover underline */}
                          {!isActive && (
                              <span
                                  className="absolute bottom-0 left-1/2 h-px opacity-0 group-hover:opacity-40 transition-all duration-300"
                                  style={{
                                    width: '30%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgb(var(--color-primary))',
                                  }}
                              />
                          )}
                        </button>
                    );
                  })}
                </nav>
            )}
          </div>

          {/* Right — Scry mode toggle */}
          <div className="flex items-center justify-end justify-self-end">
            <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="relative font-mono text-[9px] px-5 py-2 tracking-[0.22em] uppercase border transition-all duration-500 proximity-glow"
                style={{
                  borderColor: isFocusMode ? 'rgba(var(--color-primary), 0.5)' : 'rgba(var(--color-primary), 0.12)',
                  color: isFocusMode ? 'rgb(var(--color-primary))' : '#4b5563',
                  borderRadius: '2px',
                }}
            >
              <BracketCorners size={5} opacity={isFocusMode ? 0.8 : 0.3} />
              {isFocusMode ? 'Return' : 'Scry'}
            </button>
          </div>
        </header>

        {/* Golden rule under header */}
        <div className="relative z-40">
          <div className="rule-gold" />
        </div>

        {/* ============ MAIN VIEWPORT ============ */}
        <main className="flex-1 w-full h-[calc(100vh-63px)] overflow-hidden relative">

          {/* VIEW: HOME / SANCTUM */}
          {view === 'home' && (
              <div className="w-full h-full overflow-y-auto arcane-scroll px-6 py-12 slide-in-left">
                <div className="max-w-4xl mx-auto space-y-12">

                  {/* Hero — Celestial sigil + wordmark */}
                  <div className="flex flex-col items-center gap-4 pt-2 sigil-breathe">
                    {/* Large hero sigil */}
                    <div className="relative flex items-center justify-center w-16 h-16">
                      <div
                          className="absolute w-full h-full rounded-full animate-cosmic-rotate"
                          style={{ border: '1px solid rgba(var(--color-primary), 0.25)' }}
                      />
                      <div
                          className="absolute w-10 h-10 rotate-45"
                          style={{ border: '1px solid rgba(var(--color-primary), 0.4)' }}
                      />
                      <div
                          className="absolute w-5 h-5 rounded-full animate-cosmic-reverse"
                          style={{ border: '0.5px solid rgba(var(--color-primary), 0.3)' }}
                      />
                      <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: 'rgb(var(--color-primary))',
                            boxShadow: '0 0 16px 3px rgba(var(--color-primary), 0.5)'
                          }}
                      />
                    </div>
                    <h1
                        className="font-display text-4xl tracking-[0.3em]"
                        style={{
                          color: 'rgb(var(--color-primary))',
                          textShadow: '0 0 40px rgba(var(--color-primary), 0.3)'
                        }}
                    >
                      Arcanum
                    </h1>
                    <div className="flex items-center gap-3">
                      <div className="mote" />
                      <p className="font-mono text-[8px] tracking-[0.45em] uppercase text-gray-600">
                        Planar Archive — Sanctum Interface
                      </p>
                      <div className="mote" />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="rule-gold" />

                  {/* Planes manager */}
                  <div className="space-y-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="field-label">Registered Planes</span>
                        <p className="font-display text-sm tracking-wide mt-1" style={{ color: 'rgb(var(--color-primary))' }}>
                          {maps.length} plane{maps.length !== 1 ? 's' : ''} in the archive
                          {currentMap && (
                              <span className="font-mono text-[9px] text-gray-600 ml-3" style={{ fontStyle: 'normal' }}>
                          active: {currentMap.name}
                        </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                        <button
                            onClick={() => importFileRef.current?.click()}
                            className="btn-ghost text-[9px] px-3 py-1.5"
                        >
                          ↑ Import
                        </button>
                        <button onClick={handleExport} className="btn-ghost text-[9px] px-3 py-1.5">
                          ↓ Export
                        </button>
                      </div>
                    </div>

                    {importError && (
                        <div
                            className="rounded px-4 py-2 font-mono text-[10px] text-red-400 flex justify-between items-center"
                            style={{ background: 'rgba(153,27,27,0.08)', border: '1px solid rgba(153,27,27,0.25)' }}
                        >
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
                                className="home-card card-arcane group relative text-left p-4 transition-all duration-300 overflow-hidden"
                                style={{
                                  animationDelay: `${idx * 0.06}s`,
                                  borderRadius: '4px',
                                  background: isActive
                                      ? `linear-gradient(135deg, rgba(var(--color-primary),0.08), rgba(var(--color-bg-surface),0.95))`
                                      : undefined,
                                  borderColor: isActive ? 'rgba(var(--color-primary),0.4)' : undefined,
                                  boxShadow: isActive
                                      ? '0 0 20px rgba(var(--color-primary),0.08), inset 0 0 12px rgba(var(--color-primary),0.03)'
                                      : undefined,
                                }}
                            >
                              <BracketCorners size={8} opacity={isActive ? 0.7 : 0.25} />

                              {/* Active indicator dot */}
                              {isActive && (
                                  <span
                                      className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
                                      style={{
                                        backgroundColor: 'rgb(var(--color-primary))',
                                        boxShadow: '0 0 6px rgb(var(--color-primary))'
                                      }}
                                  />
                              )}

                              {/* Map thumbnail */}
                              <div
                                  className="w-full h-20 mb-3 overflow-hidden flex items-center justify-center"
                                  style={{
                                    borderRadius: '2px',
                                    background: 'rgba(0,0,0,0.45)',
                                    border: '1px solid rgba(var(--color-primary), 0.06)'
                                  }}
                              >
                                {m.imageUrl
                                    ? <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover opacity-65 group-hover:opacity-85 transition-opacity duration-300" />
                                    : <span className="font-mono text-[8px] text-gray-800 uppercase tracking-widest">No map loaded</span>
                                }
                              </div>

                              <p
                                  className="font-display text-[11px] tracking-[0.15em] truncate"
                                  style={{ color: isActive ? 'rgb(var(--color-primary))' : '#6b7280' }}
                              >
                                {m.name}
                              </p>
                              <p className="font-mono text-[8px] text-gray-700 mt-0.5 uppercase tracking-widest">
                                {entryCount} entr{entryCount !== 1 ? 'ies' : 'y'}
                              </p>

                              {maps.length > 1 && (
                                  <button
                                      onClick={(e) => deleteMap(e, m.id)}
                                      className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 font-mono text-[8px] text-gray-700 hover:text-red-400 transition-all duration-200 uppercase tracking-wider"
                                  >
                                    ✕ sever
                                  </button>
                              )}
                            </button>
                        );
                      })}

                      {/* Add plane */}
                      {!isAddingPlane ? (
                          <button
                              onClick={() => setIsAddingPlane(true)}
                              className="home-card relative flex flex-col items-center justify-center gap-2 transition-all duration-300 min-h-[148px] proximity-glow group"
                              style={{
                                animationDelay: `${maps.length * 0.06}s`,
                                borderRadius: '4px',
                                border: '1px dashed rgba(var(--color-primary), 0.12)',
                                background: 'transparent',
                              }}
                          >
                      <span
                          className="text-2xl opacity-30 group-hover:opacity-60 transition-opacity"
                          style={{ color: 'rgb(var(--color-primary))' }}
                      >
                        ＋
                      </span>
                            <span className="font-mono text-[8px] uppercase tracking-widest text-gray-700 group-hover:text-gray-500 transition-colors">
                        New Plane
                      </span>
                          </button>
                      ) : (
                          <div
                              className="home-card relative flex flex-col gap-3 min-h-[148px] p-4"
                              style={{
                                animationDelay: `${maps.length * 0.06}s`,
                                borderRadius: '4px',
                                border: '1px solid rgba(var(--color-primary), 0.25)',
                                background: 'linear-gradient(145deg, rgba(var(--color-bg-surface),0.8), rgba(var(--color-bg-main),0.95))',
                              }}
                          >
                            <BracketCorners size={8} opacity={0.5} />
                            <p className="field-label">Name this plane</p>
                            <input
                                autoFocus
                                value={newPlaneName}
                                onChange={e => setNewPlaneName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddPlane();
                                  if (e.key === 'Escape') { setIsAddingPlane(false); setNewPlaneName(''); }
                                }}
                                placeholder="e.g. SHADOW REALM..."
                                className="input-arcane"
                            />
                            <div className="flex gap-2 mt-auto">
                              <button
                                  onClick={handleAddPlane}
                                  disabled={!newPlaneName.trim()}
                                  className="btn-primary flex-1 text-[9px]"
                              >
                                Manifest Plane
                              </button>
                              <button
                                  onClick={() => { setIsAddingPlane(false); setNewPlaneName(''); }}
                                  className="btn-ghost px-3 py-1.5 text-[9px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="rule-gold" />

                  {/* Quick-nav row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        icon: '◈',
                        title: 'Cartograph',
                        desc: 'Navigate and annotate the active plane.',
                        target: 'map'
                      },
                      {
                        icon: '◉',
                        title: 'Hall of Records',
                        desc: 'Chronicle entries for the active plane.',
                        target: 'recordhall'
                      },
                      {
                        icon: '◎',
                        title: 'Scry Mode',
                        desc: 'Immersive view — no editing tools.',
                        action: () => { setView('map'); setIsFocusMode(true); }
                      },
                    ].map((card) => (
                        <button
                            key={card.title}
                            onClick={() => card.action ? card.action() : setView(card.target)}
                            className="home-card card-arcane relative text-left p-5 transition-all duration-300 proximity-glow"
                            style={{ borderRadius: '4px' }}
                        >
                          <BracketCorners size={8} opacity={0.2} />
                          <div
                              className="text-xl mb-3 font-mono transition-colors"
                              style={{ color: 'rgba(var(--color-primary), 0.5)' }}
                          >
                            {card.icon}
                          </div>
                          <h3
                              className="font-display text-[12px] tracking-[0.18em] mb-2"
                              style={{ color: 'rgb(var(--color-primary))' }}
                          >
                            {card.title}
                          </h3>
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
              <div key="recordhall" className="w-full h-full overflow-y-auto slide-in-right arcane-scroll">
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