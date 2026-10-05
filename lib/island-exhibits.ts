import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getTerrainHeight, STATION_CENTER_Y, WORLD_STATIONS } from "./island-map";
import type { ExhibitCopy, ExhibitText } from "./island-exhibit-copy";

const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 640;
const LEFT = 64;
const LINE_WIDTH = TEXTURE_WIDTH - LEFT * 2;
const INK = "#203b3e";
const VIOLET = "#7050ba";

function wrapText(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** A texture is painted once per locale change, never during the render loop. */
function paintExhibit(canvas: HTMLCanvasElement, copy: ExhibitText) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Exhibit canvas could not be initialized");
  context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  context.fillStyle = "#fff3d7";
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  context.fillStyle = "#ecdfc1";
  context.fillRect(0, 0, TEXTURE_WIDTH, 12);
  context.fillRect(0, TEXTURE_HEIGHT - 10, TEXTURE_WIDTH, 10);
  context.fillStyle = VIOLET;
  context.fillRect(LEFT, 51, 8, 25);
  context.textBaseline = "top";
  context.font = '600 25px "Inter", system-ui, sans-serif';
  context.fillText(copy.eyebrow.toLocaleUpperCase(), LEFT + 24, 50);

  let titleSize = 72;
  let titleLines: string[] = [];
  while (titleSize >= 54) {
    context.font = `750 ${titleSize}px "Inter", system-ui, sans-serif`;
    titleLines = wrapText(context, copy.title, LINE_WIDTH);
    if (titleLines.length <= 2) break;
    titleSize -= 2;
  }
  context.fillStyle = INK;
  let cursor = 109;
  for (const line of titleLines) {
    context.fillText(line, LEFT, cursor);
    cursor += titleSize * 1.13;
  }
  cursor += 17;
  context.fillStyle = VIOLET;
  context.fillRect(LEFT, cursor, 95, 5);
  cursor += 30;

  // Copy is intentionally short. 40 texture px is ~13 screen px on a 340px
  // mobile sign; do not silently shrink factual content into unreadable type.
  context.font = '500 40px "Inter", system-ui, sans-serif';
  context.fillStyle = INK;
  for (const paragraph of copy.body) {
    for (const line of wrapText(context, paragraph, LINE_WIDTH)) {
      context.fillText(line, LEFT, cursor);
      cursor += 50;
    }
    cursor += 12;
  }

  context.fillStyle = "#d6cbae";
  context.fillRect(LEFT, 553, LINE_WIDTH, 2);
  context.fillStyle = "#5c6255";
  context.font = '500 26px "Inter", system-ui, sans-serif';
  const footer = wrapText(context, copy.footer, LINE_WIDTH);
  footer.slice(0, 2).forEach((line, index) => context.fillText(line, LEFT, 574 + index * 29));
}

/** Physical, depth-tested information surfaces in the scene, not projected dialogs. */
export function createIslandExhibits(copy: ExhibitCopy) {
  // Validate/paint before creating Three resources: a missing translation or
  // unavailable 2D canvas must not leave a half-created GPU resource owner.
  const painted = new Map(WORLD_STATIONS.map((station) => {
    const text = copy[station.id];
    if (!text) throw new Error(`Missing exhibit copy: ${station.id}`);
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    paintExhibit(canvas, text);
    return [station.id, canvas] as const;
  }));
  const group = new THREE.Group();
  group.name = "portfolio-exhibits";
  const wood = new THREE.MeshStandardMaterial({ color: "#83502e", roughness: 0.95 });
  const timber = new THREE.MeshStandardMaterial({ color: "#b9834e", roughness: 0.86 });
  const metal = new THREE.MeshStandardMaterial({ color: "#dfb974", roughness: 0.56, metalness: 0.22 });
  const accent = new THREE.MeshStandardMaterial({ color: "#9662db", roughness: 0.78 });
  const highlightMaterial = new THREE.MeshStandardMaterial({ color: "#ffe299", emissive: "#ebbb55", emissiveIntensity: 0.24, roughness: 0.5 });
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const materials: THREE.Material[] = [wood, timber, metal, accent, highlightMaterial];
  const geometries: THREE.BufferGeometry[] = [];
  const signs: { id: string; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }[] = [];
  const base = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const addBox = (material: THREE.Material, transform: THREE.Matrix4, x: number, y: number, z: number, width: number, height: number, depth: number) => {
    local.compose(position.set(x, y, z), rotation.identity(), scale.set(width, height, depth));
    matrix.multiplyMatrices(transform, local);
    const geometry = base.clone().applyMatrix4(matrix);
    const bucket = batches.get(material) ?? [];
    bucket.push(geometry);
    batches.set(material, bucket);
  };

  const signGeometry = new THREE.PlaneGeometry(5.6, 3.4);
  geometries.push(signGeometry);
  for (const station of WORLD_STATIONS) {
    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(station.x, getTerrainHeight(station.x, station.z), station.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), station.yaw),
      new THREE.Vector3(1, 1, 1),
    );
    addBox(wood, transform, 0, STATION_CENTER_Y, 0, station.width + 0.25, station.height + 0.23, 0.3);
    for (const side of [-1, 1]) {
      addBox(timber, transform, side * 2.28, 1.75, -0.03, 0.18, 3.5, 0.2);
      addBox(wood, transform, side * 2.28, 0.12, -0.03, 0.42, 0.24, 0.5);
      addBox(timber, transform, side * (station.width / 2 + 0.09), STATION_CENTER_Y, 0.035, 0.16, station.height + 0.35, 0.38);
      for (const top of [-1, 1]) {
        addBox(metal, transform, side * (station.width / 2 + 0.09), STATION_CENTER_Y + top * (station.height / 2 - 0.12), 0.24, 0.075, 0.075, 0.035);
      }
    }
    addBox(timber, transform, 0, STATION_CENTER_Y + station.height / 2 + 0.1, 0.02, station.width + 0.62, 0.18, 0.5);
    addBox(timber, transform, 0, STATION_CENTER_Y - station.height / 2 - 0.08, 0.02, station.width + 0.45, 0.16, 0.44);
    addBox(accent, transform, 0, STATION_CENTER_Y + station.height / 2 + 0.21, 0.04, 1.15, 0.045, 0.38);

    const canvas = painted.get(station.id)!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    materials.push(material);
    const sign = new THREE.Mesh(signGeometry, material);
    sign.name = `exhibit-${station.id}`;
    sign.position.set(0, STATION_CENTER_Y, 0.168);
    sign.updateMatrix();
    sign.applyMatrix4(transform);
    group.add(sign);
    signs.push({ id: station.id, canvas, texture });
  }
  base.dispose();
  for (const [material, parts] of batches) {
    const geometry = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!geometry) continue;
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const active = new THREE.Group();
  active.name = "active-exhibit-frame";
  active.visible = false;
  const bracketGeometry = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(bracketGeometry);
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      const horizontal = new THREE.Mesh(bracketGeometry, highlightMaterial);
      horizontal.position.set(x * 2.68, STATION_CENTER_Y + y * 1.8, 0.31);
      horizontal.scale.set(0.55, 0.075, 0.06);
      active.add(horizontal);
      const vertical = new THREE.Mesh(bracketGeometry, highlightMaterial);
      vertical.position.set(x * 2.93, STATION_CENTER_Y + y * 1.55, 0.31);
      vertical.scale.set(0.075, 0.55, 0.06);
      active.add(vertical);
    }
  }
  group.add(active);
  let disposed = false;
  return {
    group,
    setCopy(next: ExhibitCopy) {
      if (disposed) return;
      for (const sign of signs) {
        const text = next[sign.id];
        if (!text) continue;
        paintExhibit(sign.canvas, text);
        sign.texture.needsUpdate = true;
      }
    },
    setActive(id: string | null) {
      if (disposed) return;
      const station = WORLD_STATIONS.find((item) => item.id === id);
      active.visible = Boolean(station);
      if (station) {
        active.position.set(station.x, getTerrainHeight(station.x, station.z), station.z);
        active.rotation.y = station.yaw;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      signs.forEach(({ texture, canvas }) => {
        texture.dispose();
        canvas.width = canvas.height = 1;
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      painted.clear();
      group.clear();
    },
  };
}
