/** Clip actual transformed triangles, not sparse support rays.
 * Areas are sums, not a polygon union or Rapier/navigation certification.
 */
export function clipApronTriangle(triangle, bounds = [-16, 16, -16, 10]) {
  let polygon = triangle;
  for (const [axis, bound, sign] of [[0, bounds[0], 1], [0, bounds[1], -1], [2, bounds[2], 1], [2, bounds[3], -1]]) {
    if (!polygon.length) break;
    const clipped = [];
    let a = polygon.at(-1), da = (a[axis] - bound) * sign;
    for (const b of polygon) {
      const db = (b[axis] - bound) * sign;
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        clipped.push(a.map((value, i) => value + (b[i] - value) * t));
      }
      if (db >= 0) clipped.push(b);
      a = b; da = db;
    }
    polygon = clipped;
  }
  if (polygon.length < 3) return { areaXZ: 0, minimumY: null, maximumY: null };
  let twiceArea = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    twiceArea += a[0] * b[2] - a[2] * b[0];
  }
  return { areaXZ: Math.abs(twiceArea) * .5,
    minimumY: Math.min(...polygon.map(p => p[1])), maximumY: Math.max(...polygon.map(p => p[1])) };
}

export function measureBodyApron(entries, topY = 4.8, tolerance = 1e-5) {
  let triangles = 0, clippedTriangles = 0, areaXZ = 0, planarAreaXZ = 0, minimumY = Infinity, maximumY = -Infinity;
  for (const entry of entries) {
    const count = entry.indices?.length ?? entry.points.length / 3;
    for (let i = 0; i < count; i += 3) {
      const triangle = [0, 1, 2].map(j => {
        const id = entry.indices?.[i + j] ?? i + j;
        return Array.from(entry.points.subarray(id * 3, id * 3 + 3));
      });
      const [a, b, c] = triangle;
      const up = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      if (up <= 1e-12 || Math.max(a[1], b[1], c[1]) <= 0) continue;
      triangles++;
      const clipped = clipApronTriangle(triangle);
      if (clipped.areaXZ <= 1e-9) continue;
      clippedTriangles++; areaXZ += clipped.areaXZ;
      minimumY = Math.min(minimumY, clipped.minimumY); maximumY = Math.max(maximumY, clipped.maximumY);
      // Match the documented actual-source diagnostic: all clipped vertices
      // must fit nominal Y4.8 within 10 micrometres, not a sparse probe grid.
      // The tolerance and height extrema stay explicit in the report.
      if (Math.abs(clipped.minimumY - topY) <= tolerance && Math.abs(clipped.maximumY - topY) <= tolerance) planarAreaXZ += clipped.areaXZ;
    }
  }
  return { triangles, clippedTriangles, summedProjectedAreaSquareMetres: areaXZ,
    summedPlanarAreaSquareMetres: planarAreaXZ, summedInclinedAreaSquareMetres: Math.max(0, areaXZ - planarAreaXZ),
    minimumY: Number.isFinite(minimumY) ? minimumY : null, maximumY: Number.isFinite(maximumY) ? maximumY : null,
    proposedTopY: topY, tolerance,
    interpretation: "Full transformed upward-face clipping in X[-16,16]/Z[-16,10]; area sums are not a union, absence-of-overlap, Rapier or navigation-support certification." };
}
