function buildCursorSvg(path, r, g, b, glowStrength, fillOpacity) {
  const color = `rgb(${r},${g},${b})`;
  const s = glowStrength;
  // Layered strokes on the path itself create a contour glow that traces the
  // cursor outline. Each layer is wider and more transparent than the last,
  // producing a soft halo that follows the shape edges exactly.
  // Canvas is 32x32 (viewBox -4 -4 32 32) so the outermost stroke layer isn't
  // clipped at the edge; hotspot 6 6 compensates for the 4px padding offset.
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='-4 -4 32 32'>` +
    `<path d='${path}' fill='none' stroke='${color}' stroke-width='7' stroke-opacity='${+(s * 0.10).toFixed(3)}' stroke-linejoin='round' stroke-linecap='round'/>` +
    `<path d='${path}' fill='none' stroke='${color}' stroke-width='4' stroke-opacity='${+(s * 0.20).toFixed(3)}' stroke-linejoin='round' stroke-linecap='round'/>` +
    `<path d='${path}' fill='none' stroke='${color}' stroke-width='2' stroke-opacity='${+(s * 0.45).toFixed(3)}' stroke-linejoin='round' stroke-linecap='round'/>` +
    `<path fill-rule='evenodd' clip-rule='evenodd' d='${path}' fill='${color}' fill-opacity='${fillOpacity}'/>` +
    `</svg>`
  );
}

const NAV_ARROW = `M1.50001 4.07491C0.897091 2.46714 2.46715 0.897094 4.07491 1.50001L21.2155 7.92774C23.1217 8.64256 22.8657 11.4162 20.8609 11.77L13.1336 13.1336L11.77 20.8609C11.4162 22.8657 8.64255 23.1217 7.92774 21.2155L1.50001 4.07491ZM3.37267 3.37267L9.8004 20.5133L11.164 12.786C11.3101 11.9582 11.9582 11.3101 12.786 11.164L20.5133 9.8004L3.37267 3.37267Z`;

let cursorColor = null;
let cursorRaf = null;

function setCursorVars(r, g, b) {
  const enc = (svg) => encodeURIComponent(svg);
  const root = document.documentElement;
  root.style.setProperty(
    '--arcanum-cursor',
    `url("data:image/svg+xml,${enc(buildCursorSvg(NAV_ARROW, r, g, b, 0.85, 0.90))}") 6 6, default`
  );
  root.style.setProperty(
    '--arcanum-cursor-pointer',
    `url("data:image/svg+xml,${enc(buildCursorSvg(NAV_ARROW, r, g, b, 1.0, 0.90))}") 6 6, pointer`
  );
}

export function applyThemeCursors(primaryHex) {
  const hex = (primaryHex || '#c9a84c').replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if ([r, g, b].some(isNaN)) return;

  // First call — snap immediately, no animation
  if (!cursorColor) {
    cursorColor = { r, g, b };
    setCursorVars(r, g, b);
    return;
  }

  if (cursorRaf) cancelAnimationFrame(cursorRaf);

  const target = { r, g, b };
  const SPEED = 0.04; // matches App.jsx theme lerp speed
  const EPS = 0.4;
  const lerp = (a, b) => a + (b - a) * SPEED;

  const tick = () => {
    cursorColor.r = lerp(cursorColor.r, target.r);
    cursorColor.g = lerp(cursorColor.g, target.g);
    cursorColor.b = lerp(cursorColor.b, target.b);
    setCursorVars(
      Math.round(cursorColor.r),
      Math.round(cursorColor.g),
      Math.round(cursorColor.b)
    );
    const moving =
      Math.abs(cursorColor.r - target.r) > EPS ||
      Math.abs(cursorColor.g - target.g) > EPS ||
      Math.abs(cursorColor.b - target.b) > EPS;
    if (moving) cursorRaf = requestAnimationFrame(tick);
    else cursorRaf = null;
  };

  cursorRaf = requestAnimationFrame(tick);
}
