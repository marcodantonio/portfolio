"""Reference-led home-studio v2, Blender 5.2 / dedicated authoring project.

Original editable metre-scale geometry, portable packed PBR; no network or
external images. Blender Z-up; the worker exports standard glTF Y-up. This is
an asset study, not active game integration or an image-identical reconstruction.
The v1 deck, structural posts and furniture/pot positions remain unchanged.
Added botanical/illustrative details are decorative, never new walkable solids.
Run with bpy, numpy and the worker's artifacts registry; result is JSON-safe.
"""

import bpy
import math
import random
import json
import numpy as np
from mathutils import Vector


SEED = 271002
PREFIX = "Studio_"
ROOT_NAME = "HomeStudio_V2_Origin_At_Deck_Centre"
COLLECTION_NAME = "HomeStudio_V2_Editable_Asset"
PREVIEW_NAME = "studio-v2-eevee.png"
TRIANGLE_BUDGET = 180_000
TEXTURE_RESOLUTION_LIMIT = 512
GLB_BYTE_TARGET = 8 * 1024 * 1024  # Advisory until the parent exports the GLB.
random.seed(SEED)
GROUPS = {}
MATERIALS = {}
TEXTURES = []
COLLECTION = None


def rgba(rgb):
    return np.concatenate((np.clip(rgb, 0, 1), np.ones((*rgb.shape[:2], 1))), axis=2)


def packed_image(name, pixels, non_color=False):
    image = bpy.data.images.new(PREFIX + name, width=pixels.shape[1],
                                height=pixels.shape[0], alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(np.asarray(pixels, dtype=np.float32).ravel())
    image.update()
    image.pack()
    TEXTURES.append(image)
    return image


def normal_image(name, height, strength):
    dy, dx = np.gradient(height)
    normal = np.stack((-dx * strength, -dy * strength, np.ones_like(dx)), axis=2)
    normal /= np.linalg.norm(normal, axis=2)[..., None]
    return packed_image(name, rgba(normal * 0.5 + 0.5), True)


def material(name, color, roughness=0.65, metallic=0.0, base=None,
             normal=None, rough_map=None, emission=None, emission_image=None):
    mat = bpy.data.materials.new(PREFIX + "PBR_" + name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    for image, socket in ((base, "Base Color"), (rough_map, "Roughness")):
        if image is not None:
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = image
            mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs[socket])
    if normal is not None:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = normal
        converter = nodes.new("ShaderNodeNormalMap")
        converter.inputs["Strength"].default_value = 0.34
        mat.node_tree.links.new(tex.outputs["Color"], converter.inputs["Color"])
        mat.node_tree.links.new(converter.outputs["Normal"], bsdf.inputs["Normal"])
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    if emission_image is not None:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = emission_image
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 0.24
    MATERIALS[name] = mat
    return mat


def make_materials():
    # Own source, same portable packed-image strategy as the bridge/palm masters.
    u, v = np.meshgrid(np.linspace(0, 1, 512, endpoint=False),
                       np.linspace(0, 1, 384, endpoint=False))
    flow = v + 0.012 * np.sin(u * 16 + v * 9) + 0.005 * np.sin(u * 37 - v * 18)
    fibre = np.sin(flow * math.tau * 38) + 0.35 * np.sin(flow * math.tau * 91 + u * 6)
    knot_radius = np.sqrt(((u - 0.58) * 1.3) ** 2 + ((v - 0.60) * 4.8) ** 2)
    knot = np.sin(knot_radius * 61) * np.exp(-knot_radius * 7)
    fine = np.sin(u * 641 + v * 391) * np.sin(v * 939 - u * 271)
    tone = 0.97 + fibre * 0.028 + knot * 0.042 + fine * 0.009
    wood = packed_image("Timber_Honey_Grain_Base_512", rgba(tone[..., None] * (0.72, 0.405, 0.18)))
    wood_normal = normal_image("Timber_Carved_Fibre_Normal_512", fibre * 0.035 + knot * 0.024, 10)
    rough = np.clip(0.69 + fibre * 0.023 + fine * 0.012, 0.57, 0.80)
    wood_rough = packed_image("Timber_Weather_Roughness_512", rgba(np.repeat(rough[..., None], 3, axis=2)), True)
    material("Honey_Timber", (0.72, 0.405, 0.18), base=wood, normal=wood_normal, rough_map=wood_rough)
    material("Dark_Joinery", (0.29, 0.125, 0.048), 0.74)
    material("Cut_Endgrain", (0.50, 0.275, 0.105), 0.78)
    u, v = np.meshgrid(np.linspace(0, 1, 384, endpoint=False), np.linspace(0, 1, 256, endpoint=False))
    clay = np.sin(u * 47 + v * 18) * np.sin(u * 13 - v * 53)
    speckle = np.sin(u * 533 + v * 171) * np.sin(u * 291 - v * 467)
    tone = 0.97 + clay * 0.055 + speckle * 0.018
    tile = packed_image("Terracotta_Fired_Clay_Base_384", rgba(tone[..., None] * (0.66, 0.235, 0.103)))
    tile_normal = normal_image("Terracotta_Fired_Clay_Normal_384", clay * 0.030 + speckle * 0.018, 7)
    material("Terracotta", (0.66, 0.235, 0.103), 0.70, base=tile, normal=tile_normal)
    weave = np.sin(u * math.tau * 73) * np.sin(v * math.tau * 61)
    fabric = packed_image("Linen_Weave_Cream_Base_384", rgba((0.96 + weave * 0.020)[..., None] * (0.88, 0.81, 0.65)))
    fabric_normal = normal_image("Linen_Weave_Normal_384", weave * 0.025, 4)
    material("Cream_Linen", (0.88, 0.81, 0.65), 0.91, base=fabric, normal=fabric_normal)
    material("Violet_Cloth", (0.28, 0.055, 0.57), 0.82, normal=fabric_normal)
    # An ornamental woven rug, not a screen, photo or factual portfolio content.
    edge = np.minimum.reduce((u, v, 1 - u, 1 - v))
    border = (edge < 0.075) | ((edge > 0.115) & (edge < 0.145))
    diamond = np.abs(np.mod(u * 8 + v * 8, 1) - 0.5) < 0.07
    rug_rgb = np.empty((*u.shape, 3))
    rug_rgb[:] = (0.47, 0.125, 0.082)
    rug_rgb[border] = (0.77, 0.57, 0.23)
    rug_rgb[diamond & ~border] = (0.60, 0.30, 0.12)
    material("Woven_Rug", (0.47, 0.125, 0.082), 0.95,
             base=packed_image("Rug_Ornamental_Woven_Base_384", rgba(rug_rgb)), normal=fabric_normal)
    vein = np.exp(-((v - 0.5) / 0.036) ** 2)
    leaf_tone = 0.94 + 0.035 * np.sin(u * 19 + v * 7) + 0.035 * np.sin(u * 61 - abs(v - 0.5) * 13)
    leaf_rgb = leaf_tone[..., None] * (0.32, 0.55, 0.075) + vein[..., None] * (0.10, 0.09, 0.015)
    leaf_base = packed_image("Broadleaf_Vein_Base_384", rgba(leaf_rgb))
    leaf_normal = normal_image("Broadleaf_Vein_Normal_384", vein * 0.07 + np.sin(u * 61 - abs(v - 0.5) * 13) * 0.025, 5)
    material("Broad_Green_Leaf", (0.32, 0.55, 0.075), 0.55, base=leaf_base, normal=leaf_normal)
    material("Deep_Green_Leaf", (0.12, 0.31, 0.055), 0.57, normal=leaf_normal)
    material("Young_Green_Leaf", (0.40, 0.62, 0.12), 0.59, normal=leaf_normal)
    for name, color, roughness, metal in (
        ("Brass", (0.68, 0.46, 0.14), 0.34, 0.72),
        ("Iron", (0.08, 0.10, 0.105), 0.48, 0.65),
        ("Charcoal_Leather", (0.10, 0.115, 0.12), 0.70, 0),
        ("Screen_Off_Glass", (0.025, 0.05, 0.069), 0.21, 0.16),
        ("Paper", (0.85, 0.79, 0.64), 0.92, 0),
        ("Soil", (0.095, 0.065, 0.038), 0.97, 0),
        ("Ivory_Ceramic", (0.86, 0.82, 0.69), 0.38, 0),
        ("Book_Indigo", (0.25, 0.17, 0.48), 0.80, 0),
        ("Book_Olive", (0.24, 0.39, 0.10), 0.81, 0),
        ("Book_Russet", (0.61, 0.15, 0.09), 0.80, 0),
        ("Book_Ochre", (0.77, 0.48, 0.13), 0.80, 0),
        ("Book_Teal", (0.07, 0.37, 0.36), 0.80, 0),
        ("Book_Berry", (0.50, 0.075, 0.24), 0.80, 0),
        ("Bloom_Coral", (0.78, 0.16, 0.13), 0.65, 0),
    ):
        material(name, color, roughness, metal)
    material("Amber_Lamp", (0.95, 0.63, 0.19), 0.34, emission=(1.0, 0.57, 0.16))
    make_illustration_materials()


def make_illustration_materials():
    """One small original atlas: abstract interfaces, fictional map and postcard.

    No letters, copied screenshot, biography, real photograph or external image.
    Every panel has a closed physical backing; this is not an alpha card.
    """
    tile_size = 256
    u, v = np.meshgrid(np.linspace(0, 1, tile_size, endpoint=False),
                       np.linspace(0, 1, tile_size, endpoint=False))

    def canvas(color):
        pixels = np.empty((tile_size, tile_size, 3), dtype=np.float32)
        pixels[:] = color
        return pixels

    def rectangle(pixels, bounds, color):
        x0, y0, x1, y1 = bounds
        pixels[(u >= x0) & (u <= x1) & (v >= y0) & (v <= y1)] = color

    def line(pixels, start, end, width, color):
        dx, dy = end[0] - start[0], end[1] - start[1]
        denominator = dx * dx + dy * dy
        if denominator <= 0:
            raise ValueError("Illustration segment has no extent")
        fraction = np.clip(((u - start[0]) * dx + (v - start[1]) * dy) / denominator, 0, 1)
        distance = np.hypot(u - start[0] - fraction * dx, v - start[1] - fraction * dy)
        # A one-pixel blend softens the authored lines, with opaque coverage.
        coverage = np.clip((width - distance) * tile_size + 0.5, 0, 1)
        pixels[:] = pixels * (1 - coverage[..., None]) + np.asarray(color) * coverage[..., None]

    colors = ((0.30, 0.78, 0.76), (0.65, 0.40, 0.92), (0.92, 0.65, 0.31))
    code = canvas((0.027, 0.065, 0.09))
    rectangle(code, (0.04, 0.04, 0.15, 0.96), (0.043, 0.10, 0.135))
    rectangle(code, (0.18, 0.89, 0.90, 0.93), (0.15, 0.26, 0.31))
    for row in range(12):
        y = 0.80 - row * 0.052
        x = 0.22 + 0.034 * (row % 3)
        width = 0.25 + 0.023 * ((row * 5) % 9)
        rectangle(code, (x, y, x + width, y + 0.012), colors[row % 3])
        rectangle(code, (x + width + 0.035, y, min(0.91, x + width + 0.19), y + 0.012), (0.24, 0.38, 0.44))
        rectangle(code, (0.08, y, 0.104, y + 0.015), (0.13, 0.28, 0.33))
    diagram = canvas((0.025, 0.078, 0.11))
    for x in np.linspace(0.08, 0.92, 9):
        line(diagram, (x, 0.08), (x, 0.92), 0.0016, (0.06, 0.16, 0.20))
        line(diagram, (0.08, x), (0.92, x), 0.0016, (0.06, 0.16, 0.20))
    nodes = ((0.50, 0.76), (0.26, 0.59), (0.73, 0.60), (0.26, 0.33), (0.73, 0.34), (0.50, 0.17))
    for a, b in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 4), (3, 4), (3, 5), (4, 5), (0, 5)):
        line(diagram, nodes[a], nodes[b], 0.005, (0.21, 0.65, 0.79))
    for index, (x, y) in enumerate(nodes):
        distance = np.hypot(u - x, v - y)
        diagram[distance < 0.036] = colors[index % 3]
        diagram[distance < 0.018] = (0.73, 0.90, 0.90)
    map_ = canvas((0.86, 0.78, 0.60))
    paper = (u > 0.07) & (u < 0.93) & (v > 0.07) & (v < 0.93)
    map_[paper] = (0.46, 0.66, 0.67)
    islands = ((0.28, 0.65, 0.13, 0.17), (0.56, 0.71, 0.14, 0.10),
               (0.69, 0.42, 0.12, 0.15), (0.37, 0.30, 0.17, 0.11), (0.25, 0.42, 0.06, 0.065))
    for index, (x, y, rx, ry) in enumerate(islands):
        angle = np.arctan2((v - y) / ry, (u - x) / rx)
        shape = np.hypot((u - x) / rx, (v - y) / ry)
        edge = 1 + 0.13 * np.sin(angle * 3 + index) + 0.09 * np.cos(angle * 5)
        map_[paper & (shape < edge * 1.09)] = (0.89, 0.79, 0.50)
        map_[paper & (shape < edge * 0.84)] = (0.30, 0.49, 0.24)
        map_[paper & (shape < edge * 0.48)] = (0.46, 0.56, 0.29)
    for a, b in ((0, 1), (1, 2), (2, 3), (3, 4)):
        line(map_, islands[a][:2], islands[b][:2], 0.003, (0.75, 0.56, 0.25))
    # Decorative compass only; fictional geography and no destination names.
    for end in ((0.83, 0.23), (0.83, 0.12), (0.775, 0.175), (0.885, 0.175)):
        line(map_, (0.83, 0.175), end, 0.004, (0.39, 0.24, 0.13))
    postcard = canvas((0.91, 0.86, 0.72))
    inset = (u > 0.085) & (u < 0.915) & (v > 0.10) & (v < 0.90)
    postcard[inset] = (0.51, 0.74, 0.80)
    postcard[inset & (v < 0.40)] = (0.10, 0.43, 0.53)
    hill = 0.38 + 0.20 * np.exp(-((u - 0.28) / 0.16) ** 2) + 0.12 * np.exp(-((u - 0.69) / 0.20) ** 2)
    postcard[inset & (v < hill) & (v > 0.25)] = (0.27, 0.42, 0.25)
    postcard[inset & (v < 0.31 + 0.04 * np.sin(u * 7))] = (0.79, 0.67, 0.44)
    postcard[inset & (np.hypot(u - 0.73, v - 0.75) < 0.061)] = (0.96, 0.82, 0.41)
    atlas = np.empty((512, 512, 3), dtype=np.float32)
    atlas[256:, :256], atlas[256:, 256:] = code, diagram
    atlas[:256, :256], atlas[:256, 256:] = map_, postcard
    image = packed_image("Authored_Abstract_Interfaces_Map_Postcard_Atlas_512", rgba(atlas))
    material("Illustration_Atlas", (1, 1, 1), 0.87, base=image)
    material("Screen_Abstract_Atlas", (1, 1, 1), 0.47, base=image, emission_image=image)


def mesh_object(name, vertices, faces, mat, part, uv=None, smooth=False):
    data = bpy.data.meshes.new(PREFIX + name + "_Mesh")
    data.from_pydata(vertices, [], faces)
    data.update()
    data.calc_loop_triangles()
    for triangle in data.loop_triangles:
        a, b, c = (data.vertices[index].co for index in triangle.vertices)
        if (b - a).cross(c - a).length_squared < 1e-20:
            raise RuntimeError("Zero-area source triangle in " + name)
    if uv is not None:
        layer = data.uv_layers.new(name="UVMap")
        for polygon in data.polygons:
            for loop_id in polygon.loop_indices:
                vertex = data.vertices[data.loops[loop_id].vertex_index].co
                layer.data[loop_id].uv = uv(vertex, polygon.normal) if callable(uv) else uv[data.loops[loop_id].vertex_index]
    if mat is not None:
        data.materials.append(MATERIALS[mat])
    for polygon in data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4 if smooth == "SIDES" else bool(smooth)
    obj = bpy.data.objects.new(PREFIX + name, data)
    COLLECTION.objects.link(obj)
    obj.parent = GROUPS[part]
    obj["asset_role"] = "Original reference-led home-studio part"
    obj["runtime_group"] = part
    return obj


def box(name, center, size, mat, part, bevel=0.025, grain="X"):
    x, y, z = (value / 2 for value in size)
    verts = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
             (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    def uv(point, normal):
        if mat == "Woven_Rug":
            return (point.x / size[0] + 0.5, point.y / size[1] + 0.5)
        primary = {"X": point.x, "Y": point.y, "Z": point.z}[grain]
        secondary = point.y if grain == "X" and abs(normal.z) > 0.5 else point.x
        if grain == "Y":
            secondary = point.x if abs(normal.z) > 0.5 else point.z
        if grain == "Z":
            secondary = point.x if abs(normal.y) > 0.5 else point.y
        return (primary * 0.32, secondary * 0.60 + 0.5)
    obj = mesh_object(name, verts, faces, mat, part, uv)
    obj.location = center
    if bevel > 0:
        modifier = obj.modifiers.new("Conservative hand-softened edges", "BEVEL")
        modifier.width = min(bevel, min(size) * 0.14)
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
    return obj


def tube(name, points, radii, mat, part, sides=8):
    points = [Vector(point) for point in points]
    # mathutils scalar multiplication must not dispatch to NumPy's ndarray.
    radii = [float(radius) for radius in radii]
    verts, faces, uv = [], [], []
    frame = None
    for index, point in enumerate(points):
        tangent = points[min(len(points) - 1, index + 1)] - points[max(0, index - 1)]
        tangent.normalize()
        if frame is None:
            ref = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((0, 1, 0))
            frame = tangent.cross(ref).normalized()
        else:
            frame = (frame - tangent * frame.dot(tangent)).normalized()
        perpendicular = tangent.cross(frame).normalized()
        for side in range(sides):
            angle = math.tau * side / sides
            point_ = point + radii[index] * (frame * math.cos(angle) + perpendicular * math.sin(angle))
            verts.append(tuple(point_))
            uv.append((side / sides, index / (len(points) - 1)))
    for index in range(len(points) - 1):
        for side in range(sides):
            a, b = index * sides + side, (index + 1) * sides + side
            next_side = (side + 1) % sides
            faces.append((a, index * sides + next_side, (index + 1) * sides + next_side, b))
    start, end = len(verts), len(verts) + 1
    verts.extend((tuple(points[0]), tuple(points[-1])))
    uv.extend(((0.5, 0), (0.5, 1)))
    for side in range(sides):
        faces.append((start, (side + 1) % sides, side))
        faces.append((end, (len(points) - 1) * sides + side,
                      (len(points) - 1) * sides + (side + 1) % sides))
    return mesh_object(name, verts, faces, mat, part, uv, "SIDES")


def cylinder(name, center, radius, depth, mat, part, sides=20):
    return tube(name, [(center[0], center[1], center[2] - depth / 2),
                       (center[0], center[1], center[2] + depth / 2)],
                [radius, radius], mat, part, sides)


def lathe(name, center, profile, mat, part, sides=24):
    verts, faces, uv = [], [], []
    for row, (radius, z) in enumerate(profile):
        for side in range(sides):
            angle = math.tau * side / sides
            verts.append((center[0] + radius * math.cos(angle), center[1] + radius * math.sin(angle), center[2] + z))
            uv.append((side / sides, row / len(profile)))
    for row in range(len(profile)):
        next_row = (row + 1) % len(profile)
        for side in range(sides):
            a, b = row * sides + side, next_row * sides + side
            faces.append((a, row * sides + (side + 1) % sides,
                          next_row * sides + (side + 1) % sides, b))
    return mesh_object(name, verts, faces, mat, part, uv, True)


def ellipsoid(name, center, scale, mat, part, rings=12, sides=20):
    # Local vertices keep any authored rotation centred on the actual cushion.
    verts, faces, uv = [(0, 0, scale[2])], [], [(0.5, 0)]
    for ring in range(1, rings):
        latitude = ring / rings * math.pi
        for side in range(sides):
            angle = math.tau * side / sides
            verts.append((math.cos(angle) * math.sin(latitude) * scale[0],
                          math.sin(angle) * math.sin(latitude) * scale[1],
                          math.cos(latitude) * scale[2]))
            uv.append((side / sides, ring / rings))
    bottom = len(verts)
    verts.append((0, 0, -scale[2]))
    uv.append((0.5, 1))
    for side in range(sides):
        faces.append((0, 1 + side, 1 + (side + 1) % sides))
    for ring in range(rings - 2):
        for side in range(sides):
            a = 1 + ring * sides + side
            b = 1 + (ring + 1) * sides + side
            faces.append((a, b, 1 + (ring + 1) * sides + (side + 1) % sides,
                          1 + ring * sides + (side + 1) % sides))
    last = 1 + (rings - 2) * sides
    for side in range(sides):
        faces.append((last + side, bottom, last + (side + 1) % sides))
    obj = mesh_object(name, verts, faces, mat, part, uv, True)
    obj.location = center
    return obj


def solid_grid(name, rows, cols, sample, outward, thickness, mat, part):
    outward = Vector(outward)
    verts, faces, uv = [], [], []
    for layer in (1, -1):
        for row in range(rows):
            for col in range(cols):
                t, w = row / (rows - 1), col / (cols - 1)
                verts.append(tuple(Vector(sample(t, w)) + outward * (layer * thickness / 2)))
                uv.append((t, w))
    stride = rows * cols
    a, b, c = (Vector(verts[index]) for index in (0, cols, cols + 1))
    reverse = (b - a).cross(c - a).dot(outward) < 0
    for row in range(rows - 1):
        for col in range(cols - 1):
            a = row * cols + col
            front = (a, a + cols, a + cols + 1, a + 1)
            if reverse:
                front = tuple(reversed(front))
            faces.extend((front, tuple(index + stride for index in reversed(front))))
    perimeter = list(range(cols))
    perimeter += [row * cols + cols - 1 for row in range(1, rows)]
    perimeter += list(range(stride - 2, stride - cols - 1, -1))
    perimeter += [row * cols for row in range(rows - 2, 0, -1)]
    smooth_faces = len(faces)
    for index, a in enumerate(perimeter):
        b = perimeter[(index + 1) % len(perimeter)]
        rim = (a, b, b + stride, a + stride)
        faces.append(tuple(reversed(rim)) if reverse else rim)
    obj = mesh_object(name, verts, faces, mat, part, uv, True)
    # Thin solid rim must not pull smooth surface normals across the sharp fold.
    for poly in obj.data.polygons:
        if poly.index >= smooth_faces:
            poly.use_smooth = False
    return obj


def tie_coil(name, center, radius, mat="Cream_Linen", part="decor"):
    points = [(center[0] + radius * math.cos(t * math.tau * 3),
               center[1] + radius * math.sin(t * math.tau * 3), center[2] + t * 0.18)
              for t in np.linspace(0, 1, 49)]
    return tube(name, points, [0.025] * len(points), mat, part, 6)


def timber_between(name, a, b, width, depth, part, mat="Honey_Timber"):
    a, b = Vector(a), Vector(b)
    obj = box(name, (a + b) / 2, (width, depth, (b - a).length), mat, part, min(width, depth) * 0.12, "Z")
    obj.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return obj


def build_shell():
    for row in range(24):
        y = -3.825 + row * 0.3325
        split = -2.0 if row % 2 == 0 else 1.55
        for index, (left, right) in enumerate(((-5.90, split - 0.012), (split + 0.012, 5.90))):
            box("Deck_Plank_%02d_%d" % (row, index), ((left + right) / 2, y, -0.12),
                (right - left, 0.314, 0.24), "Honey_Timber", "shell", 0.022)
    for y in (-3.97, 3.97):
        box("Deck_Fascia_%s" % y, (0, y, -0.22), (12, 0.16, 0.43), "Dark_Joinery", "shell", 0.024)
    for x in (-5.97, 5.97):
        box("Deck_Side_Rim_%s" % x, (x, 0, -0.22), (0.16, 8, 0.43), "Honey_Timber", "shell", 0.024, "Y")
    for x in (-5.48, -0.98, 3.52):
        box("Deck_Underside_Joist_%s" % x, (x, 0, -0.42), (0.24, 7.75, 0.32), "Dark_Joinery", "shell", 0.024, "Y")
    for index, x in enumerate((-5.45, -0.97, 3.50)):
        for y, height in ((0.90, 4.20), (3.60, 5.26)):
            post = box("Shell_Post_%d_%s" % (index, y), (x, y, height / 2),
                       (0.34, 0.34, height), "Honey_Timber", "shell", 0.040, "Z")
            post["collider_hint"] = "Solid timber post; AABB to be reconciled with the game map"
            box("Shell_Post_Shoe_%d_%s" % (index, y), (x, y, 0.14), (0.37, 0.37, 0.19), "Iron", "shell", 0.017)
            tie_coil("Shell_Post_Binding_%d_%s" % (index, y), (x, y, height - 0.29), 0.21)
    for index in range(25):
        x = -5.33 + index * 0.355
        box("Backwall_Weathered_Board_%02d" % index, (x, 3.65, 2.40),
            (0.340, 0.17, 4.70), "Honey_Timber", "shell", 0.016, "Z")
    for height in (0.32, 2.30, 4.60):
        box("Backwall_Crafted_Crossbeam_%s" % height, (-0.98, 3.49, height),
            (9.30, 0.26, 0.20), "Dark_Joinery", "shell", 0.026)
    box("Front_Open_Eave_Beam", (-0.98, 0.88, 4.04), (9.60, 0.35, 0.33), "Honey_Timber", "shell", 0.040)
    for x, sign in ((-5.45, 1), (3.50, -1)):
        timber_between("Front_Corner_Diagonal_%s" % x, (x, 0.92, 3.18),
                       (x + sign * 0.74, 0.92, 3.94), 0.18, 0.18, "shell")


def roof_height(y):
    return 4.13 + (y - 0.92) * 0.40


def tile_geometry(width, length):
    """Closed hollow half-barrel clay tile, with actual ceramic shell thickness."""
    rows, cols = 4, 13
    verts, faces, uv = [], [], []
    for layer in (0, 1):
        radius = width / 2 - (0.021 if layer else 0)
        elevation = 0.136 - (0.022 if layer else 0)
        for row in range(rows):
            y = row / (rows - 1) * length
            for col in range(cols):
                angle = col / (cols - 1) * math.pi
                taper = 1 - 0.035 * row / (rows - 1)
                verts.append((math.cos(angle) * radius * taper, y,
                              roof_height(y) - roof_height(0) + math.sin(angle) * elevation))
                uv.append((row / (rows - 1), col / (cols - 1)))
    stride = rows * cols
    for row in range(rows - 1):
        for col in range(cols - 1):
            a = row * cols + col
            face = (a, a + cols, a + cols + 1, a + 1)
            faces.extend((face, tuple(index + stride for index in reversed(face))))
    edge = list(range(cols))
    edge += [row * cols + cols - 1 for row in range(1, rows)]
    edge += list(range(stride - 2, stride - cols - 1, -1))
    edge += [row * cols for row in range(rows - 2, 0, -1)]
    for i, a in enumerate(edge):
        b = edge[(i + 1) % len(edge)]
        faces.append((a, b, b + stride, a + stride))
    return verts, faces, uv


def build_roof():
    for index in range(10):
        x = -5.52 + index * 1.025
        timber_between("Roof_Underside_Rafter_%02d" % index, (x, 0.86, roof_height(0.86) - 0.13),
                       (x, 4.05, roof_height(4.05) - 0.13), 0.17, 0.18, "roof")
    for y in (1.00, 2.47, 3.95):
        box("Roof_Transverse_Batten_%s" % y, (-0.97, y, roof_height(y) - 0.045),
            (9.74, 0.12, 0.095), "Dark_Joinery", "roof", 0.011)
    for column in range(22):
        for row in range(6):
            x = -5.70 + column * 0.450
            y = 0.86 + row * 0.522
            vertices, faces, uv = tile_geometry(0.478, 0.675)
            tile = mesh_object("Roof_Ceramic_Barrel_Tile_%02d_%02d" % (column, row),
                               vertices, faces, "Terracotta", "roof", uv, "SIDES")
            tile.location = (x, y, roof_height(y) + 0.008 * math.sin(column * 1.7 + row))
            tile["part"] = "Curved closed fired-clay shell, not a flat textured roof"
    for x in (-5.85, 4.01):
        timber_between("Roof_Side_Carved_Fascia_%s" % x, (x, 0.79, roof_height(0.79) - 0.05),
                       (x, 4.12, roof_height(4.12) - 0.05), 0.15, 0.25, "roof")
    box("Roof_Front_Endgrain_Fascia", (-0.92, 0.79, 4.06), (10.01, 0.16, 0.22), "Honey_Timber", "roof", 0.022)
    # Cream shade only over the right reading veranda, not over the entry slot.
    corners = [Vector((3.55, 2.6, 4.60)), Vector((5.64, 2.05, 4.15)),
               Vector((5.64, -1.25, 3.55)), Vector((3.55, 0.38, 4.09))]
    def canopy(t, w):
        point = (corners[0] * (1 - w) + corners[1] * w) * (1 - t)
        point += (corners[3] * (1 - w) + corners[2] * w) * t
        point.z -= 0.38 * math.sin(math.pi * w) * math.sin(math.pi * t)
        point.z += 0.025 * math.sin(w * 19) * math.sin(math.pi * t)
        return point
    solid_grid("Veranda_Cream_Sagged_Awning", 21, 13, canopy, (0, 0, 1), 0.012, "Cream_Linen", "roof")
    for index, corner in enumerate(corners):
        box("Veranda_Awning_Corner_Pillar_%d" % index, (corner.x, corner.y, corner.z / 2),
            (0.25, 0.25, corner.z), "Honey_Timber", "shell", 0.030, "Z")
        tie_coil("Veranda_Awning_Rope_Knot_%d" % index, (corner.x, corner.y, corner.z - 0.24), 0.17)
    for edge in ((0, 1), (1, 2), (2, 3), (3, 0)):
        a, b = (corners[index] for index in edge)
        pts = [a * (1 - t) + b * t - Vector((0, 0, 0.08 * math.sin(math.pi * t)))
               for t in np.linspace(0, 1, 17)]
        tube("Veranda_Awning_Tension_Cord_%d_%d" % edge, pts, [0.018] * len(pts), "Cream_Linen", "decor", 6)


def illustration_panel(name, center, size, quadrant, part, screen=False):
    """Closed opaque slab, front is -Y; tile indices begin at lower-left."""
    x, y, z = (value / 2 for value in size)
    vertices = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
                (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    column, row = quadrant
    def uv(point, normal):
        # Keep sampling a full pixel away from the adjacent atlas panel.
        u = 0.006 + 0.988 * (point.x / size[0] + 0.5)
        v = 0.006 + 0.988 * (point.z / size[2] + 0.5)
        return ((column + u) / 2, (row + v) / 2)
    obj = mesh_object(name, vertices, faces,
                      "Screen_Abstract_Atlas" if screen else "Illustration_Atlas", part, uv)
    obj.location = center
    obj["content_status"] = "Authored abstract decorative illustration, not a factual portfolio screenshot or personal photograph"
    return obj


def book(name, center, size, color, horizontal=False):
    x, y, z = size
    pivot = bpy.data.objects.new(PREFIX + name + "_Binding_Pivot", None)
    COLLECTION.objects.link(pivot)
    pivot.parent = GROUPS["interior"]
    pivot.location = center
    pivot["part"] = "Complete unlabelled book: colored spine facing the open front, two covers, exposed pages"
    thickness = min(0.013, (z if horizontal else x) * 0.10)

    def piece(suffix, position, dimensions, mat, bevel):
        obj = box(name + suffix, position, dimensions, mat, "interior", bevel)
        # All geometry is local to this book, so shelf lean rotates the pages too.
        obj.parent = pivot
        return obj

    if horizontal:
        for side in (-1, 1):
            piece("_Cover_%s" % side, (0, 0, side * (z - thickness) / 2),
                  (x, y, thickness), color, 0.001)
        piece("_Front_Colored_Spine", (0, -(y - thickness) / 2, 0),
              (x, thickness, z - thickness * 2), color, 0.001)
        page_size = (x * 0.965, y - thickness - 0.003, z - thickness * 2 - 0.002)
    else:
        for side in (-1, 1):
            piece("_Cover_%s" % side, (side * (x - thickness) / 2, 0, 0),
                  (thickness, y, z), color, 0.001)
        piece("_Front_Colored_Spine", (0, -(y - thickness) / 2, 0),
              (x - thickness * 2, thickness, z), color, 0.001)
        page_size = (x - thickness * 2 - 0.002, y - thickness - 0.003, z * 0.95)
        for band_z in (-z * 0.32, z * 0.32):
            piece("_Spine_Ornamental_Band_%s" % band_z, (0, -y / 2 - 0.0015, band_z),
                  (x * 0.70, 0.003, 0.010), "Brass", 0)
    # Positive clearances to covers/spine; cream fore-edges remain visible.
    piece("_Exposed_Pages", (0, thickness / 2, 0), page_size, "Paper", 0.001)
    return pivot


def build_bookshelf():
    x, y = -3.89, 3.26
    for side in (-1, 1):
        box("Library_Side_%s" % side, (x + side * 0.89, y, 1.90), (0.12, 0.66, 3.64), "Honey_Timber", "interior", 0.025, "Z")
    box("Library_Thin_Back", (x, y + 0.295, 1.90), (1.78, 0.075, 3.60), "Dark_Joinery", "interior", 0.009, "Z")
    for shelf in range(6):
        height = 0.17 + shelf * 0.70
        box("Library_Shelf_%d" % shelf, (x, y - 0.025, height), (1.88, 0.72, 0.13), "Honey_Timber", "interior", 0.020)
        if shelf == 5:
            continue
        cursor = x - 0.77
        for index in range(8):
            width = random.uniform(0.10, 0.19)
            tall = random.uniform(0.43, 0.56)
            colors = ("Book_Indigo", "Book_Olive", "Book_Russet", "Book_Ochre", "Book_Teal", "Book_Berry")
            color = colors[(index + shelf * 2) % len(colors)]
            volume = book("Library_Book_%d_%02d" % (shelf, index),
                          (cursor + width / 2, y - 0.14, height + 0.07 + tall / 2), (width, 0.41, tall), color)
            volume.rotation_euler.y = math.radians((-2 if index == 0 else 1) * (index % 3))
            cursor += width + 0.021


def build_desk():
    center = Vector((-2, 0, 0))
    surface_z = 1.23
    top = box("Desk_Crafted_Notebook_Worksurface", (center.x, center.y, surface_z - 0.075),
              (4.22, 1.34, 0.15), "Honey_Timber", "interior", 0.045)
    top["interaction_hint"] = "About notebook/showcase anchor at Blender(-2,0); no factual text baked into geometry"
    for x in (-3.66, -0.36):
        box("Desk_Drawer_Carcass_%s" % x, (x, 0.10, 0.56), (0.60, 0.88, 1.08), "Honey_Timber", "interior", 0.030)
        for row in range(3):
            box("Desk_Inset_Drawer_%s_%d" % (x, row), (x, -0.355, 0.24 + row * 0.30),
                (0.52, 0.065, 0.245), "Dark_Joinery", "interior", 0.012)
            tube("Desk_Brass_Pull_%s_%d" % (x, row), [(x - 0.09, -0.412, 0.24 + row * 0.30),
                 (x + 0.09, -0.412, 0.24 + row * 0.30)], [0.012, 0.012], "Brass", "interior", 6)
    box("Desk_Underframe_Crossbeam", (-2, 0.40, 0.78), (3.78, 0.13, 0.15), "Dark_Joinery", "interior", 0.016)
    for index, x in enumerate((-2.86, -1.28)):
        box("Monitor_%d_Weighted_Foot" % index, (x, 0.28, surface_z + 0.027), (0.42, 0.31, 0.055), "Iron", "interior", 0.007)
        box("Monitor_%d_Adjustable_Stand" % index, (x, 0.34, surface_z + 0.21), (0.06, 0.07, 0.36), "Iron", "interior", 0.008, "Z")
        frame = box("Monitor_%d_Crafted_Frame" % index, (x, 0.30, surface_z + 0.58), (1.40, 0.11, 0.84), "Iron", "interior", 0.032)
        frame["screen_state"] = "Authored abstract colored bars / network diagram; illustrative, no real project UI or personal text"
        illustration_panel("Monitor_%d_Abstract_Interface" % index, (x, 0.235, surface_z + 0.59),
                           (1.29, 0.014, 0.73), (index, 1), "interior", True)
    keyboard = box("Desk_Keyboard_Low_Tray", (-2.04, -0.30, surface_z + 0.020), (0.87, 0.31, 0.040), "Iron", "interior", 0.005)
    keyboard["part"] = "Unlabelled physical keyboard; no fake UI"
    for row in range(4):
        for col in range(12):
            box("Keyboard_Key_%d_%02d" % (row, col), (-2.433 + col * 0.071, -0.40 + row * 0.069, surface_z + 0.050),
                (0.059, 0.055, 0.024), "Charcoal_Leather", "interior", 0.002)
    ellipsoid("Desk_Mouse", (-1.42, -0.30, surface_z + 0.045), (0.060, 0.105, 0.040), "Charcoal_Leather", "interior", 8, 12)
    book("Desk_Unlabelled_Notebook", (-2.00, -0.61, surface_z + 0.053), (0.47, 0.31, 0.075), "Book_Indigo", True)
    mug = lathe("Desk_Ceramic_Mug", (-0.71, -0.27, surface_z),
          [(0.063, 0), (0.088, 0.018), (0.095, 0.18), (0.088, 0.20),
           (0.077, 0.197), (0.076, 0.050), (0.040, 0.045)], "Ivory_Ceramic", "interior", 20)
    mug["part"] = "Closed ceramic shell with real rim; empty non-factual prop"
    pts = [(-0.71 + 0.13 + math.cos(t) * 0.052, -0.27, surface_z + 0.11 + math.sin(t) * 0.074)
           for t in np.linspace(-math.pi * 0.68, math.pi * 0.68, 21)]
    tube("Desk_Mug_Curved_Handle", pts, [0.014] * len(pts), "Ivory_Ceramic", "interior", 6)


def build_chairs():
    # Deliberately offset from X[-2.6,-1.4], Y[-4,-2] front approach.
    x, y = -3.55, -1.28
    cylinder("Chair_Central_Adjustable_Stem", (x, y, 0.34), 0.055, 0.49, "Iron", "interior", 12)
    ellipsoid("Chair_Contoured_Seat", (x, y, 0.64), (0.47, 0.39, 0.13), "Charcoal_Leather", "interior")
    box("Chair_Upholstered_Back", (x, y + 0.30, 1.12), (0.83, 0.14, 0.84), "Charcoal_Leather", "interior", 0.090)
    for side in (-1, 1):
        tube("Chair_Arm_Support_%s" % side, [(x + side * 0.41, y + 0.20, 0.67),
             (x + side * 0.46, y + 0.20, 0.92), (x + side * 0.46, y - 0.25, 0.92)], [0.022] * 3, "Iron", "interior", 6)
        box("Chair_Padded_Arm_%s" % side, (x + side * 0.46, y - 0.01, 0.935), (0.10, 0.46, 0.065), "Charcoal_Leather", "interior", 0.009, "Y")
    for index in range(5):
        angle = index / 5 * math.tau
        end = (x + math.cos(angle) * 0.51, y + math.sin(angle) * 0.51, 0.11)
        tube("Chair_Five_Spoke_%d" % index, [(x, y, 0.17), end], [0.025, 0.032], "Iron", "interior", 6)
        ellipsoid("Chair_Caster_%d" % index, end, (0.070, 0.045, 0.063), "Charcoal_Leather", "interior", 8, 12)
    box("Reading_Chair_Timber_Base", (4.65, 0.47, 0.40), (1.23, 1.16, 0.15), "Honey_Timber", "interior", 0.037)
    for x in (4.14, 5.16):
        for y in (0.05, 0.90):
            box("Reading_Chair_Leg_%s_%s" % (x, y), (x, y, 0.24), (0.12, 0.12, 0.46), "Dark_Joinery", "interior", 0.015, "Z")
    ellipsoid("Reading_Chair_Deep_Cream_Seat", (4.65, 0.40, 0.57), (0.56, 0.48, 0.14), "Cream_Linen", "interior", 12, 20)
    cushion = ellipsoid("Reading_Chair_Cream_Back_Cushion", (4.65, 0.88, 0.99), (0.54, 0.17, 0.49), "Cream_Linen", "interior", 12, 20)
    cushion.rotation_euler.x = math.radians(-7)
    for x in (4.04, 5.26):
        box("Reading_Chair_Timber_Arm_%s" % x, (x, 0.41, 0.86), (0.11, 1.03, 0.10), "Honey_Timber", "interior", 0.015, "Y")
    box("Reading_Side_Table_Top", (5.15, -0.63, 0.73), (0.83, 0.63, 0.11), "Honey_Timber", "interior", 0.027)
    for x in (4.83, 5.47):
        for y in (-0.83, -0.43):
            box("Reading_Side_Table_Leg_%s_%s" % (x, y), (x, y, 0.34), (0.075, 0.075, 0.66), "Dark_Joinery", "interior", 0.009, "Z")
    book("Reading_Table_Unlabelled_Book", (5.11, -0.62, 0.82), (0.44, 0.31, 0.08), "Book_Ochre", True)
    box("Interior_Soft_Ornamental_Rug", (-3.28, -1.32, 0.024), (2.48, 1.82, 0.028), "Woven_Rug", "interior", 0.003)


def lantern(name, center, scale=1.0):
    x, y, z = center
    cylinder(name + "_Brass_Base", (x, y, z - 0.24 * scale), 0.18 * scale, 0.06 * scale, "Brass", "decor", 12)
    cylinder(name + "_Brass_Crown", (x, y, z + 0.24 * scale), 0.19 * scale, 0.07 * scale, "Brass", "decor", 12)
    for dx, dy in ((-0.13, -0.13), (0.13, -0.13), (0.13, 0.13), (-0.13, 0.13)):
        tube(name + "_Forged_Frame_%s_%s" % (dx, dy), [(x + dx * scale, y + dy * scale, z - 0.22 * scale),
             (x + dx * scale, y + dy * scale, z + 0.23 * scale)], [0.012 * scale] * 2, "Brass", "decor", 6)
    ellipsoid(name + "_Warm_Amber_Core", (x, y, z), (0.10 * scale, 0.10 * scale, 0.19 * scale), "Amber_Lamp", "decor", 8, 12)
    hoop = [(x + math.cos(t) * 0.072 * scale, y, z + 0.37 * scale + math.sin(t) * 0.074 * scale)
            for t in np.linspace(0, math.tau, 25)]
    tube(name + "_Suspension_Loop", hoop, [0.010 * scale] * len(hoop), "Iron", "decor", 6)


def build_banner():
    origin = Vector((5.44, -1.28, 3.80))
    timber_between("Banner_Short_Crossbar", (5.01, -1.28, 3.99), (5.90, -1.28, 3.99), 0.080, 0.080, "decor")
    def flag(t, w):
        x = origin.x + (w - 0.5) * 0.75
        z = origin.z - t * 1.05 + t ** 8 * (0.22 * (1 - abs(w * 2 - 1)))
        y = origin.y - 0.05 - 0.050 * math.sin(t * math.pi) * math.cos(w * math.pi * 2)
        return (x, y, z)
    solid_grid("Banner_Violet_Cloth_V_Notch", 17, 9, flag, (0, -1, 0), 0.011, "Violet_Cloth", "decor")
    cx, cy, cz = origin.x, origin.y - 0.111, origin.z - 0.40
    ring = [(cx + 0.22 * math.cos(t), cy, cz + 0.22 * math.sin(t)) for t in np.linspace(0, math.tau, 33)]
    tube("Banner_Gold_Compass_Ring", ring, [0.008] * len(ring), "Brass", "decor", 5)
    for index in range(8):
        angle = index / 8 * math.tau
        radius = 0.29 if index % 2 == 0 else 0.15
        tube("Banner_Gold_Compass_Ray_%d" % index,
             [(cx, cy - 0.003, cz), (cx + math.cos(angle) * radius, cy - 0.003, cz + math.sin(angle) * radius)],
             [0.015, 0.004], "Brass", "decor", 5)


def potted_plant(name, center, size=1.0, leaves=10):
    x, y, z = center
    profile = [(0.19, 0), (0.31, 0.065), (0.37, 0.54), (0.41, 0.59),
               (0.40, 0.66), (0.355, 0.66), (0.33, 0.59), (0.28, 0.16), (0.075, 0.15)]
    lathe(name + "_Crafted_Ceramic_Pot", center, [(r * size, h * size) for r, h in profile], "Terracotta", "decor", 20)
    cylinder(name + "_Recessed_Soil", (x, y, z + 0.60 * size), 0.335 * size, 0.043 * size, "Soil", "decor", 16)
    for index in range(leaves):
        angle = index / leaves * math.tau + 0.30
        direction = Vector((math.cos(angle), math.sin(angle), 0))
        across = Vector((-direction.y, direction.x, 0))
        length = (0.65 + 0.17 * math.sin(index * 2.2)) * size
        origin = Vector((x, y, z + (0.67 + 0.02 * index) * size))
        def point(t):
            return origin + direction * (length * t) + Vector((0, 0, size * (0.48 * math.sin(math.pi * t * 0.85) + 0.20 * t)))
        def blade(t, w):
            width = (0.19 * math.sin(math.pi * t) ** 0.68 + 0.004) * size
            p = point(t) + across * ((w * 2 - 1) * width)
            p.z -= 0.047 * (w * 2 - 1) ** 2 * math.sin(math.pi * t) * size
            return p
        mat = ("Broad_Green_Leaf", "Deep_Green_Leaf", "Young_Green_Leaf")[index % 3]
        solid_grid(name + "_Broad_Leaf_%02d" % index, 11, 7, blade, (0, 0, 1), 0.008 * size, mat, "decor")
        pts = [point(t) for t in np.linspace(0, 1, 11)]
        tube(name + "_Leaf_Petiole_%02d" % index, pts, [0.009 * size] * len(pts), "Broad_Green_Leaf", "decor", 5)


def broad_vine_leaf(name, origin, direction, length, mat):
    """Closed, curved broad leaf with a real midrib and positive tip width."""
    origin, direction = Vector(origin), Vector(direction).normalized()
    normal = Vector((0, -1, 0.35))
    normal = (normal - direction * normal.dot(direction)).normalized()
    across = normal.cross(direction).normalized()
    def centerline(t):
        return origin + direction * (length * t) + normal * (length * 0.14 * math.sin(math.pi * t))
    def blade(t, w):
        q = w * 2 - 1
        half_width = length * (0.29 * math.sin(math.pi * t) ** 0.68 + 0.012)
        return centerline(t) + across * (q * half_width) - normal * (length * 0.075 * q * q * math.sin(math.pi * t))
    obj = solid_grid(name, 9, 5, blade, normal, 0.007, mat, "decor")
    obj["collision_policy"] = "Soft closed botanical decoration; never a solid obstacle"
    points = [centerline(t) for t in np.linspace(0, 0.94, 9)]
    tube(name + "_Raised_Midrib", points, [0.0045] * len(points), "Young_Green_Leaf", "decor", 5)


def flowering_cluster(name, center, scale=1.0):
    """A small opaque, volumetric coral bloom; no billboards or alpha cards."""
    x, y, z = center
    for index in range(5):
        angle = index * math.tau / 5
        petal = ellipsoid(name + "_Petal_%d" % index,
                          (x + math.cos(angle) * 0.075 * scale, y - 0.011 * scale,
                           z + math.sin(angle) * 0.075 * scale),
                          (0.061 * scale, 0.026 * scale, 0.035 * scale), "Bloom_Coral", "decor", 6, 10)
        petal.rotation_euler.y = -angle
    ellipsoid(name + "_Ochre_Centre", (x, y - 0.034 * scale, z),
              (0.026 * scale, 0.022 * scale, 0.026 * scale), "Book_Ochre", "decor", 6, 10)
    tube(name + "_Stamen", [(x, y - 0.035 * scale, z), (x + 0.027 * scale, y - 0.09 * scale, z - 0.045 * scale)],
         [0.006 * scale, 0.004 * scale], "Book_Ochre", "decor", 5)


def climbing_vine(name, anchors, leaves=9, leaf_length=0.34, bloom=False):
    a, b, c = (Vector(point) for point in anchors)
    def path(t):
        return a * (1 - t) ** 2 + b * (2 * t * (1 - t)) + c * t * t
    points = [path(t) for t in np.linspace(0, 1, 25)]
    stem = tube(name + "_Continuous_Curved_Trunk", points,
                [0.014 * (1 - 0.45 * t) for t in np.linspace(0, 1, 25)], "Dark_Joinery", "decor", 6)
    stem["collision_policy"] = "Soft decorative vine attached to existing overhead structure"
    for index, t in enumerate(np.linspace(0.08, 0.93, leaves)):
        start = path(float(t))
        side = -1 if index % 2 == 0 else 1
        direction = Vector((side * (0.65 + 0.08 * math.sin(index)), -0.27, -0.27 + 0.13 * math.cos(index * 1.8)))
        length = leaf_length * (0.87 + 0.16 * math.sin(index * 1.9))
        leaf_origin = start + direction.normalized() * 0.036
        tube(name + "_Leaf_Stalk_%02d" % index, [start, leaf_origin], [0.005, 0.004], "Deep_Green_Leaf", "decor", 5)
        broad_vine_leaf(name + "_Closed_Broadleaf_%02d" % index, leaf_origin, direction, length,
                        ("Broad_Green_Leaf", "Deep_Green_Leaf", "Young_Green_Leaf")[(index // 2) % 3])
    if bloom:
        for index, t in enumerate((0.23, 0.72)):
            point = path(t) + Vector((0.025, -0.09, -0.04))
            flowering_cluster(name + "_Bloom_%d" % index, point, 0.88)


def build_botanical_trim():
    # Concentrated on the upper perimeter / side posts, not as an interior curtain.
    # No center-front vines below3.8m: notebook and entry keep a clear view.
    vines = (
        ("Eave_Left", ((-5.15, 0.70, 4.23), (-4.10, 0.66, 4.07), (-3.02, 0.70, 4.22)), 10, 0.34, True),
        ("Eave_Centre", ((-2.99, 0.70, 4.22), (-1.51, 0.66, 4.13), (-0.04, 0.70, 4.23)), 11, 0.31, False),
        ("Eave_Right", ((0.02, 0.70, 4.23), (1.57, 0.67, 4.09), (3.36, 0.71, 4.22)), 11, 0.32, True),
        ("Left_Post", ((-5.43, 0.84, 4.16), (-5.46, 0.70, 3.51), (-5.34, 0.83, 2.75)), 8, 0.32, True),
        ("Right_Post", ((3.49, 0.87, 4.15), (3.38, 0.71, 3.57), (3.55, 0.79, 2.96)), 8, 0.30, False),
        ("Rear_Right", ((2.92, 3.45, 4.83), (3.02, 3.40, 3.72), (2.97, 3.44, 2.70)), 10, 0.33, False),
        ("Library_Left", ((-5.25, 3.43, 4.53), (-5.10, 3.28, 3.84), (-5.25, 3.23, 3.01)), 8, 0.32, False),
        ("Awning_Right", ((5.60, 2.05, 4.07), (5.61, 1.99, 3.49), (5.49, 2.09, 2.92)), 8, 0.28, True),
        ("Awning_Garland", ((3.59, 0.39, 4.07), (4.54, -0.49, 3.85), (5.56, -1.21, 3.60)), 9, 0.25, False),
    )
    for name, anchors, leaves, length, bloom in vines:
        climbing_vine("Vine_" + name, anchors, leaves, length, bloom)
    # Only extend the existing beam overhead; no additional ground posts.
    for index, x in enumerate((-5.10, -3.60, -2.10, -0.60, 0.90, 2.40, 3.30)):
        timber_between("Front_Pergola_Short_Overhead_Slat_%d" % index,
                       (x, 0.40, 4.23), (x, 1.20, 4.43), 0.074, 0.090, "roof", "Dark_Joinery")
    points = [(x, 0.94, 3.94 - 0.10 * math.sin((x + 4.65) / 7.55 * math.pi)) for x in np.linspace(-4.65, 2.90, 21)]
    tube("Pergola_Warm_Lantern_Suspension_Cord", points, [0.008] * len(points), "Iron", "decor", 5)
    for index, x in enumerate((-4.10, -2.50, -0.90, 0.70, 2.30)):
        z = 3.94 - 0.10 * math.sin((x + 4.65) / 7.55 * math.pi)
        tube("Pergola_Lantern_Drop_%d" % index, [(x, 0.94, z), (x, 0.94, z - 0.10)], [0.008] * 2, "Iron", "decor", 5)
        lantern("Pergola_Mini_Lantern_%d" % index, (x, 0.94, z - 0.26), 0.34)


def build_decorative_guitar():
    # Entire non-colliding prop lies inside the existing bookshelf hull:
    # X[-4.84,-2.94], Y[2.90,3.62], Z[0,3.70]. No floor/path obstacle.
    cx, cy, cz = -4.56, 3.00, 0.58
    count, depth = 32, 0.13
    outline = []
    for index in range(count):
        angle = index * math.tau / count
        z = 0.275 * math.sin(angle)
        waist = 1 - 0.33 * math.exp(-((z - 0.07) / 0.082) ** 2)
        outline.append((0.205 * math.cos(angle) * waist, z))
    vertices = [(cx + x, cy + side * depth / 2, cz + z) for side in (-1, 1) for x, z in outline]
    front, back = len(vertices), len(vertices) + 1
    vertices.extend(((cx, cy - depth / 2, cz), (cx, cy + depth / 2, cz)))
    faces = []
    for index in range(count):
        next_index = (index + 1) % count
        faces.extend(((index, next_index, front), (count + next_index, count + index, back),
                      (index, count + index, count + next_index, next_index)))
    guitar = mesh_object("Library_Small_Unlabelled_Guitar_Body", vertices, faces, "Honey_Timber", "decor",
                         lambda p, n: (p.z * 0.72, p.x * 0.32))
    guitar["collision_policy"] = "Decorative miniature entirely within the existing bookshelf solid envelope"
    box("Guitar_Narrow_Timber_Neck", (cx, cy, 1.005), (0.071, 0.081, 0.55), "Dark_Joinery", "decor", 0.010, "Z")
    head = box("Guitar_Unlabelled_Headstock", (cx, cy, 1.335), (0.102, 0.086, 0.18), "Honey_Timber", "decor", 0.016, "Z")
    head.rotation_euler.y = math.radians(-8)
    ellipsoid("Guitar_Dark_Soundhole", (cx, cy - depth / 2 - 0.002, 0.665),
              (0.048, 0.004, 0.048), "Charcoal_Leather", "decor", 8, 12)
    box("Guitar_Low_Bridge", (cx, cy - depth / 2 - 0.006, 0.48), (0.11, 0.018, 0.025), "Dark_Joinery", "decor", 0.002)
    for index in range(4):
        x = cx - 0.018 + index * 0.012
        tube("Guitar_String_%d" % index, [(x, cy - 0.080, 0.49), (x, cy - 0.046, 1.36)], [0.0011] * 2, "Brass", "decor", 5)
    for index in range(7):
        box("Guitar_Fret_%d" % index, (cx, cy - 0.044, 0.82 + index * 0.060), (0.065, 0.003, 0.003), "Brass", "decor", 0)


def build_wall_illustrations():
    # Small wall-mounted decoration, never new free-standing collision masses.
    frame = box("Wall_Fictional_Archipelago_Map_Frame", (1.21, 3.52, 2.24),
                (1.54, 0.11, 1.26), "Honey_Timber", "decor", 0.020)
    frame["content_status"] = "Fictional decorative map, not actual personal history, project data or navigation"
    illustration_panel("Wall_Fictional_Archipelago_Map", (1.21, 3.458, 2.24), (1.39, 0.012, 1.10), (0, 0), "decor")
    for index, (x, z, angle) in enumerate(((0.47, 3.51, -5), (1.08, 3.52, 3))):
        photo = illustration_panel("Wall_Illustrative_Landscape_Postcard_%d" % index,
                                   (x, 3.50, z), (0.38, 0.008, 0.29), (1, 0), "decor")
        photo.rotation_euler.y = math.radians(angle)
        tube("Postcard_Small_Pin_%d" % index, [(x, 3.47, z + 0.115), (x, 3.455, z + 0.115)],
             [0.008] * 2, "Brass", "decor", 6)
    cushion = ellipsoid("Reading_Chair_Small_Violet_Cushion", (4.90, 0.72, 0.97),
                        (0.19, 0.11, 0.22), "Violet_Cloth", "decor", 10, 14)
    cushion.rotation_euler.y = math.radians(-14)


def build_decor():
    build_banner()
    for index, center in enumerate(((-4.72, 3.25, 3.84), (0.27, 3.36, 3.22),
                                   (2.36, 3.33, 3.68), (-5.18, 0.95, 2.68))):
        lantern("Lantern_Wall_%02d" % index, center, 0.80)
        timber_between("Lantern_Wall_Bracket_%02d" % index, (center[0], 3.48, center[2] + 0.42),
                       (center[0], center[1], center[2] + 0.42), 0.055, 0.055, "decor", "Iron")
    lantern("Lantern_Reading_Table", (5.28, -0.50, 1.02), 0.58)
    for index, (center, scale) in enumerate((((-5.10, -2.89, 0), 0.95), ((5.18, 2.85, 0), 0.96),
                                           ((-5.19, 2.78, 0), 0.73), ((5.45, -2.72, 0), 0.75),
                                           ((1.90, 3.03, 0), 0.70))):
        potted_plant("Plant_Edge_%02d" % index, center, scale)
    # Clear entry remains empty; low rail at rear/right reads as a veranda.
    for index, x in enumerate((3.95, 4.82, 5.65)):
        box("Veranda_Right_Low_Rail_Post_%d" % index, (x, 3.70, 0.68), (0.17, 0.17, 1.35), "Honey_Timber", "decor", 0.022, "Z")
    tube("Veranda_Right_Low_Rope_Rail", [(3.95, 3.70, 1.13), (4.40, 3.70, 1.04),
         (4.82, 3.70, 1.13), (5.24, 3.70, 1.04), (5.65, 3.70, 1.13)], [0.025] * 5, "Cream_Linen", "decor", 8)
    build_botanical_trim()
    build_decorative_guitar()
    build_wall_illustrations()


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def unchanged_collision_contract():
    """Exact local Blender-space snapshot of the21 existing HOME_STUDIO hulls.

    This JSON is authoring evidence, not Rapier initialization or a new hull set.
    The parent must verify shared map contracts before any v2 mounting.
    """
    hulls = []
    def add_box(name, role, x, y, width, height, depth):
        hulls.append({"id": name, "role": role, "kind": "box",
                      "centre": [x, y, height / 2], "size": [width, depth, height]})
    for row, y, height in (("front", 0.9, 4.2), ("rear", 3.6, 5.26)):
        for index, x in enumerate((-5.45, -0.97, 3.5)):
            add_box("house-post-%s-%d" % (row, index), "post", x, y, 0.34, height, 0.34)
    for index, (x, y, height) in enumerate(((3.55, 2.6, 4.6), (5.64, 2.05, 4.15),
                                          (5.64, -1.25, 3.55), (3.55, 0.38, 4.09))):
        add_box("awning-post-%d" % index, "post", x, y, 0.25, height, 0.25)
    add_box("back-wall", "wall", -0.98, 3.65, 9.3, 4.7, 0.17)
    add_box("desk-0", "desk", -2, 0, 4.22, 1.23, 1.34)
    add_box("bookshelf", "furniture", -3.89, 3.26, 1.9, 3.7, 0.72)
    add_box("office-chair", "furniture", -3.55, -1.28, 1.08, 1.54, 1.03)
    add_box("reading-chair", "furniture", 4.65, 0.47, 1.3, 1.5, 1.2)
    add_box("side-table", "furniture", 5.15, -0.63, 0.83, 0.785, 0.63)
    for index, (x, y, scale) in enumerate(((-5.1, -2.89, 0.95), (5.18, 2.85, 0.96),
                                         (-5.19, 2.78, 0.73), (5.45, -2.72, 0.75), (1.9, 3.03, 0.7))):
        hulls.append({"id": "pot-%d" % index, "role": "furniture", "kind": "cylinder",
                      "centre": [x, y, 0.66 * scale / 2], "radius": 0.41 * scale, "height": 0.66 * scale})
    if len(hulls) != 21:
        raise RuntimeError("The unchanged studio collision annotation must have21 hulls")
    return hulls


def setup_preview(scene, bounds):
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 900, 650
    scene.render.resolution_percentage = 100
    scene.render.image_settings.media_type = "IMAGE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Khronos PBR Neutral"
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new(PREFIX + "Preview_White_Environment")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.90, 0.94, 1.0, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.85
    scene.world = world
    minimum, maximum = bounds
    target = (minimum + maximum) * 0.5
    camera_data = bpy.data.cameras.new(PREFIX + "Preview_Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(maximum.x - minimum.x,
                                  (maximum.z - minimum.z) * 900 / 650) * 1.36
    camera = bpy.data.objects.new(PREFIX + "Preview_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = target + Vector((13.4, -21.8, 12.8))
    aim(camera, target)
    scene.camera = camera
    for name, kind, position, energy, color in (
        ("Warm_Key", "SUN", (-8, -11, 14), 2.4, (1, 0.88, 0.72)),
        ("Soft_Front_Fill", "POINT", (-4, -7, 8), 1500, (0.82, 0.91, 1)),
        ("Roof_Rim", "SUN", (6, 8, 12), 0.75, (1, 0.97, 0.85)),
        ("Interior_Fill", "POINT", (-2, 1, 3.4), 80, (1, 0.81, 0.57)),
    ):
        data = bpy.data.lights.new(PREFIX + "Preview_" + name, kind)
        data.energy, data.color = energy, color
        if kind == "SUN":
            data.angle = math.radians(9)
        else:
            data.shadow_soft_size = 3.5
        light = bpy.data.objects.new(PREFIX + "Preview_" + name, data)
        scene.collection.objects.link(light)
        light.location = position
        aim(light, target)


def main():
    global COLLECTION
    # The parent owns project/revision guards. Execute in a dedicated study,
    # never an assembled game project; existing external master files stay intact.
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                       bpy.data.cameras, bpy.data.lights):
        for data in list(datablocks):
            if data.name.startswith(PREFIX) and data.users == 0:
                datablocks.remove(data)
    for previous in list(bpy.data.collections):
        if previous.name.startswith(COLLECTION_NAME) and not previous.objects and not previous.children:
            bpy.data.collections.remove(previous)
    COLLECTION = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(COLLECTION)
    root = bpy.data.objects.new(ROOT_NAME, None)
    COLLECTION.objects.link(root)
    root["asset_id"] = "home-studio-v2"
    root["units"] = "metres; Blender Z-up, glTF exporter Y-up"
    root["deck_walking_top_z"] = 0.0
    root["design_note"] = "Unchanged12x8 deck/21 hull placements; color-forward books and edge vines; authored abstract displays, no personal proof"
    root["solid_collision_policy"] = "No new floor-standing solid objects; original21 hulls and front clear approach remain the integration contract"
    for part in ("shell", "roof", "interior", "decor"):
        obj = bpy.data.objects.new(PREFIX + part, None)
        COLLECTION.objects.link(obj)
        obj.parent = root
        obj["runtime_group"] = part
        GROUPS[part] = obj
    GROUPS["roof"]["visibility_contract"] = "Separable rear roof and awning; future in-game visibility must be designed, not assumed"
    make_materials()
    build_shell()
    build_roof()
    build_bookshelf()
    build_desk()
    build_chairs()
    build_decor()
    bpy.context.view_layer.update()
    meshes = [obj for obj in COLLECTION.objects if obj.type == "MESH"]
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not points or not all(math.isfinite(value) for point in points for value in point):
        raise RuntimeError("Home studio has empty or non-finite bounds")
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    if any(maximum[axis] <= minimum[axis] for axis in range(3)):
        raise RuntimeError("Home studio has invalid dimensions")
    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangles, vertices = 0, 0
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        data = evaluated.to_mesh()
        try:
            data.calc_loop_triangles()
            triangles += len(data.loop_triangles)
            vertices += len(data.vertices)
            if not all(math.isfinite(value) for vertex in data.vertices for value in vertex.co):
                raise RuntimeError("Non-finite evaluated position in " + obj.name)
            if not all(math.isfinite(value) for layer in data.uv_layers for loop in layer.data for value in loop.uv):
                raise RuntimeError("Non-finite evaluated UV in " + obj.name)
        finally:
            evaluated.to_mesh_clear()
    if triangles > TRIANGLE_BUDGET or len(MATERIALS) > 30 or len(TEXTURES) > 12:
        raise RuntimeError("Home studio exceeds its master asset study budget")
    if any(not image.packed_file or max(image.size) > TEXTURE_RESOLUTION_LIMIT for image in TEXTURES):
        raise RuntimeError("Studio v2 needs embedded image sources at most512px")
    annotation = {
        "status": "Exact unchanged21-hull authoring snapshot ONLY; not exported or active Rapier colliders",
        "coordinate_system": "Blender metres Z-up",
        "deck_proposal": {"centre": [0, 0, -0.12], "size": [12, 8, 0.24], "walking_top_z": 0},
        "front_approach_clear_slot": {"x": [-2.6, -1.4], "y": [-4, -2]},
        "notebook_interaction_anchor": [-2, 0, 1.23],
        "unchanged_existing_hulls": unchanged_collision_contract(),
        "ignored_decor": ["cloth", "foliage", "lamps", "keyboard keys", "small book details", "wall-mounted illustrations", "bookshelf-envelope guitar"],
        "screen_content": "Authored abstract colored bars and network diagram; illustrative, no screenshots or factual portfolio claims",
        "integration_required": "Verify the same HOME_STUDIO21 hulls, supported deck and route clearance before replacing v1; no LOD or performance proof",
    }
    text_name = "HomeStudio_V2_Collision_Annotations_JSON"
    previous = bpy.data.texts.get(text_name)
    if previous is not None:
        bpy.data.texts.remove(previous)
    text = bpy.data.texts.new(text_name)
    text.write(json.dumps(annotation, indent=2))
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    setup_preview(scene, (minimum, maximum))
    output = artifacts.file(name=PREVIEW_NAME, media_type="image/png")
    scene.render.filepath = str(output.path)
    bpy.ops.render.render(write_still=True)
    output.publish()
    return {
        "asset": "home-studio-v2", "blender_version": bpy.app.version_string,
        "root": ROOT_NAME, "mesh_objects": len(meshes), "evaluated_triangles": triangles,
        "evaluated_vertices": vertices, "materials": len(MATERIALS),
        "packed_pbr_images": [image.name for image in TEXTURES],
        "packed_image_dimensions": {image.name: list(image.size) for image in TEXTURES},
        "decoded_rgba8_texture_bytes": sum(int(image.size[0]) * int(image.size[1]) * 4 for image in TEXTURES),
        "glb_byte_target_advisory": GLB_BYTE_TARGET,
        "bounds_min_blender": [round(value, 4) for value in minimum],
        "bounds_max_blender": [round(value, 4) for value in maximum],
        "dimensions_m": [round(value, 4) for value in maximum - minimum],
        "groups": [obj.name for obj in GROUPS.values()], "walking_top_z": 0.0,
        "monitor_count": 2, "screen_content": "Original abstract colored bars and network diagram; illustrative, no factual screenshots or text",
        "solid_collider_contract_count": 21,
        "new_details": "Front-facing colored spines;9 attached volumetric vines with83 broad leaves;8 coral blooms;5 small pendant lanterns; fictional wall map/postcards; bookshelf-envelope guitar",
        "preview": PREVIEW_NAME, "collider_annotations_text": text_name,
        "acceptance": "Reference-led original master; GLB, visual, runtime/LOD and collision review still required",
    }


result = main()
