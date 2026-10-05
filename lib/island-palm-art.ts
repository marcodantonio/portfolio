import * as THREE from "three";

/** Soft crown displacement only. Trunks and collision remain owned by the map. */
export const PALM_MAXIMUM_WIND_OFFSET = .035;

/** Original pinnate palm frond: a curved rachis and separately sealed leaflets.
 * Broad, overlapping blades make a continuous leafy silhouette at world scale,
 * rather than relying on alpha cards or a comb of thin needles. Dimensions and
 * botanical attributes remain compatible with the world's two indexed buckets. */
export function createPalmFrondGeometry(length: number, width: number, compact: boolean) {
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) {
    throw new RangeError("Palm fronds need positive finite dimensions");
  }
  const positions: number[] = [], normals: number[] = [], leafUV: number[] = [], indices: number[] = [];
  const components: { firstTriangle: number; triangles: number; kind: "rachis" | "leaflet" }[] = [];
  const pairs = compact ? 8 : 12;
  const centre = (t: number) => new THREE.Vector3(t * length,
    (Math.sin(t * Math.PI) * .255 - t * t * .225) * length, 0);

  function closedTube(point: (t: number) => THREE.Vector3, span: (t: number) => number,
    thickness: (t: number) => number, rows: number, sides: number, frondT: number, kind: "rachis" | "leaflet") {
    const first = positions.length / 3, firstTriangle = indices.length / 3;
    const up = new THREE.Vector3(0, 1, 0);
    function vertex(p: THREE.Vector3, normal: THREE.Vector3, u: number, across: number) {
      positions.push(p.x, p.y, p.z);
      normals.push(normal.x, normal.y, normal.z);
      leafUV.push(u, across, kind === "rachis" ? u : frondT, kind === "rachis" ? 0 : 1);
    }
    function frame(t: number) {
      const p = point(t), tangent = point(Math.min(1, t + .0005)).sub(point(Math.max(0, t - .0005))).normalize();
      const across = tangent.clone().cross(up).normalize(), perpendicular = tangent.clone().cross(across).normalize();
      return { p, tangent, across, perpendicular };
    }
    for (let row = 0; row < rows; row++) {
      const t = .025 + row / (rows - 1) * .95;
      const { p, across, perpendicular } = frame(t), before = frame(t - .001), after = frame(t + .001);
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
        const along = after.p.clone().addScaledVector(after.across, c * span(t + .001))
          .addScaledVector(after.perpendicular, s * thickness(t + .001))
          .sub(before.p.clone().addScaledVector(before.across, c * span(t - .001))
            .addScaledVector(before.perpendicular, s * thickness(t - .001)));
        const round = across.clone().multiplyScalar(-s * span(t)).addScaledVector(perpendicular, c * thickness(t));
        // The derivatives of the bowed lenticular surface yield continuous
        // outward normals. Area-weighted mesh averages invert fine rolled tips.
        const normal = round.cross(along).normalize();
        vertex(p.clone().addScaledVector(across, Math.cos(angle) * span(t))
          .addScaledVector(perpendicular, Math.sin(angle) * thickness(t)), normal, t, (c + 1) / 2);
        if (row < rows - 1) {
          const a = first + row * sides + side, b = first + row * sides + (side + 1) % sides;
          indices.push(a, b, a + sides, b, b + sides, a + sides);
        }
      }
    }
    const start = positions.length / 3, end = start + 1;
    vertex(point(0), frame(0).tangent.negate(), 0, .5); vertex(point(1), frame(1).tangent, 1, .5);
    for (let side = 0; side < sides; side++) {
      indices.push(start, first + (side + 1) % sides, first + side);
      const last = first + (rows - 1) * sides;
      indices.push(end, last + side, last + (side + 1) % sides);
    }
    components.push({ firstTriangle, triangles: indices.length / 3 - firstTriangle, kind });
  }

  closedTube(centre, (t) => length * (.009 * (1 - t) + .0015),
    (t) => length * (.006 * (1 - t) + .0015), compact ? 10 : 12, compact ? 4 : 6, 0, "rachis");
  for (let pair = 0; pair < pairs; pair++) for (const side of [-1, 1]) {
    // Slightly staggered roots are genuinely inside the curved solid rachis.
    const t = .10 + pair / (pairs - 1) * .79 + (side < 0 ? .009 : 0);
    const base = centre(t); base.z = side * length * (.009 * (1 - t) + .0015) * .35;
    const outline = Math.pow(Math.sin(t * Math.PI), .62);
    const variation = .96 + Math.sin(pair * 2.17 + side) * .04;
    const reach = width * 1.58 * outline * variation;
    const sweep = length * .095 * Math.sin(t * Math.PI) * (.91 + Math.cos(pair * 1.73) * .09);
    const point = (u: number) => base.clone().add(new THREE.Vector3(
      u * sweep + Math.sin(u * Math.PI) * length * .012 * side,
      (Math.sin(u * Math.PI) * .045 - u * u * .050 * (.45 + t * .55)) * length,
      side * (u * reach + Math.sin(u * Math.PI) * reach * .05)));
    // Low-poly topology is not used as a faceted shading style: these rounded
    // lenticular sections share normals along the complete bowed leaf surface.
    const bladeWidth = length / pairs * .66 * (.94 + Math.cos(pair * 1.37 + side) * .06);
    closedTube(point, (u) => Math.pow(Math.sin(u * Math.PI), .62) * bladeWidth,
      (u) => Math.sin(u * Math.PI) * length * .0045, compact ? 4 : 6, 6, t, "leaflet");
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("palmLeafUV", new THREE.Float32BufferAttribute(leafUV, 4));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  geometry.userData.palmFrond = { pairs, leaflets: pairs * 2, components, length, width,
    closedVolumes: true, maximumWindOffset: PALM_MAXIMUM_WIND_OFFSET };
  return geometry;
}
