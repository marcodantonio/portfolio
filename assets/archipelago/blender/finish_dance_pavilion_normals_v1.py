"""Differential native Dance master R3 -> R4: proven normal/sweep corrections.

The 136 terminal curled-leaf BACK quads have correct outward winding but their
angle-weighted smooth normals include the sharply folded terminal wall. Split
ONLY that back quad's shading; preserve all leaf vertices, faces and UV loops.
The 12 cushion pipings have a genuine 180-degree projected-frame reversal and
self-twisted bow-tie quads. Replace only those tiny non-solid trim meshes with
closed rounded rectangular sweeps using a constant planar frame. Furniture,
deck, hulls, transforms, materials, contract and overall bounds stay unchanged.

No external imports, network, export, render, file access or DoubleSide change.
This recipe leaves the original recipes and original piping mesh datablocks
intact. Native export and independent actual-GLB review remain required.
"""
import bpy
import math
import json
import hashlib
import struct
from array import array
from mathutils import Vector


ROOT_NAME = "DancePavilion_V1_Origin_At_Deck_Centre"
COLLECTION_NAME = "DancePavilion_V1_Editable_Asset"
PATCH_ID = "dance-pavilion-terminal-leaf-and-stable-piping-v1"
TRIANGLE_LIMIT = 165_000
EXPECTED_LEAVES = 136
EXPECTED_PIPINGS = 12
PIPE_SIDES = 8
PIPE_QUARTER_STEPS = 6
PIPE_RADIUS = .009
PIPE_CORNER_RADIUS = .055
ROOT = bpy.data.objects.get(ROOT_NAME)
COLLECTION = bpy.data.collections.get(COLLECTION_NAME)
if ROOT is None or COLLECTION is None:
    raise RuntimeError("A settled Dance R3 editable master is required")
if ROOT.get("normal_finish_recipe") == PATCH_ID:
    raise RuntimeError("This differential is already applied; inspect the settled result")


def to_blender(point):
    return (float(point[0]), -float(point[2]), float(point[1]))


def to_asset(point):
    return (float(point.x), float(point.z), -float(point.y))


def hash_field(digest, value):
    raw = repr(value).encode("utf-8")
    digest.update(struct.pack("<I", len(raw)))
    digest.update(raw)


def buffer_hash(mesh):
    """Source positions/topology/UVs only: shading flags are deliberately separate."""
    digest = hashlib.sha256()
    for items, property_name, width, kind in (
        (mesh.vertices, "co", 3, "f"),
        (mesh.loops, "vertex_index", 1, "i"),
        (mesh.polygons, "loop_start", 1, "i"),
        (mesh.polygons, "loop_total", 1, "i"),
        (mesh.polygons, "material_index", 1, "i"),
    ):
        values = array(kind, [0]) * (len(items) * width)
        items.foreach_get(property_name, values)
        hash_field(digest, (property_name, len(items)))
        digest.update(values.tobytes())
    for layer in mesh.uv_layers:
        values = array("f", [0]) * (len(layer.data) * 2)
        layer.data.foreach_get("uv", values)
        hash_field(digest, layer.name)
        digest.update(values.tobytes())
    hash_field(digest, tuple(material.name if material else None
                             for material in mesh.materials))
    return digest.hexdigest()


def object_fingerprint(skip_geometry_names=()):
    digest = hashlib.sha256()
    skip_geometry_names = set(skip_geometry_names)
    for obj in sorted(COLLECTION.objects, key=lambda item: item.name):
        hash_field(digest, (obj.name, obj.type,
                           obj.parent.name if obj.parent else None,
                           tuple(tuple(row) for row in obj.matrix_world)))
        # Object properties are not changed, including collision ownership.
        hash_field(digest, tuple((key, repr(obj[key])) for key in sorted(obj.keys())))
        if obj.type == "MESH" and obj.name not in skip_geometry_names:
            hash_field(digest, buffer_hash(obj.data))
    return digest.hexdigest()


def hard_fingerprint():
    digest = hashlib.sha256()
    hash_field(digest, str(ROOT.get("proposed_solid_contract_json", "")))
    for obj in sorted(COLLECTION.objects, key=lambda item: item.name):
        if obj.type == "MESH" and "shared_hull_id" in obj:
            hash_field(digest, (obj.name, tuple(tuple(row) for row in obj.matrix_world),
                               buffer_hash(obj.data)))
    return digest.hexdigest()


def candidate_dot(a, b, c, na, nb, nc):
    face = (b - a).cross(c - a)
    normal = na + nb + nc
    if face.length_squared <= 1e-20:
        raise RuntimeError("Zero-area triangle; not a normal-opposition candidate")
    if normal.length_squared <= 1e-20:
        raise RuntimeError("Undefined average corner normal")
    return face.normalized().dot(normal.normalized())


def negative_controls():
    a, b, c = Vector((0, 0, 0)), Vector((1, 0, 0)), Vector((0, 1, 0))
    normal = Vector((0, 0, 1))
    correct = candidate_dot(a, b, c, normal, normal, normal)
    reversed_normal = candidate_dot(a, b, c, -normal, -normal, -normal)
    # Actual old piping faults are self-twisted quads, not merely flat cap normals.
    points = [Vector(value) for value in
              ((-1, -1, 0), (1, 1, 0), (-1, 1, 0), (1, -1, 0))]
    first = (points[1] - points[0]).cross(points[2] - points[0]).normalized()
    second = (points[2] - points[0]).cross(points[3] - points[0]).normalized()
    crossed_pair_dot = first.dot(second)
    zero_area_rejected = False
    try:
        candidate_dot(a, b, b, normal, normal, normal)
    except RuntimeError:
        zero_area_rejected = True
    if (correct < .999 or reversed_normal >= -.05 or
            crossed_pair_dot >= 0 or not zero_area_rejected):
        raise RuntimeError("The unchanged diagnostic failed its negative controls")
    return {"correctNormalsDot": correct,
            "invertedNormalsDot": reversed_normal,
            "bowTiePairDot": crossed_pair_dot,
            "zeroAreaRejected": zero_area_rejected,
            "normalOppositionThreshold": -.05}


def evaluated_summary(objects, with_normals=False, require_closed_quads=False):
    deps = bpy.context.evaluated_depsgraph_get()
    total_triangles = 0
    vertices = 0
    minimum = [math.inf] * 3
    maximum = [-math.inf] * 3
    candidates = 0
    smallest_dot = 1.0
    smallest_pair_dot = 1.0
    opposed_quad_pairs = 0
    by_object = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            total_triangles += len(mesh.loop_triangles)
            vertices += len(mesh.vertices)
            for vertex in mesh.vertices:
                point = to_asset(obj.matrix_world @ vertex.co)
                for axis in range(3):
                    if not math.isfinite(point[axis]):
                        raise RuntimeError("Non-finite evaluated geometry: " + obj.name)
                    minimum[axis] = min(minimum[axis], point[axis])
                    maximum[axis] = max(maximum[axis], point[axis])
            if with_normals:
                if not hasattr(mesh, "corner_normals"):
                    raise RuntimeError("Blender corner normals API is required, not skipped")
                corners = mesh.corner_normals
                if len(corners) != len(mesh.loops):
                    raise RuntimeError("Corner normal cardinality mismatch: " + obj.name)
            normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
            object_candidates = 0
            quad_faces = {}
            for triangle in mesh.loop_triangles:
                a, b, c = (obj.matrix_world @ mesh.vertices[index].co
                           for index in triangle.vertices)
                face = (b - a).cross(c - a)
                if face.length_squared <= 1e-20:
                    raise RuntimeError("Zero-area evaluated triangle: " + obj.name)
                quad_faces.setdefault(triangle.polygon_index, []).append(face.normalized())
                if with_normals:
                    normals = [normal_matrix @ corners[index].vector
                               for index in triangle.loops]
                    dot = candidate_dot(a, b, c, *normals)
                    smallest_dot = min(smallest_dot, dot)
                    if dot < -.05:
                        candidates += 1
                        object_candidates += 1
            for polygon_id, normals in quad_faces.items():
                if len(normals) == 2:
                    dot = normals[0].dot(normals[1])
                    smallest_pair_dot = min(smallest_pair_dot, dot)
                    if dot < 0:
                        opposed_quad_pairs += 1
            if require_closed_quads:
                edges = {}
                for polygon in mesh.polygons:
                    if len(polygon.vertices) != 4:
                        raise RuntimeError("Stable piping must contain only closed tube quads")
                    ids = list(polygon.vertices)
                    for index, a in enumerate(ids):
                        b = ids[(index + 1) % 4]
                        key = (min(a, b), max(a, b))
                        edges.setdefault(key, []).append(1 if a < b else -1)
                if any(len(uses) != 2 or sum(uses) != 0 for uses in edges.values()):
                    raise RuntimeError("Stable piping is not a closed consistently wound manifold")
            if with_normals:
                by_object.append({"name": obj.name, "candidates": object_candidates})
        finally:
            evaluated.to_mesh_clear()
    return {"triangles": total_triangles, "vertices": vertices,
            "minimum": minimum, "maximum": maximum,
            "normalOppositionCandidates": candidates,
            "minimumFaceAverageNormalDot": smallest_dot,
            "minimumQuadTrianglePairDot": smallest_pair_dot,
            "opposedQuadTrianglePairs": opposed_quad_pairs,
            "byObject": by_object}


def stable_pipe_data(object_name, bench_x, bench_z, yaw, cushion_lx):
    """Closed planar sweep: constant UP never crosses its tangent's complement."""
    up = Vector((0, 1, 0))
    radius = PIPE_CORNER_RADIUS
    x_limit, z_min, z_max = .45, -.34, .43
    centres = []
    for corner in range(4):
        cx = x_limit - radius if corner in (0, 3) else -x_limit + radius
        cz = z_max - radius if corner < 2 else z_min + radius
        for step in range(PIPE_QUARTER_STEPS):
            phi = corner * math.pi / 2 + step * math.pi / (2 * PIPE_QUARTER_STEPS)
            centres.append(Vector((cx + radius * math.cos(phi), .745,
                                   cz + radius * math.sin(phi))))
    cosine, sine = math.cos(yaw), math.sin(yaw)
    vertices, faces, uv = [], [], []
    radial_directions = []
    for row, centre in enumerate(centres):
        tangent = centres[(row + 1) % len(centres)] - centres[(row - 1) % len(centres)]
        tangent.normalize()
        if abs(tangent.dot(up)) > 1e-10:
            raise RuntimeError("Stable cushion piping is not planar")
        across = tangent.cross(up).normalized()
        for side in range(PIPE_SIDES):
            phi = side * math.tau / PIPE_SIDES
            radial = up * math.cos(phi) + across * math.sin(phi)
            point = centre + radial * PIPE_RADIUS
            # The original cushion envelope is unchanged: this trim lies inside.
            if not (-.50 <= point.x <= .50 and .525 <= point.y <= .795 and
                    -.39 <= point.z <= .47):
                raise RuntimeError("Replacement trim exceeds its unchanged seat cushion")
            lx = cushion_lx + point.x
            world = (bench_x + lx * cosine + point.z * sine,
                     point.y, bench_z - lx * sine + point.z * cosine)
            vertices.append(to_blender(world))
            rotated_radial = (radial.x * cosine + radial.z * sine,
                              radial.y, -radial.x * sine + radial.z * cosine)
            radial_directions.append(Vector(to_blender(rotated_radial)))
            uv.append((side / PIPE_SIDES, row / len(centres)))
    for row in range(len(centres)):
        next_row = (row + 1) % len(centres)
        for side in range(PIPE_SIDES):
            next_side = (side + 1) % PIPE_SIDES
            faces.append((row * PIPE_SIDES + side, row * PIPE_SIDES + next_side,
                          next_row * PIPE_SIDES + next_side, next_row * PIPE_SIDES + side))
    mesh = bpy.data.meshes.new(object_name + "_StablePlanarPiping_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            layer.data[loop_index].uv = uv[mesh.loops[loop_index].vertex_index]
    mesh.calc_loop_triangles()
    minimum_outward_dot = 1.0
    for triangle in mesh.loop_triangles:
        a, b, c = (mesh.vertices[index].co for index in triangle.vertices)
        face = (b - a).cross(c - a)
        if face.length_squared <= 1e-20:
            raise RuntimeError("Stable piping has a degenerate triangle")
        radial = sum((radial_directions[index] for index in triangle.vertices), Vector())
        dot = face.normalized().dot(radial.normalized())
        minimum_outward_dot = min(minimum_outward_dot, dot)
        if dot < .90:
            raise RuntimeError("Stable piping triangle points against its actual outward radial")
    if len(mesh.loop_triangles) != 384:
        raise RuntimeError("Unexpected stable piping topology")
    return mesh, minimum_outward_dot


leaves = sorted((obj for obj in COLLECTION.objects if obj.type == "MESH" and
                 obj.name.startswith("DancePavilion_FinishV1_") and
                 ("_Attached_Curled_Leaf_" in obj.name or "_Attached_Leaf_" in obj.name)),
                key=lambda item: item.name)
bench_specs = (("Rear_Bench_West", -5.35, -6.48, 0),
               ("Rear_Bench_East", 5.35, -6.48, 0),
               ("Side_Bench_West", -9.1, -.5, math.pi / 2),
               ("Side_Bench_East", 9.1, -.5, -math.pi / 2))
piping_specs = []
for bench_name, x, z, yaw in bench_specs:
    for index, cushion_lx in enumerate((-1.06, 0, 1.06)):
        name = "DancePavilion_%s_Seat_Piping_%d" % (bench_name, index)
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != "MESH" or obj.name not in COLLECTION.objects:
            raise RuntimeError("Required original cushion piping is missing: " + name)
        if "shared_hull_id" in obj or obj.modifiers:
            raise RuntimeError("Only the original tiny non-solid unmodified trim may be replaced")
        if tuple(tuple(row) for row in obj.matrix_world) != tuple(tuple(row) for row in ROOT.matrix_world):
            raise RuntimeError("Unexpected piping transform: do not bake an altered pose")
        obj.data.calc_loop_triangles()
        if len(obj.data.loop_triangles) != 50:
            raise RuntimeError("This differential requires the audited original 50-triangle piping")
        if len(obj.data.materials) != 1 or obj.data.materials[0].name != "DancePavilion_PBR_Violet_Fabric":
            raise RuntimeError("Unexpected original cushion trim material")
        piping_specs.append((obj, x, z, yaw, cushion_lx))
if len(leaves) != EXPECTED_LEAVES or len(piping_specs) != EXPECTED_PIPINGS:
    raise RuntimeError("Expected exactly 136 curled leaves and 12 existing cushion pipings")
for obj in leaves:
    data = obj.data
    if (len(data.vertices) != 48 or len(data.polygons) != 46 or data.users != 1 or
            sorted(data.polygons[29].vertices) != [42, 43, 46, 47] or
            any(not polygon.use_smooth for polygon in data.polygons)):
        raise RuntimeError("Unexpected audited terminal-leaf topology/shading: " + obj.name)

contract_before = str(ROOT.get("proposed_solid_contract_json", ""))
contract = json.loads(contract_before)
if len(contract.get("hulls", [])) != 28 or contract.get("deck", {}).get("walkingTop") != 0:
    raise RuntimeError("The existing 28 hulls and floor contract are required")
checks = negative_controls()
bpy.context.view_layer.update()
pipe_objects = [spec[0] for spec in piping_specs]
pipe_names = [obj.name for obj in pipe_objects]
before_identity_geometry = object_fingerprint(pipe_names)
before_hard = hard_fingerprint()
leaf_buffers = {obj.name: buffer_hash(obj.data) for obj in leaves}
before_stats = evaluated_summary(COLLECTION.objects)
before_leaf_normals = evaluated_summary(leaves, with_normals=True)
before_pipe_normals = evaluated_summary(pipe_objects, with_normals=True)
if (before_pipe_normals["opposedQuadTrianglePairs"] < 12 or
        before_leaf_normals["normalOppositionCandidates"] < 100):
    raise RuntimeError("Audited R3 faults were not reproduced; do not mutate a different revision")
if before_stats["triangles"] + 4008 > TRIANGLE_LIMIT:
    raise RuntimeError("Insufficient unchanged 165,000-triangle safety budget")

# Preserve an exact audit of each source flag, then split ONLY one BACK terminal quad.
leaf_smooth_before = {obj.name: tuple(poly.use_smooth for poly in obj.data.polygons)
                      for obj in leaves}
for obj in leaves:
    obj.data.polygons[29].use_smooth = False
    obj.data.update()

# Keep object names/hierarchy/transforms/custom properties and the material slot.
# Original data remain orphaned in the native .blend as a recoverable comparison.
minimum_outward_dot = 1.0
old_meshes = []
for obj, x, z, yaw, cushion_lx in piping_specs:
    replacement, outward_dot = stable_pipe_data(obj.name, x, z, yaw, cushion_lx)
    old_meshes.append(obj.data.name)
    obj.data.use_fake_user = True
    replacement.materials.append(obj.data.materials[0])
    obj.data = replacement
    minimum_outward_dot = min(minimum_outward_dot, outward_dot)
bpy.context.view_layer.update()

if object_fingerprint(pipe_names) != before_identity_geometry or hard_fingerprint() != before_hard:
    raise RuntimeError("Differential changed protected object identity, pose, geometry or hard hull data")
if str(ROOT.get("proposed_solid_contract_json", "")) != contract_before:
    raise RuntimeError("Differential changed the exact physics/support contract")
for obj in leaves:
    if buffer_hash(obj.data) != leaf_buffers[obj.name]:
        raise RuntimeError("A leaf's source positions/topology/UVs/materials changed")
    changed = [index for index, polygon in enumerate(obj.data.polygons)
               if polygon.use_smooth != leaf_smooth_before[obj.name][index]]
    if changed != [29]:
        raise RuntimeError("Leaf correction changed more than its one back terminal shading flag")
after_stats = evaluated_summary(COLLECTION.objects)
after_leaf_normals = evaluated_summary(leaves, with_normals=True)
after_pipe_normals = evaluated_summary(pipe_objects, with_normals=True, require_closed_quads=True)
if after_stats["triangles"] > TRIANGLE_LIMIT or after_stats["triangles"] - before_stats["triangles"] != 4008:
    raise RuntimeError("Actual differential topology does not match the declared guard")
for extrema in ("minimum", "maximum"):
    if any(abs(before_stats[extrema][axis] - after_stats[extrema][axis]) > 1e-6
           for axis in range(3)):
        raise RuntimeError("Differential changed the calibrated outside asset bounds")
if (after_leaf_normals["normalOppositionCandidates"] or
        after_pipe_normals["normalOppositionCandidates"] or
        after_pipe_normals["opposedQuadTrianglePairs"] or
        after_pipe_normals["minimumQuadTrianglePairDot"] < .99):
    raise RuntimeError("Actual evaluated normals or piping remain visibly folded/opposed")

result = {"recipe": PATCH_ID, "nativeMasterRevision": "R3 -> R4",
          "negativeControls": checks,
          "leafObjects": len(leaves), "pipingObjects": len(pipe_objects),
          "leafChange": "Only source polygon 29 use_smooth=False; exact positions/topology/UVs retained",
          "pipingChange": "Closed rounded rectangle; constant planar UP/frame; 24 rings x 8 sides",
          "before": {"asset": before_stats, "leaves": before_leaf_normals,
                     "pipings": before_pipe_normals},
          "after": {"asset": after_stats, "leaves": after_leaf_normals,
                    "pipings": after_pipe_normals},
          "addedTriangles": 4008, "minimumPipingOutwardRadialDot": minimum_outward_dot,
          "solidHulls": 28, "hardFingerprintUnchanged": True,
          "protectedObjectGeometryPoseIdentityUnchanged": True,
          "leafPositionTopologyUVMaterialBuffersUnchanged": True,
          "exactPhysicsSupportContractUnchanged": True,
          "overallBoundsUnchanged": True, "newMaterials": 0, "newImages": 0,
          "DoubleSideChanged": False, "originalRecoverablePipingMeshes": old_meshes,
          "scope": "Native evaluated result; independent exported GLB normals/art/runtime review required"}
ROOT["normal_finish_recipe"] = PATCH_ID
ROOT["normal_finish_summary_json"] = json.dumps(result, separators=(",", ":"))
