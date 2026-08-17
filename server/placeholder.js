const CATEGORY_COLORS = {
  web: ["#c6ff5e", "#0a0b0d"],
  branding: ["#ffb86b", "#3a2200"],
  "ui-kits": ["#7ee8fa", "#062a30"],
  illustration: ["#ff8fa3", "#3a0012"],
  templates: ["#b892ff", "#1c0a3a"],
  icons: ["#ffd166", "#3a2900"],
  packaging: ["#8fe3a5", "#04321a"],
  print: ["#ff8f70", "#3a1200"],
  motion: ["#4dd4ac", "#02291d"]
};

function placeholderThumb(label, category, seed, w, h) {
  w = w || 600;
  h = h || 450;
  const [c1, c2] = CATEGORY_COLORS[category] || ["#e5e7eb", "#111"];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <defs>
      <linearGradient id='g${seed}' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${c1}'/>
        <stop offset='1' stop-color='${c2}'/>
      </linearGradient>
    </defs>
    <rect width='${w}' height='${h}' fill='url(#g${seed})'/>
    <text x='50%' y='50%' font-family='Inter,Helvetica,Arial,sans-serif' font-size='26' font-weight='600' fill='rgba(255,255,255,0.92)' text-anchor='middle' dominant-baseline='middle'>${label}</text>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

module.exports = { placeholderThumb, CATEGORY_COLORS };
