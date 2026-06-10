import React, { useState, useEffect } from 'react';

const STEPS = [
  // ── Home ──────────────────────────────────────────────
  {
    view: 'home',
    selector: '[data-tutorial="planes-grid"]',
    title: 'Map Planes',
    body: 'Each card is a Map Plane — a separate world you can chart. Click one to enter it, or conjure a new one with the + card.',
    position: 'bottom',
  },
  {
    view: 'home',
    selector: '[data-tutorial="import-export"]',
    title: 'Import & Export',
    body: "IMPORT restores a previous session. EXPORT opens three options: Archive (.json) backs up everything; Markdown Book (.md) exports the active plane's records and journal as readable text for Obsidian or Notion; Webpage (.html) creates a shareable file anyone can open in a browser.",
    position: 'bottom',
  },
  // ── Map — setup ───────────────────────────────────────
  {
    view: 'map',
    selector: '[data-tutorial="controls-bar"]',
    title: 'Map Controls',
    body: 'All map tools live in this bar — visibility toggles, ink style, drawing type, and actions.',
    position: 'bottom',
  },
  {
    view: 'map',
    selector: '[data-tutorial="visibility-toggles"]',
    title: 'Visibility Layers',
    body: 'Unchecking Territories or Landmarks & Routes hides that layer from the map. Useful for focusing on one type at a time.',
    position: 'bottom',
  },
  {
    view: 'map',
    selector: '[data-tutorial="drawing-type"]',
    title: 'Drawing Type',
    body: 'Choose what to draw before entering drawing mode. Territory traces a filled region, Landmark places a single point, and Route draws an open path.',
    position: 'bottom',
  },
  {
    view: 'map',
    selector: '[data-tutorial="ink-style"]',
    title: 'Ink Style',
    body: "Cartographer's Hand adds organic wobble to your lines — like hand-drawn. Straight Lines gives clean, precise strokes.",
    position: 'bottom',
  },
  // ── Map — drawing ─────────────────────────────────────
  {
    view: 'map',
    selector: '[data-tutorial="draw-btn"]',
    title: 'Commence Cartography',
    body: 'Click to enter drawing mode. While drawing, Ctrl+Z undoes the last placed node and Ctrl+Y restores it.',
    position: 'bottom',
  },
  {
    view: 'map',
    selector: '[data-tutorial="map-canvas"]',
    title: 'Drawing on the Map',
    body: 'Click to place anchor nodes. For territories and routes, click near the first node to snap-close the shape. Landmarks are a single click anywhere.',
    position: 'top',
  },
  {
    view: 'map',
    selector: null,
    title: 'Seal or Cancel',
    body: "'Seal Ink' commits the shape and creates a Chronicle entry. '✕ Cancel' discards it. Press Escape at any time to cancel. Double-click any drawn shape to open its full record.",
    position: 'center',
  },
  {
    view: 'map',
    selector: '[data-tutorial="export-btn"]',
    title: 'Export as PNG',
    body: 'Capture the entire map canvas — background image and all drawn shapes — as a PNG file. Great for sharing your world.',
    position: 'bottom',
  },
  // ── Record Hall ───────────────────────────────────────
  {
    view: 'recordhall',
    selector: '[data-tutorial="record-list"]',
    title: 'Hall of Records',
    body: 'Every drawn shape gets a Chronicle entry here. Add lore, key figures, and link records using [[id|name]] syntax. Export individual entries or the full chronicle as Markdown, or open the Web of Chronicles to see how records connect.',
    position: 'bottom',
  },
  // ── Journal ───────────────────────────────────────────
  {
    view: 'journal',
    selector: '[data-tutorial="journal-sidebar"]',
    title: 'The Journal',
    body: 'A free-form writing space for your world. Create nested entries, write in Markdown, and use the search bar to filter entries by title or content.',
    position: 'right',
  },
];

const CARD_W = 320;
const CARD_H_EST = 230;
const SPOTLIGHT_PAD = 10;
const MARGIN = 16;

function getCardPosition(rect, position) {
  if (!rect || position === 'center') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
  const clampX = (x) => Math.max(MARGIN, Math.min(window.innerWidth - CARD_W - MARGIN, x));
  const clampY = (y) => Math.max(MARGIN, Math.min(window.innerHeight - CARD_H_EST - MARGIN, y));

  switch (position) {
    case 'bottom':
      return {
        top: clampY(rect.bottom + MARGIN),
        left: clampX(rect.left + rect.width / 2 - CARD_W / 2),
      };
    case 'top':
      return {
        top: clampY(rect.top - CARD_H_EST - MARGIN),
        left: clampX(rect.left + rect.width / 2 - CARD_W / 2),
      };
    case 'right':
      return {
        top: clampY(rect.top + rect.height / 2 - CARD_H_EST / 2),
        left: clampX(rect.right + MARGIN),
      };
    case 'left':
      return {
        top: clampY(rect.top + rect.height / 2 - CARD_H_EST / 2),
        left: clampX(rect.left - CARD_W - MARGIN),
      };
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

const TutorialOverlay = ({ currentView, onNavigate, onFinish, isFirstLaunch = true }) => {
  const [phase, setPhase] = useState(isFirstLaunch ? 'intro' : 'steps');
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [measured, setMeasured] = useState(false);

  const currentStep = STEPS[step];

  useEffect(() => {
    if (phase !== 'steps') return;

    setMeasured(false);
    setSpotlightRect(null);

    if (currentStep.view !== currentView) {
      onNavigate(currentStep.view);
      return;
    }

    // 300ms gives React time to render a newly-mounted view, then one rAF
    // ensures the browser has finished layout before we measure.
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        if (currentStep.selector) {
          const el = document.querySelector(currentStep.selector);
          if (el) {
            const r = el.getBoundingClientRect();
            setSpotlightRect({
              top:    r.top    - SPOTLIGHT_PAD,
              left:   r.left   - SPOTLIGHT_PAD,
              width:  r.width  + SPOTLIGHT_PAD * 2,
              height: r.height + SPOTLIGHT_PAD * 2,
              right:  r.right  + SPOTLIGHT_PAD,
              bottom: r.bottom + SPOTLIGHT_PAD,
            });
          }
        }
        setMeasured(true);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [step, currentView, phase]); // eslint-disable-line

  // Re-measure on scroll so the spotlight follows the element if the user scrolls.
  useEffect(() => {
    if (phase !== 'steps' || !currentStep.selector || !measured) return;
    const remeasure = () => {
      const el = document.querySelector(currentStep.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSpotlightRect({
        top:    r.top    - SPOTLIGHT_PAD,
        left:   r.left   - SPOTLIGHT_PAD,
        width:  r.width  + SPOTLIGHT_PAD * 2,
        height: r.height + SPOTLIGHT_PAD * 2,
        right:  r.right  + SPOTLIGHT_PAD,
        bottom: r.bottom + SPOTLIGHT_PAD,
      });
    };
    window.addEventListener('scroll', remeasure, true);
    return () => window.removeEventListener('scroll', remeasure, true);
  }, [step, phase, measured, currentStep.selector]); // eslint-disable-line

  const advance = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };
  const retreat = () => { if (step > 0) setStep(s => s - 1); };
  const finish = () => {
    localStorage.setItem('arcanum_tutorial_seen', '1');
    onFinish();
  };

  const cardPos = phase === 'steps' ? getCardPosition(spotlightRect, currentStep.position) : {};

  const cardBase = {
    position: 'absolute',
    zIndex: 10001,
    width: CARD_W,
    background: 'linear-gradient(145deg, rgba(12,11,16,0.98), rgba(8,7,12,0.99))',
    border: '1px solid rgba(var(--color-primary), 0.28)',
    borderRadius: '4px',
    boxShadow: '0 0 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(var(--color-primary), 0.05)',
  };

  return (
    <>
      {/* Backdrop — always present, never flickers */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
        {phase === 'steps' && measured && spotlightRect ? (
          <div style={{
            position: 'absolute',
            top:    spotlightRect.top,
            left:   spotlightRect.left,
            width:  spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: '3px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
            border: '1px solid rgba(var(--color-primary), 0.55)',
          }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
        )}
      </div>

      {/* ── Intro card ── */}
      {phase === 'intro' && (
        <div style={{ ...cardBase, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '28px 28px 22px', textAlign: 'center' }}>
          <div className="font-mono mb-4" style={{ fontSize: 18, letterSpacing: '0.5em', color: 'rgba(var(--color-primary), 0.5)' }}>
            ◈  ✦  ◈
          </div>
          <p className="font-mono mb-2" style={{ fontSize: 8, letterSpacing: '0.32em', color: 'rgba(var(--color-primary), 0.35)' }}>
            ARCANUM CODEX
          </p>
          <h3 className="font-display tracking-[0.12em] uppercase mb-4" style={{ fontSize: 15, color: 'rgb(var(--color-primary))' }}>
            Would you like a tutorial,<br />Creator?
          </h3>
          <p className="font-mono leading-relaxed mb-7" style={{ fontSize: 11, color: 'rgba(var(--color-primary-soft), 0.6)' }}>
            Let me illuminate the tools and chambers of this archive — a brief guided tour through the art of world-making.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setPhase('steps')}
              className="font-mono uppercase tracking-[0.16em] border w-full transition-all duration-200"
              style={{ fontSize: 10, padding: '10px 0', borderRadius: '2px', background: 'rgba(var(--color-primary), 0.1)', color: 'rgb(var(--color-primary))', borderColor: 'rgba(var(--color-primary), 0.35)', boxShadow: '0 0 14px rgba(var(--color-primary), 0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--color-primary), 0.1)'; }}
            >Begin the Tour  ✦</button>
            <button
              onClick={finish}
              className="font-mono uppercase tracking-[0.14em] w-full transition-colors duration-150"
              style={{ fontSize: 9, padding: '8px 0', color: 'rgba(var(--color-primary), 0.28)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.28)'}
            >Not now</button>
          </div>
        </div>
      )}

      {/* ── Step card (only renders once measured to avoid wrong-position flash) ── */}
      {phase === 'steps' && measured && (
        <div className="animate-fadeIn" style={{ ...cardBase, padding: '20px 22px', ...cardPos }}>
          {/* Progress dots */}
          <div className="flex items-center gap-1 mb-3">
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 14 : 4,
                height: 2,
                borderRadius: 1,
                transition: 'width 0.25s ease, background 0.25s ease',
                background: i === step
                  ? 'rgb(var(--color-primary))'
                  : i < step
                    ? 'rgba(var(--color-primary), 0.35)'
                    : 'rgba(var(--color-primary), 0.1)',
              }} />
            ))}
          </div>

          <p className="font-mono mb-1.5" style={{ fontSize: 8, letterSpacing: '0.22em', color: 'rgba(var(--color-primary), 0.45)' }}>
            STEP {step + 1} OF {STEPS.length}
          </p>

          <h3 className="font-display tracking-[0.12em] uppercase mb-2" style={{ fontSize: 13, color: 'rgb(var(--color-primary))' }}>
            {currentStep.title}
          </h3>

          <p className="font-mono leading-relaxed mb-5" style={{ fontSize: 11, color: 'rgba(var(--color-primary-soft), 0.65)' }}>
            {currentStep.body}
          </p>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={finish}
              className="font-mono uppercase tracking-[0.14em] transition-colors duration-150"
              style={{ fontSize: 9, color: 'rgba(var(--color-primary), 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.65)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--color-primary), 0.3)'}
            >Skip</button>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={retreat}
                  className="font-mono uppercase tracking-[0.14em] border transition-all duration-200"
                  style={{ fontSize: 9, padding: '5px 12px', borderRadius: '2px', background: 'rgba(0,0,0,0.4)', color: 'rgba(var(--color-primary), 0.55)', borderColor: 'rgba(var(--color-primary), 0.15)' }}
                >← Back</button>
              )}
              <button
                onClick={advance}
                className="font-mono uppercase tracking-[0.14em] border transition-all duration-200"
                style={{ fontSize: 9, padding: '5px 14px', borderRadius: '2px', background: 'rgba(var(--color-primary), 0.1)', color: 'rgb(var(--color-primary))', borderColor: 'rgba(var(--color-primary), 0.35)', boxShadow: '0 0 10px rgba(var(--color-primary), 0.08)' }}
              >{step === STEPS.length - 1 ? 'Finish ✓' : 'Next →'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorialOverlay;
