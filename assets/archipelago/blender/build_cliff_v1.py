"""Build a reference-led tropical fractured-cliff module in Blender 5.2.

Dedicated asset-study scene only. Editable solid rock pieces, metre scale, Z up.
Portable generated/packed PBR images: no network, no external texture paths,
no whole-island disk, no macro vegetation, no gameplay/collider modification.
The Scene Builder worker owns .blend and standard Y-up GLB export.
"""

import json
import math
import random

import bpy
import bmesh
import numpy as np
from mathutils import Vector


SEED = 271212
COLLECTION_NAME = "Cliff_V1_Editable_Module"
ROOT_NAME = "Cliff_V1_Origin_At_Coast_Base"
PREVIEW_NAME = "cliff-v1-eevee.png"
TRIANGLE_LIMIT = 100000
NOMINAL_SIZE_M = (8.0, 5.0, 7.0)
MOSS_MAX_CENTRE_DELTA_M = 0.15
MOSS_MAX_VERTICAL_SPAN_M = 0.18
random.seed(SEED)


def packed_image(name, pixels, non_color=False):
    image = bpy.data.images.new(name, width=pixels.shape[1],
                                height=pixels.shape[0], alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(np.asarray(pixels, dtype=np.float32).ravel())
    image.update()
    image.pack()
    return image


def rgba(rgb):
    return np.concatenate((np.clip(rgb, 0, 1),
                           np.ones((*rgb.shape[:2], 1), dtype=np.float32)), axis=2)


def hash_grid(x, y, seed=0):
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
    normals = np.stack((-dx*strength, -dy*strength, np.ones_like(dx)), axis=2)
    normals /= np.linalg.norm(normals, axis=2)[..., None]
    return packed_image(name, rgba(normals*0.5+0.5), True)


def build_textures():
    # The large visible forms are real rock meshes. These images add mineral
    # variation, grain and small fracture relief that survive ordinary GLB export.
    u, v = np.meshgrid(np.linspace(0, 1, 1024, endpoint=False),
                       np.linspace(0, 1, 1024, endpoint=False))
    broad = value_noise(u, v, 13, 6)
    middle = value_noise(u, v, 47, 8)
    fine = value_noise(u, v, 173, 13)
    grains = hash_grid(u*1024, v*1024, 31)
    # Sparse fine broken fissures, not closed Voronoi cells resembling scales.
    warped_u = u+0.022*np.sin(v*17)+0.011*np.sin(v*43)
    warped_v = v+0.018*np.sin(u*23)-0.008*np.sin(u*51)
    fracture_field = value_noise(warped_u, warped_v, 41, 43)
    fracture_mask = np.clip((value_noise(u, v, 11, 71)-0.56)*5, 0, 1)
    crack = np.exp(-((fracture_field-0.49)/0.010)**2)*fracture_mask
    strata = np.sin(v*math.tau*13+0.9*np.sin(u*27))
    warm_veins = np.maximum(0, np.sin(middle*23+broad*7))**16
    tone = 0.91+0.12*broad+0.065*middle+0.045*fine
    tone += 0.008*strata+0.030*(grains-0.5)-0.065*crack
    rock_rgb = tone[..., None]*np.array((0.510, 0.510, 0.480))
    rock_rgb += warm_veins[..., None]*np.array((0.027, 0.022, 0.012))
    rock_rgb += (broad-0.5)[..., None]*np.array((0.015, 0.012, -0.007))
    rock_base = packed_image("Cliff_Rock_BaseColor_Mineral_1024", rgba(rock_rgb))
    roughness = np.clip(0.85+0.055*fine+0.035*crack-0.035*warm_veins, 0.77, 0.98)
    rock_rough = packed_image("Cliff_Rock_Roughness_1024",
                              rgba(np.repeat(roughness[..., None], 3, axis=2)), True)
    relief = 0.035*middle+0.021*fine+0.004*strata-0.024*crack
    rock_normal = normal_image("Cliff_Rock_Fracture_Normal_1024", relief, 8.5)
    su, sv = np.meshgrid(np.linspace(0, 1, 512, endpoint=False),
                         np.linspace(0, 1, 512, endpoint=False))
    sand_patch = value_noise(su, sv, 13, 83)
    sand_fine = hash_grid(su*512, sv*512, 99)
    sand_grain = value_noise(su, sv, 129, 111)
    sand_tone = 0.93+0.12*sand_patch+0.04*(sand_fine-0.5)
    sand_rgb = sand_tone[..., None]*np.array((0.815, 0.677, 0.441))
    sand_rgb -= np.maximum(0, sand_fine-0.95)[..., None]*1.1
    sand_base = packed_image("Cliff_Sand_BaseColor_512", rgba(sand_rgb))
    sand_normal = normal_image("Cliff_Sand_FineGrain_Normal_512",
                               0.035*sand_grain+0.014*sand_fine, 3.2)
    return (rock_base, rock_rough, rock_normal), (sand_base, sand_normal)


def pbr_material(name, color, roughness, textures=None, vertex_color=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    if vertex_color:
        node = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name = "Color"
        mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    if textures:
        base = mat.node_tree.nodes.new("ShaderNodeTexImage")
        base.image = textures[0]
        base.name = "Packed portable base color"
        mat.node_tree.links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
        if len(textures) == 3:
            rough = mat.node_tree.nodes.new("ShaderNodeTexImage")
            rough.image = textures[1]
            rough.name = "Packed portable roughness"
            mat.node_tree.links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
        normal_tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        normal_tex.image = textures[-1]
        normal_tex.name = "Packed portable tangent normal"
        normal = mat.node_tree.nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value = 0.44 if len(textures) == 3 else 0.27
        mat.node_tree.links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
        mat.node_tree.links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def mesh_object(name, verts, faces, mat, collection, root, bevel=0,
                smooth=False, tint=(1, 1, 1), uv_offset=(0, 0)):
    mesh = bpy.data.meshes.new(name+"_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name="UVMap")
    colors = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
    mesh.color_attributes.active_color_index = 0
    for poly in mesh.polygons:
        poly.use_smooth = smooth
        normal = poly.normal
        for loop_id in poly.loop_indices:
            point = mesh.vertices[mesh.loops[loop_id].vertex_index].co
            # Box projection is real UV data, not an unexportable triplanar node.
            if abs(normal.z) > max(abs(normal.x), abs(normal.y)):
                coords = (point.x*0.27, point.y*0.27)
            elif abs(normal.x) > abs(normal.y):
                coords = (point.y*0.30, point.z*0.26)
            else:
                coords = (point.x*0.30, point.z*0.26)
            uv.data[loop_id].uv = (coords[0]+uv_offset[0], coords[1]+uv_offset[1])
            variation = 0.94+0.045*math.sin(point.x*9.1+point.y*7.4+point.z*3.7)
            colors.data[loop_id].color = (*[c*variation for c in tint], 1)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj["asset_role"] = "editable watertight cliff detail"
    if bevel:
        mod = obj.modifiers.new("Rounded chipped fracture edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(12)
        mod.harden_normals = True
    return obj


def clip_profile(profile, nx, ny, threshold, positive):
    """Convex XY clipping: both sides become independent closed rock volumes."""
    result = []
    for i, a in enumerate(profile):
        b = profile[(i+1) % len(profile)]
        da = a[0]*nx+a[1]*ny-threshold
        db = b[0]*nx+b[1]*ny-threshold
        inside_a = da >= 0 if positive else da <= 0
        inside_b = db >= 0 if positive else db <= 0
        if inside_a:
            result.append(a)
        if inside_a != inside_b:
            t = da/(da-db)
            result.append((a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t))
    return result


OUTLINE = ((-0.46, -0.50), (-0.04, -0.54), (0.34, -0.46),
           (0.51, -0.25), (0.53, 0.20), (0.30, 0.50),
           (-0.28, 0.48), (-0.51, 0.22), (-0.52, -0.22))


def rock_piece(name, centre, profile, lower, upper, whole_height,
               seed, rock, collection, root, taper=1.0, bevel=0.027):
    # Five control rings retain large planar faces but add actual ledges and
    # slanted fracture lips. Separate pieces each receive a bottom and top cap.
    rng = random.Random(seed)
    rings = (0.0, 0.08, 0.42, 0.88, 1.0)
    n = len(profile)
    jitter = [rng.uniform(-0.073, 0.073) for _ in profile]
    detail_scale = min(1.0, (upper-lower)/0.70,
                       max(math.hypot(x, y) for x, y in profile)/0.50)
    verts, faces = [], []
    cx, cy = centre
    for t in rings:
        base_z = lower+(upper-lower)*t
        whole_t = base_z/max(whole_height, 0.01)
        shift_x = (0.27*math.sin(seed*0.11)*whole_t+
                   0.12*math.sin(whole_t*5+seed*0.07)*whole_t)*detail_scale
        shift_y = (0.15*math.cos(seed*0.17)*whole_t+
                   0.085*math.sin(whole_t*4+seed*0.1)*whole_t)*detail_scale
        width_scale = taper+0.060*math.sin(whole_t*math.tau+seed*0.2)-0.035*whole_t
        twist = 0.043*math.sin(seed*0.13)*whole_t*detail_scale
        cosine, sine = math.cos(twist), math.sin(twist)
        for j, (x, y) in enumerate(profile):
            radial = 1+jitter[j]*math.sin(math.pi*t)
            radial += 0.026*math.sin(whole_t*9+x*3-y*2+seed*0.07)*detail_scale
            # Jagged fracture planes, shared deterministic offsets at both caps.
            cap_offset = 0.055*math.sin(x*2.7+y*4.1+seed*0.07)*detail_scale
            cap_offset += (0.10*math.sin(seed*0.19)*x+
                           0.075*math.cos(seed*0.23)*y)*detail_scale
            z = max(0.0, base_z+cap_offset)
            if lower == 0 and t == 0:
                z = 0.0
            px, py = x*width_scale*radial, y*width_scale*radial
            verts.append((cx+px*cosine-py*sine+shift_x,
                          cy+px*sine+py*cosine+shift_y, z))
    for ring in range(len(rings)-1):
        for j in range(n):
            a, b = ring*n+j, ring*n+(j+1) % n
            faces.append((a, b, b+n, a+n))
    faces.extend((tuple(range(n-1, -1, -1)),
                  tuple((len(rings)-1)*n+j for j in range(n))))
    obj = mesh_object(name, verts, faces, rock, collection, root, bevel=bevel,
                      uv_offset=(rng.uniform(-1, 1), rng.uniform(-1, 1)))
    obj["part"] = "solid fractured rock block; no open crack faces"
    obj["construction_height_m"] = upper-lower
    return obj


def build_columns(rock, collection, root):
    # Six summit cores; eight lower side/front buttresses. No central flat disk.
    specs = [
        (-1.72, 0.80, 2.30, 2.12, 6.72),
        (0.40, 0.93, 2.23, 2.12, 6.72),
        (1.93, 0.46, 1.97, 2.14, 6.69),
        (-1.66, -0.84, 2.05, 2.00, 6.70),
        (0.36, -0.89, 2.26, 2.04, 6.71),
        (1.92, -0.92, 1.80, 1.82, 6.65),
        (-3.00, -1.08, 1.67, 1.80, 4.22),
        (3.03, -0.48, 1.73, 1.84, 4.57),
        (-2.16, -1.78, 1.78, 1.46, 3.26),
        (-0.07, -1.78, 2.13, 1.46, 2.93),
        (2.16, -1.77, 2.03, 1.42, 4.03),
        (-3.02, 0.79, 1.70, 1.75, 4.98),
        (-1.34, 1.75, 1.80, 1.55, 4.76),
        (1.33, 1.67, 1.87, 1.60, 5.17),
    ]
    tops = []
    for index, (cx, cy, width, depth, h) in enumerate(specs):
        profile = [(x*width, y*depth) for x, y in OUTLINE]
        # Selected hero cores split lengthwise: geometry, not a drawn black line.
        profiles = [profile]
        if index in (0, 2, 4, 7, 10):
            angle = 0.40+index*0.217
            nx, ny = math.cos(angle), math.sin(angle)
            profiles = [clip_profile(profile, nx, ny, -0.014, False),
                        clip_profile(profile, nx, ny, 0.014, True)]
        lower_ratio = 0.235+0.090*(0.5+0.5*math.sin(index*0.71+0.3))
        upper_ratio = 0.590+0.125*(0.5+0.5*math.cos(index*1.21+0.1))
        cuts = (0, h*lower_ratio, h*upper_ratio, h)
        for vertical, part_profile in enumerate(profiles):
            for horizontal in range(3):
                lo = cuts[horizontal]+(0.014 if horizontal else 0)
                hi = cuts[horizontal+1]-(0.014 if horizontal < 2 else 0)
                rock_piece("Rock_Core_%02d_Fragment_%d_%d" % (index+1, vertical+1, horizontal+1),
                           (cx, cy), part_profile, lo, hi, h,
                           SEED+index*37, rock, collection, root)
        tops.append({"centre": (cx, cy), "width": width, "depth": depth,
                     "height": h, "summit": index < 6})
    return tops


def build_low_strata(rock, collection, root):
    # Discrete flatter sedimentary shelves under the columns, not an island base.
    slabs = [(-2.75, -1.55, 1.90, 1.38, 0.10, 0.61),
             (-2.48, -1.45, 1.57, 1.22, 0.66, 1.16),
             (-0.77, -1.90, 1.94, 1.00, 0.08, 0.50),
             (0.06, -1.93, 1.75, 1.08, 0.55, 0.98),
             (2.40, -1.66, 1.71, 1.44, 0.06, 0.59),
             (2.53, -1.49, 1.47, 1.29, 0.64, 1.20),
             (-3.15, 0.10, 1.51, 1.48, 0.02, 0.65),
             (3.01, 0.36, 1.67, 1.61, 0.04, 0.74),
             (-0.86, 1.82, 1.85, 1.18, 0.04, 0.47),
             (1.04, 1.91, 1.76, 1.18, 0.02, 0.55)]
    for index, (cx, cy, w, d, lo, hi) in enumerate(slabs):
        rock_piece("Stratification_Lower_Shelf_%02d" % (index+1), (cx, cy),
                   [(x*w, y*d) for x, y in OUTLINE], lo, hi, hi,
                   SEED+601+index*13, rock, collection, root, bevel=0.020)


def cap_geometry(outline, top_function, thickness, rings=4):
    """Closed thin sculpted upper surface; no coincident/open double plane."""
    cx = sum(p[0] for p in outline)/len(outline)
    cy = sum(p[1] for p in outline)/len(outline)
    n = len(outline)
    verts = [(cx, cy, top_function(cx, cy))]
    faces = []
    for ring in range(1, rings+1):
        scale = ring/rings
        for x, y in outline:
            px, py = cx+(x-cx)*scale, cy+(y-cy)*scale
            verts.append((px, py, top_function(px, py)))
    for j in range(n):
        faces.append((0, 1+j, 1+(j+1) % n))
    for ring in range(rings-1):
        a, b = 1+ring*n, 1+(ring+1)*n
        for j in range(n):
            nj = (j+1) % n
            faces.append((a+j, b+j, b+nj, a+nj))
    outer = 1+(rings-1)*n
    bottom = len(verts)
    for x, y in outline:
        verts.append((x, y, top_function(x, y)-thickness))
    for j in range(n):
        nj = (j+1) % n
        faces.append((outer+j, bottom+j, bottom+nj, outer+nj))
    faces.append(tuple(bottom+j for j in range(n-1, -1, -1)))
    return verts, faces


def build_cap(sand, collection, root):
    outline = []
    for j in range(24):
        angle = math.tau*j/24
        perturb = 1+0.045*math.sin(j*2.7)+0.021*math.cos(j*4.9)
        outline.append((-0.18+2.45*math.cos(angle)*perturb,
                        0.12+1.51*math.sin(angle)*perturb))
    def top(x, y):
        return 6.760+0.033*math.sin(x*1.4)+0.024*math.cos(y*2.1)+0.010*math.sin(x*7+y*5)
    verts, faces = cap_geometry(outline, top, 0.115, rings=5)
    cap = mesh_object("Top_Cap_Sandy_Infill_Closed", verts, faces,
                      sand, collection, root, smooth=True)
    cap["part"] = "small summit infill only; not a whole island terrain disk"
    cap["navigation_note"] = "Decorative cap: no gameplay collision inferred from this mesh."
    return outline, top


def surface_hit(x, y, height_hint=9.5):
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    hit, point, normal, face, obj, matrix = bpy.context.scene.ray_cast(
        depsgraph, Vector((x, y, height_hint)), Vector((0, 0, -1)), distance=12)
    if hit and obj is not None and obj.type == "MESH":
        return point, normal
    return None


def moss_patch(name, x, y, radius_x, radius_y, mat, collection, root):
    hit = surface_hit(x, y)
    if hit is None:
        return None
    point, _ = hit
    outline = []
    for j in range(18):
        angle = math.tau*j/18
        scallop = 0.82+0.17*math.sin(j*2.47+radius_x*8)**2
        outline.append((x+radius_x*math.cos(angle)*scallop,
                        y+radius_y*math.sin(angle)*scallop))
    # Every patch samples the actual mesh at its perimeter; unsupported edges
    # collapse inward instead of growing floating moss discs above fracture gaps.
    outline_points = []
    heights = []
    for px, py in outline:
        ground = surface_hit(px, py)
        if ground is None or abs(ground[0].z-point.z) > MOSS_MAX_CENTRE_DELTA_M:
            px, py = x+(px-x)*0.36, y+(py-y)*0.36
            ground = surface_hit(px, py)
        # The retry is a new sample, not proof of support. Never bridge a rock
        # ledge several metres below/above the centre and never invent a fallback
        # height: a rejected sample rejects this entire decorative patch.
        if ground is None or abs(ground[0].z-point.z) > MOSS_MAX_CENTRE_DELTA_M:
            return None
        outline_points.append((px, py))
        heights.append(ground[0].z)
    centre_z = point.z+0.030
    verts = [(x, y, centre_z)]
    for j, (px, py) in enumerate(outline_points):
        verts.append((px, py, heights[j]+0.007+0.008*math.sin(j*3.1)**2))
    bottom = len(verts)
    for j, (px, py) in enumerate(outline_points):
        verts.append((px, py, heights[j]-0.020))
    if max(p[2] for p in verts)-min(p[2] for p in verts) > MOSS_MAX_VERTICAL_SPAN_M:
        return None
    n = len(outline_points)
    faces = [(0, j+1, (j+1) % n+1) for j in range(n)]
    for j in range(n):
        nj = (j+1) % n
        faces.append((j+1, bottom+j, bottom+nj, nj+1))
    faces.append(tuple(bottom+j for j in range(n-1, -1, -1)))
    tint = (0.16+random.uniform(0, 0.04), 0.30+random.uniform(0, 0.045),
            0.035+random.uniform(0, 0.026))
    patch = mesh_object(name, verts, faces, mat, collection, root,
                        smooth=True, tint=tint)
    patch["part"] = "small grounded moss/lichen mat; no macro plant"
    return patch


def pebble(name, x, y, radius, rock, collection, root):
    hit = surface_hit(x, y)
    if hit is None:
        return None
    point, _ = hit
    profile = [(px*radius*1.9, py*radius*1.65) for px, py in OUTLINE]
    return rock_piece(name, (x, y), profile, max(0, point.z-radius*0.10),
                      point.z+radius*0.92, point.z+radius,
                      SEED+len(collection.objects)*3, rock, collection, root,
                      bevel=min(0.014, radius*0.09))


def build_surface_detail(tops, moss, rock, collection, root):
    moss_count, pebble_count = 0, 0
    # Distributed ledge cover stays compact; the eventual vegetation is separate.
    for index, spec in enumerate(tops):
        cx, cy = spec["centre"]
        positions = [(cx-spec["width"]*0.24, cy-spec["depth"]*0.25),
                     (cx+spec["width"]*0.25, cy+spec["depth"]*0.15)]
        if not spec["summit"]:
            positions.append((cx, cy-0.13))
        for part, (x, y) in enumerate(positions):
            obj = moss_patch("Moss_Ledge_%02d_Patch_%d" % (index+1, part+1),
                             x, y, random.uniform(0.19, 0.38),
                             random.uniform(0.12, 0.24), moss, collection, root)
            moss_count += int(obj is not None)
    # A mostly empty sand centre and organic edge moss preserve a readable cap.
    for j in range(18):
        angle = math.tau*j/18
        x, y = -0.18+2.18*math.cos(angle), 0.12+1.27*math.sin(angle)
        obj = moss_patch("Moss_Summit_Rim_%02d" % (j+1), x, y,
                         random.uniform(0.15, 0.30), random.uniform(0.12, 0.22),
                         moss, collection, root)
        moss_count += int(obj is not None)
    for j in range(40):
        angle = random.uniform(0, math.tau)
        r = math.sqrt(random.uniform(0.13, 1.0))
        x = -0.18+2.33*math.cos(angle)*r
        y = 0.12+1.39*math.sin(angle)*r
        obj = pebble("Gravel_Summit_%02d" % (j+1), x, y,
                     random.uniform(0.028, 0.067), rock, collection, root)
        pebble_count += int(obj is not None)
    # Small grounded chips sit on lower shelves; they do not hide the cliff body.
    for j, spec in enumerate(tops[6:]):
        cx, cy = spec["centre"]
        obj = pebble("Chip_Ledge_%02d" % (j+1), cx+0.28, cy+0.15,
                     random.uniform(0.085, 0.145), rock, collection, root)
        pebble_count += int(obj is not None)
    for j, (x, y, radius) in enumerate(((-1.89, 1.02, 0.22), (0.73, 1.43, 0.20))):
        obj = pebble("Summit_Rim_Outcrop_%02d" % (j+1), x, y, radius,
                     rock, collection, root)
        pebble_count += int(obj is not None)
    return moss_count, pebble_count


def register_collision_notes(outline, top, root):
    # A Blender Text datablock is editable and survives in .blend, but is not a
    # scene entity or a GLB mesh. These are proposals, never active Rapier hulls.
    name = "Cliff_V1_Collision_Placeholders_NOT_EXPORTED.json"
    old = bpy.data.texts.get(name)
    if old:
        bpy.data.texts.remove(old)
    note = bpy.data.texts.new(name)
    data = {
        "status": "placeholder only; not exported as geometry or installed in gameplay",
        "units": "metres; Blender Z up",
        "asset_root": root.name,
        "solid_surface_proposal": "derive simplified convex hulls per rock core, not per decorative fracture",
        "top_cap_proposal": {"outline_xy": outline,
                              "sampled_top_z": [top(x, y) for x, y in outline],
                              "continuous_traversal": "unverified; create a separate shared collision surface"},
        "coast_base_z": 0.0,
        "excluded": ["moss", "lichen", "gravel", "small bevels", "PBR normal-map relief"],
    }
    note.write(json.dumps(data, indent=2, sort_keys=True))
    return name


def evaluated_stats(collection):
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    meshes = [obj for obj in collection.objects if obj.type == "MESH"]
    points = []
    triangles, vertices, open_edges = 0, 0, 0
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        vertices += len(mesh.vertices)
        points.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
        # Boundary checks run on the actual bevel-evaluated mesh, not an estimate.
        bm = bmesh.new()
        bm.from_mesh(mesh)
        open_edges += sum(1 for edge in bm.edges if edge.is_boundary or not edge.is_manifold)
        bm.free()
        evaluated.to_mesh_clear()
    if not points or not all(math.isfinite(v) for p in points for v in p):
        raise RuntimeError("Cliff bounds are empty or non-finite")
    minimum = Vector(tuple(min(p[a] for p in points) for a in range(3)))
    maximum = Vector(tuple(max(p[a] for p in points) for a in range(3)))
    if any(maximum[a] <= minimum[a] for a in range(3)):
        raise RuntimeError("Cliff has a zero or negative extent")
    if triangles > TRIANGLE_LIMIT:
        raise RuntimeError("Cliff exceeds 100k evaluated triangles: %d" % triangles)
    if open_edges:
        raise RuntimeError("Cliff contains non-closed evaluated mesh edges: %d" % open_edges)
    return meshes, minimum, maximum, vertices, triangles, open_edges


def aim(obj, point):
    obj.rotation_euler = (Vector(point)-obj.location).to_track_quat("-Z", "Y").to_euler()


def make_light(name, kind, position, energy, color, target):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "SUN":
        data.angle = math.radians(12)
    else:
        data.shadow_soft_size = 3.0
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = position
    obj["preview_only"] = True
    aim(obj, target)
    return obj


def setup_preview(minimum, maximum):
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 650
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if hasattr(scene.render.image_settings, "media_type"):
        scene.render.image_settings.media_type = "IMAGE"
    scene.render.film_transparent = False
    if hasattr(scene, "eevee") and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 48
    view_enums = scene.view_settings.bl_rna.properties["view_transform"].enum_items
    if "Khronos PBR Neutral" in {item.identifier for item in view_enums}:
        scene.view_settings.view_transform = "Khronos PBR Neutral"
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new("Cliff_V1_White_Studio_Ambient")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.89, 0.93, 0.98, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55
    scene.world = world
    centre = (minimum+maximum)*0.5
    camera_data = bpy.data.cameras.new("Cliff_V1_Delivery_ThreeQuarter_Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max((maximum.z-minimum.z)*900/650,
                                  maximum.x-minimum.x)*1.17
    camera = bpy.data.objects.new("Cliff_V1_Delivery_ThreeQuarter_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = centre+Vector((11.0, -16.0, 9.2))
    camera["preview_only"] = True
    aim(camera, centre)
    scene.camera = camera
    make_light("Cliff_V1_Key_Sun_Warm", "SUN", (-8, -10, 14), 2.15,
               (1.0, 0.88, 0.71), centre)
    make_light("Cliff_V1_Fill_Cool_Point", "POINT", (5, -6, 10), 1050,
               (0.71, 0.84, 1.0), centre)
    make_light("Cliff_V1_Rim_Sun", "SUN", (2, 8, 13), 0.70,
               (1.0, 0.96, 0.85), centre)
    scene.frame_set(1)
    bpy.context.view_layer.update()


def main():
    # Root orchestrator must select a new dedicated asset project before running.
    # The code owns only this collection on re-execution; no external scene wipe.
    existing = bpy.data.collections.get(COLLECTION_NAME)
    if existing is not None:
        owned_meshes = [obj.data for obj in existing.all_objects if obj.type == "MESH"]
        for obj in list(existing.all_objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(existing)
        for mesh in owned_meshes:
            if mesh.users == 0:
                bpy.data.meshes.remove(mesh)
    # Revisions must not accumulate the preceding preview's sun/fill/camera or
    # orphaned packed images; only named resources belonging to this asset.
    for obj in list(bpy.data.objects):
        if obj.get("preview_only") and obj.name.startswith("Cliff_V1_"):
            bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        if mat.name.startswith("Cliff_PBR_") and mat.users == 0:
            bpy.data.materials.remove(mat)
    for image in list(bpy.data.images):
        if image.name.startswith(("Cliff_Rock_", "Cliff_Sand_")) and image.users == 0:
            bpy.data.images.remove(image)
    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(ROOT_NAME, None)
    collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.55
    root["asset_role"] = "modular tall tropical cliff face, not a complete island"
    root["reference"] = "reference-sheets-v1/12-cliff-module.png"
    root["units"] = "metres; X width, Y depth, Z up"
    root["nominal_size_m"] = list(NOMINAL_SIZE_M)
    root["origin_contract"] = "coast-base datum at z=0; unrotated; exporter handles Y-up"
    root["fidelity_note"] = "authored reference-led prototype, not an image reconstruction"
    rock_textures, sand_textures = build_textures()
    rock = pbr_material("Cliff_PBR_WarmGrey_Fractured_Stone", (0.52, 0.50, 0.46),
                        0.87, rock_textures)
    sand = pbr_material("Cliff_PBR_Pale_Tropical_Sand", (0.81, 0.68, 0.44),
                        0.91, sand_textures)
    moss = pbr_material("Cliff_PBR_Moss_Lichen_VertexColor", (0.18, 0.32, 0.045),
                        0.95, vertex_color=True)
    tops = build_columns(rock, collection, root)
    build_low_strata(rock, collection, root)
    outline, top = build_cap(sand, collection, root)
    bpy.context.view_layer.update()
    moss_count, pebble_count = build_surface_detail(tops, moss, rock, collection, root)
    collision_note = register_collision_notes(outline, top, root)
    meshes, minimum, maximum, vertices, triangles, open_edges = evaluated_stats(collection)
    root["evaluated_triangles"] = triangles
    root["evaluated_closed_boundary_edges"] = open_edges
    root["packed_pbr_image_count"] = 5
    setup_preview(minimum, maximum)
    preview_published = False
    if "artifacts" in globals():
        target = artifacts.file(name=PREVIEW_NAME, media_type="image/png")
        bpy.context.scene.render.filepath = str(target.path)
        bpy.ops.render.render(write_still=True)
        target.publish()
        preview_published = True
    return {
        "asset": "cliff-v1",
        "blender_version": bpy.app.version_string,
        "root": root.name,
        "units": "metres; Blender Z-up; standard worker GLB Y-up conversion",
        "mesh_objects": len(meshes),
        "evaluated_vertices": vertices,
        "evaluated_triangles": triangles,
        "evaluated_nonmanifold_or_boundary_edges": open_edges,
        "bounds_min": [round(v, 4) for v in minimum],
        "bounds_max": [round(v, 4) for v in maximum],
        "dimensions_m": [round(v, 4) for v in maximum-minimum],
        "rock_cores": len(tops),
        "grounded_moss_patches": moss_count,
        "moss_sampling_limits_m": {"max_delta_from_centre": MOSS_MAX_CENTRE_DELTA_M,
                                   "max_mesh_vertical_span": MOSS_MAX_VERTICAL_SPAN_M,
                                   "invalid_retry": "reject entire patch; no fallback height"},
        "grounded_small_stones": pebble_count,
        "packed_pbr_images": [image.name for image in (*rock_textures, *sand_textures)],
        "collision_placeholders": {"storage": "Blender Text datablock only; not a GLB entity",
                                   "name": collision_note, "active_in_game": False},
        "preview": PREVIEW_NAME if preview_published else "artifacts registry absent; not rendered",
        "semantic_parts": [obj.name for obj in meshes],
        "limits": ["Standalone module, no assembled island or gameplay changes.",
                   "No macro vegetation or rig; cap traversal is not physics proof.",
                   "Reference-led authored approximation; visual and GLB inspection still required."],
    }


result = main()
print(json.dumps(result, sort_keys=True))
