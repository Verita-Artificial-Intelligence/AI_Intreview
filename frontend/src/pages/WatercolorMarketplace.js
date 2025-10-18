import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";

/**
 * Watercolor Marketplace Landing
 * --------------------------------------------------
 * A single-file React component that recreates a soft, pastel, watercolor aesthetic
 * (like the screenshot) as a live, generative canvas background. On top, it renders
 * a clean marketplace front page (hero, search, category chips, product cards).
 *
 * Design notes
 * - TailwindCSS for styling
 * - Framer Motion for subtle entrance animations
 * - Generative background is GPU-friendly: radial gradients + low alpha layers
 * - Controls panel lets you tweak density, size, palette, and "ring" intensity
 * - Background is deterministic per URL by default (seed), but can be randomized
 */

// ---------- Utilities
function rand(seed) {
  // Mulberry32 PRNG for stable seeds
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function withAlpha(hex, a) {
  // accepts #rgb, #rrggbb, or rgb(a)
  if (hex.startsWith("rgb")) return hex.replace(/\)$/," , "+a+")");
  let c = hex.replace("#","");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.slice(0,2),16);
  const g = parseInt(c.slice(2,4),16);
  const b = parseInt(c.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function useWindowSize() {
  const [size, set] = useState({ w: 0, h: 0 });
  useEffect(() => {
    function onResize() {
      set({ w: window.innerWidth, h: window.innerHeight });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

// ---------- Watercolor Canvas
function drawWatercolor(
  ctx,
  width,
  height,
  opts
) {
  const { density, minR, maxR, palette, ringIntensity } = opts;
  const baseCount = Math.floor(((width * height) / (1440 * 900)) * 160 * density);

  // Clear with a very faint warm wash for paper texture
  ctx.clearRect(0, 0, width, height);

  // light paper tint
  const paper = ctx.createLinearGradient(0, 0, width, height);
  paper.addColorStop(0, "rgba(255,255,250, 1)");
  paper.addColorStop(1, "rgba(250,250,245, 1)");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);

  // subtle paper grain
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let y = 0; y < height; y += 2) {
    ctx.fillStyle = `rgba(0,0,0, ${(y % 7) / 800})`;
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();

  // watercolors
  let s = opts.seed;
  for (let i = 0; i < baseCount; i++) {
    const rr = rand((s += i + 13));
    const x = Math.floor(rr * width);
    const y = Math.floor(rand((s += 37)) * height);
    const r = minR + rand((s += 71)) * (maxR - minR);
    const col = palette[Math.floor(rand((s += 97)) * palette.length)];

    // Base bloom
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, withAlpha(col, 0.28));
    g.addColorStop(0.55, withAlpha(col, 0.16));
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Soft ring / brush stroke edges
    if (ringIntensity > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.08 * ringIntensity;
      ctx.lineWidth = Math.max(5, r * 0.18);
      ctx.strokeStyle = withAlpha(col, 0.5);
      ctx.beginPath();
      ctx.arc(x, y, r * (0.68 + rand((s += 19)) * 0.25), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

const defaultPalettes = {
  "sherbet": ["#f7c9c9", "#fdd9a0", "#f9f0b7", "#d9f2e6", "#e6d9ff", "#f6c2e7", "#ffd1e1"],
  "peony":   ["#f3b7bf", "#ffd8e1", "#dbc9ff", "#c8e4ff", "#fff2c6", "#fde0b2"],
  "cloudy":  ["#f6e6e6", "#faefd7", "#f2f6de", "#e8f3f4", "#efe6fb"],
};

export default function WatercolorMarketplaceLanding() {
  const canvasRef = useRef(null);
  const { w, h } = useWindowSize();

  // Controls
  const [showControls, setShowControls] = useState(false);
  const [density, setDensity] = useState(1.0);
  const [minR, setMinR] = useState(60);
  const [maxR, setMaxR] = useState(220);
  const [ringIntensity, setRingIntensity] = useState(0.6);
  const [paletteName, setPaletteName] = useState("sherbet");
  const [animate, setAnimate] = useState(false);

  const seed = useMemo(() => {
    // Stable seed from URL hash if present, else random
    const fromHash = typeof window !== "undefined" && window.location.hash.slice(1);
    return fromHash ? parseInt(fromHash, 36) || Math.random() * 1e9 : Math.random() * 1e9;
  }, []);

  // Draw / Re-draw
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = Math.floor(w * dpr);
    el.height = Math.floor(h * dpr);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    drawWatercolor(ctx, w, h, {
      seed: Math.floor(seed),
      density,
      minR,
      maxR,
      ringIntensity,
      palette: defaultPalettes[paletteName],
      animate,
    });
  }, [w, h, density, minR, maxR, ringIntensity, paletteName, animate, seed]);

  // Optional tiny animation (lazy): redraw every few seconds with slightly shifted seed
  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => {
      const el = canvasRef.current;
      if (!el) return;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      drawWatercolor(ctx, w, h, {
        seed: Math.floor(seed + Math.random() * 1000),
        density,
        minR,
        maxR,
        ringIntensity,
        palette: defaultPalettes[paletteName],
        animate,
      });
    }, 4000);
    return () => clearInterval(id);
  }, [animate, w, h, density, minR, maxR, ringIntensity, paletteName, seed]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#fffef8]">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 -z-10 w-full h-full"/>

      {/* Top Bar */}
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="pointer-events-auto text-sm italic text-neutral-600 select-none">colors</div>
        <button
          onClick={() => setShowControls((s) => !s)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-neutral-700 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
        >
          <SlidersHorizontal size={16} /> {showControls ? "Hide" : "Show"} Controls
        </button>
      </div>

      {/* Controls Panel */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-6 top-14 z-30 w-80 rounded-2xl border border-black/5 bg-white/80 p-4 shadow-xl backdrop-blur"
        >
          <h3 className="mb-2 text-sm font-medium text-neutral-700">Background Controls</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="flex items-center justify-between">Density <span className="tabular-nums">{density.toFixed(2)}</span></label>
              <input type="range" min={0.2} max={2} step={0.05} value={density}
                     onChange={(e) => setDensity(parseFloat(e.target.value))} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center justify-between">Min size<span>{minR}px</span></label>
                <input type="range" min={20} max={140} step={2} value={minR}
                       onChange={(e) => setMinR(parseInt(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="flex items-center justify-between">Max size<span>{maxR}px</span></label>
                <input type="range" min={120} max={420} step={2} value={maxR}
                       onChange={(e) => setMaxR(parseInt(e.target.value))} className="w-full" />
              </div>
            </div>
            <div>
              <label className="flex items-center justify-between">Ring intensity <span>{ringIntensity.toFixed(2)}</span></label>
              <input type="range" min={0} max={1} step={0.02} value={ringIntensity}
                     onChange={(e) => setRingIntensity(parseFloat(e.target.value))} className="w-full" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-neutral-700">Palette</label>
              <select
                className="rounded-md border border-black/10 bg-white/80 px-2 py-1 text-neutral-700"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
              >
                {Object.keys(defaultPalettes).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <button
                onClick={() => window.location.hash = Math.random().toString(36).slice(2)}
                className="ml-auto inline-flex items-center gap-1 rounded-md bg-black/80 px-2 py-1 text-xs text-white"
                title="Randomize seed"
              >
                <Sparkles size={14}/> Seed
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input id="anim" type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} />
              <label htmlFor="anim">Subtle motion</label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 pb-28 pt-28">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-800 md:text-6xl">
            Find tasteful datasets & talent
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-700 md:text-lg">
            A curated marketplace for aesthetic, high-fidelity data and expert annotators. Designed with a soft watercolor vibe to put craft front and center.
          </p>

          {/* Search */}
          <div className="mx-auto mt-6 flex max-w-2xl items-center gap-2 rounded-2xl bg-white/70 p-2 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <Search className="ml-2 shrink-0" size={18} />
            <input
              className="w-full rounded-xl bg-transparent px-2 py-2 text-sm outline-none placeholder:text-neutral-400"
              placeholder="Search datasets, workflows, or experts"
            />
            <button className="rounded-xl bg-black px-4 py-2 text-sm text-white">Search</button>
          </div>

          {/* Category chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {[
              "Music Stems", "Video QA", "Financial Ops", "Compliance AOPs",
              "UX Studies", "Data Labelers", "Agent Evals", "Customer Support"
            ].map((c) => (
              <span key={c} className="rounded-full bg-white/70 px-3 py-1 text-xs text-neutral-700 shadow-sm ring-1 ring-black/5 backdrop-blur">
                {c}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Featured Grid */}
        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="group rounded-3xl border border-black/5 bg-white/60 p-4 shadow-sm backdrop-blur-md"
            >
              <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-white/60 ring-1 ring-black/5">
                {/* Faux preview block with watercolor-esque overlay */}
                <div className="relative h-full w-full">
                  <div className="absolute inset-0 opacity-70" style={{
                    background: "radial-gradient(120px 120px at 30% 40%, rgba(255,170,170,.4), rgba(255,255,255,0) 70%),"+
                                "radial-gradient(160px 160px at 70% 60%, rgba(210,180,255,.35), rgba(255,255,255,0) 70%),"+
                                "radial-gradient(140px 140px at 45% 75%, rgba(255,230,180,.35), rgba(255,255,255,0) 70%)"}}/>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-800">Featured Offer #{i+1}</h3>
                  <span className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-white">NEW</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                  High-quality, taste-forward deliverable with expert reviewers and evaluation harnesses.
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-800">$2,400</span>
                  <button className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs text-white transition group-hover:bg-neutral-800">
                    View details
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
          className="mx-auto mt-14 max-w-3xl rounded-3xl border border-black/5 bg-white/70 p-6 text-center shadow-sm backdrop-blur"
        >
          <h2 className="text-2xl font-semibold text-neutral-900">Launch your tasteful brief</h2>
          <p className="mt-2 text-neutral-700">
            Tell us what you need—data, talent, or ready-made workflows—and we'll match you with curated options.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button className="rounded-xl bg-black px-4 py-2 text-sm text-white">Create brief</button>
            <button className="rounded-xl bg-white px-4 py-2 text-sm text-neutral-800 ring-1 ring-black/10">Talk to us</button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 pb-10 text-xs text-neutral-600">
        <div className="mt-10 text-center">© {new Date().getFullYear()} Your Marketplace. Crafted with watercolor vibes.</div>
      </footer>
    </div>
  );
}
