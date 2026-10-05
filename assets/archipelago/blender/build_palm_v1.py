"""Build an editable, metre-scale coconut palm for the archipelago asset study.

Run in Blender 5.2 with bpy and the 3D Jutsu artifacts registry available.
The worker exports the committed .blend/GLB; this script publishes one Eevee PNG.
Original geometry/materials only: no network, external textures or model bytes.
"""

import bpy
import math
import random
from array import array
from mathutils import Vector


SEED = 271104
TRUNK_HEIGHT = 5.20
FROND_COUNT = 9
FROND_LONGITUDINAL_ROWS = 81
FROND_CROSS_COLUMNS = 9
PREVIEW_NAME = "palm-v1-eevee.png"
random.seed(SEED)


def mesh_object(name, vertices, faces, material, uv=None, collection=None):
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    if uv is not None:
        layer = mesh.uv_layers.new(name="UVMap")
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                layer.data[loop_index].uv = uv[mesh.loops[loop_index].vertex_index]
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.scene.collection).objects.link(obj)
    if material is not None:
        mesh.materials.append(material)
    return obj


def tube_geometry(points, radii, sides=8, closed=False):
    points = [Vector(point) for point in points]
    vertices, faces, uv = [], [], []
    for index, point in enumerate(points):
        if closed:
            tangent = points[(index + 1) % len(points)] - points[index - 1]
        elif index == 0:
            tangent = points[1] - point
        elif index == len(points) - 1:
            tangent = point - points[index - 1]
        else:
            tangent = points[index + 1] - points[index - 1]
        tangent.normalize()
        reference = Vector((0, 0, 1)) if abs(tangent.z) < 0.91 else Vector((0, 1, 0))
        across = tangent.cross(reference).normalized()
        perpendicular = tangent.cross(across).normalized()
        for side in range(sides + 1):
            angle = math.tau * side / sides
            offset = (across * math.cos(angle) + perpendicular * math.sin(angle)) * radii[index]
            vertices.append(tuple(point + offset))
            uv.append((side / sides, index / max(1, len(points) - 1)))
    ring = sides + 1
    span_count = len(points) if closed else len(points) - 1
    for index in range(span_count):
        next_index = (index + 1) % len(points)
        for side in range(sides):
            a = index * ring + side
            b = next_index * ring + side
            faces.append((a, a + 1, b + 1, b))
    if not closed:
        faces.append(tuple(range(sides - 1, -1, -1)))
        faces.append(tuple((len(points) - 1) * ring + side for side in range(sides)))
    return vertices, faces, uv


def append_geometry(target, geometry):
    vertices, faces, uv = target
    source_vertices, source_faces, source_uv = geometry
    offset = len(vertices)
    vertices.extend(source_vertices)
    faces.extend(tuple(index + offset for index in face) for face in source_faces)
    uv.extend(source_uv)


def tube(name, points, radii, material, sides=8, closed=False, collection=None):
    vertices, faces, uv = tube_geometry(points, radii, sides, closed)
    return mesh_object(name, vertices, faces, material, uv, collection)


def hash_noise(x, y):
    value = math.sin(x * 12.9898 + y * 78.233 + SEED * 0.0001) * 43758.5453
    return value - math.floor(value)


def clamp(value, minimum=0.0, maximum=1.0):
    return max(minimum, min(maximum, value))


def image_pair(label, width, height, sample, normal_strength):
    """Portable packed base colour and tangent-space normal, not Blender-only noise."""
    heights = array("f")
    pixels = array("f")
    for y in range(height):
        v = y / max(1, height - 1)
        for x in range(width):
            u = x / max(1, width - 1)
            color, relief = sample(u, v, x, y)
            pixels.extend((clamp(color[0]), clamp(color[1]), clamp(color[2]), 1.0))
            heights.append(relief)
    base = bpy.data.images.new(label + "_BaseColor", width=width, height=height, alpha=True)
    base.colorspace_settings.name = "sRGB"
    base.pixels.foreach_set(pixels)
    base.pack()
    normal_pixels = array("f")
    for y in range(height):
        for x in range(width):
            left = heights[y * width + (x - 1) % width]
            right = heights[y * width + (x + 1) % width]
            down = heights[max(0, y - 1) * width + x]
            up = heights[min(height - 1, y + 1) * width + x]
            normal = Vector(((left - right) * normal_strength,
                             (down - up) * normal_strength, 1.0)).normalized()
            normal_pixels.extend((normal.x * 0.5 + 0.5, normal.y * 0.5 + 0.5,
                                  normal.z * 0.5 + 0.5, 1.0))
    normal = bpy.data.images.new(label + "_Normal", width=width, height=height, alpha=True)
    normal.colorspace_settings.name = "Non-Color"
    normal.pixels.foreach_set(normal_pixels)
    normal.pack()
    return base, normal


def bark_sample(u, v, x, y):
    fine = hash_noise(x, y) - 0.5
    fibre = math.sin(u * math.tau * 91 + math.sin(v * 18) * 0.9)
    coarse = math.sin(u * math.tau * 17 + v * 4.8)
    segment = math.sin(v * math.tau * 18 + math.sin(u * math.tau * 2) * 0.24)
    fissure = max(0.0, math.cos(u * math.tau * 37 + math.sin(v * 26) * 0.25)) ** 14
    relief = fibre * 0.060 + coarse * 0.035 - fissure * 0.11 + fine * 0.010
    brightness = 1.00 + coarse * 0.065 + fibre * 0.025 + segment * 0.055 - fissure * 0.11
    return (0.65 * brightness + fine * 0.012,
            0.415 * brightness + fine * 0.010,
            0.245 * brightness + fine * 0.008), relief


def leaf_sample(u, v, x, y):
    fine = hash_noise(x, y) - 0.5
    midvein = math.exp(-((v - 0.50) / 0.039) ** 2)
    lateral = math.sin((v - 0.5) * math.tau * 16 + u * 7.5)
    mottled = math.sin(u * 19 + v * 8) * math.sin(u * 7 - v * 18)
    edge = abs(v - 0.5) * 2
    brightness = 0.94 + mottled * 0.06 + lateral * 0.035 + fine * 0.025
    # Yellow-green narrow veins sit inside a deep green, broad leaf blade.
    return (0.35 * brightness + midvein * 0.12 + (1 - u) * 0.035,
            0.635 * brightness + midvein * 0.075,
            0.075 * brightness + edge * 0.018), lateral * 0.035 + midvein * 0.09 + fine * 0.008


def coconut_sample(u, v, x, y):
    fine = hash_noise(x, y) - 0.5
    stripes = math.sin(u * math.tau * 13 + math.sin(v * 9) * 0.28)
    mottled = math.sin(u * 27 + v * 19) * math.sin(u * 9 - v * 15)
    brightness = 0.9 + stripes * 0.07 + mottled * 0.09 + fine * 0.045
    return (0.47 * brightness, 0.445 * brightness, 0.125 * brightness), stripes * 0.035 + fine * 0.02


def pbr_material(name, color, roughness=0.6, image_textures=None):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1.0)
    nodes = material.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = 0.0
    if image_textures:
        base_image, normal_image = image_textures
        base = nodes.new("ShaderNodeTexImage")
        base.name = name + "_Packed_BaseColor"
        base.image = base_image
        base.location = (-560, 130)
        normal_texture = nodes.new("ShaderNodeTexImage")
        normal_texture.name = name + "_Packed_Normal"
        normal_texture.image = normal_image
        normal_texture.location = (-560, -130)
        normal = nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value = 0.40 if "Bark" in name else 0.27
        normal.location = (-250, -130)
        material.node_tree.links.new(base.outputs["Color"], principled.inputs["Base Color"])
        material.node_tree.links.new(normal_texture.outputs["Color"], normal.inputs["Color"])
        material.node_tree.links.new(normal.outputs["Normal"], principled.inputs["Normal"])
    return material


def trunk_center(t):
    return Vector((-0.82 * math.sin(math.pi * t * 0.95) + 0.58 * t * t,
                   0.12 * math.sin(t * math.pi * 0.8), TRUNK_HEIGHT * t))


def trunk_radius(t):
    return 0.185 + 0.190 * (1 - t) ** 0.8 + 0.12 * math.exp(-t * 23)


def build_trunk(collection, material, ring_material, fissure_material):
    vertices, faces, uv = [], [], []
    longitudinal, radial = 96, 40
    for level in range(longitudinal + 1):
        t = level / longitudinal
        center = trunk_center(t)
        tangent = (trunk_center(min(1, t + 0.005)) - trunk_center(max(0, t - 0.005))).normalized()
        across = tangent.cross(Vector((0, 1, 0))).normalized()
        perpendicular = tangent.cross(across).normalized()
        for side in range(radial + 1):
            angle = math.tau * side / radial
            radius = trunk_radius(t) * (1 + math.sin(angle * 9 + t * 0.8) * 0.035)
            radius += 0.007 * math.sin(angle * 19 - t * 4)
            offset = across * (math.cos(angle) * radius) + perpendicular * (math.sin(angle) * radius)
            point = center + offset
            # A metre-scale asset sits on its base, not on an oblique tube cap.
            if level == 0:
                point.z = 0
            vertices.append(tuple(point))
            uv.append((side / radial, t))
    stride = radial + 1
    for level in range(longitudinal):
        for side in range(radial):
            a = level * stride + side
            faces.append((a, a + 1, a + stride + 1, a + stride))
    faces.append(tuple(range(radial - 1, -1, -1)))
    faces.append(tuple(longitudinal * stride + side for side in range(radial)))
    trunk = mesh_object("Palm_Trunk_Curved_Ringed_Bark", vertices, faces, material, uv, collection)
    trunk["role"] = "Curved continuous load-bearing trunk, origin at ground level"
    trunk["height_m"] = TRUNK_HEIGHT
    scars = ([], [], [])
    fissures = ([], [], [])
    for index in range(1, 19):
        t = (index + 0.16 * math.sin(index * 2.7)) / 19
        center = trunk_center(t)
        tangent = (trunk_center(t + 0.005) - trunk_center(t - 0.005)).normalized()
        across = tangent.cross(Vector((0, 1, 0))).normalized()
        perpendicular = tangent.cross(across).normalized()
        points = []
        for step in range(40):
            angle = math.tau * step / 40
            tilt = (math.sin(angle + index * 0.91) * 0.030
                    + math.sin(angle * 4 + index * 1.7) * 0.009)
            radius = trunk_radius(t) * (1 + math.sin(angle * 9 + t * 0.8) * 0.035) + 0.007
            points.append(center + across * (math.cos(angle) * radius)
                          + perpendicular * (math.sin(angle) * radius) + tangent * tilt)
        radii = [0.011 * (1 + 0.28 * math.sin(step * 0.53 + index)) for step in range(40)]
        append_geometry(scars, tube_geometry(points, radii, 5, True))
    mesh_object("Palm_Trunk_18_Irregular_Leaf_Scar_Ridges", *scars[:2], ring_material, scars[2], collection)
    # Short actual bark creases supplement the packed texture without a faceted log.
    for segment in range(18):
        t0, t1 = segment / 19 + 0.010, (segment + 1) / 19 - 0.010
        for index in range(4):
            angle = index / 4 * math.tau + segment * 0.241
            points = []
            for step in range(6):
                t = t0 + (t1 - t0) * step / 5
                center = trunk_center(t)
                radius = trunk_radius(t) + 0.003
                adjusted = angle + math.sin(step * 0.8 + segment) * 0.025
                points.append(center + Vector((math.cos(adjusted) * radius,
                                              math.sin(adjusted) * radius, 0)))
            append_geometry(fissures, tube_geometry(points, [0.0018] * 6, 4))
    mesh_object("Palm_Trunk_72_Subtle_Bark_Fissures", *fissures[:2], fissure_material, fissures[2], collection)


def frond_point(crown, direction, t, length, arch, droop, sway):
    across = Vector((-direction.y, direction.x, 0))
    horizontal = length * (0.02 + 0.98 * t)
    # Young upright fronds curl near their tips; mature outer fronds droop.
    curve_turn = 0.68 if arch > 1.7 else 0.92
    height = math.sin(t * math.pi * curve_turn) * arch - droop * t ** 1.65
    return crown + direction * horizontal + across * (math.sin(t * math.pi) * sway) + Vector((0, 0, height))


def blade_geometry(crown, direction, length, arch, droop, sway, phase):
    """One closed, uninterrupted broad lamina, with tears only at its perimeter.

    The central 70% stays continuous: no separate strips, overlap or openings.
    Two tessellated surfaces and a closed sidewall make a portable solid mesh.
    """
    across = Vector((-direction.y, direction.x, 0))
    vertices, faces, uv = [], [], []
    row_count, column_count = FROND_LONGITUDINAL_ROWS, FROND_CROSS_COLUMNS
    for layer in range(2):
        for row in range(row_count):
            t = row / (row_count - 1)
            base = frond_point(crown, direction, t, length, arch, droop, sway)
            half_width = 0.82 * math.sin(math.pi * t) ** 0.62 + 0.012
            for column in range(column_count):
                w = column / (column_count - 1) * 2 - 1
                side = -1 if w < 0 else 1
                # Narrow V-notches, offset on opposing margins. Their deepest
                # point is still outside the solid central 70% of the lamina.
                notch_phase = (row + phase * 3 + (2 if side < 0 else 0)) % 4
                notch = max(0.0, 1.0 - abs(notch_phase - 2.0))
                tear_depth = 0.24 + 0.025 * math.sin(row * 1.73 + phase + side)
                edge_limit = 1.0 - notch * tear_depth
                absolute_w = abs(w)
                if absolute_w > 0.70:
                    absolute_w = 0.70 + (absolute_w - 0.70) / 0.30 * (edge_limit - 0.70)
                lateral = half_width * absolute_w * side
                point = base + across * lateral
                # Continuous arched blade with a raised midrib and folded edges.
                fullness = math.sin(math.pi * t)
                point.z += 0.033 * (1 - abs(w)) ** 2 * fullness
                point.z -= 0.15 * abs(w) ** 1.6 * fullness
                point.z += 0.016 * math.sin(t * 11 + phase) * abs(w) * fullness
                point.z += 0.0045 if layer == 0 else -0.0045
                vertices.append(tuple(point))
                uv.append((t, column / (column_count - 1)))
    layer_stride = row_count * column_count
    for row in range(row_count - 1):
        for column in range(column_count - 1):
            a = row * column_count + column
            front = (a, a + column_count, a + column_count + 1, a + 1)
            faces.append(front)
            faces.append(tuple(index + layer_stride for index in reversed(front)))
    perimeter = list(range(column_count))
    perimeter += [row * column_count + column_count - 1 for row in range(1, row_count)]
    perimeter += list(range(layer_stride - 2, layer_stride - column_count - 1, -1))
    perimeter += [row * column_count for row in range(row_count - 2, 0, -1)]
    for index, a in enumerate(perimeter):
        b = perimeter[(index + 1) % len(perimeter)]
        rim = (a, b, b + layer_stride, a + layer_stride)
        faces.append(rim)
    return vertices, faces, uv


def build_crown(collection, leaf_material, spine_material, sheath_material):
    crown = trunk_center(1)
    for index in range(FROND_COUNT):
        angle = math.tau * index / FROND_COUNT + 0.28
        direction = Vector((math.cos(angle), math.sin(angle), 0))
        is_upright = index in (2, 6)
        length = 1.70 if is_upright else 3.30 + 0.18 * math.sin(index * 1.9)
        arch = 1.85 if is_upright else 0.94 + 0.20 * math.cos(index * 2.1)
        droop = 0.15 if is_upright else 1.75 + 0.28 * math.sin(index * 1.73 + 0.8)
        sway = math.sin(index * 3.1) * 0.14
        origin = crown + Vector((0, 0, (index % 3) * 0.055))
        points = [frond_point(origin, direction, step / 40, length, arch, droop, sway) for step in range(41)]
        radii = [0.041 * (1 - step / 40) ** 0.75 + 0.006 for step in range(41)]
        rachis = tube("Palm_Frond_%02d_Golden_Curved_Rachis" % (index + 1), points, radii,
                      spine_material, 7, collection=collection)
        rachis["role"] = "Curved central vein supporting one continuous broad lamina"
        blade = blade_geometry(origin, direction, length, arch, droop, sway, index)
        obj = mesh_object("Palm_Frond_%02d_Closed_Continuous_Blade_Notched_Margin" % (index + 1),
                          *blade[:2], leaf_material, blade[2], collection)
        obj["role"] = "Closed uninterrupted broad lamina with shallow peripheral tears"
        obj["continuous_central_width_fraction"] = 0.70
        obj["nominal_maximum_width_m"] = 1.664
        obj["length_m"] = length
        # Petiole collars retain separate editable material/geometry roles.
        collar_points = [origin - Vector((0, 0, 0.20)),
                         origin + direction * 0.20 + Vector((0, 0, 0.10)),
                         origin + direction * 0.40 + Vector((0, 0, 0.23))]
        tube("Palm_Crown_%02d_Woody_Petiole_Collar" % (index + 1), collar_points,
             [0.11, 0.075, 0.036], sheath_material, 9, collection=collection)
    fibres = ([], [], [])
    for index in range(34):
        angle = math.tau * index / 34
        direction = Vector((math.cos(angle), math.sin(angle), 0))
        length = 0.18 + random.random() * 0.25
        points = [crown + direction * (0.12 + step / 5 * length)
                  + Vector((0, 0, -0.08 - step / 5 * (0.20 + length * 0.35)))
                  for step in range(6)]
        append_geometry(fibres, tube_geometry(points, [0.004] * 6, 4))
    mesh_object("Palm_Crown_34_Dry_Fibres", *fibres[:2], sheath_material, fibres[2], collection)


def coconut_geometry(center, scale, phase):
    vertices, faces, uv = [], [], []
    rows, sides = 22, 32
    for row in range(rows + 1):
        v = row / rows
        latitude = v * math.pi
        for side in range(sides + 1):
            u = side / sides
            angle = u * math.tau
            uneven = 1 + 0.025 * math.sin(angle * 5 + latitude * 3 + phase)
            radius = math.sin(latitude) * uneven
            vertices.append((center.x + math.cos(angle) * radius * scale.x,
                             center.y + math.sin(angle) * radius * scale.y,
                             center.z + math.cos(latitude) * scale.z))
            uv.append((u, v))
    stride = sides + 1
    for row in range(rows):
        for side in range(sides):
            a = row * stride + side
            faces.append((a, a + stride, a + stride + 1, a + 1))
    return vertices, faces, uv


def build_coconuts(collection, coconut_material, sheath_material):
    crown = trunk_center(1)
    for index, angle in enumerate((-1.88, -0.58, 0.69)):
        offset = Vector((math.cos(angle) * 0.30, math.sin(angle) * 0.30, -0.48))
        center = crown + offset
        scale = Vector((0.285 + index * 0.012, 0.265, 0.375 + index * 0.015))
        vertices, faces, uv = coconut_geometry(center, scale, index * 0.7)
        obj = mesh_object("Palm_Coconut_%02d_Green_Husk" % (index + 1), vertices, faces,
                          coconut_material, uv, collection)
        obj["role"] = "Coconut fruit with packed husk microtexture"
        attachment = [crown + Vector((0, 0, -0.02)),
                      crown + offset * 0.40 + Vector((0, 0, 0.04)),
                      center + Vector((0, 0, scale.z * 0.94))]
        tube("Palm_Coconut_%02d_Attached_Peduncle" % (index + 1), attachment,
             [0.029, 0.022, 0.016], sheath_material, 7, collection=collection)


def aim(object_, target):
    object_.rotation_euler = (Vector(target) - object_.location).to_track_quat("-Z", "Y").to_euler()


def make_light(name, kind, location, energy, color):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "SUN":
        data.angle = math.radians(8)
    elif kind == "POINT":
        data.shadow_soft_size = 4
    light = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    aim(light, (0, 0, 4.3))
    return light


def setup_delivery(scene, bounds):
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 650
    scene.render.resolution_percentage = 100
    scene.render.image_settings.media_type = "IMAGE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    if hasattr(scene, "eevee") and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 48
    transforms = scene.view_settings.bl_rna.properties["view_transform"].enum_items
    if "Khronos PBR Neutral" in {item.identifier for item in transforms}:
        scene.view_settings.view_transform = "Khronos PBR Neutral"
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new("Palm_Studio_White_Ambient")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.92, 0.96, 1, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.65
    scene.world = world
    minimum, maximum = bounds
    target = (minimum + maximum) * 0.5
    camera_data = bpy.data.cameras.new("Palm_Delivery_Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max((maximum.z - minimum.z) * 900 / 650,
                                  maximum.x - minimum.x) * 1.13
    camera = bpy.data.objects.new("Palm_Delivery_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = target + Vector((11.0, -18.0, 4.0))
    aim(camera, target)
    scene.camera = camera
    make_light("Palm_Key_Sun_Warm", "SUN", (-8, -10, 14), 2.0, (1.0, 0.87, 0.67))
    make_light("Palm_Fill_Soft", "POINT", (5, -5, 8), 750, (0.74, 0.86, 1.0))
    make_light("Palm_Rim_Sun", "SUN", (4, 7, 10), 0.75, (1.0, 0.95, 0.81))


def main():
    # This builder owns a new, dedicated asset-study project; never run it in a
    # gameplay/assembled project. The root agent obtains project guards first.
    for object_ in list(bpy.data.objects):
        bpy.data.objects.remove(object_, do_unlink=True)
    # Rebuilding this dedicated study must not retain previous packed assets.
    # Release data in dependency order; never purge unrelated or referenced data.
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for datablock in list(datablocks):
            if datablock.name.startswith("Palm_") and datablock.users == 0:
                datablocks.remove(datablock)
    for previous in list(bpy.data.collections):
        if (previous.name.startswith("Palm_V1_Editable_Asset")
                and not previous.objects and not previous.children):
            bpy.data.collections.remove(previous)
    collection = bpy.data.collections.new("Palm_V1_Editable_Asset")
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new("Palm_V1_Origin_At_Trunk_Base", None)
    collection.objects.link(root)
    root["asset_role"] = "Standalone stylized curved coconut palm"
    root["reference"] = "reference-sheets-v1/11-curved-palm.png"
    root["metres"] = True
    bark_textures = image_pair("Palm_Bark_Fibre", 512, 512, bark_sample, 3.0)
    leaf_textures = image_pair("Palm_Leaf_Vein", 512, 128, leaf_sample, 2.1)
    husk_textures = image_pair("Palm_Coconut_Husk", 256, 256, coconut_sample, 1.5)
    bark = pbr_material("Palm_PBR_Bark", (0.65, 0.415, 0.245), 0.72, bark_textures)
    leaf = pbr_material("Palm_PBR_Leaf_Broad_Green", (0.35, 0.635, 0.075), 0.48, leaf_textures)
    coconut = pbr_material("Palm_PBR_Green_Coconut_Husk", (0.47, 0.445, 0.125), 0.66, husk_textures)
    scar = pbr_material("Palm_PBR_Golden_Leaf_Scar", (0.46, 0.28, 0.15), 0.77)
    fissure = pbr_material("Palm_PBR_Dark_Bark_Fissure", (0.32, 0.19, 0.105), 0.84)
    rachis = pbr_material("Palm_PBR_Yellow_Green_Rachis", (0.49, 0.47, 0.085), 0.54)
    sheath = pbr_material("Palm_PBR_Woody_Crown_Sheath", (0.38, 0.205, 0.065), 0.78)
    build_trunk(collection, bark, scar, fissure)
    build_crown(collection, leaf, rachis, sheath)
    build_coconuts(collection, coconut, sheath)
    meshes = [object_ for object_ in collection.objects if object_.type == "MESH"]
    for object_ in meshes:
        object_.parent = root
    # Resolve newly linked meshes and parent matrices before world-space bounds.
    bpy.context.view_layer.update()
    points = [object_.matrix_world @ Vector(corner) for object_ in meshes for corner in object_.bound_box]
    if not points or not all(math.isfinite(value) for point in points for value in point):
        raise RuntimeError("Palm has empty or non-finite world-space bounds")
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    if any(maximum[axis] <= minimum[axis] for axis in range(3)):
        raise RuntimeError("Palm world-space bounds have a zero or negative extent")
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    setup_delivery(scene, (minimum, maximum))
    triangles = sum(sum(max(0, len(polygon.vertices) - 2) for polygon in object_.data.polygons)
                    for object_ in meshes)
    if triangles > 150_000:
        raise RuntimeError("Palm exceeds the 150k triangle asset-study budget: %d" % triangles)
    target = artifacts.file(name=PREVIEW_NAME, media_type="image/png")
    scene.render.filepath = str(target.path)
    bpy.ops.render.render(write_still=True)
    target.publish()
    return {
        "asset": "palm-v1",
        "blender_version": bpy.app.version_string,
        "units": "metres; Blender Z-up, exported glTF Y-up by exporter",
        "mesh_objects": len(meshes),
        "vertices": sum(len(object_.data.vertices) for object_ in meshes),
        "triangles": triangles,
        "bounds_min": [round(value, 4) for value in minimum],
        "bounds_max": [round(value, 4) for value in maximum],
        "dimensions_m": [round(value, 4) for value in maximum - minimum],
        "fronds": FROND_COUNT,
        "closed_continuous_blades": FROND_COUNT,
        "continuous_central_width_fraction": 0.70,
        "coconuts": 3,
        "packed_pbr_images": [image.name for pair in (bark_textures, leaf_textures, husk_textures)
                              for image in pair if image.packed_file],
        "semantic_parts": [object_.name for object_ in collection.objects],
        "preview": PREVIEW_NAME,
        "reference_match": "Original geometry following silhouette/material direction; not image-identical reconstruction",
    }


result = main()
