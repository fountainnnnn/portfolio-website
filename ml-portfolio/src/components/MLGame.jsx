"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/** MLGame — Interactive NN trainer (wide + equal-height layout)
 * Model: 2 → H1 → H2 → 1 (tanh, tanh, sigmoid), Adam + L2.
 * Datasets: Blobs, Moons, Circles, XOR, Spirals, K-Blobs, Checker, Sine Stripes, Swiss Roll.
 * Controls: complexity, spread, clusters, frequency, noise, batch, hidden sizes, LR, L2, epochs, speed, colors.
 */

export default function MLGame() {
  // =========================
  // UI STATE
  // =========================
  const [dataset, setDataset] = useState("Blobs");
  const [points, setPoints] = useState(300);
  const [noise, setNoise] = useState(0.12);
  const [complexity, setComplexity] = useState(0.5); // drives warp/overlap
  const [spread, setSpread] = useState(1.0);         // global radius scale
  const [clusters, setClusters] = useState(4);       // K-Blobs
  const [freq, setFreq] = useState(4);               // Checker/Sine

  const [h1, setH1] = useState(32);                  // Hidden layer 1 width
  const [h2, setH2] = useState(24);                  // Hidden layer 2 width
  const [lr, setLR] = useState(0.05);                // Learning rate
  const [l2, setL2] = useState(0.0005);              // L2 weight decay
  const [batch, setBatch] = useState(64);            // Minibatch size
  const [epochs, setEpochs] = useState(5);           // Epochs for manual train button
  const [speed, setSpeed] = useState(4);             // Minibatches per animation frame when "running"
  const [running, setRunning] = useState(false);
  const [drawMode, setDrawMode] = useState(false);

  // Colors (class 1 vs class 0)
  const [color1, setColor1] = useState("#fecaca"); // class=1 — light red
  const [color0, setColor0] = useState("#67e8f9"); // class=0 — cyan

  // =========================
  // METRICS
  // =========================
  const [trainAcc, setTrainAcc] = useState(0);
  const [valAcc, setValAcc] = useState(0);
  const [lossVal, setLossVal] = useState(0);
  const [steps, setSteps] = useState(0);

  // =========================
  // REFS
  // =========================
  const pageRef = useRef(null);
  const mainWrapRef = useRef(null);      // left column container (for canvas width)
  const trainCardRef = useRef(null);     // left card for height calc
  const toolbarRef = useRef(null);       // top toolbar in training card
  const archWrapRef = useRef(null);      // bottom architecture container (for canvas width)
  const canvasRef = useRef(null);
  const archCanvasRef = useRef(null);
  const dataTrain = useRef([]);
  const dataVal = useRef([]);
  const userPoints = useRef([]);
  const model = useRef(null);

  // Equal-height target for the two top cards
  const TOP_H = 680; // px — adjust here to taste

  // =========================
  // UTILS
  // =========================
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const randn = () =>
    (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 3;

  const DATASET_HELP = {
    Blobs: "Multiple Gaussian clusters per class.",
    Moons: "Two interleaving crescents.",
    Circles: "Concentric rings.",
    XOR: "Opposite corners share a label.",
    Spirals: "Two entwined spirals.",
    "K-Blobs": "Choose number of clusters per class.",
    Checker: "Checkerboard; use Frequency for tiles.",
    SineStripes: "Wavy stripes; use Frequency for waves.",
    SwissRoll: "Rolled arc with alternating labels."
  };

  // per-regen seed (global transform)
  const regenSeed = useRef({ rot: 0, dx: 0, dy: 0, scale: 1, phx: 0, phy: 0 });
  function newRegenSeed() {
    regenSeed.current = {
      rot: Math.random() * Math.PI * 2,
      dx: (Math.random() * 2 - 1) * 0.22,
      dy: (Math.random() * 2 - 1) * 0.22,
      scale: 0.9 + Math.random() * 0.7,
      phx: Math.random() * Math.PI * 2,
      phy: Math.random() * Math.PI * 2,
    };
  }

  // =========================
  // WARPS
  // =========================
  function warpPoint([x, y], cplx, tRand = 0) {
    const seed = regenSeed.current;

    // 1) global transform — makes regen look different & more spread
    let gx = x * seed.scale + seed.dx;
    let gy = y * seed.scale + seed.dy;
    const ca = Math.cos(seed.rot), sa = Math.sin(seed.rot);
    let wx = gx * ca - gy * sa;
    let wy = gx * sa + gy * ca;

    // 2) swirl
    const r = Math.hypot(wx, wy);
    const ang = Math.atan2(wy, wx) + cplx * 1.7 * r;
    wx = Math.cos(ang) * r;
    wy = Math.sin(ang) * r;

    // 3) sine warp with global phases
    const A = 0.2 * cplx;
    wx += A * Math.sin((wx + seed.phx + tRand * 1.7) * (2.0 + 3.0 * cplx));
    wy += A * Math.sin((wy + seed.phy + tRand * 2.1) * (2.0 + 3.0 * cplx));

    // 4) jitter based on complexity
    wx += (randn() * 0.07) * cplx;
    wy += (randn() * 0.07) * cplx;

    // spread knob
    wx *= spread;
    wy *= spread;

    return [clamp(wx, -0.98, 0.98), clamp(wy, -0.98, 0.98)];
  }

  // =========================
  // DATASETS
  // =========================
  function genBlobs(N, s = noise) {
    const out = [];
    const K = Math.max(2, Math.round(3 + complexity * 5)); // more clusters as complexity rises
    const centers1 = Array.from({ length: K }, () => [randn() * 0.8 - 0.2, randn() * 0.8 - 0.1]);
    const centers0 = Array.from({ length: K }, () => [randn() * 0.8 + 0.2, randn() * 0.8 + 0.1]);
    const anis = () => [0.1 + 0.35 * complexity * Math.random(), 0.1 + 0.25 * Math.random()];
    const angle = () => Math.random() * Math.PI * 2;
    const samp = (c, ang, ax, ay) => {
      const u = randn() * ax, v = randn() * ay;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const px = c[0] + u * ca - v * sa + randn() * s * 0.4;
      const py = c[1] + u * sa + v * ca + randn() * s * 0.4;
      return [px, py];
    };
    for (let i = 0; i < (N / 2) | 0; i++) {
      const [ax1, ay1] = anis(), [ax0, ay0] = anis();
      out.push({ x: warpPoint(samp(centers1[i % K], angle(), ax1, ay1), complexity, 0.1), y: 1 });
      out.push({ x: warpPoint(samp(centers0[i % K], angle(), ax0, ay0), complexity, 0.7), y: 0 });
    }
    return out;
  }

  function genMoons(N, s = 0.08) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const t = Math.random() * Math.PI;
      const x1 = [Math.cos(t) * 0.8 + randn() * s, Math.sin(t) * 0.5 + randn() * s];
      const x2 = [Math.cos(t) * 0.8 + 0.3 + randn() * s, -Math.sin(t) * 0.5 - 0.15 + randn() * s];
      out.push({ x: warpPoint(x1, complexity), y: 1 });
      out.push({ x: warpPoint(x2, complexity), y: 0 });
    }
    return out;
  }

  function genCircles(N, s = 0.06) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const rInner = 0.35, rOuter = 0.9;
      const t = Math.random() * Math.PI * 2, r = rInner + (rOuter - rInner) * Math.random();
      const p = [r * Math.cos(t) + randn() * s, r * Math.sin(t) + randn() * s];
      const y = r > 0.6 ? 1 : 0;
      out.push({ x: warpPoint(p, complexity), y });
    }
    return out;
  }

  function genXOR(N, s = 0.15) {
    const out = []; const quad = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]];
    for (let i = 0; i < N; i++) {
      const q = quad[(Math.random() * 4 | 0)];
      const p = [q[0] + randn() * s, q[1] + randn() * s];
      const y = (p[0] * p[1] >= 0) ? 1 : 0;
      out.push({ x: warpPoint(p, complexity), y });
    }
    return out;
  }

  function genSpirals(N, s = 0.06) {
    const out = []; const K = N;
    for (let i = 0; i < K; i++) {
      const t = i / K * 3.2 * Math.PI + 0.2, r = 0.1 + 0.9 * (i / K);
      const a1 = t, a2 = t + Math.PI;
      out.push({ x: warpPoint([r * Math.cos(a1) + randn() * s, r * Math.sin(a1) + randn() * s], complexity, 0.3), y: 1 });
      out.push({ x: warpPoint([r * Math.cos(a2) + randn() * s, r * Math.sin(a2) + randn() * s], complexity, 0.9), y: 0 });
    }
    return out;
  }

  // NEW: K-Blobs (anisotropic, rotated ellipses, multiple per class)
  function genKBlobs(N, s = 0.18, K = clusters) {
    const out = []; const per = (N / 2 | 0);
    const centers1 = Array.from({ length: K }, () => [randn() * 0.6 - 0.3, randn() * 0.6]);
    const centers0 = Array.from({ length: K }, () => [randn() * 0.6 + 0.3, randn() * 0.6]);
    function samp(center, ang, ax, ay) {
      const u = randn() * ax, v = randn() * ay;
      const c = Math.cos(ang), d = Math.sin(ang);
      const px = center[0] + u * c - v * d + randn() * s * 0.5;
      const py = center[1] + u * d + v * c + randn() * s * 0.5;
      return [px, py];
    }
    for (let i = 0; i < per; i++) {
      const id1 = (Math.random() * K | 0), id0 = (Math.random() * K | 0);
      const ang = complexity * Math.PI * (Math.random() * 1.5);
      const ax = 0.1 + 0.35 * complexity, ay = 0.1 + 0.2 * Math.random();
      out.push({ x: warpPoint(samp(centers1[id1], ang, ax, ay), complexity, 0.1), y: 1 });
      out.push({ x: warpPoint(samp(centers0[id0], -ang, ax, ay), complexity, 0.7), y: 0 });
    }
    return out;
  }

  // NEW: Checkerboard
  function genChecker(N, f = freq) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const p = [(Math.random() * 2 - 1), (Math.random() * 2 - 1)];
      const u = Math.floor((p[0] + 1) * 0.5 * f), v = Math.floor((p[1] + 1) * 0.5 * f);
      const y = ((u + v) & 1) ? 1 : 0;
      const q = [p[0] + randn() * noise * 0.25, p[1] + randn() * noise * 0.25];
      out.push({ x: warpPoint(q, complexity, 0.5), y });
    }
    return out;
  }

  // NEW: Sine stripes
  function genSineStripes(N, f = freq) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const x = (Math.random() * 2 - 1), y = (Math.random() * 2 - 1);
      const s = Math.sin(f * x) + 0.6 * Math.sin(f * 0.8 * y + 1.3);
      const ylab = s > 0 ? 1 : 0;
      const q = [x + randn() * noise * 0.2, y + randn() * noise * 0.2];
      out.push({ x: warpPoint(q, complexity, 0.2), y: ylab });
    }
    return out;
  }

  // NEW: Swiss Roll
  function genSwissRoll(N, s = noise) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const t = (Math.random() * 3 + 1) * Math.PI;
      let x = t * Math.cos(t) / (Math.PI * 3); let y = t * Math.sin(t) / (Math.PI * 3);
      x += randn() * s; y += randn() * s;
      const ylab = ((t / (Math.PI * 0.8)) | 0) % 2 ? 1 : 0;
      out.push({ x: warpPoint([x, y], complexity, 0.4), y: ylab });
    }
    return out;
  }

  // Dataset registry
  const gens = useMemo(() => ({
    Blobs:       (N) => genBlobs(N, noise),
    Moons:       (N) => genMoons(N, noise * 0.8),
    Circles:     (N) => genCircles(N, noise * 0.6),
    XOR:         (N) => genXOR(N, noise * 0.9),
    Spirals:     (N) => genSpirals(N, noise * 0.7),
    "K-Blobs":   (N) => genKBlobs(N, noise, clusters),
    Checker:     (N) => genChecker(N, freq),
    SineStripes: (N) => genSineStripes(N, freq),
    SwissRoll:   (N) => genSwissRoll(N, noise * 0.4),
  }), [noise, clusters, freq, spread, complexity]);

  // =========================
  // MODEL
  // =========================
  function initModel(H1, H2) {
    const W1 = Array.from({ length: 2 }, () => Array.from({ length: H1 }, () => randn() * 0.6));
    const b1 = Array.from({ length: H1 }, () => 0);
    const W2 = Array.from({ length: H1 }, () => Array.from({ length: H2 }, () => randn() * 0.6));
    const b2 = Array.from({ length: H2 }, () => 0);
    const W3 = Array.from({ length: H2 }, () => randn() * 0.6);
    const b3 = 0;

    const zerosMat = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, () => 0));
    const zerosVec = (n) => Array.from({ length: n }, () => 0);
    const m = { W1: zerosMat(2, H1), b1: zerosVec(H1), W2: zerosMat(H1, H2), b2: zerosVec(H2), W3: zerosVec(H2), b3: 0 };
    const v = { W1: zerosMat(2, H1), b1: zerosVec(H1), W2: zerosMat(H1, H2), b2: zerosVec(H2), W3: zerosVec(H2), b3: 0 };
    model.current = { W1, b1, W2, b2, W3, b3, m, v, t: 0 };
  }
  function resetModel() { initModel(h1, h2); setSteps(0); }

  // Data split
  function splitTrainVal(all) {
    const sh = all.slice().sort(() => Math.random() - 0.5);
    const cut = (sh.length * 0.8) | 0;
    dataTrain.current = sh.slice(0, cut);
    dataVal.current = sh.slice(cut);
  }
  function regenerate() {
    newRegenSeed();
    const N = Math.max(80, points);
    const gen = gens[dataset] || gens["Blobs"];
    splitTrainVal(gen(N));
    userPoints.current = [];
    setSteps(0);
  }

  // fwd/back
  const tanh = (z) => Math.tanh(z);
  const dtanh = (y) => 1 - y * y;
  const sigmoid = (z) => 1 / (1 + Math.exp(-z));
  const dot2 = (x, W, b) => { const H = W[0].length, out = new Array(H); for (let j = 0; j < H; j++) out[j] = x[0] * W[0][j] + x[1] * W[1][j] + b[j]; return out; };
  const dotH = (h, W, b) => { const H = h.length, K = W[0].length, out = new Array(K); for (let k = 0; k < K; k++) { let s = b[k]; for (let j = 0; j < H; j++) s += h[j] * W[j][k]; out[k] = s; } return out; };

  function fwd(x) {
    const mdl = model.current;
    const z1 = dot2(x, mdl.W1, mdl.b1); const h1v = z1.map(tanh);
    const z2 = dotH(h1v, mdl.W2, mdl.b2); const h2v = z2.map(tanh);
    let z3 = mdl.b3; for (let k = 0; k < h2v.length; k++) z3 += h2v[k] * mdl.W3[k];
    const yhat = sigmoid(z3);
    return { z1, h1: h1v, z2, h2: h2v, z3, yhat };
  }
  const bce = (p, y) => { const e = 1e-7; return -(y * Math.log(p + e) + (1 - y) * Math.log(1 - p + e)); };

  function accuracyOn(arr) { if (!arr.length) return 0; let c = 0; for (const d of arr) { if ((fwd(d.x).yhat >= 0.5 ? 1 : 0) === d.y) c++; } return c / arr.length; }

  function trainMinibatch(B) {
    const mdl = model.current; if (!mdl || !dataTrain.current.length) return { acc: 0, valAcc: 0, loss: 0 };

    const g = {
      W1: Array.from({ length: 2 }, () => Array.from({ length: h1 }, () => 0)),
      b1: Array.from({ length: h1 }, () => 0),
      W2: Array.from({ length: h1 }, () => Array.from({ length: h2 }, () => 0)),
      b2: Array.from({ length: h2 }, () => 0),
      W3: Array.from({ length: h2 }, () => 0),
      b3: 0
    };

    // sample
    const N = dataTrain.current.length, idxs = Array.from({ length: B }, () => (Math.random() * N | 0));
    let loss = 0, cache = [];
    for (const i of idxs) {
      const d = dataTrain.current[i], fw = fwd(d.x), y = d.y;
      loss += bce(fw.yhat, y);
      cache.push({ ...fw, x: d.x, y });
    }

    // backprop
    for (const c of cache) {
      const dy = (c.yhat - c.y); // dL/dz3
      g.b3 += dy; for (let k = 0; k < h2; k++) g.W3[k] += dy * c.h2[k];

      const dh2 = new Array(h2);
      for (let k = 0; k < h2; k++) dh2[k] = dy * mdl.W3[k] * dtanh(c.h2[k]);

      for (let k = 0; k < h2; k++) { g.b2[k] += dh2[k]; for (let j = 0; j < h1; j++) g.W2[j][k] += dh2[k] * c.h1[j]; }

      const dh1 = new Array(h1).fill(0);
      for (let j = 0; j < h1; j++) { let s = 0; for (let k = 0; k < h2; k++) s += dh2[k] * mdl.W2[j][k]; dh1[j] = s * dtanh(c.h1[j]); }
      for (let j = 0; j < h1; j++) { g.b1[j] += dh1[j]; g.W1[0][j] += dh1[j] * c.x[0]; g.W1[1][j] += dh1[j] * c.x[1]; }
    }

    // average + L2
    loss /= (idxs.length || 1);
    const l2W = (mat) => mat.reduce((s, r) => s + r.reduce((a, v) => a + v * v, 0), 0);
    const l2V = (vec) => vec.reduce((s, v) => s + v * v, 0);
    const l2sum = l2W(mdl.W1) + l2W(mdl.W2) + l2V(mdl.W3);
    loss += l2 * 0.5 * l2sum;

    // Adam
    mdl.t += 1; const beta1 = 0.9, beta2 = 0.999, eps = 1e-8, lrNow = lr;
    function adamMat(P, G, M, V) {
      for (let i = 0; i < P.length; i++) { for (let j = 0; j < P[0].length; j++) {
        const gij = G[i][j] / (idxs.length || 1) + l2 * P[i][j];
        M[i][j] = beta1 * M[i][j] + (1 - beta1) * gij;
        V[i][j] = beta2 * V[i][j] + (1 - beta2) * gij * gij;
        const mhat = M[i][j] / (1 - Math.pow(beta1, mdl.t));
        const vhat = V[i][j] / (1 - Math.pow(beta2, mdl.t));
        P[i][j] -= lrNow * mhat / (Math.sqrt(vhat) + eps);
      } }
    }
    function adamVec(P, G, M, V) {
      for (let i = 0; i < P.length; i++) {
        const gi = (G[i] / (idxs.length || 1)) + l2 * P[i];
        M[i] = beta1 * M[i] + (1 - beta1) * gi;
        V[i] = beta2 * V[i] + (1 - beta2) * gi * gi;
        const mhat = M[i] / (1 - Math.pow(beta1, mdl.t));
        const vhat = V[i] / (1 - Math.pow(beta2, mdl.t));
        P[i] -= lrNow * mhat / (Math.sqrt(vhat) + eps);
      }
    }
    adamMat(mdl.W1, g.W1, model.current.m.W1, model.current.v.W1);
    adamVec(mdl.b1, g.b1, model.current.m.b1, model.current.v.b1);
    adamMat(mdl.W2, g.W2, model.current.m.W2, model.current.v.W2);
    adamVec(mdl.b2, g.b2, model.current.m.b2, model.current.v.b2);
    // W3 vector, b3 scalar
    {
      const Gw3 = g.W3.map((v, i) => v / (idxs.length || 1) + l2 * mdl.W3[i]);
      for (let k = 0; k < h2; k++) {
        model.current.m.W3[k] = beta1 * model.current.m.W3[k] + (1 - beta1) * Gw3[k];
        model.current.v.W3[k] = beta2 * model.current.v.W3[k] + (1 - beta2) * Gw3[k] * Gw3[k];
        const mhat = model.current.m.W3[k] / (1 - Math.pow(beta1, mdl.t));
        const vhat = model.current.v.W3[k] / (1 - Math.pow(beta2, mdl.t));
        mdl.W3[k] -= lrNow * mhat / (Math.sqrt(vhat) + eps);
      }
      const g3 = g.b3 / (idxs.length || 1);
      model.current.m.b3 = beta1 * model.current.m.b3 + (1 - beta1) * g3;
      model.current.v.b3 = beta2 * model.current.v.b3 + (1 - beta2) * g3 * g3;
      const mhat = model.current.m.b3 / (1 - Math.pow(beta1, mdl.t));
      const vhat = model.current.v.b3 / (1 - Math.pow(beta2, mdl.t));
      mdl.b3 -= lrNow * mhat / (Math.sqrt(vhat) + eps);
    }

    setTrainAcc(accuracyOn(dataTrain.current));
    setValAcc(accuracyOn(dataVal.current));
    setLossVal(loss);
    setSteps(s => s + 1);
    return { loss };
  }

  // Manual epochs training
  function trainEpochs(n = epochs) {
    const N = dataTrain.current.length || 1;
    const perEpoch = Math.ceil(N / Math.max(1, batch));
    for (let e = 0; e < n; e++) {
      for (let i = 0; i < perEpoch; i++) trainMinibatch(batch);
    }
    draw(); drawArch();
  }

  // =========================
  // VIZ — MAIN CANVAS
  // =========================
  function hexToRGB(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 255, g: 255, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  const draw = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, "#0b0f1a"); grad.addColorStop(1, "#0e1222");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // decision heatmap only if model exists
    if (model.current) {
      const step = 6;
      const c1 = hexToRGB(color1); // class 1
      const c0 = hexToRGB(color0); // class 0
      for (let sx = 0; sx < W; sx += step) {
        for (let sy = 0; sy < H; sy += step) {
          const nx = (sx / W) * 2 - 1, ny = (sy / H) * 2 - 1;
          const p = fwd([nx, ny]).yhat;
          const r = Math.round(c0.r * (1 - p) + c1.r * p);
          const g = Math.round(c0.g * (1 - p) + c1.g * p);
          const b = Math.round(c0.b * (1 - p) + c1.b * p);
          ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
          ctx.fillRect(sx, sy, step, step);
        }
      }
    }

    // grid
    ctx.strokeStyle = "#ffffff10"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const color1Fill = color1;
    const color0Fill = color0;
    const color1ValStroke = hexToRGBA(color1, 0.65);
    const color0ValStroke = hexToRGBA(color0, 0.65);
    const color1ValFill = hexToRGBA(color1, 0.2);
    const color0ValFill = hexToRGBA(color0, 0.2);

    const drawPts = (arr, filled = true, r = 4) => {
      for (const d of arr) {
        const sx = (d.x[0] + 1) * 0.5 * W, sy = (d.x[1] + 1) * 0.5 * H;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
        if (filled) {
          ctx.fillStyle = d.y ? color1Fill : color0Fill; ctx.fill();
          ctx.strokeStyle = "#00000033"; ctx.stroke();
        } else {
          ctx.fillStyle = d.y ? color1ValFill : color0ValFill; ctx.fill();
          ctx.strokeStyle = d.y ? color1ValStroke : color0ValStroke; ctx.stroke();
        }
      }
    };
    drawPts(dataTrain.current, true, 4.2);
    drawPts(dataVal.current, false, 3.0);
    if (userPoints.current.length) {
      for (const d of userPoints.current) {
        const sx = (d.x[0] + 1) * 0.5 * W, sy = (d.x[1] + 1) * 0.5 * H;
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = d.y ? lighten(color1, 0.2) : lighten(color0, 0.2); ctx.fill();
        ctx.strokeStyle = "#fff9"; ctx.stroke();
      }
    }

    ctx.fillStyle = "#e5e7eb"; ctx.font = "12px ui-sans-serif, system-ui, Segoe UI";
    const info = `Dataset: ${dataset}  Steps: ${steps}  Loss: ${lossVal.toFixed(3)}  Train: ${(trainAcc * 100 | 0)}%  Val: ${(valAcc * 100 | 0)}%`;
    ctx.fillText(info, 10, 18);
    ctx.fillText(`H: ${h1}-${h2}  LR: ${lr}  L2: ${l2}  Batch: ${batch}  Cplx: ${complexity.toFixed(2)}  Spread: ${spread.toFixed(2)}`, 10, 32);
  };

  // =========================
  // ARCHITECTURE DIAGRAM (auto-expanding height, uses model dims)
  // =========================
  function getModelDims() {
    const mdl = model.current;
    const H1 = mdl?.W1?.[0]?.length ?? h1;
    const H2 = mdl?.W2?.[0]?.length ?? h2;
    return { H1, H2 };
  }

  function drawArch() {
    const c = archCanvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    // background
    ctx.fillStyle = "#0e1222"; ctx.fillRect(0, 0, W, H);

    const mdl = model.current;
    if (!mdl || !mdl.W1 || !mdl.W2 || !mdl.W3) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px ui-sans-serif, system-ui, Segoe UI";
      ctx.fillText("Model not initialized…", 12, 20);
      return;
    }

    // helpers
    const maxAbsMat = (M) => {
      let m = 1e-6;
      for (let i = 0; i < M.length; i++) for (let j = 0; j < M[0].length; j++) m = Math.max(m, Math.abs(M[i][j]));
      return m;
    };
    const maxAbsVecLocal = (V) => V.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-6);

    function roundRect(x, y, w, h, r = 8) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function drawPill(x, y, text, opts = {}) {
      const {
        font = "12px ui-sans-serif, system-ui, Segoe UI",
        padX = 8,
        padY = 5,
        fill = "#0b1220cc",
        stroke = "#e5e7eb22",
        textColor = "#e5e7eb"
      } = opts;
      ctx.save();
      ctx.font = font;
      const tw = ctx.measureText(text).width;
      const th = parseInt(font, 10) || 12;
      const w = tw + padX * 2;
      const h = th + padY * 2;
      const x0 = x - w / 2;
      const y0 = y - h / 2;
      roundRect(x0, y0, w, h, 10);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.stroke();
      ctx.fillStyle = textColor; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    // layout (USE ACTUAL MODEL DIMS)
    const { H1: H1n, H2: H2n } = getModelDims();

    const PAD_LEFT   = 80;
    const PAD_RIGHT  = 130;
    const PAD_TOP    = 70;
    const PAD_BOTTOM = 90;

    const layers = [
      { n: 2,   label: "Input",    sub: "(x, y)" },
      { n: H1n, label: "Hidden 1", sub: `(tanh, ${H1n})` },
      { n: H2n, label: "Hidden 2", sub: `(tanh, ${H2n})` },
      { n: 1,   label: "Output",   sub: "(sigmoid, 1)" }
    ];

    const colW = (W - (PAD_LEFT + PAD_RIGHT)) / (layers.length - 1);
    const nodeRadius = (n) => Math.max(4, Math.min(10, (H - (PAD_TOP + PAD_BOTTOM)) / (n * 1.9)));

    const positions = [];
    for (let li = 0; li < layers.length; li++) {
      const n = layers[li].n;
      const r = nodeRadius(n);
      const availH = H - (PAD_TOP + PAD_BOTTOM);
      const totalH = (n - 1) * (r * 2.2);
      const startY = PAD_TOP + (availH - totalH) / 2;
      const x = PAD_LEFT + li * colW;
      const col = [];
      for (let j = 0; j < n; j++) col.push({ x, y: startY + j * (r * 2.2), r });
      positions.push(col);
    }

    // connections (CLAMP to available positions to avoid undefined)
    function drawMatrixLines(srcPos, dstPos, M, maxAbs) {
      const rows = Math.min(M.length, srcPos.length);
      const cols = Math.min(M[0].length, dstPos.length);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const w = M[i][j];
          const mag = Math.abs(w) / maxAbs;
          ctx.strokeStyle = hexToRGBA(w >= 0 ? color1 : color0, 0.08 + 0.6 * mag);
          ctx.lineWidth = 0.5 + 2.0 * mag;
          ctx.beginPath();
          ctx.moveTo(srcPos[i].x + srcPos[i].r, srcPos[i].y);
          ctx.lineTo(dstPos[j].x - dstPos[j].r, dstPos[j].y);
          ctx.stroke();
        }
      }
    }
    function drawVectorLines(srcPos, outPos, V, maxAbs) {
      const len = Math.min(V.length, srcPos.length);
      for (let j = 0; j < len; j++) {
        const w = V[j];
        const mag = Math.abs(w) / maxAbs;
        ctx.strokeStyle = hexToRGBA(w >= 0 ? color1 : color0, 0.12 + 0.65 * mag);
        ctx.lineWidth = 0.6 + 2.2 * mag;
        ctx.beginPath();
        ctx.moveTo(srcPos[j].x + srcPos[j].r, srcPos[j].y);
        ctx.lineTo(outPos[0].x - outPos[0].r, outPos[0].y);
        ctx.stroke();
      }
    }

    drawMatrixLines(positions[0], positions[1], mdl.W1, maxAbsMat(mdl.W1));
    drawMatrixLines(positions[1], positions[2], mdl.W2, maxAbsMat(mdl.W2));
    drawVectorLines(positions[2], positions[3], mdl.W3, maxAbsVecLocal(mdl.W3));

    // nodes
    ctx.font = "13px ui-sans-serif, system-ui, Segoe UI";
    for (let li = 0; li < layers.length; li++) {
      for (const p of positions[li]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "#111827";
        ctx.fill();
        ctx.strokeStyle = "#e5e7eb22";
        ctx.stroke();
      }
    }

    // top labels
    const topLabelY  = 28;
    const topSubY    = 48;
    const weightLblY = 78;

    for (let li = 0; li < layers.length; li++) {
      const x = positions[li][0].x;
      drawPill(x, topLabelY, layers[li].label);
      drawPill(x, topSubY,   layers[li].sub, { font: "11px ui-sans-serif, system-ui, Segoe UI", fill: "#0b1220aa" });
    }
    drawPill((positions[0][0].x + positions[1][0].x) / 2, weightLblY, "W1 (Input → H1)", { font: "11px ui-sans-serif, system-ui, Segoe UI" });
    drawPill((positions[1][0].x + positions[2][0].x) / 2, weightLblY, "W2 (H1 → H2)",    { font: "11px ui-sans-serif, system-ui, Segoe UI" });
    drawPill((positions[2][0].x + positions[3][0].x) / 2, weightLblY, "W3 (H2 → Out)",   { font: "11px ui-sans-serif, system-ui, Segoe UI" });

    // bias bars + labels (CLAMP length)
    function drawBiasBars(pos, b, side = "left", label = "b") {
      const maxB = maxAbsVecLocal(b);
      const w = 5;
      const x0 = side === "left" ? pos[0].x - 22 : pos[0].x + 16;
      const len = Math.min(b.length, pos.length);
      for (let i = 0; i < len; i++) {
        const mag = Math.abs(b[i]) / maxB;
        const h = 10 + 30 * mag;
        ctx.fillStyle = hexToRGBA(b[i] >= 0 ? color1 : color0, 0.55);
        ctx.fillRect(x0, pos[i].y - h / 2, w, h);
      }
      drawPill(x0 + (side === "left" ? -8 : 14), pos[0].y - 40, label, {
        font: "11px ui-sans-serif, system-ui, Segoe UI", fill: "#0b1220cc"
      });
    }
    drawBiasBars(positions[1], mdl.b1, "left",  "b1 (H1)");
    drawBiasBars(positions[2], mdl.b2, "right", "b2 (H2)");

    // output bias pill
    drawPill(positions[3][0].x + 32, positions[3][0].y - 40, `b3 (Out): ${model.current.b3.toFixed(3)}`, {
      font: "11px ui-sans-serif, system-ui, Segoe UI", fill: "#0b1220cc"
    });

    // legend
    const lgW = Math.min(200, Math.max(140, W * 0.18));
    const lgH = 12;
    const margin = 16;
    const lgX = W - lgW - margin;
    const barY = H - margin - lgH - 18;

    drawPill(lgX + lgW / 2, barY - 14, "Weights (sign)", {
      font: "11px ui-sans-serif, system-ui, Segoe UI",
      fill: "#0b1220aa"
    });

    const grad = ctx.createLinearGradient(lgX, 0, lgX + lgW, 0);
    grad.addColorStop(0, hexToRGBA(color0, 0.95));
    grad.addColorStop(1, hexToRGBA(color1, 0.95));
    ctx.fillStyle = grad;
    ctx.fillRect(lgX, barY, lgW, lgH);
    ctx.strokeStyle = "#ffffff33";
    ctx.strokeRect(lgX, barY, lgW, lgH);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "11px ui-sans-serif, system-ui, Segoe UI";
    ctx.textAlign = "left";
    ctx.fillText("negative → class 0", lgX, barY + lgH + 12);
    ctx.textAlign = "right";
    ctx.fillText("positive → class 1", lgX + lgW, barY + lgH + 12);
    ctx.textAlign = "start";
  }

  // =========================
  // EFFECTS
  // =========================
  function layoutCanvases() {
    const main = mainWrapRef.current;
    const trainCard = trainCardRef.current;
    const tool = toolbarRef.current;
    const c = canvasRef.current;
    const a = archCanvasRef.current;
    const arch = archWrapRef.current;

    // Equalize top card heights
    if (trainCard) trainCard.style.height = `${TOP_H}px`;
    const configCard = document.getElementById("configCard");
    if (configCard) configCard.style.height = `${TOP_H}px`;

    // Main canvas sizing
    if (main && c && trainCard) {
      c.width = Math.max(560, Math.floor(main.clientWidth));
      const toolbarH = tool ? tool.clientHeight : 72;
      const innerPad = 24;
      const targetH = Math.max(360, TOP_H - toolbarH - innerPad - 40);
      c.height = targetH;
    }

    // Architecture canvas sizing — auto-expands by actual model shapes
    if (arch && a) {
      const { H1: H1n, H2: H2n } = getModelDims();
      a.width = Math.max(600, Math.floor(arch.clientWidth));
      const PAD_TOP = 70, PAD_BOTTOM = 90, per = 22;
      const nMax = Math.max(2, H1n, H2n);
      const idealHeight = PAD_TOP + PAD_BOTTOM + Math.max(0, nMax - 1) * per;
      a.height = Math.max(460, idealHeight);
    }
  }

  // Mount + resize
  useEffect(() => {
    const onResize = () => { layoutCanvases(); draw(); drawArch(); };
    layoutCanvases();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-layout when H1/H2 change
  useEffect(() => { layoutCanvases(); drawArch(); }, [h1, h2]);

  // Training/render loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      try {
        if (running) for (let i = 0; i < speed; i++) trainMinibatch(batch);
        draw();
        drawArch();
      } catch (err) {
        console.error("[MLGame tick error]", err);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, batch, lr, l2, speed, color0, color1]);

  // Init model when architecture changes
  useEffect(() => { initModel(h1, h2); }, [h1, h2]);

  // Regenerate data when data-shaping controls change
  useEffect(() => { regenerate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dataset, points, noise, complexity, spread, clusters, freq]);

  // =========================
  // INTERACTIONS
  // =========================
  function onCanvasClick(e, label) {
    if (!drawMode) return;
    const c = canvasRef.current; const r = c.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const nx = sx / c.width * 2 - 1, ny = sy / c.height * 2 - 1;
    userPoints.current.push({ x: [nx, ny], y: label });
    draw();
  }
  const onLeft = (e) => onCanvasClick(e, 1);
  const onRight = (e) => { e.preventDefault(); onCanvasClick(e, 0); };

  function handleRegenerate() { regenerate(); }
  function handleReset() { resetModel(); }
  function stepX(n = 120) { for (let i = 0; i < n; i++) trainMinibatch(batch); draw(); drawArch(); }

  // reinit immediately on slider for snappier sync
  function reinitModelImmediate(H1 = h1, H2 = h2) {
    initModel(H1, H2);
    setSteps(0);
  }

  // =========================
  // UI
  // =========================
  return (
    <section ref={pageRef} style={page}>
      {/* TOP ROW: left (training) + right (config) — equal heights */}
      <div style={topRow}>
        {/* Left: training controls + canvas */}
        <div ref={mainWrapRef} style={cardFill}>

          <div ref={toolbarRef} style={toolbar}>
            <button onClick={() => setRunning(v => !v)} style={chipBtn}>{running ? "Stop (continuous)" : "Start (continuous)"}</button>
            <span style={{ ...pill }}>{running ? "Running…" : "Idle"}</span>
            <button onClick={() => stepX(120)} style={chipBtn}>Step ×120</button>

            <div style={fieldRow}>
              <span style={miniLabel}>Epochs</span>
              <input type="number" min={1} max={999} value={epochs} onChange={e => setEpochs(parseInt(e.target.value || "1"))} style={num} />
              <button onClick={() => trainEpochs(epochs)} style={chipBtn}>Train N epochs</button>
            </div>

            <div style={fieldRow}>
              <span style={miniLabel}>Speed</span>
              <input type="range" min={1} max={30} step={1} value={speed} onChange={e => setSpeed(parseInt(e.target.value))} />
              <span style={pill}>{speed} mb/frame</span>
            </div>

            <button onClick={handleReset} style={chipBtn}>Reset Model</button>
            <button onClick={handleRegenerate} style={chipBtn}>Regenerate Data</button>
            <label style={{ ...fieldRow, gap: 6 }}>
              <span style={miniLabel}>Draw</span>
              <input type="checkbox" checked={drawMode} onChange={e => setDrawMode(e.target.checked)} />
            </label>
          </div>

          <div ref={trainCardRef} style={{ flex: 1, display: "flex" }}>
            <canvas
              ref={canvasRef}
              onClick={onLeft}
              onContextMenu={onRight}
              style={{ width: "100%", height: "auto", borderRadius: 14, border: "1px solid #ffffff22", display: "block" }}
            />
          </div>

          <ul style={helpList}>
            <li><b>H1/H2</b>: neurons in hidden layers 1/2. More units = more capacity.</li>
            <li><b>LR</b> = learning rate • <b>L2</b> = weight decay • <b>Batch</b> = samples/update • <b>Epoch</b> = full pass over data.</li>
            <li><b>Draw</b>: add labeled points (left-click = class 1, right-click = class 0).</li>
          </ul>
        </div>

        {/* Right: configuration (two columns) */}
        <div id="configCard" style={{ ...cardFill, overflow: "auto" }}>
          <h2 style={cardTitle}>Configuration</h2>

          <div style={configGrid}>
            {/* DATA (left col) */}
            <div style={panel}>
              <h3 style={panelTitle}>Data</h3>
              <div style={grid1col}>
                <label style={stackLabel}>
                  <span style={labelText}>Dataset</span>
                  <select value={dataset} onChange={e => setDataset(e.target.value)} style={select}>
                    <option value="Blobs">Blobs — multi-cluster</option>
                    <option value="Moons">Moons — crescents</option>
                    <option value="Circles">Circles — rings</option>
                    <option value="XOR">XOR — corners</option>
                    <option value="Spirals">Spirals — entwined</option>
                    <option value="K-Blobs">K-Blobs — set clusters</option>
                    <option value="Checker">Checker — tiled</option>
                    <option value="SineStripes">Sine Stripes — waves</option>
                    <option value="SwissRoll">Swiss Roll — arc</option>
                  </select>
                  <small style={sub}>{DATASET_HELP[dataset]}</small>
                </label>

                <label style={stackLabel}>
                  <span style={labelText}>Points</span>
                  <input type="range" min={80} max={800} step={20} value={points} onChange={e => setPoints(parseInt(e.target.value))} />
                  <span style={pill}>{points}</span>
                </label>

                <label style={stackLabel}>
                  <span style={labelText}>Noise</span>
                  <input type="range" min={0} max={0.4} step={0.01} value={noise} onChange={e => setNoise(parseFloat(e.target.value))} />
                  <span style={pill}>{noise.toFixed(2)}</span>
                </label>

                <label style={stackLabel}>
                  <span style={labelText}>Complexity</span>
                  <input type="range" min={0} max={1} step={0.02} value={complexity} onChange={e => setComplexity(parseFloat(e.target.value))} />
                  <small style={sub}>Adds swirl/sine warps and overlap</small>
                </label>

                <label style={stackLabel}>
                  <span style={labelText}>Spread</span>
                  <input type="range" min={0.6} max={1.2} step={0.02} value={spread} onChange={e => setSpread(parseFloat(e.target.value))} />
                  <small style={sub}>Zoom points out/in</small>
                </label>

                {dataset === "K-Blobs" && (
                  <label style={stackLabel}>
                    <span style={labelText}>Clusters</span>
                    <input type="range" min={2} max={8} step={1} value={clusters} onChange={e => setClusters(parseInt(e.target.value))} />
                    <span style={pill}>{clusters}</span>
                  </label>
                )}
                {(dataset === "Checker" || dataset === "SineStripes") && (
                  <label style={stackLabel}>
                    <span style={labelText}>Frequency</span>
                    <input type="range" min={2} max={12} step={1} value={freq} onChange={e => setFreq(parseInt(e.target.value))} />
                    <span style={pill}>{freq}</span>
                  </label>
                )}
              </div>
            </div>

            {/* MODEL (right col) */}
            <div style={panel}>
              <h3 style={panelTitle}>Model</h3>
              <div style={grid1col}>
                <label style={stackLabel}>
                  <span style={labelText}>H1 (hidden layer 1)</span>
                  <input
                    type="range"
                    min={4}
                    max={64}
                    step={2}
                    value={h1}
                    onChange={e => {
                      const n = parseInt(e.target.value, 10);
                      setH1(n);
                      reinitModelImmediate(n, h2);
                      layoutCanvases();
                    }}
                  />
                  <span style={pill}>{h1}</span>
                </label>
                <label style={stackLabel}>
                  <span style={labelText}>H2 (hidden layer 2)</span>
                  <input
                    type="range"
                    min={4}
                    max={64}
                    step={2}
                    value={h2}
                    onChange={e => {
                      const n = parseInt(e.target.value, 10);
                      setH2(n);
                      reinitModelImmediate(h1, n);
                      layoutCanvases();
                    }}
                  />
                  <span style={pill}>{h2}</span>
                </label>
                <label style={stackLabel}>
                  <span style={labelText}>Batch size</span>
                  <input
                    type="range"
                    min={16}
                    max={256}
                    step={16}
                    value={batch}
                    onChange={e => setBatch(parseInt(e.target.value))}
                  />
                  <span style={pill}>{batch}</span>
                </label>
                <label style={stackLabel}>
                  <span style={labelText}>LR (learning rate)</span>
                  <input
                    type="range"
                    min={0.005}
                    max={0.2}
                    step={0.005}
                    value={lr}
                    onChange={e => setLR(parseFloat(e.target.value))}
                  />
                  <span style={pill}>{lr.toFixed(3)}</span>
                </label>
                <label style={stackLabel}>
                  <span style={labelText}>L2 (weight decay)</span>
                  <input
                    type="range"
                    min={0}
                    max={0.01}
                    step={0.0005}
                    value={l2}
                    onChange={e => setL2(parseFloat(e.target.value))}
                  />
                  <span style={pill}>{l2.toFixed(4)}</span>
                </label>

                {/* Appearance (compact) */}
                <div style={{ display: "flex", gap: 18 }}>
                  <label style={{ ...stackLabel, flex: 1 }}>
                    <span style={labelText}>Class 1 color</span>
                    <input type="color" value={color1} onChange={e => setColor1(e.target.value)} />
                  </label>
                  <label style={{ ...stackLabel, flex: 1 }}>
                    <span style={labelText}>Class 0 color</span>
                    <input type="color" value={color0} onChange={e => setColor0(e.target.value)} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8, textAlign: "right", opacity: .9 }}>
            <span style={pill}>Train {(trainAcc * 100 | 0)}%</span>{" "}
            <span style={pill}>Val {(valAcc * 100 | 0)}%</span>{" "}
            <span style={pill}>Loss {lossVal.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM: Architecture viewer — auto expands in height */}
      <div ref={archWrapRef} style={{ ...card, marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={cardTitle}>Architecture Viewer</h2>
          {/* This reads model dims so it always matches what's drawn */}
          <span style={{ ...pill, background: "rgba(255,255,255,0.06)" }}>
            2 → {getModelDims().H1} → {getModelDims().H2} → 1
          </span>
        </div>
        <canvas
          ref={archCanvasRef}
          style={{ width: "100%", height: "auto", borderRadius: 14, border: "1px solid #ffffff22", display: "block" }}
        />
        <p style={{ opacity: .85, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
          Lines show weights: <span style={{ color: color1 }}>positive</span> push toward class 1;
          <span style={{ color: color0 }}> negative</span> toward class 0. Thickness/opacity ≈ |weight|.
          Thin bars beside hidden layers show biases.
        </p>
      </div>
    </section>
  );
}

// =========================
// STYLES + SMALL HELPERS
// =========================
const page = {
  maxWidth: 1600,
  margin: "0 auto",
  padding: "0 12px 24px",
  color: "inherit",
};

const topRow = {
  display: "grid",
  gridTemplateColumns: "minmax(620px, 1.4fr) minmax(520px, 1fr)",
  gap: 16,
  alignItems: "stretch",
};

const card = {
  padding: 14,
  border: "1px solid #ffffff22",
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
};

const cardFill = {
  ...card,
  display: "flex",
  flexDirection: "column",
  height: 680,            // synced with TOP_H
  minHeight: 680
};

const cardTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  opacity: .95
};

const toolbar = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
  marginBottom: 10
};

const chipBtn = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #ffffff30",
  background: "rgba(99,102,241,0.08)",
  color: "inherit",
  cursor: "pointer"
};

const pill = {
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid #ffffff22",
  background: "rgba(255,255,255,0.06)",
  fontSize: 12
};

const helpList = { opacity: .8, fontSize: 13, marginTop: 10, lineHeight: 1.6, paddingLeft: 18 };

const panel = {
  border: "1px solid #ffffff1a",
  borderRadius: 12,
  padding: 12,
  background: "rgba(255,255,255,0.04)"
};

const panelTitle = { margin: "0 0 8px 0", fontSize: 14, opacity: .95 };

const configGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  alignItems: "start",
  marginTop: 12
};

const grid1col = { display: "grid", gap: 10 };

const stackLabel = { display: "flex", flexDirection: "column", gap: 6 };

const labelText = { fontSize: 14, fontWeight: 600 };

const sub = { opacity: .8, fontSize: 12 };

const fieldRow = { display: "flex", alignItems: "center", gap: 8 };

const miniLabel = { fontSize: 12, opacity: .85 };

const num = {
  width: 64,
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  border: "1px solid #ffffff22",
  borderRadius: 8,
  padding: "6px 8px"
};

const select = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid #ffffff22",
  color: "inherit",
  padding: "6px 8px",
  borderRadius: 8
};

function hexToRGBA(hex, alpha = 1) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function lighten(hex, amt = 0.2) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  let r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function toHex(n) { const s = n.toString(16); return s.length === 1 ? "0" + s : s; }
