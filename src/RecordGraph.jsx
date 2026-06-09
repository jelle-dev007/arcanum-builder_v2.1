import React, { useEffect, useRef, useState, useCallback } from 'react';

const W = 900;
const H = 620;
const NODE_RADIUS = 9;
const REPULSION = 6000;
const SPRING_LENGTH = 160;
const SPRING_K = 0.04;
const DAMPING = 0.82;
const CENTER_PULL = 0.012;
const TICKS_PER_FRAME = 3;

function extractLinkIds(text = '') {
  const re = /\[\[([^\]|]+)\|/g;
  const ids = [];
  let m;
  while ((m = re.exec(text)) !== null) ids.push(m[1]);
  return ids;
}

function buildGraph(entries) {
  const nodes = entries.filter(e => !e.isFolder).map(e => ({ ...e }));
  const nodeIds = new Set(nodes.map(n => String(n.id)));
  const edgeSet = new Set();
  const edges = [];
  for (const n of nodes) {
    const targets = [
      ...extractLinkIds(n.lore || ''),
      ...extractLinkIds(n.characters || ''),
    ];
    for (const tid of targets) {
      const sid = String(tid);
      if (!nodeIds.has(sid)) continue;
      const key = [String(n.id), sid].sort().join('|');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: String(n.id), to: sid });
      }
    }
  }
  return { nodes, edges };
}

const TYPE_COLORS = {
  region:    '#c9a84c',
  landmark:  '#ef4444',
  character: '#6fa8a3',
  road:      '#8b7355',
};

export default function RecordGraph({ entries, onNavigate, onClose }) {
  const { nodes, edges } = buildGraph(entries);

  const posRef = useRef({});
  const rafRef = useRef(null);
  const [tick, setTick] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);

  // Initialize positions in a rough circle
  useEffect(() => {
    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
      const r = Math.min(W, H) * 0.3;
      pos[String(n.id)] = {
        x: W / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: H / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
      };
    });
    posRef.current = pos;

    let running = true;
    const step = () => {
      if (!running) return;
      const p = posRef.current;
      const ids = Object.keys(p);

      for (let t = 0; t < TICKS_PER_FRAME; t++) {
        // Repulsion
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = p[ids[i]], b = p[ids[j]];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = REPULSION / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
        // Springs
        for (const { from, to } of edges) {
          const a = p[from], b = p[to];
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - SPRING_LENGTH) * SPRING_K;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
        // Center gravity + integrate
        for (const id of ids) {
          const n = p[id];
          n.vx += (W / 2 - n.x) * CENTER_PULL;
          n.vy += (H / 2 - n.y) * CENTER_PULL;
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x = Math.max(NODE_RADIUS + 4, Math.min(W - NODE_RADIUS - 4, n.x + n.vx));
          n.y = Math.max(NODE_RADIUS + 4, Math.min(H - NODE_RADIUS - 4, n.y + n.vy));
        }
      }

      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line

  const connectedIds = useCallback((id) => {
    const set = new Set();
    for (const { from, to } of edges) {
      if (from === id) set.add(to);
      if (to === id) set.add(from);
    }
    return set;
  }, [edges]);

  const pos = posRef.current;
  const connected = hoveredId ? connectedIds(hoveredId) : null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex flex-col animate-fadeIn"
      style={{ background: 'rgba(2,2,8,0.97)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '1px solid rgba(var(--color-primary), 0.1)', background: 'rgba(var(--color-bg-surface), 0.5)' }}
      >
        <div>
          <span className="font-mono text-[8px] tracking-[0.32em] uppercase" style={{ color: 'rgba(var(--color-primary), 0.4)' }}>
            ARCANUM CODEX
          </span>
          <h2 className="font-display tracking-[0.18em] uppercase mt-0.5" style={{ fontSize: 14, color: 'rgb(var(--color-primary))' }}>
            Web of Chronicles
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] tracking-[0.12em]" style={{ color: 'rgba(var(--color-primary), 0.35)' }}>
            {nodes.length} nodes · {edges.length} links
          </span>
          <button onClick={onClose} className="btn-ghost text-[9px] py-1.5 px-4">[ Close ]</button>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {nodes.length === 0 ? (
          <p className="font-mono text-center" style={{ fontSize: 11, color: 'rgba(var(--color-primary-soft), 0.3)', letterSpacing: '0.1em' }}>
            No records yet.<br />
            <span style={{ fontSize: 9, opacity: 0.6 }}>Create chronicle entries in the Hall of Records first.</span>
          </p>
        ) : (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(var(--color-primary), 0.03)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
              </radialGradient>
            </defs>

            <rect width={W} height={H} fill="url(#bg-grad)" rx={4}/>

            {/* Edges */}
            {edges.map(({ from, to }, i) => {
              const a = pos[from], b = pos[to];
              if (!a || !b) return null;
              const isActive = hoveredId && (from === hoveredId || to === hoveredId);
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isActive ? 'rgba(var(--color-primary), 0.55)' : 'rgba(var(--color-primary), 0.12)'}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const p = pos[String(n.id)];
              if (!p) return null;
              const id = String(n.id);
              const color = n.color || TYPE_COLORS[n.type] || TYPE_COLORS[n.subdivision] || 'rgba(var(--color-primary), 1)';
              const isHovered = id === hoveredId;
              const isConnected = connected?.has(id);
              const dimmed = hoveredId && !isHovered && !isConnected;
              const r = isHovered ? NODE_RADIUS + 4 : NODE_RADIUS;

              return (
                <g
                  key={id}
                  style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.2s' }}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => { onNavigate(n.id); onClose(); }}
                >
                  {isHovered && (
                    <circle cx={p.x} cy={p.y} r={r + 8} fill={color} opacity={0.08} filter="url(#glow)"/>
                  )}
                  <circle
                    cx={p.x} cy={p.y} r={r}
                    fill={color}
                    fillOpacity={isHovered ? 0.9 : 0.55}
                    stroke={color}
                    strokeOpacity={isHovered ? 1 : 0.4}
                    strokeWidth={isHovered ? 1.5 : 0.8}
                    filter={isHovered ? 'url(#glow)' : undefined}
                    style={{ transition: 'r 0.15s, fill-opacity 0.2s' }}
                  />
                  <text
                    x={p.x}
                    y={p.y + r + 13}
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize={isHovered ? 9 : 8}
                    fill={color}
                    fillOpacity={isHovered ? 0.95 : 0.55}
                    style={{ pointerEvents: 'none', transition: 'font-size 0.15s, fill-opacity 0.2s', userSelect: 'none' }}
                  >
                    {(n.name || 'Unnamed').slice(0, 20)}{(n.name || '').length > 20 ? '…' : ''}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend */}
      <div
        className="flex-shrink-0 flex items-center gap-6 px-8 py-3"
        style={{ borderTop: '1px solid rgba(var(--color-primary), 0.07)' }}
      >
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, opacity: 0.7 }}/>
            <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: 'rgba(var(--color-primary), 0.3)' }}>{type}</span>
          </div>
        ))}
        <span className="font-mono text-[8px] ml-auto" style={{ color: 'rgba(var(--color-primary), 0.2)', letterSpacing: '0.1em' }}>
          Click a node to open its record
        </span>
      </div>
    </div>
  );
}
