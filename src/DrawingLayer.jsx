import React, { useState } from 'react';

const DrawingLayer = ({ 
  width, height, 
  isDrawingMode, 
  reshapeTargetId,
  mapData, setMapData,
  sidebarEntry, setSidebarEntry,
  currentPoints, setCurrentPoints,
  onHoverEntry, onLeaveEntry,
  onClickEntry, onDoubleClickEntry,
  showRegions, showLandmarks,
  creationType
}) => {
  const [dragInfo, setDragInfo] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);

  // HELPER: Maps raw screen clicks to the absolute 1200x800 map coordinates
  const getCanvasCoordinates = (e, currentTarget) => {
    const rect = currentTarget.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    
    // Scale display screen space up/down to the 1200x800 viewBox coordinate space
    const x = (displayX / rect.width) * 1200;
    const y = (displayY / rect.height) * 800;
    return { x, y };
  };

  const handleMapClick = (e) => {
    if (!isDrawingMode) return;
    const { x, y } = getCanvasCoordinates(e, e.currentTarget);
    
    if (creationType === 'landmark') {
      setCurrentPoints([x, y]);
    } else {
      setCurrentPoints((prev) => [...prev, x, y]);
    }
  };

  const handleVertexMouseDown = (e, entryId, pointIndex) => {
    e.stopPropagation();
    if (e.button === 0) {
      setDragInfo({ entryId, pointIndex });
    }
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
    
    if (sidebarEntry && sidebarEntry.id === entryId) {
      setSidebarEntry(updatedEntry);
    }
  };

  const handleSVGMouseMove = (e) => {
    if (!dragInfo) return;
    const { x, y } = getCanvasCoordinates(e, e.currentTarget);

    const targetEntry = mapData.find(item => item.id === dragInfo.entryId);
    if (!targetEntry || !targetEntry.points) return;

    const updatedPoints = [...targetEntry.points];
    updatedPoints[dragInfo.pointIndex] = x;
    updatedPoints[dragInfo.pointIndex + 1] = y;

    const updatedEntry = { ...targetEntry, points: updatedPoints };
    setMapData(mapData.map(item => item.id === targetEntry.id ? updatedEntry : item));
    if (sidebarEntry && sidebarEntry.id === targetEntry.id) {
      setSidebarEntry(updatedEntry);
    }
  };

  const handleSVGMouseUp = () => {
    setDragInfo(null);
  };

  const handleAddMidpointNode = (e, entry, insertAtIndex, midX, midY) => {
    e.stopPropagation();
    const updatedPoints = [...entry.points];
    updatedPoints.splice(insertAtIndex, 0, midX, midY);

    const updatedEntry = { ...entry, points: updatedPoints };
    setMapData(mapData.map(item => item.id === entry.id ? updatedEntry : item));
    if (sidebarEntry && sidebarEntry.id === entry.id) {
      setSidebarEntry(updatedEntry);
    }
    setDragInfo({ entryId: entry.id, pointIndex: insertAtIndex });
  };

  const getCenterOfPoints = (points) => {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    let totalX = 0, totalY = 0;
    for (let i = 0; i < points.length; i += 2) {
      totalX += points[i]; totalY += points[i+1];
    }
    return { x: totalX / (points.length / 2), y: totalY / (points.length / 2) };
  };

  const formatPoints = (points) => {
    return points.reduce((acc, num, idx) => idx % 2 === 0 ? acc + num + ',' : acc + num + ' ', '').trim();
  };

  return (
    <svg 
      viewBox="0 0 1200 800"
      width="100%" 
      height="100%"
      onMouseMove={handleSVGMouseMove}
      onMouseUp={handleSVGMouseUp}
      onMouseLeave={handleSVGMouseUp}
      className="absolute top-0 left-0"
      style={{ 
        // FIXED: Always allow interactions to pass through so regions stay clickable
        pointerEvents: 'auto', 
        zIndex: 50 
      }}
    >
      <defs>
        {/* LOCALIZED FILTER DEFINITIONS: Prevents hidden cross-reference bugs */}
        <filter id="hand-drawn-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="sigilGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgb(var(--color-primary))" floodOpacity="0.4"/>
        </filter>
        <filter id="leylineGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgb(var(--color-primary))" floodOpacity="0.6"/>
        </filter>
      </defs>

      {/* 0. INVISIBLE INTERCEPTOR LAYER: Safely captures drawing strokes anywhere across space */}
      <rect 
        width={1200} 
        height={800} 
        fill="black"
        fillOpacity={0} 
        style={{ pointerEvents: isDrawingMode ? 'all' : 'none', cursor: 'crosshair' }}
        onClick={handleMapClick}
      />
      
      {/* BACKGROUND VECTOR COSMETIC GRID */}
      <g stroke="rgb(var(--color-primary))" strokeOpacity="0.1" fill="none" strokeWidth={0.7} className="pointer-events-none" filter="url(#sigilGlow)">
        <circle cx={400} cy={400} r={100} />
        <circle cx={400} cy={400} r={200} />
        <circle cx={400} cy={400} r={300} strokeDasharray="10,20" />
        <line x1={0} y1={400} x2={1200} y2={400} />
        <line x1={400} y1={0} x2={400} y2={800} />
      </g>

      {/* 1. TERRITORY REGIONS */}
      {showRegions && mapData.map((entry) => {
        if (!entry.points || entry.type !== 'region') return null;
        const center = getCenterOfPoints(entry.points);
        const uniqueColor = entry.color || 'rgb(var(--color-primary))';
        const isReshapingThis = reshapeTargetId === entry.id;
        const isHovered = hoveredRegionId === entry.id;
        
        return (
          <g key={entry.id}>
            <polygon 
              points={formatPoints(entry.points)} 
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
              onMouseMove={(e) => {
                setHoveredRegionId(entry.id);
                if (!reshapeTargetId) onHoverEntry(e, entry);
              }}
              onMouseLeave={() => {
                setHoveredRegionId(null);
                onLeaveEntry();
              }}
              onClick={(e) => { e.stopPropagation(); onClickEntry(entry); }}
              onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickEntry(entry); }}
            />
            {!isReshapingThis && (
              <text
                x={center.x} y={center.y} fill={uniqueColor}
                fillOpacity={isHovered ? 1.0 : 0.5}
                fontFamily="serif" fontSize="13" fontWeight="bold" textAnchor="middle"
                className="pointer-events-none tracking-[0.25em] uppercase"
                style={{ 
                  transition: 'fill-opacity 0.4s ease',
                  textShadow: '0px 2px 8px rgba(0,0,0,0.9)'
                }}
              >
                {entry.name}
              </text>
            )}
          </g>
        );
      })}

      {/* 2. ROADS / MANA LEYLINES */}
      {showLandmarks && mapData.map((entry) => {
        if (!entry.points || entry.type !== 'road') return null;
        const uniqueColor = entry.color || 'rgb(var(--color-primary))';
        const isReshapingThis = reshapeTargetId === entry.id;
        
        return (
          <polyline
            key={entry.id}
            points={formatPoints(entry.points)}
            fill="none"
            stroke={uniqueColor}
            strokeWidth={isReshapingThis ? 6 : 4}
            strokeDasharray={isReshapingThis ? "6,4" : "none"}
            filter="url(#leylineGlow)"
            style={{ pointerEvents: isDrawingMode ? 'none' : 'auto', cursor: 'pointer' }}
            onMouseMove={(e) => !reshapeTargetId && onHoverEntry(e, entry)}
            onMouseLeave={onLeaveEntry}
            onClick={(e) => { e.stopPropagation(); onClickEntry(entry); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickEntry(entry); }}
          />
        );
      })}

      {/* 3. POINT LANDMARKS */}
      {showLandmarks && mapData.map((entry) => {
        if (!entry.points || entry.type !== 'landmark') return null;
        const [x, y] = entry.points;
        const uniqueColor = entry.color || 'rgb(var(--color-primary))';

        return (
          <g 
            key={entry.id} 
            style={{ 
              pointerEvents: isDrawingMode ? 'none' : 'auto', 
              cursor: 'pointer',
              color: uniqueColor,
              filter: `drop-shadow(0px 0px 8px currentColor)`
            }} 
            onMouseMove={(e) => !reshapeTargetId && onHoverEntry(e, entry)}
            onMouseLeave={onLeaveEntry}
            onClick={(e) => { e.stopPropagation(); onClickEntry(entry); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickEntry(entry); }}
          >
            <circle 
              cx={x} cy={y} r={14} 
              fill={uniqueColor}
              fillOpacity={0.25}
              className={reshapeTargetId === entry.id ? "" : "animate-ping"} 
              style={{ transformOrigin: `${x}px ${y}px` }} 
            />
            <circle cx={x} cy={y} r={6.5} fill={uniqueColor} stroke="#ffffff" strokeWidth={1.5} />
          </g>
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
          const currX = points[i];
          const currY = points[i+1];
          const nodeIndex = i;

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
      {currentPoints.length > 0 && (
        creationType === 'landmark' ? (
          <rect x={currentPoints[0]-5} y={currentPoints[1]-5} width={10} height={10} transform={`rotate(45 ${currentPoints[0]} ${currentPoints[1]})`} fill="#fff" stroke="rgb(var(--color-primary))" strokeWidth={2} />
        ) : (
          <polyline points={formatPoints(currentPoints)} fill="none" stroke="rgb(var(--color-primary))" strokeWidth={4} strokeDasharray="6,6" filter="url(#leylineGlow)"/>
        )
      )}
    </svg>
  );
};

export default DrawingLayer;