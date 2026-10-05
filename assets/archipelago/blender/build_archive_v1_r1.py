"""Reference-led archive / observatory master, Blender 5.2, dedicated project.

Real metre-scale editable geometry and original packed portable PBR. No image
background, network request, downloaded texture, factual text or fake credentials.
Source Z-up exports as glTF (X,Z,-Y): front is Blender -Y / glTF +Z. The root is
the centre of the proposed 18x14 platea, walking top Z=0. This source does not
modify the game: the parent must approve/map/test its proposed deck and22 hulls.
The master prioritizes visible craftsmanship; runtime batching/LOD is separate.
Execute only in the parent's dedicated authoring project, with bpy/numpy and
the artifacts registry available. Preview cameras/lights remain outside root.
"""

import bpy
import math
import random
import json
import numpy as np
from mathutils import Vector


SEED = 271007
PREFIX = "Archive_"
ROOT_NAME = "ArchiveObservatory_V1_Origin_At_Deck_Centre"
COLLECTION_NAME = "ArchiveObservatory_V1_Editable_Asset"
PREVIEW_NAME = "archive-v1-eevee.png"
TRIANGLE_SAFETY_MAX = 180_000
TEXTURE_RESOLUTION_LIMIT = 512
DECK_WIDTH, DECK_DEPTH, DECK_THICKNESS = 18.0, 14.0, 0.24
TOWER_X, TOWER_Y, TOWER_RADIUS, TOWER_HEIGHT = 4.0, 2.7, 3.7, 7.2
STATIONS = (("education-0", -5.0, 3.0), ("education-1", 0.0, 3.0), ("education-2", 5.0, 3.0))
POSTS = tuple(("archive-post-%s-%d" % (row, index), x, z, h)
              for row, z, h in (("back", -5.75, 5.0), ("front", -0.75, 4.1))
              for index, x in enumerate((-8.1, -4.15, -0.2)))
POTS = (("front-left", -8.1, 5.4, 0.45, 0.8), ("front-right", 8.1, 5.4, 0.45, 0.8),
        ("back-right", 8.1, -5.5, 0.45, 0.8), ("library-side", -8.15, -3.2, 0.45, 0.8),
        ("tower-front", 2.35, 0.95, 0.34, 0.61))
GROUPS, MATERIALS, TEXTURES = {}, {}, []
COLLECTION = None
random.seed(SEED)


def rgba(rgb):
    return np.concatenate((np.clip(rgb, 0, 1), np.ones((*rgb.shape[:2], 1))), axis=2)


def packed_image(name, pixels, non_color=False):
    image = bpy.data.images.new(PREFIX + name, width=pixels.shape[1], height=pixels.shape[0], alpha=True)
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


def material(name, color, roughness=0.65, metallic=0, base=None, normal=None, rough_map=None, emission=None):
    mat = bpy.data.materials.new(PREFIX + "PBR_" + name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    for image, socket in ((base, "Base Color"), (rough_map, "Roughness")):
        if image is not None:
            tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
            tex.image = image
            mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs[socket])
    if normal is not None:
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = normal
        converter = mat.node_tree.nodes.new("ShaderNodeNormalMap")
        converter.inputs["Strength"].default_value = 0.31
        mat.node_tree.links.new(tex.outputs["Color"], converter.inputs["Color"])
        mat.node_tree.links.new(converter.outputs["Normal"], bsdf.inputs["Normal"])
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 1.25
    MATERIALS[name] = mat
    return mat


def make_materials():
    """Small generated PBR maps, not Blender-only procedural shader graphs."""
    u, v = np.meshgrid(np.linspace(0, 1, 512, endpoint=False), np.linspace(0, 1, 384, endpoint=False))
    flow = v + 0.010 * np.sin(u * 16 + v * 8) + 0.003 * np.sin(u * 41 - v * 17)
    fibre = np.sin(flow * math.tau * 32) + 0.35 * np.sin(flow * math.tau * 87 + u * 9)
    knot_r = np.sqrt(((u - 0.61) * 1.35) ** 2 + ((v - 0.54) * 4.9) ** 2)
    knot = np.sin(knot_r * 51) * np.exp(-knot_r * 7)
    fine = np.sin(u * 633 + v * 411) * np.sin(u * 287 - v * 921)
    wood = packed_image("Timber_Honey_Base_512", rgba((0.97 + fibre * 0.025 + knot * 0.041 + fine * 0.008)[..., None] * (0.70, 0.405, 0.18)))
    wood_n = normal_image("Timber_Fibre_Normal_512", fibre * 0.027 + knot * 0.024, 8)
    rough = np.clip(0.70 + fibre * 0.025 + fine * 0.012, 0.59, 0.81)
    wood_r = packed_image("Timber_Weather_Roughness_512", rgba(np.repeat(rough[..., None], 3, axis=2)), True)
    material("Honey_Timber", (0.70, 0.405, 0.18), base=wood, normal=wood_n, rough_map=wood_r)
    material("Dark_Joinery", (0.28, 0.13, 0.055), 0.76)
    mineral = np.sin(u * 23 + v * 17) * np.sin(u * 57 - v * 19)
    pores = np.sin(u * 511 + v * 337) * np.sin(u * 193 - v * 709)
    mineral_tone = 0.98 + mineral * 0.043 + pores * 0.011
    stone = packed_image("Pale_Limestone_Base_512", rgba(mineral_tone[..., None] * (0.81, 0.73, 0.58)))
    stone_n = normal_image("Pale_Limestone_Mineral_Normal_512", mineral * 0.029 + pores * 0.009, 7)
    material("Pale_Limestone", (0.81, 0.73, 0.58), 0.79, base=stone, normal=stone_n)
    material("Warm_Limestone", (0.75, 0.65, 0.49), 0.80, normal=stone_n)
    material("Cool_Limestone", (0.72, 0.72, 0.63), 0.80, normal=stone_n)
    material("Recessed_Mortar", (0.53, 0.47, 0.37), 0.93)
    hammer = np.sin(u * 173 + v * 197) * np.sin(u * 251 - v * 131)
    metallic = packed_image("Dome_Blue_Tempered_Metal_Base_512", rgba((0.98 + hammer * 0.015)[..., None] * (0.32, 0.43, 0.56)))
    metal_n = normal_image("Dome_Fine_Hammer_Normal_512", hammer * 0.009, 3)
    material("Dome_Blue_Metal", (0.32, 0.43, 0.56), 0.32, 0.77, base=metallic, normal=metal_n)
    material("Dark_Inner_Metal", (0.10, 0.13, 0.17), 0.47, 0.62)
    u, v = np.meshgrid(np.linspace(0, 1, 384, endpoint=False), np.linspace(0, 1, 256, endpoint=False))
    clay_h = np.sin(u * 47 + v * 21) * np.sin(u * 17 - v * 59)
    clay = packed_image("Fired_Terracotta_Base_384", rgba((0.97 + clay_h * 0.042)[..., None] * (0.67, 0.25, 0.115)))
    clay_n = normal_image("Fired_Terracotta_Normal_384", clay_h * 0.024, 6)
    material("Terracotta", (0.67, 0.25, 0.115), 0.72, base=clay, normal=clay_n)
    weave = np.sin(u * math.tau * 67) * np.sin(v * math.tau * 59)
    linen = packed_image("Cream_Linen_Weave_Base_384", rgba((0.98 + weave * 0.014)[..., None] * (0.91, 0.85, 0.69)))
    linen_n = normal_image("Linen_Fold_Fibre_Normal_384", weave * 0.024, 3)
    material("Cream_Linen", (0.91, 0.85, 0.69), 0.91, base=linen, normal=linen_n)
    material("Violet_Cloth", (0.30, 0.07, 0.58), 0.87, normal=linen_n)
    vein = np.exp(-((v - 0.5) / 0.037) ** 2)
    leaf_tone = 0.96 + 0.029 * np.sin(u * 19 + v * 7) + 0.032 * np.sin(u * 61 - abs(v - 0.5) * 14)
    leaf = packed_image("Broadleaf_Vein_Base_384", rgba(leaf_tone[..., None] * (0.31, 0.53, 0.07) + vein[..., None] * (0.07, 0.07, 0.012)))
    leaf_n = normal_image("Broadleaf_Vein_Normal_384", vein * 0.06 + np.sin(u * 61 - abs(v - 0.5) * 14) * 0.020, 4)
    material("Broad_Green_Leaf", (0.31, 0.53, 0.07), 0.55, base=leaf, normal=leaf_n)
    material("Deep_Green_Leaf", (0.11, 0.30, 0.06), 0.59, normal=leaf_n)
    material("Young_Green_Leaf", (0.42, 0.63, 0.14), 0.56, normal=leaf_n)
    edge = np.minimum.reduce((u, v, 1 - u, 1 - v))
    rug_rgb = np.empty((*u.shape, 3)); rug_rgb[:] = (0.31, 0.11, 0.49)
    rug_rgb[(edge < 0.060) | ((edge > 0.095) & (edge < 0.125))] = (0.80, 0.59, 0.22)
    diamond = np.abs(np.mod(u * 9 + v * 9, 1) - 0.5) < 0.035
    rug_rgb[diamond & (edge > 0.15)] = (0.49, 0.27, 0.59)
    material("Compass_Woven_Rug", (0.31, 0.11, 0.49), 0.94,
             base=packed_image("Ornamental_Rug_Base_384", rgba(rug_rgb)), normal=linen_n)
    for name, color, rough, metal in (
        ("Brass", (0.72, 0.49, 0.16), 0.33, 0.78),
        ("Iron", (0.075, 0.095, 0.10), 0.49, 0.65),
        ("Optical_Glass", (0.028, 0.16, 0.19), 0.09, 0.22),
        ("Paper", (0.87, 0.81, 0.67), 0.91, 0),
        ("Soil", (0.090, 0.061, 0.034), 0.98, 0),
        ("Ivory_Ceramic", (0.89, 0.83, 0.68), 0.40, 0),
        ("Book_Indigo", (0.21, 0.17, 0.44), 0.83, 0),
        ("Book_Olive", (0.26, 0.37, 0.13), 0.85, 0),
        ("Book_Russet", (0.59, 0.16, 0.10), 0.82, 0),
        ("Book_Ochre", (0.79, 0.48, 0.14), 0.83, 0),
        ("Book_Teal", (0.08, 0.37, 0.35), 0.83, 0),
        ("Book_Berry", (0.50, 0.08, 0.24), 0.83, 0),
        ("Bloom_Coral", (0.82, 0.17, 0.16), 0.68, 0),
    ):
        material(name, color, rough, metal)
    material("Amber_Lamp", (0.96, 0.64, 0.21), 0.35, emission=(1, 0.58, 0.17))
    make_illustration_atlas()


def make_illustration_atlas():
    """Original fictional geography / astronomical ornament; no labels or proof."""
    u, v = np.meshgrid(np.linspace(0, 1, 256, endpoint=False), np.linspace(0, 1, 256, endpoint=False))
    def field(color):
        p = np.empty((256, 256, 3), dtype=np.float32); p[:] = color; return p
    def line(p, a, b, width, color):
        dx, dy = b[0] - a[0], b[1] - a[1]
        denom = dx * dx + dy * dy
        if denom <= 0:
            raise ValueError("Zero-length atlas segment")
        t = np.clip(((u - a[0]) * dx + (v - a[1]) * dy) / denom, 0, 1)
        distance = np.hypot(u - a[0] - t * dx, v - a[1] - t * dy)
        coverage = np.clip((width - distance) * 256 + 0.5, 0, 1)
        p[:] = p * (1 - coverage[..., None]) + np.asarray(color) * coverage[..., None]
    astronomy = field((0.055, 0.08, 0.09))
    gold = (0.79, 0.65, 0.37)
    for radius in (0.19, 0.32, 0.43):
        distance = np.abs(np.hypot(u - 0.5, v - 0.5) - radius)
        astronomy[distance < 0.0038] = gold
    for width in (0.08, 0.19, 0.31):
        distance = np.abs(np.hypot((u - 0.5) / width, (v - 0.5) / 0.43) - 1)
        astronomy[distance < 0.012] = gold
    for y in (0.21, 0.35, 0.5, 0.65, 0.79):
        half = math.sqrt(max(0, 0.43 ** 2 - (y - 0.5) ** 2))
        line(astronomy, (0.5 - half, y), (0.5 + half, y), 0.0035, gold)
    map_ = field((0.85, 0.77, 0.57))
    paper = (u > 0.055) & (u < 0.945) & (v > 0.06) & (v < 0.94)
    map_[paper] = (0.37, 0.60, 0.65)
    for index, (x, y, rx, ry) in enumerate(((0.26, 0.68, 0.14, 0.17), (0.63, 0.68, 0.20, 0.12), (0.67, 0.29, 0.12, 0.17), (0.31, 0.31, 0.19, 0.10))):
        theta = np.arctan2((v - y) / ry, (u - x) / rx)
        radius = np.hypot((u - x) / rx, (v - y) / ry)
        limit = 1 + 0.10 * np.sin(theta * 3 + index) + 0.07 * np.cos(theta * 5 - index)
        map_[paper & (radius < limit)] = (0.88, 0.76, 0.48)
        map_[paper & (radius < limit * 0.78)] = (0.29, 0.45, 0.23)
        map_[paper & (radius < limit * 0.41)] = (0.48, 0.55, 0.27)
    globe = field((0.18, 0.43, 0.51))
    continents = np.sin(u * 17 + v * 12) + 0.4 * np.cos(u * 29 - v * 7)
    globe[(continents > 0.53) & (v > 0.12) & (v < 0.88)] = (0.66, 0.59, 0.29)
    for k in range(1, 8):
        line(globe, (k / 8, 0), (k / 8, 1), 0.0018, (0.63, 0.63, 0.45))
        line(globe, (0, k / 8), (1, k / 8), 0.0018, (0.63, 0.63, 0.45))
    parchment = field((0.86, 0.79, 0.62))
    for index in range(12):
        x, y = 0.13 + ((index * 7) % 9) * 0.079, 0.15 + ((index * 5) % 10) * 0.070
        distance = np.hypot(u - x, v - y)
        parchment[distance < 0.008] = (0.29, 0.30, 0.35)
        if index < 11:
            nx, ny = 0.13 + (((index + 1) * 7) % 9) * 0.079, 0.15 + (((index + 1) * 5) % 10) * 0.070
            line(parchment, (x, y), (nx, ny), 0.002, (0.50, 0.43, 0.33))
    atlas = np.empty((512, 512, 3), dtype=np.float32)
    atlas[256:, :256], atlas[256:, 256:] = astronomy, map_
    atlas[:256, :256], atlas[:256, 256:] = globe, parchment
    material("Original_Ornamental_Atlas", (1, 1, 1), 0.80,
             base=packed_image("Original_Map_Astronomy_Globe_Atlas_512", rgba(atlas)))


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
                index = data.loops[loop_id].vertex_index
                layer.data[loop_id].uv = uv(data.vertices[index].co, polygon.normal) if callable(uv) else uv[index]
    if mat:
        data.materials.append(MATERIALS[mat])
    for polygon in data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4 if smooth == "SIDES" else bool(smooth)
    obj = bpy.data.objects.new(PREFIX + name, data)
    COLLECTION.objects.link(obj)
    obj.parent = GROUPS[part]
    obj["runtime_group"] = part
    obj["asset_role"] = "Original reference-led archive/observatory geometry"
    return obj


def box(name, center, size, mat, part, bevel=0.018, grain="X"):
    x, y, z = (float(value) / 2 for value in size)
    vertices = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    def uv(p, normal):
        if mat == "Compass_Woven_Rug":
            return (p.x / size[0] + 0.5, p.y / size[1] + 0.5)
        first = {"X":p.x,"Y":p.y,"Z":p.z}[grain]
        second = p.y if grain == "X" and abs(normal.z) > 0.5 else p.x
        if grain == "Y":
            second = p.x if abs(normal.z) > 0.5 else p.z
        if grain == "Z":
            second = p.x if abs(normal.y) > 0.5 else p.y
        return (first * 0.31, second * 0.55 + 0.5)
    obj = mesh_object(name, vertices, faces, mat, part, uv)
    obj.location = center
    # Microscopic bindings/ornamental bands do not warrant dozens of invisible
    # bevel faces. Large crafted edges retain their real softened silhouette.
    if bevel > 0 and min(size) >= 0.03:
        modifier = obj.modifiers.new("Hand softened finite edges", "BEVEL")
        modifier.width = min(bevel, min(size) * 0.12)
        modifier.segments = 1 if min(size) < 0.20 else 2
        modifier.limit_method = "ANGLE"
    return obj


def tube(name, points, radii, mat, part, sides=8):
    points = [Vector(tuple(float(value) for value in point)) for point in points]
    radii = [float(radius) for radius in radii]
    if len(points) < 2 or len(points) != len(radii) or min(radii) <= 0:
        raise ValueError("Tube must have matching points and positive finite radii")
    vertices, faces, uv, frame = [], [], [], None
    for index, point in enumerate(points):
        tangent = points[min(len(points)-1,index+1)] - points[max(0,index-1)]
        if tangent.length_squared < 1e-20:
            raise ValueError("Repeated tangent point in " + name)
        tangent.normalize()
        if frame is None:
            reference = Vector((0,0,1)) if abs(tangent.z) < 0.9 else Vector((0,1,0))
            frame = tangent.cross(reference).normalized()
        else:
            frame = frame - tangent * frame.dot(tangent)
            if frame.length_squared < 1e-16:
                frame = tangent.cross(Vector((0,1,0)))
            frame.normalize()
        other = tangent.cross(frame).normalized()
        for side in range(sides):
            angle = math.tau * side / sides
            vertices.append(tuple(point + (frame * math.cos(angle) + other * math.sin(angle)) * radii[index]))
            uv.append((side / sides,index / (len(points)-1)))
    for row in range(len(points)-1):
        for side in range(sides):
            nxt=(side+1)%sides; a=row*sides+side; b=(row+1)*sides+side
            faces.append((a,row*sides+nxt,(row+1)*sides+nxt,b))
    start,end=len(vertices),len(vertices)+1
    vertices.extend((tuple(points[0]),tuple(points[-1]))); uv.extend(((0.5,0),(0.5,1)))
    for side in range(sides):
        faces.append((start,(side+1)%sides,side))
        faces.append((end,(len(points)-1)*sides+side,(len(points)-1)*sides+(side+1)%sides))
    return mesh_object(name,vertices,faces,mat,part,uv,"SIDES")


def cylinder(name, center, radius, height, mat, part, sides=32):
    return tube(name,[(center[0],center[1],center[2]-height/2),(center[0],center[1],center[2]+height/2)],
                [radius,radius],mat,part,sides)


def oriented_cylinder(name, center, radius, height, axis, mat, part, sides=32):
    # Unlike rotating world-space cylinder vertices around origin, this keeps
    # the authored centre/pivot correct for telescope axles and rolled paper.
    center,axis=Vector(center),Vector(axis).normalized()
    return tube(name,[center-axis*(height/2),center+axis*(height/2)],
                [radius,radius],mat,part,sides)


def lathe(name, center, profile, mat, part, sides=48):
    vertices,faces,uv=[],[],[]
    if any(radius <= 0 for radius,z in profile):
        raise ValueError("Lathe profile must avoid collapsed axis rings")
    for row,(radius,z) in enumerate(profile):
        for side in range(sides):
            angle=side*math.tau/sides
            vertices.append((center[0]+radius*math.cos(angle),center[1]+radius*math.sin(angle),center[2]+z))
            uv.append((side/sides,row/len(profile)))
    for row in range(len(profile)):
        nxt=(row+1)%len(profile)
        for side in range(sides):
            edge=(side+1)%sides
            faces.append((row*sides+side,row*sides+edge,nxt*sides+edge,nxt*sides+side))
    return mesh_object(name,vertices,faces,mat,part,uv,True)


def annular_sector(name, center, profile, start, end, mat, part, sides=5):
    """Closed true curved masonry block / lintel: no overlapping flat facade."""
    vertices,faces,uv=[],[],[]
    columns=sides+1
    for row,(radius,z) in enumerate(profile):
        for side in range(columns):
            angle=start+(end-start)*side/sides
            vertices.append((center[0]+radius*math.cos(angle),center[1]+radius*math.sin(angle),center[2]+z))
            uv.append((side/sides,row/len(profile)))
    for row in range(len(profile)):
        nxt=(row+1)%len(profile)
        for side in range(sides):
            faces.append((row*columns+side,row*columns+side+1,nxt*columns+side+1,nxt*columns+side))
    faces.append(tuple(row*columns for row in range(len(profile))))
    faces.append(tuple(row*columns+sides for row in reversed(range(len(profile)))))
    obj=mesh_object(name,vertices,faces,mat,part,uv)
    for polygon in obj.data.polygons:
        # Only the two radius surfaces are smooth; each course/radial end stays crisp.
        polygon.use_smooth=polygon.index < sides or sides*2 <= polygon.index < sides*3
    return obj


def ellipsoid(name, center, scale, mat, part, rings=10, sides=20, atlas=None):
    vertices,faces,uv=[(0,0,scale[2])],[],[(0.5,1)]
    for row in range(1,rings):
        theta=math.pi*row/rings
        for side in range(sides):
            phi=math.tau*side/sides
            vertices.append((math.cos(phi)*math.sin(theta)*scale[0],math.sin(phi)*math.sin(theta)*scale[1],math.cos(theta)*scale[2]))
            uv.append((side/sides,1-row/rings))
    bottom=len(vertices); vertices.append((0,0,-scale[2])); uv.append((0.5,0))
    for side in range(sides):
        faces.append((0,1+side,1+(side+1)%sides))
    for row in range(rings-2):
        for side in range(sides):
            nxt=(side+1)%sides; a=1+row*sides+side; b=1+(row+1)*sides+side
            faces.append((a,b,1+(row+1)*sides+nxt,1+row*sides+nxt))
    last=1+(rings-2)*sides
    for side in range(sides):
        faces.append((last+side,bottom,last+(side+1)%sides))
    if atlas is not None:
        column,row=atlas
        uv=[((column+0.004+u*0.992)/2,(row+0.004+v*0.992)/2) for u,v in uv]
    obj=mesh_object(name,vertices,faces,mat,part,uv,True)
    obj.location=center
    return obj


def torus(name, center, radius, minor, mat, part, normal=(0,0,1), segments=48, sides=8):
    """Periodic closed rings: no coincident end caps or duplicate pole vertices."""
    normal=Vector(normal).normalized()
    ref=Vector((0,0,1)) if abs(normal.z)<0.9 else Vector((0,1,0))
    u=normal.cross(ref).normalized(); v=normal.cross(u).normalized(); center=Vector(center)
    vertices,faces,uv=[],[],[]
    for row in range(segments):
        angle=row*math.tau/segments
        radial=u*math.cos(angle)+v*math.sin(angle)
        for side in range(sides):
            phi=side*math.tau/sides
            vertices.append(tuple(center+radial*(radius+minor*math.cos(phi))+normal*(minor*math.sin(phi))))
            uv.append((row/segments,side/sides))
    for row in range(segments):
        nxt=(row+1)%segments
        for side in range(sides):
            edge=(side+1)%sides
            faces.append((row*sides+side,nxt*sides+side,nxt*sides+edge,row*sides+edge))
    return mesh_object(name,vertices,faces,mat,part,uv,True)


def solid_grid(name, rows, cols, sample, outward, thickness, mat, part):
    outward=Vector(outward).normalized(); vertices,faces,uv=[],[],[]
    for layer in (1,-1):
        for row in range(rows):
            for col in range(cols):
                t,w=row/(rows-1),col/(cols-1)
                vertices.append(tuple(Vector(sample(float(t),float(w)))+outward*(layer*thickness/2)))
                uv.append((t,w))
    stride=rows*cols
    a,b,c=(Vector(vertices[index]) for index in (0,cols,cols+1))
    reverse=(b-a).cross(c-a).dot(outward)<0
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col; face=(a,a+cols,a+cols+1,a+1)
            if reverse: face=tuple(reversed(face))
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    perimeter=list(range(cols))+[row*cols+cols-1 for row in range(1,rows)]
    perimeter+=list(range(stride-2,stride-cols-1,-1))+[row*cols for row in range(rows-2,0,-1)]
    side_start=len(faces)
    for index,a in enumerate(perimeter):
        b=perimeter[(index+1)%len(perimeter)]; face=(a,b,b+stride,a+stride)
        faces.append(tuple(reversed(face)) if reverse else face)
    obj=mesh_object(name,vertices,faces,mat,part,uv,True)
    for polygon in obj.data.polygons:
        if polygon.index>=side_start: polygon.use_smooth=False
    return obj


def timber_between(name, start, end, width, depth, part="shell", mat="Honey_Timber"):
    start,end=Vector(start),Vector(end)
    obj=box(name,(start+end)/2,(width,depth,(end-start).length),mat,part,min(width,depth)*0.09,"Z")
    obj.rotation_euler=(end-start).to_track_quat("Z","Y").to_euler()
    return obj


def build_platea():
    box("Platea_Supported_Stone_Substrate",(0,0,-0.17),(18,14,0.14),"Recessed_Mortar","shell",0)
    # Flat topZ0 with small visible mortar joints, no arbitrary walkable stairs.
    for row in range(12):
        for column in range(15):
            width,depth=18/15,14/12
            x=-9+(column+0.5)*width; y=-7+(row+0.5)*depth
            color=("Pale_Limestone","Warm_Limestone","Cool_Limestone")[(column*7+row*3)%11//4]
            box("Platea_Paving_%02d_%02d"%(row,column),(x,y,-0.05),(width-0.022,depth-0.022,0.10),color,"shell",0.009)
    for column in range(15):
        box("Platea_Front_Cut_Stone_Fascia_%02d"%column,(-8.4+column*1.2,-6.985,-0.27),(1.178,0.14,0.52),"Pale_Limestone","shell",0.008)
    box("Platea_West_Cut_Stone_Edge",(-8.96,0,-0.22),(0.08,14,0.43),"Warm_Limestone","shell",0.008,"Y")
    box("Platea_East_Cut_Stone_Edge",(8.96,0,-0.22),(0.08,14,0.43),"Pale_Limestone","shell",0.008,"Y")


def build_library_shell():
    for name,x,z,height in POSTS:
        y=-z
        obj=box(name,(x,y,height/2),(0.40,0.40,height),"Honey_Timber","shell",0.036,"Z")
        obj["collider_id"]=name
        # Shoes/bindings stay inside the conservative post envelope.
        box(name+"_Iron_Shoe",(x,y,0.12),(0.395,0.395,0.20),"Iron","shell",0.010)
        for h in (0.36,height-0.29):
            box(name+"_Carved_Binding_%s"%h,(x,y,h),(0.398,0.398,0.10),"Dark_Joinery","shell",0.008)
        for h in (0.39,height-0.29):
            ellipsoid(name+"_Forged_Pin_%s"%h,(x,y-0.205,h),(0.034,0.014,0.034),"Brass","decor",6,10)
    # Real low pale masonry wing, not a broad generic wood panel.
    box("Library_Backwall_Mortar",(-4.15,6.15,2.4),(8.30,0.35,4.8),"Recessed_Mortar","shell",0)
    for row in range(8):
        offset=0.55 if row%2 else 0
        left=-8.30
        for column in range(9):
            lo=max(left,left+column*0.95-offset); hi=min(0,left+(column+1)*0.95-offset)
            if hi-lo>0.06:
                box("Library_Backwall_Stone_%02d_%02d"%(row,column),((lo+hi)/2,5.962,0.31+row*0.60),
                    (hi-lo-0.022,0.09,0.568),"Pale_Limestone" if (column+row)%3 else "Warm_Limestone","shell",0.012)
    for y,height in ((5.75,4.97),(0.75,4.08)):
        box("Library_Main_Eave_%s"%y,(-4.15,y,height),(8.65,0.38,0.30),"Honey_Timber","shell",0.027)
    for x in (-8.1,-4.15,-0.2):
        timber_between("Library_Deep_Rafter_%s"%x,(x,0.58,4.12),(x,6.33,5.13),0.19,0.22,"roof")
    for x,sign in ((-8.1,1),(-0.2,-1)):
        timber_between("Library_Front_Corner_Brace_%s"%x,(x,0.75,3.27),(x+sign*0.77,0.75,3.98),0.20,0.18)
    # Single right shade pillar, outside document-table approaches.
    box("archive-awning-right-post",(8.15,-1.45,2.0),(0.28,0.28,4.0),"Honey_Timber","shell",0.025,"Z")


def roof_height(y):
    return 4.14+(y-0.45)*0.18


def barrel_tile(name,x,y,width=0.43,length=0.72):
    rows,cols=3,9; vertices,faces,uv=[],[],[]
    for layer in (0,1):
        for row in range(rows):
            t=row/(rows-1); yy=t*length
            for col in range(cols):
                angle=col/(cols-1)*math.pi
                radius=width/2-(0.018 if layer else 0)
                elevation=0.137-(0.023 if layer else 0)
                vertices.append((math.cos(angle)*radius*(1-0.033*t),yy,yy*0.18+math.sin(angle)*elevation))
                uv.append((t,col/(cols-1)))
    stride=rows*cols
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col; face=(a,a+cols,a+cols+1,a+1)
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    perimeter=list(range(cols))+[row*cols+cols-1 for row in range(1,rows)]
    perimeter+=list(range(stride-2,stride-cols-1,-1))+[row*cols for row in range(rows-2,0,-1)]
    for index,a in enumerate(perimeter):
        b=perimeter[(index+1)%len(perimeter)]; faces.append((a,b,b+stride,a+stride))
    obj=mesh_object(name,vertices,faces,"Terracotta","roof",uv,"SIDES")
    obj.location=(x,y,roof_height(y))
    return obj


def build_library_roof():
    # Rearward full ceramic roof: exposed books below, open station line ahead.
    for column in range(21):
        x=-8.37+column*0.415
        for row in range(10):
            y=0.46+row*0.576
            barrel_tile("Roof_True_Half_Barrel_Tile_%02d_%02d"%(column,row),x,y)
    for x in np.linspace(-8.35,0.24,12):
        timber_between("Roof_Visible_Underside_Slat_%02d"%round((x+8.35)*10),(float(x),0.35,roof_height(0.35)-0.13),
                       (float(x),6.38,roof_height(6.38)-0.13),0.10,0.12,"roof","Dark_Joinery")
    for y in (0.35,3.25,6.38):
        box("Roof_Transverse_Batten_%s"%y,(-4.05,y,roof_height(y)-0.02),(8.90,0.15,0.10),"Honey_Timber","roof",0.012)
    box("Roof_Front_Fascia",(-4.05,0.33,4.095),(9.04,0.16,0.23),"Honey_Timber","roof",0.018)
    # Small left triangular linen sail and a separate right tower-side shade.
    canopies=(
        ("Library_Left_Cream_Tension_Sail",((-8.08,0.61,4.06),(-4.35,0.61,4.06),(-5.20,-0.62,3.78),(-8.08,-0.62,3.98))),
        ("Tower_Right_Cream_Tension_Sail",((6.80,0.35,4.61),(8.15,-1.45,3.96),(5.64,-0.10,3.94),(5.36,0.62,4.20))),
    )
    for name,corners_ in canopies:
        corners=[Vector(p) for p in corners_]
        def sample(t,w):
            p=(corners[0]*(1-w)+corners[1]*w)*(1-t)+(corners[3]*(1-w)+corners[2]*w)*t
            p.z-=0.26*math.sin(math.pi*t)*math.sin(math.pi*w)
            p.z+=0.018*math.sin(w*21)*math.sin(math.pi*t)
            return p
        solid_grid(name,19,13,sample,(0,0,1),0.013,"Cream_Linen","roof")
        for index,(a,b) in enumerate(((0,1),(1,2),(2,3),(3,0))):
            pts=[corners[a]*(1-float(t))+corners[b]*float(t)-Vector((0,0,0.06*math.sin(math.pi*float(t)))) for t in np.linspace(0,1,13)]
            tube(name+"_Tension_Cord_%d"%index,pts,[0.019]*len(pts),"Cream_Linen","decor",6)


def build_tower():
    # Closed existing-cylinder contract, gently tapered base/cornice, real curved blocks.
    cylinder("Tower_Recessed_Stone_Core",(TOWER_X,TOWER_Y,3.6),3.50,7.2,"Recessed_Mortar","shell",96)
    courses=12
    for row in range(courses):
        count=20 if row%3 else 19
        offset=math.pi/count if row%2 else 0
        for block in range(count):
            start=offset+block*math.tau/count+0.005
            end=offset+(block+1)*math.tau/count-0.005
            front_angle=((start+end)/2+math.pi/2+math.pi)%math.tau-math.pi
            if row<6 and abs(front_angle)<0.35:
                # Leave a genuine recess in the outer masonry for the closed
                # door; the solid core behind remains non-traversable.
                continue
            low=0.014+row*0.585; high=low+0.561
            radius=3.69-0.017*math.sin(row*0.75+block*1.4)
            profile=((radius,low),(radius,high),(3.485,high),(3.485,low))
            color=("Pale_Limestone","Warm_Limestone","Cool_Limestone")[(row*3+block*7)%13//5]
            annular_sector("Tower_Coursed_Stone_%02d_%02d"%(row,block),(TOWER_X,TOWER_Y,0),profile,start,end,color,"shell",4)
    for name,z,outer,inner,height,mat in (("Base_Plinth",0.08,3.70,3.44,0.24,"Pale_Limestone"),
                                          ("Upper_Stone_Cornice",6.99,3.70,3.40,0.20,"Pale_Limestone"),
                                          ("Dome_Brass_Rotation_Track",7.16,3.70,3.40,0.16,"Brass")):
        lathe("Tower_"+name,(TOWER_X,TOWER_Y,z),((outer,0),(outer,height),(inner,height),(inner,0)),mat,"shell",96)
    # Crafted closed doorway, recessed into the front masonry. It is not an open portal.
    door_y=TOWER_Y-3.54
    for index in range(9):
        xx=TOWER_X-0.78+index*0.195
        height=2.40+0.20*math.sqrt(max(0,1-((xx-TOWER_X)/0.88)**2))
        box("Tower_Closed_Door_Plank_%02d"%index,(xx,door_y,0.08+height/2),(0.18,0.085,height),"Honey_Timber","shell",0.012,"Z")
    for z in (0.46,1.87):
        box("Tower_Door_Iron_Binding_%s"%z,(TOWER_X,door_y-0.055,z),(1.66,0.040,0.105),"Iron","decor",0.007)
    torus("Tower_Door_Brass_Ring_Handle",(TOWER_X+0.45,door_y-0.095,1.16),0.087,0.015,"Brass","decor",(0,-1,0),24,6)
    for side in (-1,1):
        box("Tower_Portal_Pale_Stone_Jamb_%s"%side,(TOWER_X+side*0.99,TOWER_Y-3.41,1.29),(0.24,0.16,2.57),"Pale_Limestone","shell",0.027,"Z")
    pts=[(TOWER_X+1.00*math.cos(float(t)),TOWER_Y-3.34,2.48+0.49*math.sin(float(t))) for t in np.linspace(0,math.pi,25)]
    tube("Tower_Portal_Rounded_Stone_Arch",pts,[0.135]*len(pts),"Pale_Limestone","shell",12)
    for index in range(18):
        phi=index*math.tau/18
        ellipsoid("Dome_Track_Brass_Rivet_%02d"%index,(TOWER_X+3.705*math.cos(phi),TOWER_Y+3.705*math.sin(phi),7.235),
                  (0.046,0.046,0.039),"Brass","decor",6,10)


def build_open_dome():
    """Smooth thick spherical shell with a real uncapped observation slit."""
    rows,cols=29,65; radius=3.62; thickness=0.072
    theta0=0.035; opening_center=math.atan2(-0.76,0.32); gap=0.21
    phi0=opening_center+gap; span=math.tau-gap*2
    vertices,faces,uv=[],[],[]
    for layer in (0,1):
        r=radius-thickness*layer
        for row in range(rows):
            theta=theta0+(math.pi/2-theta0)*row/(rows-1)
            for col in range(cols):
                phi=phi0+span*col/(cols-1)
                vertices.append((TOWER_X+r*math.sin(theta)*math.cos(phi),TOWER_Y+r*math.sin(theta)*math.sin(phi),TOWER_HEIGHT+r*math.cos(theta)))
                uv.append((col/(cols-1),row/(rows-1)))
    stride=rows*cols
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col; face=(a,a+cols,a+cols+1,a+1)
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    perimeter=list(range(cols))+[row*cols+cols-1 for row in range(1,rows)]
    perimeter+=list(range(stride-2,stride-cols-1,-1))+[row*cols for row in range(rows-2,0,-1)]
    side_start=len(faces)
    for index,a in enumerate(perimeter):
        b=perimeter[(index+1)%len(perimeter)]; faces.append((a,b,b+stride,a+stride))
    obj=mesh_object("Dome_Thick_Open_Observation_Shell",vertices,faces,"Dome_Blue_Metal","roof",uv,True)
    for polygon in obj.data.polygons:
        if polygon.index>=side_start: polygon.use_smooth=False
    obj["part"]="True spherical metallic shell with thick finished slit edges; not a hemisphere pasted over a telescope"
    # Visible sliding rails and restrained continuous meridian panel seams.
    angles=[phi0,phi0+span]+[phi0+span*index/12 for index in range(1,12)]
    for index,phi in enumerate(angles):
        pts=[(TOWER_X+(radius+0.014)*math.sin(float(t))*math.cos(phi),TOWER_Y+(radius+0.014)*math.sin(float(t))*math.sin(phi),
              TOWER_HEIGHT+(radius+0.014)*math.cos(float(t))) for t in np.linspace(theta0,math.pi/2,25)]
        tube("Dome_Meridian_%02d"%index,pts,[0.018 if index>1 else 0.048]*len(pts),"Brass","roof",6)
    # One panel seam at a latitude; exclude the slit rather than bridging it shut.
    for index,theta in enumerate((0.62,1.12)):
        pts=[(TOWER_X+(radius+0.012)*math.sin(theta)*math.cos(float(phi)),TOWER_Y+(radius+0.012)*math.sin(theta)*math.sin(float(phi)),
              TOWER_HEIGHT+(radius+0.012)*math.cos(theta)) for phi in np.linspace(phi0,phi0+span,81)]
        tube("Dome_Latitude_Seam_%d"%index,pts,[0.012]*len(pts),"Brass","roof",5)
    cylinder("Dome_Small_Polar_Inspection_Lid",(TOWER_X,TOWER_Y,10.86),0.34,0.095,"Brass","roof",40)
    cylinder("Dome_Polar_Lid_Inset",(TOWER_X,TOWER_Y,10.917),0.26,0.036,"Dome_Blue_Metal","roof",40)
    # Optical body is hollow at the mouth, rings/brass forks keep the telescope readable.
    pivot=Vector((TOWER_X,TOWER_Y,8.45)); axis=Vector((0.32,-0.76,0.57)).normalized()
    obj=lathe("Telescope_Hollow_Brass_Optical_Tube",(0,0,0),
              ((0.34,0),(0.34,1.05),(0.39,1.12),(0.39,3.05),(0.46,3.11),(0.46,5.00),(0.38,5.00),(0.38,3.14),(0.31,3.09),(0.28,0)),
              "Brass","roof",48)
    obj.location=pivot; obj.rotation_euler=axis.to_track_quat("Z","Y").to_euler()
    for index,(distance,radius_) in enumerate(((0.12,0.39),(1.17,0.425),(2.70,0.445),(3.20,0.49),(4.95,0.505))):
        torus("Telescope_Reinforcement_Ring_%d"%index,pivot+axis*distance,radius_,0.037,"Brass","roof",axis,40,6)
    lens=cylinder("Telescope_Recessed_Optical_Lens",(0,0,0),0.363,0.030,"Optical_Glass","roof",48)
    lens.location=pivot+axis*4.91; lens.rotation_euler=axis.to_track_quat("Z","Y").to_euler()
    for side in (-1,1):
        timber_between("Telescope_Metal_Fork_%s"%side,(TOWER_X+side*0.55,TOWER_Y-0.36,7.52),
                       (TOWER_X+side*0.55,TOWER_Y-0.36,8.58),0.15,0.18,"roof","Dark_Inner_Metal")
        oriented_cylinder("Telescope_Altitude_Axle_%s"%side,(TOWER_X+side*0.57,TOWER_Y-0.36,8.43),0.23,0.13,(1,0,0),"Brass","roof",24)
    cylinder("Telescope_Rotating_Pedestal",(TOWER_X,TOWER_Y-0.36,7.57),0.77,0.31,"Dark_Inner_Metal","roof",40)


BOOK_COLORS=("Book_Indigo","Book_Olive","Book_Russet","Book_Ochre","Book_Teal","Book_Berry")


def book(name, center, size, color, horizontal=False, part="interior"):
    x,y,z=size; thickness=min(0.014,(z if horizontal else x)*0.095)
    pivot=bpy.data.objects.new(PREFIX+name+"_Binding_Pivot",None)
    COLLECTION.objects.link(pivot); pivot.parent=GROUPS[part]; pivot.location=center
    pivot["runtime_group"]=part
    def piece(suffix,p,dimensions,mat):
        # These sub-centimetre book edges are bound/covered surfaces. Four real
        # solid pieces remain, but no internal micro-bevel tessellation.
        obj=box(name+suffix,p,dimensions,mat,part,0)
        obj.parent=pivot
    if horizontal:
        for side in (-1,1):
            piece("_Cover_%s"%side,(0,0,side*(z-thickness)/2),(x,y,thickness),color)
        piece("_Front_Colored_Spine",(0,-(y-thickness)/2,0),(x,thickness,z-thickness*2),color)
        page_size=(x*0.96,y-thickness-0.004,z-thickness*2-0.002)
    else:
        for side in (-1,1):
            piece("_Cover_%s"%side,(side*(x-thickness)/2,0,0),(thickness,y,z),color)
        piece("_Front_Colored_Spine",(0,-(y-thickness)/2,0),(x-thickness*2,thickness,z),color)
        page_size=(x-thickness*2-0.002,y-thickness-0.004,z*0.95)
        for zz in (-z*0.31,z*0.31):
            piece("_Spine_Ornamental_Band_%s"%zz,(0,-y/2-0.002,zz),(x*0.70,0.004,0.011),"Brass")
    piece("_Exposed_Page_Block",(0,thickness/2,0),page_size,"Paper")
    return pivot


def build_bookshelves():
    for library,cx in enumerate((-6.30,-2.08)):
        cy=5.57
        for side in (-1,1):
            box("Bookcase_%d_Carved_Side_%s"%(library,side),(cx+side*1.71,cy,2.005),(0.18,0.80,3.85),"Honey_Timber","interior",0.022,"Z")
        box("Bookcase_%d_Recessed_Back"%library,(cx,cy+0.35,2.0),(3.27,0.10,3.81),"Dark_Joinery","interior",0.007,"Z")
        for shelf in range(7):
            height=0.16+shelf*0.608
            box("Bookcase_%d_Deep_Shelf_%d"%(library,shelf),(cx,cy,height),(3.60,0.80,0.13),"Honey_Timber","interior",0.015)
            if shelf==6: continue
            cursor=cx-1.56
            for index in range(15):
                width=random.uniform(0.145,0.205); tall=random.uniform(0.40,0.49)
                if cursor+width>cx+1.56: break
                volume=book("Bookcase_%d_Volume_%d_%02d"%(library,shelf,index),
                            (cursor+width/2,cy-0.12,height+0.071+tall/2),(width,0.49,tall),BOOK_COLORS[(index+shelf*3+library)%6])
                # Tiny lean is a complete local binding rotation, not a detached cover.
                volume.rotation_euler.y=math.radians(-2.5 if index%7==0 else 0)
                cursor+=width+0.030


def open_volume(name, center, width=0.92, depth=0.66):
    x,y,z=center
    box(name+"_Lower_Cover",(x,y,z),(width+0.09,depth+0.08,0.04),"Book_Indigo","interior",0.004)
    # Curved pages have actual thickness, valley and lifted binding; no drawn text.
    for side in (-1,1):
        def sample(t,w):
            xx=x+side*(0.025+w*(width/2-0.025))
            yy=y+(t-0.5)*depth
            zz=z+0.065+0.052*(1-w)**2+0.008*math.sin(math.pi*t)
            return (xx,yy,zz)
        obj=solid_grid(name+"_Curved_Open_Page_%s"%side,9,9,sample,(0,0,1),0.046,"Paper","interior")
        obj["content_status"]="Unlabelled physical archive volume; actual education records stay HTML"
        for row in range(5):
            # Only fine fore-edge depth cues, never pseudo-writing on a qualification.
            tube(name+"_Fore_Edge_Leaf_%s_%d"%(side,row),[(x+side*0.06,y-depth/2-0.003,z+0.046-row*0.007),
                 (x+side*(width/2-0.014),y-depth/2-0.003,z+0.029-row*0.005)], [0.0014]*2,"Warm_Limestone","interior",5)
    tube(name+"_Binding_Ribbon",[(x,y+depth/2-0.02,z+0.11),(x,y,z+0.116),(x,y-depth/2-0.09,z+0.026)],
         [0.008]*3,"Book_Ochre","interior",6)


def globe(name, center, radius=0.36):
    x,y,z=center
    cylinder(name+"_Weighted_Timber_Base",(x,y,z+0.042),radius*0.72,0.084,"Dark_Joinery","interior",24)
    cylinder(name+"_Brass_Stem",(x,y,z+radius*0.65),radius*0.080,radius,"Brass","interior",12)
    sphere=ellipsoid(name+"_Original_Unlabelled_Map_Sphere",(x,y,z+radius*1.55),(radius,radius,radius),
                     "Original_Ornamental_Atlas","interior",16,32,(0,0))
    sphere.rotation_euler.y=math.radians(18)
    torus(name+"_Brass_Meridian",(x,y,z+radius*1.55),radius*1.11,radius*0.031,"Brass","interior",(0,-1,0.35),48,6)


def build_archive_tables():
    for index,(name,x,z) in enumerate(STATIONS):
        y=-z
        top=box(name+"_Consultation_Desk_Worksurface",(x,y,1.225),(3,1.35,0.15),"Honey_Timber","interior",0.032)
        top["hotspot_id"]=name
        top["interaction_anchor_local_gltf"]=[x,1.30,z]
        for side in (-1,1):
            cx=x+side*1.14
            for end in (-1,1):
                box(name+"_Tapered_Leg_%s_%s"%(side,end),(cx,y+end*0.43,0.555),(0.15,0.15,1.11),"Honey_Timber","interior",0.013,"Z")
            box(name+"_Side_Drawer_Carcass_%s"%side,(cx,y+0.07,0.97),(0.46,1.08,0.30),"Honey_Timber","interior",0.020)
            box(name+"_Drawer_Recess_%s"%side,(cx,y-0.489,0.972),(0.375,0.049,0.213),"Dark_Joinery","interior",0.007)
            tube(name+"_Drawer_Brass_Pull_%s"%side,[(cx-0.069,y-0.520,0.972),(cx+0.069,y-0.520,0.972)],[0.012]*2,"Brass","interior",6)
        box(name+"_Underframe",(x,y+0.43,0.79),(2.48,0.12,0.14),"Dark_Joinery","interior",0.012)
        open_volume(name+"_Consultable_Unlabelled_Volume",(x,y-0.08,1.332))
        for stack in range(3):
            book(name+"_Side_Book_%d"%stack,(x+1.01,y+0.03,1.36+stack*0.11),(0.58,0.43,0.09),BOOK_COLORS[(index+stack)%6],True)
        if index==0: globe(name+"_Desk_Globe",(x-1.07,y+0.14,1.3),0.255)
        else: lantern(name+"_Desk_Warm_Lantern",(x-1.12,y+0.18,1.60),0.54)
    for index,(x,z) in enumerate(((-6.2,4.3),(-1.2,4.3),(6.2,4.3))):
        y=-z
        cylinder("Stool_%d_Rounded_Carved_Seat"%index,(x,y,0.795),0.32,0.11,"Honey_Timber","interior",24)
        for dx,dy in ((-0.19,-0.19),(0.19,-0.19),(0.19,0.19),(-0.19,0.19)):
            timber_between("Stool_%d_Leg_%s_%s"%(index,dx,dy),(x+dx*1.2,y+dy*1.2,0.04),(x+dx,y+dy,0.747),0.095,0.095,"interior")
        torus("Stool_%d_Low_Footrest"%index,(x,y,0.26),0.245,0.024,"Dark_Joinery","interior",segments=20,sides=6)
    box("Library_Ornamental_Violet_Rug",(-3.65,-0.18,0.017),(6.80,3.1,0.027),"Compass_Woven_Rug","interior",0.001)
    # A small brass armillary sits on the rightmost table, inside its desk hull.
    armillary("Education_2_Brass_Armillary",(5.88,-2.72,1.3),0.30)


def armillary(name, center, radius):
    x,y,z=center
    cylinder(name+"_Pedestal",(x,y,z+0.05),radius*0.61,0.10,"Brass","interior",24)
    cylinder(name+"_Stem",(x,y,z+radius*0.72),radius*0.11,radius,"Brass","interior",12)
    target=(x,y,z+radius*1.60)
    for index,normal in enumerate(((0,0,1),(0,1,0),(1,0,0),(0.35,0.4,0.85))):
        torus(name+"_Orbital_Ring_%d"%index,target,radius*(1+0.065*index),radius*0.045,"Brass","interior",normal,40,6)
    ellipsoid(name+"_Inner_Celestial_Sphere",target,(radius*0.25,)*3,"Book_Ochre","interior",10,16)


def illustration_panel(name, center, size, quadrant, part="interior"):
    x,y,z=(value/2 for value in size)
    vertices=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    column,row=quadrant
    def uv(p,n):
        return ((column+0.004+0.992*(p.x/size[0]+0.5))/2,(row+0.004+0.992*(p.z/size[2]+0.5))/2)
    obj=mesh_object(name,vertices,faces,"Original_Ornamental_Atlas",part,uv)
    obj.location=center
    obj["content_status"]="Original decorative astronomical/map illustration; no personal records, institution logos or factual screenshots"
    return obj


def build_library_instruments():
    # Illustrative wall panel modestly scaled between shelves, not a new large board.
    box("Library_Wall_Astronomical_Frame",(-4.19,5.74,2.57),(1.30,0.16,1.40),"Honey_Timber","interior",0.018)
    illustration_panel("Library_Wall_Original_Armillary_Drawing",(-4.19,5.649,2.57),(1.15,0.018,1.24),(0,1))
    # Low framed fictional map on the right archive desk, entirely in its envelope.
    frame=box("Right_Table_Small_Astronomical_Atlas_Frame",(5.75,-2.79,1.73),(0.66,0.09,0.73),"Honey_Timber","interior",0.010)
    frame.rotation_euler.x=math.radians(-12)
    panel=illustration_panel("Right_Table_Fictional_Atlas",(5.75,-2.844,1.73),(0.56,0.012,0.62),(1,1))
    panel.rotation_euler.x=math.radians(-12)
    for index,(x,y) in enumerate(((-7.18,5.51),(-1.37,5.49))):
        for scroll in range(3):
            theta=math.radians(6+scroll*4)
            oriented_cylinder("Library_Rolled_Parchment_%d_%d"%(index,scroll),(x+scroll*0.09,y,3.54),0.031,0.40,
                              (math.sin(theta),0,math.cos(theta)),"Paper","interior",12)


def lantern(name, center, scale=1):
    x,y,z=center
    for suffix,zz,radius,height in (("Brass_Base",z-0.25*scale,0.18,0.065),("Brass_Crown",z+0.25*scale,0.20,0.075)):
        cylinder(name+"_"+suffix,(x,y,zz),radius*scale,height*scale,"Brass","decor",12)
    for dx,dy in ((-0.13,-0.13),(0.13,-0.13),(0.13,0.13),(-0.13,0.13)):
        tube(name+"_Forged_Frame_%s_%s"%(dx,dy),[(x+dx*scale,y+dy*scale,z-0.225*scale),(x+dx*scale,y+dy*scale,z+0.235*scale)],
             [0.014*scale]*2,"Brass","decor",4)
    ellipsoid(name+"_Warm_Core",(x,y,z),(0.105*scale,0.105*scale,0.193*scale),"Amber_Lamp","decor",8,12)
    torus(name+"_Suspension_Loop",(x,y,z+0.38*scale),0.075*scale,0.011*scale,"Iron","decor",(0,1,0),12,5)


def banner(name, center, width, height, part="decor"):
    x,y,z=center
    timber_between(name+"_Timber_Crossbar",(x-width*0.61,y,z+0.11),(x+width*0.61,y,z+0.11),0.11,0.11,part)
    def sample(t,w):
        return (x+(w-0.5)*width,y-0.035-0.09*math.sin(math.pi*t)*math.cos(w*math.tau),
                z-t*height+t**8*0.26*(1-abs(w*2-1)))
    solid_grid(name+"_Violet_Closed_Cloth",21,13,sample,(0,-1,0),0.012,"Violet_Cloth",part)
    cx,cy,cz=x,y-0.15,z-height*0.39
    torus(name+"_Gold_Compass_Ring",(cx,cy,cz),width*0.24,0.010,"Brass",part,(0,-1,0),40,6)
    for index in range(8):
        angle=index*math.tau/8; extent=width*(0.36 if index%2==0 else 0.23)
        tube(name+"_Gold_Compass_Ray_%d"%index,[(cx,cy-0.006,cz),(cx+math.cos(angle)*extent,cy-0.006,cz+math.sin(angle)*extent)],
             [0.023,0.004],"Brass",part,6)


def broad_leaf(name, origin, direction, length, mat):
    """Closed wide lamina, shaped midrib/folds, no cards or triangle fronds."""
    origin=Vector(origin); direction=Vector(direction).normalized()
    normal=Vector((0,-1,0.65)); normal=normal-direction*normal.dot(direction)
    if normal.length_squared<0.02: normal=Vector((1,0,0)).cross(direction)
    normal.normalize(); across=normal.cross(direction).normalized()
    length=float(length)
    def line(t): return origin+direction*(length*t)+normal*(length*0.17*math.sin(math.pi*t))
    def sample(t,w):
        q=w*2-1; half=length*(0.31*math.sin(math.pi*t)**0.69+0.010)
        return line(t)+across*(q*half)-normal*(length*0.066*q*q*math.sin(math.pi*t))
    # Preserve the broad closed blade and central physical fold. Small attached
    # leaves use5x3 samples; large pot leaves retain7x5. Fine veins remain in
    # their portable normal texture rather than a heavy tube on every leaf.
    large=length>=0.65
    obj=solid_grid(name,7 if large else 5,5 if large else 3,sample,normal,0.008,mat,"decor")
    obj["collision_policy"]="Soft broad-leaf decoration, not a solid navigational obstacle"
    if large:
        pts=[line(float(t)) for t in np.linspace(0,0.94,5)]
        tube(name+"_Raised_Midrib",pts,[0.0045]*len(pts),"Young_Green_Leaf","decor",5)


def flower(name, center, scale=1):
    x,y,z=center
    for index in range(5):
        theta=index*math.tau/5
        petal=ellipsoid(name+"_Opaque_Petal_%d"%index,(x+math.cos(theta)*0.092*scale,y-0.013*scale,z+math.sin(theta)*0.092*scale),
                        (0.073*scale,0.028*scale,0.042*scale),"Bloom_Coral","decor",5,8)
        petal.rotation_euler.y=-theta
    ellipsoid(name+"_Warm_Centre",(x,y-0.041*scale,z),(0.030*scale,0.025*scale,0.030*scale),"Book_Ochre","decor",4,8)


def vine(name, anchors, count=16, leaf_length=0.43, bloom=False):
    a,b,c=(Vector(p) for p in anchors)
    def path(t): return a*(1-t)**2+b*(2*t*(1-t))+c*t*t
    pts=[path(float(t)) for t in np.linspace(0,1,29)]
    tube(name+"_Attached_Curved_Trunk",pts,[0.022*(1-0.40*float(t)) for t in np.linspace(0,1,29)],"Dark_Joinery","decor",6)
    for index,t_ in enumerate(np.linspace(0.04,0.96,count)):
        t=float(t_); start=path(t); side=-1 if index%2 else 1
        direction=Vector((side*(0.65+0.10*math.sin(index)), -0.30,-0.26+0.19*math.cos(index*1.6)))
        leaf_origin=start+direction.normalized()*0.05
        tube(name+"_Petiole_%02d"%index,[start,leaf_origin],[0.007,0.005],"Deep_Green_Leaf","decor",5)
        broad_leaf(name+"_Broad_Leaf_%02d"%index,leaf_origin,direction,leaf_length*(0.85+0.20*math.sin(index*2.1)),
                   ("Broad_Green_Leaf","Deep_Green_Leaf","Young_Green_Leaf")[(index//3)%3])
    if bloom:
        for index,t in enumerate((0.18,0.43,0.74)):
            flower(name+"_Coral_Bloom_%d"%index,path(t)+Vector((0.03,-0.09,-0.04)),0.9)


def plant(name, center, radius, height, leaves=16):
    x,y,z=center
    profile=((radius*0.53,0),(radius*0.70,height*0.07),(radius*0.91,height*0.79),(radius,height*0.87),
             (radius,height),(radius*0.85,height),(radius*0.80,height*0.86),(radius*0.65,height*0.19),(radius*0.21,height*0.18))
    lathe(name+"_Crafted_Ceramic_Vessel",center,profile,"Terracotta","decor",24)
    cylinder(name+"_Recessed_Soil",(x,y,z+height*0.89),radius*0.81,height*0.05,"Soil","decor",20)
    for index in range(leaves):
        phi=index*math.tau/leaves+0.21
        base=Vector((x,y,z+height*(0.92+index*0.015)))
        direction=Vector((math.cos(phi),math.sin(phi),0.60+0.13*math.sin(index)))
        broad_leaf(name+"_Upright_Broad_Leaf_%02d"%index,base,direction,(0.72+0.20*math.sin(index*1.7))*height,
                   ("Broad_Green_Leaf","Deep_Green_Leaf","Young_Green_Leaf")[index%3])


def build_botanical_details():
    # Lush concentrated architecture-attached clusters, not curtains over cases.
    for index,(name,x,z,radius,height) in enumerate(POTS):
        plant("Pot_"+name,(x,-z,0),radius,height,18 if index<4 else 13)
    for index,(x,y,scale) in enumerate(((-7.43,5.45,0.28),(-1.01,5.44,0.25))):
        plant("Library_Shelf_Small_Plant_%d"%index,(x,y,3.89),scale*0.44,scale*0.69,7)
    # Eaves: four connected masses, each with several leafy branches.
    for index,(left,right) in enumerate(((-8.1,-6.35),(-6.25,-4.30),(-4.05,-2.15),(-1.95,-0.2))):
        for branch in range(2):
            vine("Library_Eave_Cluster_%d_%d"%(index,branch),((left,0.22,4.30),(left+(right-left)*0.48,0.05,4.02-branch*0.12),(right,0.24,4.28)),
                 14,0.38+branch*0.045,index%2==0 and branch==0)
    for index,(x,y,z) in enumerate(((-8.08,0.49,4.20),(-0.23,0.48,4.15),(-8.0,5.65,4.93))):
        vine("Library_Post_Descending_%d"%index,((x,y,z),(x+0.14,y-0.14,z-1.25),(x-0.09,y,z-2.40)),19,0.43,index<2)
    # Five long trailing masses around tower: angled anchoring follows the curved wall.
    for index,phi in enumerate((-2.70,-1.83,-0.23,0.66,2.28)):
        x=TOWER_X+3.72*math.cos(phi); y=TOWER_Y+3.72*math.sin(phi)
        tangent=Vector((-math.sin(phi),math.cos(phi),0))
        a=Vector((x,y,7.20)); b=a+tangent*0.53+Vector((0,-0.04,-2.02)); c=a-tangent*0.28+Vector((0,-0.08,-4.18))
        vine("Tower_Trailing_Vine_%d"%index,(a,b,c),25,0.51,index%2==0)
        branch_origin=a+Vector((0,0,-0.39))
        vine("Tower_Cornice_Leafy_Mass_%d"%index,(branch_origin-tangent*0.75,branch_origin+Vector((0,-0.12,-0.14)),branch_origin+tangent*0.78),16,0.48,index==1)
    # Front platform trim stays off the clear front-crossing corridor.
    for index,x in enumerate((-8.70,8.66)):
        vine("Platea_Edge_Trailing_%d"%index,((x,-4.85,0.16),(x+0.04,-5.72,-0.13),(x,-6.39,-0.54)),14,0.39,index==0)


def build_lamps_flags():
    banner("Tower_Violet_Compass_Standard",(TOWER_X+0.11,TOWER_Y-3.76,6.75),1.27,2.57)
    banner("Library_Left_Violet_Compass_Standard",(-7.85,0.48,3.80),0.90,1.52)
    for index,center in enumerate(((-7.67,5.15,3.54),(-4.13,5.48,3.96),(-0.62,5.13,3.60),
                                   (-8.04,0.28,2.97),(TOWER_X-1.57,TOWER_Y-3.40,3.13),(TOWER_X+1.68,TOWER_Y-3.40,3.13),(8.12,-1.48,2.75))):
        lantern("Architectural_Warm_Lamp_%02d"%index,center,0.86)
    points=[(float(x),0.19,3.80-0.16*math.sin((float(x)+7.72)/7.1*math.pi)) for x in np.linspace(-7.72,-0.62,25)]
    tube("Library_Pendant_Cord",points,[0.010]*len(points),"Iron","decor",6)
    for index,x in enumerate((-7.40,-5.70,-3.98,-2.30,-0.77)):
        zz=3.80-0.16*math.sin((x+7.72)/7.1*math.pi)
        tube("Library_Small_Pendant_Drop_%d"%index,[(x,0.19,zz),(x,0.19,zz-0.13)],[0.009]*2,"Iron","decor",6)
        lantern("Library_Small_Pendant_%d"%index,(x,0.19,zz-0.31),0.40)


def collider_contract():
    hulls=[]
    def box_hull(name,role,x,z,width,depth,height,bottom=0):
        hulls.append({"id":name,"role":role,"kind":"box","x":x,"z":z,"width":width,"depth":depth,"bottom":bottom,"height":height,"yaw":0})
    def cylinder_hull(name,role,x,z,radius,height):
        hulls.append({"id":name,"role":role,"kind":"cylinder","x":x,"z":z,"radius":radius,"width":radius*2,"depth":radius*2,"bottom":0,"height":height,"yaw":0})
    cylinder_hull("archive-observatory","tower",4,-2.7,3.7,7.2)
    for name,x,z,height in POSTS: box_hull(name,"post",x,z,0.40,0.40,height)
    box_hull("archive-back-wall","wall",-4.15,-6.15,8.30,0.35,4.8)
    for name,x in (("left",-6.30),("right",-2.08)):
        box_hull("archive-bookcase-"+name,"furniture",x,-5.57,3.60,0.80,3.85,0.08)
    for name,x,z in STATIONS: box_hull(name+"-station","desk",x,z,3,1.35,1.3)
    for index,(x,z) in enumerate(((-6.2,4.3),(-1.2,4.3),(6.2,4.3))):
        box_hull("archive-stool-%d"%index,"furniture",x,z,0.68,0.68,0.85)
    for name,x,z,radius,height in POTS:
        cylinder_hull("archive-pot-"+name,"furniture",x,z,radius,height)
    box_hull("archive-awning-right-post","post",8.15,1.45,0.28,0.28,4.0)
    if len(hulls)!=22: raise RuntimeError("Archive contract must contain22 conservative hulls")
    return {"schema":"archipelago-static-building-contract-v1","asset":"archive-observatory-v1","root":ROOT_NAME,
            "units":"metres","axes":"Local glTF Y-up: X right, Y up, Z front; Blender (X,Y,Z) exports as glTF (X,Z,-Y).",
            "anchor":{"island":"education","x":90,"y":19.06,"z":18,"yaw":0},
            "deck":{"id":"archive-deck","x":0,"z":0,"width":18,"depth":14,"bottom":-0.24,"height":0.24,"walkingTop":0,"yaw":0},
            "runtimeGroups":["shell","roof","interior","decor"],"hulls":hulls,
            "status":"Proposed Blender authoring annotation only; not active Rapier or an integration approval"}


def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def setup_preview(scene, minimum, maximum):
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x,scene.render.resolution_y=800,650
    scene.render.resolution_percentage=100
    scene.render.image_settings.media_type="IMAGE"
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=False
    scene.view_settings.view_transform="Khronos PBR Neutral"
    scene.view_settings.exposure=0
    world=bpy.data.worlds.new(PREFIX+"Preview_White_Environment"); world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(0.91,0.95,1,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=0.86
    scene.world=world
    target=(minimum+maximum)*0.5
    data=bpy.data.cameras.new(PREFIX+"Preview_Camera"); data.type="ORTHO"
    data.ortho_scale=max(maximum.x-minimum.x,(maximum.z-minimum.z)*800/650)*1.34
    camera=bpy.data.objects.new(PREFIX+"Preview_Camera",data); scene.collection.objects.link(camera)
    camera.location=target+Vector((17.5,-28.5,17.3)); aim(camera,target); scene.camera=camera
    # Soft high warm daylight, cool frontal fill, gentle rear edge; not an unseen
    # high-exposure trick to whiten a bad material. Tiny lamps are actually emissive.
    for name,kind,position,energy,color in (
        ("Warm_Key","SUN",(-10,-14,20),2.5,(1,0.90,0.76)),
        ("Soft_Front_Fill","AREA",(-5,-9,9),1900,(0.83,0.92,1)),
        ("Dome_Rim","SUN",(8,10,17),0.68,(1,0.97,0.86)),
        ("Library_Fill","POINT",(-4,3.4,3.3),95,(1,0.82,0.61))):
        data=bpy.data.lights.new(PREFIX+"Preview_"+name,kind); data.energy=energy; data.color=color
        if kind=="SUN": data.angle=math.radians(10)
        elif kind=="AREA": data.shape="DISK"; data.size=8
        else: data.shadow_soft_size=2.8
        light=bpy.data.objects.new(PREFIX+"Preview_"+name,data); scene.collection.objects.link(light)
        light.location=position; aim(light,target)


def main():
    global COLLECTION
    # Parent owns dedicated-project/revision guards; never run in assembled world.
    for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
    for datablocks in (bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.worlds):
        for data in list(datablocks):
            if data.name.startswith(PREFIX) and data.users==0: datablocks.remove(data)
    for previous in list(bpy.data.collections):
        if previous.name.startswith(COLLECTION_NAME) and not previous.objects and not previous.children:
            bpy.data.collections.remove(previous)
    COLLECTION=bpy.data.collections.new(COLLECTION_NAME); bpy.context.scene.collection.children.link(COLLECTION)
    root=bpy.data.objects.new(ROOT_NAME,None); COLLECTION.objects.link(root)
    root["asset_id"]="archive-observatory-v1"
    root["units"]="metres; source Blender Z-up, glTF exporter Y-up"
    root["deck_walking_top_z"]=0.0
    root["proposal_only"]=True
    root["design_note"]="Pale masonry observatory with open metallic slit and brass telescope; inhabited tropical open library, three unchanged record anchors; no fabricated education proof"
    for part in ("shell","roof","interior","decor"):
        obj=bpy.data.objects.new(PREFIX+part,None); COLLECTION.objects.link(obj); obj.parent=root
        obj["runtime_group"]=part; GROUPS[part]=obj
    GROUPS["roof"]["visibility_contract"]="Separate low rear library roof, cloth and observatory dome; no automatic roof hiding or upper walkable floors"
    make_materials()
    build_platea(); build_library_shell(); build_library_roof(); build_tower(); build_open_dome()
    build_bookshelves(); build_archive_tables(); build_library_instruments(); build_botanical_details(); build_lamps_flags()
    bpy.context.view_layer.update()
    meshes=[obj for obj in COLLECTION.objects if obj.type=="MESH"]
    points=[obj.matrix_world@Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not points or not all(math.isfinite(value) for p in points for value in p):
        raise RuntimeError("Archive has empty/non-finite bounds")
    minimum=Vector(tuple(min(p[axis] for p in points) for axis in range(3)))
    maximum=Vector(tuple(max(p[axis] for p in points) for axis in range(3)))
    if any(maximum[axis]<=minimum[axis] for axis in range(3)): raise RuntimeError("Archive has invalid dimensions")
    depsgraph=bpy.context.evaluated_depsgraph_get(); triangles=vertices=0
    for obj in meshes:
        evaluated=obj.evaluated_get(depsgraph); data=evaluated.to_mesh()
        try:
            data.calc_loop_triangles(); triangles+=len(data.loop_triangles); vertices+=len(data.vertices)
            if not all(math.isfinite(value) for vertex in data.vertices for value in vertex.co):
                raise RuntimeError("Non-finite evaluated position in "+obj.name)
            if not all(math.isfinite(value) for layer in data.uv_layers for loop in layer.data for value in loop.uv):
                raise RuntimeError("Non-finite evaluated UV in "+obj.name)
        finally: evaluated.to_mesh_clear()
    exceeded=[]
    if triangles>TRIANGLE_SAFETY_MAX: exceeded.append("triangles")
    if len(MATERIALS)>32: exceeded.append("materials")
    if len(TEXTURES)>16: exceeded.append("images")
    if exceeded:
        raise RuntimeError("Archive budget: triangles=%d/%d; materials=%d/32; images=%d/16; meshes=%d; exceeded=%s" %
                           (triangles,TRIANGLE_SAFETY_MAX,len(MATERIALS),len(TEXTURES),len(meshes),",".join(exceeded)))
    if any(not image.packed_file or max(image.size)>TEXTURE_RESOLUTION_LIMIT for image in TEXTURES):
        raise RuntimeError("Archive needs portable packed PBR images at most512px")
    contract=collider_contract()
    text_name="ArchiveObservatory_V1_Collision_Proposal_JSON"
    previous=bpy.data.texts.get(text_name)
    if previous is not None: bpy.data.texts.remove(previous)
    text=bpy.data.texts.new(text_name); text.write(json.dumps(contract,indent=2))
    scene=bpy.context.scene; scene.unit_settings.system="METRIC"; scene.unit_settings.scale_length=1.0
    setup_preview(scene,minimum,maximum)
    output=artifacts.file(name=PREVIEW_NAME,media_type="image/png")
    scene.render.filepath=str(output.path); bpy.ops.render.render(write_still=True); output.publish()
    return {"asset":"archive-observatory-v1","blender_version":bpy.app.version_string,"root":ROOT_NAME,
            "mesh_objects":len(meshes),"evaluated_triangles":triangles,"evaluated_vertices":vertices,"materials":len(MATERIALS),
            "packed_pbr_images":[image.name for image in TEXTURES],
            "packed_image_dimensions":{image.name:list(image.size) for image in TEXTURES},
            "decoded_rgba8_texture_bytes":sum(int(image.size[0])*int(image.size[1])*4 for image in TEXTURES),
            "bounds_min_blender":[round(v,4) for v in minimum],"bounds_max_blender":[round(v,4) for v in maximum],
            "dimensions_m":[round(v,4) for v in maximum-minimum],"walking_top_z":0,
            "groups":[obj.name for obj in GROUPS.values()],"station_count":3,"solid_collider_proposal_count":22,
            "contract":contract,"collider_annotations_text":text_name,"preview":PREVIEW_NAME,
            "acceptance":"Reference-led editable master only; exported GLB, art, map support/contact, runtime LOD and measured performance remain to verify"}


result=main()

