"""Cliff v2: an eroded coherent rock mass, not repeated prism columns.

Blender 5.2, metres, Z up. Reference-led editable sculptural study only.
No network, external files, gameplay geometry, active collider or GLB operator.
The worker exports .blend / standard Y-up GLB and publishes the small preview.
"""

import json
import math
import random

import bpy
import bmesh
import numpy as np
from mathutils import Euler, Vector


SEED = 281212
ROOT_NAME = "Cliff_V2_Origin_At_Coast_Base"
COLLECTION_NAME = "Cliff_V2_Eroded_Mass_Editable"
PREVIEW_NAME = "cliff-v2-eevee.png"
TARGET_SIZE_M = (8.0, 6.0, 7.0)
MASTER_TRIANGLE_LIMIT = 100000
random.seed(SEED)


def packed_image(name, rgb, non_color=False):
    pixels = np.concatenate((np.clip(rgb, 0, 1),
                             np.ones((*rgb.shape[:2], 1), dtype=np.float32)), axis=2)
    image = bpy.data.images.new(name, width=rgb.shape[1], height=rgb.shape[0], alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(np.asarray(pixels, dtype=np.float32).ravel())
    image.update()
    image.pack()
    return image


def hash_grid(x, y, seed):
    value = np.sin(x*127.1+y*311.7+seed*13.19)*43758.5453
    return value-np.floor(value)


def value_noise(u, v, frequency, seed):
    x, y = u*frequency, v*frequency
    ix, iy = np.floor(x), np.floor(y)
    fx, fy = x-ix, y-iy
    fx, fy = fx*fx*(3-2*fx), fy*fy*(3-2*fy)
    a, b = hash_grid(ix, iy, seed), hash_grid(ix+1, iy, seed)
    c, d = hash_grid(ix, iy+1, seed), hash_grid(ix+1, iy+1, seed)
    return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy


def normal_image(name, relief, strength):
    dy, dx = np.gradient(relief)
    normal = np.stack((-dx*strength, -dy*strength, np.ones_like(dx)), axis=2)
    normal /= np.linalg.norm(normal, axis=2)[..., None]
    return packed_image(name, normal*0.5+0.5, True)


def build_textures():
    u, v = np.meshgrid(np.linspace(0, 1, 1024, endpoint=False),
                       np.linspace(0, 1, 1024, endpoint=False))
    broad = value_noise(u, v, 9, 81)
    mineral = value_noise(u, v, 51, 91)
    grain = value_noise(u, v, 177, 103)
    grit = hash_grid(u*1024, v*1024, 121)
    field = value_noise(u+0.013*np.sin(v*31), v+0.018*np.sin(u*23), 43, 137)
    mask = np.clip((value_noise(u, v, 11, 149)-0.58)*4, 0, 1)
    fissure = np.exp(-((field-0.50)/0.010)**2)*mask
    tone = 0.90+0.15*broad+0.065*mineral+0.04*grain+0.024*(grit-0.5)
    tone -= 0.055*fissure
    rgb = tone[..., None]*np.array((0.500, 0.488, 0.458))
    rgb += (broad-0.5)[..., None]*np.array((0.022, 0.016, 0.006))
    rock_base = packed_image("CliffV2_Rock_Mineral_Base_1024", rgb)
    rough = np.clip(0.84+0.065*grain+0.03*fissure, 0.77, 0.98)
    rock_rough = packed_image("CliffV2_Rock_Rough_1024",
                              np.repeat(rough[..., None], 3, axis=2), True)
    rock_normal = normal_image("CliffV2_Rock_Fine_Normal_1024",
                               0.040*mineral+0.025*grain-0.021*fissure, 8.0)
    su, sv = np.meshgrid(np.linspace(0, 1, 512, endpoint=False),
                         np.linspace(0, 1, 512, endpoint=False))
    sand_noise = value_noise(su, sv, 17, 163)
    sand_grain = hash_grid(su*512, sv*512, 179)
    sand_tone = 0.94+0.09*sand_noise+0.032*(sand_grain-0.5)
    sand_base = packed_image("CliffV2_Sand_Base_512",
                             sand_tone[..., None]*np.array((0.80, 0.654, 0.417)))
    sand_normal = normal_image("CliffV2_Sand_Normal_512",
                               0.021*value_noise(su, sv, 123, 191)+0.011*sand_grain, 3.0)
    return (rock_base, rock_rough, rock_normal), (sand_base, sand_normal)


def pbr_material(name, color, roughness, textures=None, vertex_color=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0
    if vertex_color:
        node = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name = "Color"
        mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    if textures:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = textures[0]
        node.name = "Packed portable base color"
        mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
        if len(textures) == 3:
            node = mat.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = textures[1]
            node.name = "Packed portable roughness"
            mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Roughness"])
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = textures[-1]
        node.name = "Packed portable tangent normal"
        normal = mat.node_tree.nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value = 0.45 if len(textures) == 3 else 0.22
        mat.node_tree.links.new(node.outputs["Color"], normal.inputs["Color"])
        mat.node_tree.links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def mesh_object(name, verts, faces, material, collection, root,
                bevel=0, smooth=False, tint=(1, 1, 1), seed=0):
    mesh = bpy.data.meshes.new(name+"_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=1e-8)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if any(edge.is_boundary or not edge.is_manifold for edge in bm.edges):
        raise RuntimeError("Non-closed authored control mesh: "+name)
    for edge in bm.edges:
        edge.smooth = edge.calc_face_angle() < math.radians(37)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    uv = mesh.uv_layers.new(name="UVMap")
    colors = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
    mesh.color_attributes.active_color_index = 0
    offset_u = 0.371*math.sin(seed*1.73)
    offset_v = 0.419*math.cos(seed*0.91)
    for poly in mesh.polygons:
        poly.use_smooth = smooth
        normal = poly.normal
        for loop_id in poly.loop_indices:
            p = mesh.vertices[mesh.loops[loop_id].vertex_index].co
            if abs(normal.z) > max(abs(normal.x), abs(normal.y)):
                coords = (p.x*0.31, p.y*0.31)
            elif abs(normal.x) > abs(normal.y):
                coords = (p.y*0.32, p.z*0.29)
            else:
                coords = (p.x*0.32, p.z*0.29)
            uv.data[loop_id].uv = (coords[0]+offset_u, coords[1]+offset_v)
            factor = 0.95+0.032*math.sin(p.x*13.7+p.y*8.2+p.z*4.6+seed)
            colors.data[loop_id].color = (*[c*factor for c in tint], 1)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj["asset_id"] = "cliff-v2"
    if bevel:
        mod = obj.modifiers.new("Soft chipped corners; overlap clamped", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(24)
        mod.use_clamp_overlap = True
        mod.harden_normals = True
        if smooth:
            weighted = obj.modifiers.new("Broad rock plane weighted normals", "WEIGHTED_NORMAL")
            weighted.keep_sharp = True
            weighted.weight = 40
    return obj


BASE_OUTLINE = ((-3.82, -1.03), (-3.12, -2.34), (-1.43, -2.72),
                (0.55, -2.81), (2.83, -2.22), (3.86, -0.74),
                (3.53, 1.19), (2.41, 2.48), (0.60, 2.82),
                (-1.79, 2.41), (-3.29, 1.63), (-3.90, 0.13))
TOP_OUTLINE = ((-2.64, -0.73), (-1.91, -1.58), (-0.58, -1.79),
               (1.05, -1.65), (2.41, -1.19), (2.71, 0.12),
               (2.10, 1.15), (1.05, 1.63), (-0.60, 1.78),
               (-2.24, 1.21), (-2.78, 0.29), (-2.88, -0.31))
# (perimeter parameter, mouth width, depth, start, end, diagonal drift).
CLEFTS = ((0.124, 0.017, 0.62, 0.07, 0.94, 0.031),
          (0.313, 0.013, 0.48, 0.22, 0.99, -0.027),
          (0.491, 0.016, 0.57, 0.06, 0.78, 0.023),
          (0.721, 0.014, 0.41, 0.33, 0.99, -0.035),
          (0.923, 0.016, 0.53, 0.12, 0.88, 0.024))
EROSION_POCKETS = ((0.08, 0.32, 0.030, 0.10, 0.25),
                   (0.20, 0.59, 0.040, 0.12, 0.37),
                   (0.28, 0.77, 0.034, 0.07, 0.25),
                   (0.41, 0.37, 0.037, 0.09, 0.33),
                   (0.52, 0.62, 0.029, 0.11, 0.23),
                   (0.66, 0.48, 0.044, 0.09, 0.31),
                   (0.80, 0.74, 0.034, 0.09, 0.26),
                   (0.94, 0.43, 0.031, 0.10, 0.29))


def periodic_distance(a, b):
    d = abs((a-b) % 1.0)
    return min(d, 1-d)


def gaussian(x, centre, width):
    return math.exp(-((x-centre)/width)**2)


def outline_at(outline, parameter):
    position = (parameter % 1.0)*len(outline)
    index = int(position)
    t = position-index
    a, b = outline[index], outline[(index+1) % len(outline)]
    return (a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t)


def perimeter_samples():
    values = [i/72 for i in range(72)]
    # Resolve both lips and the V-floor of each real fracture, avoiding tiny
    # accidental face slivers when a lip almost coincides with a regular sample.
    for u, width, *_ in CLEFTS:
        values.extend((u+offset*width) % 1 for offset in (-1.8, -0.85, 0, 0.85, 1.8))
    values.sort()
    result = []
    for value in values:
        if not result or value-result[-1] >= 0.0015:
            result.append(value)
    if 1-result[-1]+result[0] < 0.0015:
        result.pop()
    return result


def shell_point(u, t):
    drift = 0.016*math.sin(t*5.1)+0.020*t
    bx, by = outline_at(BASE_OUTLINE, u+drift)
    tx, ty = outline_at(TOP_OUTLINE, u+drift)
    blend = t*t*(3-2*t)
    x, y = bx+(tx-bx)*blend, by+(ty-by)*blend
    radius = max(math.hypot(x, y), 0.1)
    nx, ny = x/radius, y/radius
    # Local overhangs are followed by undercut recesses; not uniform ring bands.
    relief = 0.58*gaussian(periodic_distance(u, 0.175), 0, 0.066)*gaussian(t, 0.62, 0.15)
    relief += 0.39*gaussian(periodic_distance(u, 0.455), 0, 0.075)*gaussian(t, 0.73, 0.13)
    relief -= 0.47*gaussian(periodic_distance(u, 0.190), 0, 0.059)*gaussian(t, 0.34, 0.12)
    relief -= 0.30*gaussian(periodic_distance(u, 0.493), 0, 0.060)*gaussian(t, 0.43, 0.14)
    for cu, ct, wu, wt, depth in EROSION_POCKETS:
        relief -= depth*gaussian(periodic_distance(u, cu), 0, wu)*gaussian(t, ct, wt)
    for cu, width, depth, start, end, diagonal in CLEFTS:
        # The geometric V crosses planes diagonally, and stops organically.
        distance = periodic_distance(u, cu+diagonal*(t-0.5))
        taper = max(0, min(1, (t-start)/0.13, (end-t)/0.12))
        relief -= depth*math.exp(-(distance/width)**2)*taper
    relief += 0.036*math.sin(u*73+t*17)*math.sin(u*121-t*9)*math.sin(math.pi*t)
    x += nx*relief+0.19*math.sin(t*2.5)*t
    y += ny*relief-0.15*math.sin(t*3.1)*t
    z = 6.72*t+0.11*math.sin(u*19+t*3.7)*t*(1-t)
    if t == 1:
        z += 0.105*math.sin(u*math.tau*3)+0.045*math.cos(u*math.tau*7)
    return (x, y, z)


def mass_geometry():
    samples = perimeter_samples()
    n = len(samples)
    levels = (0, 0.050, 0.112, 0.181, 0.276, 0.378, 0.490,
              0.583, 0.675, 0.756, 0.837, 0.918, 0.966, 1.0)
    verts = [shell_point(u, t) for t in levels for u in samples]
    faces = []
    for row in range(len(levels)-1):
        for j in range(n):
            a, b = row*n+j, row*n+(j+1) % n
            faces.append((a, b, b+n, a+n))
    # Base fan and a sculpted closed roof: no non-planar giant ngon or open cave.
    base_centre = len(verts)
    verts.append((0, 0, 0))
    for j in range(n):
        faces.append((base_centre, (j+1) % n, j))
    previous = (len(levels)-1)*n
    for scale in (0.74, 0.43, 0.15):
        current = len(verts)
        for j, u in enumerate(samples):
            edge = shell_point(u, 1)
            verts.append((edge[0]*scale, edge[1]*scale,
                          6.49+(edge[2]-6.49)*scale*scale))
        for j in range(n):
            nj = (j+1) % n
            faces.append((previous+j, previous+nj, current+nj, current+j))
        previous = current
    roof_centre = len(verts)
    verts.append((0, 0, 6.49))
    for j in range(n):
        faces.append((previous+j, previous+(j+1) % n, roof_centre))
    return verts, faces


WEDGE_PROFILE = ((-0.48, -0.30), (-0.26, -0.51), (0.18, -0.48),
                 (0.46, -0.23), (0.51, 0.17), (0.27, 0.48),
                 (-0.13, 0.44), (-0.47, 0.23))


def wedge_geometry(centre, size, angles, seed):
    # Asymmetric four-plane stone wedge, rotated into an oblique shoulder/spall.
    # Eight corners are broad sculptural facets, never a circular cylinder ring.
    width, depth, height = size
    rotation = Euler(tuple(math.radians(a) for a in angles), "XYZ").to_matrix()
    rings = ((0, 1.00, -0.04), (0.19, 1.13, 0.02),
             (0.74, 0.88, 0.11), (1.0, 0.67, 0.18))
    local = []
    n = len(WEDGE_PROFILE)
    for t, radius, shear in rings:
        for j, (px, py) in enumerate(WEDGE_PROFILE):
            chipped = 1+0.055*math.sin(j*2.9+seed)*math.sin(math.pi*t)
            z = t*height
            z += 0.14*height*math.sin(j*1.7+seed*0.23)*t
            p = rotation @ Vector((width*(px*radius*chipped+shear),
                                    depth*py*radius*chipped, z))
            local.append(tuple(p))
    min_z = min(p[2] for p in local)
    verts = [(centre[0]+x, centre[1]+y, centre[2]+z-min_z) for x, y, z in local]
    faces = []
    for row in range(len(rings)-1):
        for j in range(n):
            a, b = row*n+j, row*n+(j+1) % n
            faces.append((a, b, b+n, a+n))
    # Triangulated caps avoid the uneven broad tops becoming degenerate ngons.
    for row, reverse in ((0, True), (len(rings)-1, False)):
        ids = [row*n+j for j in range(n)]
        centre_index = len(verts)
        centre_point = tuple(sum(verts[k][axis] for k in ids)/n for axis in range(3))
        verts.append(centre_point)
        for j in range(n):
            triangle = (centre_index, ids[j], ids[(j+1) % n])
            faces.append(tuple(reversed(triangle)) if reverse else triangle)
    return verts, faces


def build_shoulders(rock, collection, root):
    # Different widths, inclinations, heights and contacts—not a repeated stack.
    specs = (
        ("Left_Broken_Shoulder", (-2.69, -1.43, 0.20), (2.42, 1.86, 3.18), (8, -19, -13)),
        ("Front_Low_Oblique_Spall", (-1.27, -2.25, 0.03), (2.73, 1.42, 2.07), (11, 15, 9)),
        ("Right_Overhung_Plate", (1.95, -1.74, 0.55), (2.54, 1.53, 3.61), (-8, -18, 18)),
        ("Right_Outer_Buttress", (2.86, 0.29, 0.08), (1.97, 1.91, 2.34), (13, -24, -11)),
        ("Left_Coast_Fallen_Block", (-3.06, 0.15, 0.0), (1.79, 1.83, 1.58), (-17, 8, 21)),
        ("Front_Right_Base_Chip", (2.52, -1.75, 0.0), (2.04, 1.60, 1.27), (15, -23, -25)),
        ("Broken_Back_Summit_Rim", (-1.33, 1.06, 5.72), (1.54, 1.19, 1.03), (-11, -9, 28)),
        ("Small_Summit_Fault_Tooth", (-2.05, 0.35, 5.83), (1.18, 1.07, 0.76), (7, 12, -36)),
    )
    for index, (name, centre, size, angles) in enumerate(specs):
        verts, faces = wedge_geometry(centre, size, angles, SEED+index*17)
        obj = mesh_object("RockV2_"+name, verts, faces, rock, collection, root,
                          bevel=0.032, smooth=True, seed=index+1)
        obj["part"] = "unique oblique eroded shoulder or fallen spall"
    return len(specs)


def sandy_cap_geometry():
    n = 32
    outline = []
    for j in range(n):
        angle = math.tau*j/n
        erosion = 1+0.055*math.sin(j*2.6)+0.035*math.cos(j*1.3)
        outline.append((0.10+2.03*math.cos(angle)*erosion,
                        -0.06+1.31*math.sin(angle)*erosion))
    def top(x, y):
        return 6.591+0.027*math.sin(x*1.8)+0.018*math.cos(y*2.6)
    verts = [(0.1, -0.06, top(0.1, -0.06))]
    faces = []
    for radius in (0.20, 0.47, 0.75, 1.0):
        for x, y in outline:
            px, py = 0.1+(x-0.1)*radius, -0.06+(y+0.06)*radius
            verts.append((px, py, top(px, py)))
    for j in range(n):
        faces.append((0, 1+j, 1+(j+1) % n))
    for row in range(3):
        a, b = 1+row*n, 1+(row+1)*n
        for j in range(n):
            nj = (j+1) % n
            faces.append((a+j, b+j, b+nj, a+nj))
    bottom = len(verts)
    for x, y in outline:
        verts.append((x, y, top(x, y)-0.14))
    for j in range(n):
        nj = (j+1) % n
        faces.append((1+3*n+j, bottom+j, bottom+nj, 1+3*n+nj))
    centre_index = len(verts)
    verts.append((0.1, -0.06, top(0.1, -0.06)-0.14))
    for j in range(n):
        faces.append((centre_index, bottom+(j+1) % n, bottom+j))
    return verts, faces, outline


def ground_at(x, y):
    bpy.context.view_layer.update()
    hit, point, normal, face, obj, matrix = bpy.context.scene.ray_cast(
        bpy.context.evaluated_depsgraph_get(), Vector((x, y, 10)), Vector((0, 0, -1)), distance=12)
    if hit and obj and obj.type == "MESH":
        return point
    return None


def lichen_geometry(x, y, radius):
    centre = ground_at(x, y)
    if centre is None:
        return None
    n = 14
    outline = []
    for j in range(n):
        angle = math.tau*j/n
        r = radius*(0.74+0.20*math.sin(j*2.4)**2)
        px, py = x+r*math.cos(angle), y+r*math.sin(angle)*0.78
        point = ground_at(px, py)
        if point is None or abs(point.z-centre.z) > 0.07:
            return None
        outline.append((px, py, point.z))
    verts = [(x, y, centre.z+0.006)]
    verts.extend((px, py, z+0.003) for px, py, z in outline)
    verts.extend((px, py, z-0.012) for px, py, z in outline)
    verts.append((x, y, centre.z-0.012))
    faces = []
    for j in range(n):
        nj = (j+1) % n
        faces.append((0, j+1, nj+1))
        faces.append((j+1, n+1+j, n+1+nj, nj+1))
        faces.append((2*n+1, n+1+nj, n+1+j))
    if max(p[2] for p in verts)-min(p[2] for p in verts) > 0.095:
        return None
    return verts, faces


def build_small_detail(rock, lichen, collection, root):
    lichen_count = 0
    # Sparse, low, muted lichen, not the bright green discs of the first study.
    for index, (x, y, radius) in enumerate(((-1.57, -0.72, 0.15), (1.68, -0.64, 0.13),
                                          (-1.11, 0.85, 0.15), (1.12, 0.96, 0.11),
                                          (-2.08, -1.42, 0.12), (2.21, -1.39, 0.14),
                                          (-2.81, -1.46, 0.10), (2.83, 0.19, 0.12))):
        geometry = lichen_geometry(x, y, radius)
        if geometry:
            obj = mesh_object("LichenV2_Sparse_Mineral_Edge_%02d" % (index+1),
                              *geometry, lichen, collection, root, smooth=True,
                              tint=(0.044, 0.095, 0.019), seed=index)
            obj["part"] = "tiny low lichen film; no macro vegetation"
            lichen_count += 1
    gravel_count = 0
    for index in range(24):
        angle = random.uniform(0, math.tau)
        radius = random.uniform(0.32, 0.94)
        x, y = 0.1+1.85*math.cos(angle)*radius, -0.06+1.15*math.sin(angle)*radius
        ground = ground_at(x, y)
        if ground is None:
            continue
        size = random.uniform(0.028, 0.054)
        verts, faces = wedge_geometry((x, y, ground.z-0.008),
                                      (size*1.8, size*1.6, size),
                                      (0, 9, random.uniform(-40, 40)), index+31)
        obj = mesh_object("GravelV2_Summit_%02d" % (index+1), verts, faces,
                          rock, collection, root, bevel=0.003, smooth=True, seed=index+31)
        obj["part"] = "small grounded loose stone"
        gravel_count += 1
    return lichen_count, gravel_count


def fit_asset_dimensions(collection):
    # Author shape first, then fit the module to its declared metre-scale box.
    # All objects use local mesh coordinates and an identity root; no hidden scale.
    meshes = [obj for obj in collection.objects if obj.type == "MESH"]
    coordinates = [vertex.co for obj in meshes for vertex in obj.data.vertices]
    lo = [min(p[a] for p in coordinates) for a in range(3)]
    hi = [max(p[a] for p in coordinates) for a in range(3)]
    shift = ((lo[0]+hi[0])*0.5, (lo[1]+hi[1])*0.5, lo[2])
    scale = tuple(TARGET_SIZE_M[a]/(hi[a]-lo[a]) for a in range(3))
    for obj in meshes:
        for vertex in obj.data.vertices:
            vertex.co = tuple((vertex.co[a]-shift[a])*scale[a] for a in range(3))
        obj.data.update()
    bpy.context.view_layer.update()
    return shift, scale


def evaluated_stats(collection):
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    meshes = [obj for obj in collection.objects if obj.type == "MESH"]
    points = []
    triangles, vertices, boundaries, degenerates = 0, 0, 0, 0
    for obj in meshes:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        vertices += len(mesh.vertices)
        for triangle in mesh.loop_triangles:
            a, b, c = (mesh.vertices[k].co for k in triangle.vertices)
            degenerates += int((b-a).cross(c-a).length_squared < 1e-16)
        bm = bmesh.new()
        bm.from_mesh(mesh)
        boundaries += sum(edge.is_boundary or not edge.is_manifold for edge in bm.edges)
        bm.free()
        points.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
        evaluated.to_mesh_clear()
    if not points or not all(math.isfinite(v) for p in points for v in p):
        raise RuntimeError("Empty or non-finite cliff-v2 bounds")
    lo = Vector(tuple(min(p[a] for p in points) for a in range(3)))
    hi = Vector(tuple(max(p[a] for p in points) for a in range(3)))
    if any(hi[a] <= lo[a] for a in range(3)):
        raise RuntimeError("Zero or negative cliff-v2 dimension")
    if triangles > MASTER_TRIANGLE_LIMIT:
        raise RuntimeError("Cliff-v2 exceeds 100k triangle master budget: %d" % triangles)
    if boundaries or degenerates:
        raise RuntimeError("Cliff-v2 evaluated geometry: %d boundary/nonmanifold, %d degenerate" %
                           (boundaries, degenerates))
    return meshes, lo, hi, vertices, triangles


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()


def preview_setup(lo, hi):
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 900, 650
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if hasattr(scene.render.image_settings, "media_type"):
        scene.render.image_settings.media_type = "IMAGE"
    scene.render.film_transparent = False
    if hasattr(scene, "eevee") and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 32
    enums = scene.view_settings.bl_rna.properties["view_transform"].enum_items
    if "Khronos PBR Neutral" in {item.identifier for item in enums}:
        scene.view_settings.view_transform = "Khronos PBR Neutral"
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new("CliffV2_Studio_Ambient")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.91, 0.94, 0.98, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.37
    scene.world = world
    target = (lo+hi)*0.5
    camera_data = bpy.data.cameras.new("CliffV2_Delivery_ThreeQuarter_Camera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("CliffV2_Delivery_ThreeQuarter_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = target+Vector((10.5, -17.0, 8.5))
    camera["preview_only"] = True
    aim(camera, target)
    # A three-quarter view mixes height and depth: fitting the world-space
    # dimensions alone clips the near coast base. Fit all eight world bounds
    # corners in camera space, where orthographic scale is the horizontal span.
    world_to_camera_rotation = camera.rotation_euler.to_matrix().transposed()
    corners = [Vector((x, y, z)) for x in (lo.x, hi.x)
               for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    projected = [world_to_camera_rotation @ (corner-camera.location) for corner in corners]
    projected_width = max(p.x for p in projected)-min(p.x for p in projected)
    projected_height = max(p.y for p in projected)-min(p.y for p in projected)
    aspect = scene.render.resolution_x/scene.render.resolution_y
    camera_data.ortho_scale = max(projected_width, projected_height*aspect)*1.15
    camera_data["projected_bounds_width_m"] = projected_width
    camera_data["projected_bounds_height_m"] = projected_height
    camera_data["framing_margin"] = 0.15
    scene.camera = camera
    for name, kind, position, energy, color in (
        ("Key_Warm_Sun", "SUN", (-8, -9, 15), 2.8, (1, 0.84, 0.66)),
        ("Fill_Cool_Point", "POINT", (5, -7, 10), 650, (0.73, 0.84, 1)),
        ("Rim_Sun", "SUN", (3, 8, 12), 0.55, (1, 0.94, 0.84))):
        data = bpy.data.lights.new("CliffV2_"+name, kind)
        data.energy, data.color = energy, color
        if kind == "SUN":
            data.angle = math.radians(6)
        else:
            data.shadow_soft_size = 3.0
        light = bpy.data.objects.new("CliffV2_"+name, data)
        scene.collection.objects.link(light)
        light.location = position
        light["preview_only"] = True
        aim(light, target)
    scene.frame_set(1)
    bpy.context.view_layer.update()


def main():
    # New dedicated project, or re-run replacing only explicitly v2-owned data.
    old = bpy.data.collections.get(COLLECTION_NAME)
    if old:
        old_meshes = [obj.data for obj in old.all_objects if obj.type == "MESH"]
        for obj in list(old.all_objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
        for mesh in old_meshes:
            if mesh.users == 0:
                bpy.data.meshes.remove(mesh)
    for obj in list(bpy.data.objects):
        if obj.get("preview_only") and obj.name.startswith("CliffV2_"):
            bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        if mat.name.startswith("CliffV2_") and mat.users == 0:
            bpy.data.materials.remove(mat)
    for image in list(bpy.data.images):
        if image.name.startswith("CliffV2_") and image.users == 0:
            bpy.data.images.remove(image)
    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(ROOT_NAME, None)
    collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.6
    root["asset_id"] = "cliff-v2"
    root["reference"] = "reference-sheets-v2/12-cliff-module.png"
    root["origin"] = "coast-base centre, z=0; identity transforms"
    root["axes"] = "metres; Blender Z-up, exporter handles glTF Y-up"
    root["construction"] = "continuous closed eroded shell, geometric oblique clefts, unique spalls"
    root["fidelity"] = "authored reference-led study; not image reconstruction or approved final art"
    rock_images, sand_images = build_textures()
    rock = pbr_material("CliffV2_PBR_Grey_Eroded_Stone", (0.5, 0.49, 0.46), 0.89, rock_images)
    sand = pbr_material("CliffV2_PBR_Tropical_Sandy_Infill", (0.8, 0.65, 0.42), 0.94, sand_images)
    lichen = pbr_material("CliffV2_PBR_Muted_Lichen_Color", (0.044, 0.095, 0.019),
                          0.98, vertex_color=True)
    verts, faces = mass_geometry()
    mass = mesh_object("RockV2_Continuous_Eroded_Cliff_Mass", verts, faces,
                       rock, collection, root, bevel=0.020, smooth=True, seed=1)
    mass["part"] = "single closed mass; five genuine carved V-clefts, not a stack of columns"
    shoulder_count = build_shoulders(rock, collection, root)
    verts, faces, cap_outline = sandy_cap_geometry()
    cap = mesh_object("SandV2_Small_Irregular_Summit_Infill", verts, faces,
                      sand, collection, root, smooth=True, seed=2)
    cap["part"] = "small summit infill only; no island-wide disk"
    bpy.context.view_layer.update()
    lichen_count, gravel_count = build_small_detail(rock, lichen, collection, root)
    shift, scale = fit_asset_dimensions(collection)
    meshes, lo, hi, vertices, triangles = evaluated_stats(collection)
    root["evaluated_triangles"] = triangles
    root["packed_texture_count"] = 5
    collision_note = "CliffV2_Collision_Placeholder_NOT_EXPORTED.json"
    note = bpy.data.texts.get(collision_note) or bpy.data.texts.new(collision_note)
    note.clear()
    note.write(json.dumps({
        "status": "annotation only, not a GLB object or active Rapier hull",
        "root": ROOT_NAME, "units": "metres; Blender Z up",
        "future_solid": "simplified hulls of main mass and major shoulders; not decorative cracks",
        "future_cap": "separate shared support surface required; current infill is decorative",
        "cap_outline_xy": [[(x-shift[0])*scale[0], (y-shift[1])*scale[1]] for x, y in cap_outline],
        "exclude": ["gravel", "lichen", "normal-map relief", "micro bevels"],
    }, indent=2))
    preview_setup(lo, hi)
    published = False
    if "artifacts" in globals():
        target = artifacts.file(name=PREVIEW_NAME, media_type="image/png")
        bpy.context.scene.render.filepath = str(target.path)
        bpy.ops.render.render(write_still=True)
        target.publish()
        published = True
    return {
        "asset": "cliff-v2", "blender_version": bpy.app.version_string,
        "root": ROOT_NAME, "reference": "reference-sheets-v2/12-cliff-module.png",
        "units": "metres; Blender Z up; standard GLB Y-up export",
        "mesh_objects": len(meshes), "evaluated_vertices": vertices,
        "evaluated_triangles": triangles, "evaluated_boundary_edges": 0,
        "evaluated_degenerate_triangles": 0,
        "bounds_min": [round(v, 4) for v in lo], "bounds_max": [round(v, 4) for v in hi],
        "dimensions_m": [round(v, 4) for v in hi-lo],
        "continuous_masses": 1, "real_oblique_clefts": len(CLEFTS),
        "unique_shoulders": shoulder_count, "small_lichen_films": lichen_count,
        "small_gravel": gravel_count,
        "packed_pbr_images": [image.name for image in (*rock_images, *sand_images)],
        "collision_annotation": collision_note+" (.blend text only; not exported)",
        "preview": PREVIEW_NAME if published else "registry absent; not rendered",
        "limits": ["Standalone sculptural master, not installed in gameplay.",
                   "Visual and actual GLB review required; structural checks are not art approval.",
                   "No macro vegetation, rig, terrain island, LOD or active collider."],
    }


result = main()
print(json.dumps(result, sort_keys=True))
