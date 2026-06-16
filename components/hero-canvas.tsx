"use client";

import { useEffect, useRef } from "react";

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Guard against React StrictMode's mount→unmount→mount: the dynamic
    // import resolves asynchronously, so without this flag a torn-down effect
    // would still create a second WebGL context on the same canvas.
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const supportsWebGL = () => {
      try {
        const testCanvas = document.createElement("canvas");
        return Boolean(
          testCanvas.getContext("webgl2") ||
            testCanvas.getContext("webgl") ||
            testCanvas.getContext("experimental-webgl")
        );
      } catch {
        return false;
      }
    };

    if (!supportsWebGL()) {
      return () => {
        cancelled = true;
      };
    }

    void import("three")
      .then((THREE) => {
        if (cancelled || !canvasRef.current) return;

        const hero = document.getElementById("hero-section");
        const W = () => hero?.clientWidth || window.innerWidth;
        const H = () => hero?.clientHeight || window.innerHeight;

        // Lighter field on touch/coarse-pointer devices (lower frame budget).
        const isTouch = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        try {
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.25 : 1.6));
          renderer.setSize(W(), H());
          renderer.setClearColor(0x000000, 0);

          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 140);
          camera.position.set(0, 0, 14);
          camera.lookAt(0, 0, 0);

        // Volumetric particle cloud
        const COUNT = isTouch ? 7000 : 22000;
        const SX = 24, SY = 15, ZN = -32, ZF = 7;
        const pos = new Float32Array(COUNT * 3);
        const rnd = new Float32Array(COUNT);
        for (let i = 0; i < COUNT; i++) {
          pos[i * 3]     = (Math.random() - 0.5) * 2 * SX;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 2 * SY;
          pos[i * 3 + 2] = ZN + Math.random() * (ZF - ZN);
          rnd[i]         = Math.random();
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));

        // Sample the "MARCO D'ANTONIO" wordmark into target positions so the
        // particles can briefly assemble into the name on first load.
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const targets = new Float32Array(COUNT * 2);
        let hasTargets = false;
        if (!reduced) {
          const tc = document.createElement("canvas");
          const CW = 1280, CH = 380;
          tc.width = CW;
          tc.height = CH;
          const tctx = tc.getContext("2d");
          if (tctx) {
            tctx.fillStyle = "#fff";
            tctx.textAlign = "center";
            tctx.textBaseline = "middle";
            tctx.font = "800 108px Syne, system-ui, sans-serif";
            tctx.fillText("MARCO", CW / 2, CH * 0.32);
            tctx.fillText("D'ANTONIO", CW / 2, CH * 0.70);
            const px = tctx.getImageData(0, 0, CW, CH).data;
            const pts: Array<[number, number]> = [];
            for (let y = 0; y < CH; y += 2) {
              for (let x = 0; x < CW; x += 2) {
                if (px[(y * CW + x) * 4 + 3] > 128) pts.push([x, y]);
              }
            }
            if (pts.length > 0) {
              hasTargets = true;
              const scale = 15 / CW;
              for (let i = 0; i < COUNT; i++) {
                const [x, y] = pts[i % pts.length];
                targets[i * 2]     = (x - CW / 2) * scale + (Math.random() - 0.5) * 0.06;
                targets[i * 2 + 1] = -(y - CH / 2) * scale + (Math.random() - 0.5) * 0.06;
              }
            }
          }
        }
        geo.setAttribute("aTarget", new THREE.BufferAttribute(targets, 2));

        const uniforms = {
          u_time:  { value: 0 },
          u_speed: { value: 1.0 },
          u_warp:  { value: 1.2 },
          u_form:  { value: 0.0 },
          u_light: { value: 0.0 },
          u_pr:    { value: renderer.getPixelRatio() },
          u_mouse: { value: new THREE.Vector2(999, 999) },
          u_mAmt:  { value: 0.0 },
          u_repulse: { value: 0.0 },
          u_click: { value: new THREE.Vector3(0, 0, 0) },
          u_c1:    { value: new THREE.Color(0x7C6BFF) },
          u_c2:    { value: new THREE.Color(0x58A6FF) },
          u_c3:    { value: new THREE.Color(0x00D4AA) },
        };

        const vs = /* glsl */ `
          precision highp float;
          uniform float u_time, u_speed, u_warp, u_light, u_pr, u_mAmt, u_repulse, u_form;
          uniform vec2 u_mouse;
          uniform vec3 u_click;
          attribute float aRand;
          attribute vec2 aTarget;
          varying float vDepth, vGlow, vR, vCenter;
          void main() {
            vec3 p = position;
            float t = u_time * u_speed;
            float a = u_warp;
            p.x += sin(t * 0.30 + p.y * 0.35 + aRand * 6.2831) * 0.9 * a;
            p.y += cos(t * 0.24 + p.x * 0.28 + aRand * 6.2831) * 0.9 * a;
            p.z += sin(t * 0.20 + p.x * 0.2  + aRand * 6.2831) * 0.7;
            // Assemble into the wordmark during the intro flourish.
            p = mix(p, vec3(aTarget, 0.0), u_form);
            vec2 dm = p.xy - u_mouse;
            float md = length(dm);
            float push = exp(-md * md * 0.018) * u_mAmt * u_repulse;
            p.xy += normalize(dm + 1e-4) * push * 4.5;
            vec2 dc = p.xy - u_click.xy;
            float cd = length(dc);
            p.xy += normalize(dc + 1e-4) * exp(-cd * cd * 0.010) * u_click.z * 7.0;
            vGlow = push + sin(t * 1.4 + aRand * 30.0) * 0.35 + 0.45;
            vR = aRand;
            vCenter = smoothstep(2.0, 11.0, length(p.xy));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float dist = -mv.z;
            vDepth = clamp((dist - 6.0) / 36.0, 0.0, 1.0);
            gl_PointSize = (u_pr * 230.0 / dist) * (0.4 + 0.8 * aRand);
            gl_Position = projectionMatrix * mv;
          }
        `;

        const fs = /* glsl */ `
          precision highp float;
          uniform vec3 u_c1, u_c2, u_c3;
          uniform float u_light;
          varying float vDepth, vGlow, vR, vCenter;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            float soft = smoothstep(0.5, 0.0, d);
            vec3 col = mix(u_c1, u_c2, vDepth);
            col = mix(col, u_c3, vR * 0.45);
            col += u_c2 * clamp(vGlow, 0.0, 1.0) * 0.45;
            vec3 lightCol = col * 0.40;
            col = mix(col, lightCol, u_light);
            float fade = mix(1.0, 0.12, vDepth);
            float a = soft * fade * mix(0.45 + 0.45 * vR, 0.85, u_light) * (0.32 + 0.68 * vCenter);
            gl_FragColor = vec4(col, a);
          }
        `;

        const mat = new THREE.ShaderMaterial({
          uniforms,
          vertexShader: vs,
          fragmentShader: fs,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const points = new THREE.Points(geo, mat);
        scene.add(points);

        // Particle field follows the site theme: additive glow in dark,
        // softer normal blend (and dimmer palette via u_light) in light.
        const applyTheme = () => {
          const isLight = !document.documentElement.classList.contains("dark");
          uniforms.u_light.value = isLight ? 1.0 : 0.0;
          mat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
          mat.needsUpdate = true;
        };
        applyTheme();
        const themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });

        // Mouse interaction via hero section
        const raycaster = new THREE.Raycaster();
        const ground = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const hit = new THREE.Vector3();
        const ndc = new THREE.Vector2();
        let camTX = 0, camTY = 0, mouseInHero = false;
        let currentPhase: "idle" | "assemble" | "hold" | "disperse" | "complete" = "idle";
        let repulsionRamp = 0;
        const hasFormedOnce = () => sessionStorage.getItem("heroFormed") === "1";

        const emitPhase = (phase: typeof currentPhase) => {
          if (currentPhase === phase) return;
          currentPhase = phase;
          window.dispatchEvent(new CustomEvent("hero:phase", { detail: { phase } }));
        };

        const planePoint = (cx: number, cy: number) => {
          const rect = canvas.getBoundingClientRect();
          ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -(((cy - rect.top) / rect.height) * 2 - 1));
          raycaster.setFromCamera(ndc, camera);
          return raycaster.ray.intersectPlane(ground, hit) ? hit : null;
        };

        const onMouseMove = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          mouseInHero = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
          if (mouseInHero) {
            camTX = (((e.clientX - rect.left) / rect.width) * 2 - 1) * 1.6;
            camTY = -(((e.clientY - rect.top) / rect.height) * 2 - 1) * 1.0;
            const p = planePoint(e.clientX, e.clientY);
            if (p) uniforms.u_mouse.value.set(p.x, p.y);
          }
        };
        window.addEventListener("mousemove", onMouseMove, { passive: true });

        const onHeroClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-chat-widget]")) return;
          const p = planePoint(e.clientX, e.clientY);
          if (p) uniforms.u_click.value.set(p.x, p.y, 1.0);
        };
        hero?.addEventListener("click", onHeroClick);

        // Resize
        let resizeTo: ReturnType<typeof setTimeout>;
        const onResize = () => {
          clearTimeout(resizeTo);
          resizeTo = setTimeout(() => {
            camera.aspect = W() / H();
            camera.updateProjectionMatrix();
            renderer.setSize(W(), H(), false);
            uniforms.u_pr.value = renderer.getPixelRatio();
          }, 80);
        };
        window.addEventListener("resize", onResize);

        // Animation loop — THREE.Timer (replaces deprecated THREE.Clock)
        const timer = new THREE.Timer();

        // Intro formation flourish — particles assemble into the name once, then
        // relax back into the ambient field. First visit only (cached per session).
        let formStart: number | null = null;
        let formTimer: ReturnType<typeof setTimeout> | undefined;
        const beginFormation = () => {
          if (reduced || !hasTargets || sessionStorage.getItem("heroFormed")) return;
          emitPhase("assemble");
          formStart = timer.getElapsed();
        };
        if (!reduced && hasTargets && !sessionStorage.getItem("heroFormed")) {
          if (sessionStorage.getItem("booted")) {
            formTimer = setTimeout(beginFormation, 350);
          } else {
            document.addEventListener("bootend", beginFormation, { once: true });
          }
        }

        // Chat-driven shockwave (signature moment): the chat pulses the field.
        const onPulse = () => uniforms.u_click.value.set(0, 0, 1.3);
        window.addEventListener("hero:pulse", onPulse);

        let animId: number;
        const tick = () => {
          animId = requestAnimationFrame(tick);
          timer.update(); // THREE.Timer requires explicit update each frame
          uniforms.u_time.value = timer.getElapsed();
          uniforms.u_click.value.z *= 0.95;
          if (formStart !== null) {
            const e = timer.getElapsed() - formStart;
            let f = 0;
            if (e < 1.42) {
              emitPhase("assemble");
              f = e / 1.42; // assemble
              repulsionRamp = 0;
            } else if (e < 2.95) {
              emitPhase("hold");
              f = 1; // hold (name is legible)
              repulsionRamp = 0;
            } else if (e < 4.35) {
              emitPhase("disperse");
              const disperseT = (e - 2.95) / 1.4;
              repulsionRamp = Math.min(1, Math.max(0, disperseT));
              const eased = disperseT * disperseT * (3 - 2 * disperseT);
              f = 1 - eased; // disperse
            }
            else {
              formStart = null;
              sessionStorage.setItem("heroFormed", "1");
              emitPhase("complete");
              window.dispatchEvent(new CustomEvent("hero:formation-complete"));
            }
            f = Math.max(0, Math.min(1, f));
            uniforms.u_form.value = f * f * (3 - 2 * f);
          }
          const target = mouseInHero ? (hasFormedOnce() ? 1.0 : repulsionRamp) : 0.0;
          uniforms.u_mAmt.value += (target - uniforms.u_mAmt.value) * 0.06;
          const repulseTarget = hasFormedOnce() || currentPhase === "disperse" || currentPhase === "complete" ? 1.0 : 0.0;
          uniforms.u_repulse.value += (repulseTarget - uniforms.u_repulse.value) * 0.05;
          camera.position.x += (camTX - camera.position.x) * 0.04;
          camera.position.y += (camTY - camera.position.y) * 0.04;
          camera.lookAt(0, 0, 0);
          points.rotation.y = Math.sin(timer.getElapsed() * 0.04) * 0.05;
          renderer.render(scene, camera);
        };

        // Pause rendering entirely while the tab is hidden; cancel first so a
        // queued frame can't pair with the resume call into a double loop.
        const onVisibility = () => {
          cancelAnimationFrame(animId);
          if (!document.hidden) {
            timer.reset();
            tick();
          }
        };
        document.addEventListener("visibilitychange", onVisibility);

        if (!document.hidden) tick();

        cleanup = () => {
          cancelAnimationFrame(animId);
          clearTimeout(resizeTo);
          clearTimeout(formTimer);
          themeObserver.disconnect();
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("resize", onResize);
          window.removeEventListener("hero:pulse", onPulse);
          document.removeEventListener("bootend", beginFormation);
          document.removeEventListener("visibilitychange", onVisibility);
          hero?.removeEventListener("click", onHeroClick);
          renderer.dispose();
          geo.dispose();
          mat.dispose();
        };
      } catch {
        return;
      }
      })
      .catch(() => {
        // WebGL support or module load failed; leave the hero as a static shell.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
