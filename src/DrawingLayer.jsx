import React, { useState } from 'react';
import { CANVAS_W, CANVAS_H } from './constants';

const CLOSE_RADIUS = 10;

const DrawingLayer = ({
  width, height,
  isDrawingMode,
  reshapeTargetId,
  mapData, setMapData,
  sidebarEntry, setSidebarEntry,
  currentPoints, setCurrentPoints, onAddPoint,
  onHoverEntry, onLeaveEntry,
  onClickEntry, onDoubleClickEntry,
  showRegions, showLandmarks,
  creationType,
  onFinishDrawing,
  inkIntensity = 7,
  isLabelMode = false,
  textLabels = [],
  onLabelClick,
  onEditLabel,
  onDeleteLabel,
  onMoveLabel,
  layers,
}) => {
  const [dragInfo, setDragInfo] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [mousePos, setMousePos] = useState(null);

  const visibleData = layers
    ? mapData.filter(entry => {
        if (!entry.layerId) return true;
        const layer = layers.find(l => l.id === entry.layerId);
        return !layer || layer.visible;
      })
    : mapData;

  const getCanvasCoordinates = (e, currentTarget) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    return { x, y };
  };

  // Whether the cursor is hovering close enough to the first placed node to snap-close
  const minPointsToClose = creationType === 'region' ? 6 : 4;
  const nearFirstNode = !!(
    mousePos &&
    creationType !== 'landmark' &&
    currentPoints.length >= minPointsToClose &&
    Math.hypot(mousePos.x - currentPoints[0], mousePos.y - currentPoints[1]) < CLOSE_RADIUS
  );

  const handleMapClick = (e) => {
    if (isLabelMode) {
      const { x, y } = getCanvasCoordinates(e, e.currentTarget);
      if (onLabelClick) onLabelClick(x, y);
      return;
    }
    if (!isDrawingMode) return;
    const { x, y } = getCanvasCoordinates(e, e.currentTarget);

    if (creationType === 'landmark') {
      if (onAddPoint) onAddPoint(x, y, true); else setCurrentPoints([x, y]);
      return;
    }

    // Snap-close: clicking near the first node finishes the shape
    if (currentPoints.length >= minPointsToClose) {
      if (Math.hypot(x - currentPoints[0], y - currentPoints[1]) < CLOSE_RADIUS) {
        onFinishDrawing();
        return;
      }
    }

    if (onAddPoint) onAddPoint(x, y); else setCurrentPoints((prev) => [...prev, x, y]);
  };

  const handleVertexMouseDown = (e, entryId, pointIndex) => {
    e.stopPropagation();
    if (e.button === 0) setDragInfo({ entryId, pointIndex });
  };

  const handleVertexRightClick = (e, entryId, pointIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const targetEntry = mapData.find(item => item.id === entryId);
    if (!targetEntry || !targetEntry.points) return;
    const minCoordinates = targetEntry.type === 'region' ? 6 : 4;
    if (targetEntry.points.length <= minCoordinates) {
      alert(`Ritually erase node failed! A ${targetEntry.type} vector requires ${minCoordinates / 2} base leyline intersection points.`);
      return;
    }
    const updatedPoints = [...targetEntry.points];
    updatedPoints.splice(pointIndex, 2);
    const updatedEntry = { ...targetEntry, points: updatedPoints };
    setMapData(mapData.map(item => item.id === entryId ? updatedEntry : item));
    if (sidebarEntry && sidebarEntry.id === entryId) setSidebarEntry(updatedEntry);
  };

  const handleSVGMouseMove = (e) => {
    if (!isDrawingMode && !dragInfo) return;
    const { x, y } = getCanvasCoordinates(e, e.currentTarget);

    if (isDrawingMode) setMousePos({ x, y });

    if (!dragInfo) return;
    const targetEntry = mapData.find(item => item.id === dragInfo.entryId);
    if (!targetEntry || !targetEntry.points) return;
    const updatedPoints = [...targetEntry.points];
    updatedPoints[dragInfo.pointIndex] = x;
    updatedPoints[dragInfo.pointIndex + 1] = y;
    const updatedEntry = { ...targetEntry, points: updatedPoints };
    setMapData(mapData.map(item => item.id === targetEntry.id ? updatedEntry : item));
    if (sidebarEntry && sidebarEntry.id === targetEntry.id) setSidebarEntry(updatedEntry);
  };

  const handleSVGMouseUp = () => setDragInfo(null);

  const handleSVGMouseLeave = () => {
    setDragInfo(null);
    setMousePos(null);
  };

  const handleAddMidpointNode = (e, entry, insertAtIndex, midX, midY) => {
    e.stopPropagation();
    const updatedPoints = [...entry.points];
    updatedPoints.splice(insertAtIndex, 0, midX, midY);
    const updatedEntry = { ...entry, points: updatedPoints };
    setMapData(mapData.map(item => item.id === entry.id ? updatedEntry : item));
    if (sidebarEntry && sidebarEntry.id === entry.id) setSidebarEntry(updatedEntry);
    setDragInfo({ entryId: entry.id, pointIndex: insertAtIndex });
  };

  const getCenterOfPoints = (points) => {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    let totalX = 0, totalY = 0;
    for (let i = 0; i < points.length; i += 2) { totalX += points[i]; totalY += points[i+1]; }
    return { x: totalX / (points.length / 2), y: totalY / (points.length / 2) };
  };

  // Very low-tension catmull-rom — barely perceptible curves, filter adds the texture
  const pointsToPath = (flatPoints, closed = false, tension = 0.1) => {
    const pts = [];
    for (let i = 0; i < flatPoints.length; i += 2) pts.push([flatPoints[i], flatPoints[i + 1]]);
    if (pts.length < 2) return `M ${pts[0]?.[0] ?? 0},${pts[0]?.[1] ?? 0}`;
    if (pts.length === 2) return `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]}${closed ? ' Z' : ''}`;

    const n = pts.length;
    const getP = (i) => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    const count = closed ? n : n - 1;

    for (let i = 0; i < count; i++) {
      const p0 = getP(i - 1), p1 = getP(i), p2 = getP(i + 1), p3 = getP(i + 2);
      const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
      const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
      const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
      const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0]},${p2[1]}`;
    }

    if (closed) d += ' Z';
    return d;
  };

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width="100%" height="100%"
      onMouseMove={handleSVGMouseMove}
      onMouseUp={handleSVGMouseUp}
      onMouseLeave={handleSVGMouseLeave}
      className="absolute top-0 left-0"
      style={{ pointerEvents: 'auto', zIndex: 50 }}
    >
      <defs>
        <style>{`
          @keyframes landmarkCore {
            0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 3px currentColor); }
            50%       { opacity: 1;   filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 18px currentColor); }
          }
          @keyframes landmarkHalo {
            0%, 100% { opacity: 0.18; transform: scale(1); }
            50%       { opacity: 0.5;  transform: scale(1.3); }
          }
          @keyframes ghostCorePulse {
            0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 4px rgb(var(--color-primary))); }
            50%       { opacity: 1;   filter: drop-shadow(0 0 12px rgb(var(--color-primary))); }
          }
          @keyframes ghostHaloPulse {
            0%, 100% { opacity: 0.12; }
            50%       { opacity: 0.38; }
          }
          @keyframes snapRing {
            0%, 100% { opacity: 0.5; r: 10px; }
            50%       { opacity: 1;   r: 14px; }
          }
        `}</style>
        <filter id="hand-drawn-edge" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" result="noise" seed="2" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={inkIntensity} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="sigilGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgb(var(--color-primary))" floodOpacity="0.4"/>
        </filter>
        <filter id="leylineGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgb(var(--color-primary))" floodOpacity="0.6"/>
        </filter>
      </defs>

      {/* 0. INVISIBLE INTERCEPTOR LAYER */}
      <rect
        width={CANVAS_W} height={CANVAS_H}
        fill="black" fillOpacity={0}
        style={{ pointerEvents: isDrawingMode || isLabelMode ? 'all' : 'none', cursor: isLabelMode ? 'text' : nearFirstNode ? 'pointer' : 'crosshair' }}
        onClick={handleMapClick}
      />

      {/* BACKGROUND VECTOR COSMETIC GRID */}
      <g stroke="rgb(var(--color-primary))" strokeOpacity="0.1" fill="none" strokeWidth={0.7} className="pointer-events-none" filter="url(#sigilGlow)">
        <circle cx={400} cy={400} r={100} />
        <circle cx={400} cy={400} r={200} />
        <circle cx={400} cy={400} r={300} strokeDasharray="10,20" />
        <line x1={0} y1={400} x2={CANVAS_W} y2={400} />
        <line x1={400} y1={0} x2={400} y2={CANVAS_H} />
      </g>

      {/* 1. TERRITORY REGIONS */}
      {showRegions && visibleData.map((entry) => {
        if (!entry.points || entry.type !== 'region') return null;
        const center = getCenterOfPoints(entry.points);
        const uniqueColor = entry.color || 'rgb(var(--color-primary))';
        const isReshapingThis = reshapeTargetId === entry.id;
        const isHovered = hoveredRegionId === entry.id;

        return (
          <g key={entry.id}>
            <path
              d={pointsToPath(entry.points, true)}
              fill={uniqueColor}
              fillOpacity={isHovered ? 0.35 : 0.15}
              stroke={uniqueColor}
              strokeWidth={isReshapingThis ? 4 : isHovered ? 3 : 1.5}
              strokeOpacity={isHovered || isReshapingThis ? 1.0 : 0.4}
              strokeDasharray={isReshapingThis ? "4,4" : "none"}
              filter="url(#hand-drawn-edge)"
              style={{
                pointerEvents: isDrawingMode ? 'none' : 'auto',
                cursor: 'pointer',
                transition: 'stroke-width 0.2s ease, fill-opacity 0.2s ease'
              }}
              onMouseEnter={() => setHoveredRegionId(entry.id)}
              onMouseMove={(e) => { setHoveredRegionId(entry.id); if (!reshapeTargetId) onHoverEntry(e, entry); }}
              onMouseLeave={() => { setHoveredRegionId(null); onLeaveEntry(); }}
              onClick={(e) => { e.stopPropagation(); onClickEntry(entry); }}
              onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickEntry(entry); }}
            />
            {!isReshapingThis && (
              <text
                x={center.x} y={center.y} fill={uniqueColor}
                fillOpacity={isHovered ? 1.0 : 0.5}
                fontFamily="serif" fontSize="13" fontWeight="bold" textAnchor="middle"
                className="pointer-events-none tracking-[0.25em] uppercase"
                style={{ transition: 'fill-opacity 0.4s ease', textShadow: '0px 2px 8px rgba(0,0,0,0.9)' }}
              >
                {entry.name}
              </text>
            )}
          </g>
        );
      })}

      {/* 2. ROADS / MANA LEYLINES */}
      {showLandmarks && visibleData.map((entry) => {
        if (!entry.points || entry.type !== 'road') return null;
        const uniqueColor = entry.color || 'rgb(var(--color-primary))';
        const isReshapingThis = reshapeTargetId === entry.id;
        const lineStyle = entry.lineStyle || 'solid';
        const evtProps = {
          style: { pointerEvents: isDrawingMode ? 'none' : 'auto', cursor: 'pointer' },
          onMouseMove: (e) => !reshapeTargetId && onHoverEntry(e, entry),
          onMouseLeave: onLeaveEntry,
          onClick: (e) => { e.stopPropagation(); onClickEntry(entry); },
          onDoubleClick: (e) => { e.stopPropagation(); onDoubleClickEntry(entry); },
        };

        const getDash = (style) => {
          if (isReshapingThis) return '6,4';
          if (style === 'dashed') return '10,6';
          if (style === 'dotted') return '2,5';
          return 'none';
        };

        if (lineStyle === 'double') {
          return (
            <g key={entry.id} {...evtProps}>
              <path d={pointsToPath(entry.points, false)} fill="none" stroke={uniqueColor}
                strokeWidth={isReshapingThis ? 9 : 7} strokeDasharray={isReshapingThis ? '6,4' : 'none'}
                filter="url(#leylineGlow)" />
              <path d={pointsToPath(entry.points, false)} fill="none" stroke="rgba(0,0,0,0.85)"
                strokeWidth={isReshapingThis ? 5 : 3} strokeDasharray={isReshapingThis ? '6,4' : 'none'}
                style={{ pointerEvents: 'none' }} />
            </g>
          );
        }

        return (
          <path
            key={entry.id}
            d={pointsToPath(entry.points, false)}
            fill="none"
            stroke={uniqueColor}
            strokeWidth={isReshapingThis ? 6 : 4}
            strokeDasharray={getDash(lineStyle)}
            filter="url(#leylineGlow)"
            {...evtProps}
          />
        );
      })}

      {/* 3. POINT LANDMARKS */}
      {showLandmarks && visibleData.map((entry) => {
        if (!entry.points || entry.type !== 'landmark') return null;
        const [x, y] = entry.points;
        const uniqueColor = entry.color || 'rgb(var(--color-primary))';
        const s = 10;

        return (
          <g
            key={entry.id}
            style={{ pointerEvents: isDrawingMode ? 'none' : 'auto', cursor: 'pointer' }}
            onMouseMove={(e) => !reshapeTargetId && onHoverEntry(e, entry)}
            onMouseLeave={onLeaveEntry}
            onClick={(e) => { e.stopPropagation(); onClickEntry(entry); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickEntry(entry); }}
          >
            <polygon
              points={`${x},${y - s*2.4} ${x + s*2.4},${y} ${x},${y + s*2.4} ${x - s*2.4},${y}`}
              fill={uniqueColor} fillOpacity={0} stroke={uniqueColor} strokeWidth={1}
              style={{ animation: 'landmarkHalo 4s ease-in-out infinite', transformOrigin: `${x}px ${y}px` }}
            />
            <polygon
              points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`}
              fill={uniqueColor} stroke="none"
              style={{ animation: 'landmarkCore 4s ease-in-out infinite' }}
            />
          </g>
        );
      })}

      {/* 3.5 TEXT LABELS */}
      {textLabels.map(label => {
        const handleLabelDragStart = (e) => {
          e.stopPropagation();
          e.preventDefault();
          const svg = e.currentTarget.ownerSVGElement;
          const ctm = svg.getScreenCTM();
          if (!ctm) return;
          const pt = svg.createSVGPoint();
          pt.x = e.clientX; pt.y = e.clientY;
          const svgPos = pt.matrixTransform(ctm.inverse());
          const offsetX = svgPos.x - label.x;
          const offsetY = svgPos.y - label.y;
          const onMove = (me) => {
            const movePt = svg.createSVGPoint();
            movePt.x = me.clientX; movePt.y = me.clientY;
            const pos = movePt.matrixTransform(ctm.inverse());
            if (onMoveLabel) onMoveLabel(label.id, pos.x - offsetX, pos.y - offsetY);
          };
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        };

        return (
          <text
            key={label.id}
            x={label.x}
            y={label.y}
            fill={label.color || 'rgb(var(--color-primary))'}
            fontSize={label.fontSize || 20}
            fontFamily="'Cinzel', serif"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="0.12em"
            fontWeight="bold"
            style={{
              pointerEvents: isDrawingMode ? 'none' : 'auto',
              cursor: isLabelMode ? 'move' : 'pointer',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,1)) drop-shadow(0 0 4px rgba(0,0,0,0.8))',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
            onMouseDown={isLabelMode ? handleLabelDragStart : undefined}
            onClick={isLabelMode ? (e) => e.stopPropagation() : undefined}
            onDoubleClick={isLabelMode ? (e) => e.stopPropagation() : (e) => { e.stopPropagation(); if (onEditLabel) onEditLabel(label); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (onDeleteLabel) onDeleteLabel(label.id); }}
          >
            {label.text}
          </text>
        );
      })}

      {/* 4. ACTIVE RESHAPE WORKSPACE */}
      {reshapeTargetId && mapData.map((entry) => {
        if (entry.id !== reshapeTargetId || !entry.points) return null;
        const uniqueColor = entry.color || 'rgb(var(--color-primary))';
        const points = entry.points;
        const renderedNodes = [];
        const renderedMidpoints = [];

        for (let i = 0; i < points.length; i += 2) {
          const currX = points[i], currY = points[i+1], nodeIndex = i;

          renderedNodes.push(
            <circle
              key={`node-${nodeIndex}`}
              cx={currX} cy={currY} r={8}
              fill="#000000" stroke={uniqueColor} strokeWidth={2.5}
              style={{ cursor: 'move', pointerEvents: 'auto', fillOpacity: 0.8 }}
              onMouseDown={(e) => handleVertexMouseDown(e, entry.id, nodeIndex)}
              onContextMenu={(e) => handleVertexRightClick(e, entry.id, nodeIndex)}
            />
          );

          let nextX, nextY, nextNodeIndex;
          if (i + 2 < points.length) {
            nextX = points[i+2]; nextY = points[i+3]; nextNodeIndex = i + 2;
          } else if (entry.type === 'region') {
            nextX = points[0]; nextY = points[1]; nextNodeIndex = points.length;
          } else {
            continue;
          }

          const midX = (currX + nextX) / 2;
          const midY = (currY + nextY) / 2;

          renderedMidpoints.push(
            <rect
              key={`mid-${nodeIndex}`}
              x={midX-5} y={midY-5} width={10} height={10}
              transform={`rotate(45 ${midX} ${midY})`}
              fill={uniqueColor} stroke="#000" strokeWidth={1.5} fillOpacity={0.9}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={(e) => handleAddMidpointNode(e, entry, nextNodeIndex, midX, midY)}
            />
          );
        }

        return (
          <g key={`reshape-ui-${entry.id}`}>
            {renderedMidpoints}
            {renderedNodes}
          </g>
        );
      })}

      {/* 5. LIVE RUNTIME DRAWING LAYER */}
      {isDrawingMode && (
        <g className="pointer-events-none">

          {/* Path through placed points */}
          {currentPoints.length >= 4 && creationType !== 'landmark' && (
            <path
              d={pointsToPath(currentPoints, false)}
              fill="none"
              stroke="rgb(var(--color-primary))"
              strokeWidth={2.5}
              strokeOpacity={0.85}
              filter="url(#hand-drawn-edge)"
            />
          )}

          {/* Faint closed region preview when near enough to seal */}
          {currentPoints.length >= 6 && creationType === 'region' && mousePos && !nearFirstNode && (
            <path
              d={pointsToPath([...currentPoints, mousePos.x, mousePos.y], true)}
              fill="rgb(var(--color-primary))"
              fillOpacity={0.04}
              stroke="rgb(var(--color-primary))"
              strokeWidth={1}
              strokeOpacity={0.15}
              strokeDasharray="4,4"
              filter="url(#hand-drawn-edge)"
            />
          )}

          {/* Ghost line to cursor (snaps to first node when near it) */}
          {currentPoints.length >= 2 && mousePos && creationType !== 'landmark' && (
            <line
              x1={currentPoints[currentPoints.length - 2]}
              y1={currentPoints[currentPoints.length - 1]}
              x2={nearFirstNode ? currentPoints[0] : mousePos.x}
              y2={nearFirstNode ? currentPoints[1] : mousePos.y}
              stroke="rgb(var(--color-primary))"
              strokeWidth={1.5}
              strokeDasharray="5,6"
              strokeOpacity={0.4}
            />
          )}

          {/* Placed node markers */}
          {creationType !== 'landmark' && currentPoints.map((_, i) => {
            if (i % 2 !== 0) return null;
            const isFirst = i === 0;
            return (
              <circle key={`placed-${i}`}
                cx={currentPoints[i]} cy={currentPoints[i+1]}
                r={isFirst && nearFirstNode ? 7 : 5}
                fill="#0a0a0a"
                stroke="rgb(var(--color-primary))"
                strokeWidth={isFirst && nearFirstNode ? 2.5 : 2}
                strokeOpacity={isFirst && nearFirstNode ? 1 : 0.9}
              />
            );
          })}

          {/* Snap-close ring on first node */}
          {nearFirstNode && currentPoints.length >= 2 && (
            <circle
              cx={currentPoints[0]} cy={currentPoints[1]} r={13}
              fill="none"
              stroke="rgb(var(--color-primary))"
              strokeWidth={1.5}
              style={{ animation: 'snapRing 0.9s ease-in-out infinite' }}
            />
          )}

          {/* Landmark placement preview */}
          {currentPoints.length >= 2 && creationType === 'landmark' && (
            <rect
              x={currentPoints[0] - 5} y={currentPoints[1] - 5} width={10} height={10}
              transform={`rotate(45 ${currentPoints[0]} ${currentPoints[1]})`}
              fill="#fff" stroke="rgb(var(--color-primary))" strokeWidth={2}
            />
          )}

          {/* Ghost cursor — hidden when snapping to first node */}
          {mousePos && !nearFirstNode && (
            <g>
              <circle
                cx={mousePos.x} cy={mousePos.y} r={18}
                fill="none"
                stroke="rgb(var(--color-primary))"
                strokeWidth={1}
                style={{ animation: 'ghostHaloPulse 1.8s ease-in-out infinite' }}
              />
              <line x1={mousePos.x - 14} y1={mousePos.y} x2={mousePos.x + 14} y2={mousePos.y}
                stroke="rgb(var(--color-primary))" strokeWidth={0.7} strokeOpacity={0.5}
              />
              <line x1={mousePos.x} y1={mousePos.y - 14} x2={mousePos.x} y2={mousePos.y + 14}
                stroke="rgb(var(--color-primary))" strokeWidth={0.7} strokeOpacity={0.5}
              />
              <circle
                cx={mousePos.x} cy={mousePos.y} r={4}
                fill="rgb(var(--color-primary))"
                style={{ animation: 'ghostCorePulse 1.8s ease-in-out infinite' }}
              />
            </g>
          )}
        </g>
      )}
    </svg>
  );
};

export default DrawingLayer;
