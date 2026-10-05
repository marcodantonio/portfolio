import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Owned, lightweight props used only while the guided transfer is playing. */
export function createTransitProps() {
  const boat = new THREE.Group(), parachute = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const mat = (color: string, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness, side: THREE.DoubleSide }); materials.push(m); return m;
  };
  const wood = mat("#a26032"), cream = mat("#ffe6b4"), violet = mat("#7745ce"), rope = mat("#dec89c");
  function add(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    geometries.push(geometry); const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  add(boat, new RoundedBoxGeometry(2.7, 0.6, 5.1, 3, 0.25), wood, 0, -0.3);
  for (const x of [-1.3, 1.3]) add(boat, new RoundedBoxGeometry(0.18, 0.8, 4.4, 2, 0.08), cream, x, 0.15);
  for (const z of [-1.55, 1.6]) add(boat, new RoundedBoxGeometry(2.5, 0.23, 0.65, 2, 0.08), wood, 0, 0.3, z);
  add(boat, new RoundedBoxGeometry(1, 0.9, 0.55, 2, 0.12), violet, 0, 0.1, -2.4);
  const canopy = add(parachute, new THREE.SphereGeometry(3.4, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), violet, 0, 6.1);
  canopy.scale.y = 0.6;
  const cord = new THREE.CylinderGeometry(0.022, 0.022, 1, 5);
  geometries.push(cord);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, start = new THREE.Vector3(Math.cos(a) * 0.28, 1.45, Math.sin(a) * 0.28), end = new THREE.Vector3(Math.cos(a) * 3.3, 6.3, Math.sin(a) * 3.3);
    const line = new THREE.Mesh(cord, rope); line.position.copy(start).add(end).multiplyScalar(0.5); line.scale.y = start.distanceTo(end); line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); parachute.add(line);
  }
  boat.visible = parachute.visible = false;
  return { boat, parachute, dispose() { geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); boat.clear(); parachute.clear(); } };
}
