"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { isBootComplete, subscribeBoot } from "@/lib/boot-state";
import { subscribeScroll } from "@/lib/scroll-signal";
import { surfaceVertex, surfaceFragment, dustVertex, dustFragment } from "@/lib/journey-shaders";

type Frame = { x: number; center: number; width: number; nodes: { x: number; y: number; selected: boolean }[] };
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, n: number) => { const f = clamp((n-a)/(b-a)); return f*f*(3-2*f); };
const SHOTS = ["signal", "profile", "education", "skills", "projects", "experience", "contact"];
// Camera pushes make the same field feel spatially deeper between reading
// poses; each section keeps the artwork composed beside its real HTML copy.
const DIVE = [1.8, 1.55, 1.3, 1.45, 1.75, 1.55];
const SHOT_SCALE = [1.02, .95, 1.02, .96, .9, 1.02, .95];
const FIELD_LAYERS = 5;
/** One continuous field, seven genuinely different silhouettes and camera
 * pushes between them. Continuity belongs to the movement, not to a nucleus. */
export default function JourneyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false, generation = 0;
    let cleanup: (() => void) | undefined;
    async function initialize() {
      const ticket = ++generation; cleanup?.(); cleanup = undefined;
      document.documentElement.dataset.journeyScene = preference.matches ? "reduced" : "loading";
      if (preference.matches) return;
      const THREE = await import("three");
      if (disposed || ticket !== generation || !canvas) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { document.documentElement.dataset.journeyScene = "fallback"; return; }
      const compact = matchMedia("(pointer: coarse)").matches || innerWidth < 900;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .1, 100);
      camera.position.z = 10;
      const entity = new THREE.Group(); scene.add(entity);
      const state = { progress: 0, intro: 0, energy: 0, pointerX: 0, pointerY: 0 };
      const uniforms = { uTime: { value: 0 }, uProgress: { value: 0 }, uIntro: { value: 0 }, uEnergy: { value: 0 }, uDark: { value: 1 }, uDpr: { value: 1 }, uVeil: { value: 1 }, uSelection: { value: new THREE.Vector2(-1, -1) }, uResolution: { value: new THREE.Vector2() }, uTextRects: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) } };
      const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
      const materials: InstanceType<typeof THREE.Material>[] = [];
      const ownGeometry = <T extends InstanceType<typeof THREE.BufferGeometry>>(g: T) => { geometries.push(g); return g; };
      const ownMaterial = <T extends InstanceType<typeof THREE.Material>>(m: T) => { materials.push(m); return m; };
      // An allocation failure before subscriptions are installed still releases
      // the renderer and any resources already created by this generation.
      cleanup = () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); };
      let randomState = 98231;
      const random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
      const count = compact ? 8000 : 24000;
      const seeds = new Float32Array(count * 4);
      for (let i = 0; i < seeds.length; i++) seeds[i] = random();
      const orbitGeometry = ownGeometry(new THREE.BufferGeometry());
      orbitGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      orbitGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
      const orbitMaterial = ownMaterial(new THREE.ShaderMaterial({ uniforms, vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const dust = new THREE.Points(orbitGeometry, orbitMaterial); dust.frustumCulled = false; entity.add(dust);
      const segmentsU = compact ? 112 : 224, segmentsV = compact ? 24 : 40;
      const layerVertexCount = (segmentsU + 1) * (segmentsV + 1);
      const vertexCount = layerVertexCount * FIELD_LAYERS;
      const positions = new Float32Array(vertexCount * 3), uvs = new Float32Array(vertexCount * 2), layers = new Float32Array(vertexCount);
      const indices: number[] = [];
      for (let layer = 0; layer < FIELD_LAYERS; layer++) {
        const offset = layer * layerVertexCount;
        for (let y = 0; y <= segmentsV; y++) for (let x = 0; x <= segmentsU; x++) {
          const i = offset + y * (segmentsU + 1) + x;
          uvs.set([x / segmentsU, y / segmentsV], i * 2); layers[i] = layer;
          if (x < segmentsU && y < segmentsV) { const b = i + segmentsU + 1; indices.push(i, b, i+1, i+1, b, b+1); }
        }
      }
      const surfaceGeometry = ownGeometry(new THREE.BufferGeometry());
      surfaceGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      surfaceGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      surfaceGeometry.setAttribute("aLayer", new THREE.BufferAttribute(layers, 1));
      surfaceGeometry.setIndex(indices);
      const membraneMaterial = ownMaterial(new THREE.ShaderMaterial({ uniforms, vertexShader: surfaceVertex, fragmentShader: surfaceFragment, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      const membrane = new THREE.Mesh(surfaceGeometry, membraneMaterial); membrane.frustumCulled = false; entity.add(membrane);
      const nodesGeometry = ownGeometry(new THREE.IcosahedronGeometry(.055, 1));
      const nodeMaterials = Array.from({ length: 5 }, () => ownMaterial(new THREE.MeshBasicMaterial({ color: "#d4bfff", transparent: true })));
      // Node markers live outside the cinematic group, so camera zoom never
      // pulls them away from their corresponding accessible HTML buttons.
      const satellites = nodeMaterials.map(material => { const mesh = new THREE.Mesh(nodesGeometry, material); scene.add(mesh); return mesh; });
      const connectorsGeometry = ownGeometry(new THREE.BufferGeometry());
      const connectorPositions = new Float32Array(5 * 2 * 3);
      connectorsGeometry.setAttribute("position", new THREE.BufferAttribute(connectorPositions, 3));
      const connectorMaterial = ownMaterial(new THREE.LineBasicMaterial({ color: "#8a64db", transparent: true, opacity: .25 }));
      const connectors = new THREE.LineSegments(connectorsGeometry, connectorMaterial); connectors.frustumCulled = false; scene.add(connectors);

      let frames: Frame[] = [], width = 0, height = 0, scroll = scrollY, rawProgress = 0;
      let raf = 0, selectionFrame = 0, lastRender = 0, contextLost = false;
      const pointerX = gsap.quickTo(state, "pointerX", { duration: .8, ease: "power2.out" });
      const pointerY = gsap.quickTo(state, "pointerY", { duration: .8, ease: "power2.out" });
      function measure() {
        scroll = scrollY;
        if (width !== innerWidth || height !== innerHeight) {
          width = innerWidth; height = innerHeight;
          const dpr = Math.min(devicePixelRatio, compact ? 1.25 : 1.75);
          renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
          camera.aspect = width / height; camera.updateProjectionMatrix(); uniforms.uDpr.value = dpr;
          uniforms.uResolution.value.set(width,height);
        }
        const hero = document.getElementById("hero-section");
        if (!hero) return;
        const h = hero.getBoundingClientRect();
        frames = [{ x: width * (width < 900 ? .53 : .68), center: h.top + scroll + (width < 900 ? 710 : h.height / 2), width: width * (width < 900 ? .7 : .48), nodes: [] }];
        document.querySelectorAll<HTMLElement>(".journey-board").forEach(board => {
          const r = board.getBoundingClientRect();
          frames.push({ x: r.left + r.width / 2, center: r.top + scroll + r.height / 2, width: r.width,
            nodes: Array.from(board.querySelectorAll<HTMLElement>("[data-signal-node]")).map(node => { const n = node.getBoundingClientRect(); return { x: n.left + n.width / 2, y: n.top + scroll + n.height / 2, selected: node.dataset.selected === "true" }; }),
          });
        });
        if (frames.length !== 7) return;
        const copySelector = width < 900 ? ".journey-chapter__heading, .journey-chapter__intro, .journey-detail" : ".journey-chapter__copy";
        const copyRects = Array.from(document.querySelectorAll<HTMLElement>(`.hero-stage__title, .hero-stage__summary, .hero-stage__actions, ${copySelector}`))
          .map(el => el.getBoundingClientRect()).filter(r => r.width > 0 && r.bottom > -64 && r.top < height+64).slice(0,8);
        uniforms.uTextRects.value.forEach((rect,i) => { const r=copyRects[i]; if(r) rect.set(r.left-8,r.top-8,r.right+8,r.bottom+8); else rect.set(0,0,0,0); });
        const focus = scroll + height * .5;
        rawProgress = 0;
        for (let i = 0; i < 6; i++) if (focus >= frames[i].center) rawProgress = i + clamp((focus - frames[i].center) / (frames[i + 1].center - frames[i].center));
        // Lenis already smooths wheel and anchor scrolling. A second long
        // tween here makes the visual field trail behind the HTML chapters.
        state.progress = rawProgress;
        document.documentElement.dataset.journeyStage = String(Math.round(rawProgress));
      }
      const unsubscribe = subscribeScroll(measure);
      const resize = new ResizeObserver(measure);
      document.querySelectorAll(".journey-chapter__layout, #hero-section").forEach(el => resize.observe(el));
      const theme = () => {
        const dark = document.documentElement.classList.contains("dark"); uniforms.uDark.value = dark ? 1 : 0;
        orbitMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; orbitMaterial.needsUpdate = true;
        membraneMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; membraneMaterial.needsUpdate = true;
        nodeMaterials.forEach(m => m.color.set(dark ? "#d9c8ff" : "#6d3ecb"));
        connectorMaterial.color.set(dark ? "#9873e9" : "#7650bc");
      };
      const observer = new MutationObserver(theme); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); theme();
      const boot = () => { gsap.to(state, { intro: 1, duration: 1.4, ease: "power2.out" }); };
      const unsubscribeBoot = subscribeBoot(boot); if (isBootComplete()) boot();
      function render(now: number) {
        if (document.hidden || contextLost) { raf = 0; return; }
        raf = requestAnimationFrame(render);
        if (frames.length !== 7 || (compact && now - lastRender < 32)) return;
        lastRender = now;
        const p = clamp(state.progress, 0, 6), from = Math.min(5, Math.floor(p)), f = p - from;
        const ease = f * f * (3 - 2 * f);
        const push = Math.pow(Math.sin(f * Math.PI), 4);
        camera.position.z = 10 - DIVE[from] * push;
        const worldHeight = 2 * Math.tan(35 * Math.PI / 360) * camera.position.z;
        const baseWorldHeight = 2 * Math.tan(35 * Math.PI / 360) * 10;
        const size = mix(frames[from].width, frames[from + 1].width, ease);
        const scale = Math.min(size * .20, width < 900 ? 62 : 132) * baseWorldHeight / height * mix(SHOT_SCALE[from], SHOT_SCALE[from+1], ease) * (1 + push * (width < 900 ? .14 : .35));
        const centerX = mix(frames[from].x, frames[from + 1].x, ease);
        const centerY = width < 900 && p < .1 ? Math.min(height * .77, Math.max(height * .5, frames[0].center - scroll)) : height * .5;
        entity.position.set((centerX - width / 2) * worldHeight / height, (height / 2 - centerY) * worldHeight / height, 0);
        entity.scale.setScalar(scale);
        entity.rotation.y = state.pointerX * .08; entity.rotation.x = state.pointerY * .06;
        uniforms.uTime.value = now * .001; uniforms.uProgress.value = p; uniforms.uIntro.value = state.intro; uniforms.uEnergy.value = state.energy;
        const nearest = Math.round(p), frame = frames[nearest];
        // On a narrow screen the same canvas sits behind both board and copy.
        // Keep the field present, but quieten it when the reader reaches detail.
        const veil = (frame: Frame) => 1-smooth(190,410,Math.abs(frame.center-scroll-height*.5))*.72;
        uniforms.uVeil.value = width < 900 ? mix(veil(frames[from]),veil(frames[from+1]),ease) : 1;
        const visibility = clamp(1 - Math.abs(p - nearest) * 2.6) * (nearest > 1 ? 1 : 0);
        satellites.forEach((satellite, i) => {
          const node = frame.nodes[i];
          const x = node ? (node.x-width/2)*worldHeight/height : 0;
          const y = node ? (height/2-(node.y-scroll))*worldHeight/height : 0;
          satellite.position.set(x, y, 0);
          satellite.scale.setScalar((node?.selected ? 1.8 + state.energy : 1)*worldHeight/6.3);
          nodeMaterials[i].opacity = node ? visibility * state.intro : 0;
          const next = frame.nodes[(i+1)%frame.nodes.length];
          connectorPositions.set([x, y, 0, next ? (next.x-width/2)*worldHeight/height : x, next ? (height/2-next.y+scroll)*worldHeight/height : y, 0], i * 6);
        });
        connectorsGeometry.setDrawRange(0, frame.nodes.length > 1 ? frame.nodes.length*2 : 0);
        connectorsGeometry.attributes.position.needsUpdate = true;
        connectorMaterial.opacity = visibility * .12 * state.intro;
        renderer.render(scene, camera);
        document.documentElement.dataset.journeyScene = "ready";
        canvas!.dataset.time = (now * .001).toFixed(2); canvas!.dataset.progress = p.toFixed(3);
        canvas!.dataset.shot = SHOTS[nearest];
        canvas!.dataset.cameraZ = camera.position.z.toFixed(2);
        canvas!.dataset.engine = "metamorphosis";
      }
      raf = requestAnimationFrame(render);
      const pulse = () => { measure(); gsap.killTweensOf(state, "energy"); state.energy = 1; gsap.to(state, { energy: 0, duration: 1.4, ease: "power2.out" }); };
      const select = (event: Event) => {
        const detail = (event as CustomEvent<{ stage?: number; index?: number }>).detail;
        if (detail && Number.isFinite(detail.stage) && Number.isFinite(detail.index)) {
          const stage = Number(detail.stage), index = Number(detail.index);
          const itemCount = stage === 2 ? 3 : stage === 5 ? 2 : stage === 6 ? 1 : 5;
          const layer = itemCount === 1 ? 2 : index * (FIELD_LAYERS - 1) / (itemCount - 1);
          uniforms.uSelection.value.set(stage, layer);
        }
        cancelAnimationFrame(selectionFrame);
        selectionFrame = requestAnimationFrame(() => { if (!disposed && ticket === generation) pulse(); });
      };
      const pointer = (e: PointerEvent) => { if (e.pointerType === "mouse") { pointerX(e.clientX / width * 2 - 1); pointerY(e.clientY / height * 2 - 1); } };
      const visibility = () => { if (!document.hidden && !contextLost && !raf) raf = requestAnimationFrame(render); };
      const lost = (e: Event) => { e.preventDefault(); contextLost = true; cancelAnimationFrame(raf); raf = 0; document.documentElement.dataset.journeyScene = "fallback"; };
      const restored = () => { contextLost = false; visibility(); };
      window.addEventListener("journey:select", select); window.addEventListener("journey:pulse", pulse); window.addEventListener("pointermove", pointer, { passive: true });
      document.addEventListener("visibilitychange", visibility); canvas.addEventListener("webglcontextlost", lost); canvas.addEventListener("webglcontextrestored", restored);
      cleanup = () => {
        cancelAnimationFrame(raf); cancelAnimationFrame(selectionFrame); unsubscribe(); unsubscribeBoot(); resize.disconnect(); observer.disconnect();
        gsap.killTweensOf(state); pointerX.tween.kill(); pointerY.tween.kill();
        window.removeEventListener("journey:select", select); window.removeEventListener("journey:pulse", pulse); window.removeEventListener("pointermove", pointer);
        document.removeEventListener("visibilitychange", visibility); canvas.removeEventListener("webglcontextlost", lost); canvas.removeEventListener("webglcontextrestored", restored);
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose();
      };
    }
    const start = () => {
      const pending = initialize(), ticket = generation;
      void pending.catch(() => {
        if (!disposed && ticket === generation) { cleanup?.(); cleanup = undefined; document.documentElement.dataset.journeyScene = "fallback"; }
      });
    };
    start(); preference.addEventListener("change", start);
    return () => { disposed = true; generation++; cleanup?.(); preference.removeEventListener("change", start); delete document.documentElement.dataset.journeyScene; delete document.documentElement.dataset.journeyStage; };
  }, []);
  return <div className="journey-canvas" aria-hidden="true"><canvas ref={canvasRef} className="journey-canvas__surface" /></div>;
}
