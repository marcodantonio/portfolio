"""Projects V2 R5: standalone native R4 pigment and coastal-plane finish.

Local recipe only; the parent owns native submission, ephemeral candidate
renders, saving/export and actual GLB review. R1-R4 are immutable. This is
reference-led authoring, not automatic multiview reconstruction or approval.

Only the existing body's free Y coordinates change: three semantic pitched
regions, maximum 0.8m displacement, and a thinner free upper shore lip. Body
XZ/indices, all 43 other solids, actual submerged triangles, sea ring, clearing
and prospective approaches are exact. Contact protection is deliberately a
superset of the 43 actual projected triangle footprints, not proof that all
those high cap projections are real 3D contacts. A real surface-nearest 0.5m
neighbourhood supplements this conservative protection. No new geometry,
objects, cap retopology, noise displacement, material/PNG edits or runtime work.

Only COLOR_0 on 44 owners and dominant-plane UV on the changed body are updated.
The four original packed PNGs and two single-slot PBR definitions stay exact.
R4 snapshot/underwater/actual triangle/UV audit helpers are reused with explicit
scope; no CDT, cap reconstruction, shader tweak or new dependency is included.
Blender 5.2 BVHTree FromPolygons/find_nearest APIs were queried by the parent.
"""
import hashlib
import json
import math
from collections import defaultdict

import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

PREFIX = "ProjectsIsland_V2_"
ROOT_NAME = PREFIX + "Origin_At_Sea_Level"
BODY_NAME = PREFIX + "Continuous_Connected_Coast_And_Bedrock"
COLOR_NAME = "TerrainColour"
ROOT = bpy.data.objects.get(ROOT_NAME)
BODY = bpy.data.objects.get(BODY_NAME)
ROCK = bpy.data.materials.get(PREFIX + "Limestone")
EARTH = bpy.data.materials.get(PREFIX + "HoneyEarth")
if ROOT is None or BODY is None or ROCK is None or EARTH is None:
    raise RuntimeError("R5 requires the committed Projects V2 R4 source")
OBJECTS = sorted((o for o in ROOT.children if o.type == "MESH"), key=lambda o: o.name)
if (len(OBJECTS) != 44 or BODY not in OBJECTS
        or not ROOT.get("native_constrained_geology_r4_audit_json")
        or ROOT.get("native_coastal_finish_r5_audit_json")):
    raise RuntimeError("Not the unmodified actual R4 source")
if ROOT.get("origin_semantics") != "Sea level, not a walking floor":
    raise RuntimeError("Unexpected sea-relative origin")
for owner in [ROOT] + OBJECTS:
    if not np.array_equal(np.asarray(owner.matrix_world), np.eye(4)):
        raise RuntimeError("R5 requires actual identity transforms: " + owner.name)

BODY_SHA = "d87e6e112ecd3bccc5fcf08bd90b1abc911573dfca68d4cb6223bdcff6a5961a"
CORRIDORS = (((4.6834, 26.3442), (0, 15), 2.75),
             ((29.0315, 1.296), (0, 15), 1.75))
EXPECTED_PNGS = {
    PREFIX + "Limestone_MetallicRoughness_1024":
        "1242a472494cd0b0856f143fc75375c8405ca3d01a229053374178a5833cd79f",
    PREFIX + "Limestone_WornMicroNormal_512":
        "11e7d290e9302e02c0f37ec446a6ac263d54b91a263877eb6081c4db4285a8d9",
    PREFIX + "HoneyEarth_MetallicRoughness_1024":
        "ac750c1d1117c9adc06491280c31a63a6480a3e2e1c17211775aa418e9981c87",
    PREFIX + "HoneyEarth_WornMicroNormal_512":
        "2167248438b2f71a7b9aacc5bf1ae21448ee87c3f4a6f0badcc2b651031c5144"}


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def digest(data):
    return hashlib.sha256(np.ascontiguousarray(data).tobytes()).hexdigest()


def native_points(mesh):
    values = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", values)
    return values.reshape(-1, 3)


def gltf_points(mesh):
    native = native_points(mesh)
    return np.stack((native[:, 0], native[:, 2], -native[:, 1]), axis=1).astype(np.float64)


def snapshot(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    faces = np.asarray([t.vertices[:] for t in mesh.loop_triangles], dtype=np.int32)
    points = gltf_points(mesh)
    uv = np.asarray([d.uv[:] for d in mesh.uv_layers.active.data], dtype=np.float32)
    corner = np.asarray([n.vector[:] for n in mesh.corner_normals], dtype=np.float32)
    return points, faces, digest(native_points(mesh)), digest(uv), digest(corner)


def underwater_digest(points, faces):
    # R4 oriented triangle digest: independent of vertex/index order, but never
    # independent of winding, actual Float32 positions, or a moved lower point.
    chosen = faces[np.all(points[faces, 1] <= 0, axis=1)]
    keys = []
    for tri in chosen:
        rows = [np.asarray(points[i], dtype=np.float32).tobytes() for i in tri]
        keys.append(min(rows[0] + rows[1] + rows[2], rows[1] + rows[2] + rows[0],
                        rows[2] + rows[0] + rows[1]))
    return hashlib.sha256(b"".join(sorted(keys))).hexdigest(), len(chosen)


def scalar(value):
    if isinstance(value, (bool, int, float, str)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)


def material_digest(material):
    nodes = []
    for node in sorted(material.node_tree.nodes, key=lambda n: n.name):
        entry = {"name": node.name, "type": node.bl_idname,
                 "inputs": [(s.identifier, scalar(s.default_value))
                            for s in node.inputs if hasattr(s, "default_value")]}
        for attr in ("attribute_name", "layer_name", "operation", "blend_type",
                     "space", "uv_map", "interpolation", "extension"):
            if hasattr(node, attr):
                entry[attr] = scalar(getattr(node, attr))
        if hasattr(node, "image"):
            entry["image"] = node.image.name if node.image else None
        nodes.append(entry)
    links = sorted((l.from_node.name, l.from_socket.identifier,
                    l.to_node.name, l.to_socket.identifier)
                   for l in material.node_tree.links)
    data = {"nodes": nodes, "links": links, "diffuse": list(material.diffuse_color),
            "roughness": material.roughness, "metallic": material.metallic,
            "use_nodes": material.use_nodes}
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


def clip_rectangle(source):
    # Actual 3D clipping reused from R4, not a vertex-only square clamp.
    poly = list(source)
    for axis, bound, sign in ((0, -16, 1), (0, 16, -1), (2, -16, 1), (2, 10, -1)):
        output = []
        if not poly:
            break
        a = poly[-1]
        da = (a[axis] - bound) * sign
        for b in poly:
            db = (b[axis] - bound) * sign
            if (da >= 0) != (db >= 0):
                output.append(a + (b - a) * (da / (da - db)))
            if db >= 0:
                output.append(b)
            a, da = b, db
        poly = output
    if len(poly) < 3:
        return np.empty((0, 3)), 0.0
    poly = np.asarray(poly)
    q = poly[:, [0, 2]]
    n = np.roll(q, -1, axis=0)
    area = abs(float(np.sum(q[:, 0] * n[:, 1] - q[:, 1] * n[:, 0]))) * .5
    return poly, area


def clearing_faces(points, faces, audit=False):
    tri = points[faces]
    candidate = ((tri[:, :, 0].max(axis=1) > -16) & (tri[:, :, 0].min(axis=1) < 16)
                 & (tri[:, :, 2].max(axis=1) > -16) & (tri[:, :, 2].min(axis=1) < 10)
                 & (tri[:, :, 1].max(axis=1) > 0))
    selected = np.zeros(len(faces), dtype=bool)
    summed_area = 0.0
    lo, hi = math.inf, -math.inf
    for index in np.flatnonzero(candidate):
        poly, area = clip_rectangle(tri[index])
        if area <= 1e-10:
            continue
        selected[index] = True
        summed_area += area
        lo = min(lo, float(poly[:, 1].min()))
        hi = max(hi, float(poly[:, 1].max()))
        if audit and np.any(np.abs(poly[:, 1] - 4.8) > 1e-5):
            raise RuntimeError("R5 clearing not planar: tri=" + str(index)
                               + " heights=" + repr((lo, hi)))
    if audit and abs(summed_area - 832) > 1e-5:
        raise RuntimeError("R5 actual clipped apron area changed: " + repr(summed_area))
    return selected, {"summed_clipped_triangle_area_m2": summed_area,
                      "minimum_y": lo, "maximum_y": hi, "height_tolerance": 1e-5,
                      "not_union_or_physics_approval": True}


def cross2(a, b):
    return a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]


def point_segment_distance(points, a, b):
    d = np.asarray(b) - np.asarray(a)
    length = float(np.dot(d, d))
    if length <= 0:
        return np.linalg.norm(points - a, axis=-1)
    t = np.clip(np.sum((points - a) * d, axis=-1) / length, 0, 1)
    return np.linalg.norm(points - a - t[..., None] * d, axis=-1)


def capsule_faces(tri, a, b, radius):
    # Exact segment/triangle-distance in XZ, including crossing without any
    # source vertex inside the capsule, and endpoint containment/coplanarity.
    a, b = np.asarray(a), np.asarray(b)
    edge_start, edge_end = tri, np.roll(tri, -1, axis=1)
    edges = edge_end - edge_start
    values = np.minimum(point_segment_distance(tri, a, b).min(axis=1), np.inf)
    for point in (a, b):
        lengths = np.sum(edges * edges, axis=2)
        t = np.clip(np.sum((point - edge_start) * edges, axis=2)
                    / np.maximum(lengths, 1e-30), 0, 1)
        distance = np.linalg.norm(point - edge_start - t[:, :, None] * edges, axis=2)
        values = np.minimum(values, distance.min(axis=1))
        signs = cross2(edges, point - edge_start)
        contained = (signs.min(axis=1) >= -1e-8) | (signs.max(axis=1) <= 1e-8)
        # A degenerate projected wall is not an infinite containing line.
        area = np.abs(cross2(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]))
        values[contained & (area > 1e-10)] = 0
    segment = b - a
    o1 = cross2(edges, a - edge_start)
    o2 = cross2(edges, b - edge_start)
    o3 = cross2(segment, edge_start - a)
    o4 = cross2(segment, edge_end - a)
    bbox = ((np.minimum(edge_start, edge_end) <= np.maximum(a, b) + 1e-8)
            & (np.maximum(edge_start, edge_end) >= np.minimum(a, b) - 1e-8)).all(axis=2)
    crossing = ((o1 * o2 <= 0) & (o3 * o4 <= 0) & bbox).any(axis=1)
    values[crossing] = 0
    return values <= radius


def overlap_projected(one, others):
    # SAT narrowphase on actual projected triangles, not their AABBs. Includes
    # contained/coplanar faces and line/point projections. Extra along-edge axes
    # resolve collinear degenerate segments; projections must overlap on ALL.
    edges = np.concatenate((np.broadcast_to(np.roll(one, -1, axis=0) - one,
                                            (len(others), 3, 2)),
                            np.roll(others, -1, axis=1) - others), axis=1)
    normals = np.stack((-edges[:, :, 1], edges[:, :, 0]), axis=2)
    axes = np.concatenate((normals, edges), axis=1)
    lengths = np.linalg.norm(axes, axis=2)
    axes /= np.maximum(lengths[:, :, None], 1e-30)
    p = np.einsum("aj,nkj->nak", one, axes)
    q = np.einsum("naj,nkj->nak", others, axes)
    separated = ((p.max(axis=1) < q.min(axis=1) - 1e-6)
                 | (q.max(axis=1) < p.min(axis=1) - 1e-6)) & (lengths > 1e-12)
    return ~separated.any(axis=1)


def protection(points, faces):
    tri = points[faces]
    masks = {}
    masks["submerged_and_sea"] = np.zeros(len(points), dtype=bool)
    masks["submerged_and_sea"][np.unique(faces[np.all(tri[:, :, 1] <= 0, axis=1)])] = True
    masks["submerged_and_sea"] |= points[:, 1] == 0
    selected, _ = clearing_faces(points, faces, audit=True)
    masks["full_triangle_clearing"] = np.zeros(len(points), dtype=bool)
    masks["full_triangle_clearing"][np.unique(faces[selected])] = True
    selected = np.zeros(len(faces), dtype=bool)
    for a, b, radius in CORRIDORS:
        # Preserve R4's full radius+1.15m approach feather, not only centreline.
        selected |= capsule_faces(tri[:, :, [0, 2]], a, b, radius + 1.15)
    masks["full_triangle_prospective_approaches"] = np.zeros(len(points), dtype=bool)
    masks["full_triangle_prospective_approaches"][np.unique(faces[selected])] = True

    other_points, other_faces = [], []
    offset = 0
    for obj in OBJECTS:
        if obj == BODY:
            continue
        p, f = ORIGINAL[obj.name][:2]
        other_points.extend(p.tolist())
        other_faces.extend((f + offset).tolist())
        offset += len(p)
    other_points = np.asarray(other_points)
    other_faces = np.asarray(other_faces, dtype=np.int32)
    projected = other_points[other_faces][:, :, [0, 2]]
    lo, hi = projected.min(axis=1), projected.max(axis=1)
    cells = defaultdict(list)
    cell_size = 2.0
    lower_cell = np.floor(lo / cell_size).astype(int)
    upper_cell = np.floor(hi / cell_size).astype(int)
    for index, (aa, bb) in enumerate(zip(lower_cell, upper_cell)):
        for x in range(aa[0], bb[0] + 1):
            for z in range(aa[1], bb[1] + 1):
                cells[(x, z)].append(index)
    masks["projected_actual_43_solid_superset"] = np.zeros(len(points), dtype=bool)
    tested, protected_faces = 0, 0
    fixed = np.logical_or.reduce(list(masks.values()))
    for ids, source in zip(faces, tri):
        if np.all(fixed[ids]) or source[:, 1].max() <= 0:
            continue
        q = source[:, [0, 2]]
        aa, bb = q.min(axis=0), q.max(axis=0)
        first, last = np.floor(aa / cell_size).astype(int), np.floor(bb / cell_size).astype(int)
        candidates = set()
        for x in range(first[0], last[0] + 1):
            for z in range(first[1], last[1] + 1):
                candidates.update(cells.get((x, z), ()))
        if not candidates:
            continue
        indices = np.fromiter(candidates, dtype=np.int32)
        indices = indices[((lo[indices] <= bb + 1e-6) & (hi[indices] >= aa - 1e-6)).all(axis=1)]
        tested += len(indices)
        if len(indices) and overlap_projected(q, projected[indices]).any():
            masks["projected_actual_43_solid_superset"][ids] = True
            protected_faces += 1
    tree = BVHTree.FromPolygons(other_points.tolist(), other_faces.tolist(),
                               all_triangles=True, epsilon=0.0)
    masks["actual_surface_nearest_05m"] = np.zeros(len(points), dtype=bool)
    for index in np.flatnonzero(points[:, 1] > 0):
        found = tree.find_nearest(Vector(points[index]), .5)
        if found[0] is not None and found[3] <= .5:
            masks["actual_surface_nearest_05m"][index] = True
    selected = masks["actual_surface_nearest_05m"][faces].any(axis=1)
    masks["actual_surface_nearest_05m"][np.unique(faces[selected])] = True
    protected = np.logical_or.reduce(list(masks.values()))
    return protected, {"protected_vertices": int(protected.sum()),
                       "free_vertices": int((~protected).sum()),
                       "categories": {name: int(mask.sum()) for name, mask in masks.items()},
                       "projected_body_faces_protected": protected_faces,
                       "projected_actual_triangle_pairs_tested": tested,
                       "contact_scope": "Conservative actual projected43-solid superset plus real nearest0.5m; not measured 3D contact proof",
                       "corridor_radius_extra_metres": 1.15}


def region(points, centre, radii):
    q = (points[:, [0, 2]] - np.asarray(centre)) / np.asarray(radii)
    return 1 - smooth(.50, 1.08, np.linalg.norm(q, axis=1))


def sculpt_free_body(points, faces, protected):
    x, y, z = points.T
    west = np.maximum(-.70 + .105 * (x + 27) + .025 * (z - 12),
                      -.33 - .070 * (x + 27) + .080 * (z - 12))
    front = np.maximum(.62 - .075 * (z - 17) + .040 * (x + 9),
                       -.40 + .060 * (z - 17) - .050 * (x + 9))
    channel_distance = np.abs(x - 26 - .22 * (z + 5))
    east = -.48 + .11 * np.minimum(channel_distance, 4.5) + .035 * (z + 4)
    weights = np.stack((region(points, (-26, 12), (11, 18)),
                        region(points, (-6, 22), (20, 12)),
                        region(points, (27, -3), (9, 19))), axis=1)
    fields = np.stack((west, front, east), axis=1)
    # Pitched pieces are affine/hinged, not random sculpt noise or hills.
    delta = np.sum(weights * np.clip(fields, -.8, .8), axis=1)
    delta /= np.maximum(1, weights.sum(axis=1))
    delta *= smooth(.38, 1.45, y)
    proposal = y + np.clip(delta, -.8, .8)
    free_lip = (~protected) & (y > 0) & (y < .85)
    lip_weight = 1 - smooth(.48, .85, y)
    proposal[free_lip] = ((1 - lip_weight[free_lip]) * proposal[free_lip]
                          + lip_weight[free_lip] * .24)
    proposal = np.clip(proposal, y - .8, y + .8)
    proposal[protected] = y[protected]
    old_tri = points[faces]
    old_cross = np.cross(old_tri[:, 1] - old_tri[:, 0], old_tri[:, 2] - old_tri[:, 0])
    old_area = np.linalg.norm(old_cross, axis=1)
    accepted = None
    for alpha in (1, .75, .5, .25, .125):
        candidate = points.copy()
        candidate[:, 1] = np.asarray(y + alpha * (proposal - y), dtype=np.float32)
        candidate[protected] = points[protected]
        t = candidate[faces]
        c = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
        area = np.linalg.norm(c, axis=1)
        dot = np.einsum("ij,ij->i", c, old_cross)
        if np.all(area >= 1e-10) and np.all(area >= old_area * .20) and np.all(dot > 0):
            accepted = candidate
            break
    if accepted is None or alpha < .5:
        raise RuntimeError("R5 macro change requires excessive backtracking; no silent cosmetic no-op")
    changed = np.abs(accepted[:, 1] - y) > 1e-6
    if changed.sum() < 40 or float(np.abs(accepted[:, 1] - y).max()) < .35:
        raise RuntimeError("R5 protection left no substantive free body sculpt")
    native = np.stack((accepted[:, 0], -accepted[:, 2], accepted[:, 1]), axis=1).astype(np.float32)
    BODY.data.vertices.foreach_set("co", native.ravel())
    BODY.data.update()
    return {"changed_body_vertices": int(changed.sum()), "backtracking_alpha": alpha,
            "maximum_abs_y_delta_metres": float(np.abs(accepted[:, 1] - y).max()),
            "free_upper_lip_vertices": int(free_lip.sum()),
            "free_upper_lip_y_before": [float(y[free_lip].min()), float(y[free_lip].max())] if free_lip.any() else [],
            "free_upper_lip_y_after": [float(accepted[free_lip, 1].min()), float(accepted[free_lip, 1].max())] if free_lip.any() else [],
            "semantic_macro_regions": ["West buttress pitched shoulder", "Front spur paired slope planes", "East access/channel Vplane"],
            "body_xz_indices_unchanged": True, "new_vertices_triangles_objects": 0}


def geological_cells(points):
    # R4 shared anisotropic colour field only; never a geometry displacement.
    q = points / np.array((2.8, 4.4, 2.8))
    q[:, 0] += q[:, 1] * .13
    q[:, 2] -= q[:, 1] * .10
    base = np.floor(q)
    first, second = np.full(len(q), np.inf), np.full(len(q), np.inf)
    tint = np.zeros(len(q))
    def hashed(cell, seed):
        value = np.sin(cell[:, 0] * 127.1 + cell[:, 1] * 311.7 + cell[:, 2] * 74.7 + seed) * 43758.5453123
        return value - np.floor(value)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cell = base + (dx, dy, dz)
                centre = cell + np.stack((.17 + .66 * hashed(cell, 7.3),
                                         .17 + .66 * hashed(cell, 16.47),
                                         .17 + .66 * hashed(cell, 30.71)), axis=1)
                distance = np.sum((centre - q) ** 2, axis=1)
                closer = distance < first
                second = np.where(closer, first, np.minimum(second, distance))
                first = np.where(closer, distance, first)
                tint = np.where(closer, hashed(cell, 45.1), tint)
    return np.sqrt(second) - np.sqrt(first), tint


def rotated_ellipse(points, centre, radii, angle):
    q = points[:, [0, 2]] - centre
    ca, sa = math.cos(angle), math.sin(angle)
    q = np.stack((ca * q[:, 0] + sa * q[:, 1], -sa * q[:, 0] + ca * q[:, 1]), axis=1)
    r = np.linalg.norm(q / radii, axis=1)
    return 1 - smooth(.87, 1.09, r)


def ribbon(points, path, widths):
    xz = points[:, [0, 2]]
    field = np.zeros(len(points))
    for a, b, w0, w1 in zip(path, path[1:], widths, widths[1:]):
        a, b = np.asarray(a), np.asarray(b)
        d = b - a
        t = np.clip(np.sum((xz - a) * d, axis=1) / np.dot(d, d), 0, 1)
        distance = np.linalg.norm(xz - a - t[:, None] * d, axis=1)
        width = w0 + (w1 - w0) * t
        field = np.maximum(field, 1 - smooth(width * .62, width * 1.22, distance))
    return field


def organic_fields(points):
    soil = np.zeros(len(points))
    for centre, radii, angle in (((-3, -2), (14, 11), -.18), ((5, 2), (12, 9), .25),
                                  ((-8, 6), (9, 7), -.12)):
        soil = np.maximum(soil, rotated_ellipse(points, centre, radii, angle))
    # Rounded asymmetric tongues, never a hidden max(abs()) square pigment.
    for path, widths in ((((0, -9), (-6, -18), (-11, -23)), (4.1, 3.1, 1.2)),
                         (((6, -4), (13, -15), (17, -21)), (3.4, 2.6, 1.3)),
                         (((-9, 4), (-20, 12), (-23, 18)), (3.6, 2.8, 1.1))):
        soil = np.maximum(soil, ribbon(points, path, widths) * .72)
    for a, b, radius in CORRIDORS:
        soil = np.maximum(soil, 1 - smooth(radius * .8, radius + 1.5,
                                           point_segment_distance(points[:, [0, 2]], a, b)))
    intrusion = np.zeros(len(points))
    for path in (((-27, 10), (-19, 8), (-13, 4)), ((4, -27), (2, -18), (-1, -12)),
                 ((27, -7), (19, -7), (13, -4))):
        intrusion = np.maximum(intrusion, ribbon(points, path, (2.5, 1.8, 1.2)))
    soil *= 1 - .60 * intrusion
    ledges = np.zeros(len(points))
    for path in (((-31, 5), (-29, 13), (-27, 22)), ((-24, -21), (-12, -28), (4, -31)),
                 ((20, -23), (27, -14), (29, -5)), ((-17, 30), (-8, 33), (1, 31))):
        ledges = np.maximum(ledges, ribbon(points, path, (1.4, 2.0, 1.0)))
    moss = ledges * (1 - soil) * smooth(.8, 2.0, points[:, 1])
    # Physical, descriptive clefts/channel: cool pigment is local, not a base
    # grey contribution imposed on every bright limestone face.
    clefts = np.zeros(len(points))
    for path in (((-30, 7), (-27, 16), (-24, 23)), ((-19, 24), (-17, 30), (-17, 34)),
                 ((7, 22), (9, 27), (11, 32)), ((29, -18), (27, -8), (27, 3))):
        clefts = np.maximum(clefts, ribbon(points, path, (.65, .95, .55)))
    return np.clip(soil, 0, 1), np.clip(moss, 0, .35), clefts


def paint(obj, is_body):
    mesh = obj.data
    points = gltf_points(mesh)
    ids = np.empty(len(mesh.loops), dtype=np.int32)
    mesh.loops.foreach_get("vertex_index", ids)
    totals = np.empty(len(mesh.polygons), dtype=np.int32)
    mesh.polygons.foreach_get("loop_total", totals)
    if not np.all(totals == 3):
        raise RuntimeError("R5 expected only actual triangular polygons: " + obj.name)
    normals = np.empty(len(mesh.polygons) * 3, dtype=np.float32)
    mesh.polygons.foreach_get("normal", normals)
    n = normals.reshape(-1, 3)
    face_normal = np.stack((n[:, 0], n[:, 2], -n[:, 1]), axis=1)
    corner_normal = np.repeat(face_normal, 3, axis=0)
    corners = points[ids]
    boundary, tint = geological_cells(points)
    cover, moss, clefts = organic_fields(points)
    joint = 1 - smooth(.02, .13, boundary)
    warm = np.array((.78, .70, .55))
    cool = np.array((.28, .38, .53))
    cool_mix = .40 * clefts + .14 * joint
    stone = (warm[None, :] * (1 - cool_mix[:, None]) + cool[None, :] * cool_mix[:, None])
    stone *= (.90 + .08 * tint)[:, None]
    stone *= (1 - .10 * joint)[:, None]
    honey = np.array((.74, .53, .28))[None, :] * (.94 + .06 * tint)[:, None]
    up = smooth(.34, .94, corner_normal[:, 1])
    if is_body:
        earth = up * cover[ids] * smooth(.65, 2.5, corners[:, 1])
    else:
        deposits = .09 + .29 * smooth(.50, .86, tint[ids])
        earth = up * np.maximum(.22 * cover[ids], deposits)
    rgb = stone[ids] * (1 - earth[:, None]) + honey[ids] * earth[:, None]
    sheltered = (1 - smooth(.72, .98, corner_normal[:, 1])) * smooth(.12, .72, corner_normal[:, 1])
    green = moss[ids] * sheltered * .70
    rgb = rgb * (1 - green[:, None]) + np.array((.26, .34, .09))[None, :] * green[:, None]
    wet = (1 - smooth(-.10, .85, corners[:, 1])) * .21
    rgb *= (1 - wet)[:, None]
    rgba = np.concatenate((np.clip(rgb, 0, 1), np.ones((len(rgb), 1))), axis=1).astype(np.float32)
    attr = mesh.color_attributes.get(COLOR_NAME)
    if attr is None or attr.data_type != "FLOAT_COLOR" or attr.domain != "CORNER":
        raise RuntimeError("R5 unexpected existing COLOR_0 ownership: " + obj.name)
    attr.data.foreach_set("color", rgba.ravel())
    if is_body:
        # Only the changed body gets UV updates using its actual new face
        # normals. Other 43 meshes keep the original exact UV/corner normals.
        axis = np.argmax(np.abs(corner_normal), axis=1)
        uv = np.empty((len(corners), 2), dtype=np.float32)
        for a, plane in enumerate(((2, 1), (0, 2), (0, 1))):
            selection = axis == a
            uv[selection] = corners[selection][:, plane] / 6.4
        mesh.uv_layers.active.data.foreach_set("uv", uv.ravel())
    mesh.update()
    return {"name": obj.name, "rgb_min": rgba[:, :3].min(axis=0).tolist(),
            "rgb_max": rgba[:, :3].max(axis=0).tolist()}


def audit_sources(protected):
    reports = []
    triangle_count = 0
    for obj in OBJECTS:
        p, f, co_hash, uv_hash, normal_hash = snapshot(obj)
        old_p, old_f, old_hash, old_uv, old_normal = ORIGINAL[obj.name]
        if not np.isfinite(p).all() or not np.array_equal(f, old_f):
            raise RuntimeError("R5 actual source positions/index ownership changed: " + obj.name)
        if obj != BODY and (co_hash != old_hash or uv_hash != old_uv or normal_hash != old_normal):
            raise RuntimeError("R5 changed frozen43 geometry/UV/normals: " + obj.name)
        if obj == BODY:
            if not np.array_equal(p[:, [0, 2]], old_p[:, [0, 2]]) or not np.array_equal(p[protected], old_p[protected]):
                raise RuntimeError("R5 changed protected BODY source or any body XZ")
            if float(np.abs(p[:, 1] - old_p[:, 1]).max()) > .800001:
                raise RuntimeError("R5 body sculpt exceeded0.8m")
            _, apron = clearing_faces(p, f, audit=True)
        submerged = underwater_digest(p, f)
        if submerged != UNDERWATER[obj.name]:
            raise RuntimeError("R5 altered original actual submerged triangle geometry: " + obj.name)
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        closed = all(edge.is_manifold for edge in bm.edges)
        volume = bm.calc_volume(signed=True)
        bm.free()
        if not closed or volume <= 0 or not math.isfinite(volume):
            raise RuntimeError("R5 actual source not closed positive: " + obj.name)
        t = p[f]
        c = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
        area = np.linalg.norm(c, axis=1)
        if np.any(area < 1e-10):
            index = int(np.argmin(area))
            raise RuntimeError("R5 zero-area: " + obj.name + " triangle=" + str(index)
                               + " cross=" + repr(float(area[index])))
        loops = np.asarray([tri.loops[:] for tri in mesh.loop_triangles], dtype=np.int32)
        normal = np.asarray([n.vector[:] for n in mesh.corner_normals], dtype=np.float64)
        normal = np.stack((normal[:, 0], normal[:, 2], -normal[:, 1]), axis=1)
        avg = normal[loops].sum(axis=1)
        dot = np.einsum("ij,ij->i", c, avg) / np.maximum(area * np.linalg.norm(avg, axis=1), 1e-30)
        if not np.isfinite(normal).all() or np.any(dot < -.05):
            index = int(np.argmin(dot))
            raise RuntimeError("R5 normal opposition: " + obj.name + " triangle=" + str(index)
                               + " dot=" + repr(float(dot[index])))
        uv = np.asarray([v.uv[:] for v in mesh.uv_layers.active.data], dtype=np.float64)
        u = uv[loops]
        determinant = cross2(u[:, 1] - u[:, 0], u[:, 2] - u[:, 0])
        if not np.isfinite(uv).all() or np.any(np.abs(determinant) < 1e-14):
            index = int(np.argmin(np.abs(determinant)))
            raise RuntimeError("R5 UV degeneration: " + obj.name + " triangle=" + str(index)
                               + " determinant=" + repr(float(determinant[index])))
        color = np.asarray([v.color[:] for v in mesh.color_attributes[COLOR_NAME].data])
        if not np.isfinite(color).all() or not np.all(np.ptp(color[:, :3], axis=0) > 1e-5):
            raise RuntimeError("R5 nonfinite/unvarying COLOR_0: " + obj.name)
        expected_material = EARTH if obj == BODY else ROCK
        if len(mesh.materials) != 1 or mesh.materials[0] != expected_material:
            raise RuntimeError("R5 material single-slot changed: " + obj.name)
        triangle_count += len(f)
        reports.append({"name": obj.name, "triangles": len(f), "closed_positive": True,
                        "signed_volume": volume, "minimum_cross_length": float(area.min()),
                        "minimum_uv_determinant": float(np.abs(determinant).min()),
                        "minimum_corner_normal_dot": float(dot.min()),
                        "submerged_sha256": submerged[0], "submerged_triangles": submerged[1]})
    if triangle_count != 109088 or triangle_count > 180000:
        raise RuntimeError("R5 actual unchanged triangle budget failed: " + str(triangle_count))
    for material in (ROCK, EARTH):
        if material_digest(material) != MATERIALS[material.name]:
            raise RuntimeError("R5 changed the original PBR definition: " + material.name)
    for image, sha in PNGS:
        if hashlib.sha256(bytes(image.packed_file.data)).hexdigest() != sha:
            raise RuntimeError("R5 changed original packed PNG: " + image.name)
    return {"meshes": 44, "triangles": triangle_count, "hard_triangle_limit": 180000,
            "all_closed_positive": True, "zero_area": 0, "uv_degenerate": 0, "normal_opposition": 0,
            "source43_geometry_uv_corner_normals_exact": True,
            "body_xz_indices_and_protected_surface_exact": True,
            "all_original_submerged_geometry_exact": True,
            "sea_ring_vertices_exact": int((ORIGINAL[BODY_NAME][0][:, 1] == 0).sum()),
            "original_material_definitions_exact": 2, "original_packed_png_bytes_exact": 4,
            "clearing": apron, "source_details": reports,
            "sea_origin_y": 0, "foundation_y": -10, "standalone_art_not_approved": True,
            "no_runtime_map_physics_ocean_mutations": True}


ORIGINAL = {obj.name: snapshot(obj) for obj in OBJECTS}
if sum(len(item[1]) for item in ORIGINAL.values()) != 109088:
    raise RuntimeError("R5 needs the actual109088-triangleR4")
bp, bf = ORIGINAL[BODY_NAME][:2]
if len(bp) != 7421 or len(bf) != 14838 or ORIGINAL[BODY_NAME][2] != BODY_SHA:
    raise RuntimeError("R5 actual native R4 body digest/count mismatch")
if int((bp[:, 1] == 0).sum()) != 256 or float(bp[:, 1].min()) != -10:
    raise RuntimeError("R5 actual R4 sea ring/foundation mismatch")
UNDERWATER = {name: underwater_digest(item[0], item[1]) for name, item in ORIGINAL.items()}
MATERIALS = {material.name: material_digest(material) for material in (ROCK, EARTH)}
PNGS = []
for material in (ROCK, EARTH):
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeTexImage" and node.image:
            image = node.image
            if image.packed_file is None or image.file_format != "PNG":
                raise RuntimeError("R5 missing original packed PNG")
            sha = hashlib.sha256(bytes(image.packed_file.data)).hexdigest()
            if EXPECTED_PNGS.get(image.name) != sha:
                raise RuntimeError("R5 original packed PNG guard failed: " + image.name)
            PNGS.append((image, sha))
if len(PNGS) != 4 or len({image.name for image, _ in PNGS}) != 4:
    raise RuntimeError("R5 needs four unchanged original PNGs")
protected, protected_report = protection(bp, bf)
sculpt_report = sculpt_free_body(bp, bf, protected)
pigment = [paint(obj, obj == BODY) for obj in OBJECTS]
metrics = audit_sources(protected)
ROOT["native_coastal_finish_r5_audit_json"] = json.dumps(metrics, separators=(",", ":"))
ROOT["r5_scope"] = "Organic COLOR_0, warm limestone, three free body pitched regions/thinner free lip; exact protected source"
ROOT["r5_runtime_status"] = "Standalone candidate; not artistic/gameplay/physics/LOD approval"
compact = {k: v for k, v in metrics.items() if k != "source_details"}
result = json.dumps({"recipe": "projects-island-v2-r5-organic-coastal-finish", "root": ROOT_NAME,
                     "audit": compact, "protection": protected_report, "body_sculpt": sculpt_report,
                     "painted_owners": len(pigment), "new_mesh_owners": 0,
                     "provider_requests": 0, "renders": 0, "no_automatic_reconstruction": True,
                     "next": "Ephemeral same-camera actual render, native/source/portable GLB audits; no automatic art acceptance"},
                    separators=(",", ":"))
if len(result.encode()) >= 14000:
    raise RuntimeError("R5 compact tool result unexpectedly exceeds14KiB")
