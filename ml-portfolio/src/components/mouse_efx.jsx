"use client";

import { useEffect, useRef } from "react";

export default function MouseTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    let w = (c.width = window.innerWidth);
    let h = (c.height = window.innerHeight);

    document.documentElement.style.cursor = "none";

    const onResize = () => {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const mouse = { x: w / 2, y: h / 2 };
    let hover = false;
    let prevHover = false;
    let pressing = false;
    const pulses = [];
    const follow = { x: mouse.x, y: mouse.y };

    const isHoverEl = (el) => !!el?.closest?.("a,button,[role='button'],.btn");
    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      hover = isHoverEl(e.target);
    };
    const onDown = () => {
      pressing = true;
      pulses.push({
        x: follow.x,
        y: follow.y,
        r: 0,
        alpha: 0.55,
        color: "rgba(255,255,255,1)", // bright white for click pulse
        width: 2.5,
        grow: 7,
      });
    };
    const onUp = () => (pressing = false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const drawDiamond = (x, y, size, stroke, fill, lineWidth = 2) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(-size / 2, -size / 2, size, size);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    };

    let raf;
    const loop = () => {
      ctx.clearRect(0, 0, w, h);

      follow.x += (mouse.x - follow.x) * 0.25;
      follow.y += (mouse.y - follow.y) * 0.25;

      // pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.r += p.grow;
        p.alpha *= 0.9;
        if (p.alpha < 0.02) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = p.color.replace(/,([^,]+)\)$/, `,${p.alpha})`);
        ctx.lineWidth = p.width;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // cursor visuals
      const size = hover ? 20 : 12;
      const strokeColor = hover
        ? "rgba(255,255,255,0.95)" // bright white stroke on hover
        : "rgba(150,200,255,0.9)";
      const fillColor = hover
        ? "rgba(183,156,255,0.25)" // soft purple fill
        : null;

      // Accent ring (hover only, semi-white)
      if (hover) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(follow.x, follow.y, size * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Glow (blue-purple mix on hover)
      const glow = ctx.createRadialGradient(
        follow.x,
        follow.y,
        0,
        follow.x,
        follow.y,
        hover ? size * 3.2 : size * 2.2
      );
      glow.addColorStop(0, hover ? "rgba(183,156,255,0.25)" : "rgba(120,190,255,0.2)");
      glow.addColorStop(0.7, hover ? "rgba(120,190,255,0.15)" : "rgba(120,190,255,0.1)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(follow.x, follow.y, hover ? size * 3.2 : size * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Diamond itself
      drawDiamond(
        follow.x,
        follow.y,
        pressing ? size - 3 : size,
        strokeColor,
        fillColor,
        hover ? 2.5 : 1.8
      );

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.style.cursor = "";
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  );
}
