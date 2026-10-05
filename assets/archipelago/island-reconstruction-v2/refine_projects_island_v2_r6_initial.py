"""Projects V2 R6: standalone actual R5 geological recomposition.

Local native Blender recipe only. Parent owns submission, ephemeral render,
saving/export and actual GLB/browser review. R1-R5 remain immutable. No native
network/file import, new paid image, game/map/physics/ocean or catalog mutation.

Attempt meaningful topology-constant deformation of eleven primary caps,
nine rear Attached_Fracture14-22 masses, the long front ridge ledge and the
continuous body. Unequal pitched crowns, oblique recesses and broad body
shoulders change real geometry, not another random noise/primitive pass.

Freeze actual baseline touching triangles in3D SAT including coplanar
containment (not projectedXZ), surface-nearest0.5m face halos, source submerged
geometry/sea ring, cap lower basal bands≤cut+.12m, the exact32x26 apron and
prospective full approach faces. Upper zipper collars can coherently change;
their entire triangular faces are NOT claimed exact. BODY receives conservative
multi-ray embedding protection too. This is per-solid topology and baseline
surface-contact preservation, NOT global union/volume/self-intersection proof.

SOURCE count/indices remain44meshes109088triangles; minimum area/ratio/winding,
positive volume, finite UV/normal paint, exact two single-slot PBR/fourPNG,
full apron clipping and final actual surface-pair checks fail closed.
Explicit significant-shape checks prevent silently accepting a no-op.
The terrain is bare; scenery is separate and integration is not approved.
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
    raise RuntimeError("R6 requires the committed Projects V2 R5 source")
OBJECTS = sorted((o for o in ROOT.children if o.type == "MESH"), key=lambda o: o.name)
if (len(OBJECTS) != 44 or BODY not in OBJECTS
        or not ROOT.get("native_coastal_finish_r5_audit_json")
        or ROOT.get("native_geological_recomposition_r6_audit_json")):
    raise RuntimeError("Not the actual native R5 source")
if ROOT.get("origin_semantics") != "Sea level, not a walking floor":
    raise RuntimeError("Unexpected sea-relative origin")
for owner in [ROOT] + OBJECTS:
    if not np.array_equal(np.asarray(owner.matrix_world), np.eye(4)):
        raise RuntimeError("R6 requires actual identity transforms: " + owner.name)

BODY_SHA = "a0fcafe3fb36e9efcc46eab0351e5f86005042de31cc593e8d777c45b2469c3a"
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
            raise RuntimeError("R6 clearing not planar: tri=" + str(index)
                               + " heights=" + repr((lo, hi)))
    if audit and abs(summed_area - 832) > 1e-5:
        raise RuntimeError("R6 actual clipped apron area changed: " + repr(summed_area))
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



PRIMARY = {
    # Explicit crown directions differ, unlike the former repeated cap frame.
    # angle, crown Y bias, pitched U/V, lean U/V, notch U, notch depth
    "Rear_Connected_Low_Saddle": (.10, -.90, -.25, .25, 0, -.45, -.12, 1.25),
    "Western_Broad_Second_Terrace": (-.48, -.75, -.65, .20, .55, -.45, .10, .80),
    "Cannon_Continuous_Middle_Terrace": (.42, -.45, .30, -.65, -.75, -.40, -.20, 1.00),
    "Cannon_Asymmetric_High_Plateau": (-.18, .35, -.85, -.65, -.55, -.55, .20, .95),
    "Western_High_Shoulder_Connected_To_Cannon": (-.70, -1.10, -.50, -.25, .35, -.30, -.15, .75),
    "East_Long_Lower_Shoulder": (.63, -.80, -.30, .55, -.65, -.35, .25, .70),
    "West_Front_Outer_Cleft_Buttress": (.70, .40, .65, -.35, -.25, .45, -.20, .75),
    "West_Front_Inner_Cleft_Buttress": (-.42, -.50, -.35, .55, .45, -.20, .25, .60),
    "Front_Left_Principal_Finger": (.30, .20, .45, -.25, -.25, .45, -.15, .70),
    "Front_Central_Long_Finger": (-.26, -.45, -.45, .25, .35, -.25, .20, .50),
    "Front_East_Short_Finger": (.48, -.45, .30, -.50, -.20, -.35, -.20, .40)}
REAR = {f"Attached_Fracture_{i:02d}" for i in range(14, 23)}
LEDGE = "Front_Low_Connecting_Ridge_Ledge"
SELECTED_NAMES = {BODY_NAME} | {PREFIX + name for name in PRIMARY | dict.fromkeys(REAR) | {LEDGE: None}}
CONTACT_EPS = 1e-6


def contact_sat(one, others):
    """3D surface SAT, including contained coplanar triangles and vertical faces.

    This is not volume containment or self-intersection certification.
    AABBs/hash below select candidates only, never the contact verdict.
    """
    if not len(others):
        return np.empty(0, dtype=bool)
    ea = np.roll(one, -1, axis=0) - one
    eb = np.roll(others, -1, axis=1) - others
    na = np.cross(ea[0], ea[1])
    nb = np.cross(eb[:, 0], eb[:, 1])
    if np.linalg.norm(na) < 1e-12 or np.any(np.linalg.norm(nb, axis=1) < 1e-12):
        raise RuntimeError("Degenerate input triangle is not implicit no-contact")
    count = len(others)
    ae = np.broadcast_to(ea, (count, 3, 3))
    an = np.broadcast_to(na, (count, 3))
    axes = np.concatenate((an[:, None, :], nb[:, None, :],
                           np.cross(ae[:, :, None, :], eb[:, None, :, :]).reshape(count, 9, 3),
                           np.cross(an[:, None, :], ae),
                           np.cross(nb[:, None, :], eb)), axis=1)
    lengths = np.linalg.norm(axes, axis=2)
    axes /= np.maximum(lengths[:, :, None], 1e-30)
    p = np.einsum("aj,nkj->nak", one, axes)
    q = np.einsum("naj,nkj->nak", others, axes)
    separated = ((p.max(axis=1) < q.min(axis=1) - CONTACT_EPS)
                 | (q.max(axis=1) < p.min(axis=1) - CONTACT_EPS)) & (lengths >= 1e-12)
    return ~separated.any(axis=1)


def promote_faces(mask, faces):
    touched = mask[faces].any(axis=1)
    promoted = mask.copy()
    promoted[np.unique(faces[touched])] = True
    return promoted


def all_surface_contacts(sources, baseline=None):
    """Actual per-owner faces are compared in one shared glTF/metre basis.

    Every baseline touching face freezes all three source vertices. A later
    comparison checks new surface-pair contacts against the baseline, not zero
    existing intersections. Existing overlaps are intentionally retained.
    """
    names = sorted(sources)
    triangles = [sources[name][0][sources[name][1]] for name in names]
    offsets = np.cumsum([0] + [len(t) for t in triangles])
    tri = np.concatenate(triangles)
    owners = np.concatenate([np.full(len(t), i, dtype=np.int32) for i, t in enumerate(triangles)])
    lo, hi = tri.min(axis=1), tri.max(axis=1)
    cells = defaultdict(list)
    cell_size = 2.
    first, last = np.floor(lo[:, [0, 2]] / cell_size).astype(int), np.floor(hi[:, [0, 2]] / cell_size).astype(int)
    for index, (a, b) in enumerate(zip(first, last)):
        for x in range(a[0], b[0] + 1):
            for z in range(a[1], b[1] + 1):
                cells[(x, z)].append(index)
    masks = {name: np.zeros(len(sources[name][0]), dtype=bool) for name in names}
    pairs, tested, pair_counts = set(), 0, defaultdict(int)
    for one_id, (a, b) in enumerate(zip(first, last)):
        owner = int(owners[one_id])
        name = names[owner]
        if name not in SELECTED_NAMES:
            # Other->selected pairs are processed from their selected owner.
            continue
        candidates = set()
        for x in range(a[0], b[0] + 1):
            for z in range(a[1], b[1] + 1):
                candidates.update(cells[(x, z)])
        indices = np.fromiter(candidates, dtype=np.int32)
        eligible = owners[indices] != owner
        selected_other = np.asarray([names[int(i)] in SELECTED_NAMES for i in owners[indices]])
        # Canonical ordering for selected/selected, no duplicate processing.
        eligible &= (~selected_other) | (indices > one_id)
        indices = indices[eligible]
        indices = indices[((lo[indices] <= hi[one_id] + CONTACT_EPS)
                           & (hi[indices] >= lo[one_id] - CONTACT_EPS)).all(axis=1)]
        tested += len(indices)
        if not len(indices):
            continue
        indices = indices[contact_sat(tri[one_id], tri[indices])]
        fa = one_id - offsets[owner]
        for other_id in indices:
            other_owner = int(owners[other_id])
            other_name = names[other_owner]
            fb = int(other_id - offsets[other_owner])
            key = (min(one_id, int(other_id)), max(one_id, int(other_id)))
            pairs.add(key)
            if baseline is not None and key not in baseline:
                return masks, pairs, {"new_contact": [name, int(fa), other_name, fb],
                                      "tested_actual_triangle_pairs": tested}
            masks[name][sources[name][1][fa]] = True
            masks[other_name][sources[other_name][1][fb]] = True
            pair_counts[" / ".join(sorted((name.removeprefix(PREFIX), other_name.removeprefix(PREFIX))))] += 1
    ordered = np.asarray(sorted(pairs), dtype=np.int32)
    return masks, pairs, {"tested_actual_triangle_pairs": tested, "surface_contact_pairs": len(pairs),
                         "surface_pair_sha256": digest(ordered),
                         "owner_pair_counts": dict(pair_counts), "new_contact": None,
                         "contact_scope": "Actual 3D surface SAT plus coplanar in-plane axes; not union/volume/self-intersection proof"}


def make_tree(points, faces):
    return BVHTree.FromPolygons(points.tolist(), faces.tolist(), all_triangles=True, epsilon=0.0)


def ray_inside(tree, point, direction, limit):
    """Parity ray; disagreements conservatively protect rather than free.

    Vertices on/near surfaces are handled separately by actual nearest queries.
    Three directions reduce single-edge ambiguity; this remains a conservative
    embedding supplement, not a whole-solid union certification.
    """
    origin = Vector(point)
    distance = 0.
    hits = 0
    while distance < limit:
        location, _, _, length = tree.ray_cast(origin, direction, limit - distance)
        if location is None:
            return bool(hits % 2)
        if length is None or not math.isfinite(length) or length < 0:
            raise RuntimeError("Nonfinite actual embedding ray")
        hits += 1
        if hits > 256:
            raise RuntimeError("Embedding ray failed to terminate")
        distance += float(length) + 2e-5
        origin = location + direction * 2e-5
    return bool(hits % 2)


def protection(sources, contact_masks):
    masks, reports, nearest = {}, {}, {}
    trees = {name: make_tree(p, f) for name, (p, f, *_) in sources.items()}
    bounds = {name: (p.min(axis=0), p.max(axis=0)) for name, (p, *_) in sources.items()}
    directions = [Vector(v).normalized() for v in ((.873, .371, .317), (-.263, .924, .277), (.391, .263, -.882))]
    for name in sorted(SELECTED_NAMES):
        p, f = sources[name][:2]
        tri = p[f]
        categories = {"actual_contact_faces": contact_masks[name].copy()}
        submerged = np.zeros(len(p), dtype=bool)
        submerged[np.unique(f[np.all(tri[:, :, 1] <= 0, axis=1)])] = True
        submerged |= p[:, 1] == 0
        categories["submerged_and_sea"] = submerged
        base = np.zeros(len(p), dtype=bool)
        short = name.removeprefix(PREFIX)
        if short in PRIMARY:
            cut = json.loads(bpy.data.objects[name]["r4_original_dominant_cap_plane"])["cut_y"]
            base |= p[:, 1] <= float(np.float32(cut + .12))
        elif short in REAR:
            base |= p[:, 1] <= p[:, 1].min() + .30
        elif short == LEDGE:
            base |= p[:, 1] <= p[:, 1].min() + .30
        categories["exact_lower_basal_band"] = base
        approach = np.zeros(len(p), dtype=bool)
        selected = np.zeros(len(f), dtype=bool)
        for a, b, radius in CORRIDORS:
            selected |= capsule_faces(tri[:, :, [0, 2]], a, b, radius + 1.15)
        approach[np.unique(f[selected])] = True
        categories["full_triangle_approaches"] = approach
        clearing = np.zeros(len(p), dtype=bool)
        if name == BODY_NAME:
            selected, _ = clearing_faces(p, f, audit=True)
            clearing[np.unique(f[selected])] = True
        else:
            # Preserve any real rock triangles near the reserved rectangle,
            # including projected vertical walls and true lower overlaps.
            selected = ((tri[:, :, 0].max(axis=1) >= -16) & (tri[:, :, 0].min(axis=1) <= 16)
                        & (tri[:, :, 2].max(axis=1) >= -16) & (tri[:, :, 2].min(axis=1) <= 10))
            for face_id in np.flatnonzero(selected):
                polygon, area = clip_rectangle(tri[face_id])
                if area > 1e-10:
                    clearing[f[face_id]] = True
        categories["full_triangle_reserved_clearing"] = clearing
        distance = np.full(len(p), np.inf)
        halo = np.zeros(len(p), dtype=bool)
        eligible = np.flatnonzero(p[:, 1] > 0)
        for other_name, tree in trees.items():
            if other_name == name:
                continue
            a, b = bounds[other_name]
            candidate = eligible[((p[eligible] >= a - 3.) & (p[eligible] <= b + 3.)).all(axis=1)]
            for vertex_id in candidate:
                found = tree.find_nearest(Vector(p[vertex_id]), 3.)
                if found[0] is not None:
                    distance[vertex_id] = min(distance[vertex_id], float(found[3]))
                    halo[vertex_id] |= found[3] <= .5
        categories["actual_nearest_half_metre_face_halo"] = promote_faces(halo, f)
        embedding = np.zeros(len(p), dtype=bool)
        embedded_faces, ambiguous_faces = 0, 0
        if name == BODY_NAME:
            fixed = np.logical_or.reduce(list(categories.values()))
            # The whole triangle is frozen on any embedded vertex/centroid.
            # Unlike R5 this never protects a cap merely because it is above
            # the body in XZ, leaving unrelated coastal space available.
            for other_name, tree in trees.items():
                if other_name == name:
                    continue
                a, b = bounds[other_name]
                candidates = np.flatnonzero(((tri.max(axis=1) >= a) & (tri.min(axis=1) <= b)).all(axis=1)
                                            & ~fixed[f].all(axis=1) & (tri[:, :, 1].max(axis=1) > 0))
                limit = float(np.linalg.norm(b - a)) * 2 + 4
                for face_id in candidates:
                    samples = np.vstack((tri[face_id], tri[face_id].mean(axis=0)))
                    samples = samples[((samples >= a) & (samples <= b)).all(axis=1)]
                    protected = False
                    for point in samples:
                        near = tree.find_nearest(Vector(point), .5)
                        if near[0] is not None:
                            protected = True
                            break
                        votes = [ray_inside(tree, point, d, limit) for d in directions]
                        if any(votes):
                            protected = True
                            ambiguous_faces += int(len(set(votes)) > 1)
                            break
                    if protected:
                        embedding[f[face_id]] = True
                        embedded_faces += 1
            categories["body_embedding_or_ambiguous_whole_faces"] = embedding
        protected = np.logical_or.reduce(list(categories.values()))
        masks[name], nearest[name] = protected, distance
        reports[name.removeprefix(PREFIX)] = {
            "protected_vertices": int(protected.sum()), "free_vertices": int((~protected).sum()),
            "categories": {key: int(value.sum()) for key, value in categories.items()},
            "protected_point_sha256": digest(np.asarray(p[protected], dtype=np.float32)),
            "embedding_faces_protected": embedded_faces, "ambiguous_embedding_faces_protected": ambiguous_faces}
    return masks, reports, nearest


def broad_body_proposal(points):
    x, y, z = points.T
    # Reference-led shoulders: broad broken planes instead of smooth poured
    # annulus. No additional floor or scattered primitive covers the body.
    front = np.minimum(4.40 - .13 * np.maximum(z - 16, 0),
                       3.00 - .26 * np.maximum(z - 23, 0) + .04 * (x + 6))
    front += -.65 * (1 - smooth(.5, 2.6, np.abs(x - 8 - .26 * (z - 20))))
    east = np.minimum(4.25 - .12 * np.maximum(x - 20, 0),
                      3.45 - .39 * np.maximum(x - 27, 0) + .025 * z)
    east += -.75 * (1 - smooth(.5, 2.2, np.abs(z - 14 + .20 * (x - 26))))
    west = np.minimum(4.15 - .12 * np.maximum(-x - 20, 0),
                      3.15 - .37 * np.maximum(-x - 27, 0) - .03 * z)
    fields = ((front - y, 1 - smooth(.5, 1.12, np.linalg.norm((points[:, [0, 2]] - (-3, 22)) / (25, 13), axis=1))),
              (east - y, 1 - smooth(.5, 1.12, np.linalg.norm((points[:, [0, 2]] - (27, 8)) / (9, 25), axis=1))),
              (west - y, 1 - smooth(.5, 1.12, np.linalg.norm((points[:, [0, 2]] - (-28, 3)) / (9, 25), axis=1))))
    delta, total = np.zeros(len(points)), np.zeros(len(points))
    for field, weight in fields:
        delta += np.clip(field, -1.8, 1.8) * weight
        total += weight
    delta /= np.maximum(total, 1)
    delta *= smooth(.12, 1.15, y)
    candidate = points.copy()
    candidate[:, 1] = np.maximum(.12, y + delta)
    return candidate


def crown_proposal(points, short, params, cut):
    angle, bias, tilt_u, tilt_v, lean_u, lean_v, notch, depth = params
    ca, sa = math.cos(angle), math.sin(angle)
    basis_u, basis_v = np.array((ca, sa)), np.array((-sa, ca))
    extent = np.maximum(points[:, [0, 2]].max(axis=0) - points[:, [0, 2]].min(axis=0), .1)
    centre = (points[:, [0, 2]].min(axis=0) + points[:, [0, 2]].max(axis=0)) * .5
    q = points[:, [0, 2]] - centre
    radii = np.maximum(extent * .5, .3)
    u, v = (q @ basis_u) / float(radii.max()), (q @ basis_v) / float(radii.min())
    y = points[:, 1]
    h = max(float(y.max()) - cut, .5)
    weight = smooth(cut + .12, cut + .12 + h * .55, y)
    # Two dominant asymmetric hinged ridge planes plus one broad oblique
    # recessed shelf. This changes actual upper silhouette/face geometry.
    pitched = tilt_u * u + tilt_v * v
    notch_field = 1 - smooth(.08, .36, np.abs(u - notch - .28 * v))
    bevel = .42 * np.maximum(v - .05, 0) + .30 * np.maximum(-u - .38, 0)
    delta = bias + pitched - depth * notch_field - bevel
    if short == "Cannon_Asymmetric_High_Plateau":
        crest = 1 - smooth(.18, .65, np.linalg.norm((points[:, [0, 2]] - (-1.5, -31.5)) / (6, 3), axis=1))
        southeast = smooth(-1., 7., points[:, 0]) * smooth(-31., -27., points[:, 2])
        delta += .80 * crest - 1.35 * southeast
    elif short == "Rear_Connected_Low_Saddle":
        for xc, zc in ((-8., -19.), (9., -19.5)):
            # Each recess is 5-7m wide, not a row of small equal teeth.
            cleft = 1 - smooth(.50, 3.25, np.abs(points[:, 0] - xc - .24 * (points[:, 2] - zc)))
            front = 1 - smooth(2., 7., np.abs(points[:, 2] - zc))
            delta -= 1.20 * cleft * front
    out = points.copy()
    out[:, 1] += weight * np.clip(delta, -3.2, 1.8)
    horizontal = np.stack((basis_u[0] * (lean_u - .16 * u) + basis_v[0] * lean_v * (1 + .18 * u),
                           basis_u[1] * (lean_u - .16 * u) + basis_v[1] * lean_v * (1 + .18 * u)), axis=1)
    out[:, [0, 2]] += weight[:, None] * horizontal
    return out


def rear_and_ledge_proposal(points, short):
    y = points[:, 1]
    lo, hi = points.min(axis=0), points.max(axis=0)
    cut = float(lo[1] + .30)
    if short == LEDGE:
        # The former straight rear apron rim receives unequal broad scallops,
        # shorter high shoulder and diagonal recession, not another chip row.
        params = (-.13, -.85, -.18, .30, .12, -.55, .06, .75)
        out = crown_proposal(points, short, params, cut)
        crest = (1 - smooth(.8, 3.5, np.abs(points[:, 0] + 9.))) + .7 * (1 - smooth(.8, 3.0, np.abs(points[:, 0] - 5.5)))
        out[:, 1] -= smooth(cut, hi[1], y) * .70 * crest
    else:
        index = int(short[-2:]) - 14
        # Deliberately nonperiodic authored distribution; not hash/noise.
        biases = (-.80, -.35, -1.45, -.50, -1.70, -.30, -1.10, -.60, -.95)
        angles = (.42, -.31, .61, -.48, .16, .50, -.23, .72, -.36)
        params = (angles[index], biases[index], .15 if index in (0, 3, 7) else -.35,
                  .32 if index in (1, 5) else -.16, .18, -.38, -.12 + .05 * index, .45)
        out = crown_proposal(points, short, params, cut)
    return out


def guarded_proposals(sources, protected, nearest):
    proposals = {}
    for name in sorted(SELECTED_NAMES):
        p = sources[name][0]
        short = name.removeprefix(PREFIX)
        if name == BODY_NAME:
            proposal = broad_body_proposal(p)
        elif short in PRIMARY:
            cut = json.loads(bpy.data.objects[name]["r4_original_dominant_cap_plane"])["cut_y"]
            proposal = crown_proposal(p, short, PRIMARY[short], cut)
        else:
            proposal = rear_and_ledge_proposal(p, short)
        # Ease spatially away from the actual contact halo; exact protected
        # vertices are restored, never moved to make a contact audit pass.
        guard = smooth(.5, 2.0, nearest[name])
        proposal = p + (proposal - p) * guard[:, None]
        proposal[protected[name]] = p[protected[name]]
        proposals[name] = proposal
    return proposals


def candidate_geometry(sources, proposals, alpha):
    candidate, reports = {}, {}
    for name, item in sources.items():
        p, f = item[:2]
        if name in proposals:
            q = np.asarray(p + (proposals[name] - p) * alpha, dtype=np.float32).astype(np.float64)
            q[PROTECTED[name]] = p[PROTECTED[name]]
        else:
            q = p.copy()
        tri, old_tri = q[f], p[f]
        cross = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        old_cross = np.cross(old_tri[:, 1] - old_tri[:, 0], old_tri[:, 2] - old_tri[:, 0])
        area, old_area = np.linalg.norm(cross, axis=1), np.linalg.norm(old_cross, axis=1)
        cosine = np.einsum("ij,ij->i", cross, old_cross) / np.maximum(area * old_area, 1e-30)
        if not np.isfinite(q).all() or np.any(area < 1e-10) or np.any(area < .20 * old_area) or np.any(cosine <= 0):
            return None, {"failed_owner": name, "minimum_cross": float(area.min()),
                          "minimum_area_ratio": float((area / old_area).min()),
                          "minimum_original_face_cosine": float(cosine.min())}
        candidate[name] = (q, f)
        if name in proposals:
            distance = np.linalg.norm(q - p, axis=1)
            reports[name.removeprefix(PREFIX)] = {"changed_vertices": int((distance > 1e-6).sum()),
                    "maximum_move_metres": float(distance.max()), "maximum_abs_y_move": float(np.abs(q[:, 1] - p[:, 1]).max()),
                    "minimum_original_face_cosine": float(cosine.min()), "minimum_area_ratio": float((area / old_area).min()),
                    "bounds_before": [p.min(axis=0).tolist(), p.max(axis=0).tolist()],
                    "bounds_after": [q.min(axis=0).tolist(), q.max(axis=0).tolist()]}
    return candidate, reports


def assert_no_apron_invasion(points, faces, label):
    if label == BODY_NAME:
        clearing_faces(points, faces, audit=True)
        return
    tri = points[faces]
    possible = ((tri[:, :, 0].max(axis=1) > -16) & (tri[:, :, 0].min(axis=1) < 16)
                & (tri[:, :, 2].max(axis=1) > -16) & (tri[:, :, 2].min(axis=1) < 10)
                & (tri[:, :, 1].max(axis=1) > 4.80001))
    for face_id in np.flatnonzero(possible):
        polygon, area = clip_rectangle(tri[face_id])
        if area > 1e-7 and float(polygon[:, 1].max()) > 4.80001:
            raise RuntimeError("R6 geometry invades the true reserved clearing: " + label + " face=" + str(face_id))


def apply_geometry(candidate):
    for obj in OBJECTS:
        if obj.name not in SELECTED_NAMES:
            continue
        p = candidate[obj.name][0]
        native = np.stack((p[:, 0], -p[:, 2], p[:, 1]), axis=1).astype(np.float32)
        obj.data.vertices.foreach_set("co", native.ravel())
        obj.data.update()
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
        raise RuntimeError("R6 expected only actual triangular polygons: " + obj.name)
    normals = np.empty(len(mesh.polygons) * 3, dtype=np.float32)
    mesh.polygons.foreach_get("normal", normals)
    n = normals.reshape(-1, 3)
    face_normal = np.stack((n[:, 0], n[:, 2], -n[:, 1]), axis=1)
    corner_normal = np.repeat(face_normal, 3, axis=0)
    corners = points[ids]
    boundary, tint = geological_cells(points)
    cover, moss, clefts = organic_fields(points)
    joint = 1 - smooth(.02, .13, boundary)
    warm = np.array((.57, .51, .41))
    cool = np.array((.17, .26, .39))
    cool_mix = .42 * clefts + .12 * joint
    stone = (warm[None, :] * (1 - cool_mix[:, None]) + cool[None, :] * cool_mix[:, None])
    stone *= (.90 + .08 * tint)[:, None]
    stone *= (1 - .10 * joint)[:, None]
    honey = np.array((.66, .40, .14))[None, :] * (.94 + .06 * tint)[:, None]
    up = smooth(.34, .94, corner_normal[:, 1])
    if is_body:
        earth = up * np.maximum(.74, cover[ids]) * smooth(.20, 1.2, corners[:, 1])
    else:
        deposits = .56 + .31 * smooth(.30, .86, tint[ids])
        earth = up * np.maximum(.74 * cover[ids], deposits)
    rgb = stone[ids] * (1 - earth[:, None]) + honey[ids] * earth[:, None]
    sheltered = (1 - smooth(.72, .98, corner_normal[:, 1])) * smooth(.12, .72, corner_normal[:, 1])
    green = moss[ids] * sheltered * .70
    rgb = rgb * (1 - green[:, None]) + np.array((.26, .34, .09))[None, :] * green[:, None]
    wet = (1 - smooth(-.10, .85, corners[:, 1])) * .21
    rgb *= (1 - wet)[:, None]
    rgba = np.concatenate((np.clip(rgb, 0, 1), np.ones((len(rgb), 1))), axis=1).astype(np.float32)
    attr = mesh.color_attributes.get(COLOR_NAME)
    if attr is None or attr.data_type != "FLOAT_COLOR" or attr.domain != "CORNER":
        raise RuntimeError("R6 unexpected existing COLOR_0 ownership: " + obj.name)
    attr.data.foreach_set("color", rgba.ravel())
    if obj.name in SELECTED_NAMES:
        # Only22 geometry-selected owners refresh UV using actual new normals;
        # the other22 preserve original exact UV/corner normals.
        axis = np.argmax(np.abs(corner_normal), axis=1)
        uv = np.empty((len(corners), 2), dtype=np.float32)
        for a, plane in enumerate(((2, 1), (0, 2), (0, 1))):
            selection = axis == a
            uv[selection] = corners[selection][:, plane] / 6.4
        mesh.uv_layers.active.data.foreach_set("uv", uv.ravel())
    mesh.update()
    return {"name": obj.name, "rgb_min": rgba[:, :3].min(axis=0).tolist(),
            "rgb_max": rgba[:, :3].max(axis=0).tolist()}



def audit_sources():
    reports, triangle_count = [], 0
    for obj in OBJECTS:
        p, f, co_hash, uv_hash, normal_hash = snapshot(obj)
        old_p, old_f, old_hash, old_uv, old_normal = ORIGINAL[obj.name]
        if not np.isfinite(p).all() or not np.array_equal(f, old_f):
            raise RuntimeError("R6 source topology/finite ownership changed: " + obj.name)
        if obj.name not in SELECTED_NAMES and (co_hash != old_hash or uv_hash != old_uv or normal_hash != old_normal):
            raise RuntimeError("R6 changed unselected source geometry/UV/normals: " + obj.name)
        if obj.name in SELECTED_NAMES and not np.array_equal(p[PROTECTED[obj.name]], old_p[PROTECTED[obj.name]]):
            raise RuntimeError("R6 changed protected contact/collar/route points: " + obj.name)
        if obj == BODY and not np.array_equal(p[:, [0, 2]], old_p[:, [0, 2]]):
            raise RuntimeError("R6 changed continuous body XZ")
        if underwater_digest(p, f) != UNDERWATER[obj.name]:
            raise RuntimeError("R6 changed actual oriented submerged source: " + obj.name)
        assert_no_apron_invasion(p, f, obj.name)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        closed = all(edge.is_manifold for edge in bm.edges)
        volume = bm.calc_volume(signed=True)
        bm.free()
        if not closed or not math.isfinite(volume) or volume <= 0:
            raise RuntimeError("R6 source is not closed positive: " + obj.name)
        tri = p[f]
        c = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        area = np.linalg.norm(c, axis=1)
        if np.any(area < 1e-10):
            raise RuntimeError("R6 zero-area source: " + obj.name)
        loops = np.asarray([t.loops[:] for t in obj.data.loop_triangles], dtype=np.int32)
        normals = np.asarray([n.vector[:] for n in obj.data.corner_normals], dtype=np.float64)
        normals = np.stack((normals[:, 0], normals[:, 2], -normals[:, 1]), axis=1)
        avg = normals[loops].sum(axis=1)
        dot = np.einsum("ij,ij->i", c, avg) / np.maximum(area * np.linalg.norm(avg, axis=1), 1e-30)
        if not np.isfinite(normals).all() or np.any(dot < -.05):
            raise RuntimeError("R6 source normal opposition: " + obj.name)
        uv = np.asarray([v.uv[:] for v in obj.data.uv_layers.active.data], dtype=np.float64)
        u = uv[loops]
        det = cross2(u[:, 1] - u[:, 0], u[:, 2] - u[:, 0])
        if not np.isfinite(uv).all() or np.any(np.abs(det) < 1e-14):
            raise RuntimeError("R6 source UV degeneration: " + obj.name)
        color = np.asarray([v.color[:] for v in obj.data.color_attributes[COLOR_NAME].data])
        if not np.isfinite(color).all() or not np.all(np.ptp(color[:, :3], axis=0) > 1e-5):
            raise RuntimeError("R6 source missing/constant pigment: " + obj.name)
        expected = EARTH if obj == BODY else ROCK
        if len(obj.data.materials) != 1 or obj.data.materials[0] != expected:
            raise RuntimeError("R6 original single-slot PBR lost: " + obj.name)
        triangle_count += len(f)
        report = {"name": obj.name, "source_vertices": len(p), "triangles": len(f), "closed_positive": True,
                  "signed_volume": volume, "source_co_sha256": co_hash, "source_uv_sha256": uv_hash,
                  "source_corner_normal_sha256": normal_hash, "minimum_cross_length": float(area.min()),
                  "minimum_uv_determinant": float(np.abs(det).min()), "minimum_normal_dot": float(dot.min()),
                  "submerged_sha256": UNDERWATER[obj.name][0], "submerged_triangles": UNDERWATER[obj.name][1]}
        if obj.name in SELECTED_NAMES:
            report["protected_point_sha256"] = digest(np.asarray(p[PROTECTED[obj.name]], dtype=np.float32))
        reports.append(report)
    if triangle_count != 109088 or triangle_count > 180000:
        raise RuntimeError("R6 triangle count/budget changed")
    for material in (ROCK, EARTH):
        if material_digest(material) != MATERIALS[material.name]:
            raise RuntimeError("R6 changed PBR definition: " + material.name)
    for image, sha in PNGS:
        if hashlib.sha256(bytes(image.packed_file.data)).hexdigest() != sha:
            raise RuntimeError("R6 original PNG changed")
    _, apron = clearing_faces(gltf_points(BODY.data), ORIGINAL[BODY_NAME][1], audit=True)
    final = {obj.name: snapshot(obj) for obj in OBJECTS}
    _, final_pairs, contact_report = all_surface_contacts(final, BASELINE_CONTACTS)
    if contact_report["new_contact"] or final_pairs != BASELINE_CONTACTS:
        raise RuntimeError("R6 final actual surface contact-pair parity failed: " + repr(contact_report["new_contact"]))
    return {"meshes": 44, "triangles": triangle_count, "hard_triangle_limit": 180000,
            "all_closed_positive": True, "zero_area": 0, "uv_degenerate": 0, "normal_opposition": 0,
            "body_xz_indices_exact": True, "all_indices_and_counts_exact": True,
            "all_original_submerged_geometry_exact": True, "sea_ring_vertices_exact": 256,
            "unselected_geometry_uv_corner_normals_exact": len(OBJECTS) - len(SELECTED_NAMES),
            "original_pbr_definitions_exact": 2, "original_packed_png_bytes_exact": 4,
            "protected_clearing_approach_contact_basal_points_exact": True,
            "actual_baseline_surface_pairs_exact": len(final_pairs), "new_surface_contacts": 0,
            "surface_contact_sha256": contact_report["surface_pair_sha256"],
            "not_union_self_intersection_or_art_approval": True, "clearing": apron,
            "sea_origin_y": 0, "foundation_y": -10, "source_details": reports,
            "no_runtime_map_physics_ocean_mutations": True}


ORIGINAL = {obj.name: snapshot(obj) for obj in OBJECTS}
if sum(len(item[1]) for item in ORIGINAL.values()) != 109088:
    raise RuntimeError("R6 requires actual R5 109088 source triangles")
bp, bf = ORIGINAL[BODY_NAME][:2]
if len(bp) != 7421 or len(bf) != 14838 or ORIGINAL[BODY_NAME][2] != BODY_SHA:
    raise RuntimeError("R6 fresh native R5 BODY co digest/count guard failed")
if (bp[:, 1] == 0).sum() != 256 or bp[:, 1].min() != -10:
    raise RuntimeError("R6 actual sea ring/foundation guard failed")
if len(SELECTED_NAMES) != 22 or not SELECTED_NAMES <= set(ORIGINAL):
    raise RuntimeError("R6 intended 22 geometry owners absent")
for short in PRIMARY:
    value = bpy.data.objects[PREFIX + short].get("r4_original_dominant_cap_plane")
    if not value or not 0 < json.loads(value)["cut_y"] < ORIGINAL[PREFIX + short][0][:, 1].max():
        raise RuntimeError("R6 genuine R4 cut metadata missing: " + short)
UNDERWATER = {name: underwater_digest(item[0], item[1]) for name, item in ORIGINAL.items()}
MATERIALS = {material.name: material_digest(material) for material in (ROCK, EARTH)}
PNGS = []
for material in (ROCK, EARTH):
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeTexImage" and node.image:
            image = node.image
            if image.packed_file is None or image.file_format != "PNG":
                raise RuntimeError("R6 original packed PNG absent")
            sha = hashlib.sha256(bytes(image.packed_file.data)).hexdigest()
            if EXPECTED_PNGS.get(image.name) != sha:
                raise RuntimeError("R6 original packed PNG guard mismatch")
            PNGS.append((image, sha))
if len(PNGS) != 4 or len({image.name for image, _ in PNGS}) != 4:
    raise RuntimeError("R6 requires four unchanged packed PNGs")
contact_masks, BASELINE_CONTACTS, baseline_contact_report = all_surface_contacts(ORIGINAL)
PROTECTED, protection_report, nearest = protection(ORIGINAL, contact_masks)
proposals = guarded_proposals(ORIGINAL, PROTECTED, nearest)
accepted, failures = None, []
for alpha in (1., .75, .5, .375):
    candidate, changed_report = candidate_geometry(ORIGINAL, proposals, alpha)
    if candidate is None:
        failures.append({"alpha": alpha, "geometry": changed_report})
        continue
    for name in SELECTED_NAMES:
        assert_no_apron_invasion(*candidate[name], name)
    _, pairs, contacts = all_surface_contacts(candidate, BASELINE_CONTACTS)
    if contacts["new_contact"] is not None:
        failures.append({"alpha": alpha, "contact": contacts["new_contact"]})
        continue
    if pairs != BASELINE_CONTACTS:
        raise RuntimeError("R6 moved a baseline contact despite its exact whole-face mask")
    body_report = changed_report[BODY_NAME.removeprefix(PREFIX)]
    primary_changed = [name for name in PRIMARY if changed_report[name]["changed_vertices"] >= 12
                       and changed_report[name]["maximum_move_metres"] >= .35]
    rear_changed = [name for name in REAR if changed_report[name]["changed_vertices"] >= 12
                    and changed_report[name]["maximum_move_metres"] >= .25]
    ledge_report = changed_report[LEDGE]
    if (body_report["changed_vertices"] < 120 or body_report["maximum_abs_y_move"] < .65
            or len(primary_changed) < 8 or len(rear_changed) < 4
            or ledge_report["changed_vertices"] < 15 or ledge_report["maximum_move_metres"] < .35):
        raise RuntimeError("R6 protection blocked substantive geometry, not success: "
                           + json.dumps({"body": body_report, "primary_significant": primary_changed,
                                         "rear_significant": rear_changed, "ledge": ledge_report}))
    accepted = candidate
    break
if accepted is None:
    raise RuntimeError("R6 substantive shape rejected at all explicit backtracking steps: " + json.dumps(failures))
apply_geometry(accepted)
painted = [paint(obj, obj == BODY) for obj in OBJECTS]
metrics = audit_sources()
ROOT["native_geological_recomposition_r6_audit_json"] = json.dumps(metrics, separators=(",", ":"))
ROOT["r6_scope"] = "Bare terrain,22 selected source-owner deformations; real contact/base/sea/approach/apron protection; no new geometry"
ROOT["r6_geometry_not_approval"] = "Reference-led native Blender, not automatic reconstruction or union/self-intersection/gameplay approval"
compact = {k: v for k, v in metrics.items() if k != "source_details"}
compact_protection = {name: {"protected": data["protected_vertices"], "free": data["free_vertices"],
                             "embedded_faces": data["embedding_faces_protected"],
                             "ambiguous_faces": data["ambiguous_embedding_faces_protected"]}
                      for name, data in protection_report.items()}
compact_changed = {name: {k: v for k, v in data.items() if not k.startswith("bounds_")}
                   for name, data in changed_report.items()}
ROOT["r6_protection_details_json"] = json.dumps(protection_report, separators=(",", ":"))
ROOT["r6_geometry_details_json"] = json.dumps(changed_report, separators=(",", ":"))
result = json.dumps({"recipe": "projects-island-v2-r6-geological-recomposition", "root": ROOT_NAME,
                     "audit": compact, "geometry": compact_changed, "protection": compact_protection,
                     "backtracking_alpha": alpha, "failed_backtracking_steps": failures,
                     "baseline_contacts": {k: v for k, v in baseline_contact_report.items() if k != "owner_pair_counts"},
                     "changed_geometry_owners": sum(r["changed_vertices"] > 0 for r in changed_report.values()),
                     "painted_owners": len(painted), "new_mesh_owners": 0, "new_vertices_triangles": 0,
                     "provider_requests": 0, "renders": 0, "no_automatic_reconstruction": True}, separators=(",", ":"))
if len(result.encode()) >= 14000:
    raise RuntimeError("R6 compact result unexpectedly exceeds14KiB")

