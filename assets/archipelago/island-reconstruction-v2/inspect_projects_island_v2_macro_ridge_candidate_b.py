"""Projects V2 macro STUDY9, candidate B: one connected rear ridge, query-safe candidate.

Execute only against committed R7/S0. Parent owns native query, renders, export
and any eventual apply. No provider/export/camera/runtime operation here.
Retire the15 entirely upper rear owners from every scene collection (retain
their datablocks for rollback); preserve the real Saddle lower below1.25 and
its complete source triangles touching.85, including corner UV/colour/normals.
28 other mesh owners and BODY stay exact. New upper ridge is ONE closed volume:
three unequal geological masses with broken terraces and two oblique clefts,
not sixteen overlapping bevel prisms and not Gaussian domes.

Grounding is the actual Saddle bedrock continuing to-10, NOT assumed BODY4.8.
New upper foot uses the actual1.25 cut footprint, bottom1.05/collar1.50. Its
closure completely covers the new stump cap1.25 with.25m vertical clearance.
This is two overlapping connected shells, NOT a certified Boolean union. The
old1.05 versus1.25 profile differs by centimetres; no full bottom-embed claim.
All new/frozen contacts and possible non-adjacent self contacts are reported.
Hard source/body/apron/route/PNG/closure guards fail; contact/art promotion is
explicitly absent. This second macro candidate sculpts real rock ribs and stepped banks, not a pigment-only change; it is meant for four real native renders.
No root approval/audit metadata is committed.
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
SADDLE = PREFIX + "Rear_Connected_Low_Saddle"
RIDGE_NAME = PREFIX + "Integrated_Rear_Ridge"
COLOR_NAME = "TerrainColour"
ROOT = bpy.data.objects.get(ROOT_NAME)
ROCK = bpy.data.materials.get(PREFIX + "Limestone")
EARTH = bpy.data.materials.get(PREFIX + "HoneyEarth")
SELECTED = {PREFIX + name for name in (
    "Rear_Connected_Low_Saddle", "Front_Low_Connecting_Ridge_Ledge",
    "Western_Broad_Second_Terrace", "Cannon_Continuous_Middle_Terrace",
    "Cannon_Asymmetric_High_Plateau", "Western_High_Shoulder_Connected_To_Cannon",
    "East_Long_Lower_Shoulder")} | {PREFIX + f"Attached_Fracture_{i:02d}" for i in range(14, 23)}
REQUIRED_IMAGES = {PREFIX + name for name in (
    "Limestone_MetallicRoughness_1024", "Limestone_WornMicroNormal_512",
    "HoneyEarth_MetallicRoughness_1024", "HoneyEarth_WornMicroNormal_512",
    "Limestone_NeutralAlbedo_R7_1024", "HoneyEarth_NeutralAlbedo_R7_1024")}
CORRIDORS = (((4.6834, 26.3442), (0, 15), 2.75),
             ((29.0315, 1.296), (0, 15), 1.75))
CONTACT_EPS = 1e-6
CUT = 1.25
BOTTOM = 1.05
COLLAR = 1.50
CAP_SPACING = .95
ROOF_SPACING = .52
# Macro B: uneven broken skyline, rear overhang limited before wall dressing.
# All numbers are metres in the asset's actual glTF frame.
ROOF_SPACING = .42
WALL_SAMPLES = 512
WALL_LEVELS = (.22, .43, .67, .85)
ROOF_OUTLINE = [
    (-28, -21.1), (-28.1, -24.1), (-26.5, -27), (-24, -30),
    (-20, -31.9), (-16, -31.6), (-12.2, -33), (-8, -32.7),
    (-4.8, -33.55), (-1.2, -33.1), (3.2, -33.65), (6.3, -33.15),
    (10.4, -32.6), (13.4, -32.1), (17.2, -31), (20, -29.3),
    (23.7, -28), (26, -25), (27.9, -22), (27, -20),
    (24.2, -18.1), (21.4, -18.7), (19.3, -17.9), (16.8, -19.2),
    (14.7, -19.7), (13.2, -20.8), (10, -20.6), (8.8, -19.7),
    (6.2, -20.5), (4.9, -21.7), (1.8, -22), (-.8, -20.9),
    (-3.7, -21.5), (-6.5, -20.2), (-9.3, -20.4), (-11.8, -18.8),
    (-14.7, -18.9), (-17.6, -17.8), (-20.1, -18.3),
    (-22.3, -17.5), (-25, -18.6), (-27.2, -19)]
# The recessed front edge of the middle plateau is a sequence of buttresses
# and bays; it is not the old straight continuous thirteen-metre-high wall.
REGIONS = [
    ("west", [(-27, -28), (-24.2, -32.8), (-18, -33.1),
        (-13.5, -32), (-9.8, -29), (-11.7, -25), (-14.7, -24.2),
        (-16.4, -21.1), (-20, -22.5), (-23.7, -20.8),
        (-25.2, -24.5), (-28.2, -25.7)], 11.65, .075, -.13, 1.30),
    ("west_lower_bench", [(-26.5, -23), (-22, -24.1), (-18.5, -23),
        (-16.8, -24), (-12.8, -22.5), (-13.6, -19.6),
        (-17.8, -18.3), (-20.4, -19.5), (-24.2, -18.8),
        (-26.6, -20.5)], 7.45, .038, -.07, 1.10),
    ("middle", [(-14, -29), (-9, -32.3), (-4.7, -32.9),
        (1, -33), (7.3, -32.2), (13.4, -30.9), (18, -28.8),
        (16.3, -26.1), (14.5, -23.1), (11, -24.4),
        (8.1, -22.6), (5.2, -25.2), (1.7, -23.3),
        (-.6, -25.2), (-4.8, -24), (-7.1, -22.6),
        (-9.6, -24.6), (-12.4, -23.5), (-14.8, -26)], 14.2, -.035, .10, 1.15),
    ("crown", [(-8.4, -34), (-2.2, -34.5), (6.5, -34),
        (10.5, -32.3), (9.1, -30.4), (6.3, -30.5),
        (4.8, -29.1), (1.1, -30), (-1.8, -28.6),
        (-4.9, -29.7), (-7.6, -31.2)], 18.05, -.095, .14, 1.00),
    ("east", [(14, -29.8), (18.9, -31.6), (22.7, -29.1),
        (25.8, -27.8), (28.5, -23.7), (26.4, -21.9),
        (26.7, -19.7), (23.8, -17.8), (20.6, -19.1),
        (18.7, -18.4), (16, -20.1), (17.1, -23.3),
        (13.1, -25)], 9.50, -.055, -.11, 1.20)]
FAULTS = (
    (((-22.6, -32), (-18.6, -27.6), (-16.2, -23), (-13.8, -18.9)),
        (1.2, 1.45, 1.2, .7), 3.15),
    (((15.8, -32), (13.6, -28.5), (14.1, -24.1), (17.4, -19.1)),
        (1.25, 1.4, 1.0, .8), 2.95))
# Eleven hand-authored oblique strata fractures; these displace roof vertices.
# They are constrained by sample strips, not invented shader/noise detail.
ROOF_FRACTURES = (
    (((-25.5, -28.8), (-23.1, -26.4), (-22, -22.1)), .32, .60),
    (((-21.5, -31), (-19.8, -28), (-18.2, -24.4)), .38, .75),
    (((-17.5, -31.7), (-15.3, -29), (-13.8, -26.4)), .28, .50),
    (((-13.4, -27.7), (-11.2, -25.9), (-10.3, -23.8)), .34, .58),
    (((-7.6, -32.8), (-5.5, -30.8), (-4.1, -29.2)), .30, .72),
    (((-1.9, -32.6), (-.2, -31.1), (1.5, -29.6)), .33, .52),
    (((4.1, -32.9), (5.9, -31.3), (7.4, -30.2)), .35, .68),
    (((9.1, -29.7), (10.8, -27.6), (9.9, -24.6)), .34, .67),
    (((17.5, -28.9), (20.4, -26.8), (21.7, -24.1)), .37, .73),
    (((24.4, -26.6), (24.0, -23.9), (23.0, -20.5)), .30, .58),
    (((18.6, -24.3), (19.1, -22.3), (20.5, -19.8)), .31, .52))
# Twelve asymmetrical wall buttresses paired with narrow oblique recesses.
# point_on_skyline,width,bulge,oblique_drift,gash_width,gash_depth (all m)
WALL_BUTTRESSES = (
    ((-25, -18.6), 2.1, .86, 1.25, .32, .64),
    ((-17.6, -17.8), 2.7, .72, -1.35, .40, .78),
    ((-11.8, -18.8), 2.2, .92, 1.55, .29, .71),
    ((-6.5, -20.2), 2.8, .80, -.80, .38, .62),
    ((1.8, -22), 2.35, .67, 1.60, .34, .70),
    ((8.8, -19.7), 2.4, .95, -1.20, .37, .85),
    ((16.8, -19.2), 2.2, .84, 1.40, .31, .67),
    ((24.2, -18.1), 2.35, .74, -1.15, .36, .75),
    ((27.9, -22), 2.8, .92, 1.45, .43, .82),
    ((23.7, -28), 2.4, .71, -.95, .34, .64),
    ((-24, -30), 2.7, .81, 1.25, .38, .72),
    ((-4.8, -33.55), 2.8, .66, -1.30, .37, .63))
# Pure helpers below are copied unchanged from the frozen R8 authoring recipe.
# Their module body, R8 two-owner shape and old contact-waiver gate are NOT run.

def require(condition, message):
    if not condition:
        raise RuntimeError("MACRO_B " + message)

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
    normal = np.cross(v0, v1)
    denominator = normal @ normal
    require(denominator > 1e-24, "cannot interpolate a degenerate source face")
    # Cross products avoid catastrophic subtraction of near-equal Gram terms
    # in legitimate old bevel skins. No degenerate face is discarded.
    b = np.cross(q, v1) @ normal / denominator
    c = np.cross(v0, q) @ normal / denominator
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

def directed_winding_valid(faces):
    """Every undirected edge must have exactly two OPPOSITE half-edges."""
    undirected, directed = Counter(), Counter()
    for a, b, c in faces:
        for u, v in ((a, b), (b, c), (c, a)):
            u, v = int(u), int(v)
            if u == v:
                return False
            undirected[tuple(sorted((u, v)))] += 1
            directed[(u, v)] += 1
    return bool(undirected) and all(count == 2 and directed[(a, b)] == 1 and
                                   directed[(b, a)] == 1 for (a, b), count in undirected.items())

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
    closed = (all(e.is_manifold and e.is_contiguous for e in bm.edges) and
              all(v.is_manifold for v in bm.verts) and directed_winding_valid(f))
    volume = bm.calc_volume(signed=True)
    bm.free()
    require(closed and math.isfinite(volume) and volume > 0,
            "source is not closed/consistent-winding/positive: " + obj.name)
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
            "opposite_halfedges_and_contiguous_bmesh_edges": True,
            "signed_volume": float(volume), "minimum_float32_cross_length": float(lengths.min()),
            "minimum_uv_determinant": float(determinant.min()), "minimum_normal_dot": float(dots.min()),
            "source_state_sha256": sha(json.dumps(source["state"], sort_keys=True).encode())}


def protected_corner_digest(source):
    tri = source["p"][source["f"]]
    uv = source["uv"][0][1]
    keys = []
    for i in np.flatnonzero(np.any(tri[:, :, 1] <= .85, axis=1)):
        loops = source["loops"][i]
        payload = np.concatenate((uv[loops], source["rgba"][loops], source["normals"][loops]), axis=1)
        keys.append(oriented_key(tri[i], payload))
    return {"sha256": sha(b"".join(sorted(keys))), "triangles": len(keys)}


def signed_border(points, poly):
    q = points[:, [0, 2]]
    state = np.zeros(len(q), dtype=bool)
    distance = np.full(len(q), np.inf)
    for aa, bb in zip(poly, poly[1:] + poly[:1]):
        a, b = np.asarray(aa), np.asarray(bb)
        d = b - a
        t = np.clip(np.sum((q - a) * d, axis=1) / (d @ d), 0, 1)
        distance = np.minimum(distance, np.linalg.norm(q - a - t[:, None] * d, axis=1))
        if a[1] != b[1]:
            crossing = ((a[1] > q[:, 1]) != (b[1] > q[:, 1])) & (
                q[:, 0] < (b[0] - a[0]) * (q[:, 1] - a[1]) / (b[1] - a[1]) + a[0])
            state ^= crossing
    return np.where(state, distance, -distance)


def ridge_height(xz):
    xz = np.asarray(xz, dtype=np.float64)
    p = np.stack((xz[:, 0], np.zeros(len(xz)), xz[:, 1]), axis=1)
    x, z = xz[:, 0], xz[:, 1]
    height = np.maximum(4.95, 5.00 + .050 * (-z - 18) + .022 * (x + 10))
    for name, poly, nominal, sx, sz, width in REGIONS:
        bank = smooth(0, width, signed_border(p, poly))
        target = nominal + sx * x + sz * (z + 28)
        height = np.maximum(height, height + bank * np.maximum(0, target - height))
    for path, widths, depth in FAULTS:
        height -= ribbon(p, path, widths) * depth
    for path, width, depth in ROOF_FRACTURES:
        height -= ribbon(p, path, [width] * len(path)) * depth
    # Those two retained rocks are truly supported by the middle mass, not
    # painted as floating detail. Only support-witness proof is claimed.
    for left, right, back, front in ((-7.03, -1.89, -28.93, -25.63),
                                      (3.21, 8.60, -28.82, -25.34)):
        mask = (x >= left) & (x <= right) & (z >= back) & (z <= front)
        height[mask] = np.maximum(height[mask], 13.75)
    return np.asarray(np.maximum(height, 4.95), dtype=np.float32).astype(np.float64)

def roof_fracture_samples(poly):
    # Explicit crest and trench-floor points make each hand-authored fracture
    # into geometry even between the regular grid nodes. No random noise.
    points = []
    for path, width, depth in ROOF_FRACTURES:
        for a, b in zip(path, path[1:]):
            a, b = np.asarray(a), np.asarray(b)
            delta = b - a
            length = float(np.linalg.norm(delta))
            normal = np.array((-delta[1], delta[0])) / length
            for t in np.linspace(0, 1, max(3, int(math.ceil(length / .32)) + 1)):
                for offset in (-1.30 * width, 0, 1.30 * width):
                    q = tuple(a + delta * t + normal * offset)
                    if inside(q, poly) and min(segment_distance(q, u, v) for u, v in
                            zip(poly, poly[1:] + poly[:1])) > .18:
                        points.append(q)
    return points


def triangulated_cap(poly, spacing, label):
    contour_valid(poly)
    coords = list(poly)
    constraints = [(i, (i + 1) % len(poly)) for i in range(len(poly))]
    lo, hi = np.min(poly, axis=0), np.max(poly, axis=0)
    for row, z in enumerate(np.arange(lo[1] + .2, hi[1] - .2, spacing)):
        for x in np.arange(lo[0] + .2 + (row % 2) * spacing * .5, hi[0] - .2, spacing):
            q = (float(x), float(z))
            if inside(q, poly) and min(segment_distance(q, a, b) for a, b in
                    zip(poly, poly[1:] + poly[:1])) > .18:
                coords.append(q)
    if label == "macro B fractured ridge roof":
        # Exact Float32 deduplication only; do not coalesce nearby sculpt samples.
        seen = {tuple(np.asarray(q, dtype=np.float32)) for q in coords}
        for q in roof_fracture_samples(poly):
            key = tuple(np.asarray(q, dtype=np.float32))
            if key not in seen:
                seen.add(key)
                coords.append(q)
    points, faces, mapping = cdt(coords, constraints, len(poly), label)
    double_area = sum(-cross2(points[b] - points[a], points[c] - points[a]) for a, b, c in faces)
    require(abs(double_area * .5 - area(poly)) <= 2e-4, "CDT full cap area/boundary mismatch")
    return points, faces, mapping


def stump_geometry(source):
    vertices, faces, origins, loop = clip_lower(source, CUT)
    poly = np.asarray(vertices)[loop][:, [0, 2]].tolist()
    # Original cut has submillimetre edges: keep every edge, not .04m authored
    # contour simplification. CDT boundary IDs/area are checked separately.
    coords = list(poly)
    edges = [(i, (i + 1) % len(poly)) for i in range(len(poly))]
    lo, hi = np.min(poly, axis=0), np.max(poly, axis=0)
    for row, z in enumerate(np.arange(lo[1] + .2, hi[1] - .2, CAP_SPACING)):
        for x in np.arange(lo[0] + .2 + (row % 2) * CAP_SPACING * .5, hi[0] - .2, CAP_SPACING):
            q = (float(x), float(z))
            if inside(q, poly) and min(segment_distance(q, a, b) for a, b in
                    zip(poly, poly[1:] + poly[:1])) > .20:
                coords.append(q)
    cap, triangles, mapping = cdt(coords, edges, len(loop), "actual360point stump cap")
    lookup = {tuple(np.asarray(p, dtype=np.float32)): i for i, p in enumerate(vertices)}
    cap_ids = [add_vertex(vertices, lookup, (x, CUT, z)) for x, z in cap]
    faces.extend(tuple(cap_ids[i] for i in f) for f in triangles)
    origins.extend([None] * len(triangles))
    require(all(cap_ids[mapping[i]] == loop[i] for i in range(len(loop))), "stump cap boundary changed")
    cap_area = sum(-cross2(cap[b] - cap[a], cap[c] - cap[a]) * .5 for a, b, c in triangles)
    require(abs(cap_area - area(poly)) < 2e-4, "stump cap not fully covered by CDT")
    return vertices, faces, origins, loop, cap, triangles, cap_area


def densify_outline(poly, maximum_spacing=.55):
    output = []
    for a, b in zip(poly, poly[1:] + poly[:1]):
        a, b = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
        count = max(1, int(math.ceil(np.linalg.norm(b - a) / maximum_spacing)))
        output.extend(tuple(a + (b - a) * i / count) for i in range(count))
    return np.asarray(output, dtype=np.float32).astype(np.float64).tolist()

def arc_data(poly):
    # Correspondence is a boundary mapping, never a cap triangulation or fan.
    points = np.asarray(poly, dtype=np.float64)
    start = min(range(len(points)), key=lambda i: (points[i, 0], points[i, 1]))
    points = np.concatenate((points[start:], points[:start]), axis=0)
    lengths = np.linalg.norm(np.roll(points, -1, axis=0) - points, axis=1)
    require(np.all(lengths > 0), "collapsed real boundary segment")
    cumulative = np.concatenate(([0.], np.cumsum(lengths)))
    return points, cumulative, float(cumulative[-1])

def arc_sample(data, u):
    points, cumulative, total = data
    distance = (float(u) % 1.) * total
    i = min(len(points) - 1, int(np.searchsorted(cumulative, distance, side="right")) - 1)
    t = (distance - cumulative[i]) / (cumulative[i + 1] - cumulative[i])
    tangent = points[(i + 1) % len(points)] - points[i]
    tangent /= np.linalg.norm(tangent)
    normal = np.array((tangent[1], -tangent[0]))  # outward for CCW outline
    return points[i] * (1 - t) + points[(i + 1) % len(points)] * t, normal

def arc_nearest(data, point):
    points, cumulative, total = data
    point = np.asarray(point)
    best = (np.inf, 0.)
    for i, (a, b) in enumerate(zip(points, np.roll(points, -1, axis=0))):
        delta = b - a
        t = np.clip(((point - a) @ delta) / (delta @ delta), 0, 1)
        distance = float(np.linalg.norm(point - a - t * delta))
        if distance < best[0]:
            best = (distance, (cumulative[i] + t * (cumulative[i + 1] - cumulative[i])) / total)
    return best[1]

def wall_displacement(u, t, perimeter, ribs):
    # A real buttress-and-gash field in metres; hand-authored non-periodic
    # locations. The periodic difference only wraps a CLOSED boundary seam.
    relief, pitch = 0., 0.
    for centre, width, bulge, drift, gash_width, depth in ribs:
        distance = ((u - centre + .5) % 1. - .5) * perimeter - drift * (t - .5)
        shoulder = 1 - smooth(width * .22, width, abs(distance))
        recess = 1 - smooth(gash_width * .28, gash_width * 1.25, abs(distance - width * .70))
        relief += bulge * shoulder - depth * recess
        pitch += .14 * shoulder - .10 * recess
    envelope = min(1., t / .18, (1. - t) / .18)
    return float(np.clip(relief, -1.0, 1.0) * envelope), float(np.clip(pitch, -.22, .22) * envelope)

def ring_guard(points, label):
    # Actual Float32 contour, before faces are emitted. Every retained collar
    # remains exact; only these new upper rings may be sculpted/densified.
    p = np.asarray(points, dtype=np.float32).astype(np.float64)[:, [0, 2]]
    require(area(p) > 0, "clockwise or collapsed upper ring: " + label)
    require(np.all(np.linalg.norm(np.roll(p, -1, axis=0) - p, axis=1) > 1e-6),
            "collapsed upper ring edge: " + label)
    for i in range(len(p)):
        js = np.arange(i + 2, len(p))
        if i == 0:
            js = js[js < len(p) - 1]
        if not len(js):
            continue
        a, b, c, d = p[i], p[(i + 1) % len(p)], p[js], p[(js + 1) % len(p)]
        ab, cd = b - a, d - c
        crossing = ((cross2(ab, c - a) * cross2(ab, d - a) < 0) &
                    (cross2(cd, a - c) * cross2(cd, b - c) < 0))
        require(not crossing.any(), "proper self-crossing upper ring: " + label)

def make_ridge(foot_poly, cap, cap_faces):
    # Exact SAME cap,360-point collar and overlapping1.05→1.50 foot as A.
    vertices = [[float(x), BOTTOM, float(z)] for x, z in cap]
    faces = [(a, c, b) for a, b, c in cap_faces]
    index = {tuple(np.asarray(p, dtype=np.float32)): i for i, p in enumerate(cap)}
    lower = [index[tuple(np.asarray(p, dtype=np.float32))] for p in foot_poly]
    collar = []
    for x, z in foot_poly:
        collar.append(len(vertices))
        vertices.append([x, COLLAR, z])
    for i, a in enumerate(lower):
        b, c, d = lower[(i + 1) % len(lower)], collar[i], collar[(i + 1) % len(collar)]
        faces.extend(((b, a, c), (b, c, d)))
    roof_outline = densify_outline(ROOF_OUTLINE)
    top, top_faces, mapping = triangulated_cap(roof_outline, ROOF_SPACING, "macro B fractured ridge roof")
    y = ridge_height(top)
    offset = len(vertices)
    vertices.extend([float(x), float(h), float(z)] for (x, z), h in zip(top, y))
    faces.extend(tuple(offset + i for i in f) for f in top_faces)
    upper = [offset + mapping[i] for i in range(len(roof_outline))]
    foot_data, roof_data = arc_data(foot_poly), arc_data(roof_outline)
    ribs = [(arc_nearest(roof_data, point), width, bulge, drift, gash_width, depth)
             for point, width, bulge, drift, gash_width, depth in WALL_BUTTRESSES]
    previous, rings, relief_range = collar, [], [0., 0.]
    for t in WALL_LEVELS:
        points = []
        for i in range(WALL_SAMPLES):
            u = i / WALL_SAMPLES
            foot, _ = arc_sample(foot_data, u)
            roof, outward = arc_sample(roof_data, u)
            xy = foot * (1 - t) + roof * t
            relief, pitch = wall_displacement(u, t, roof_data[2], ribs)
            # Do not restore the old2m rear cantilever through wall detail.
            if outward[1] < 0 and relief > 0:
                relief = min(relief, max(0., (-33.85 - xy[1]) / outward[1]))
            # The32x26 working rectangle remains clear of upper sculpture.
            if outward[1] > 0 and relief > 0 and abs(xy[0]) < 17.2:
                relief = min(relief, max(0., (-16.35 - xy[1]) / outward[1]))
            moved = xy + outward * relief
            h = COLLAR + t * (float(ridge_height([roof])[0]) - COLLAR) + pitch
            points.append((float(moved[0]), float(h), float(moved[1])))
            relief_range = [min(relief_range[0], relief), max(relief_range[1], relief)]
        ring_guard(points, "wall level" + str(t))
        current = list(range(len(vertices), len(vertices) + len(points)))
        vertices.extend(points)
        if previous is collar:
            faces.extend(zipper(previous, current, vertices))
        else:
            # Rings have exactly the same512 boundary samples/correspondence.
            for i, a in enumerate(previous):
                b, c, d = previous[(i + 1) % len(previous)], current[i], current[(i + 1) % len(current)]
                faces.extend(((b, a, c), (b, c, d)))
        previous = current
        rings.append({"level": t, "actual_points": len(points), "minimum_y": min(p[1] for p in points),
                      "maximum_y": max(p[1] for p in points)})
    faces.extend(zipper(previous, upper, vertices))
    # Guard the unchanged360 collar even though every upper layer is denser.
    require(np.array_equal(np.asarray(vertices, dtype=np.float32)[collar][:, [0, 2]],
                           np.asarray(foot_poly, dtype=np.float32)), "changed exact lower collar")
    return vertices, faces, [None] * len(faces), {
        "single_connected_upper_volume": True, "candidate": "B_real_sculpted_buttresses_and_fractures",
        "bottom_y": BOTTOM, "collar_y": COLLAR, "collar_actual_exact_points": len(collar),
        "roof_triangles": len(top_faces), "authored_outline_xz": ROOF_OUTLINE,
        "densified_roof_outline_points": len(roof_outline), "maximum_roof_edge_metres": .55,
        "rear_roof_min_z": float(top[:, 1].min()), "rear_wall_min_z_limit": -33.85,
        "three_unequal_masses": ["west", "core_middle_and_crown", "east"],
        "broken_terrace_regions": [r[0] for r in REGIONS], "wall_rings": rings,
        "wall_actual_normal_displacement_min_max_metres": relief_range,
        "twelve_sculpted_oblique_buttresses": [
            {"skyline_point_xz": point, "width": width, "bulge": bulge, "drift": drift,
             "gash_width": gw, "gash_depth": depth}
            for point, width, bulge, drift, gw, depth in WALL_BUTTRESSES],
        "eleven_geometric_roof_fractures": [
            {"path_xz": path, "width": width, "depth": depth} for path, width, depth in ROOF_FRACTURES],
        "erosional_incisions": [{"path_xz": p, "widths_metres": w, "depth_metres": d} for p, w, d in FAULTS],
        "roof_min_max_y": [float(y.min()), float(y.max())],
        "shading": "Authored32degree split corner normals; geometry stays actual editable triangles"}

def set_ridge_crease_normals(obj, degrees=32.):
    # Only new ridge: smooth shallow fine sculpt facets, retain the true
    # banks/cuts above32deg. No normal or state changes to the28frozen owners.
    mesh = obj.data
    mesh.calc_loop_triangles()
    p = read_values(mesh.vertices, "co", 3, np.float32).astype(np.float64)
    f = np.asarray([tuple(t.vertices) for t in mesh.loop_triangles])
    loops = np.asarray([tuple(t.loops) for t in mesh.loop_triangles])
    cross = np.cross(p[f[:, 1]] - p[f[:, 0]], p[f[:, 2]] - p[f[:, 0]])
    length = np.linalg.norm(cross, axis=1)
    require(np.all(length > 1e-10), "normal pass found real degenerate triangles")
    unit = cross / length[:, None]
    incidents = [[] for _ in p]
    for face_id, triangle in enumerate(f):
        for v in triangle:
            incidents[int(v)].append(face_id)
    corner = np.empty((len(mesh.loops), 3), dtype=np.float64)
    threshold = math.cos(math.radians(degrees))
    for face_id, triangle in enumerate(f):
        for i, vertex in enumerate(triangle):
            ids = np.asarray(incidents[int(vertex)])
            compatible = ids[(unit[ids] @ unit[face_id]) >= threshold]
            # Area weighting prevents tiny real collar facets dominating a
            # broad cliff normal. Sharp silhouette/bank corners remain split.
            normal = (unit[compatible] * length[compatible, None]).sum(axis=0)
            normal /= np.linalg.norm(normal)
            corner[loops[face_id, i]] = normal
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    mesh.normals_split_custom_set(corner.tolist())
    mesh.update()


def report_contacts(sources):
    trees = {n: tree(s) for n, s in sources.items()}
    upper = sources[RIDGE_NAME]
    counts, examples, undeclared = Counter(), [], []
    structural = {BODY_NAME, SADDLE, PREFIX + "Attached_Fracture_23", PREFIX + "Attached_Fracture_24"}
    for name, other in sources.items():
        if name == RIDGE_NAME:
            continue
        for a_id, b_id in contacts(upper, other, trees[RIDGE_NAME], trees[name]):
            counts[name] += 1
            a, b = upper["p"][upper["f"][a_id]], other["p"][other["f"][b_id]]
            sample = {"peer": name, "faces": [a_id, b_id],
                      "intersection_aabb_min": np.maximum(a.min(axis=0), b.min(axis=0)).tolist(),
                      "intersection_aabb_max": np.minimum(a.max(axis=0), b.max(axis=0)).tolist()}
            if len(examples) < 20:
                examples.append(sample)
            if name not in structural and len(undeclared) < 20:
                undeclared.append(sample)
    self_examples, self_count, candidates = [], 0, 0
    tri = upper["p"][upper["f"]]
    grouped = {}
    for i, j in trees[RIDGE_NAME].overlap(trees[RIDGE_NAME]):
        if i < j and not set(map(int, upper["f"][i])).intersection(map(int, upper["f"][j])):
            grouped.setdefault(i, []).append(j)
    for i, ids in grouped.items():
        candidates += len(ids)
        hit = np.asarray(ids)[contact_sat(tri[i], tri[ids])]
        self_count += len(hit)
        for j in hit[:max(0, 20 - len(self_examples))]:
            self_examples.append({"faces": [int(i), int(j)]})
    return {"status": "DIAGNOSTIC_ONLY_NOT_PROMOTION_READY", "actual_surface_peer_counts": dict(counts),
            "first20_surface_pairs": examples, "unknown_peer_first20": undeclared,
            "unknown_peer_count": sum(v for n, v in counts.items() if n not in structural),
            "nonadjacent_self_candidate_count": candidates, "nonadjacent_self_hit_count": self_count,
            "nonadjacent_self_first20": self_examples, "declared_structural_peers": sorted(structural),
            "not_claimed": "Boolean union/contained-volume exclusion, adjacent fold proof, runtime collision or final art acceptance"}


def frozen_stone_embed(upper, stone):
    # Exact point witnesses only: not full-foot triangle/volume proof.
    p = stone["p"]
    bottom = p[np.abs(p[:, 1] - p[:, 1].min()) < 1e-5]
    roof = upper["p"][upper["f"]]
    cross = np.cross(roof[:, 1] - roof[:, 0], roof[:, 2] - roof[:, 0])
    roof = roof[cross[:, 1] > 1e-10]
    minimum_cover = np.inf
    for point in bottom:
        a, b, c = roof[:, 0][:, [0, 2]], roof[:, 1][:, [0, 2]], roof[:, 2][:, [0, 2]]
        q = point[[0, 2]]
        d = cross2(b - a, c - a)
        wb, wc = cross2(np.broadcast_to(q, a.shape) - a, c - a) / d, cross2(b - a, np.broadcast_to(q, a.shape) - a) / d
        wa = 1 - wb - wc
        selected = (wa >= -1e-6) & (wb >= -1e-6) & (wc >= -1e-6)
        require(selected.any(), "retained Fracture23/24 base witness outside new ridge")
        height = np.max(wa[selected] * roof[selected, 0, 1] + wb[selected] * roof[selected, 1, 1] + wc[selected] * roof[selected, 2, 1])
        minimum_cover = min(minimum_cover, height - point[1])
    require(minimum_cover > .02, "retained Fracture23/24 floating base witness")
    return {"bottom_vertex_witnesses": len(bottom), "minimum_vertical_embed_metres": float(minimum_cover),
            "scope": "All actual lowest vertices; NOT full triangle/volume containment proof"}


require(ROOT is not None and ROCK is not None and EARTH is not None, "missing committed R7")
require(ROOT.get("native_neutral_albedo_r7_audit_json") and
        not ROOT.get("native_upper_saddle_r8_audit_json"), "requires R7, not R8")
require(ROOT.get("origin_semantics") == "Sea level, not a walking floor", "changed sea origin")
OBJECTS = sorted((o for o in ROOT.children if o.type == "MESH"), key=lambda o: o.name)
require(len(OBJECTS) == 44 and SELECTED <= {o.name for o in OBJECTS}, "incorrect R7 source")
for o in [ROOT] + OBJECTS:
    require(np.array_equal(np.asarray(o.matrix_world), np.eye(4)), "unexpected asset transform")
ORIGINAL = {o.name: snapshot(o) for o in OBJECTS}
require(sum(len(s["f"]) for s in ORIGINAL.values()) == 109088, "not actual R7 geometry")
ORIGINAL_DATA = {o.name: o.data for o in OBJECTS}
ORIGINAL_COLLECTIONS = {o.name: list(o.users_collection) for o in OBJECTS}
PNGS = {n.image.name: sha(bytes(n.image.packed_file.data)) for m in (ROCK, EARTH)
        for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image and n.image.packed_file}
require(set(PNGS) == REQUIRED_IMAGES, "not six packed R7 PNGs")
MATERIALS = {m.name: material_state(m) for m in (ROCK, EARTH)}
ROOT_AUDITS = {k: ROOT[k] for k in ROOT.keys() if k.startswith("native_") and k.endswith("_audit_json")}
for name in SELECTED - {SADDLE}:
    require(np.min(ORIGINAL[name]["p"][:, 1]) > CUT and
            face_digest(ORIGINAL[name])["triangles"] == 0 and
            protected_corner_digest(ORIGINAL[name])["triangles"] == 0 and
            route_digest(ORIGINAL[name])["triangles"] == 0, "retiring protected lower/route geometry: " + name)
saddle_obj = bpy.data.objects[SADDLE]
new_obj = None
try:
    v, f, origins, loop, cap, cap_faces, cap_area = stump_geometry(ORIGINAL[SADDLE])
    foot_poly = np.asarray(v)[loop][:, [0, 2]].tolist()
    require(len(loop) == 360, "actual R7 Saddle cutloop changed")
    install(saddle_obj, ORIGINAL[SADDLE], v, f, origins)
    ridge_v, ridge_f, ridge_origins, shape_report = make_ridge(foot_poly, cap, cap_faces)
    new_obj = bpy.data.objects.new(RIDGE_NAME, bpy.data.meshes.new(RIDGE_NAME + "_Placeholder"))
    ORIGINAL_COLLECTIONS[SADDLE][0].objects.link(new_obj)
    new_obj.parent = ROOT
    install(new_obj, ORIGINAL[SADDLE], ridge_v, ridge_f, ridge_origins)
    set_ridge_crease_normals(new_obj)
    for o in OBJECTS:
        if o.name in SELECTED - {SADDLE}:
            for collection in list(o.users_collection):
                collection.objects.unlink(o)
            o.parent = None
    CURRENT = sorted((o for o in ROOT.children if o.type == "MESH"), key=lambda o: o.name)
    require(len(CURRENT) == 30, "expected28frozen+1lower+1ridge mesh owners")
    FINAL = {o.name: snapshot(o) for o in CURRENT}
    for name, old in ORIGINAL.items():
        if name not in SELECTED:
            require(FINAL[name]["state"] == old["state"], "changed one of28frozen owners: " + name)
        elif name == SADDLE:
            require(face_digest(FINAL[name]) == face_digest(old), "original Saddle submerged changed")
            require(protected_corner_digest(FINAL[name]) == protected_corner_digest(old),
                    "original Saddle whole low face/UV/COLOR/NORMAL changed")
            require(route_digest(FINAL[name]) == route_digest(old), "original Saddle approach changed")
        else:
            require(name not in FINAL and not bpy.data.objects[name].users_collection,
                    "retired upper geometry still exported from scene")
    diagnostics = [mesh_diagnostics(o, FINAL[o.name]) for o in CURRENT]
    triangles = sum(d["triangles"] for d in diagnostics)
    require(triangles <= 180000, "study exceeds180k")
    apron = check_clear_apron(FINAL)
    require(FINAL[BODY_NAME]["state"] == ORIGINAL[BODY_NAME]["state"], "BODY/sea/apron changed")
    embed = {name: frozen_stone_embed(FINAL[RIDGE_NAME], FINAL[name]) for name in
             (PREFIX + "Attached_Fracture_23", PREFIX + "Attached_Fracture_24")}
    contact_report = report_contacts(FINAL)
    for m in (ROCK, EARTH):
        require(material_state(m) == MATERIALS[m.name], "R7 PBR graph changed")
    require(PNGS == {n.image.name: sha(bytes(n.image.packed_file.data)) for m in (ROCK, EARTH)
        for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image and n.image.packed_file}, "R7 PNG changed")
    require(all(ROOT.get(k) == value for k, value in ROOT_AUDITS.items()), "historical audit metadata changed")
    result = {"study_version": 9, "macro_candidate": "B", "source_native_revision": 7, "candidate_native_revision": 8,
        "status": "QUERY_CANDIDATE_NOT_PROMOTION_READY",
        "committed": False, "runtime_integration": False, "automatic_multiview_reconstruction": False,
        "meshes": 30, "triangles": triangles, "hard_study_triangle_limit": 180000,
        "frozen28_full_source_states_exact": True, "body_full_state_exact": True,
        "saddle_original_whole_faces_touching085_geometry_uv_colour_normals_exact": True,
        "saddle_submerged_oriented_triangles_exact": True, "full_body_apron": apron,
        "two_pbr_and_six_png_bytes_exact": True, "png_sha256": PNGS,
        "retired15_unlinked_owners": sorted(SELECTED - {SADDLE}),
        "semantic_replacement": {n: RIDGE_NAME for n in sorted(SELECTED - {SADDLE})},
        "lower_stump": {"owner": SADDLE, "cut_y": CUT, "actual_loop_points": len(loop),
            "full_cap_area_square_metres": cap_area, "mixed_faces_clipped_not_topology_exact": True},
        "upper_ridge": {"owner": RIDGE_NAME, **shape_report},
        "grounding": {"support_owner": SADDLE, "support_original_min_y": -10,
            "same_cut_footprint_full_closure_coverage": True, "cap_y": CUT,
            "upper_bottom_y": BOTTOM, "vertical_cap_roof_clearance": COLLAR - CUT,
            "cap_boundary_lateral_margin": 0, "bottom_fully_embedded_claimed": False,
            "note": "Connected overlapping shells, NOT Boolean union. Weathered profile1.05vs1.25 differs up to7cm laterally; no BODY4.8 assumption"},
        "retained_stone_base_witnesses": embed, "contacts": contact_report,
        "source_diagnostics": diagnostics, "art_acceptance": False,
        "pending": ["Four-view native art review", "Full stone footprint/volume containment",
                    "Review any unknown contact/self-contact", "Exposed coplanar seam cleanup",
                    "Portable GLB comparison and runtime cost; study is NOT8MiB gameplay approval"]}
    # No root revision/approval marker or other committed audit metadata.
except Exception:
    if new_obj is not None:
        for collection in list(new_obj.users_collection):
            collection.objects.unlink(new_obj)
        new_obj.parent = None
    for o in OBJECTS:
        o.data = ORIGINAL_DATA[o.name]
        o.parent = ROOT
        for collection in ORIGINAL_COLLECTIONS[o.name]:
            if o.name not in collection.objects:
                collection.objects.link(o)
    raise



"""Append to a reviewed, query-only R7 macro-sculpt recipe.

Four actual temporary views; no export, provider fetch or committed metadata.
The preceding recipe's `result` must contain its real source audit. Lighting and
PBR graphs are inherited unchanged. Diagnostic water exists only in the hero.
"""
import bpy
from mathutils import Vector

macro_source_audit = result
macro_root = bpy.data.objects["ProjectsIsland_V2_Origin_At_Sea_Level"]
macro_meshes = [o for o in macro_root.children_recursive if o.type == "MESH"]
assert macro_meshes and all(len(o.data.polygons) for o in macro_meshes)
macro_points = [o.matrix_world @ Vector(p) for o in macro_meshes for p in o.bound_box]
macro_lo = Vector([min(p[i] for p in macro_points) for i in range(3)])
macro_hi = Vector([max(p[i] for p in macro_points) for i in range(3)])
macro_center = (macro_lo + macro_hi) * .5
macro_scene = bpy.context.scene
macro_scene.render.engine = "BLENDER_EEVEE"
macro_scene.eevee.taa_render_samples = 16
macro_scene.eevee.use_raytracing = False
macro_scene.eevee.use_fast_gi = False
macro_scene.render.resolution_x = 640
macro_scene.render.resolution_y = 480
macro_scene.render.resolution_percentage = 100
macro_scene.render.image_settings.media_type = "IMAGE"
macro_scene.render.image_settings.file_format = "PNG"
macro_views = []

for macro_view in ("hero", "front", "right", "top"):
    macro_data = bpy.data.cameras.new("QueryOnly_Macro_" + macro_view)
    macro_camera = bpy.data.objects.new("QueryOnly_Macro_" + macro_view, macro_data)
    bpy.context.collection.objects.link(macro_camera)
    macro_data.type = "ORTHO"
    macro_data.clip_start = .1
    macro_data.clip_end = 1000
    macro_target = macro_center.copy()
    macro_water = None
    if macro_view == "top":
        macro_camera.location = (macro_target.x, macro_target.y, 200)
        macro_camera.rotation_euler = (0, 0, 0)
    elif macro_view in ("front", "right"):
        macro_direction = Vector((0, -1, 0) if macro_view == "front" else (1, 0, 0))
        macro_camera.location = macro_target + macro_direction * 200
        macro_camera.rotation_euler = (macro_target - macro_camera.location).to_track_quat("-Z", "Y").to_euler()
    else:
        macro_target.z = max(3, macro_target.z)
        macro_camera.location = macro_target + Vector((90, -110, 88))
        macro_camera.rotation_euler = (macro_target - macro_camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0))
        macro_water = bpy.context.object
        macro_water.name = "QueryOnly_Macro_Sea_Not_Exported"
        macro_material = bpy.data.materials.new("QueryOnly_Macro_Sea_Not_Runtime")
        macro_material.use_nodes = True
        macro_bsdf = macro_material.node_tree.nodes.get("Principled BSDF")
        macro_bsdf.inputs["Base Color"].default_value = (.022, .25, .31, 1)
        macro_bsdf.inputs["Roughness"].default_value = .26
        macro_bsdf.inputs["Metallic"].default_value = 0
        macro_water.data.materials.append(macro_material)
    macro_projected = [macro_camera.rotation_euler.to_matrix().transposed() @ (p - macro_target)
                       for p in macro_points]
    macro_span_x = max(p.x for p in macro_projected) - min(p.x for p in macro_projected)
    macro_span_y = max(p.y for p in macro_projected) - min(p.y for p in macro_projected)
    macro_data.ortho_scale = max(macro_span_x, macro_span_y * 4 / 3) * 1.12
    macro_scene.camera = macro_camera
    bpy.context.view_layer.update()
    macro_artifact = artifacts.file(name="projects-island-v2-macro-ridge-candidate-b-" + macro_view + ".png",
                                    media_type="image/png")
    macro_scene.render.filepath = str(macro_artifact.path)
    try:
        bpy.ops.render.render(write_still=True)
        macro_artifact.publish()
    finally:
        if macro_water:
            bpy.data.objects.remove(macro_water, do_unlink=True)
    macro_views.append({"view": macro_view, "width": 640, "height": 480,
                        "samples": 16, "orthographic": True,
                        "diagnosticWater": macro_view == "hero",
                        "actualOwnedMeshCount": len(macro_meshes)})
    bpy.data.objects.remove(macro_camera, do_unlink=True)

result = {"sourceAudit": macro_source_audit, "actualTemporaryViews": macro_views,
          "baseCommittedRevision": 7, "candidateNotCommitted": True,
          "queryOnly": True, "blenderBounds": [list(macro_lo), list(macro_hi)],
          "noRuntimeWaterClaim": True, "noReferenceFidelityClaim": True}

