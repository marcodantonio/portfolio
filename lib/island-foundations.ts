import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { getFoundationHulls } from "./island-foundation-map";
import { createIslandRockMaterial, createIslandTimberMaterial } from "./island-materials";

/** Architectural supports remain present independently of async GLB readiness.
 * Every visible cuboid consumes the SAME world-space solid as Rapier. */
export function createIslandFoundations({ compact = false }: { compact?: boolean } = {}) {
  const group = new THREE.Group(); group.name = "Grounded studio, archive and Dance foundations";
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
    geometries.clear(); materials.clear(); group.clear();
  }
  try {
    const stone = createIslandRockMaterial({ color: "#c7b18b", roughness: .88 }); materials.add(stone);
    const mineralHook = stone.onBeforeCompile;
    stone.onBeforeCompile = (shader, renderer) => {
      mineralHook.call(stone, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        // Quiet staggered courses distinguish masonry from the natural coast.
        // This detail changes pigment only, never the silhouette/shared hull.
        float foundationAlong = abs(vRockWorldNormal.x) > abs(vRockWorldNormal.z)
          ? vRockWorldPosition.z : vRockWorldPosition.x;
        float foundationCourse = vRockWorldPosition.y / ${compact ? .48 : .38};
        float foundationRow = floor(foundationCourse);
        vec2 foundationJointUV = vec2(foundationAlong / 1.1 + mod(foundationRow, 2.) * .5, foundationCourse);
        vec2 foundationFilter = max(fwidth(foundationJointUV), vec2(.00001));
        vec2 foundationEdge = min(fract(foundationJointUV), 1. - fract(foundationJointUV));
        vec2 foundationMortar = 1. - smoothstep(vec2(.013), vec2(.026) + foundationFilter, foundationEdge);
        float foundationResolved = 1. - smoothstep(.2, .8, max(foundationFilter.x, foundationFilter.y));
        float foundationVertical = 1. - smoothstep(.35, .8, abs(vRockWorldNormal.y));
        diffuseColor.rgb *= 1. - max(foundationMortar.x, foundationMortar.y) * .14 * foundationResolved * foundationVertical;
      `);
    };
    stone.customProgramCacheKey = () => `island-foundation-masonry-v1-${compact}`;
    const timber = createIslandTimberMaterial({ color: "#896242" }, "timberGrain"); materials.add(timber);
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const hulls = getFoundationHulls();
    for (const hull of hulls) {
      const geometry = new THREE.BoxGeometry(hull.width, hull.height, hull.depth); geometries.add(geometry);
      if (hull.finish === "timber") {
        const points = geometry.attributes.position, grain: number[] = [];
        const alongX = hull.width >= hull.depth;
        for (let i = 0; i < points.count; i++) grain.push((alongX ? points.getX(i) : points.getZ(i)) + hull.x * .71,
          points.getY(i) + hull.z * .37);
        geometry.setAttribute("timberGrain", new THREE.Float32BufferAttribute(grain, 2));
      }
      geometry.rotateY(hull.yaw); geometry.translate(hull.x, hull.y, hull.z);
      const material = hull.finish === "stone" ? stone : timber, parts = buckets.get(material) ?? [];
      parts.push(geometry); buckets.set(material, parts);
    }
    for (const [material, parts] of buckets) {
      const geometry = mergeGeometries(parts, false);
      if (!geometry) throw new Error("Foundation solids have incompatible geometry attributes");
      geometries.add(geometry);
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = material === stone ? "Terrain-seated masonry footings" : "Ground-seated timber piers and bearings";
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      parts.forEach((part) => { part.dispose(); geometries.delete(part); });
    }
    return { group, dispose };
  } catch (error) { dispose(); throw error; }
}
