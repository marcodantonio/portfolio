"""Projects V2 R8 study: two eroded upper shoulders and a recessed saddle.

Apply only to the committed R7 native scene (R6 geometry plus R7 albedo).
Parent owns execution, ephemeral renders, export and acceptance. No provider,
export, camera, gameplay, tree, building or material operation occurs here.

Only Front_Low_Connecting_Ridge_Ledge and Rear_Connected_Low_Saddle change.
The former keeps its actual 2.9m attachment and a real lower collar; its NEW
roof has an asymmetric central bay, two shoulders and a 5.1m saddle. The latter
keeps every original non-roof triangle, moves only its upper roof/collar rim,
and retessellates the free part of that roof. Its original R4 cut is 4.87448m,
not .85m. Any triangle touching .85m or below stays oriented/attribute-exact.
The body, other42 owners, 832m² clearing, approaches and sea remain exact.

New upper embeddings are a named, spatially bounded sculpture policy, NOT a
claim that overlapping closed shells form a certified union. All other new
actual surface contacts fail. Closed positive source meshes, Float32 face/UV/
normal diagnostics and non-adjacent self-contact checks run before receipt.
Keep R4/R6/R7 recipes and receipts unchanged. No dropping degenerate faces.
"""
import hashlib
import json
import math
from collections import Counter

import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import delaunay_2d_cdt

PREFIX = "ProjectsIsland_V2_"
ROOT_NAME = PREFIX + "Origin_At_Sea_Level"
BODY_NAME = PREFIX + "Continuous_Connected_Coast_And_Bedrock"
LEDGE = PREFIX + "Front_Low_Connecting_Ridge_Ledge"
SADDLE = PREFIX + "Rear_Connected_Low_Saddle"
TARGETS = {LEDGE, SADDLE}
COLOR_NAME = "TerrainColour"
AUDIT_KEY = "native_upper_saddle_r8_audit_json"
ROOT = bpy.data.objects.get(ROOT_NAME)
ROCK = bpy.data.materials.get(PREFIX + "Limestone")
EARTH = bpy.data.materials.get(PREFIX + "HoneyEarth")
REQUIRED_IMAGES = {
    PREFIX + "Limestone_MetallicRoughness_1024",
    PREFIX + "Limestone_WornMicroNormal_512",
    PREFIX + "HoneyEarth_MetallicRoughness_1024",
    PREFIX + "HoneyEarth_WornMicroNormal_512",
    PREFIX + "Limestone_NeutralAlbedo_R7_1024",
    PREFIX + "HoneyEarth_NeutralAlbedo_R7_1024"}
CORRIDORS = (((4.6834, 26.3442), (0, 15), 2.75),
             ((29.0315, 1.296), (0, 15), 1.75))
CONTACT_EPS = 1e-6
ROOF_SPACING = .54
# Authored CCW XZ contour: a >3m recess, not a continuous straight beige rim.
LEDGE_ROOF = [(-20, -18), (-20, -20.5), (-17, -22.5), (-13, -23),
              (-9, -22.5), (-6, -22), (-3, -22.6), (0, -22.8),
              (3, -22.4), (6, -23), (10, -22.5), (13, -20.5),
              (12.5, -18.2), (9, -17.3), (7, -17.6), (4.5, -19.4),
              (2, -20.35), (-1, -20.8), (-4, -20.4), (-7, -19.1),
              (-10, -17.6), (-13, -17.2), (-17, -17.6)]


def require(condition, message):
    if not condition:
        raise RuntimeError("R8 " + message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(data):
    return sha(np.ascontiguousarray(data).tobytes())


def read_values(collection, field, width, dtype):
    values = np.empty(len(collection) * width, dtype=dtype)
    collection.foreach_get(field, values)
    require(np.isfinite(values).all(), "nonfinite " + field)
    return values.reshape(-1, width)


def snapshot(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    native = read_values(mesh.vertices, "co", 3, np.float32)
    p = np.stack((native[:, 0], native[:, 2], -native[:, 1]), axis=1).astype(np.float64)
    f = np.asarray([tuple(t.vertices) for t in mesh.loop_triangles], dtype=np.int32)
    loops = np.asarray([tuple(t.loops) for t in mesh.loop_triangles], dtype=np.int32)
    uv = [(layer.name, read_values(layer.data, "uv", 2, np.float32), bool(layer.active_render))
          for layer in mesh.uv_layers]
    colour = mesh.color_attributes.get(COLOR_NAME)
    require(colour is not None and colour.domain == "CORNER" and colour.data_type == "FLOAT_COLOR",
            "expected native corner pigment: " + obj.name)
    rgba = read_values(colour.data, "color", 4, np.float32)
    normals = np.asarray([n.vector[:] for n in mesh.corner_normals], dtype=np.float32)
    require(np.isfinite(normals).all(), "nonfinite corner normals")
    state = {"points": digest(native), "faces": digest(f), "tri_loops": digest(loops),
             "loops": digest(read_values(mesh.loops, "vertex_index", 1, np.int32)),
             "edges": digest(read_values(mesh.edges, "vertices", 2, np.int32)),
             "uv": [(n, digest(v), active) for n, v, active in uv],
             "active_uv": mesh.uv_layers.active_index, "colour": digest(rgba),
             "colour_count": len(mesh.color_attributes),
             "active_colour": mesh.color_attributes.active_color_index,
             "render_colour": mesh.color_attributes.render_color_index,
             "normals": digest(normals), "custom_normals": bool(mesh.has_custom_normals),
             "polygons": [(x.loop_start, x.loop_total, x.material_index, bool(x.use_smooth))
                          for x in mesh.polygons],
             "slots": [m.name if m else None for m in mesh.materials],
             "matrix": np.asarray(obj.matrix_world).tolist()}
    return {"p": p, "f": f, "loops": loops, "uv": uv, "rgba": rgba,
            "normals": normals, "state": state}


def scalar(value):
    if isinstance(value, (bool, int, float, str)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)


def material_state(material):
    nodes = {}
    for node in material.node_tree.nodes:
        state = {"type": node.bl_idname,
                 "inputs": [(s.identifier, scalar(s.default_value)) for s in node.inputs
                            if hasattr(s, "default_value")]}
        for field in ("layer_name", "attribute_name", "operation", "blend_type", "space", "uv_map",
                      "interpolation", "extension", "data_type", "clamp_factor", "clamp_result"):
            if hasattr(node, field):
                state[field] = scalar(getattr(node, field))
        if hasattr(node, "image"):
            state["image"] = node.image.name if node.image else None
        nodes[node.name] = state
    return {"nodes": nodes,
            "links": sorted((l.from_node.name, l.from_socket.identifier,
                             l.to_node.name, l.to_socket.identifier) for l in material.node_tree.links),
            "diffuse": list(material.diffuse_color), "roughness": material.roughness,
            "metallic": material.metallic, "use_nodes": material.use_nodes}


def oriented_key(triangle, payload=None):
    rows = []
    for i, p in enumerate(triangle):
        row = np.asarray(p, dtype=np.float32).tobytes()
        if payload is not None:
            row += np.asarray(payload[i], dtype=np.float32).tobytes()
        rows.append(row)
    return min(rows[0] + rows[1] + rows[2], rows[1] + rows[2] + rows[0],
               rows[2] + rows[0] + rows[1])


def face_digest(source, mode="submerged", attributes=False):
    p, f = source["p"], source["f"]
    triangles = p[f]
    mask = np.all(triangles[:, :, 1] <= 0, axis=1) if mode == "submerged" else np.any(
        triangles[:, :, 1] <= .85, axis=1)
    keys = []
    uv = source["uv"][0][1]
    for index in np.flatnonzero(mask):
        payload = np.concatenate((uv[source["loops"][index]],
                                  source["rgba"][source["loops"][index]]), axis=1) if attributes else None
        keys.append(oriented_key(triangles[index], payload))
    return {"sha256": sha(b"".join(sorted(keys))), "triangles": len(keys)}


def smooth(a, b, value):
    t = np.clip((value - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def cross2(a, b):
    return a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]


def area(poly):
    p = np.asarray(poly, dtype=np.float64)
    return float(np.sum(cross2(p, np.roll(p, -1, axis=0))) * .5)


def inside(point, poly):
    x, z = point
    answer = False
    for a, b in zip(poly, poly[1:] + poly[:1]):
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]:
            answer = not answer
    return answer


def segment_distance(point, a, b):
    point, a, b = np.asarray(point), np.asarray(a), np.asarray(b)
    d = b - a
    require(float(d @ d) > 0, "collapsed planar segment")
    t = np.clip(((point - a) @ d) / (d @ d), 0, 1)
    return float(np.linalg.norm(point - a - t * d))


def boundary(points, faces, ccw):
    counts, directions = Counter(), {}
    for a, b, c in faces:
        for start, end in ((a, b), (b, c), (c, a)):
            key = tuple(sorted((int(start), int(end))))
            counts[key] += 1
            directions[key] = (int(start), int(end))
    require(all(v <= 2 for v in counts.values()), "nonmanifold patch")
    edges = [directions[k] for k, n in counts.items() if n == 1]
    outgoing, incoming = {}, Counter()
    for a, b in edges:
        require(a not in outgoing, "branched patch boundary")
        outgoing[a] = b
        incoming[b] += 1
    require(edges and set(outgoing) == set(incoming) and all(v == 1 for v in incoming.values()),
            "patch is not one directed boundary")
    loop, current = [], min(outgoing)
    while current not in loop:
        loop.append(current)
        current = outgoing[current]
    require(current == loop[0] and len(loop) == len(edges), "multiple patch boundaries")
    if (area(points[loop][:, [0, 2]]) > 0) != ccw:
        loop.reverse()
    return loop


def contour_valid(poly):
    require(area(poly) > 0, "roof contour must be CCW")
    n = len(poly)
    for i in range(n):
        a, b = np.asarray(poly[i]), np.asarray(poly[(i + 1) % n])
        require(np.linalg.norm(a - b) > .04, "short authored contour edge")
        for j in range(i + 2, n):
            if (j + 1) % n == i:
                continue
            c, d = np.asarray(poly[j]), np.asarray(poly[(j + 1) % n])
            ab, cd = b - a, d - c
            require(not (cross2(ab, c - a) * cross2(ab, d - a) < 0 and
                         cross2(cd, a - c) * cross2(cd, b - c) < 0), "self-crossing authored outline")


def cdt(coords, edges, outer_count, label):
    original = np.asarray(coords, dtype=np.float32).astype(np.float64)
    result = delaunay_2d_cdt([Vector(tuple(p)) for p in original], edges,
                            [tuple(range(outer_count))], 1, 1e-8, True)
    out, _, triangles, orig_v, _, _ = result
    p = np.asarray([tuple(v) for v in out], dtype=np.float64)
    mapping = {}
    for index, ids in enumerate(orig_v):
        if ids:
            first = int(ids[0])
            require(all(np.linalg.norm(original[int(i)] - original[first]) <= 1e-9 for i in ids),
                    "CDT merged distinct coordinates: " + label)
            p[index] = original[first]
            for i in ids:
                require(int(i) not in mapping, "CDT duplicated input ID")
                mapping[int(i)] = index
    require(all(i in mapping for i in range(len(original))), "CDT dropped a source sample: " + label)
    require(len(mapping) == len(p), "unexpected constraint intersection/new CDT sample: " + label)
    faces, counts = [], Counter()
    for triangle in triangles:
        require(len(triangle) == 3, "nontriangular CDT face")
        a, b, c = map(int, triangle)
        sign = area(p[[a, b, c]])
        require(abs(sign) >= 1e-12, "collapsed planar CDT face: " + label)
        faces.append((a, c, b) if sign > 0 else (a, b, c))
        for u, v in ((a, b), (b, c), (c, a)):
            counts[tuple(sorted((u, v)))] += 1
    for i in range(outer_count):
        require(counts[tuple(sorted((mapping[i], mapping[(i + 1) % outer_count])))] == 1,
                "CDT subdivided/lost exact boundary edge")
    return p, faces, mapping


def shoulder_height(x, z):
    # Two unequal eroded masses, not three repetitions of the same folded cap.
    left = max(0., 1 - ((x + 13) / 7.8) ** 2 - ((z + 20) / 3.2) ** 2) ** 1.25
    right = max(0., 1 - ((x - 8) / 5.2) ** 2 - ((z + 20.4) / 2.6) ** 2) ** 1.15
    return 5.1 + 2.5 * left + 1.4 * right


def saddle_move(point):
    x, y, z = point
    weight = float(smooth(-20, -17, x) * (1 - smooth(10, 13, x)) * smooth(-25, -17, z))
    left = max(0., 1 - ((x + 13) / 7.8) ** 2 - ((z + 20) / 3.2) ** 2) ** 1.25
    right = max(0., 1 - ((x - 8) / 5.2) ** 2 - ((z + 20.4) / 2.6) ** 2) ** 1.15
    shift = (3.6 - 1.55 * left - 1.15 * right) * weight
    return np.asarray((x, y + (shoulder_height(x, z) - y) * weight, z - shift), dtype=np.float32).astype(np.float64), weight


def add_vertex(vertices, lookup, point):
    p = np.asarray(point, dtype=np.float32).astype(np.float64)
    key = tuple(p)
    if key not in lookup:
        lookup[key] = len(vertices)
        vertices.append(p.tolist())
    return lookup[key]


def clip_lower(source, cut):
    """Triangle clipping to the REAL collar, retaining source face provenance."""
    p, f = source["p"], source["f"]
    cut = float(np.float32(cut))
    vertices, faces, origins, lookup, intersections = [], [], [], {}, {}
    for face_id, ids in enumerate(f):
        triangle = p[ids]
        if np.all(triangle[:, 1] > cut):
            continue
        poly, a, previous_id = [], triangle[-1], int(ids[-1])
        da = cut - a[1]
        for next_id in ids:
            next_id = int(next_id)
            b, db = p[next_id], cut - p[next_id, 1]
            if (da >= 0) != (db >= 0):
                edge = tuple(sorted((previous_id, next_id)))
                if edge not in intersections:
                    aa, bb = p[list(edge)]
                    q = np.asarray(aa + (bb - aa) * ((cut - aa[1]) / (bb[1] - aa[1])), dtype=np.float32).astype(np.float64)
                    q[1] = cut
                    intersections[edge] = q
                poly.append(intersections[edge])
            if db >= 0:
                poly.append(b)
            a, da, previous_id = b, db, next_id
        indices = []
        for q in poly:
            index = add_vertex(vertices, lookup, q)
            if not indices or indices[-1] != index:
                indices.append(index)
        if len(indices) > 1 and indices[0] == indices[-1]:
            indices.pop()
        for k in range(1, len(indices) - 1):
            face = (indices[0], indices[k], indices[k + 1])
            # Only topological duplicate endpoints disappear during clipping;
            # never discard a genuine face because its measured area is small.
            if len(set(face)) == 3:
                faces.append(face)
                origins.append(face_id)
    loop = boundary(np.asarray(vertices), np.asarray(faces), True)
    require(np.all(np.asarray(vertices)[loop, 1] == cut), "not a real horizontal collar cut")
    return vertices, faces, origins, loop


def rotate_west(loop, points):
    position = min(range(len(loop)), key=lambda i: (points[loop[i]][0], points[loop[i]][2]))
    return loop[position:] + loop[:position]


def zipper(lower, upper, points):
    """Closed annular collar, normalized arc-length correspondence; no floor."""
    lower, upper = rotate_west(lower, points), rotate_west(upper, points)
    def cumulative(loop):
        q = np.asarray(points)[loop][:, [0, 2]]
        lengths = np.linalg.norm(np.roll(q, -1, axis=0) - q, axis=1)
        require(np.all(lengths > 0), "collapsed collar boundary edge")
        return np.concatenate(([0], np.cumsum(lengths))) / lengths.sum()
    a, b = cumulative(lower), cumulative(upper)
    i = j = 0
    output = []
    while i < len(lower) or j < len(upper):
        li, ui = lower[i % len(lower)], upper[j % len(upper)]
        if j == len(upper) or (i < len(lower) and a[i + 1] <= b[j + 1]):
            output.append((lower[(i + 1) % len(lower)], li, ui))
            i += 1
        else:
            output.append((li, ui, upper[(j + 1) % len(upper)]))
            j += 1
    return output


def build_ledge(source):
    # Safely spaced from actual old vertices, above its authored 2.9m base.
    candidates = np.asarray([np.float32(3.25 + d) for d in np.linspace(-.015, .015, 31)])
    cut = float(max(candidates, key=lambda y: float(np.min(np.abs(source["p"][:, 1] - y)))))
    require(float(np.min(np.abs(source["p"][:, 1] - cut))) > 1e-6, "no safe actual ledge slice")
    vertices, faces, origins, lower = clip_lower(source, cut)
    contour_valid(LEDGE_ROOF)
    coords = list(LEDGE_ROOF)
    edges = [(i, (i + 1) % len(coords)) for i in range(len(coords))]
    for row, z in enumerate(np.arange(-22.75, -17.3, ROOF_SPACING)):
        for x in np.arange(-19.7 + (row % 2) * ROOF_SPACING * .5, 12.7, ROOF_SPACING):
            q = (float(x), float(z))
            if inside(q, LEDGE_ROOF) and min(segment_distance(q, a, b) for a, b in
                    zip(LEDGE_ROOF, LEDGE_ROOF[1:] + LEDGE_ROOF[:1])) > .20:
                coords.append(q)
    top, triangles, mapping = cdt(coords, edges, len(LEDGE_ROOF), "eroded ledge")
    offset = len(vertices)
    vertices.extend([float(x), float(np.float32(shoulder_height(x, z))), float(z)] for x, z in top)
    faces.extend(tuple(offset + i for i in f) for f in triangles)
    origins.extend([None] * len(triangles))
    upper = [offset + mapping[i] for i in range(len(LEDGE_ROOF))]
    collar = zipper(lower, upper, vertices)
    faces.extend(collar)
    origins.extend([None] * len(collar))
    return vertices, faces, origins, {"cut_y": cut, "original_base_y": 2.9,
        "lower_boundary_vertices": len(lower), "roof_boundary_vertices": len(upper),
        "roof_triangles": len(triangles), "roof_outline_xz": LEDGE_ROOF,
        "central_front_recess_metres": 3.65, "saddle_target_y": 5.1,
        "shoulder_peak_targets_y": [7.6, 6.5]}


def build_saddle(obj, source):
    p, f = source["p"], source["f"]
    metadata = json.loads(obj.get("r4_original_dominant_cap_plane", "{}"))
    cut = metadata.get("cut_y")
    require(cut is not None and abs(cut - 4.874480724334717) < 1e-7, "unexpected actual saddle attachment")
    roof_mask = np.all(p[f, 1] > cut + 1e-6, axis=1)
    roof = f[roof_mask]
    require(len(roof) == 3568, "R6 saddle roof identification changed")
    cross = np.cross(p[roof[:, 1]] - p[roof[:, 0]], p[roof[:, 2]] - p[roof[:, 0]])
    require(np.all(cross[:, 1] > 0), "original roof is not a height field")
    outer = boundary(p, roof, True)
    require(len(outer) == 190, "actual saddle roof boundary changed")
    used = list(outer) + sorted(set(map(int, roof.ravel())) - set(outer))
    source_id = {old: i for i, old in enumerate(used)}
    moved, weights = zip(*(saddle_move(p[i]) for i in used))
    moved, weights = np.asarray(moved), np.asarray(weights)
    # Positive projected areas certify the original piecewise-linear XZ map,
    # before CDT replaces its freely authored central triangles.
    mapped = moved[np.asarray([[source_id[int(i)] for i in face] for face in roof])]
    projected = -cross2(mapped[:, 1][:, [0, 2]] - mapped[:, 0][:, [0, 2]],
                        mapped[:, 2][:, [0, 2]] - mapped[:, 0][:, [0, 2]])
    require(np.all(projected > 1e-10), "recess folds original projected roof")
    coords = moved[:, [0, 2]].tolist()
    constraints = {tuple(sorted((i, (i + 1) % len(outer)))) for i in range(len(outer))}
    # Keep every original edge outside the edited zone. Old contact geometry
    # there is retained, rather than accepted by a blanket pair-name waiver.
    for face in roof:
        for a, b in ((face[0], face[1]), (face[1], face[2]), (face[2], face[0])):
            ia, ib = source_id[int(a)], source_id[int(b)]
            if min(weights[ia], weights[ib]) <= .001:
                constraints.add(tuple(sorted((ia, ib))))
    top, triangles, mapping = cdt(coords, sorted(constraints), len(outer), "recessed saddle")
    reverse = {new: old for old, new in mapping.items()}
    # The constrained roof uses all real samples; new topology and strong
    # silhouette replace the repeated cap planes, without an approximate height
    # sampler over the protected source outside the edit window.
    vertices = p.tolist()
    for old_id, new_point in zip(used, moved):
        vertices[old_id] = new_point.tolist()
    new_to_source = {new: used[reverse[new]] for new in range(len(top))}
    faces = [tuple(map(int, face)) for face in f[~roof_mask]]
    origins = list(map(int, np.flatnonzero(~roof_mask)))
    faces.extend(tuple(new_to_source[i] for i in face) for face in triangles)
    origins.extend([None] * len(triangles))
    exact_faces = {oriented_key(p[face]): i for i, face in enumerate(f)}
    for i, face in enumerate(faces):
        key = oriented_key(np.asarray(vertices)[list(face)])
        origins[i] = exact_faces.get(key) if key in exact_faces else None
    delta = np.linalg.norm(moved - p[used], axis=1)
    return vertices, faces, origins, {"actual_retained_r4_cut_y": cut,
        "old_roof_triangles": len(roof), "new_roof_triangles": len(triangles),
        "unchanged_nonroof_topology_triangles": int((~roof_mask).sum()),
        "roof_boundary_vertices": len(outer), "changed_roof_vertices": int((delta > 0).sum()),
        "maximum_actual_roof_displacement_metres": float(delta.max()),
        "minimum_original_mapped_projected_double_area": float(projected.min()),
        "edit_window_xz": [-20, 13, -25, -15.6],
        "rear_feather_note": "Two-metre transition behind the main -23..-17 sculpture window",
        "saddle_target_y": 5.1}


def geological_cells(points):
    # Same R6 source pigment field. This is colour, never geometry noise.
    q = points / np.array((2.8, 4.4, 2.8))
    q[:, 0] += q[:, 1] * .13
    q[:, 2] -= q[:, 1] * .10
    base = np.floor(q)
    first, second, tint = np.full(len(q), np.inf), np.full(len(q), np.inf), np.zeros(len(q))
    def hashed(cell, seed):
        value = np.sin(cell[:, 0] * 127.1 + cell[:, 1] * 311.7 + cell[:, 2] * 74.7 + seed) * 43758.5453123
        return value - np.floor(value)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cell = base + (dx, dy, dz)
                centre = cell + np.stack((.17 + .66 * hashed(cell, 7.3), .17 + .66 * hashed(cell, 16.47),
                                         .17 + .66 * hashed(cell, 30.71)), axis=1)
                distance = np.sum((centre - q) ** 2, axis=1)
                closer = distance < first
                second = np.where(closer, first, np.minimum(second, distance))
                first = np.where(closer, distance, first)
                tint = np.where(closer, hashed(cell, 45.1), tint)
    return np.sqrt(second) - np.sqrt(first), tint


def ribbon(points, path, widths):
    field = np.zeros(len(points))
    xz = points[:, [0, 2]]
    for a, b, w0, w1 in zip(path, path[1:], widths, widths[1:]):
        a, b = np.asarray(a), np.asarray(b)
        d = b - a
        t = np.clip(np.sum((xz - a) * d, axis=1) / np.dot(d, d), 0, 1)
        distance = np.linalg.norm(xz - a - t[:, None] * d, axis=1)
        width = w0 + (w1 - w0) * t
        field = np.maximum(field, 1 - smooth(width * .62, width * 1.22, distance))
    return field


def source_pigment(points, normals):
    boundary, tint = geological_cells(points)
    soil = np.zeros(len(points))
    for centre, radii, angle in (((-3, -2), (14, 11), -.18), ((5, 2), (12, 9), .25), ((-8, 6), (9, 7), -.12)):
        q = points[:, [0, 2]] - centre
        ca, sa = math.cos(angle), math.sin(angle)
        q = np.stack((ca * q[:, 0] + sa * q[:, 1], -sa * q[:, 0] + ca * q[:, 1]), axis=1)
        soil = np.maximum(soil, 1 - smooth(.87, 1.09, np.linalg.norm(q / radii, axis=1)))
    for path, widths in ((((0, -9), (-6, -18), (-11, -23)), (4.1, 3.1, 1.2)),
                         (((6, -4), (13, -15), (17, -21)), (3.4, 2.6, 1.3)),
                         (((-9, 4), (-20, 12), (-23, 18)), (3.6, 2.8, 1.1))):
        soil = np.maximum(soil, ribbon(points, path, widths) * .72)
    for a, b, radius in CORRIDORS:
        a, b = np.asarray(a), np.asarray(b)
        d = b - a
        t = np.clip(np.sum((points[:, [0, 2]] - a) * d, axis=1) / (d @ d), 0, 1)
        distance = np.linalg.norm(points[:, [0, 2]] - a - t[:, None] * d, axis=1)
        soil = np.maximum(soil, 1 - smooth(radius * .8, radius + 1.5, distance))
    intrusion, moss, clefts = np.zeros(len(points)), np.zeros(len(points)), np.zeros(len(points))
    for path in (((-27, 10), (-19, 8), (-13, 4)), ((4, -27), (2, -18), (-1, -12)), ((27, -7), (19, -7), (13, -4))):
        intrusion = np.maximum(intrusion, ribbon(points, path, (2.5, 1.8, 1.2)))
    soil *= 1 - .60 * intrusion
    for path in (((-31, 5), (-29, 13), (-27, 22)), ((-24, -21), (-12, -28), (4, -31)),
                 ((20, -23), (27, -14), (29, -5)), ((-17, 30), (-8, 33), (1, 31))):
        moss = np.maximum(moss, ribbon(points, path, (1.4, 2.0, 1.0)))
    moss = np.clip(moss * (1 - soil) * smooth(.8, 2., points[:, 1]), 0, .35)
    for path in (((-30, 7), (-27, 16), (-24, 23)), ((-19, 24), (-17, 30), (-17, 34)),
                 ((7, 22), (9, 27), (11, 32)), ((29, -18), (27, -8), (27, 3))):
        clefts = np.maximum(clefts, ribbon(points, path, (.65, .95, .55)))
    joint = 1 - smooth(.02, .13, boundary)
    cool_mix = .42 * clefts + .12 * joint
    stone = np.array((.57, .51, .41)) * (1 - cool_mix[:, None]) + np.array((.17, .26, .39)) * cool_mix[:, None]
    stone *= ((.90 + .08 * tint) * (1 - .10 * joint))[:, None]
    honey = np.array((.66, .40, .14)) * (.94 + .06 * tint)[:, None]
    earth = smooth(.34, .94, normals[:, 1]) * np.maximum(.74 * soil, .56 + .31 * smooth(.30, .86, tint))
    rgb = stone * (1 - earth[:, None]) + honey * earth[:, None]
    sheltered = (1 - smooth(.72, .98, normals[:, 1])) * smooth(.12, .72, normals[:, 1])
    green = moss * sheltered * .70
    rgb = rgb * (1 - green[:, None]) + np.array((.26, .34, .09)) * green[:, None]
    rgb *= (1 - (1 - smooth(-.10, .85, points[:, 1])) * .21)[:, None]
    return np.concatenate((np.clip(rgb, 0, 1), np.ones((len(points), 1))), axis=1).astype(np.float32)


def barycentric(point, triangle):
    v0, v1, q = triangle[1] - triangle[0], triangle[2] - triangle[0], point - triangle[0]
    d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1
    denominator = d00 * d11 - d01 * d01
    require(denominator > 1e-20, "cannot interpolate a degenerate source face")
    b = (d11 * (q @ v0) - d01 * (q @ v1)) / denominator
    c = (d00 * (q @ v1) - d01 * (q @ v0)) / denominator
    return np.asarray((1 - b - c, b, c))


def install(obj, source, vertices, faces, origins):
    mesh = bpy.data.meshes.new(obj.name + "_R8_Upper_Sculpture")
    mesh.from_pydata([(x, -z, y) for x, y, z in vertices], [], faces)
    mesh.materials.append(ROCK)
    mesh.update()
    require(all(p.loop_total == 3 for p in mesh.polygons), "nontriangular authored face")
    require(all(not p.use_smooth for p in obj.data.polygons) and not obj.data.has_custom_normals,
            "unexpected old selected corner-normal ownership")
    uv = mesh.uv_layers.new(name=source["uv"][0][0])
    uv.active_render = True
    colour = mesh.color_attributes.new(name=COLOR_NAME, type="FLOAT_COLOR", domain="CORNER")
    mesh.color_attributes.active_color_index = 0
    mesh.color_attributes.render_color_index = 0
    p = np.asarray(vertices, dtype=np.float32).astype(np.float64)
    corner_ids = np.asarray([i for f in faces for i in f])
    cross = np.cross(p[np.asarray(faces)[:, 1]] - p[np.asarray(faces)[:, 0]],
                     p[np.asarray(faces)[:, 2]] - p[np.asarray(faces)[:, 0]])
    lengths = np.linalg.norm(cross, axis=1)
    require(np.all(lengths >= 1e-10), "authored Float32 zero-area face")
    normals = np.repeat(cross / lengths[:, None], 3, axis=0)
    corners = p[corner_ids]
    rgba = source_pigment(corners, normals)
    projected = np.empty((len(corners), 2), dtype=np.float32)
    axis = np.argmax(np.abs(normals), axis=1)
    for a, plane in enumerate(((2, 1), (0, 2), (0, 1))):
        selected = axis == a
        projected[selected] = corners[selected][:, plane] / 6.4
    for new_id, old_id in enumerate(origins):
        if old_id is None:
            continue
        old_triangle = source["p"][source["f"][old_id]]
        old_loops = source["loops"][old_id]
        for corner in range(3):
            point = corners[new_id * 3 + corner]
            exact = np.flatnonzero(np.all(old_triangle == point, axis=1))
            if len(exact):
                weights = np.eye(3)[int(exact[0])]
            else:
                weights = barycentric(point, old_triangle)
            projected[new_id * 3 + corner] = weights @ source["uv"][0][1][old_loops]
            rgba[new_id * 3 + corner] = weights @ source["rgba"][old_loops]
    uv.data.foreach_set("uv", projected.ravel())
    colour.data.foreach_set("color", rgba.ravel())
    for poly in mesh.polygons:
        poly.use_smooth = False
    mesh.update()
    # No recalc/delete/filter operation may silently repair wrong winding.
    obj.data = mesh
    return mesh


def contact_sat(one, others):
    if not len(others):
        return np.empty(0, dtype=bool)
    ea = np.roll(one, -1, axis=0) - one
    eb = np.roll(others, -1, axis=1) - others
    na, nb = np.cross(ea[0], ea[1]), np.cross(eb[:, 0], eb[:, 1])
    require(np.linalg.norm(na) >= 1e-12 and np.all(np.linalg.norm(nb, axis=1) >= 1e-12),
            "degenerate SAT input")
    count = len(others)
    ae, an = np.broadcast_to(ea, (count, 3, 3)), np.broadcast_to(na, (count, 3))
    axes = np.concatenate((an[:, None, :], nb[:, None, :],
        np.cross(ae[:, :, None, :], eb[:, None, :, :]).reshape(count, 9, 3),
        np.cross(an[:, None, :], ae), np.cross(nb[:, None, :], eb)), axis=1)
    lengths = np.linalg.norm(axes, axis=2)
    axes /= np.maximum(lengths[:, :, None], 1e-30)
    p, q = np.einsum("aj,nkj->nak", one, axes), np.einsum("naj,nkj->nak", others, axes)
    separated = ((p.max(axis=1) < q.min(axis=1) - CONTACT_EPS) |
                 (q.max(axis=1) < p.min(axis=1) - CONTACT_EPS)) & (lengths >= 1e-12)
    return ~separated.any(axis=1)


def tree(source):
    return BVHTree.FromPolygons(source["p"].tolist(), source["f"].tolist(), all_triangles=True, epsilon=0)


def contacts(one, other, one_tree, other_tree):
    candidates = one_tree.overlap(other_tree)
    a, b = one["p"][one["f"]], other["p"][other["f"]]
    grouped = {}
    for i, j in candidates:
        grouped.setdefault(i, []).append(j)
    for i, ids in grouped.items():
        indices = np.asarray(sorted(set(ids)), dtype=np.int32)
        for j in indices[contact_sat(a[i], b[indices])]:
            yield int(i), int(j)


def baseline_contacts(sources):
    trees = {n: tree(s) for n, s in sources.items()}
    output, counts = {}, {}
    for name in sorted(TARGETS):
        for other in sorted(sources):
            if other == name or (other in TARGETS and other < name):
                continue
            keys = set()
            for i, j in contacts(sources[name], sources[other], trees[name], trees[other]):
                keys.add((oriented_key(sources[name]["p"][sources[name]["f"][i]]),
                          oriented_key(sources[other]["p"][sources[other]["f"][j]])))
            output[(name, other)] = keys
            if keys:
                counts[name.removeprefix(PREFIX) + " / " + other.removeprefix(PREFIX)] = len(keys)
    return output, counts


# Explicit native-art embedding policy; it replaces R6's self-imposed contact
# position freeze ONLY in this authored upper zone. It is not a union proof.
EMBEDDING_PEERS = {
    LEDGE: {SADDLE, PREFIX + "Western_Broad_Second_Terrace"} |
           {PREFIX + f"Attached_Fracture_{i:02d}" for i in range(15, 21)},
    SADDLE: {LEDGE, PREFIX + "Western_Broad_Second_Terrace",
             PREFIX + "Cannon_Continuous_Middle_Terrace"} |
            {PREFIX + f"Attached_Fracture_{i:02d}" for i in range(15, 21)}}
EMBEDDING_BOX = np.asarray(((-21., 3.15, -25.01), (14., 9., -16.49)))


def check_contacts(sources, baseline):
    trees = {n: tree(s) for n, s in sources.items()}
    changed = Counter()
    old_exact = tested = 0
    for name in sorted(TARGETS):
        for other in sorted(sources):
            if other == name or (other in TARGETS and other < name):
                continue
            for i, j in contacts(sources[name], sources[other], trees[name], trees[other]):
                tested += 1
                a, b = sources[name]["p"][sources[name]["f"][i]], sources[other]["p"][sources[other]["f"][j]]
                key = (oriented_key(a), oriented_key(b))
                if key in baseline[(name, other)]:
                    old_exact += 1
                    continue
                lo, hi = np.maximum(a.min(axis=0), b.min(axis=0)), np.minimum(a.max(axis=0), b.max(axis=0))
                require(other in EMBEDDING_PEERS[name] and np.all(lo >= EMBEDDING_BOX[0] - CONTACT_EPS)
                        and np.all(hi <= EMBEDDING_BOX[1] + CONTACT_EPS),
                        "undeclared new surface contact: " + repr((name, i, other, j, lo.tolist(), hi.tolist())))
                changed[name.removeprefix(PREFIX) + " / " + other.removeprefix(PREFIX)] += 1
    # Within each modified owner, all non-adjacent actual triangle surfaces are
    # checked. Shared-vertex triangles are excluded; this is NOT a complete
    # adjacent fold/volume-union certificate.
    self_tested = 0
    for name in sorted(TARGETS):
        source, own_tree = sources[name], trees[name]
        pairs = [(i, j) for i, j in own_tree.overlap(own_tree) if i < j and
                 not set(map(int, source["f"][i])).intersection(map(int, source["f"][j]))]
        grouped = {}
        for i, j in pairs:
            grouped.setdefault(i, []).append(j)
        triangles = source["p"][source["f"]]
        for i, ids in grouped.items():
            self_tested += len(ids)
            hit = np.asarray(ids)[contact_sat(triangles[i], triangles[ids])]
            require(not len(hit), "non-adjacent self-contact: " + repr((name, i, hit[:8].tolist())))
    return {"actual_surface_contacts_tested": tested, "retained_exact_contact_pairs": old_exact,
            "intentional_upper_embedding_pairs": dict(changed),
            "nonadjacent_self_triangle_candidates_tested": self_tested,
            "new_contacts_outside_policy": 0,
            "scope": "BVH candidates plus 3D SAT/in-plane coplanar axes; not union/containment/adjacent-fold proof"}


def rectangle_clip(triangle):
    polygon = list(triangle)
    for axis, bound, sign in ((0, -16, 1), (0, 16, -1), (2, -16, 1), (2, 10, -1)):
        clipped = []
        if not polygon:
            break
        a = polygon[-1]
        da = (a[axis] - bound) * sign
        for b in polygon:
            db = (b[axis] - bound) * sign
            if (da >= 0) != (db >= 0):
                clipped.append(a + (b - a) * da / (da - db))
            if db >= 0:
                clipped.append(b)
            a, da = b, db
        polygon = clipped
    return np.asarray(polygon)


def check_clear_apron(sources):
    body_area = 0.
    for name, source in sources.items():
        tri = source["p"][source["f"]]
        cross = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        candidates = ((tri[:, :, 0].max(axis=1) > -16) & (tri[:, :, 0].min(axis=1) < 16) &
                      (tri[:, :, 2].max(axis=1) > -16) & (tri[:, :, 2].min(axis=1) < 10))
        for t, n in zip(tri[candidates], cross[candidates]):
            clipped = rectangle_clip(t)
            if len(clipped) < 3:
                continue
            size = abs(area(clipped[:, [0, 2]]))
            if size <= 1e-7:
                continue
            if name == BODY_NAME and n[1] > 0 and float(t[:, 1].min()) >= .85:
                require(np.all(np.abs(clipped[:, 1] - 4.8) <= 1e-5), "body apron is not fully planar")
                body_area += size
            elif name != BODY_NAME:
                require(float(clipped[:, 1].max()) <= 4.80001, "upper sculpture invades reserved apron: " + name)
    require(abs(body_area - 832.) <= 1e-4, "full clipped body apron area changed")
    return {"clipped_upward_body_area_square_metres": body_area, "height": 4.8,
            "note": "Full upper-triangle clipping, not an independent union or physics proof"}


def route_digest(source):
    # Geometric corridor selection; retain oriented geometry and corner paint/
    # UV exactly. Closed crossing/contact is conservatively included by AABB.
    tri = source["p"][source["f"]]
    selected = np.zeros(len(tri), dtype=bool)
    for a, b, radius in CORRIDORS:
        a, b = np.asarray(a), np.asarray(b)
        lo, hi = np.minimum(a, b) - radius - 1.15, np.maximum(a, b) + radius + 1.15
        selected |= ((tri[:, :, [0, 2]].min(axis=1) <= hi) &
                     (tri[:, :, [0, 2]].max(axis=1) >= lo)).all(axis=1)
    uv = source["uv"][0][1]
    keys = [oriented_key(tri[i], np.concatenate((uv[source["loops"][i]],
            source["rgba"][source["loops"][i]]), axis=1)) for i in np.flatnonzero(selected)]
    return {"sha256": sha(b"".join(sorted(keys))), "triangles": len(keys),
            "selection": "Conservative corridor AABBs including radius plus1.15m feather"}


def mesh_diagnostics(obj, source):
    p, f = source["p"], source["f"]
    require(np.isfinite(p).all(), "nonfinite geometry: " + obj.name)
    tri = p[f]
    c = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    lengths = np.linalg.norm(c, axis=1)
    require(np.all(lengths >= 1e-10), "actual Float32 degenerate face: " + obj.name)
    keys = [oriented_key(t) for t in tri]
    require(len(set(keys)) == len(keys), "duplicate oriented face: " + obj.name)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    closed, volume = all(e.is_manifold for e in bm.edges), bm.calc_volume(signed=True)
    bm.free()
    require(closed and math.isfinite(volume) and volume > 0, "source is not closed positive: " + obj.name)
    loops = source["loops"]
    normals = source["normals"]
    normals = np.stack((normals[:, 0], normals[:, 2], -normals[:, 1]), axis=1).astype(np.float64)
    average = normals[loops].sum(axis=1)
    dots = np.einsum("ij,ij->i", c, average) / np.maximum(lengths * np.linalg.norm(average, axis=1), 1e-30)
    require(np.isfinite(normals).all() and np.all(dots >= -.05), "actual corner-normal opposition")
    uv = source["uv"][0][1][loops].astype(np.float64)
    determinant = np.abs(cross2(uv[:, 1] - uv[:, 0], uv[:, 2] - uv[:, 0]))
    require(np.isfinite(uv).all() and np.all(determinant >= 1e-14), "actual UV degeneration: " + obj.name)
    rgba = source["rgba"]
    require(np.isfinite(rgba).all() and np.all((rgba >= 0) & (rgba <= 1)) and
            np.all(np.ptp(rgba[:, :3], axis=0) > 1e-5), "missing/constant source pigment")
    require(source["state"]["slots"] == [(EARTH if obj.name == BODY_NAME else ROCK).name],
            "changed single-slot PBR ownership")
    return {"name": obj.name, "vertices": len(p), "triangles": len(f), "closed_positive": True,
            "signed_volume": float(volume), "minimum_float32_cross_length": float(lengths.min()),
            "minimum_uv_determinant": float(determinant.min()), "minimum_normal_dot": float(dots.min()),
            "source_state_sha256": sha(json.dumps(source["state"], sort_keys=True).encode())}


def fixtures():
    t = np.asarray(((0., 0., 0.), (2., 0., 0.), (0., 0., 2.)))
    require(contact_sat(t, np.asarray([t + (0, 2, 0)])).tolist() == [False], "separated SAT fixture")
    require(contact_sat(t, np.asarray([t * .25 + (.2, 0, .2)])).tolist() == [True], "coplanar contained SAT fixture")
    require(oriented_key(t) == oriented_key(np.roll(t, 1, axis=0)) and
            oriented_key(t) != oriented_key(t[[0, 2, 1]]), "winding digest fixture")
    failed = False
    try:
        contour_valid([(0, 0), (2, 2), (0, 2), (2, 0)])
    except RuntimeError:
        failed = True
    require(failed, "crossing contour negative fixture")
    return {"negative_fixtures": 3, "positive_fixtures": 2}


require(ROOT is not None and ROCK is not None and EARTH is not None, "missing actual R7 source")
require(ROOT.get("native_geological_recomposition_r6_audit_json") and
        ROOT.get("native_neutral_albedo_r7_audit_json") and not ROOT.get(AUDIT_KEY),
        "requires committed R7, not already applied R8")
require(ROOT.get("origin_semantics") == "Sea level, not a walking floor", "changed sea origin")
OBJECTS = sorted((o for o in ROOT.children if o.type == "MESH"), key=lambda o: o.name)
require(len(OBJECTS) == 44 and TARGETS <= {o.name for o in OBJECTS}, "not44 original mesh owners")
for owner in [ROOT] + OBJECTS:
    require(np.array_equal(np.asarray(owner.matrix_world), np.eye(4)), "unexpected asset transform")
    if owner in OBJECTS:
        require(len(owner.data.uv_layers) == 1 and owner.data.uv_layers.active.name == "UVMap",
                "unexpected native UV ownership")
ORIGINAL = {o.name: snapshot(o) for o in OBJECTS}
ORIGINAL_DATA = {o.name: o.data for o in OBJECTS if o.name in TARGETS}
require(sum(len(s["f"]) for s in ORIGINAL.values()) == 109088, "not actual R6/R7 source triangle count")
PNGS = {node.image.name: sha(bytes(node.image.packed_file.data)) for m in (ROCK, EARTH)
        for node in m.node_tree.nodes if node.type == "TEX_IMAGE" and node.image and node.image.packed_file}
require(set(PNGS) == REQUIRED_IMAGES, "R7 must retain exactly two neutral albedos plus four original MR/normal PNGs")
MATERIALS = {m.name: material_state(m) for m in (ROCK, EARTH)}
OLD_ROOT_AUDITS = {k: ROOT[k] for k in ROOT.keys() if k.startswith("native_") and k.endswith("_audit_json")}
UNDERWATER = {n: face_digest(s) for n, s in ORIGINAL.items()}
PROTECTED = {n: face_digest(s, "lower", True) for n, s in ORIGINAL.items()}
ROUTES = {n: route_digest(s) for n, s in ORIGINAL.items()}
BASELINE, baseline_counts = baseline_contacts(ORIGINAL)
fixture_report = fixtures()
reports = []
try:
    for obj in OBJECTS:
        if obj.name not in TARGETS:
            continue
        source = ORIGINAL[obj.name]
        vertices, faces, origins, report = build_ledge(source) if obj.name == LEDGE else build_saddle(obj, source)
        install(obj, source, vertices, faces, origins)
        reports.append({"name": obj.name, **report})
    FINAL = {o.name: snapshot(o) for o in OBJECTS}
    diagnostics = []
    for obj in OBJECTS:
        name, source = obj.name, FINAL[obj.name]
        if name not in TARGETS:
            require(source["state"] == ORIGINAL[name]["state"], "changed one of42 frozen owners: " + name)
        require(face_digest(source) == UNDERWATER[name], "oriented submerged source changed: " + name)
        require(face_digest(source, "lower", True) == PROTECTED[name], "triangle touching .85m changed: " + name)
        require(route_digest(source) == ROUTES[name], "prospective approach changed: " + name)
        diagnostics.append(mesh_diagnostics(obj, source))
    triangles = sum(r["triangles"] for r in diagnostics)
    require(triangles <= 180000, "editable study exceeds180000 triangles")
    apron = check_clear_apron(FINAL)
    contact_report = check_contacts(FINAL, BASELINE)
    for m in (ROCK, EARTH):
        require(material_state(m) == MATERIALS[m.name], "R7 PBR graph changed")
    current_pngs = {node.image.name: sha(bytes(node.image.packed_file.data)) for m in (ROCK, EARTH)
                   for node in m.node_tree.nodes if node.type == "TEX_IMAGE" and node.image and node.image.packed_file}
    require(current_pngs == PNGS, "R7 six packed PNGs changed")
    require(all(ROOT.get(k) == value for k, value in OLD_ROOT_AUDITS.items()), "historical native audit changed")
    for obj in OBJECTS:
        if obj.name in TARGETS:
            obj["r8_upper_sculpture"] = "Two unequal eroded shoulders, recessed 5.1m saddle; original lower source retained"
    result = {"revision": 8, "status": "Native source validation only; visual/export/runtime acceptance pending",
        "meshes": 44, "triangles": triangles, "hard_editable_triangle_limit": 180000,
        "modified_owners": sorted(TARGETS), "other42_full_source_states_exact": True,
        "body_full_state_exact": True, "all_triangles_touching_y085_geometry_uv_colour_exact": True,
        "all_oriented_submerged_triangle_multisets_exact": True,
        "prospective_approach_triangle_attributes_exact": True, "full_body_apron": apron,
        "two_pbr_graphs_and_six_png_bytes_exact": True, "png_sha256": PNGS,
        "source_diagnostics": diagnostics, "upper_sculptures": reports, "contacts": contact_report,
        "baseline_surface_contact_counts": baseline_counts, "fixtures": fixture_report,
        "intentional_upper_embedding_policy": {"owner_peers": {k: sorted(v) for k, v in EMBEDDING_PEERS.items()},
            "intersection_aabb_min_max": EMBEDDING_BOX.tolist(),
            "not_claimed": "Union/manifold of combined shells, contained-volume freedom, gameplay collision, full adjacent-fold proof"},
        "automatic_multiview_reconstruction": False, "runtime_integration": False}
    ROOT[AUDIT_KEY] = json.dumps(result, sort_keys=True, separators=(",", ":"))
except Exception:
    # Restore the two prior data owners; no previous mesh datablock is deleted.
    # Newly created unowned study meshes may remain for diagnosis in a failed
    # ephemeral query, but the R7 asset root is not left partially modified.
    for obj in OBJECTS:
        if obj.name in ORIGINAL_DATA:
            obj.data = ORIGINAL_DATA[obj.name]
    raise

R8_SOURCE_REPORT=result
r8_views=[]
R8_RENDER_HELPER="\"\"\"Read-only Higgsfield query. Prefix VIEW='hero'/'front'/'right'/'top'.\n\nCamera axes refer to glTF (+Y up, +Z front). Blender is +Z up.\nOnly the hero may add temporary water at sea level; this is not exported art.\n\"\"\"\nimport bpy\nfrom mathutils import Vector\n\nview = globals().get('VIEW', 'hero')\nassert view in ('hero', 'front', 'right', 'top')\nroot = bpy.data.objects['ProjectsIsland_V2_Origin_At_Sea_Level']\nmeshes = [o for o in root.children_recursive if o.type == 'MESH']\npoints = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]\nlo = Vector([min(p[i] for p in points) for i in range(3)])\nhi = Vector([max(p[i] for p in points) for i in range(3)])\ncenter = (lo + hi) * .5\ncamera_data = bpy.data.cameras.new('QueryOnly_ActualGLB_Axes')\ncamera = bpy.data.objects.new('QueryOnly_ActualGLB_Axes', camera_data)\nbpy.context.collection.objects.link(camera)\ncamera_data.type = 'ORTHO'\ncamera_data.clip_start = .1\ncamera_data.clip_end = 1000\nif view == 'top':\n    camera.location = (center.x, center.y, 200)\n    camera.rotation_euler = (0, 0, 0)\nelif view in ('front', 'right'):\n    direction = Vector((0, -1, 0) if view == 'front' else (1, 0, 0))\n    camera.location = center + direction*200\n    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()\nelse:\n    center.z = max(3, center.z)\n    camera.location = center + Vector((90, -110, 88))\n    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()\n    # Diagnostic sea datum, never a child of the model or a scene mutation.\n    bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0))\n    water = bpy.context.object\n    water.name = 'QueryOnly_Sea_Datum_Not_Exported'\n    mat = bpy.data.materials.new('QueryOnly_Sea_Datum_Not_Runtime_Water')\n    mat.use_nodes = True\n    bsdf = mat.node_tree.nodes.get('Principled BSDF')\n    bsdf.inputs['Base Color'].default_value = (.022, .25, .31, 1)\n    bsdf.inputs['Roughness'].default_value = .26\n    bsdf.inputs['Metallic'].default_value = 0\n    water.data.materials.append(mat)\n# Fit actual owned geometry, not an assumed scale. Blender's ortho_scale is\n# horizontal with this landscape render; vertical coverage is scale/aspect.\nprojected = [camera.rotation_euler.to_matrix().transposed() @ (p-center) for p in points]\nspan_x = max(p.x for p in projected)-min(p.x for p in projected)\nspan_y = max(p.y for p in projected)-min(p.y for p in projected)\ncamera_data.ortho_scale = max(span_x, span_y*4/3)*1.12\nscene = bpy.context.scene\nscene.camera = camera\nscene.render.engine = 'BLENDER_EEVEE'\nscene.eevee.taa_render_samples = 8\nscene.eevee.use_raytracing = False\nscene.eevee.use_fast_gi = False\nscene.render.resolution_x = 640\nscene.render.resolution_y = 480\nscene.render.resolution_percentage = 100\nscene.render.image_settings.media_type = 'IMAGE'\nscene.render.image_settings.file_format = 'PNG'\ntarget = artifacts.file(name='projects-island-v2-r8-candidate-'+view+'.png', media_type='image/png')\nscene.render.filepath = str(target.path)\nbpy.ops.render.render(write_still=True)\ntarget.publish()\nresult = {'view':view, 'assetMeshes':len(meshes), 'blenderBounds':[list(lo),list(hi)],\n          'orthographic':True, 'diagnosticWater':view=='hero', 'sampleCount':8,\n          'temporaryQueryOnly':True, 'noRuntimeWaterClaim':True}\n"
for VIEW in ('hero','front','right','top'):
    bpy.context.view_layer.update()
    exec(R8_RENDER_HELPER, globals())
    r8_views.append(result)
result={'sourceAudit':R8_SOURCE_REPORT,'actualTemporaryViews':r8_views,'queryOnly':True,'baseCommittedRevision':7,'candidateNotCommitted':True}

