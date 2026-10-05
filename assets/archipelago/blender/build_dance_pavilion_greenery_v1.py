"""Differential Dance cornice/post botanical finish, native master revision 3.

Does not rebuild the pavilion, alter its floor/hulls or write/render/fetch files.
Adds original closed curved foliage attached to existing timber with the exact
existing leaf/flower PBR materials. Helpers receive metre-scale glTF X/Y/Z.
The existing .blend remains editable; native export/GPU review is separate.
"""
import bpy
import math
import json
import hashlib
from mathutils import Vector


ROOT_NAME = "DancePavilion_V1_Origin_At_Deck_Centre"
COLLECTION_NAME = "DancePavilion_V1_Editable_Asset"
PREFIX = "DancePavilion_FinishV1_"
LIMIT = 165_000
ADDITION_LIMIT = 20_000
BOUNDS = ((-11.41, -.24, -8.26), (11.41, 6.24, 8.26))
COLLECTION = bpy.data.collections.get(COLLECTION_NAME)
PARENT = bpy.data.objects.get("Dance_decor")
ROOT = bpy.data.objects.get(ROOT_NAME)
if COLLECTION is None or PARENT is None or ROOT is None:
    raise RuntimeError("A settled Dance pavilion master is required")
MATERIALS = {name: bpy.data.materials.get("DancePavilion_PBR_" + name)
             for name in ("Dark_Joinery", "Leaf_Deep", "Leaf_Green", "Leaf_Young",
                          "Hibiscus_Coral", "Hibiscus_Pink", "Brass")}
if not all(MATERIALS.values()):
    raise RuntimeError("The existing portable Dance PBR materials are required")
CREATED = []
ADDED_TRIANGLES = 0


def to_blender(point):
    return (float(point[0]), -float(point[2]), float(point[1]))


def hard_fingerprint():
    digest = hashlib.sha256()
    digest.update(str(ROOT.get("proposed_solid_contract_json", "")).encode())
    for obj in sorted(COLLECTION.objects, key=lambda item: item.name):
        if obj.type != "MESH" or "shared_hull_id" not in obj:
            continue
        digest.update(obj.name.encode())
        digest.update(repr(tuple(tuple(row) for row in obj.matrix_world)).encode())
        digest.update(repr(tuple(tuple(vertex.co) for vertex in obj.data.vertices)).encode())
    return digest.hexdigest()


def actual_triangles():
    deps = bpy.context.evaluated_depsgraph_get()
    count = 0
    for obj in COLLECTION.objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            count += len(mesh.loop_triangles)
        finally:
            evaluated.to_mesh_clear()
    return count


def mesh_object(name, vertices, faces, material, uv, smooth=True):
    global ADDED_TRIANGLES
    for point in vertices:
        if not all(math.isfinite(float(value)) for value in point):
            raise RuntimeError("Non-finite botanical geometry")
        if any(float(point[axis]) < BOUNDS[0][axis] - 2e-6 or
               float(point[axis]) > BOUNDS[1][axis] + 2e-6 for axis in range(3)):
            raise RuntimeError("Botanical finish exceeds calibrated asset bounds: " + name)
    data = bpy.data.meshes.new(PREFIX + name + "_Mesh")
    data.from_pydata([to_blender(point) for point in vertices], [], faces)
    data.update()
    data.calc_loop_triangles()
    for tri in data.loop_triangles:
        a, b, c = (data.vertices[index].co for index in tri.vertices)
        if (b - a).cross(c - a).length_squared < 1e-20:
            raise RuntimeError("Degenerate finish triangle: " + name)
    ADDED_TRIANGLES += len(data.loop_triangles)
    if ADDED_TRIANGLES > ADDITION_LIMIT:
        raise RuntimeError("Botanical addition exceeds 20,000 triangles")
    data.materials.append(MATERIALS[material])
    layer = data.uv_layers.new(name="UVMap")
    for polygon in data.polygons:
        polygon.use_smooth = bool(smooth)
        for loop_id in polygon.loop_indices:
            layer.data[loop_id].uv = uv[data.loops[loop_id].vertex_index]
    obj = bpy.data.objects.new(PREFIX + name, data)
    COLLECTION.objects.link(obj)
    obj.parent = PARENT
    obj["runtime_group"] = "decor"
    obj["collision_policy"] = "soft_non_solid"
    obj["finish_recipe"] = "attached_botanical_finish_v1"
    CREATED.append(obj)
    return obj


def tube(name, points, radii, material="Dark_Joinery", sides=6):
    points = [Vector(point) for point in points]
    vertices, faces, uv, frame = [], [], [], None
    for row, point in enumerate(points):
        tangent = points[min(len(points) - 1, row + 1)] - points[max(0, row - 1)]
        tangent.normalize()
        if frame is None:
            ref = Vector((0, 1, 0)) if abs(tangent.y) < .9 else Vector((0, 0, 1))
            frame = tangent.cross(ref).normalized()
        else:
            frame -= tangent * frame.dot(tangent)
            frame.normalize()
        across = tangent.cross(frame).normalized()
        for side in range(sides):
            phi = side * math.tau / sides
            vertices.append(tuple(point + (frame * math.cos(phi) + across * math.sin(phi)) * radii[row]))
            uv.append((side / sides, row / (len(points) - 1)))
    for row in range(len(points) - 1):
        for side in range(sides):
            edge = (side + 1) % sides
            faces.append((row * sides + side, row * sides + edge,
                          (row + 1) * sides + edge, (row + 1) * sides + side))
    first, last = len(vertices), len(vertices) + 1
    vertices.extend((tuple(points[0]), tuple(points[-1])))
    uv.extend(((.5, 0), (.5, 1)))
    for side in range(sides):
        faces.extend(((first, (side + 1) % sides, side),
                      (last, (len(points) - 1) * sides + side,
                       (len(points) - 1) * sides + (side + 1) % sides)))
    return mesh_object(name, vertices, faces, material, uv)


def solid_grid(name, rows, cols, sample, normal, thickness, material):
    normal = Vector(normal).normalized()
    vertices, faces, uv = [], [], []
    for layer in (1, -1):
        for row in range(rows):
            for col in range(cols):
                t, w = row / (rows - 1), col / (cols - 1)
                vertices.append(tuple(Vector(sample(t, w)) + normal * (layer * thickness / 2)))
                uv.append((t, w))
    stride = rows * cols
    a, b, c = (Vector(vertices[index]) for index in (0, cols, cols + 1))
    reverse = (b - a).cross(c - a).dot(normal) < 0
    for row in range(rows - 1):
        for col in range(cols - 1):
            a = row * cols + col
            face = (a, a + cols, a + cols + 1, a + 1)
            if reverse:
                face = tuple(reversed(face))
            faces.extend((face, tuple(index + stride for index in reversed(face))))
    perimeter = list(range(cols)) + [row * cols + cols - 1 for row in range(1, rows)]
    perimeter += list(range(stride - 2, stride - cols - 1, -1))
    perimeter += [row * cols for row in range(rows - 2, 0, -1)]
    for index, a in enumerate(perimeter):
        b = perimeter[(index + 1) % len(perimeter)]
        face = (a, b, b + stride, a + stride)
        faces.append(tuple(reversed(face)) if reverse else face)
    return mesh_object(name, vertices, faces, material, uv)


def curled_leaf(name, origin, direction, normal, length, color):
    origin, direction, normal = Vector(origin), Vector(direction).normalized(), Vector(normal)
    normal -= direction * normal.dot(direction)
    normal.normalize()
    across = normal.cross(direction).normalized()
    def sample(t, w):
        q = 2 * w - 1
        width = length * (.010 + .28 * math.sin(math.pi * t) ** .76)
        centre_curl = .19 * math.sin(math.pi * t) - .09 * t ** 3
        bowl = .095 * q * q * math.sin(math.pi * t)
        twist = .035 * q * math.sin(math.pi * t * 1.5)
        return origin + direction * (length * t) + across * (width * q) + normal * (length * (centre_curl - bowl + twist))
    return solid_grid(name, 6, 4, sample, normal, .012, color)


def flower(name, center, normal, phase=0):
    center, normal = Vector(center), Vector(normal).normalized()
    u = Vector((1, 0, 0))
    if abs(normal.dot(u)) > .85:
        u = Vector((0, 0, 1))
    u -= normal * u.dot(normal)
    u.normalize()
    v = normal.cross(u).normalized()
    scale = .22
    for petal in range(5):
        phi = phase + petal * math.tau / 5
        direction, across = u * math.cos(phi) + v * math.sin(phi), u * -math.sin(phi) + v * math.cos(phi)
        def sample(t, w, direction=direction, across=across):
            q = w * 2 - 1
            return center + direction * (scale * (.075 + .91 * t)) + across * (scale * (.009 + .47 * math.sin(math.pi * t) ** .66) * q) + normal * (scale * (.29 * t * t - .08 * q * q * math.sin(math.pi * t)))
        solid_grid(name + "_Curled_Petal_%d" % petal, 5, 5, sample,
                   normal, .010, "Hibiscus_Pink" if petal % 2 else "Hibiscus_Coral")
    tube(name + "_Visible_Pollen_Core", [center, center + normal * .090],
         [.034, .019], "Brass", 8)


def cornice(name, path, count, normal, mode):
    points = [path(index / 25) for index in range(26)]
    tube(name + "_Connected_Woody_Runner", points, [.025] * 26)
    for index in range(count):
        t = .025 + .95 * index / (count - 1)
        base = Vector(path(t))
        alternate = -1 if index % 2 else 1
        if mode == "front":
            direction = (alternate * .78, .49 if index % 3 else -.20, .13)
        elif mode == "rear":
            direction = (alternate * .78, .49 if index % 3 else -.20, -.07)
        else:
            direction = (-mode * .20, .49 if index % 3 else -.20, alternate * .78)
        color = ("Leaf_Deep", "Leaf_Green", "Leaf_Young")[(index // 2) % 3]
        curled_leaf(name + "_Attached_Curled_Leaf_%02d" % index,
                    base, direction, normal, .72 + .06 * math.sin(index * 1.8), color)


def add_botanical_finish():
    cornice("Front_Cornice", lambda t: (-10.55 + 21.10 * t,
             5.43 + .05 * math.sin(t * math.tau * 3),
             7.61 + .04 * math.sin(t * math.tau * 4)), 30, (0, .25, 1), "front")
    cornice("Rear_Cornice", lambda t: (-10.55 + 21.10 * t,
             5.43 + .05 * math.sin(t * math.tau * 3),
             -7.64 + .035 * math.sin(t * math.tau * 4)), 30, (0, .25, -1), "rear")
    for side in (-1, 1):
        cornice("Side_Cornice_%s" % side, lambda t, side=side: (
                 side * (10.64 + .025 * math.sin(t * math.tau * 4)),
                 5.29 + .05 * math.sin(t * math.tau * 3), -7.34 + 14.68 * t),
                 22, (side, .24, 0), side)
        for row, z in enumerate((-7.75, -2.6, 2.6, 7.75)):
            x = side * 10.75
            def post_path(t, x=x, z=z, row=row):
                angle = t * math.tau * 1.2 + row * .4
                ca, sa = math.cos(angle), math.sin(angle)
                divisor = max(abs(ca), abs(sa))
                return (x + .259 * ca / divisor,
                        2.4 + 2.77 * t, z + .259 * sa / divisor)
            name = "Post_%s_%d" % (side, row)
            tube(name + "_Attached_Climbing_Stem", [post_path(index / 10) for index in range(11)], [.016] * 11)
            for leaf in range(4):
                base = post_path(.11 + leaf * .22)
                curled_leaf(name + "_Attached_Leaf_%d" % leaf,
                            base, (-side * .54, .60, .32 * (-1 if leaf % 2 else 1)),
                            (side, .20, .15), .39, ("Leaf_Green", "Leaf_Deep")[leaf % 2])
    blossoms = [((-8.4, 5.52, 7.77), (0, .18, 1), (-8.4, 5.43, 7.61)),
                ((-2.8, 5.52, 7.77), (0, .18, 1), (-2.8, 5.43, 7.61)),
                ((2.8, 5.52, 7.77), (0, .18, 1), (2.8, 5.43, 7.61)),
                ((8.4, 5.52, 7.77), (0, .18, 1), (8.4, 5.43, 7.61))]
    for side in (-1, 1):
        for z in (-4.8, 4.8):
            blossoms.append(((side * 10.86, 5.47, z),
                             (side, .25, .1), (side * 10.64, 5.29, z)))
    for index, (center, normal, attachment) in enumerate(blossoms):
        a, b = Vector(attachment), Vector(center)
        points = [a * (1 - t) + b * t + Vector((0, .04 * math.sin(math.pi * t), 0))
                  for t in (0, 1 / 3, 2 / 3, 1)]
        tube("Blossom_%d_Attached_Pedicel" % index, points,
             [.018, .017, .015, .013], "Leaf_Deep")
        flower("Blossom_%d" % index, center, normal, index * .7)


before_hard = hard_fingerprint()
contract_before = str(ROOT.get("proposed_solid_contract_json", ""))
for obj in list(COLLECTION.objects):
    if obj.name.startswith(PREFIX):
        data = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if data is not None and data.users == 0:
            bpy.data.meshes.remove(data)
bpy.context.view_layer.update()
base_triangles = actual_triangles()
if base_triangles + 19_296 > LIMIT:
    raise RuntimeError("Settled source has insufficient remaining triangle budget for the botanical finish")
add_botanical_finish()
bpy.context.view_layer.update()
total_triangles = actual_triangles()
if total_triangles > LIMIT or ADDED_TRIANGLES > ADDITION_LIMIT:
    raise RuntimeError("Actual botanical finish exceeds unchanged triangle guards")
if hard_fingerprint() != before_hard or str(ROOT.get("proposed_solid_contract_json", "")) != contract_before:
    raise RuntimeError("Botanical finish changed hard geometry or its contract")
result = {"recipe": "dance-pavilion-attached-greenery-v1",
          "createdSoftMeshes": len(CREATED), "addedTriangles": ADDED_TRIANGLES,
          "baseTriangles": base_triangles, "actualTotalTriangles": total_triangles,
          "calibratedBoundsGuard": BOUNDS, "hardFingerprintUnchanged": True,
          "packedImagesAdded": 0, "materialsAdded": 0,
          "hullsDeckAndFrontWalkingClearanceChanged": False,
          "scope": "Actual source geometry only; GLB and raster acceptance require separate review"}
