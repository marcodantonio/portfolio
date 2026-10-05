"""Reference-led Dance pavilion, editable original Blender 5.2 geometry.

Author through Higgsfield 3D Jutsu. This recipe does not fetch, render, save or
export files. It constructs metre-scale geometry, packed portable PBR images,
an explicit proposed solid contract and separate preview lights/camera.
It is modelling interpretation, not automatic multiview reconstruction.

Helpers receive local glTF coordinates (X right, Y up, Z front/south).
Blender coordinates are (X, -Z, Y); the identity root is the walking-deck centre.
The floor is 22 x 16 m, top Y=0, bottom Y=-0.24. No terrain, bridge, avatar,
statue, achievement or invented dance-performance geometry is included.
"""

import json
import math
import random

import bpy
import numpy as np
from mathutils import Vector


PREFIX = "DancePavilion_"
ROOT_NAME = "DancePavilion_V1_Origin_At_Deck_Centre"
COLLECTION_NAME = "DancePavilion_V1_Editable_Asset"
PREVIEW_COLLECTION_NAME = "DancePavilion_V1_Preview_Only"
SEED = 271009
TRIANGLE_BUDGET = 165_000
TEXTURE_DIMENSION_MAX = 512
RNG = random.Random(SEED)
GROUPS = {}
MATERIALS = {}
TEXTURES = []
HULLS = []
COLLECTION = None
PREVIEW_COLLECTION = None


def to_blender(point):
    return (float(point[0]), -float(point[2]), float(point[1]))


def to_gltf(point):
    return (float(point[0]), float(point[2]), -float(point[1]))


def add_hull(name, role, x, z, width, depth, height, bottom=0,
             kind="box", radius=None):
    hull = {"id": name, "role": role, "kind": kind, "x": x, "z": z,
            "width": width, "depth": depth, "bottom": bottom,
            "height": height, "yaw": 0}
    if radius is not None:
        hull["radius"] = radius
    HULLS.append(hull)
    return name


def rgba(rgb):
    return np.concatenate((np.clip(rgb, 0, 1),
                           np.ones((*rgb.shape[:2], 1))), axis=2)


def packed_image(name, pixels, non_color=False):
    if max(pixels.shape[:2]) > TEXTURE_DIMENSION_MAX:
        raise RuntimeError("Dance texture exceeds authored sizing guard")
    img = bpy.data.images.new(PREFIX + name, width=pixels.shape[1],
                              height=pixels.shape[0], alpha=True)
    img.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    img.pixels.foreach_set(np.asarray(pixels, dtype=np.float32).ravel())
    img.update()
    img.pack()
    TEXTURES.append(img)
    return img


def normal_image(name, height, strength):
    dy, dx = np.gradient(height)
    n = np.stack((-dx * strength, -dy * strength,
                  np.ones_like(dx)), axis=2)
    n /= np.linalg.norm(n, axis=2)[..., None]
    return packed_image(name, rgba(n * .5 + .5), True)


def material(name, color, roughness=.65, metal=0, base=None, normal=None,
             rough_map=None, coat=0, emission=None):
    mat = bpy.data.materials.new(PREFIX + "PBR_" + name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metal
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = .22
    for image, socket in ((base, "Base Color"), (rough_map, "Roughness")):
        if image is not None:
            node = mat.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = image
            node.interpolation = "Linear"
            mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs[socket])
    if normal is not None:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = normal
        converter = mat.node_tree.nodes.new("ShaderNodeNormalMap")
        converter.inputs["Strength"].default_value = .27
        mat.node_tree.links.new(node.outputs["Color"], converter.inputs["Color"])
        mat.node_tree.links.new(converter.outputs["Normal"], bsdf.inputs["Normal"])
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 1.7
    MATERIALS[name] = mat
    return mat


def make_materials():
    u, v = np.meshgrid(np.linspace(0, 1, 512, endpoint=False),
                       np.linspace(0, 1, 512, endpoint=False))
    flow = v + .011 * np.sin(u * 19 + v * 7) + .003 * np.sin(u * 41 - v * 13)
    grain = np.sin(flow * math.tau * 31) + .25 * np.sin(flow * math.tau * 89)
    knot_r = np.sqrt(((u - .61) * 1.15) ** 2 + ((v - .43) * 4.3) ** 2)
    knot = np.sin(knot_r * 58) * np.exp(-knot_r * 8)
    pores = np.sin(u * 397 + v * 173) * np.sin(u * 617 - v * 421)
    variation = 1 + grain * .024 + knot * .064 + pores * .004
    wood_base = packed_image("Honey_Timber_Base_512", rgba(variation[..., None] * (.72, .425, .18)))
    parquet_base = packed_image("Parquet_Amber_Base_512", rgba(variation[..., None] * (.67, .337, .115)))
    parquet_light = packed_image("Parquet_Honey_Base_512", rgba(variation[..., None] * (.77, .46, .235)))
    wood_normal = normal_image("Worked_Timber_Normal_512", grain * .022 + knot * .024, 6)
    rough = np.clip(.35 + grain * .017 + knot * .013 + pores * .002, .28, .43)
    parquet_rough = packed_image("Parquet_Roughness_512", rgba(np.repeat(rough[..., None], 3, axis=2)), True)
    weave = np.sin(u * math.tau * 128) * np.sin(v * math.tau * 128)
    linen = packed_image("Ivory_Linen_Base_512", rgba((1 + weave * .015)[..., None] * (.96, .91, .78)))
    fibre_normal = normal_image("Woven_Fibre_Normal_512", weave * .012, 3.3)
    leaf_relief = .033 * np.exp(-((v - .5) / .025) ** 2)
    leaf_relief += .008 * np.sin((v - .5) * 35 + u * 32) * np.exp(-((v - .5) / .43) ** 2)
    leaf_normal = normal_image("Broadleaf_Veins_Normal_512", leaf_relief, 5)
    material("Honey_Timber", (.72, .425, .18), .66, base=wood_base, normal=wood_normal)
    material("Dark_Joinery", (.255, .13, .052), .72, normal=wood_normal)
    material("Parquet_Amber", (.67, .337, .115), .35, base=parquet_base,
             normal=wood_normal, rough_map=parquet_rough, coat=.38)
    material("Parquet_Honey", (.77, .46, .235), .35, base=parquet_light,
             normal=wood_normal, rough_map=parquet_rough, coat=.38)
    material("Brass", (.71, .455, .135), .36, .74)
    material("Dark_Iron", (.075, .081, .075), .66, .52)
    material("Ivory_Linen", (.96, .91, .78), .88, base=linen, normal=fibre_normal)
    material("Violet_Fabric", (.24, .075, .51), .85, normal=fibre_normal)
    material("Violet_Cushion", (.34, .15, .59), .79, normal=fibre_normal)
    material("Terracotta", (.58, .23, .11), .86)
    material("Soil", (.07, .055, .024), .95)
    material("Leaf_Deep", (.074, .19, .039), .7, normal=leaf_normal)
    material("Leaf_Green", (.23, .37, .055), .67, normal=leaf_normal)
    material("Leaf_Young", (.43, .51, .065), .69, normal=leaf_normal)
    material("Hibiscus_Coral", (.91, .095, .19), .72)
    material("Hibiscus_Pink", (.93, .265, .34), .72)
    material("Amber_Light", (1, .66, .22), .31, emission=(1, .45, .075))
    material("Paper", (.80, .73, .52), .9)


def mesh_object(name, vertices, faces, mat, part, uv=None, smooth=False,
                hull=None, soft=True):
    data = bpy.data.meshes.new(PREFIX + name + "_Mesh")
    data.from_pydata([to_blender(p) for p in vertices], [], faces)
    data.update()
    data.calc_loop_triangles()
    for triangle in data.loop_triangles:
        a, b, c = (data.vertices[i].co for i in triangle.vertices)
        if (b - a).cross(c - a).length_squared < 1e-20:
            raise RuntimeError("Zero-area source triangle: " + name)
    layer = data.uv_layers.new(name="UVMap")
    for polygon in data.polygons:
        for loop_id in polygon.loop_indices:
            index = data.loops[loop_id].vertex_index
            p = vertices[index]
            layer.data[loop_id].uv = uv(p, to_gltf(polygon.normal)) if callable(uv) else (uv[index] if uv is not None else (p[0] * .2, p[2] * .2))
        polygon.use_smooth = len(polygon.vertices) == 4 if smooth == "SIDES" else bool(smooth)
    data.materials.append(MATERIALS[mat])
    obj = bpy.data.objects.new(PREFIX + name, data)
    COLLECTION.objects.link(obj)
    obj.parent = GROUPS[part]
    obj["runtime_group"] = part
    obj["collision_policy"] = "soft_non_solid" if soft else "shared_conservative_hull"
    if hull is not None:
        obj["shared_hull_id"] = hull
    return obj


def box(name, center, size, mat, part="shell", bevel=.02, grain="X", hull=None,
        soft=True, yaw=0, uv_offset=0):
    x, y, z = (float(value) / 2 for value in size)
    vertices = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
                (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    def mapping(p, n):
        if grain == "Y":
            return p[1] * .21 + uv_offset, (p[0] if abs(n[2]) > .5 else p[2]) * 1.2
        if grain == "Z":
            return p[2] * .21 + uv_offset, (p[0] if abs(n[1]) > .5 else p[1]) * 1.2
        return p[0] * .21 + uv_offset, (p[2] if abs(n[1]) > .5 else p[1]) * 1.2
    obj = mesh_object(name, vertices, faces, mat, part, mapping, False, hull, soft)
    obj.location = to_blender(center)
    obj.rotation_euler.z = -yaw
    if bevel > 0:
        mod = obj.modifiers.new("Worked rounded edges", "BEVEL")
        mod.width = min(bevel, min(size) * .13)
        mod.segments = 1 if min(size) < .22 else 2
        mod.limit_method = "ANGLE"
    return obj


def tube(name, points, radii, mat, part="decor", sides=8, hull=None, soft=True):
    points = [Vector(point) for point in points]
    if len(points) < 2 or len(points) != len(radii) or min(radii) <= 0:
        raise ValueError("Invalid tube: " + name)
    vertices, faces, uv, frame = [], [], [], None
    for row, point in enumerate(points):
        tangent = points[min(len(points) - 1, row + 1)] - points[max(0, row - 1)]
        if tangent.length_squared < 1e-20:
            raise ValueError("Repeated tube point: " + name)
        tangent.normalize()
        if frame is None:
            reference = Vector((0, 1, 0)) if abs(tangent.y) < .9 else Vector((0, 0, 1))
            frame = tangent.cross(reference).normalized()
        else:
            frame -= tangent * frame.dot(tangent)
            if frame.length_squared < 1e-16:
                frame = tangent.cross(Vector((0, 0, 1)))
            frame.normalize()
        other = tangent.cross(frame).normalized()
        for side in range(sides):
            phi = side * math.tau / sides
            vertices.append(tuple(point + (frame * math.cos(phi) + other * math.sin(phi)) * radii[row]))
            uv.append((side / sides, row / (len(points) - 1)))
    for row in range(len(points) - 1):
        for side in range(sides):
            edge = (side + 1) % sides
            faces.append((row * sides + side, row * sides + edge,
                          (row + 1) * sides + edge, (row + 1) * sides + side))
    start, end = len(vertices), len(vertices) + 1
    vertices.extend((tuple(points[0]), tuple(points[-1])))
    uv.extend(((.5, 0), (.5, 1)))
    for side in range(sides):
        faces.append((start, (side + 1) % sides, side))
        faces.append((end, (len(points) - 1) * sides + side,
                      (len(points) - 1) * sides + (side + 1) % sides))
    return mesh_object(name, vertices, faces, mat, part, uv, "SIDES", hull, soft)


def cylinder(name, center, radius, height, mat, part="decor", sides=20,
             hull=None, soft=True):
    return tube(name, [(center[0], center[1] - height / 2, center[2]),
                       (center[0], center[1] + height / 2, center[2])],
                [radius, radius], mat, part, sides, hull, soft)


def torus(name, center, radius, minor, mat="Brass", part="decor",
          normal=(0, 1, 0), segments=24, sides=6):
    normal = Vector(normal).normalized()
    center = Vector(center)
    ref = Vector((0, 1, 0)) if abs(normal.y) < .9 else Vector((0, 0, 1))
    u = normal.cross(ref).normalized()
    v = normal.cross(u).normalized()
    vertices, faces, uv = [], [], []
    for row in range(segments):
        phi = row * math.tau / segments
        radial = u * math.cos(phi) + v * math.sin(phi)
        for side in range(sides):
            theta = side * math.tau / sides
            vertices.append(tuple(center + radial * (radius + minor * math.cos(theta)) + normal * minor * math.sin(theta)))
            uv.append((row / segments, side / sides))
    for row in range(segments):
        for side in range(sides):
            faces.append((row * sides + side, ((row + 1) % segments) * sides + side,
                          ((row + 1) % segments) * sides + (side + 1) % sides,
                          row * sides + (side + 1) % sides))
    return mesh_object(name, vertices, faces, mat, part, uv, True)


def ellipsoid(name, center, scale, mat, part="decor", rings=6, sides=12):
    vertices, faces, uv = [(0, scale[1], 0)], [], [(.5, 1)]
    for row in range(1, rings):
        theta = math.pi * row / rings
        for side in range(sides):
            phi = side * math.tau / sides
            vertices.append((math.cos(phi) * math.sin(theta) * scale[0],
                             math.cos(theta) * scale[1],
                             math.sin(phi) * math.sin(theta) * scale[2]))
            uv.append((side / sides, 1 - row / rings))
    bottom = len(vertices)
    vertices.append((0, -scale[1], 0))
    uv.append((.5, 0))
    for side in range(sides):
        faces.append((0, 1 + (side + 1) % sides, 1 + side))
    for row in range(rings - 2):
        for side in range(sides):
            edge = (side + 1) % sides
            a, b = 1 + row * sides + side, 1 + (row + 1) * sides + side
            faces.append((a, 1 + row * sides + edge, 1 + (row + 1) * sides + edge, b))
    last = 1 + (rings - 2) * sides
    for side in range(sides):
        faces.append((last + side, last + (side + 1) % sides, bottom))
    obj = mesh_object(name, vertices, faces, mat, part, uv, True)
    obj.location = to_blender(center)
    return obj


def solid_grid(name, rows, cols, sample, outward, thickness, mat,
               part="decor"):
    outward = Vector(outward).normalized()
    vertices, faces, uv = [], [], []
    for layer in (1, -1):
        for row in range(rows):
            for col in range(cols):
                t, w = row / (rows - 1), col / (cols - 1)
                vertices.append(tuple(Vector(sample(t, w)) + outward * (layer * thickness / 2)))
                uv.append((t, w))
    stride = rows * cols
    a, b, c = (Vector(vertices[i]) for i in (0, cols, cols + 1))
    reverse = (b - a).cross(c - a).dot(outward) < 0
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
    return mesh_object(name, vertices, faces, mat, part, uv, True)


def beam_between(name, start, end, width, depth, part="shell"):
    start, end = Vector(start), Vector(end)
    obj = box(name, (start + end) / 2, (width, (end - start).length, depth),
              "Honey_Timber", part, .028, "Y")
    direction = Vector(to_blender(end - start))
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def lantern(name, center, scale=1):
    x, y, z = center
    cylinder(name + "_Foot", (x, y - .25 * scale, z), .19 * scale,
             .06 * scale, "Brass", sides=12)
    cylinder(name + "_Crown", (x, y + .25 * scale, z), .225 * scale,
             .065 * scale, "Brass", sides=12)
    for dx, dz in ((-.13, -.13), (.13, -.13), (.13, .13), (-.13, .13)):
        tube(name + "_Frame_%s_%s" % (dx, dz),
             [(x + dx * scale, y - .23 * scale, z + dz * scale),
              (x + dx * scale, y + .23 * scale, z + dz * scale)],
             [.016 * scale] * 2, "Brass", sides=6)
    ellipsoid(name + "_Opaque_Warm_Core", center,
              (.11 * scale, .19 * scale, .11 * scale), "Amber_Light")
    torus(name + "_Suspension_Loop", (x, y + .36 * scale, z),
          .07 * scale, .012 * scale, "Dark_Iron", normal=(0, 0, 1),
          segments=16, sides=5)


def compass(name, x, y, z, scale=1):
    # Original eight-point directional motif, not a brand or sports award.
    torus(name + "_Ring", (x, y, z), .31 * scale, .012 * scale,
          normal=(0, 0, 1), segments=32, sides=5)
    for index in range(8):
        angle = index * math.tau / 8
        radius = (.53 if index % 2 == 0 else .37) * scale
        ux, uy = math.sin(angle), math.cos(angle)
        vx, vy = math.cos(angle), -math.sin(angle)
        vertices = [(x, y, z + .007),
                    (x + ux * radius, y + uy * radius, z + .007),
                    (x + ux * .17 * scale + vx * .075 * scale,
                     y + uy * .17 * scale + vy * .075 * scale, z + .007),
                    (x + ux * .17 * scale - vx * .075 * scale,
                     y + uy * .17 * scale - vy * .075 * scale, z + .007)]
        mesh_object(name + "_Point_%02d" % index, vertices,
                    [(0, 2, 1), (0, 1, 3)], "Brass", "decor")


def broad_leaf(name, origin, direction, length, mat):
    origin, direction = Vector(origin), Vector(direction).normalized()
    normal = Vector((0, .8, .4))
    normal -= direction * normal.dot(direction)
    if normal.length_squared < .01:
        normal = Vector((1, 0, 0)).cross(direction)
    normal.normalize()
    across = normal.cross(direction).normalized()
    def sample(t, w):
        q = 2 * w - 1
        half = length * (.255 * math.sin(math.pi * t) ** .70 + .009)
        return origin + direction * (length * t) + across * (q * half) + normal * (length * (.15 - .055 * q * q) * math.sin(math.pi * t))
    obj = solid_grid(name, 5, 5, sample, normal, .012, mat)
    obj["asset_role"] = "Closed curved broadleaf, not an alpha billboard"
    return obj


def hibiscus(name, center, scale=.32, phase=0):
    center = Vector(center)
    normal = Vector((0, .5, 1)).normalized()
    u, v = Vector((1, 0, 0)), normal.cross(Vector((1, 0, 0)))
    for petal in range(5):
        angle = phase + petal * math.tau / 5
        direction = u * math.cos(angle) + v * math.sin(angle)
        across = normal.cross(direction)
        def sample(t, w, direction=direction, across=across):
            q = 2 * w - 1
            return center + direction * (scale * (.12 + .87 * t)) + across * (scale * (.008 + .46 * math.sin(math.pi * t) ** .65) * q) + normal * (scale * (.18 * t * t + .06 * math.sin(math.pi * t)))
        solid_grid(name + "_Petal_%d" % petal, 4, 5, sample, normal,
                   .012, "Hibiscus_Coral" if petal % 2 else "Hibiscus_Pink")
    tube(name + "_Stamen", [center, center + normal * scale * .46],
         [.025, .016], "Brass", sides=6)
    ellipsoid(name + "_Pollen", center + normal * scale * .47,
              (.026, .026, .026), "Brass", rings=4, sides=8)


def plant_cluster(name, center, count=12, length=.95, flowers=0):
    x, y, z = center
    for index in range(count):
        angle = index * 2.39996 + RNG.uniform(-.14, .14)
        base = Vector((x + .17 * math.sin(angle), y + .018 * index,
                       z + .17 * math.cos(angle)))
        direction = Vector((math.cos(angle), .44 + .48 * (index % 3) / 2,
                            math.sin(angle)))
        broad_leaf(name + "_Leaf_%02d" % index, base, direction,
                   length * RNG.uniform(.67, 1.04),
                   ("Leaf_Deep", "Leaf_Green", "Leaf_Young")[index % 3])
    for index in range(flowers):
        angle = (index + .3) * math.tau / max(1, flowers)
        hibiscus(name + "_Hibiscus_%d" % index,
                 (x + .42 * math.cos(angle), y + .4 + .1 * index,
                  z + .42 * math.sin(angle)), .27, angle)


def vine(name, start, control, end, count=12, length=.58):
    start, control, end = Vector(start), Vector(control), Vector(end)
    def path(t):
        return start * (1 - t) ** 2 + control * 2 * t * (1 - t) + end * t * t
    points = [path(t) for t in np.linspace(0, 1, 15)]
    tube(name + "_Attached_Stem", points,
         [.027 * (1 - .4 * t) for t in np.linspace(0, 1, 15)],
         "Dark_Joinery", sides=6)
    for index, t in enumerate(np.linspace(.025, .97, count)):
        direction = ((-1 if index % 2 else 1) * .75,
                     -.35 + .16 * math.cos(index), .25 * math.sin(index * 1.6))
        broad_leaf(name + "_Leaf_%02d" % index, path(t), direction,
                   length * (.86 + .13 * math.sin(index * 1.8)),
                   ("Leaf_Deep", "Leaf_Green", "Leaf_Young")[index % 3])


def pot(name, x, z):
    radius = .445
    hull = add_hull(name.lower(), "furniture", x, z, radius * 2,
                    radius * 2, .84, kind="cylinder", radius=radius)
    # Hollow wheel-thrown vessel: closed cross-section, open recessed mouth.
    profile = [(.24, 0), (.29, .05), (.39, .62), (.43, .69),
               (.435, .79), (.39, .83), (.34, .79), (.34, .70),
               (.29, .13), (.23, .07)]
    vertices, faces, uv = [], [], []
    sides = 24
    for row, (r, h) in enumerate(profile):
        for side in range(sides):
            phi = side * math.tau / sides
            vertices.append((x + r * math.cos(phi), h, z + r * math.sin(phi)))
            uv.append((side / sides, row / len(profile)))
    for row in range(len(profile)):
        for side in range(sides):
            faces.append((row * sides + side, row * sides + (side + 1) % sides,
                          ((row + 1) % len(profile)) * sides + (side + 1) % sides,
                          ((row + 1) % len(profile)) * sides + side))
    mesh_object(name + "_Hollow_WheelThrown_Vessel", vertices, faces,
                "Terracotta", "interior", uv, True, hull, False)
    cylinder(name + "_Recessed_Soil", (x, .71, z), .328, .035,
             "Soil", sides=20)
    plant_cluster(name + "_Botanical", (x, .75, z), count=11, length=.93,
                  flowers=2)


def make_floor():
    # Continuous structural support plate; all parquet tops share Y=0 exactly.
    deck = box("Deck_Structure", (0, -.17, 0), (22, .14, 16),
               "Dark_Joinery", bevel=.018, hull="dance-pavilion-deck", soft=False)
    deck["walking_top"] = 0.0
    deck["support_policy"] = "Shared structural plate, no independent terrain"
    for z in (-7.82, 7.82):
        box("Perimeter_Long_Border_%s" % z, (0, -.048, z),
            (22, .096, .36), "Parquet_Honey", bevel=.004,
            hull="dance-pavilion-deck", soft=False)
        box("Brass_Border_Inlay_%s" % z, (0, -.0015, z - math.copysign(.147, z)),
            (21.55, .003, .015), "Brass")
    for x in (-10.82, 10.82):
        box("Perimeter_End_Border_%s" % x, (x, -.048, 0),
            (.36, .096, 15.28), "Parquet_Honey", bevel=.004, grain="Z",
            hull="dance-pavilion-deck", soft=False)
        box("Brass_End_Inlay_%s" % x, (x - math.copysign(.147, x), -.0015, 0),
            (.015, .003, 15.25), "Brass")
    width, depth, rows = 21.28, 15.28, 46
    row_depth = depth / rows
    for row in range(rows):
        z = -depth / 2 + (row + .5) * row_depth
        offset = (row % 3) * .82
        cuts = [-width / 2]
        while cuts[-1] < width / 2 - .2:
            cuts.append(min(width / 2, cuts[-1] + (2.54 - offset if len(cuts) == 1 else 2.54)))
        if cuts[-1] < width / 2:
            cuts.append(width / 2)
        for col in range(len(cuts) - 1):
            length = cuts[col + 1] - cuts[col] - .006
            if length <= .04:
                continue
            mat = "Parquet_Honey" if (row * 11 + col * 7) % 5 < 2 else "Parquet_Amber"
            box("Parquet_Plank_%02d_%02d" % (row, col),
                ((cuts[col] + cuts[col + 1]) / 2, -.050, z),
                (length, .1, row_depth - .004), mat, bevel=.0023,
                hull="dance-pavilion-deck", soft=False,
                uv_offset=RNG.uniform(0, .85))


def make_structure():
    for side in (-1, 1):
        x = side * 10.75
        for row, z in enumerate((-7.75, -2.6, 2.6, 7.75)):
            name = "Post_%s_%d" % ("West" if side < 0 else "East", row)
            hull = add_hull(name.lower(), "post", x, z, .5, .5, 5.3)
            box(name + "_Shaft", (x, 2.61, z), (.46, 5.22, .46),
                "Honey_Timber", bevel=.035, grain="Y", hull=hull, soft=False)
            for h, height in ((.12, .24), (4.87, .19), (5.245, .11)):
                box(name + "_Worked_Block_%s" % h, (x, h, z),
                    (.50, height, .50), "Honey_Timber", bevel=.023,
                    hull=hull, soft=False)
            for h in (.34, 2.24, 2.33, 4.69):
                box(name + "_Brass_Collar_%s" % h, (x, h, z),
                    (.494, .045, .494), "Brass", bevel=.007,
                    hull=hull, soft=False)
            for dx in (-.15, .15):
                ellipsoid(name + "_Foot_Bolt_%s" % dx,
                          (x + dx, .13, z + side * .246),
                          (.027, .027, .010), "Brass", rings=4, sides=8)
        box("Side_Primary_Beam_%s" % side, (x, 5.19, 0),
            (.34, .40, 15.94), "Honey_Timber", "roof", .025, "Z")
        box("Side_Secondary_Trim_%s" % side, (x - side * .05, 4.94, 0),
            (.16, .10, 15.69), "Dark_Joinery", "roof", .013, "Z")
        for z in (-6.65, -1.50, 1.50, 6.65):
            near_z = min((-7.75, -2.6, 2.6, 7.75), key=lambda p: abs(p - z))
            beam_between("Side_Curved_Brace_%s_%s" % (side, z),
                         (x, 4.13, near_z), (x, 4.99, z), .15, .17)
    for z in (-7.75, 7.75):
        box("End_Primary_Beam_%s" % z, (0, 5.14, z),
            (22, .40, .32), "Honey_Timber", "roof", .025)
        for side in (-1, 1):
            beam_between("Portal_Diagonal_Brace_%s_%s" % (side, z),
                         (side * 10.71, 4.03, z), (side * 9.35, 4.96, z), .15, .17)
    for row, z in enumerate(np.linspace(-7.25, 7.25, 9)):
        box("Open_Pergola_Rafter_%02d" % row, (0, 5.37, float(z)),
            (22.0, .17, .18), "Honey_Timber", "roof", .018)
        for x in (-10.75, 10.75):
            box("Rafter_Brass_Strap_%s_%s" % (row, x), (x, 5.39, float(z)),
                (.115, .17, .194), "Brass", "roof", .006)
    for z in (-7.75, 7.75):
        for side in (-1, 1):
            x = side * 10.75
            box("Corner_Tenon_Crown_%s_%s" % (side, z),
                (x, 5.49, z), (.35, .20, .35), "Honey_Timber", "roof", .025)


def make_cloth():
    # Four tied corner pairs: fabric never crosses the middle/front portal.
    for side in (-1, 1):
        for end in (-1, 1):
            x, z = side * 10.55, end * 7.53
            for face in ("front", "side"):
                def sample(t, w, side=side, end=end, x=x, z=z, face=face):
                    # Tie at roughly waist height, broad loose folds above it.
                    tie = math.exp(-((t - .57) / .14) ** 2)
                    width = 1.50 * (1 - .74 * tie)
                    lateral = (w - .5) * width
                    sag = math.sin(math.pi * w) * (.12 + .035 * t)
                    folds = .085 * math.sin(w * math.tau * 5 + .27 * t)
                    y = 5.04 - t * 4.96 - sag * (1 - tie) * math.sin(math.pi * t)
                    if face == "front":
                        return (x - side * .44 + lateral, y, z - end * .19 + folds)
                    return (x - side * .14 + folds, y, z - end * .44 + lateral)
                normal = (0, 0, end) if face == "front" else (side, 0, 0)
                solid_grid("Tied_Curtain_%s_%s_%s" % (side, end, face),
                           21, 17, sample, normal, .016, "Ivory_Linen", "roof")
            torus("Corner_Tie_%s_%s" % (side, end), (x - side * .39, 2.22, z - end * .39),
                  .22, .027, "Ivory_Linen", "roof", segments=20, sides=6)
    # Sparse fabric strips shade only the rear band, not a full opaque roof.
    for index, x in enumerate((-6.4, 0, 6.4)):
        def sample(t, w, x=x):
            return (x + (w - .5) * 1.32, 5.12 - .20 * math.sin(math.pi * t)
                    + .028 * math.cos(w * math.tau * 4), -7.1 + t * 5.0)
        solid_grid("Sparse_Rear_Sail_%d" % index, 19, 7, sample,
                   (0, 1, 0), .015, "Ivory_Linen", "roof")
    for side in (-1, 1):
        x, z = side * 10.11, 7.48
        def pennant(t, w, x=x, z=z):
            bottom = .23 * (1 - abs(w - .5) * 2)
            return (x + (w - .5) * 1.13, 4.89 - t * (2.06 - bottom),
                    z + .048 * math.sin(w * math.tau * 2 + t * 2.2))
        solid_grid("Original_Violet_Compass_Pennant_%s" % side,
                   17, 13, pennant, (0, 0, 1), .017, "Violet_Fabric", "roof")
        compass("Pennant_Compass_%s" % side, x, 3.92, z + .11, .71)
        tube("Pennant_Hanging_Rod_%s" % side,
             [(x - .69, 4.99, z), (x + .69, 4.99, z)],
             [.045, .045], "Honey_Timber", "roof", 8)


def make_lighting_geometry():
    for line, z in enumerate((-6.7, -.65, 6.7)):
        points = [(x, 5.02 - .55 * math.sin(math.pi * (x + 10.1) / 20.2), z)
                  for x in np.linspace(-10.1, 10.1, 29)]
        tube("Festoon_Cable_%d" % line, points, [.023] * len(points),
             "Dark_Iron", sides=5)
        for bulb, x in enumerate(np.linspace(-9.4, 9.4, 15)):
            y = 5.02 - .55 * math.sin(math.pi * (x + 10.1) / 20.2)
            tube("Festoon_Socket_%d_%d" % (line, bulb),
                 [(x, y, z), (x, y - .075, z)], [.034, .034],
                 "Dark_Iron", sides=6)
            ellipsoid("Festoon_Amber_Bulb_%d_%d" % (line, bulb),
                      (x, y - .153, z), (.087, .116, .087),
                      "Amber_Light", rings=5, sides=10)
    for index, (x, z) in enumerate(((-5.2, -3.3), (0, -1.6),
                                    (5.2, -3.3), (-5.2, 3.2), (5.2, 3.2))):
        scale = 1.30 if index == 1 else .96
        tube("Suspended_Lantern_Chain_%d" % index,
             [(x, 5.2, z), (x, 4.27, z)], [.019, .019], "Dark_Iron", sides=6)
        lantern("Suspended_Lantern_%d" % index, (x, 3.93, z), scale)
    for side in (-1, 1):
        for end in (-1, 1):
            x, z = side * 10.45, end * 7.42
            beam_between("Post_Lamp_Bracket_%s_%s" % (side, end),
                         (x, 3.12, z), (x - side * .38, 3.22, z), .055, .06)
            lantern("Post_Lamp_%s_%s" % (side, end),
                    (x - side * .39, 2.97, z), .77)


def bench(name, x, z, yaw=0):
    side = abs(yaw) > .1
    hull = add_hull(name.lower(), "furniture", x, z,
                    1.35 if side else 3.7, 3.7 if side else 1.35, 1.40)
    cosine, sine = math.cos(yaw), math.sin(yaw)
    def place(lx, y, lz):
        return (x + lx * cosine + lz * sine, y, z - lx * sine + lz * cosine)
    for lx in (-1.52, 1.52):
        for lz in (-.39, .39):
            box(name + "_Leg_%s_%s" % (lx, lz), place(lx, .245, lz),
                (.16, .49, .16), "Honey_Timber", "interior", .027, "Y", hull, False, yaw)
    for row in range(4):
        box(name + "_Seat_Slat_%d" % row, place(0, .48, -.44 + row * .28),
            (3.57, .12, .265), "Honey_Timber", "interior", .020,
            hull=hull, soft=False, yaw=yaw)
    for lx in (-1.66, 1.66):
        box(name + "_Arm_Post_%s" % lx, place(lx, .74, -.42),
            (.135, .59, .13), "Honey_Timber", "interior", .018,
            "Y", hull, False, yaw)
        box(name + "_Arm_Rest_%s" % lx, place(lx, .84, 0),
            (.21, .14, 1.04), "Honey_Timber", "interior", .027,
            hull=hull, soft=False, yaw=yaw)
    for lx in (-1.53, 0, 1.53):
        box(name + "_Back_Support_%s" % lx, place(lx, .90, -.48),
            (.135, .87, .13), "Honey_Timber", "interior", .018,
            "Y", hull, False, yaw)
    for row in range(3):
        box(name + "_Back_Slat_%d" % row, place(0, .88 + row * .16, -.48),
            (3.57, .135, .11), "Honey_Timber", "interior", .021,
            hull=hull, soft=False, yaw=yaw)
    for index, lx in enumerate((-1.06, 0, 1.06)):
        obj = box(name + "_Padded_Seat_%d" % index, place(lx, .66, .04),
                  (1.0, .27, .86), "Violet_Cushion", "interior", .095,
                  hull=hull, soft=False, yaw=yaw)
        for mod in obj.modifiers:
            mod.width = .09
            mod.segments = 3
        obj = box(name + "_Padded_Back_%d" % index, place(lx, 1.09, -.35),
                  (1.0, .58, .25), "Violet_Fabric", "interior", .09,
                  hull=hull, soft=False, yaw=yaw)
        for mod in obj.modifiers:
            mod.width = .075
            mod.segments = 3
        # Stitched front edges are continuous piping, not blocky cushions.
        path = [place(lx - .45, .745, .43), place(lx + .45, .745, .43),
                place(lx + .45, .745, -.34), place(lx - .45, .745, -.34),
                place(lx - .45, .745, .43)]
        tube(name + "_Seat_Piping_%d" % index, path, [.009] * 5,
             "Violet_Fabric", "interior", sides=5)


def small_table(name, x, z):
    radius = .44
    hull = add_hull(name.lower(), "furniture", x, z, .88, .88, .75,
                    kind="cylinder", radius=radius)
    cylinder(name + "_Round_Top", (x, .71, z), .43, .075,
             "Honey_Timber", "interior", 28, hull, False)
    for index in range(3):
        phi = index * math.tau / 3
        tube(name + "_Splayed_Leg_%d" % index,
             [(x + .28 * math.cos(phi), 0, z + .28 * math.sin(phi)),
              (x + .28 * math.cos(phi), .10, z + .28 * math.sin(phi)),
              (x + .22 * math.cos(phi), .68, z + .22 * math.sin(phi))],
             [.058, .058, .055], "Honey_Timber", "interior", 8, hull, False)
    torus(name + "_Lower_Ring", (x, .28, z), .26, .029,
          "Honey_Timber", "interior", segments=20, sides=6)
    lantern(name + "_Table_Lantern", (x, 1.01, z), .72)


def lectern(name, x, z, kind):
    hull = add_hull(name.lower(), "desk", x, z, 3.0, 1.35, 1.30)
    for dx in (-1.17, 1.17):
        for dz in (-.43, .43):
            box(name + "_Leg_%s_%s" % (dx, dz), (x + dx, .52, z + dz),
                (.13, 1.04, .13), "Honey_Timber", "interior", .024,
                "Y", hull, False)
    box(name + "_Rear_Apron", (x, .87, z - .50),
        (2.66, .25, .105), "Honey_Timber", "interior", .018,
        hull=hull, soft=False)
    box(name + "_Front_Apron", (x, .84, z + .48),
        (2.66, .19, .105), "Honey_Timber", "interior", .018,
        hull=hull, soft=False)
    # Low inclined desk stays completely inside the existing 1.30 m hull.
    vertices = [(x - 1.46, 1.12, z - .64), (x + 1.46, 1.12, z - .64),
                (x + 1.46, 1.12, z + .64), (x - 1.46, 1.12, z + .64),
                (x - 1.46, 1.285, z - .64), (x + 1.46, 1.285, z - .64),
                (x + 1.46, 1.19, z + .64), (x - 1.46, 1.19, z + .64)]
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    mesh_object(name + "_Inclined_Consultation_Top", vertices, faces,
                "Honey_Timber", "interior", hull=hull, soft=False)
    box(name + "_Brass_Pencil_Lip", (x, 1.216, z + .57),
        (2.67, .028, .055), "Brass", "interior", .006,
        hull=hull, soft=False)
    def tabletop_y(lz):
        return 1.285 - .095 * (lz + .64) / 1.28
    for label, dx in (("Left", -.36), ("Right", .30)):
        paper_corners = [(x + dx - .315, z + .05 - .33),
                         (x + dx + .315, z + .05 - .33),
                         (x + dx + .315, z + .05 + .33),
                         (x + dx - .315, z + .05 + .33)]
        paper_vertices = [(px, tabletop_y(pz - z) + layer, pz)
                          for layer in (.004, .019) for px, pz in paper_corners]
        mesh_object(name + "_Document_" + label, paper_vertices, faces,
                    "Paper", "decor")
    # Abstract lines are illustrative stationery, never false factual evidence.
    for line in range(4):
        box(name + "_Illustrative_Ink_%d" % line,
            (x - .36, tabletop_y(-.17 + line * .105) + .0205,
             z - .17 + line * .105),
            (.37 - line * .04, .002, .010), "Dark_Joinery", "decor", 0)
    marker = box(name + "_Violet_Bookmark", (x + .5, tabletop_y(.28) + .025, z + .28),
                 (.055, .005, .30), "Violet_Fabric", "decor", 0)
    marker["document_identity"] = kind
    marker["factual_boundary"] = "Existing Athlete/Teacher station; no invented record"


def make_interior():
    bench("Rear_Bench_West", -5.35, -6.48)
    bench("Rear_Bench_East", 5.35, -6.48)
    bench("Side_Bench_West", -9.1, -.5, math.pi / 2)
    bench("Side_Bench_East", 9.1, -.5, -math.pi / 2)
    for index, (x, z) in enumerate(((-2.6, -6.36), (2.6, -6.36),
                                    (-9.08, -3.50), (9.08, -3.50))):
        small_table("Side_Table_%d" % index, x, z)
    for index, (x, z) in enumerate(((-9.60, -6.50), (9.60, -6.50),
                                    (-8.30, -4.65), (8.30, -4.65),
                                    (-9.65, 2.80), (9.65, 2.80),
                                    (-9.60, 6.45), (9.60, 6.45))):
        pot("Terracotta_Planter_%d" % index, x, z)
    lectern("Dance_Athlete_Consultation", -7, 5, "athlete")
    lectern("Dance_Teacher_Consultation", 7, 5, "teacher")
    # Two short rear planters, no solid rail across the entrance or side routes.
    for side in (-1, 1):
        x, z = side * 5.3, -7.42
        name = "Rear_Herb_Trough_%s" % side
        hull = add_hull(name.lower(), "furniture", x, z, 8.15, .54, .38)
        box(name + "_Base", (x, .115, z), (8.08, .23, .52),
            "Dark_Joinery", "interior", .01, hull=hull, soft=False)
        for dz in (-.235, .235):
            box(name + "_Timber_Edge_%s" % dz, (x, .29, z + dz),
                (8.10, .17, .06), "Honey_Timber", "interior", .007,
                hull=hull, soft=False)
        for dx in (-4.015, 4.015):
            box(name + "_Timber_End_%s" % dx, (x + dx, .29, z),
                (.08, .17, .48), "Honey_Timber", "interior", .007,
                hull=hull, soft=False)
        box(name + "_Recessed_Soil", (x, .265, z), (7.98, .03, .39),
            "Soil", "decor", .004)
        for index in range(5):
            plant_cluster(name + "_Leaf_Pocket_%d" % index,
                          (x - 3.12 + index * 1.56, .29, z), 10, .87, 2)


def make_overhead_greenery():
    for side in (-1, 1):
        x = side * 10.60
        for end in (-1, 1):
            z = end * 7.48
            plant_cluster("Corner_Crown_%s_%s" % (side, end),
                          (x, 5.44, z), 13, .90, 2)
            vine("Corner_Trailing_%s_%s" % (side, end),
                 (x - side * .16, 5.52, z),
                 (x - side * .46, 4.5, z - end * .35),
                 (x - side * .22, 3.46, z - end * .30), 13, .54)
        for index, z in enumerate((-4.5, 1.1)):
            vine("Attached_Side_Vine_%s_%d" % (side, index),
                 (x, 5.30, z - 1.7), (x - side * .30, 5.24, z),
                 (x, 5.37, z + 1.7), 13, .54)
    for index, x in enumerate((-5.2, 5.2)):
        plant_cluster("Rear_Rafter_Greenery_%d" % index,
                      (x, 5.41, -7.6), 13, .86, 3)


def initialize_scene():
    global COLLECTION, PREVIEW_COLLECTION
    # Idempotent only within this recipe's owned namespace; never clear a scene.
    for obj in list(bpy.data.objects):
        if obj.name.startswith(PREFIX) or obj.name == ROOT_NAME or obj.name in {"Dance_shell", "Dance_roof", "Dance_interior", "Dance_decor"}:
            bpy.data.objects.remove(obj, do_unlink=True)
    for collection in list(bpy.data.collections):
        if collection.name in {COLLECTION_NAME, PREVIEW_COLLECTION_NAME}:
            bpy.data.collections.remove(collection)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                       bpy.data.cameras, bpy.data.lights):
        for item in list(datablocks):
            if item.name.startswith(PREFIX) and item.users == 0:
                datablocks.remove(item)
    COLLECTION = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(COLLECTION)
    PREVIEW_COLLECTION = bpy.data.collections.new(PREVIEW_COLLECTION_NAME)
    bpy.context.scene.collection.children.link(PREVIEW_COLLECTION)
    root = bpy.data.objects.new(ROOT_NAME, None)
    COLLECTION.objects.link(root)
    root["units"] = "metres"
    root["asset_role"] = "Original editable reference-led coastal dance pavilion"
    root["not_automatic_reconstruction"] = True
    for part in ("shell", "roof", "interior", "decor"):
        group = bpy.data.objects.new("Dance_" + part, None)
        COLLECTION.objects.link(group)
        group.parent = root
        group["runtime_group"] = part
        GROUPS[part] = group
    return root


def make_preview():
    scene = bpy.context.scene
    # Blender 5.2's identifier is BLENDER_EEVEE, not the retired EEVEE_NEXT.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 60
    scene.render.image_settings.file_format = "PNG"
    for transform in ("AgX", "Standard"):
        try:
            scene.view_settings.view_transform = transform
            break
        except (TypeError, ValueError):
            pass
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    if scene.world is None:
        scene.world = bpy.data.worlds.new(PREFIX + "Preview_World")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (.63, .75, .88, 1)
    background.inputs["Strength"].default_value = .47
    cam_data = bpy.data.cameras.new(PREFIX + "Preview_Camera_Data")
    camera = bpy.data.objects.new(PREFIX + "Preview_Camera_Exclude_From_Asset", cam_data)
    PREVIEW_COLLECTION.objects.link(camera)
    camera.location = to_blender((29, 17.5, 28))
    target = Vector(to_blender((0, 2.5, -.5)))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.lens = 47
    scene.camera = camera
    light_specs = [("Warm_Daylight_Key", "SUN", (12, 25, 11), 2.6, (1, .84, .66), 0),
                   ("Sky_Window_Fill", "AREA", (-13, 15, 1), 1800, (.67, .79, 1), 12),
                   ("Rear_Warm_Bounce", "AREA", (0, 8, -11), 900, (1, .71, .43), 9)]
    for name, kind, position, energy, color, size in light_specs:
        data = bpy.data.lights.new(PREFIX + name + "_Data", kind)
        data.energy = energy
        data.color = color
        if kind == "SUN":
            data.angle = math.radians(8)
        elif hasattr(data, "shape"):
            data.shape = "DISK"
            data.size = size
        obj = bpy.data.objects.new(PREFIX + name + "_Preview_Only", data)
        PREVIEW_COLLECTION.objects.link(obj)
        obj.location = to_blender(position)
        obj.rotation_euler = (Vector(to_blender((0, 1.1, -1))) - obj.location).to_track_quat("-Z", "Y").to_euler()
    # Preview-only real fills; public world owns its own bounded lights.
    for index, x in enumerate((-5.2, 0, 5.2)):
        data = bpy.data.lights.new(PREFIX + "Lantern_Fill_%d_Data" % index, "POINT")
        data.energy = 75
        data.color = (1, .53, .19)
        data.shadow_soft_size = .55
        obj = bpy.data.objects.new(PREFIX + "Lantern_Fill_%d_Preview_Only" % index, data)
        PREVIEW_COLLECTION.objects.link(obj)
        obj.location = to_blender((x, 3.8, -1.6))
    for obj in PREVIEW_COLLECTION.objects:
        obj["preview_only"] = True


def finish_table_feet_and_check_hulls():
    """Standalone differential for the already-created first native revision.

    Root may extract this function and call it in one later guarded operation.
    Changes only the twelve owned table-leg meshes; no rebuild or extra scene.
    No dependency on helpers/globals surviving a separate 3D Jutsu operation.
    """
    import json as _json
    import math as _math
    import bpy as _bpy
    import numpy as _np
    from mathutils import Vector as _Vector

    root_name = "DancePavilion_V1_Origin_At_Deck_Centre"
    prefix = "DancePavilion_"
    root_object = _bpy.data.objects.get(root_name)
    if root_object is None or "proposed_solid_contract_json" not in root_object:
        raise RuntimeError("The settled Dance master/solid contract is required")
    tables = [(-2.6, -6.36), (2.6, -6.36), (-9.08, -3.50), (9.08, -3.50)]
    changed = []
    for table, (x, z) in enumerate(tables):
        for leg in range(3):
            name = prefix + "Side_Table_%d_Splayed_Leg_%d" % (table, leg)
            obj = _bpy.data.objects.get(name)
            if obj is None or obj.type != "MESH":
                raise RuntimeError("Missing owned table leg: " + name)
            phi = leg * _math.tau / 3
            points = [_Vector((x + .28 * _math.cos(phi), 0, z + .28 * _math.sin(phi))),
                      _Vector((x + .28 * _math.cos(phi), .10, z + .28 * _math.sin(phi))),
                      _Vector((x + .22 * _math.cos(phi), .68, z + .22 * _math.sin(phi)))]
            radii, vertices, faces, uv, frame = [.058, .058, .055], [], [], [], None
            sides = 8
            for row, point in enumerate(points):
                tangent = points[min(2, row + 1)] - points[max(0, row - 1)]
                tangent.normalize()
                if frame is None:
                    reference = _Vector((0, 1, 0)) if abs(tangent.y) < .9 else _Vector((0, 0, 1))
                    frame = tangent.cross(reference).normalized()
                else:
                    frame -= tangent * frame.dot(tangent)
                    frame.normalize()
                other = tangent.cross(frame).normalized()
                for side in range(sides):
                    theta = side * _math.tau / sides
                    point_on_ring = point + (frame * _math.cos(theta) + other * _math.sin(theta)) * radii[row]
                    vertices.append((point_on_ring.x, -point_on_ring.z, point_on_ring.y))
                    uv.append((side / sides, row / 2))
            for row in range(2):
                for side in range(sides):
                    edge = (side + 1) % sides
                    faces.append((row * sides + side, row * sides + edge,
                                  (row + 1) * sides + edge, (row + 1) * sides + side))
            vertices.extend(((points[0].x, -points[0].z, points[0].y),
                             (points[2].x, -points[2].z, points[2].y)))
            uv.extend(((.5, 0), (.5, 1)))
            for side in range(sides):
                faces.extend(((24, (side + 1) % sides, side),
                              (25, 16 + side, 16 + (side + 1) % sides)))
            old_data = obj.data
            data = _bpy.data.meshes.new(name + "_Grounded_Mesh")
            data.from_pydata(vertices, [], faces)
            data.update()
            for mat in old_data.materials:
                data.materials.append(mat)
            layer = data.uv_layers.new(name="UVMap")
            for polygon in data.polygons:
                polygon.use_smooth = len(polygon.vertices) == 4
                for loop_id in polygon.loop_indices:
                    layer.data[loop_id].uv = uv[data.loops[loop_id].vertex_index]
            data.calc_loop_triangles()
            for tri in data.loop_triangles:
                a, b, c = (data.vertices[index].co for index in tri.vertices)
                if (b - a).cross(c - a).length_squared < 1e-20:
                    raise RuntimeError("Degenerate differential leg: " + name)
            obj.data = data
            if old_data.users == 0:
                _bpy.data.meshes.remove(old_data)
            changed.append(name)
    _bpy.context.view_layer.update()
    contract = _json.loads(root_object["proposed_solid_contract_json"])
    hulls = {hull["id"]: hull for hull in contract["hulls"]}
    hulls["dance-pavilion-deck"] = {
        "kind": "box", "x": 0, "z": 0, "width": 22, "depth": 16,
        "bottom": -.24, "height": .24}
    deps = _bpy.context.evaluated_depsgraph_get()
    maximum_excess, hard_vertices, triangles, foot_minima = 0.0, 0, 0, {}
    for obj in _bpy.data.collections["DancePavilion_V1_Editable_Asset"].objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(deps)
        data = evaluated.to_mesh()
        try:
            data.calc_loop_triangles()
            triangles += len(data.loop_triangles)
            if "shared_hull_id" not in obj:
                continue
            points = [evaluated.matrix_world @ vertex.co for vertex in data.vertices]
            values = _np.asarray([(point.x, point.z, -point.y) for point in points])
            hard_vertices += len(values)
            if not _np.isfinite(values).all():
                raise RuntimeError("Non-finite differential hard geometry")
            hull = hulls[obj["shared_hull_id"]]
            vertical = _np.maximum(hull["bottom"] - values[:, 1],
                                   values[:, 1] - hull["bottom"] - hull["height"])
            if hull["kind"] == "cylinder":
                horizontal = _np.hypot(values[:, 0] - hull["x"], values[:, 2] - hull["z"]) - hull["radius"]
            else:
                horizontal = _np.maximum(_np.abs(values[:, 0] - hull["x"]) - hull["width"] / 2,
                                         _np.abs(values[:, 2] - hull["z"]) - hull["depth"] / 2)
            excess = max(0.0, float(_np.max(vertical)), float(_np.max(horizontal)))
            maximum_excess = max(maximum_excess, excess)
            if excess > 2e-6:
                raise RuntimeError("Hard geometry outside hull %s: %.8fm" % (obj.name, excess))
            if obj.name in changed:
                foot_minima[obj.name] = float(values[:, 1].min())
                if abs(foot_minima[obj.name]) > 2e-6:
                    raise RuntimeError("A table foot is still detached from the floor")
        finally:
            evaluated.to_mesh_clear()
    if triangles > 165_000:
        raise RuntimeError("Differential exceeds source triangle budget")
    return {"changedMeshes": changed, "changedCount": len(changed),
            "footMinima": foot_minima, "evaluatedTriangles": triangles,
            "checkedHardVertices": hard_vertices,
            "maximumEvaluatedHullExcess": maximum_excess,
            "scope": "Actual Blender evaluated source; GLB/export/browser still requires separate verification"}


def evaluated_summary(root):
    deps = bpy.context.evaluated_depsgraph_get()
    count, triangles, vertices, points = 0, 0, 0, []
    hard_bounds = {}
    for obj in COLLECTION.objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            count += 1
            triangles += len(mesh.loop_triangles)
            vertices += len(mesh.vertices)
            transformed = [to_gltf(evaluated.matrix_world @ vertex.co) for vertex in mesh.vertices]
            points.extend(transformed)
            if "shared_hull_id" in obj:
                bucket = hard_bounds.setdefault(obj["shared_hull_id"], [])
                bucket.extend(transformed)
        finally:
            evaluated.to_mesh_clear()
    xyz = np.asarray(points)
    if len(points) == 0 or not np.isfinite(xyz).all():
        raise RuntimeError("Dance bounds are missing or non-finite")
    if triangles > TRIANGLE_BUDGET:
        raise RuntimeError("Dance evaluated triangle budget exceeded: %d" % triangles)
    summaries = {}
    hull_map = {hull["id"]: hull for hull in HULLS}
    hull_map["dance-pavilion-deck"] = {
        "kind": "box", "x": 0, "z": 0, "width": 22, "depth": 16,
        "bottom": -.24, "height": .24}
    maximum_hull_excess = 0.0
    for name, values in hard_bounds.items():
        values = np.asarray(values)
        summaries[name] = {"minimum": values.min(axis=0).tolist(),
                           "maximum": values.max(axis=0).tolist()}
        hull = hull_map[name]
        vertical = np.maximum(hull["bottom"] - values[:, 1],
                              values[:, 1] - hull["bottom"] - hull["height"])
        if hull["kind"] == "cylinder":
            horizontal = np.hypot(values[:, 0] - hull["x"],
                                  values[:, 2] - hull["z"]) - hull["radius"]
        else:
            horizontal = np.maximum(np.abs(values[:, 0] - hull["x"]) - hull["width"] / 2,
                                    np.abs(values[:, 2] - hull["z"]) - hull["depth"] / 2)
        excess = max(0.0, float(np.max(vertical)), float(np.max(horizontal)))
        maximum_hull_excess = max(maximum_hull_excess, excess)
        if excess > 2e-6:
            raise RuntimeError("Actual evaluated hard geometry exceeds proposed hull %s: %.8fm" % (name, excess))
    root["proposed_solid_contract_json"] = json.dumps({
        "schema": "archipelago-static-building-contract-v1",
        "asset": "dance-pavilion-v1", "root": ROOT_NAME, "units": "metres",
        "axes": "glTF X right, Y up, Z front; Blender(X,-Z,Y)",
        "deck": {"id": "dance-pavilion-deck", "width": 22, "depth": 16,
                 "bottom": -.24, "height": .24, "walkingTop": 0},
        "hulls": HULLS, "stations": [{"kind": "athlete", "x": -7, "z": 5},
                                      {"kind": "teacher", "x": 7, "z": 5}],
        "clearApproach": {"xMin": -5, "xMax": 5, "zMin": -4.8, "zMax": 8},
        "softNonSolid": ["pergola beams/roof above head height", "cloth",
                         "leaves and vines", "lanterns", "stationery", "compass motif"],
        "integrationStatus": "PROPOSED only: root must approve map/hulls/support and actual GLB before gameplay",
        "runtimeGuards": {"bytesMax": 8388608, "meshesMax": 96,
                          "trianglesMax": 180000},
        "factualBoundary": "Athlete/Teacher identity only; no person/statue/results/venue/service claims"
    }, separators=(",", ":"))
    return {"root": ROOT_NAME, "groups": [group.name for group in GROUPS.values()],
            "sourceMeshes": count, "evaluatedTriangles": triangles,
            "evaluatedVertices": vertices, "minimum": xyz.min(axis=0).tolist(),
            "maximum": xyz.max(axis=0).tolist(), "materials": len(MATERIALS),
            "packedImages": len(TEXTURES), "textureDimensionMax": TEXTURE_DIMENSION_MAX,
            "solidHulls": HULLS, "solidBounds": summaries,
            "maximumEvaluatedHullExcess": maximum_hull_excess,
            "runtimeIntegration": "Not performed by this authoring recipe",
            "exportRenderOrFileWrites": False}


root = initialize_scene()
make_materials()
make_floor()
make_structure()
make_cloth()
make_lighting_geometry()
make_interior()
make_overhead_greenery()
make_preview()
bpy.context.view_layer.update()
result = evaluated_summary(root)
