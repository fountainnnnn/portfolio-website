// app/page.jsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], weight: ["300", "400", "700", "800"] });

export default function Page() {
  return (
    <main
      className={manrope.className}
      style={{
        // minHeight: "100svh",
        margin: 0,
        padding: "10px 50px",             // more margin at the sides
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        alignItems: "center",
        maxWidth: 1400,
        marginInline: "auto",
      }}
    >
      {/* LEFT — text */}
      <section>
        <p style={{ margin: 0, color: "#cfe2ff", fontWeight: 600, letterSpacing: 0.6, fontSize: 20 }}>
          Hi, I’m Mervin!
        </p>
        <h1
          style={{
            margin: "12px 0 14px",
            fontSize: 68,
            lineHeight: 1.05,
            letterSpacing: -0.8,
            color: "#f0f4ff",
            fontWeight: 800,
          }}
        >
          <span style={{ fontWeight: 300 }}>AI</span>{" "}
          <span style={{ color: "#b79cff" }}>Enthusiast</span>
        </h1>
        <p
          style={{
            margin: "0 0 28px",
            fontSize: 18,
            lineHeight: 1.8,
            color: "#dfe7ff",
            maxWidth: 640,
          }}
        >
          I explore different areas in AI such as Deep Learning & Machine Learning, and learn to
          create products using AI tools.
        </p>

        <div style={{ display: "flex", gap: 14 }}>
          <a
            href="/projects"
            style={{
              padding: "14px 20px",
              background: "#b79cff",
              color: "#11152a",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Projects
          </a>
          <a
            href="#hire"
            style={{
              padding: "14px 20px",
              border: "2px solid #b79cff",
              color: "#eef1ff",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 16,
              backdropFilter: "blur(4px)",
            }}
          >
            Hire Me
          </a>
        </div>
      </section>

      {/* RIGHT — world */}
      <section
        style={{
          position: "relative",
          width: "110%",              // still slightly wider than text col
          height: "72vh",             // taller world
          maxHeight: 720,             // cap so it doesn’t overflow huge screens
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DecisionBoundaryWorld />
      </section>
    </main>
  );
}



/** 4th World only (Decision Boundary) — inline, not imported.
 *  Reuses your particle/rays/sparks style but WITHOUT scroll scenes.
 *  It renders immediately in the right column.
 */
function DecisionBoundaryWorld() {
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
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
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

    // ---------- PARTICLES (only World D target) ----------
    const COUNT = 6500;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    const targetD = new Float32Array(COUNT * 3);
    const colorsD = new Float32Array(COUNT * 3);
    const colD1 = new THREE.Color("#90b6ff");
    const colD2 = new THREE.Color("#f2fbff");

    // init tiny blob
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3;
      positions[j + 0] = (Math.random() - 0.5) * 0.001;
      positions[j + 1] = (Math.random() - 0.5) * 0.001;
      positions[j + 2] = (Math.random() - 0.5) * 0.001;
      colors[j + 0] = colD1.r;
      colors[j + 1] = colD1.g;
      colors[j + 2] = colD1.b;
    }

    // Build World D
    (function buildD() {
      const center = 1.2, sigma = 0.45, gap = 0.45;
      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;
        const cls = i % 2;
        let x;
        do {
          x = (cls ? center : -center) + randn() * sigma;
        } while (Math.abs(x) < gap);
        const y = randn() * sigma,
          z = randn() * sigma;
        targetD[j + 0] = x;
        targetD[j + 1] = y;
        targetD[j + 2] = z;

        const c = cls ? colD2 : colD1;
        colorsD[j + 0] = c.r;
        colorsD[j + 1] = c.g;
        colorsD[j + 2] = c.b;
      }
    })();

    // shared point cloud
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.052,
      transparent: true,
      opacity: 0.96,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // Rays overlay to live particles (like your BG)
    const RAY_COUNT = 1200;
    const linesGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(RAY_COUNT * 2 * 3);
    linesGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x9fb4cc,
      transparent: true,
      opacity: 0.12,
    });
    const lines = new THREE.LineSegments(linesGeo, lineMat);
    scene.add(lines);

    // Sparks
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
      size: 0.085,
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // DPR / sizing
    let DPR = Math.min(2, window.devicePixelRatio || 1);
    const resizeBuffers = () => {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor(host.clientWidth * DPR);
      const h = Math.floor(host.clientHeight * DPR);
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(1);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
    };
    resizeBuffers();
    ro = new ResizeObserver(resizeBuffers);
    ro.observe(host);
    window.addEventListener("resize", resizeBuffers);

    // Mouse
    const mouse = { x: 0, y: 0 };
    const onMouse = (e) => {
      const r = host.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    host.addEventListener("pointermove", onMouse);

    // Anim
    const tmp = new THREE.Vector3();
    const clock = new THREE.Clock();
    const loop = () => {
      const t = clock.getElapsedTime();

      // Slight rotation from mouse
      const yaw = mouse.x * 0.4 + t * 0.25;
      const pitch = mouse.y * 0.35 + 0.06 * Math.sin(t * 0.9);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0.06 * Math.cos(t * 0.35)));
      const breathe = 1 + 0.02 * Math.sin(t * 0.8);

      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;

        tmp.set(targetD[j], targetD[j + 1], targetD[j + 2]).applyQuaternion(q).multiplyScalar(breathe);

        const wob = 0.018 * Math.sin(t * 1.3 + i * 0.013);
        positions[j + 0] += (tmp.x + wob - positions[j + 0]) * 0.12;
        positions[j + 1] += (tmp.y - positions[j + 1]) * 0.12;
        positions[j + 2] += (tmp.z - positions[j + 2]) * 0.12;

        // lock colors to D
        colors[j + 0] += (colorsD[j + 0] - colors[j + 0]) * 0.2;
        colors[j + 1] += (colorsD[j + 1] - colors[j + 1]) * 0.2;
        colors[j + 2] += (colorsD[j + 2] - colors[j + 2]) * 0.2;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      // rays to sampled live particles
      for (let s = 0; s < RAY_COUNT; s++) {
        const ti = ((s * 97) % COUNT) * 3;
        const b = s * 6;
        linePositions[b + 0] = 0;
        linePositions[b + 1] = 0;
        linePositions[b + 2] = 0;
        linePositions[b + 3] = positions[ti + 0];
        linePositions[b + 4] = positions[ti + 1];
        linePositions[b + 5] = positions[ti + 2];
      }
      linesGeo.attributes.position.needsUpdate = true;

      // pulse sizes
      mat.size = 0.052 * (1 + 0.18 * Math.sin(t * 0.6));
      sparkMat.size = 0.085 * (1 + 0.25 * Math.sin(t * 0.9));

      // sparks drift toward live points
      const SPARK_N = sparkPos.length / 3;
      for (let s = 0; s < SPARK_N; s++) {
        const sj = s * 3;
        const ti = ((s * 53) % COUNT) * 3;
        tmp.set(positions[ti + 0], positions[ti + 1], positions[ti + 2]);
        sparkPos[sj + 0] += (tmp.x - sparkPos[sj + 0]) * (0.1 + 0.05 * Math.sin(t * 0.7 + s));
        sparkPos[sj + 1] += (tmp.y - sparkPos[sj + 1]) * (0.1 + 0.05 * Math.cos(t * 0.6 + s));
        sparkPos[sj + 2] += (tmp.z - sparkPos[sj + 2]) * 0.1;
      }
      sparkGeo.attributes.position.needsUpdate = true;

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeBuffers);
      ro?.disconnect?.();
      host.removeEventListener("pointermove", onMouse);
      try {
        renderer?.dispose?.();
        renderer?.domElement?.parentNode?.removeChild(renderer.domElement);
        [geo, linesGeo, sparkGeo].forEach((g) => g?.dispose?.());
        [mat, lineMat, sparkMat].forEach((m) => m?.dispose?.());
      } catch {}
    };
  }, []);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}

/* =============================== UTILS =============================== */
function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
