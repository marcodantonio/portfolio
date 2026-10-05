"""Reference-driven timber suspension-bridge prototype for Blender 5.2.

Run in a dedicated Scene Builder project. No network or external texture paths.
The worker owns .blend / Y-up GLB export; this script only publishes its preview.
Blender convention: metres, X length, Y deck width, Z up. Root origin is the
centre of the walking surface, not the lowest point of the decorative posts.
This is an authored approximation of the reference, not an image reconstruction.
"""

import json
import math
import random

import bpy
import bmesh
import numpy as np
from mathutils import Vector


# Editable construction controls; the six-metre module is not mounted in-game.
LENGTH = 6.0
DECK_WIDTH = 3.6
SAG = 0.35
PLANK_COUNT = 24
PLANK_THICKNESS = 0.24
POST_X = (-2.79, 0.0, 2.79)
POST_Y = 1.60
POST_RADIUS = 0.147
ROPE_LEVELS = (0.64, 1.22)
SEED = 27
COLLECTION_NAME = "Bridge_V1"
ASSET_ID = "archipelago_timber_bridge_v1"
PREVIEW_NAME = "bridge-v1-preview.png"


# Re-execution replaces only this explicitly owned collection.
existing = bpy.data.collections.get(COLLECTION_NAME)
if existing is not None:
    for owned in list(existing.all_objects):
        bpy.data.objects.remove(owned, do_unlink=True)
    bpy.data.collections.remove(existing)
collection = bpy.data.collections.new(COLLECTION_NAME)
bpy.context.scene.collection.children.link(collection)
root = bpy.data.objects.new("BridgeAsset__walking_surface_pivot", None)
collection.objects.link(root)
root.empty_display_type = "PLAIN_AXES"
root.empty_display_size = 0.45
root["asset_id"] = ASSET_ID
root["units"] = "metres"
root["blender_axes"] = "X length; Y deck width; Z up"
root["glb_axes"] = "standard exporter conversion to Y up; do not pre-rotate"
root["deck_length_m"] = LENGTH
root["deck_width_m"] = DECK_WIDTH
root["deck_centre_top_z_m"] = 0.0
root["end_rise_m"] = SAG
root["navigation_note"] = "Decorative asset only; no gameplay collider changes."
root["fidelity_note"] = "Reference-led authored prototype, not image-identical."


def height(x):
    """Continuous parabola: centre top=0; both deck ends=+0.35m."""
    return SAG * (2.0 * x / LENGTH) ** 2


def packed_image(name, pixels, non_color=False):
    image = bpy.data.images.new(name, width=pixels.shape[1],
                                height=pixels.shape[0], alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(np.asarray(pixels, dtype=np.float32).ravel())
    image.update()
    image.pack()
    return image


def image_rgba(rgb):
    alpha = np.ones((*rgb.shape[:2], 1), dtype=np.float32)
    return np.concatenate((np.clip(rgb, 0, 1), alpha), axis=2)


# These are actual generated, packed image textures, not Blender-only shaders.
# Grain runs along U; deck boards rotate their UVs to put U along their length.
tex_w, tex_h = 1024, 512
u, v = np.meshgrid(np.linspace(0, 1, tex_w, endpoint=False),
                   np.linspace(0, 1, tex_h, endpoint=False))
flow = v + 0.011 * np.sin(u * 13.0 + v * 8.0)
flow += 0.006 * np.sin(u * 35.0 - v * 17.0)
grain = np.sin(flow * math.tau * 35.0)
grain += 0.45 * np.sin(flow * math.tau * 83.0 + u * 4.0)
grain += 0.18 * np.sin(flow * math.tau * 173.0 - u * 11.0)
knot_dist = np.sqrt(((u - 0.57) * 1.25) ** 2 + ((v - 0.61) * 5.0) ** 2)
knot = np.sin(knot_dist * 55.0) * np.exp(-knot_dist * 8.5)
noise = np.sin(u * 389.0 + v * 977.0) * np.sin(v * 723.0 - u * 181.0)
tone = 0.94 + 0.040 * grain + 0.035 * knot + 0.011 * noise
wood_rgb = np.stack((0.76 * tone, 0.425 * tone, 0.175 * tone), axis=2)
wood_rgb += (0.018 * np.sin(flow * 25.0))[..., None]
wood_base = packed_image("Wood__honey_grain_basecolor_1024", image_rgba(wood_rgb))
rough = np.clip(0.68 + 0.032 * grain + 0.018 * noise, 0.54, 0.79)
wood_rough = packed_image("Wood__grain_roughness_1024",
                          image_rgba(np.repeat(rough[..., None], 3, axis=2)), True)
relief = 0.035 * grain + 0.018 * knot + 0.004 * noise
dy, dx = np.gradient(relief)
normal = np.stack((-dx * 13.0, -dy * 13.0, np.ones_like(dx)), axis=2)
normal /= np.linalg.norm(normal, axis=2)[..., None]
wood_normal = packed_image("Wood__carved_fibre_normal_1024",
                           image_rgba(normal * 0.5 + 0.5), True)
ru, rv = np.meshgrid(np.linspace(0, 1, 256, endpoint=False),
                     np.linspace(0, 1, 256, endpoint=False))
fiber = 0.94 + 0.04 * np.sin(ru * math.tau * 28 + rv * 5)
fiber += 0.026 * np.sin(rv * math.tau * 16 - ru * 21)
rope_rgb = fiber[..., None] * np.array((0.79, 0.655, 0.44))
rope_base = packed_image("Rope__hemp_fibres_256", image_rgba(rope_rgb))


def material(name, color, roughness, metallic=0.0, base=None, normal=None,
             rough_map=None, use_vertex_color=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1.0)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if base is not None:
        texture = nodes.new("ShaderNodeTexImage")
        texture.name = "Packed portable base color"
        texture.image = base
        mat.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    elif use_vertex_color:
        color_node = nodes.new("ShaderNodeVertexColor")
        color_node.layer_name = "Color"
        mat.node_tree.links.new(color_node.outputs["Color"], bsdf.inputs["Base Color"])
    if rough_map is not None:
        texture = nodes.new("ShaderNodeTexImage")
        texture.name = "Packed portable roughness"
        texture.image = rough_map
        mat.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Roughness"])
    if normal is not None:
        texture = nodes.new("ShaderNodeTexImage")
        texture.name = "Packed portable tangent normal"
        texture.image = normal
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.inputs["Strength"].default_value = 0.42
        mat.node_tree.links.new(texture.outputs["Color"], normal_map.inputs["Color"])
        mat.node_tree.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


WOOD = material("Timber__warm_honey_PBR", (0.62, 0.31, 0.10), 0.69,
                base=wood_base, normal=wood_normal, rough_map=wood_rough)
END_WOOD = material("Timber__cut_endgrain_vertexcolor", (0.60, 0.32, 0.12),
                    0.79, use_vertex_color=True)
GROOVE = material("Timber__recessed_growth_rings", (0.23, 0.095, 0.032), 0.88)
ROPE = material("Hemp__braided_fibres_PBR", (0.69, 0.52, 0.31), 0.94,
                base=rope_base)
IRON = material("Iron__blue_black_forged", (0.075, 0.092, 0.11), 0.47, 0.78)
OXIDE = material("Iron__worn_oxide_accents", (0.25, 0.115, 0.042), 0.84, 0.30)


def mesh_object(name, verts, faces, mat, uv=None, smooth=False,
                vertex_tint=(1.0, 1.0, 1.0)):
    mesh = bpy.data.meshes.new(name + "__mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    # Recalculate winding without context-sensitive object creation operators.
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    if uv is not None:
        layer = mesh.uv_layers.new(name="UVMap")
        for poly in mesh.polygons:
            for loop_index in poly.loop_indices:
                point = mesh.vertices[mesh.loops[loop_index].vertex_index].co
                layer.data[loop_index].uv = uv(point, poly.normal)
    colors = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
    mesh.color_attributes.active_color_index = 0
    for index, loop in enumerate(mesh.loops):
        point = mesh.vertices[loop.vertex_index].co
        subtle = 0.965 + 0.024 * math.sin(point.x * 9.7 + point.y * 2.3 + point.z)
        colors.data[index].color = (*[channel * subtle for channel in vertex_tint], 1.0)
    for poly in mesh.polygons:
        poly.use_smooth = smooth and len(poly.vertices) == 4
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj["asset_id"] = ASSET_ID
    return obj


def rounded_profile(width, depth, bevel, segments=3):
    a, b = width / 2, depth / 2
    radius = min(bevel, a * 0.42, b * 0.42)
    result = []
    for cx, cy, start in ((a-radius, b-radius, 0),
                           (-a+radius, b-radius, 90),
                           (-a+radius, -b+radius, 180),
                           (a-radius, -b+radius, 270)):
        for j in range(segments + 1):
            angle = math.radians(start + 90 * j / segments)
            result.append((cx + radius * math.cos(angle),
                           cy + radius * math.sin(angle)))
    return result


def sweep(name, centres, profile, mat, across=(0, 1, 0), uv_scale=1.0,
          smooth=True, tint=(1, 1, 1)):
    points = [Vector(p) for p in centres]
    verts, faces = [], []
    ref = Vector(across)
    n = len(profile)
    distance = [0.0]
    for i in range(1, len(points)):
        distance.append(distance[-1] + (points[i]-points[i-1]).length)
    uv_vertex = []
    for i, point in enumerate(points):
        prev = points[max(0, i-1)]
        nex = points[min(len(points)-1, i+1)]
        tangent = (nex-prev).normalized()
        cross = (ref - tangent * ref.dot(tangent)).normalized()
        up = tangent.cross(cross).normalized()
        for j, (a, b) in enumerate(profile):
            verts.append(tuple(point + cross * a + up * b))
            uv_vertex.append((distance[i] * uv_scale, j / n))
    for i in range(len(points)-1):
        for j in range(n):
            a, b = i*n+j, i*n+(j+1) % n
            faces.append((a, b, b+n, a+n))
    faces.append(tuple(range(n-1, -1, -1)))
    faces.append(tuple((len(points)-1)*n+j for j in range(n)))
    obj = mesh_object(name, verts, faces, mat, smooth=smooth, vertex_tint=tint)
    # Set UV by source vertex after face-winding recalculation.
    layer = obj.data.uv_layers.new(name="UVMap")
    pa = [p[0] for p in profile]
    pb = [p[1] for p in profile]
    for poly in obj.data.polygons:
        profile_indices = {obj.data.loops[k].vertex_index % n for k in poly.loop_indices}
        closes_seam = len(poly.vertices) == 4 and 0 in profile_indices and n-1 in profile_indices
        for k in poly.loop_indices:
            index = obj.data.loops[k].vertex_index
            section_index = index % n
            if len(poly.vertices) > 4:
                a, b = profile[section_index]
                layer.data[k].uv = ((a-min(pa)) / max(max(pa)-min(pa), 0.001),
                                    (b-min(pb)) / max(max(pb)-min(pb), 0.001))
            else:
                uv = uv_vertex[index]
                layer.data[k].uv = (uv[0], 1.0 if closes_seam and section_index == 0 else uv[1])
    return obj


def tube(name, centres, radius, mat, sides=6, uv_scale=4):
    profile = [(radius * math.cos(j * math.tau / sides),
                radius * math.sin(j * math.tau / sides)) for j in range(sides)]
    points = [Vector(p) for p in centres]
    tangent = points[-1] - points[0]
    across = (0, 0, 1) if abs(tangent.normalized().z) < 0.87 else (0, 1, 0)
    return sweep(name, points, profile, mat, across=across, uv_scale=uv_scale)


def box(name, centre, dimensions, mat, bevel=0.02, grain_axis="X"):
    x, y, z = (v / 2 for v in dimensions)
    verts = [(-x,-y,-z), (x,-y,-z), (x,y,-z), (-x,y,-z),
             (-x,-y,z), (x,-y,z), (x,y,z), (-x,y,z)]
    faces = [(0,3,2,1), (4,5,6,7), (0,1,5,4),
             (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    def uv(p, normal):
        if grain_axis == "Y":
            return (p.y / max(dimensions[1], 0.001) + 0.5,
                    (p.x if abs(normal.z) > 0.7 else p.z) * 2 + 0.5)
        return (p.x / max(dimensions[0], 0.001) + 0.5,
                (p.y if abs(normal.z) > 0.7 else p.z) * 2 + 0.5)
    obj = mesh_object(name, verts, faces, mat, uv=uv)
    obj.location = centre
    if bevel > 0:
        mod = obj.modifiers.new("Hand softened forged or carved edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = "ANGLE"
    return obj


def cylinder_mesh(name, radius, depth, sides, mat):
    verts = []
    for z in (-depth / 2, depth / 2):
        verts.extend((radius*math.cos(math.tau*j/sides),
                      radius*math.sin(math.tau*j/sides), z) for j in range(sides))
    faces = [(j, (j+1) % sides, (j+1) % sides+sides, j+sides) for j in range(sides)]
    faces += [tuple(range(sides-1, -1, -1)), tuple(range(sides, sides*2))]
    return mesh_object(name, verts, faces, mat, smooth=True)


# Shared mesh data for the small forged fasteners: dozens of instances, one mesh.
bolt_source = cylinder_mesh("Fastener__shared_hex_head", 0.027, 0.026, 6, IRON)
washer_source = cylinder_mesh("Fastener__shared_round_washer", 0.039, 0.009, 12, IRON)
bolt_source.hide_render = True
bolt_source.hide_viewport = True
washer_source.hide_render = True
washer_source.hide_viewport = True


def linked_fastener(name, point, direction=(0, 0, 1)):
    direction = Vector(direction).normalized()
    for source, suffix, offset in ((washer_source, "washer", 0.0),
                                  (bolt_source, "head", 0.010)):
        obj = bpy.data.objects.new(name + "__" + suffix, source.data)
        collection.objects.link(obj)
        obj.parent = root
        obj.location = Vector(point) + direction * offset
        obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
        obj["asset_id"] = ASSET_ID


# 24 individually authored softly rounded, gently bowed planks, not a flat slab.
random.seed(SEED)
pitch = LENGTH / PLANK_COUNT
for index in range(PLANK_COUNT):
    x = -LENGTH/2 + (index + 0.5) * pitch
    width = pitch - 0.017 - random.uniform(0, 0.009)
    centres = []
    phase = random.uniform(0, math.tau)
    for j in range(9):
        y = -DECK_WIDTH/2 + DECK_WIDTH*j/8
        bow = 0.007 * (math.cos(y * 1.9 + phase) - math.cos(phase))
        wear = 0.004 * (math.sin(y * 7.0 + phase) - math.sin(phase))
        centres.append((x + 0.006*math.sin(y*1.7+phase), y,
                        height(x) - PLANK_THICKNESS/2 + bow + wear))
    plank = sweep("Deck__plank_%02d" % (index+1), centres,
                  rounded_profile(width, PLANK_THICKNESS, 0.019), WOOD,
                  across=(1, 0, 0), uv_scale=0.35)
    plank["part"] = "replaceable crosswise deck plank"
    for side in (-1, 1):
        linked_fastener("Deck_pin_%02d_%s" % (index+1, "L" if side < 0 else "R"),
                        (x, side * 1.39, height(x) + 0.008))
    # Sparse real sculpted fissures complement the embedded grain normal map.
    if index % 4 == 1:
        y0 = random.uniform(-1.43, -0.75)
        path = []
        for j in range(6):
            y = y0+j*0.25
            surface_z = height(x) + 0.007*(math.cos(y*1.9+phase)-math.cos(phase))
            surface_z += 0.004*(math.sin(y*7.0+phase)-math.sin(phase))
            path.append((x+0.006*math.sin(y*1.7+phase)+width*0.23+
                         0.005*math.sin(j*1.4), y, surface_z+0.0004))
        tube("Deck__fine_fissure_%02d" % index, path, 0.0019, GROOVE, sides=4)


# Two thick uninterrupted curved bearer beams and transverse underside joists.
for side in (-1, 1):
    centres = [(x, side*1.49, height(x)-0.36)
               for x in np.linspace(-LENGTH/2+0.04, LENGTH/2-0.04, 49)]
    beam = sweep("Structure__curved_%s_bearer" % ("left" if side < 0 else "right"),
                 centres, rounded_profile(0.25, 0.35, 0.024), WOOD,
                 uv_scale=0.24)
    beam["part"] = "continuous curved load bearer"
for index, x in enumerate((-2.72, -1.65, -0.55, 0.55, 1.65, 2.72)):
    box("Structure__cross_joist_%02d" % index, (x, 0, height(x)-0.29),
        (0.18, 3.44, 0.20), WOOD, grain_axis="Y")


def post(x, side, index):
    y = side * POST_Y
    bottom = height(x) - 0.65
    top = height(x) + 1.46
    rings = [(bottom, 0.128), (bottom+0.035, POST_RADIUS),
             (bottom+0.38, POST_RADIUS*1.025), (top-0.06, POST_RADIUS*0.97),
             (top-0.022, POST_RADIUS*0.92), (top, POST_RADIUS*0.86)]
    sides = 16
    verts, faces = [], []
    for r, (z, radius) in enumerate(rings):
        for j in range(sides):
            angle = math.tau*j/sides
            irregular = 1.0 + 0.024 * math.sin(j*3.7+index)
            verts.append((x+radius*irregular*math.cos(angle),
                          y+radius*irregular*math.sin(angle), z))
    for ring in range(len(rings)-1):
        for j in range(sides):
            a, b = ring*sides+j, ring*sides+(j+1) % sides
            faces.append((a, b, b+sides, a+sides))
    faces += [tuple(range(sides-1, -1, -1)),
              tuple((len(rings)-1)*sides+j for j in range(sides))]
    obj = mesh_object("Post__%s_%02d_handcarved" % ("left" if side < 0 else "right", index),
                      verts, faces, WOOD, smooth=True,
                      uv=lambda p, n: ((p.z-bottom)*0.55,
                                        math.atan2(p.y-y, p.x-x)/math.tau+0.5))
    obj["part"] = "hand-carved round timber post; softened end bevels"
    obj.data.materials.append(END_WOOD)
    for poly in obj.data.polygons:
        if len(poly.vertices) > 4:
            poly.material_index = 1
            poly.use_smooth = False
            for loop_id in poly.loop_indices:
                obj.data.color_attributes["Color"].data[loop_id].color = (0.69, 0.36, 0.13, 1)
    # Actual recessed-looking end growth rings, not a flat endcap decal.
    for ring_index, radius in enumerate((0.030, 0.058, 0.086, 0.111)):
        points = []
        for j in range(33):
            angle = math.tau*j/32
            r = radius * (1+0.045*math.sin(angle*3+index))
            points.append((x+r*math.cos(angle), y+r*math.sin(angle), top+0.0003))
        tube("Endgrain__post_%02d_%s_ring_%02d" % (index, side, ring_index),
             points, 0.0017, GROOVE, sides=4, uv_scale=1)
    for crack_index, angle in enumerate((0.25+index*0.4, 2.2+index*0.15)):
        points = [(x+radius*math.cos(angle+0.04*j),
                   y+radius*math.sin(angle+0.04*j), top+0.001)
                  for j, radius in enumerate((0.004, 0.032, 0.074, 0.123))]
        tube("Endgrain__post_%02d_%s_split_%02d" % (index, side, crack_index),
             points, 0.0019, GROOVE, sides=4)
    # An outward forged bracket and its two visible washer/head assemblies.
    plate = box("Iron__post_%02d_%s_anchor_plate" % (index, side),
                (x, y+side*0.145, height(x)-0.10), (0.21, 0.020, 0.35), IRON, 0.018)
    plate["part"] = "forged connection plate"
    for dz in (-0.108, 0.108):
        linked_fastener("Anchor_%02d_%s_%s" % (index, side, dz),
                        (x, y+side*0.161, height(x)-0.10+dz), (0, side, 0))
    # Thin worn orange iron edge inset; no random freestanding decoration.
    box("Iron__post_%02d_%s_oxide_edge" % (index, side),
        (x+0.085, y+side*0.157, height(x)-0.10), (0.012, 0.005, 0.29), OXIDE, 0.003)
    return top


for side in (-1, 1):
    for index, x in enumerate(POST_X):
        post(x, side, index)
        if index != 1:
            inward_x = x - math.copysign(0.63, x)
            tube("Structure__diagonal_brace_%s_%s" % (side, index),
                 [(x, side*1.49, height(x)-0.48),
                  (inward_x, side*1.49, height(inward_x)-0.20)],
                 0.086, WOOD, sides=8, uv_scale=1.3)
    # Metal beam straps join six posts to curved timber; pins are actual meshes.
    for index, x in enumerate(POST_X):
        box("Iron__bearer_strap_%s_%s" % (side, index),
            (x, side*1.629, height(x)-0.37), (0.29, 0.023, 0.16), IRON, 0.012)
        for dx in (-0.095, 0.095):
            linked_fastener("Bearer_pin_%s_%s_%s" % (side, index, dx),
                            (x+dx, side*1.647, height(x)-0.37), (0, side, 0))


def braided_rope(name, centres, turns, braid_radius=0.025, strand_radius=0.018):
    points = [Vector(p) for p in centres]
    for strand in range(3):
        strand_points = []
        for i, p in enumerate(points):
            tangent = (points[min(len(points)-1, i+1)] -
                       points[max(0, i-1)]).normalized()
            ref = Vector((0, 0, 1))
            if abs(tangent.dot(ref)) > 0.92:
                ref = Vector((0, 1, 0))
            u_axis = tangent.cross(ref).normalized()
            v_axis = tangent.cross(u_axis).normalized()
            angle = math.tau*(turns*i/(len(points)-1) + strand/3)
            strand_points.append(tuple(p + braid_radius*(u_axis*math.cos(angle)+
                                                          v_axis*math.sin(angle))))
        strand_obj = tube(name+"__strand_%d" % strand, strand_points,
                          strand_radius, ROPE, sides=6, uv_scale=9)
        strand_obj["part"] = "three-ply real-mesh hemp braid"


# Two continuous real braided rails per side; each span has independent sag.
for side in (-1, 1):
    for level_index, level in enumerate(ROPE_LEVELS):
        for span_index in range(2):
            xa, xb = POST_X[span_index:span_index+2]
            centres = []
            za, zb = height(xa)+level, height(xb)+level
            local_sag = 0.15 if level_index == 0 else 0.205
            for i in range(65):
                t = i/64
                x = xa+(xb-xa)*t
                centres.append((x, side*POST_Y,
                                za+(zb-za)*t - 4*local_sag*t*(1-t)))
            braided_rope("Rope__%s_rail_%d_span_%d" %
                         ("left" if side < 0 else "right", level_index+1, span_index+1),
                         centres, turns=17, braid_radius=0.023, strand_radius=0.017)
        for post_index, x in enumerate(POST_X):
            # Tight doubled wraps sit against posts, rather than hovering rings.
            centres = []
            wrap_radius = POST_RADIUS + 0.024
            for i in range(65):
                t = i/64
                angle = math.tau*2.05*t
                centres.append((x+wrap_radius*math.cos(angle),
                                side*POST_Y+wrap_radius*math.sin(angle),
                                height(x)+level-0.048+0.096*t))
            braided_rope("Knot__post_%d_%s_level_%d_wrap" %
                         (post_index, "left" if side < 0 else "right", level_index+1),
                         centres, turns=13, braid_radius=0.016, strand_radius=0.012)
            if level_index == 1:
                # A little bound tail makes end knots tactile, but is not long
                # enough to snag the future clear pedestrian corridor.
                centres = [(x+0.08+0.015*math.sin(i*0.7),
                            side*POST_Y-side*0.145,
                            height(x)+level-0.015-i*0.023) for i in range(10)]
                braided_rope("Knot__post_%d_%s_bound_tail" % (post_index, side),
                             centres, turns=2.5, braid_radius=0.016, strand_radius=0.012)


# Hidden data donors must not produce extra meshes in the GLB auto-export.
for source in (bolt_source, washer_source):
    bpy.data.objects.remove(source, do_unlink=True)


scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 650
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
if hasattr(scene.render.image_settings, "media_type"):
    scene.render.image_settings.media_type = "IMAGE"
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("Bridge__soft_studio_ambient")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.77, 0.83, 0.91, 1)
background.inputs["Strength"].default_value = 0.40
# The worker finalizes Khronos PBR Neutral; use it for our preview when available.
view_enums = {item.identifier for item in scene.view_settings.bl_rna.properties["view_transform"].enum_items}
if "Khronos PBR Neutral" in view_enums:
    scene.view_settings.view_transform = "Khronos PBR Neutral"
scene.view_settings.exposure = 0.0


def light(name, kind, location, energy, color, aim):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "SUN":
        data.angle = math.radians(14)
    elif kind == "POINT":
        data.shadow_soft_size = 2.2
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(aim)-obj.location).to_track_quat("-Z", "Y").to_euler()
    obj["preview_only"] = True
    return obj


light("Lighting__warm_high_sun", "SUN", (2, -5, 8), 2.2,
      (1.0, 0.87, 0.71), (0, 0, 0))
light("Lighting__cool_large_fill", "POINT", (-2, 4, 5), 600,
      (0.75, 0.84, 1.0), (0, 0, 0))
camera_data = bpy.data.cameras.new("Camera__bridge_delivery_three_quarter")
camera = bpy.data.objects.new("Camera__bridge_delivery_three_quarter", camera_data)
collection.objects.link(camera)
camera.location = (7.9, -7.4, 5.5)
camera.rotation_euler = (Vector((0, 0, 0.46))-camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 8.4
camera_data.lens = 52
camera_data.clip_start = 0.05
camera_data.clip_end = 100
camera["preview_only"] = True
scene.camera = camera
scene.frame_set(1)


# Inspect evaluated modifier geometry, not just the un-bevelled control meshes.
depsgraph = bpy.context.evaluated_depsgraph_get()
mesh_objects = [obj for obj in collection.all_objects if obj.type == "MESH"]
triangle_count = 0
vertices_count = 0
mins = Vector((float("inf"),)*3)
maxs = Vector((float("-inf"),)*3)
for obj in mesh_objects:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    triangle_count += len(mesh.loop_triangles)
    vertices_count += len(mesh.vertices)
    for corner in evaluated.bound_box:
        p = evaluated.matrix_world @ Vector(corner)
        for axis in range(3):
            mins[axis] = min(mins[axis], p[axis])
            maxs[axis] = max(maxs[axis], p[axis])
    evaluated.to_mesh_clear()
if triangle_count > 120000:
    raise RuntimeError("Bridge prototype exceeded the 120k triangle budget: %s" % triangle_count)
root["evaluated_triangles"] = triangle_count
root["packed_texture_count"] = 4


preview_published = False
if "artifacts" in globals():
    target = artifacts.file(name=PREVIEW_NAME, media_type="image/png")
    scene.render.filepath = str(target.path)
    bpy.ops.render.render(write_still=True)
    target.publish()
    preview_published = True

result = {
    "asset": ASSET_ID,
    "collection": COLLECTION_NAME,
    "root": root.name,
    "reference": "10-timber-bridge.png",
    "status": "authored reference-driven prototype; visual and GLB inspection still required",
    "coordinate_contract": {"units": "metres", "length_axis": "X",
                            "width_axis": "Y", "up_axis": "Z",
                            "root": "deck centre top at z=0", "glb": "worker standard Y-up conversion"},
    "deck_m": {"length": LENGTH, "width": DECK_WIDTH, "sag": SAG},
    "bounds_m": {"min": list(mins), "max": list(maxs), "size": list(maxs-mins)},
    "counts": {"mesh_objects": len(mesh_objects), "evaluated_vertices": vertices_count,
               "evaluated_triangles": triangle_count, "posts": 6, "planks": PLANK_COUNT,
               "rope_levels_per_side": 2, "packed_images": 4},
    "textures": [wood_base.name, wood_rough.name, wood_normal.name, rope_base.name],
    "preview": PREVIEW_NAME if preview_published else "not rendered: artifacts registry absent",
    "notes": ["No network, external files, terrain, or GLB-export operator.",
              "UV textures and real braided mesh carry detail; no Blender-only procedural shaders.",
              "Source object names and controls remain editable; no rig or animated rope simulation.",
              "Not mounted into gameplay; navigation and collisions are unchanged."],
}
print(json.dumps(result, sort_keys=True))
