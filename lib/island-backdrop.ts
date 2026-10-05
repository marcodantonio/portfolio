import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { createIslandRockMaterial } from "./island-materials";
import { WATER_LEVEL, WORLD_BOUNDS } from "./island-map";

/** Distant scenery, outside the navigable map. Never a seventh territory. */
export function createIslandBackdrop({ compact = false }: { compact?: boolean } = {}) {
  const group = new THREE.Group(); group.name = "Distant tropical limestone landscape";
  const material = createIslandRockMaterial({ vertexColors: true, roughness: .95 });
  const pieces: THREE.BufferGeometry[] = [];
  let geometry: THREE.BufferGeometry | undefined, disposed = false;
  const grey = new THREE.Color("#9b9c8e"), shade = new THREE.Color("#616b75");
  const green = new THREE.Color("#477842"), moss = new THREE.Color("#8d9d51");
  const color = new THREE.Color();
  const dispose = () => {
    if (disposed) return; disposed = true;
    pieces.forEach(part => part.dispose()); pieces.length = 0;
    geometry?.dispose(); material.dispose(); group.clear();
  };
  try {
    // The northern horizon stays beyond all real land, boat and flight routes.
    const clusters = [[-270, -355, 48, 39], [-25, -465, 57, 48], [230, -365, 43, 32], [375, -220, 34, 29]];
    for (const [clusterX, clusterZ, size, height] of clusters) {
      if (clusterX > WORLD_BOUNDS.minX - 80 && clusterX < WORLD_BOUNDS.maxX + 80
        && clusterZ > WORLD_BOUNDS.minZ - 80 && clusterZ < WORLD_BOUNDS.maxZ + 80) {
        throw new Error("Background landscape overlaps the playable map");
      }
      for (let peak = 0; peak < (compact ? 3 : 5); peak++) {
        const phase = peak * 2.399 + clusterX * .013;
        const x = clusterX + Math.cos(phase) * size * .37;
        const z = clusterZ + Math.sin(phase) * size * .25;
        const radius = size * (.3 + (Math.sin(phase * 2) + 1) * .09);
        const summit = height * (.7 + (Math.cos(phase * 3) + 1) * .15);
        const segments = compact ? 24 : 40, bands = 10;
        const positions: number[] = [], colors: number[] = [], indices: number[] = [];
        for (let band = 0; band <= bands; band++) {
          const t = band / bands;
          for (let sector = 0; sector < segments; sector++) {
            const angle = sector / segments * Math.PI * 2;
            const ribs = Math.sin(angle * 5 + phase) * .11 + Math.cos(angle * 9 - phase) * .055;
            const shoulder = .9 - t * .15 - THREE.MathUtils.smoothstep(t, .72, 1) * .46;
            const r = radius * (shoulder + ribs * Math.sin(t * Math.PI)) * (1 + Math.cos(angle * 3 + phase) * .12);
            const y = WATER_LEVEL - 2 + summit * t
              + Math.sin(angle * 3 + phase) * Math.pow(t, 5) * summit * .09;
            positions.push(x + Math.cos(angle) * r + t * summit * .13,
              y, z + Math.sin(angle) * r * .7);
            color.copy(grey).lerp(shade, .15 + (Math.sin(angle * 7 + phase) + 1) * .15);
            const vegetation = THREE.MathUtils.smoothstep(t + Math.sin(angle * 4 + phase) * .1, .71, .93);
            color.lerp(green, vegetation).lerp(moss, vegetation * (Math.sin(angle * 3) + 1) * .22);
            colors.push(color.r, color.g, color.b);
            if (band < bands) {
              const a = band * segments + sector, b = band * segments + (sector + 1) % segments;
              indices.push(a, a + segments, b, b, a + segments, b + segments);
            }
          }
        }
        // A real closed summit, rather than a green plane floating over rocks.
        const center = positions.length / 3;
        positions.push(x + summit * .13, WATER_LEVEL - 2 + summit, z);
        colors.push(green.r, green.g, green.b);
        for (let i = 0; i < segments; i++) indices.push(bands * segments + i, center, bands * segments + (i + 1) % segments);
        const part = new THREE.BufferGeometry();
        part.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        part.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        part.setIndex(indices); part.computeVertexNormals();
        const sculpt = toCreasedNormals(part, .65); if (sculpt !== part) part.dispose();
        pieces.push(sculpt);
        // Silhouette-scale coconut groves distinguish tropical rock stacks
        // from barren pointed mountains. Every frond has closed volume.
        for (let palm = 0; palm < (compact ? 2 : 4); palm++) {
          const spin = palm * 2.399 + phase;
          const px = x + summit * .13 + Math.cos(spin) * radius * .11;
          const pz = z + Math.sin(spin) * radius * .08;
          const py = WATER_LEVEL - 2 + summit + .6;
          const crown = new THREE.Vector3(px + .7, py + 5.5, pz + .3);
          const trunkSource = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
            new THREE.Vector3(px, py - 1, pz), new THREE.Vector3(px + .15, py + 2, pz), crown,
          ]), 7, .23, 6, false);
          const trunk = trunkSource.toNonIndexed(); trunkSource.dispose();
          trunk.deleteAttribute("uv");
          const trunkColors: number[] = [];
          const trunkColor = new THREE.Color("#8e6943");
          for (let i = 0; i < trunk.attributes.position.count; i++) trunkColors.push(trunkColor.r, trunkColor.g, trunkColor.b);
          trunk.setAttribute("color", new THREE.Float32BufferAttribute(trunkColors, 3)); pieces.push(trunk);
          for (let frond = 0; frond < 7; frond++) {
            const direction = frond / 7 * Math.PI * 2 + spin;
            const leafSource = new THREE.SphereGeometry(1, 12, 6);
            const leaf = leafSource.toNonIndexed(); leafSource.dispose(); leaf.deleteAttribute("uv");
            const points = leaf.attributes.position, leafColors: number[] = [];
            for (let i = 0; i < points.count; i++) {
              const lx = points.getX(i) * .5, along = (points.getZ(i) + 1) * 1.7;
              points.setXYZ(i, crown.x + lx * Math.cos(direction) + along * Math.sin(direction),
                crown.y + points.getY(i) * .12 + Math.sin(along / 3.4 * Math.PI) * .7 - along * .28,
                crown.z - lx * Math.sin(direction) + along * Math.cos(direction));
              color.copy(green).lerp(moss, frond % 3 === 0 ? .55 : .12);
              leafColors.push(color.r, color.g, color.b);
            }
            leaf.setAttribute("color", new THREE.Float32BufferAttribute(leafColors, 3)); leaf.computeVertexNormals(); pieces.push(leaf);
          }
        }
      }
    }
    geometry = mergeGeometries(pieces, false) ?? undefined;
    pieces.forEach(part => part.dispose()); pieces.length = 0;
    if (!geometry) throw new Error("Background landscape failed to assemble");
    const mesh = new THREE.Mesh(geometry, material); mesh.name = "Batched distant limestone peaks";
    // Too distant for the local actor shadow atlas. Atmosphere supplies depth.
    mesh.castShadow = false; mesh.receiveShadow = false; group.add(mesh);
    return { group, dispose };
  } catch (error) { dispose(); throw error; }
}
