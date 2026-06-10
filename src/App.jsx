import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import MapComponent from './MapComponent';
import RecordHall from './RecordHall';
import Journal from './Journal';
import BracketCorners from './BracketCorners';
import TutorialOverlay from './TutorialOverlay';
import CommandPalette from './components/CommandPalette';
import { generateMarkdown } from './utils/exportMarkdown';
import { generateHtml } from './utils/exportHtml';
import { applyThemeCursors } from './utils/cursorUtils';

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

// ================= MAIN APP =================
function App() {
  const { themeId, setThemeId, allThemes } = useTheme();
  const [view, setView] = useState('home');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [navigatedRecordId, setNavigatedRecordId] = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);

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
  const [removingIds, setRemovingIds]     = useState(new Set());
  const [autoSavePath, setAutoSavePath] = useState(() => localStorage.getItem('arcanum_autosave_path') || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [gridCols, setGridCols] = useState(3);
  const [activeLayerId, setActiveLayerId] = useState('base');
  const importFileRef = useRef(null);
  const colorStateRef = useRef(null);
  const animRafRef    = useRef(null);
  const gridRef         = useRef(null);
  const conjureRef      = useRef(null);
  const cardFlipSnap    = useRef(new Map());
  const conjureFlipPos  = useRef(null);
  const autoSaveTimer      = useRef(null);
  const autoSaveStatusTimer = useRef(null);
  const gridRoRef          = useRef(null);

  useEffect(() => { localStorage.setItem('world_archive_maps', JSON.stringify(maps)); }, [maps]);
  useEffect(() => { localStorage.setItem('world_archive_active_id', activeMapId); }, [activeMapId]);
  useEffect(() => { if (!localStorage.getItem('arcanum_tutorial_seen')) setShowTutorial(true); }, []);

  useEffect(() => {
    if (autoSavePath) localStorage.setItem('arcanum_autosave_path', autoSavePath);
    else localStorage.removeItem('arcanum_autosave_path');
  }, [autoSavePath]);

  useEffect(() => {
    if (gridRoRef.current) { gridRoRef.current.disconnect(); gridRoRef.current = null; }
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const w = grid.getBoundingClientRect().width;
      if (w === 0) return;
      const cols = Math.max(1, Math.floor((w + 26) / (300 + 26)));
      setGridCols(cols);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    gridRoRef.current = ro;
    return () => ro.disconnect();
  }, [view]);

  useLayoutEffect(() => {
    const snap = cardFlipSnap.current;
    if (!snap.size) return;

    const toAnimate = [];

    // Realm cards
    const grid = gridRef.current;
    if (grid) {
      grid.querySelectorAll('[data-mapid]').forEach(el => {
        const prev = snap.get(el.dataset.mapid);
        if (!prev) return;
        const next = el.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.style.animationName = 'none';
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        toAnimate.push(el);
      });
    }

    // Conjure card
    const conjure = conjureRef.current;
    const prevC = snap.get('__conjure__');
    if (conjure && prevC) {
      const next = conjure.getBoundingClientRect();
      const dx = prevC.left - next.left;
      const dy = prevC.top - next.top;
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        conjure.style.animationName = 'none';
        conjure.style.transition = 'none';
        conjure.style.transform = `translate(${dx}px, ${dy}px)`;
        toAnimate.push(conjure);
      }
    }

    cardFlipSnap.current = new Map();
    conjureFlipPos.current = null;
    if (!toAnimate.length) return;

    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toAnimate.forEach(el => {
          if (!el.isConnected) return;
          el.style.transition = `transform 0.75s ${EASE}`;
          el.style.transform = '';
          el.addEventListener('transitionend', () => {
            el.style.transition = '';
          }, { once: true });
        });
      });
    });
  }, [maps.length]);

  useEffect(() => {
    if (!autoSavePath || maps.length === 0) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const { ipcRenderer } = window.require('electron');
        setAutoSaveStatus('saving');
        await ipcRenderer.invoke('autosave-write', { path: autoSavePath, data: JSON.stringify(maps, null, 2) });
        setAutoSaveStatus('saved');
        if (autoSaveStatusTimer.current) clearTimeout(autoSaveStatusTimer.current);
        autoSaveStatusTimer.current = setTimeout(() => setAutoSaveStatus(null), 2500);
      } catch { setAutoSaveStatus('error'); }
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [maps, autoSavePath]);

  const currentMap = maps.find(m => m.id === activeMapId) || maps[0] || { id: 'empty', name: 'VOID', data: [] };
  const mapData = currentMap.data;
  const textLabels = currentMap.textLabels || [];
  const mapLayers = currentMap.layers || [{ id: 'base', name: 'BASE', visible: true, opacity: 1 }];

  const setMapData = React.useCallback((updater) => {
    setMaps(prev =>
        prev.map(m =>
            m.id === activeMapId
                ? { ...m, data: typeof updater === 'function' ? updater(m.data) : updater }
                : m
        )
    );
  }, [activeMapId]);

  const setTextLabels = React.useCallback((updater) => {
    setMaps(prev =>
        prev.map(m =>
            m.id === activeMapId
                ? { ...m, textLabels: typeof updater === 'function' ? updater(m.textLabels || []) : updater }
                : m
        )
    );
  }, [activeMapId]);

  const setLayers = React.useCallback((updater) => {
    setMaps(prev =>
        prev.map(m => {
            if (m.id !== activeMapId) return m;
            const current = m.layers || [{ id: 'base', name: 'BASE', visible: true, opacity: 1 }];
            return { ...m, layers: typeof updater === 'function' ? updater(current) : updater };
        })
    );
  }, [activeMapId]);

  // Reset active layer when switching planes
  useEffect(() => {
    const layers = currentMap.layers || [{ id: 'base', name: 'BASE', visible: true, opacity: 1 }];
    setActiveLayerId(layers[0]?.id || 'base');
  }, [activeMapId]); // eslint-disable-line

  // Ctrl+K global shortcut + Escape to exit SCRY
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape' && isFocusMode && !showCommandPalette && !showExportModal && !showTutorial) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFocusMode, showCommandPalette, showExportModal, showTutorial]);

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
    if (window.confirm("Sever this plane and all its chronicle and journal data from the archive?")) {
      localStorage.removeItem(`arcanum_journal_${idToDelete}`);
      if (activeMapId === idToDelete) {
        const remaining = maps.filter(m => m.id !== idToDelete);
        setActiveMapId(remaining[0]?.id || null);
      }
      const grid = gridRef.current;

      // Pin a fixed-position clone for the exit animation so the real card
      // can be removed immediately without waiting for the animation to end.
      const cardEl = grid?.querySelector(`[data-mapid="${idToDelete}"]`);
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        const clone = cardEl.cloneNode(true);
        clone.removeAttribute('data-mapid');
        clone.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;margin:0;z-index:200;pointer-events:none;`;
        clone.classList.add('realm-card-exit');
        document.body.appendChild(clone);
        setTimeout(() => { if (clone.isConnected) clone.remove(); }, 600);
      }

      // Snapshot remaining cards before the grid reflows.
      const snap = new Map();
      if (grid) {
        grid.querySelectorAll('[data-mapid]').forEach(el => {
          if (el.dataset.mapid !== idToDelete) {
            snap.set(el.dataset.mapid, el.getBoundingClientRect());
          }
        });
      }
      if (conjureRef.current) {
        snap.set('__conjure__', conjureRef.current.getBoundingClientRect());
      }
      cardFlipSnap.current = snap;

      // Remove immediately — FLIP fires in useLayoutEffect right after.
      setMaps(prev => prev.filter(m => m.id !== idToDelete));
    }
  };

  const downloadFile = async (data, filename, mimeType) => {
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('save-file', { data, filename });
        return;
      } catch {}
    }
    const blob = new Blob([data], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleExport = () => setShowExportModal(true);

  const handleExportJson = async () => {
    await downloadFile(JSON.stringify(maps, null, 2), 'arcanum_archive.json', 'application/json');
    setShowExportModal(false);
  };

  const handleExportMarkdown = async () => {
    const journalEntries = JSON.parse(localStorage.getItem(`arcanum_journal_${activeMapId}`) || '[]');
    const content = generateMarkdown(currentMap.name, mapData, journalEntries);
    const slug = (currentMap.name || 'archive').toLowerCase().replace(/\s+/g, '_');
    await downloadFile(content, `${slug}_chronicle.md`, 'text/markdown');
    setShowExportModal(false);
  };

  const handleExportHtml = async () => {
    const journalEntries = JSON.parse(localStorage.getItem(`arcanum_journal_${activeMapId}`) || '[]');
    const content = generateHtml(currentMap.name, mapData, journalEntries);
    const slug = (currentMap.name || 'archive').toLowerCase().replace(/\s+/g, '_');
    await downloadFile(content, `${slug}_archive.html`, 'text/html');
    setShowExportModal(false);
  };

  const handleSetAutoSavePath = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const chosen = await ipcRenderer.invoke('choose-autosave-path');
      if (chosen) setAutoSavePath(chosen);
    } catch { /* browser environment — no-op */ }
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
    setNavHistory(prev => [...prev, { view }]);
    setNavigatedRecordId(recordId);
    setView('recordhall');
  };

  const handleGoBack = () => {
    setNavHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setView(last.view);
      return prev.slice(0, -1);
    });
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

  useEffect(() => {
    if (activeTheme?.primary) applyThemeCursors(activeTheme.primary);
  }, [activeTheme]);

  return (
      <div
          className="min-h-screen text-gray-300 relative overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--color-bg-main))' }}
      >
        <AstralHaloBackground activeThemeHex={activeTheme.primary || '#c9a84c'} />

        {/* SCRY dim overlay — sits between background and content */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 5,
            background: 'rgba(0, 0, 0, 0.9)',
            opacity: isFocusMode ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />

        {/* ============ ORRERY — fixed concentric rings behind home view ============ */}
        {view === 'home' && (
          <div className="orrery-wrap">
            <svg viewBox="0 0 1500 1500" fill="none" stroke={activeTheme.primary} style={{ width: '100%', height: '100%' }}>
              <circle className="orrery-s3" cx="750" cy="750" r="700" strokeOpacity=".05"/>
              <circle className="orrery-s1" cx="750" cy="750" r="560" strokeOpacity=".08"/>
              <circle className="orrery-s2" cx="750" cy="750" r="430" strokeOpacity=".10"/>
              <circle className="orrery-s3" cx="750" cy="750" r="430" strokeOpacity=".06"/>
              <circle className="orrery-s4" cx="750" cy="750" r="300" strokeOpacity=".12"/>
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
        <header className="relative z-50 header-arcane grain-surface px-8 py-0 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch transition-colors duration-1000"
                style={{
                  minHeight: '74px',
                  opacity: isFocusMode ? 0 : 1,
                  pointerEvents: isFocusMode ? 'none' : undefined,
                  transition: 'opacity 0.4s ease',
                }}>

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
                            onClick={() => { setView(tab.id); setNavHistory([]); }}
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

          {/* Right — Tutorial + Scry mode toggle */}
          <div className="flex items-center justify-end justify-self-end gap-3">
            <button
                onClick={() => setShowTutorial(true)}
                title="Open tutorial"
                className="font-mono tracking-[0.2em] border transition-all duration-300"
                style={{
                  fontSize: 11,
                  padding: '9px 14px',
                  borderRadius: '2px',
                  borderColor: 'rgba(var(--color-primary), 0.18)',
                  color: 'rgba(var(--color-primary), 0.5)',
                  background: 'rgba(var(--color-primary), 0.04)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--color-primary))'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--color-primary), 0.5)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.18)'; }}
            >?</button>
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
        <div className="relative z-40" style={{ opacity: isFocusMode ? 0 : 1, transition: 'opacity 0.4s ease' }}>
          <div className="rule-gold" />
        </div>

        {/* ============ MAIN VIEWPORT ============ */}
        <main
          className="flex-1 w-full overflow-hidden relative"
          style={{
            zIndex: 10,
            height: 'calc(100vh - 75px)',
          }}
        >
          {/* EXIT SCRY button — only visible in focus mode */}
          {isFocusMode && (
            <div className="fixed top-4 right-5 z-[100]">
              <button
                onClick={() => setIsFocusMode(false)}
                className="font-mono uppercase tracking-[0.28em] border scry-chamfer"
                style={{
                  fontSize: 10,
                  padding: '8px 18px',
                  borderRadius: '2px',
                  borderColor: 'rgba(var(--color-primary), 0.3)',
                  color: 'rgba(var(--color-primary), 0.55)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.6)'; e.currentTarget.style.color = 'rgb(var(--color-primary))'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.3)'; e.currentTarget.style.color = 'rgba(var(--color-primary), 0.55)'; }}
              >
                ◎ EXIT SCRY
              </button>
            </div>
          )}

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
                    <div className="font-display" style={{ fontSize: 23, letterSpacing: '.08em', color: 'rgb(var(--color-primary))' }}>
                      {maps.length === 1 ? 'One plane' : `${maps.length} planes`} bound to the archive
                    </div>
                    {currentMap && (
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '.28em', color: '#6fa8a3', marginTop: 7 }}>
                        ACTIVE · {currentMap.name}
                      </div>
                    )}
                  </div>
                  <div data-tutorial="import-export" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
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
                    {/* Auto-save control */}
                    {autoSavePath ? (
                      <div className="flex items-center gap-2" style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.18em' }}>
                        <span style={{
                          color: autoSaveStatus === 'saving' ? 'rgba(var(--color-primary-soft), .7)'
                               : autoSaveStatus === 'error'  ? '#f87171'
                               : 'rgba(100,180,130,.8)',
                          transition: 'color 0.4s'
                        }}>
                          {autoSaveStatus === 'saving' ? '◌ SAVING…' : autoSaveStatus === 'error' ? '✕ SAVE ERR' : '● AUTO-SAVE ON'}
                        </span>
                        <button
                          onClick={() => setAutoSavePath(null)}
                          title="Disable auto-save"
                          className="ghost-btn"
                          style={{ padding: '2px 6px', fontSize: 8 }}
                        >
                          DISABLE
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleSetAutoSavePath} className="ghost-btn" title="Save to a file automatically on every change">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/>
                          <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        AUTO-SAVE
                      </button>
                    )}
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
                <div data-tutorial="planes-grid" ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 26, alignItems: 'stretch' }}>
                  {maps.map((m, idx) => {
                    const isActive = m.id === activeMapId;
                    const entryCount = m.data?.length || 0;
                    const isEditing = editingPlaneId === m.id;
                    return (
                      <div
                        key={m.id}
                        data-mapid={m.id}
                        onClick={() => !isEditing && handleSelectPlane(m.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && !isEditing && handleSelectPlane(m.id)}
                        className={`home-card card-arcane group relative text-left transition-all duration-500 overflow-hidden cursor-pointer${removingIds.has(m.id) ? ' realm-card-exit' : ''}`}
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
                              <button
                                onClick={(e) => deleteMap(e, m.id)}
                                title={maps.length > 1 ? "Remove plane" : "Clear this plane"}
                                className="font-mono text-[14px] transition-colors duration-200"
                                style={{ color: 'rgba(220, 80, 80, 0.55)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'rgba(248, 113, 113, 1)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(220, 80, 80, 0.55)'}
                              >
                                ✕
                              </button>
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

                  {/* Conjure new plane — sits in the grid alongside realm cards */}
                  {!isAddingPlane ? (
                    <button
                      ref={conjureRef}
                      onClick={() => setIsAddingPlane(true)}
                      className="home-card newplane-card"
                      style={{
                        animationDelay: `${maps.length * 0.06}s`,
                        ...(maps.length % gridCols === 0 ? {
                          gridColumn: '1 / -1',
                          justifySelf: 'center',
                          width: `calc(${100 / gridCols}% - ${((gridCols - 1) * 26) / gridCols}px)`,
                        } : {}),
                      }}
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
                    textLabels={textLabels}
                    setTextLabels={setTextLabels}
                    layers={mapLayers}
                    activeLayerId={activeLayerId}
                    setLayers={setLayers}
                    setActiveLayerId={setActiveLayerId}
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
                    onGoBack={navHistory.length > 0 ? handleGoBack : undefined}
                />
              </div>
          )}

          {/* VIEW: JOURNAL — always mounted to preserve selected entry state */}
          <div className="w-full h-full" style={{ display: view === 'journal' ? undefined : 'none' }}>
            <Journal
              key={currentMap.id}
              realmId={currentMap.id}
              isFocusMode={isFocusMode}
              mapData={mapData}
              onNavigateToRecord={handleNavigateToRecord}
            />
          </div>

        </main>

      {showTutorial && (
        <TutorialOverlay
          currentView={view}
          onNavigate={(v) => { setView(v); setNavHistory([]); }}
          onFinish={() => setShowTutorial(false)}
          isFirstLaunch={!localStorage.getItem('arcanum_tutorial_seen')}
        />
      )}

      {/* ============ COMMAND PALETTE ============ */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        planes={maps}
        mapData={mapData}
        currentMapId={activeMapId}
        onSelectRecord={(id) => { handleNavigateToRecord(id); }}
        onSelectPlane={(id) => { setActiveMapId(id); setView('map'); }}
        onSelectJournal={() => setView('journal')}
      />

      {/* ============ EXPORT MODAL ============ */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center p-4"
          style={{ background: 'rgba(2,2,5,0.88)', backdropFilter: 'blur(10px)' }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="modal-panel p-7 max-w-md w-full space-y-5 animate-fadeIn relative"
            style={{ borderRadius: '4px' }}
            onClick={e => e.stopPropagation()}
          >
            <BracketCorners size={12} opacity={0.4} />
            <div>
              <span className="field-label" style={{ color: 'rgba(var(--color-primary), 0.7)' }}>Export Archive</span>
              <h2 className="font-display text-base tracking-[0.18em] mt-1" style={{ color: 'rgb(var(--color-primary))' }}>
                Choose Export Format
              </h2>
            </div>

            {[
              {
                label: 'Archive  (.json)',
                desc: 'Save everything — all planes, records, and maps — to reload later or back up your work.',
                fn: handleExportJson,
              },
              {
                label: 'Markdown Book  (.md)',
                desc: `Export "${currentMap.name}" records and journal as a readable text file. Open in Obsidian, Notion, or any text editor.`,
                fn: handleExportMarkdown,
              },
              {
                label: 'Webpage  (.html)',
                desc: `Export "${currentMap.name}" as a self-contained webpage. Open in any browser — great for sharing or reading offline.`,
                fn: handleExportHtml,
              },
            ].map(({ label, desc, fn }) => (
              <button
                key={label}
                onClick={fn}
                className="w-full text-left p-4 transition-all duration-200 rounded"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(var(--color-primary), 0.1)',
                  borderRadius: '3px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.06)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary), 0.1)'; }}
              >
                <div className="font-display text-[12px] tracking-[0.12em] uppercase mb-1.5" style={{ color: 'rgb(var(--color-primary))' }}>
                  {label}
                </div>
                <div className="font-mono text-[9px] text-gray-600 leading-relaxed">{desc}</div>
              </button>
            ))}

            <button onClick={() => setShowExportModal(false)} className="btn-ghost w-full text-[9px] py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      </div>
  );
}

export default App;