import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import MapComponent from './MapComponent';
import RecordHall from './RecordHall';
import Journal from './Journal';

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

const parseBg = (str) => {
  const [r = 5, g = 5, b = 8] = (str || '5, 5, 8').split(',').map(Number);
  return { r, g, b };
};

// ================= ASTRAL HALO BACKGROUND =================
const AstralHaloBackground = ({ activeThemeHex }) => {
  const canvasRef = useRef(null);
  const currentColor = useRef(hexToRgbObj(activeThemeHex));
  const hexRef = useRef(activeThemeHex);
  useEffect(() => { hexRef.current = activeThemeHex; }, [activeThemeHex]);

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

      const targetRgb = hexToRgbObj(hexRef.current);
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
  }, []);

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
    { id: 'recordhall', label: 'Hall of Records' },
    { id: 'journal',    label: 'Journal' }
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
  const [editingPlaneId, setEditingPlaneId]     = useState(null);
  const [editingPlaneName, setEditingPlaneName] = useState('');
  const [importError, setImportError]     = useState('');
  const importFileRef = useRef(null);
  const colorStateRef = useRef(null);
  const animRafRef    = useRef(null);

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

  const handleRenameSubmit = (id) => {
    const trimmed = editingPlaneName.trim();
    if (trimmed) {
      setMaps(prev => prev.map(m => m.id === id ? { ...m, name: trimmed.toUpperCase() } : m));
    }
    setEditingPlaneId(null);
    setEditingPlaneName('');
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

  const handleExport = async () => {
    const data = JSON.stringify(maps, null, 2);
    // In Electron, use IPC so we get a native Save-As dialog
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('save-file', { data, filename: 'arcanum_archive.json' });
      } catch {
        // ipcRenderer unavailable (e.g. running plain browser) — fall through
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'arcanum_archive.json';
        a.click(); URL.revokeObjectURL(url);
      }
    } else {
      // Browser fallback — Blob avoids URL-length limits on large archives
      const blob = new Blob([data], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'arcanum_archive.json';
      a.click(); URL.revokeObjectURL(url);
    }
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
    const root = document.documentElement;
    const setVars = (p, m, s) => {
      root.style.setProperty('--color-primary',      `${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)}`);
      root.style.setProperty('--color-bg-main',      `${Math.round(m.r)}, ${Math.round(m.g)}, ${Math.round(m.b)}`);
      root.style.setProperty('--color-bg-surface',   `${Math.round(s.r)}, ${Math.round(s.g)}, ${Math.round(s.b)}`);
      const sr = Math.round(p.r + (255 - p.r) * 0.45);
      const sg = Math.round(p.g + (255 - p.g) * 0.45);
      const sb = Math.round(p.b + (255 - p.b) * 0.45);
      root.style.setProperty('--color-primary-soft', `${sr}, ${sg}, ${sb}`);
    };

    const tp = hexToRgbObj(activeTheme.primary);
    const tm = parseBg(activeTheme.bgMain);
    const ts = parseBg(activeTheme.bgSurface);

    // First mount — snap immediately, no animation
    if (!colorStateRef.current) {
      colorStateRef.current = { p: { ...tp }, m: { ...tm }, s: { ...ts } };
      setVars(tp, tm, ts);
      return;
    }

    if (animRafRef.current) cancelAnimationFrame(animRafRef.current);

    const SPEED = 0.04;
    const EPS   = 0.4;
    const lerp  = (a, b) => a + (b - a) * SPEED;

    const tick = () => {
      const c = colorStateRef.current;
      c.p.r = lerp(c.p.r, tp.r); c.p.g = lerp(c.p.g, tp.g); c.p.b = lerp(c.p.b, tp.b);
      c.m.r = lerp(c.m.r, tm.r); c.m.g = lerp(c.m.g, tm.g); c.m.b = lerp(c.m.b, tm.b);
      c.s.r = lerp(c.s.r, ts.r); c.s.g = lerp(c.s.g, ts.g); c.s.b = lerp(c.s.b, ts.b);
      setVars(c.p, c.m, c.s);
      const moving =
        Math.abs(c.p.r - tp.r) > EPS || Math.abs(c.p.g - tp.g) > EPS || Math.abs(c.p.b - tp.b) > EPS ||
        Math.abs(c.m.r - tm.r) > EPS || Math.abs(c.m.g - tm.g) > EPS || Math.abs(c.m.b - tm.b) > EPS ||
        Math.abs(c.s.r - ts.r) > EPS || Math.abs(c.s.g - ts.g) > EPS || Math.abs(c.s.b - ts.b) > EPS;
      if (moving) animRafRef.current = requestAnimationFrame(tick);
    };

    animRafRef.current = requestAnimationFrame(tick);
    return () => { if (animRafRef.current) cancelAnimationFrame(animRafRef.current); };
  }, [activeTheme]);

  return (
      <div
          className="min-h-screen text-gray-300 relative overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--color-bg-main))' }}
      >
        <AstralHaloBackground activeThemeHex={activeTheme.primary || '#c9a84c'} />

        {/* ============ ORRERY — fixed concentric rings behind home view ============ */}
        {view === 'home' && (
          <div className="orrery-wrap">
            <svg viewBox="0 0 1500 1500" fill="none" stroke={activeTheme.primary} style={{ width: '100%', height: '100%' }}>
              <circle className="orrery-s3" cx="750" cy="750" r="700" strokeOpacity=".05"/>
              <circle className="orrery-s1" cx="750" cy="750" r="560" strokeOpacity=".08" strokeDasharray="2 14"/>
              <circle className="orrery-s2" cx="750" cy="750" r="430" strokeOpacity=".10"/>
              <circle className="orrery-s3" cx="750" cy="750" r="430" strokeOpacity=".06" strokeDasharray="1 22"/>
              <circle className="orrery-s4" cx="750" cy="750" r="300" strokeOpacity=".12" strokeDasharray="3 10"/>
              <circle className="orrery-s1" cx="750" cy="750" r="195" strokeOpacity=".14"/>
              <g className="orrery-s2"><circle cx="750" cy="320" r="4" fill="#6fa8a3" stroke="none" opacity=".7"/></g>
              <g className="orrery-s4"><circle cx="750" cy="450" r="3" fill={activeTheme.primary} stroke="none" opacity=".8"/></g>
              <g className="orrery-s3"><circle cx="750" cy="190" r="5" fill={activeTheme.primary} stroke="none" opacity=".9"/></g>
              <g className="orrery-s1" strokeOpacity=".04">
                <line x1="750" y1="555" x2="750" y2="945"/>
                <line x1="555" y1="750" x2="945" y2="750"/>
                <line x1="612" y1="612" x2="888" y2="888"/>
                <line x1="888" y1="612" x2="612" y2="888"/>
              </g>
            </svg>
          </div>
        )}

        {/* ============ HEADER ============ */}
        <header className="relative z-50 header-arcane grain-surface px-8 py-0 grid grid-cols-3 items-stretch transition-colors duration-1000"
                style={{ minHeight: '74px' }}>

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
                  className="font-display wm-breathe tracking-[0.42em] text-[13px] transition-colors duration-1000"
                  style={{ color: activeTheme.primary }}
              >
                ARCANUM
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
                            style={{ height: '74px' }}
                        >
                    <span
                        className="font-display text-[13px] tracking-[0.18em] whitespace-nowrap transition-colors duration-500"
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
                className="font-mono tracking-[0.3em] uppercase border transition-all duration-500 scry-chamfer"
                style={{
                  fontSize: 11,
                  padding: '11px 22px',
                  borderColor: isFocusMode ? 'rgba(var(--color-primary), 0.5)' : 'rgba(var(--color-primary), 0.18)',
                  color: 'rgb(var(--color-primary))',
                  background: isFocusMode ? 'rgba(var(--color-primary), 0.12)' : 'rgba(var(--color-primary), 0.04)',
                  boxShadow: isFocusMode ? '0 0 22px rgba(var(--color-primary), 0.25)' : 'none',
                }}
            >
              ◎ {isFocusMode ? 'RETURN' : 'SCRY'}
            </button>
          </div>
        </header>

        {/* Golden rule under header */}
        <div className="relative z-40">
          <div className="rule-gold" />
        </div>

        {/* ============ MAIN VIEWPORT ============ */}
        <main className="flex-1 w-full h-[calc(100vh-75px)] overflow-hidden relative">

          {/* VIEW: HOME / SANCTUM */}
          {view === 'home' && (
            <div className="w-full h-full overflow-y-auto arcane-scroll slide-in-left">
              <div className="max-w-5xl mx-auto px-12 relative" style={{ zIndex: 2 }}>

                {/* ===== HERO ===== */}
                <section className="text-center" style={{ padding: '72px 0 30px' }}>
                  <svg
                    className="sigil-breathe"
                    viewBox="0 0 100 100" fill="none"
                    style={{ width: 96, height: 96, margin: '0 auto 26px', display: 'block' }}
                  >
                    <circle cx="50" cy="50" r="46" stroke={activeTheme.primary} strokeWidth=".8" opacity=".3"/>
                    <circle cx="50" cy="50" r="46" stroke="rgb(var(--color-primary))" strokeWidth=".8" strokeDasharray="1 9" opacity=".8" className="crest-ring"/>
                    <rect x="50" y="14" width="51" height="51" transform="rotate(45 50 14)" stroke={activeTheme.primary} strokeWidth="1" opacity=".55"/>
                    <rect x="50" y="26" width="34" height="34" transform="rotate(45 50 26)" stroke="rgb(var(--color-primary))" strokeWidth="1.3"/>
                    <circle cx="50" cy="50" r="3.4" fill={activeTheme.primary} className="core-pulse-elem"/>
                    <circle cx="50" cy="50" r="9" stroke="rgb(var(--color-primary))" strokeWidth=".8" opacity=".6"/>
                  </svg>

                  <h1 className="arcanum-title">ARCANUM</h1>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 22 }}>
                    <div className="rule-gold" style={{ width: 60 }}/>
                    <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'rgba(var(--color-primary-soft), .62)' }}>
                      SANCTUM · THE INNER ARCHIVE
                    </span>
                    <div className="rule-gold" style={{ width: 60 }}/>
                  </div>

                  <p className="font-soft" style={{ fontStyle: 'italic', fontSize: 19, color: 'rgba(var(--color-primary-soft), .62)', marginTop: 24 }}>
                    Where the worlds you've made are kept, charted, and remembered.
                  </p>
                </section>

                {/* ===== SECTION HEADER ===== */}
                <div style={{
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                  marginTop: 54, marginBottom: 26,
                  borderBottom: '1px solid rgba(var(--color-primary), 0.10)',
                  paddingBottom: 18,
                }}>
                  <div>
                    <span className="field-label" style={{ display: 'block', marginBottom: 10 }}>REGISTERED PLANES</span>
                    <span className="font-display" style={{ fontSize: 23, letterSpacing: '.08em', color: 'rgb(var(--color-primary))' }}>
                      {maps.length === 1 ? 'One plane' : `${maps.length} planes`} bound to the archive
                      {currentMap && (
                        <em style={{ fontStyle: 'normal', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '.28em', color: '#6fa8a3', marginLeft: 16 }}>
                          ACTIVE · {currentMap.name}
                        </em>
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden"/>
                    <button onClick={() => importFileRef.current?.click()} className="ghost-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 19V6m0 0l-6 6m6-6l6 6" transform="rotate(180 12 12)"/>
                      </svg>
                      IMPORT
                    </button>
                    <button onClick={handleExport} className="ghost-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 5v13m0 0l-6-6m6 6l6-6"/>
                      </svg>
                      EXPORT
                    </button>
                  </div>
                </div>

                {importError && (
                  <div className="font-mono text-[10px] text-red-400 flex justify-between items-center mb-4 px-4 py-2"
                    style={{ background: 'rgba(153,27,27,0.08)', border: '1px solid rgba(153,27,27,0.25)' }}>
                    {importError}
                    <button onClick={() => setImportError('')} className="text-red-600 hover:text-red-400 ml-4">✕</button>
                  </div>
                )}

                {/* ===== PLANES GRID ===== */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 26, alignItems: 'stretch' }}>
                  {maps.map((m, idx) => {
                    const isActive = m.id === activeMapId;
                    const entryCount = m.data?.length || 0;
                    const isEditing = editingPlaneId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => !isEditing && handleSelectPlane(m.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && !isEditing && handleSelectPlane(m.id)}
                        className="home-card card-arcane group relative text-left transition-all duration-500 overflow-hidden cursor-pointer"
                        style={{
                          animationDelay: `${idx * 0.06}s`,
                          borderRadius: 0,
                          padding: 18,
                          background: isActive
                            ? 'linear-gradient(180deg, rgba(24,22,16,.55), rgba(12,12,20,.65))'
                            : undefined,
                          borderColor: isActive ? 'rgba(var(--color-primary), 0.5)' : undefined,
                          boxShadow: isActive ? '0 0 0 1px rgba(var(--color-primary),.12), 0 18px 50px rgba(0,0,0,.5)' : undefined,
                        }}
                      >
                        {isActive && <div className="edge"/>}
                        <BracketCorners size={22} opacity={isActive ? 0.65 : 0.25}/>

                        {/* Map frame */}
                        <div className="relative overflow-hidden" style={{ border: '1px solid rgba(var(--color-primary),.3)', background: '#0c1418' }}>
                          {m.imageUrl
                            ? <img src={m.imageUrl} alt={m.name} className="w-full object-cover transition-opacity duration-300 group-hover:opacity-90" style={{ height: 200, opacity: 0.75 }}/>
                            : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                                <span className="font-mono text-[8px] text-gray-800 uppercase tracking-widest">No map loaded</span>
                              </div>
                          }
                          {isActive && <div className="seal-dot"/>}
                        </div>

                        {/* Meta */}
                        <div style={{ padding: '18px 6px 6px' }}>
                          {/* Name row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editingPlaneName}
                                onChange={e => setEditingPlaneName(e.target.value)}
                                onKeyDown={e => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') handleRenameSubmit(m.id);
                                  if (e.key === 'Escape') { setEditingPlaneId(null); setEditingPlaneName(''); }
                                }}
                                onBlur={() => handleRenameSubmit(m.id)}
                                onClick={e => e.stopPropagation()}
                                className="input-arcane flex-1"
                                style={{ fontSize: 17, letterSpacing: '.16em' }}
                              />
                            ) : (
                              <div className="font-display" style={{ fontSize: 21, letterSpacing: '.16em', color: 'rgb(var(--color-primary))' }}>
                                {m.name}
                              </div>
                            )}
                            {/* Always-visible action icons */}
                            <div className="flex gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => { setEditingPlaneId(m.id); setEditingPlaneName(m.name); }}
                                title="Rename plane"
                                className="font-mono text-[14px] transition-colors duration-200"
                                style={{ color: 'rgba(var(--color-primary-soft), 0.55)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--color-primary-soft))'}
                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary-soft), 0.55)'}
                              >
                                ✎
                              </button>
                              {maps.length > 1 && (
                                <button
                                  onClick={(e) => deleteMap(e, m.id)}
                                  title="Remove plane"
                                  className="font-mono text-[14px] transition-colors duration-200"
                                  style={{ color: 'rgba(220, 80, 80, 0.55)' }}
                                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(248, 113, 113, 1)'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(220, 80, 80, 0.55)'}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Bottom row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                            <div className="font-mono" style={{ fontSize: 10, letterSpacing: '.22em', color: 'rgba(216,201,160,.42)', display: 'flex', gap: 16 }}>
                              <span>{entryCount} ENTR{entryCount !== 1 ? 'IES' : 'Y'}</span>
                              {isActive && <span style={{ color: '#6fa8a3' }}>ACTIVE</span>}
                            </div>
                            {!isEditing && <div className="enter-plane">ENTER PLANE →</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Conjure new plane */}
                  {!isAddingPlane ? (
                    <button
                      onClick={() => setIsAddingPlane(true)}
                      className="home-card newplane-card"
                      style={{ animationDelay: `${maps.length * 0.06}s` }}
                    >
                      <div className="newplane-ring">
                        <span className="newplane-plus">+</span>
                      </div>
                      <div className="newplane-lbl">Conjure New Plane</div>
                    </button>
                  ) : (
                    <div
                      className="home-card relative flex flex-col gap-3 p-5"
                      style={{
                        animationDelay: `${maps.length * 0.06}s`,
                        border: '1px solid rgba(var(--color-primary), 0.25)',
                        background: 'linear-gradient(145deg, rgba(var(--color-bg-surface),0.8), rgba(var(--color-bg-main),0.95))',
                        minHeight: 300,
                      }}
                    >
                      <BracketCorners size={10} opacity={0.5}/>
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
                        <button onClick={handleAddPlane} disabled={!newPlaneName.trim()} className="btn-primary flex-1 text-[9px]">
                          Manifest Plane
                        </button>
                        <button onClick={() => { setIsAddingPlane(false); setNewPlaneName(''); }} className="btn-ghost px-3 py-1.5 text-[9px]">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ===== RULE ===== */}
                <div className="rule-gold" style={{ margin: '54px 0 48px' }}/>

                {/* ===== MODE CARDS ===== */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 72 }}>
                  {[
                    {
                      glyph: (
                        <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ width: 30, height: 30, marginBottom: 22 }}>
                          <rect x="15" y="3" width="17" height="17" transform="rotate(45 15 3)"/>
                          <circle cx="15" cy="15" r="1.6" fill="currentColor" stroke="none"/>
                        </svg>
                      ),
                      title: 'CARTOGRAPH',
                      desc: "Chart the active plane — drop pins, trace borders, and annotate the lands you've made.",
                      target: 'map',
                    },
                    {
                      glyph: (
                        <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ width: 30, height: 30, marginBottom: 22 }}>
                          <circle cx="15" cy="15" r="11"/>
                          <circle cx="15" cy="15" r="2.4" fill="currentColor" stroke="none"/>
                        </svg>
                      ),
                      title: 'HALL OF RECORDS',
                      desc: 'Open the chronicle — characters, histories, and lore bound to this plane.',
                      target: 'recordhall',
                    },
                    {
                      glyph: (
                        <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ width: 30, height: 30, marginBottom: 22 }}>
                          <circle cx="15" cy="15" r="11"/>
                          <circle cx="15" cy="15" r="6.5"/>
                          <circle cx="15" cy="15" r="2" fill="currentColor" stroke="none"/>
                        </svg>
                      ),
                      title: 'SCRY MODE',
                      desc: 'Step inside. An immersive, distraction-free view of the world — nothing to edit, only to behold.',
                      action: () => { setView('map'); setIsFocusMode(true); },
                    },
                  ].map((card) => (
                    <button
                      key={card.title}
                      onClick={() => card.action ? card.action() : setView(card.target)}
                      className="home-card card-arcane relative text-left overflow-hidden transition-all duration-500"
                      style={{ padding: '30px 28px', borderRadius: 0, color: 'rgb(var(--color-primary))' }}
                    >
                      <div className="mode-topline"/>
                      <div className="edge slow"/>
                      {card.glyph}
                      <h3 className="font-display" style={{ fontSize: 18, letterSpacing: '.16em', color: 'rgb(var(--color-primary))', marginBottom: 13 }}>
                        {card.title}
                      </h3>
                      <p className="font-soft" style={{ fontSize: 16, lineHeight: 1.45, color: 'rgba(216,201,160,.62)' }}>
                        {card.desc}
                      </p>
                      <span className="mode-arrow">→</span>
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

          {/* VIEW: JOURNAL */}
          {view === 'journal' && (
              <div key="journal" className="w-full h-full slide-in-right">
                <Journal isFocusMode={isFocusMode} />
              </div>
          )}

        </main>
      </div>
  );
}

export default App;