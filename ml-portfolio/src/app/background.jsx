// WorldsBackground.jsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Full-screen morphing particle worlds background.
 * Renders behind your page content (fixed, pointer-events: none).
 */
export default function WorldsBackground({ zIndex = 0 }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let renderer, scene, camera, raf, ro;

    const host = hostRef.current;
    if (!host) return;

    // ---------- renderer ----------
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    Object.assign(renderer.domElement.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      zIndex: String(zIndex),
      pointerEvents: "none",
    });
    host.appendChild(renderer.domElement);

    // ---------- scene & camera ----------
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xbad6ff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 8);
    scene.add(key);

    // ---------- PARTICLES ----------
    const COUNT = 6500;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    const targetA = new Float32Array(COUNT * 3);
    const targetB = new Float32Array(COUNT * 3);
    const targetC = new Float32Array(COUNT * 3);
    const targetD = new Float32Array(COUNT * 3);

    const colorsA = new Float32Array(COUNT * 3);
    const colorsB = new Float32Array(COUNT * 3);
    const colorsC = new Float32Array(COUNT * 3);
    const colorsD = new Float32Array(COUNT * 3);

    // palettes
    const colA = new THREE.Color("#cfe7ff");
    const colA2 = new THREE.Color("#9fb4cc");
    const colBplanet = new THREE.Color("#e8f6ff");
    const colBring = new THREE.Color("#9ad8ff");
    const colCnodeIn = new THREE.Color("#6aa7ff");
    const colCnodeOut = new THREE.Color("#6ee2a3");
    const colClink = new THREE.Color("#bfe6ff");
    const colD1 = new THREE.Color("#90b6ff");
    const colD2 = new THREE.Color("#f2fbff");

    // init tiny blob
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3;
      positions[j + 0] = (Math.random() - 0.5) * 0.001;
      positions[j + 1] = (Math.random() - 0.5) * 0.001;
      positions[j + 2] = (Math.random() - 0.5) * 0.001;
      colors[j + 0] = colA.r;
      colors[j + 1] = colA.g;
      colors[j + 2] = colA.b;
    }

    // ---------- BUILD TARGETS ----------
    // A: Cube edges
    (function buildA() {
      const edges = [
        [-1.2, -1.2, -1.2, 1.2, -1.2, -1.2],
        [-1.2,  1.2, -1.2, 1.2,  1.2, -1.2],
        [-1.2, -1.2,  1.2, 1.2, -1.2,  1.2],
        [-1.2,  1.2,  1.2, 1.2,  1.2,  1.2],
        [-1.2, -1.2, -1.2, -1.2, 1.2, -1.2],
        [ 1.2, -1.2, -1.2,  1.2, 1.2, -1.2],
        [-1.2, -1.2,  1.2, -1.2, 1.2,  1.2],
        [ 1.2, -1.2,  1.2,  1.2, 1.2,  1.2],
        [-1.2, -1.2, -1.2, -1.2, -1.2, 1.2],
        [ 1.2, -1.2, -1.2,  1.2, -1.2, 1.2],
        [-1.2,  1.2, -1.2, -1.2,  1.2, 1.2],
        [ 1.2,  1.2, -1.2,  1.2,  1.2, 1.2],
      ];
      for (let i = 0; i < COUNT; i++) {
        const e = edges[i % edges.length];
        const t = (i % 500) / 500;
        const j = i * 3;
        targetA[j + 0] = e[0] + (e[3] - e[0]) * t;
        targetA[j + 1] = e[1] + (e[4] - e[1]) * t;
        targetA[j + 2] = e[2] + (e[5] - e[2]) * t;
        const c = (i % 16 === 0) ? colA2 : colA;
        colorsA[j + 0] = c.r; colorsA[j + 1] = c.g; colorsA[j + 2] = c.b;
      }
    })();

    // B: Saturn (icosa core + annulus ring)
    (function buildB() {
      const ico = new THREE.IcosahedronGeometry(1.05, 0);
      const edgesGeo = new THREE.EdgesGeometry(ico, 1);
      const epos = edgesGeo.attributes.position.array;

      const NUM_CORE = Math.floor(COUNT * 0.50);
      const ptsPerEdge = Math.max(8, Math.floor(NUM_CORE / (epos.length / 6)));
      let filled = 0;

      for (let k = 0; k < epos.length && filled < NUM_CORE; k += 6) {
        const ax = epos[k + 0], ay = epos[k + 1], az = epos[k + 2];
        const bx = epos[k + 3], by = epos[k + 4], bz = epos[k + 5];
        for (let s = 0; s < ptsPerEdge && filled < NUM_CORE; s++) {
          const t = ptsPerEdge <= 1 ? 0 : s / (ptsPerEdge - 1);
          const j = filled * 3;
          targetB[j + 0] = ax + (bx - ax) * t;
          targetB[j + 1] = ay + (by - ay) * t;
          targetB[j + 2] = az + (bz - az) * t;
          colorsB[j + 0] = colBplanet.r; colorsB[j + 1] = colBplanet.g; colorsB[j + 2] = colBplanet.b;
          filled++;
        }
      }

      const remaining = COUNT - filled;
      const L = 10;
      const N = Math.max(180, Math.floor(remaining / L));
      const rInner = 1.55, rOuter = 2.05;
      let placed = 0;
      for (let li = 0; li < L; li++) {
        const fr = li / (L - 1);
        const rr = Math.sqrt(THREE.MathUtils.lerp(rInner * rInner, rOuter * rOuter, fr));
        for (let ai = 0; ai < N && filled + placed < COUNT; ai++) {
          const a = (ai / N) * Math.PI * 2.0;
          const j = (filled + placed) * 3;
          targetB[j + 0] = Math.cos(a) * rr;
          targetB[j + 1] = 0.0;
          targetB[j + 2] = Math.sin(a) * rr;
          colorsB[j + 0] = colBring.r; colorsB[j + 1] = colBring.g; colorsB[j + 2] = colBring.b;
          placed++;
        }
      }

      edgesGeo.dispose();
      ico.dispose();
    })();

    // C: Neural Network (3D; 3 z-stacks; wispy particle connectors; NO grid/lines)
    (function buildC() {
      const layerCounts = [4, 7, 8, 6, 3];
      const L = layerCounts.length;
      const xSpan = 5.8, xStart = -xSpan / 2, xStep = xSpan / (L - 1);
      const totalH = 2.6;
      const zSpan = 1.9;
      const zStacks = 3;
      const zOffsets = [];
      for (let zi = 0; zi < zStacks; zi++) {
        const t = zStacks === 1 ? 0.5 : zi / (zStacks - 1);
        zOffsets.push((t - 0.5) * zSpan);
      }

      const sphereR = 0.17;
      const shellJitter = 0.06;

      const centers = [];
      for (let zi = 0; zi < zStacks; zi++) {
        const zLayer = zOffsets[zi];
        for (let li = 0; li < L; li++) {
          const n = layerCounts[li];
          const x = xStart + li * xStep + (Math.random() - 0.5) * 0.06;
          for (let ni = 0; ni < n; ni++) {
            const tv = n === 1 ? 0.5 : ni / (n - 1);
            const y = (tv - 0.5) * totalH + (Math.random() - 0.5) * 0.16;
            const z = zLayer + (Math.random() - 0.5) * 0.18;
            centers.push({ x, y, z, li, zi });
          }
        }
      }

      const totalNodes = centers.length;
      const nodePortion = 0.72;
      const wispPortion = 0.18;
      let idx = 0;

      const samplesPerNode = Math.max(100, Math.floor((COUNT * nodePortion) / totalNodes));
      for (const c of centers) {
        for (let s = 0; s < samplesPerNode && idx < COUNT; s++) {
          const u = Math.random(), v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = sphereR + (Math.random() - 0.5) * shellJitter;

          const j = idx * 3;
          targetC[j + 0] = c.x + r * Math.sin(phi) * Math.cos(theta);
          targetC[j + 1] = c.y + r * Math.sin(phi) * Math.sin(theta);
          targetC[j + 2] = c.z + r * Math.cos(phi);

          const tint = c.li === 0 ? colCnodeIn : c.li === L - 1 ? colCnodeOut : colClink;
          colorsC[j + 0] = tint.r; colorsC[j + 1] = tint.g; colorsC[j + 2] = tint.b;
          idx++;
        }
      }

      const wispPts = Math.floor(COUNT * wispPortion);
      const zStacksCount = 3;
      const Lcount = L;
      const centersByZL = Array.from({ length: zStacksCount }, () =>
        Array.from({ length: Lcount }, () => [])
      );
      for (const c of centers) centersByZL[c.zi][c.li].push(c);

      let wp = 0;
      while (wp < wispPts && idx < COUNT) {
        const crossZ = Math.random() < 0.35 && zStacksCount > 1;
        if (!crossZ) {
          const zi = Math.floor(Math.random() * zStacksCount);
          const li = Math.floor(Math.random() * (Lcount - 1));
          const Aarr = centersByZL[zi][li];
          const Barr = centersByZL[zi][li + 1];
          if (Aarr.length === 0 || Barr.length === 0) continue;
          const A = Aarr[Math.floor(Math.random() * Aarr.length)];
          const B = Barr[Math.floor(Math.random() * Barr.length)];
          wp = addWisp(A, B, wp);
        } else {
          const li = Math.floor(Math.random() * Lcount);
          const zi = Math.floor(Math.random() * (zStacksCount - 1));
          const Aarr = centersByZL[zi][li];
          const Barr = centersByZL[zi + 1][li];
          if (Aarr.length === 0 || Barr.length === 0) continue;
          const A = Aarr[Math.floor(Math.random() * Aarr.length)];
          const B = Barr[Math.floor(Math.random() * Barr.length)];
          wp = addWisp(A, B, wp);
        }
      }

      while (idx < COUNT) {
        const c = centers[Math.floor(Math.random() * centers.length)];
        const j = idx * 3;
        targetC[j + 0] = c.x + (Math.random() - 0.5) * 0.3;
        targetC[j + 1] = c.y + (Math.random() - 0.5) * 0.3;
        targetC[j + 2] = c.z + (Math.random() - 0.5) * 0.3;
        const tint = c.li === 0 ? colCnodeIn : c.li === L - 1 ? colCnodeOut : colClink;
        colorsC[j + 0] = tint.r; colorsC[j + 1] = tint.g; colorsC[j + 2] = tint.b;
        idx++;
      }

      function addWisp(A, B, wpCount) {
        const seg = 8;
        const mid = {
          x: (A.x + B.x) / 2 + (Math.random() - 0.5) * 0.6,
          y: (A.y + B.y) / 2 + (Math.random() - 0.5) * 0.6,
          z: (A.z + B.z) / 2 + (Math.random() - 0.5) * 0.6,
        };
        for (let s = 0; s < seg && wpCount < wispPts && idx < COUNT; s++) {
          const t = s / (seg - 1);
          const inv = 1 - t;
          const x = inv * inv * A.x + 2 * inv * t * mid.x + t * t * B.x + (Math.random() - 0.5) * 0.03;
          const y = inv * inv * A.y + 2 * inv * t * mid.y + t * t * B.y + (Math.random() - 0.5) * 0.03;
          const z = inv * inv * A.z + 2 * inv * t * mid.z + t * t * B.z + (Math.random() - 0.5) * 0.03;

          const j = idx * 3;
          targetC[j + 0] = x;
          targetC[j + 1] = y;
          targetC[j + 2] = z;
          colorsC[j + 0] = colClink.r; colorsC[j + 1] = colClink.g; colorsC[j + 2] = colClink.b;
          idx++;
          wpCount++;
        }
        return wpCount;
      }
    })();

    // D: Decision Boundary (no internal plane/grid)
    (function buildD() {
      const center = 1.2, sigma = 0.45, gap = 0.45;
      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;
        const cls = i % 2;
        let x; do { x = (cls ? center : -center) + randn() * sigma; } while (Math.abs(x) < gap);
        const y = randn() * sigma, z = randn() * sigma;
        targetD[j + 0] = x; targetD[j + 1] = y; targetD[j + 2] = z;
        const c = cls ? colD2 : colD1;
        colorsD[j + 0] = c.r; colorsD[j + 1] = c.g; colorsD[j + 2] = c.b;
      }
    })();

    // ---------- shared point cloud ----------
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.052, transparent: true, opacity: 0.96, vertexColors: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // ---------- RAYS OVERLAY ----------
    const RAY_COUNT = 1800;
    const linesGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(RAY_COUNT * 2 * 3);
    linesGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9fb4cc, transparent: true, opacity: 0.12 });
    const lines = new THREE.LineSegments(linesGeo, lineMat);
    scene.add(lines);

    // Pre-sampled endpoints on ALL six cube faces
    const rayCube = new Float32Array(RAY_COUNT * 3);
    (function buildCubeRays() {
      const size = 1.2;
      const perFace = Math.floor(RAY_COUNT / 6);
      let idx = 0;

      function push(x, y, z) {
        const j = idx * 3;
        rayCube[j] = x; rayCube[j + 1] = y; rayCube[j + 2] = z;
        idx++;
      }
      function randIn() { return (Math.random() * 2 - 1) * size; }

      for (let i = 0; i < perFace; i++) push( size, randIn(), randIn());
      for (let i = 0; i < perFace; i++) push(-size, randIn(), randIn());
      for (let i = 0; i < perFace; i++) push(randIn(),  size, randIn());
      for (let i = 0; i < perFace; i++) push(randIn(), -size, randIn());
      for (let i = 0; i < perFace; i++) push(randIn(), randIn(),  size);
      for (let i = 0; i < perFace; i++) push(randIn(), randIn(), -size);

      while (idx < RAY_COUNT) {
        const f = Math.floor(Math.random() * 6);
        const u = randIn(), v = randIn();
        if (f === 0) push( size, u, v);
        else if (f === 1) push(-size, u, v);
        else if (f === 2) push(u,  size, v);
        else if (f === 3) push(u, -size, v);
        else if (f === 4) push(u, v,  size);
        else push(u, v, -size);
      }
    })();

    // ---------- sparks ----------
    const SPARK_COUNT = 160;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(SPARK_COUNT * 3);
    for (let i = 0; i < SPARK_COUNT; i++) {
      const j = i * 3;
      sparkPos[j + 0] = (Math.random() - 0.5) * 0.2;
      sparkPos[j + 1] = (Math.random() - 0.5) * 0.2;
      sparkPos[j + 2] = (Math.random() - 0.5) * 0.2;
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.085, color: 0x9fd8ff, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // ---------- DPR / sizing ----------
    let DPR = Math.min(2, window.devicePixelRatio || 1);
    const resizeBuffers = () => {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor((host.clientWidth || window.innerWidth) * DPR);
      const h = Math.floor((host.clientHeight || window.innerHeight) * DPR);
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(1);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = (host.clientWidth || window.innerWidth) / (host.clientHeight || window.innerHeight);
      camera.updateProjectionMatrix();
    };
    resizeBuffers();
    ro = new ResizeObserver(resizeBuffers);
    ro.observe(renderer.domElement);
    window.addEventListener("resize", resizeBuffers);

    // ---------- SCROLL 0..3 ----------
    const SCENES = 4;
    let scrollVal = 0;
    const onScroll = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      scrollVal = (window.scrollY / max) * (SCENES - 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // ---------- MOUSE ----------
    const mouse = { x: 0, y: 0 };
    const onMouse = (e) => {
      const w = window.innerWidth || 1, h = window.innerHeight || 1;
      mouse.x = (e.clientX / w) * 2 - 1;
      mouse.y = (e.clientY / h) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouse);

    // ---------- transforms ----------
    const MOUSE_YAW = 0.40, MOUSE_PITCH = 0.35;

    function worldQuat(worldIndex, t, mx, my) {
      const yawSelf = t * 0.25;                  // subtle auto-spin
      const yaw = mx * MOUSE_YAW + yawSelf;
      const pitch = my * MOUSE_PITCH;
      const euler = new THREE.Euler();

      if (worldIndex === 0) {
        euler.set(pitch + 0.06 * Math.sin(t * 0.8), yaw, 0.04 * Math.cos(t * 0.6));
      } else if (worldIndex === 1) {
        euler.set(my * 0.18 + 0.04 * Math.sin(t * 0.5), yaw, 0.55 + 0.08 * Math.sin(t * 0.7));
      } else if (worldIndex === 2) {
        euler.set(0, yaw, 0.03 * Math.sin(t * 0.6));
      } else {
        euler.set(my * 0.22 + 0.04 * Math.sin(t * 0.9), yaw, 0.06 * Math.cos(t * 0.35));
      }
      const q = new THREE.Quaternion();
      q.setFromEuler(euler);
      return q;
    }

    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const clock = new THREE.Clock();

    const loop = () => {
      const t = clock.getElapsedTime();

      const i0 = Math.floor(scrollVal);
      const i1 = Math.min(i0 + 1, SCENES - 1);
      const k = easeInOut(fract(scrollVal));

      const TA = [targetA, targetB, targetC, targetD][i0];
      const TB = [targetA, targetB, targetC, targetD][i1];
      const CA = [colorsA, colorsB, colorsC, colorsD][i0];
      const CB = [colorsA, colorsB, colorsC, colorsD][i1];

      const qA = worldQuat(i0, t, mouse.x, mouse.y);
      const qB = worldQuat(i1, t, mouse.x, mouse.y);

      const breatheA = 1 + 0.02 * Math.sin(t * 0.8 + i0);
      const breatheB = 1 + 0.02 * Math.sin(t * 0.8 + i1);

      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;

        tmpA.set(TA[j + 0], TA[j + 1], TA[j + 2]).applyQuaternion(qA).multiplyScalar(breatheA);
        tmpB.set(TB[j + 0], TB[j + 1], TB[j + 2]).applyQuaternion(qB).multiplyScalar(breatheB);

        const tx = THREE.MathUtils.lerp(tmpA.x, tmpB.x, k);
        const ty = THREE.MathUtils.lerp(tmpA.y, tmpB.y, k);
        const tz = THREE.MathUtils.lerp(tmpA.z, tmpB.z, k);

        const wob = 0.018 * Math.sin(t * 1.3 + i * 0.013);

        positions[j + 0] += (tx + wob - positions[j + 0]) * 0.12;
        positions[j + 1] += (ty - positions[j + 1]) * 0.12;
        positions[j + 2] += (tz - positions[j + 2]) * 0.12;

        colors[j + 0] += (THREE.MathUtils.lerp(CA[j + 0], CB[j + 0], k) - colors[j + 0]) * 0.2;
        colors[j + 1] += (THREE.MathUtils.lerp(CA[j + 1], CB[j + 1], k) - colors[j + 1]) * 0.2;
        colors[j + 2] += (THREE.MathUtils.lerp(CA[j + 2], CB[j + 2], k) - colors[j + 2]) * 0.2;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      // --------- build rays for this frame ----------
      const qb = new THREE.Quaternion().slerpQuaternions(qA, qB, k);
      const scale = THREE.MathUtils.lerp(breatheA, breatheB, k);

      let pair = 0;
      if (i0 === 0 || i1 === 0) {
        // World A active → rays to cube faces (all faces covered)
        for (let s = 0; s < RAY_COUNT; s++) {
          const rj = s * 3;
          tmpA.set(rayCube[rj], rayCube[rj + 1], rayCube[rj + 2]).applyQuaternion(qb).multiplyScalar(scale);
          const b = pair * 6;
          linePositions[b + 0] = 0; linePositions[b + 1] = 0; linePositions[b + 2] = 0;
          linePositions[b + 3] = tmpA.x; linePositions[b + 4] = tmpA.y; linePositions[b + 5] = tmpA.z;
          pair++;
        }
      } else {
        // Other worlds → rays to sampled live particles
        for (let s = 0; s < RAY_COUNT; s++) {
          const ti = ((s * 97) % COUNT) * 3;
          const b = pair * 6;
          linePositions[b + 0] = 0; linePositions[b + 1] = 0; linePositions[b + 2] = 0;
          linePositions[b + 3] = positions[ti + 0];
          linePositions[b + 4] = positions[ti + 1];
          linePositions[b + 5] = positions[ti + 2];
          pair++;
        }
      }
      linesGeo.attributes.position.needsUpdate = true;

      // pulse sizes
      const baseSize = 0.052;
      mat.size = baseSize * (1 + 0.18 * Math.sin(t * 0.6));
      sparkMat.size = 0.085 * (1 + 0.25 * Math.sin(t * 0.9));

      // sparks follow current world
      const SPARK_N = sparkPos.length / 3;
      for (let s = 0; s < SPARK_N; s++) {
        const sj = s * 3;
        const ti = ((s * 53) % COUNT) * 3;
        tmpA.set(TA[ti + 0], TA[ti + 1], TA[ti + 2]).applyQuaternion(qA);
        tmpB.set(TB[ti + 0], TB[ti + 1], TB[ti + 2]).applyQuaternion(qB);
        const sx = THREE.MathUtils.lerp(tmpA.x, tmpB.x, k);
        const sy = THREE.MathUtils.lerp(tmpA.y, tmpB.y, k);
        const sz = THREE.MathUtils.lerp(tmpA.z, tmpB.z, k);
        sparkPos[sj + 0] += (sx - sparkPos[sj + 0]) * (0.1 + 0.05 * Math.sin(t * 0.7 + s));
        sparkPos[sj + 1] += (sy - sparkPos[sj + 1]) * (0.1 + 0.05 * Math.cos(t * 0.6 + s));
        sparkPos[sj + 2] += (sz - sparkPos[sj + 2]) * 0.1;
      }
      sparkGeo.attributes.position.needsUpdate = true;

      // centered parallax
      camera.position.x += (mouse.x * 0.9 - camera.position.x) * 0.08;
      camera.position.y += (mouse.y * 0.7 - camera.position.y) * 0.08;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // ---------- cleanup ----------
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeBuffers);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      ro?.disconnect?.();
      try {
        renderer?.dispose?.();
        renderer?.domElement?.parentNode?.removeChild(renderer.domElement);
        [geo, linesGeo, sparkGeo].forEach((g) => g?.dispose?.());
        [mat, lineMat, sparkMat].forEach((m) => m?.dispose?.());
      } catch {}
    };
  }, [zIndex]);

  return <div ref={hostRef} aria-hidden style={{ position: "fixed", inset: 0, zIndex }} />;
}

/* =============================== UTILS =============================== */
function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
function fract(x) { return x - Math.floor(x); }
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
