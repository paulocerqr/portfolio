// Tema claro/escuro (?dark / ?light na URL também funcionam)
const root = document.documentElement;
const q = location.search;
const saved = (() => { try { return localStorage.getItem("theme"); } catch { return null; } })();
root.dataset.theme = q.includes("light") ? "light" : q.includes("dark") ? "dark" : saved || "dark";
document.getElementById("theme").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();

function fitCanvas(c) {
  const dpr = window.devicePixelRatio || 1;
  const r = c.getBoundingClientRect();
  c.width = r.width * dpr;
  c.height = r.height * dpr;
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

// Hero: dois anéis entrelaçados em pontos 3D, arrastáveis
(() => {
  const c = document.getElementById("orb");
  let size = fitCanvas(c);
  addEventListener("resize", () => (size = fitCanvas(c)));

  const pts = [];
  const torus = (cx, rotX, accent) => {
    for (let i = 0; i < 90; i++)
      for (let j = 0; j < 12; j++) {
        const u = (i / 90) * Math.PI * 2, v = (j / 12) * Math.PI * 2;
        const R = 1, r = 0.28;
        let x = (R + r * Math.cos(v)) * Math.cos(u);
        let y = (R + r * Math.cos(v)) * Math.sin(u);
        let z = r * Math.sin(v);
        const cy = Math.cos(rotX), sy = Math.sin(rotX);
        [y, z] = [y * cy - z * sy, y * sy + z * cy];
        pts.push({ x: x + cx, y, z, accent });
      }
  };
  torus(-0.75, Math.PI / 2, false);
  torus(0.75, 0, true);

  let ay = 0.4, ax = 0.3, vy = 0.006, vx = 0, drag = null;
  c.parentElement.addEventListener("pointerdown", (e) => (drag = { x: e.clientX, y: e.clientY }));
  addEventListener("pointerup", () => (drag = null));
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    vy = (e.clientX - drag.x) * 0.002;
    vx = (e.clientY - drag.y) * 0.002;
    drag = { x: e.clientX, y: e.clientY };
  });

  (function frame() {
    const { ctx, w, h } = size;
    ay += vy; ax += vx;
    if (!drag) { vy += (0.006 - vy) * 0.02; vx *= 0.95; }
    ctx.clearRect(0, 0, w, h);
    const s = Math.min(w, h) * 0.26;
    const fg = css("--fg"), ac = css("--accent");
    const cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    const proj = pts.map((p) => {
      let x = p.x * cY + p.z * sY, z = -p.x * sY + p.z * cY, y = p.y;
      [y, z] = [y * cX - z * sX, y * sX + z * cX];
      return { x, y, z, a: p.accent };
    }).sort((a, b) => a.z - b.z);
    for (const p of proj) {
      const k = 3 / (3 - p.z);
      ctx.globalAlpha = 0.35 + 0.65 * ((p.z + 1.4) / 2.8);
      ctx.fillStyle = p.a ? ac : fg;
      ctx.beginPath();
      ctx.arc(w / 2 + p.x * s * k, h / 2 + p.y * s * k, 1.6 * k, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  })();
})();

// Cards: arte em matriz de pontos (halftone)
const shapes = {
  wave: (x, y, t) => 1 - Math.abs(y - 0.55 - 0.15 * Math.sin(x * 7 + t)) * 4,
  bars: (x, y, t) => { const b = Math.floor(x * 6); const hgt = 0.3 + 0.5 * Math.abs(Math.sin(b * 1.7 + t * 0.6)); return y > 1 - hgt ? 1 - (1 - y) / hgt * 0.4 : 0; },
  pin: (x, y, t) => { const d = Math.hypot(x - 0.5, (y - 0.38) * 1.1); const tail = y > 0.4 && y < 0.8 && Math.abs(x - 0.5) < (0.8 - y) * 0.45; return d < 0.22 ? (d < 0.08 ? 0.15 : 1) : tail ? 0.9 : Math.max(0, 0.25 - Math.abs(d - 0.32 - 0.03 * Math.sin(t)) * 6); },
  ring: (x, y, t) => { const d = Math.hypot(x - 0.5, y - 0.5); return 1 - Math.abs(d - 0.28 - 0.04 * Math.sin(t * 1.2)) * 9; },
};
document.querySelectorAll(".matrix").forEach((m) => {
  const c = document.createElement("canvas");
  m.appendChild(c);
  let size = fitCanvas(c);
  addEventListener("resize", () => (size = fitCanvas(c)));
  const fn = shapes[m.dataset.shape];
  let t = 0, hover = false;
  m.addEventListener("mouseenter", () => (hover = true));
  m.addEventListener("mouseleave", () => (hover = false));
  (function frame() {
    const { ctx, w, h } = size;
    t += hover ? 0.05 : 0.012;
    ctx.clearRect(0, 0, w, h);
    const fg = css("--fg"), step = Math.max(8, w / 22);
    for (let y = step / 2; y < h; y += step)
      for (let x = step / 2; x < w; x += step) {
        const v = Math.max(0.06, Math.min(1, fn(x / w, y / h, t)));
        ctx.fillStyle = fg;
        ctx.globalAlpha = 0.25 + v * 0.75;
        ctx.beginPath();
        ctx.arc(x, y, (step / 2.2) * v, 0, 7);
        ctx.fill();
      }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  })();
});
