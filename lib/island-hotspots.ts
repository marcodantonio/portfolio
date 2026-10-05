import * as THREE from "three";
import { getGroundHeight, WORLD_STATIONS } from "@/lib/island-map";

/** Small floor inlays identify usable objects; portfolio prose is semantic HTML. */
export function createIslandHotspots() {
  const group = new THREE.Group();
  group.name = "Object interaction inlays";
  const geometry = new THREE.TorusGeometry(0.5, 0.045, 6, 40);
  const material = new THREE.MeshStandardMaterial({ color: "#d9b763", emissive: "#c69d43", emissiveIntensity: 0.2, roughness: 0.48, metalness: 0.4 });
  const activeMaterial = new THREE.MeshStandardMaterial({ color: "#ffdc82", emissive: "#ffbc3f", emissiveIntensity: 0.8, roughness: 0.4 });
  const rings = WORLD_STATIONS.map((station) => {
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    const x = station.x + Math.sin(station.yaw) * 1.4, z = station.z + Math.cos(station.yaw) * 1.4;
    ring.position.set(x, getGroundHeight(x, z) + 0.12, z);
    group.add(ring);
    return { id: station.id, ring };
  });
  return {
    group,
    setActive(id: string | null) { rings.forEach(({ id: key, ring }) => { ring.material = key === id ? activeMaterial : material; ring.scale.setScalar(key === id ? 1.16 : 1); }); },
    dispose() { geometry.dispose(); material.dispose(); activeMaterial.dispose(); group.clear(); },
  };
}
