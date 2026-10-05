"""Original reference-led contact lighthouse/radio hut, editable Blender 5.2.

Native authoring only: no network, file reads/writes, render, save or export.
The supplied pictures guide crafted silhouettes/materials, not personal facts or
automatic image-to-3D. Local glTF coordinates are X right, Y up, Z front;
Blender coordinates are (X,-Z,Y). The root sits at the tower's ground plane.
Only the attached hut has a small 6.6 x 4.6 m floor. No island/background/avatar,
whole-building platform, upper walking floor or extra content station is added.
"""
import math
import json
import random
import hashlib
import bpy
import numpy as np
from mathutils import Vector


PREFIX = "ContactLighthouse_"
ROOT_NAME = "ContactLighthouse_V1_Origin_At_Tower_Base"
COLLECTION_NAME = "ContactLighthouse_V1_Editable_Asset"
PREVIEW_COLLECTION_NAME = "ContactLighthouse_V1_Preview_Only"
TRIANGLE_LIMIT = 165_000
IMAGE_SIZE = 512
RNG = random.Random(310027)
MATERIALS, TEXTURES, GROUPS = {}, [], {}
COLLECTION = PREVIEW_COLLECTION = None
SOURCE_TRIANGLES = 0
CONTRACT_JSON = '''{
  "schema": "archipelago-static-building-contract-v1",
  "asset": "contact-lighthouse-v1",
  "root": "ContactLighthouse_V1_Origin_At_Tower_Base",
  "status": "PROPOSED reference-led local geometry only; runtime/support and actual GLB review pending",
  "units": "metres",
  "axes": "Local glTF X right, Y up, Z front; Blender(X,-Z,Y); identity root, no runtime scaling/yaw",
  "runtimeAnchorProposal": {
    "area": "contact",
    "x": 17,
    "y": 0.26,
    "z": 69,
    "derivedFrom": "area.elevation + 0.06, never historical Blender world Y"
  },
  "deck": {
    "id": "contact-radio-hut-deck",
    "x": -5.2,
    "z": 2.7,
    "width": 6.6,
    "depth": 4.6,
    "bottom": -0.24,
    "height": 0.24,
    "walkingTop": 0,
    "yaw": 0
  },
  "groups": [
    "Lighthouse_shell",
    "Lighthouse_roof",
    "Lighthouse_interior",
    "Lighthouse_decor"
  ],
  "stations": [
    {
      "kind": "contact",
      "x": -5,
      "z": 3.5,
      "width": 3,
      "depth": 1.35,
      "height": 1.3
    }
  ],
  "hulls": [
    {
      "id": "contact-lighthouse-tower",
      "role": "landmark",
      "kind": "cylinder",
      "x": 0,
      "z": 0,
      "radius": 2.4,
      "width": 4.8,
      "depth": 4.8,
      "bottom": -0.12,
      "height": 13.12,
      "yaw": 0
    },
    {
      "id": "contact-hut-post-back-west",
      "role": "post",
      "kind": "box",
      "x": -8.15,
      "z": 0.65,
      "width": 0.4,
      "depth": 0.4,
      "bottom": 0,
      "height": 3.5,
      "yaw": 0
    },
    {
      "id": "contact-hut-post-front-west",
      "role": "post",
      "kind": "box",
      "x": -8.15,
      "z": 4.75,
      "width": 0.4,
      "depth": 0.4,
      "bottom": 0,
      "height": 3.5,
      "yaw": 0
    },
    {
      "id": "contact-hut-post-front-east",
      "role": "post",
      "kind": "box",
      "x": -2.25,
      "z": 4.75,
      "width": 0.4,
      "depth": 0.4,
      "bottom": 0,
      "height": 3.5,
      "yaw": 0
    },
    {
      "id": "contact-hut-back-wall",
      "role": "wall",
      "kind": "box",
      "x": -5.2,
      "z": 0.64,
      "width": 6.12,
      "depth": 0.22,
      "bottom": 0,
      "height": 3.06,
      "yaw": 0
    },
    {
      "id": "contact-hut-west-wall",
      "role": "wall",
      "kind": "box",
      "x": -8.26,
      "z": 2.1,
      "width": 0.2,
      "depth": 2.78,
      "bottom": 0,
      "height": 2.95,
      "yaw": 0
    },
    {
      "id": "contact-hut-east-wall",
      "role": "wall",
      "kind": "box",
      "x": -2.15,
      "z": 2.1,
      "width": 0.2,
      "depth": 2.64,
      "bottom": 0,
      "height": 2.5,
      "yaw": 0
    },
    {
      "id": "contact-radio-desk",
      "role": "desk",
      "kind": "box",
      "x": -5,
      "z": 3.5,
      "width": 3,
      "depth": 1.35,
      "bottom": 0,
      "height": 1.3,
      "yaw": 0
    },
    {
      "id": "contact-rear-console",
      "role": "furniture",
      "kind": "box",
      "x": -5.2,
      "z": 1.05,
      "width": 3.8,
      "depth": 0.78,
      "bottom": 0,
      "height": 0.9,
      "yaw": 0
    },
    {
      "id": "contact-bookcase-west",
      "role": "furniture",
      "kind": "box",
      "x": -7.65,
      "z": 1.14,
      "width": 0.7,
      "depth": 0.72,
      "bottom": 0,
      "height": 2.45,
      "yaw": 0
    },
    {
      "id": "contact-bookcase-east",
      "role": "furniture",
      "kind": "box",
      "x": -2.8,
      "z": 1.35,
      "width": 0.65,
      "depth": 0.9,
      "bottom": 0,
      "height": 2.3,
      "yaw": 0
    },
    {
      "id": "contact-pot-west-front",
      "role": "furniture",
      "kind": "cylinder",
      "x": -8.1,
      "z": 3.95,
      "radius": 0.28,
      "width": 0.56,
      "depth": 0.56,
      "bottom": 0,
      "height": 0.64,
      "yaw": 0
    },
    {
      "id": "contact-pot-west-rear",
      "role": "furniture",
      "kind": "cylinder",
      "x": -8.1,
      "z": 1.05,
      "radius": 0.24,
      "width": 0.48,
      "depth": 0.48,
      "bottom": 0,
      "height": 0.58,
      "yaw": 0
    },
    {
      "id": "contact-pot-east-front",
      "role": "furniture",
      "kind": "cylinder",
      "x": -2.18,
      "z": 3.88,
      "radius": 0.24,
      "width": 0.48,
      "depth": 0.48,
      "bottom": 0,
      "height": 0.58,
      "yaw": 0
    },
    {
      "id": "contact-hut-footing-west",
      "role": "foundation",
      "kind": "box",
      "x": -8.375,
      "z": 2.7,
      "width": 0.25,
      "depth": 4.6,
      "bottom": -0.5,
      "height": 0.26,
      "yaw": 0
    },
    {
      "id": "contact-hut-footing-east",
      "role": "foundation",
      "kind": "box",
      "x": -2.025,
      "z": 2.7,
      "width": 0.25,
      "depth": 4.6,
      "bottom": -0.5,
      "height": 0.26,
      "yaw": 0
    },
    {
      "id": "contact-hut-footing-back",
      "role": "foundation",
      "kind": "box",
      "x": -5.2,
      "z": 0.525,
      "width": 6.1,
      "depth": 0.25,
      "bottom": -0.5,
      "height": 0.26,
      "yaw": 0
    },
    {
      "id": "contact-hut-footing-front",
      "role": "foundation",
      "kind": "box",
      "x": -5.2,
      "z": 4.875,
      "width": 6.1,
      "depth": 0.25,
      "bottom": -0.5,
      "height": 0.26,
      "yaw": 0
    }
  ],
  "geometryBoundary": {
    "towerFootBottom": -0.12,
    "towerCylinderTop": 13,
    "towerHardRadiusMax": 2.4,
    "hutFloorOnly": true,
    "galleryAndLanternSoftAboveHead": true,
    "noUpperWalkingFloor": true,
    "noTerrainOrWholeAssetPlatform": true,
    "heightTargetMax": 17.3
  },
  "frontClearanceProposal": {
    "xMin": -6.5,
    "xMax": -3.5,
    "zMin": 4.175,
    "zMax": 8,
    "notYetNavigationApproval": true
  },
  "softNonSolid": [
    "roof, rafters and braces above head height",
    "gallery, corbels and upper railings",
    "glass and optical lantern",
    "antenna and satellite dishes",
    "cloth and original compass motif",
    "attached leaves and hibiscus",
    "lamps and small stationery"
  ],
  "preservedRuntimeIntent": [
    "nine semantic places and six physical territories",
    "all 21 stations; existing contact centre local(-5,3.5)",
    "terrain XYZ and all 196 original props; seed filtering remains separate",
    "routes, arrival and transfer endpoints unless separately audited/approved"
  ],
  "runtimeGuards": {
    "bytesMax": 8388608,
    "meshesMax": 96,
    "trianglesMax": 180000,
    "authoringTrianglesSafetyMax": 165000,
    "imagesMax": 8,
    "imageDimensionMax": 512
  },
  "factualBoundary": "Original fictional lighthouse/radio-studio architecture. Decorative maps, radio waveforms, books and compass are illustrative, never personal evidence, screenshots, qualifications or claims. No person, island, new station, submitted form, unlock or automatic image-to-3D claim."
}'''


def C(point):
    return (float(point[0]), -float(point[2]), float(point[1]))


def G(point):
    return (float(point[0]), float(point[2]), -float(point[1]))


def packed_image(name, rgb, non_color=False):
    rgb = np.asarray(rgb, dtype=np.float32)
    if rgb.shape != (IMAGE_SIZE, IMAGE_SIZE, 3) or not np.all(np.isfinite(rgb)):
        raise RuntimeError("Invalid finite 512-pixel source texture: " + name)
    pixels = np.concatenate((np.clip(rgb, 0, 1),
                             np.ones((IMAGE_SIZE, IMAGE_SIZE, 1), np.float32)), axis=2)
    image = bpy.data.images.new(PREFIX + name, width=IMAGE_SIZE, height=IMAGE_SIZE, alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(pixels.ravel())
    image.update()
    image.pack()
    TEXTURES.append(image)
    return image


def pbr(name, color, rough=.65, metal=0, base=None, orm=None, emission=None, transmission=0):
    material = bpy.data.materials.new(PREFIX + "PBR_" + name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1)
    material.use_backface_culling = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["IOR"].default_value = 1.45
    if "Transmission Weight" in shader.inputs:
        shader.inputs["Transmission Weight"].default_value = transmission
    if base is not None:
        node = material.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = base
        node.interpolation = "Linear"
        material.node_tree.links.new(node.outputs["Color"], shader.inputs["Base Color"])
    if orm is not None:
        node = material.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = orm
        node.interpolation = "Linear"
        split = material.node_tree.nodes.new("ShaderNodeSeparateColor")
        split.mode = "RGB"
        material.node_tree.links.new(node.outputs["Color"], split.inputs["Color"])
        material.node_tree.links.new(split.outputs["Green"], shader.inputs["Roughness"])
        material.node_tree.links.new(split.outputs["Blue"], shader.inputs["Metallic"])
    if emission is not None:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = .9
    MATERIALS[name] = material
    return material


def make_materials():
    u, v = np.meshgrid(np.linspace(0, 1, IMAGE_SIZE, endpoint=False),
                       np.linspace(0, 1, IMAGE_SIZE, endpoint=False))
    # Broad filtered grain, NOT pixel-sized normal noise or diagonal normal artefacts.
    flow = v + .018 * np.sin(u * 17) + .003 * np.sin(u * 49 + v * 7)
    fibres = np.sin(flow * math.tau * 23) + .2 * np.sin(flow * math.tau * 51)
    knot_radius = np.sqrt(((u - .63) * 1.8) ** 2 + ((v - .42) * 5.5) ** 2)
    knot = np.sin(knot_radius * 48) * np.exp(-knot_radius * 7)
    timber_variation = 1 + .035 * fibres + .048 * knot
    wood = packed_image("Worked_Oak_Base_512", timber_variation[..., None] * (.68, .385, .155))
    wood_orm = packed_image("Worked_Oak_ORM_512", np.stack((np.ones_like(u),
        np.clip(.64 + .026 * fibres + .012 * knot, .57, .71), np.zeros_like(u)), axis=2), True)
    broad_mineral = np.sin(u * 18 + v * 6) * np.sin(v * 16 - u * 4)
    mineral = 1 + .018 * broad_mineral + .007 * np.sin(u * 67) * np.sin(v * 49)
    stone = packed_image("Cream_Limestone_Base_512", mineral[..., None] * (.89, .813, .655))
    stone_orm = packed_image("Cream_Limestone_ORM_512", np.stack((np.ones_like(u),
        .82 + .024 * broad_mineral, np.zeros_like(u)), axis=2), True)
    clay_relief = np.sin(u * 26 + v * 11) * np.sin(v * 21 - u * 7)
    clay = packed_image("Handmade_Terracotta_Base_512", (1 + .045 * clay_relief)[..., None] * (.68, .22, .10))
    clay_orm = packed_image("Handmade_Terracotta_ORM_512", np.stack((np.ones_like(u),
        .77 + .025 * clay_relief, np.zeros_like(u)), axis=2), True)
    veins = np.exp(-((v - .5) / .018) ** 2) + .19 * np.sin((v - .5) * 37 + u * 31)
    leaf = packed_image("Broadleaf_Base_512", (1 + .045 * veins)[..., None] * (.19, .35, .049))
    # Original neutral radio/cartographic atlas. No text, links, dates, trophies or personal evidence.
    atlas = np.ones((IMAGE_SIZE, IMAGE_SIZE, 3)) * (.875, .777, .552)
    map_region = (u < .5) & (v > .5)
    sea = map_region & (np.sin(u * 33) + np.cos(v * 29) > -.65)
    atlas[sea] = (.13, .43, .49)
    land = map_region & (((u - .20) / .095) ** 2 + ((v - .74) / .15) ** 2 < 1)
    land |= map_region & (((u - .36) / .06) ** 2 + ((v - .87) / .085) ** 2 < 1)
    atlas[land] = (.43, .54, .18)
    chart_line = map_region & ((np.mod(u * 22, 1) < .019) | (np.mod(v * 22, 1) < .019))
    atlas[chart_line] = (.72, .67, .45)
    radio_region = (u > .5) & (v < .5)
    atlas[radio_region] = (.026, .08, .12)
    wave = .255 + .043 * np.sin(u * 83) * np.exp(-((u - .76) / .21) ** 2)
    radio_line = radio_region & (np.abs(v - wave) < .0045)
    atlas[radio_line] = (.27, .84, .87)
    grid = radio_region & ((np.mod(u * 34, 1) < .016) | (np.mod(v * 34, 1) < .016))
    atlas[grid] = (.04, .145, .18)
    schematic = packed_image("Original_Nautical_Radio_Atlas_512", atlas)
    pbr("Honey_Timber", (.68, .385, .155), base=wood, orm=wood_orm)
    pbr("Pale_Endgrain", (.78, .51, .255), .7)
    pbr("Dark_Joinery", (.21, .095, .034), .74)
    pbr("Cream_Limestone", (.89, .813, .655), base=stone, orm=stone_orm)
    pbr("Stone_Shade", (.73, .665, .52), .86)
    pbr("Mortar", (.765, .715, .596), .9)
    pbr("Terracotta", (.68, .22, .10), base=clay, orm=clay_orm)
    pbr("Terracotta_Sun", (.78, .287, .134), .78)
    pbr("Brass", (.76, .505, .15), .33, .76)
    pbr("Dark_Iron", (.055, .068, .075), .54, .59)
    pbr("Violet_Linen", (.30, .065, .59), .86)
    pbr("Ivory_Linen", (.96, .875, .72), .86)
    pbr("Paper", (.885, .788, .57), .91)
    pbr("Map_Atlas", (.875, .777, .552), .9, base=schematic)
    pbr("Radio_Atlas", (.026, .08, .12), .4, base=schematic, emission=(.07, .22, .25))
    pbr("Amber_Glass", (.99, .64, .19), .21, emission=(.95, .39, .045), transmission=.08)
    pbr("Amber_Core", (1, .76, .28), .25, emission=(1, .53, .12))
    pbr("Leaf_Green", (.19, .35, .049), .72, base=leaf)
    pbr("Leaf_Deep", (.056, .155, .027), .75)
    pbr("Leaf_Young", (.35, .48, .075), .72)
    pbr("Hibiscus_Coral", (.89, .07, .105), .72)
    pbr("Hibiscus_Pink", (.94, .22, .30), .72)
    pbr("Soil", (.075, .05, .022), .94)
    pbr("Book_Teal", (.046, .27, .26), .78)
    pbr("Book_Ochre", (.66, .36, .087), .79)


def plane_uv(points, normal, grain="X", phase=0):
    # Endgrain projects its own face, never along a constant world coordinate.
    dropped = max(range(3), key=lambda axis: abs(normal[axis]))
    axes = [axis for axis in range(3) if axis != dropped]
    preferred = {"X": 0, "Y": 1, "Z": 2}.get(grain, 0)
    if preferred in axes:
        axes.remove(preferred)
        axes.insert(0, preferred)
    return [(point[axes[0]] * .35 + phase, point[axes[1]] * .85) for point in points]


def mesh_object(name, vertices, faces, mat, part="decor", uv=None,
                smooth=False, hull=None, deck=None):
    global SOURCE_TRIANGLES
    if not vertices or not faces or not all(math.isfinite(float(value))
                                           for point in vertices for value in point):
        raise RuntimeError("Invalid finite source mesh: " + name)
    data = bpy.data.meshes.new(PREFIX + name + "_Mesh")
    data.from_pydata([C(point) for point in vertices], [], faces)
    data.update()
    data.calc_loop_triangles()
    layer = data.uv_layers.new(name="UVMap")
    for polygon in data.polygons:
        ids = list(polygon.vertices)
        points = [vertices[index] for index in ids]
        normal = G(polygon.normal)
        coordinates = (uv(points, normal) if callable(uv) else
                       ([uv[index] for index in ids] if uv is not None else plane_uv(points, normal)))
        # Closed-grid side walls and caps need a genuine 2D UV surface too.
        determinants = []
        for index in range(1, len(ids) - 1):
            a, b, c = coordinates[0], coordinates[index], coordinates[index + 1]
            determinants.append(abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])))
        if len(ids)==3 or (determinants and min(determinants) <= 1e-14):
            coordinates = plane_uv(points, normal, phase=(len(name) % 13) * .061)
        polygon.use_smooth = bool(smooth) if smooth != "SIDES" else len(ids) == 4
        for loop_index, coordinate in zip(polygon.loop_indices, coordinates):
            layer.data[loop_index].uv = coordinate
    for triangle in data.loop_triangles:
        a, b, c = (data.vertices[index].co for index in triangle.vertices)
        if (b-a).cross(c-a).length_squared <= 1e-20:
            raise RuntimeError("Zero-area source triangle: " + name)
        a, b, c = (layer.data[index].uv for index in triangle.loops)
        if abs((b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x)) <= 1e-14:
            raise RuntimeError("Zero-area end-face/source UV triangle: " + name)
    SOURCE_TRIANGLES += len(data.loop_triangles)
    if SOURCE_TRIANGLES > TRIANGLE_LIMIT:
        raise RuntimeError("Source exceeds unchanged 165,000-triangle safety budget")
    data.materials.append(MATERIALS[mat])
    obj = bpy.data.objects.new(PREFIX + name, data)
    COLLECTION.objects.link(obj)
    obj.parent = GROUPS[part]
    obj["runtime_group"] = part
    obj["collision_policy"] = "shared_conservative_hull" if hull or deck else "soft_non_solid"
    if hull:
        obj["shared_hull_id"] = hull
    if deck:
        obj["shared_deck_id"] = deck
    return obj


def box(name, center, size, mat, part="shell", bevel=.025, hull=None, deck=None, yaw=0, grain="X"):
    hx, hy, hz = [float(value)/2 for value in size]
    bevel = min(float(bevel), min(hx, hy, hz) * .27)
    if bevel <= 0:
        verts = [(-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),
                 (-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)]
        faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(3,7,6,2),(0,4,7,3)]
    else:
        verts, faces = [], []
        for y, inset in ((-hy, bevel),(-hy+bevel,0),(hy-bevel,0),(hy,bevel)):
            x, z, b = hx-inset, hz-inset, bevel
            outline = [(x-b,-z),(x,-z+b),(x,z-b),(x-b,z),
                       (-x+b,z),(-x,z-b),(-x,-z+b),(-x+b,-z)]
            verts.extend((x,y,z) for x,z in outline)
        for row in range(3):
            for side in range(8):
                nxt = (side+1)%8
                faces.append((row*8+side,(row+1)*8+side,(row+1)*8+nxt,row*8+nxt))
        faces.extend((tuple(range(8)), tuple(range(31,23,-1))))
    cosine, sine = math.cos(yaw), math.sin(yaw)
    points = [(center[0]+x*cosine+z*sine, center[1]+y, center[2]-x*sine+z*cosine)
              for x,y,z in verts]
    def mapping(face_points, normal):
        local = [((p[0]-center[0])*cosine-(p[2]-center[2])*sine,
                  p[1]-center[1],(p[0]-center[0])*sine+(p[2]-center[2])*cosine)
                 for p in face_points]
        n = (normal[0]*cosine-normal[2]*sine,normal[1],normal[0]*sine+normal[2]*cosine)
        return plane_uv(local,n,grain,(len(name)%19)*.073)
    return mesh_object(name,points,faces,mat,part,mapping,False,hull,deck)


def lathe(name, center, profile, mat, part="decor", sides=32, hull=None):
    if len(profile)<2 or any(radius <= 0 for _,radius in profile):
        raise RuntimeError("Lathe must use positive rings and separate single-point caps")
    vertices, faces, uv = [], [], []
    for row,(height,radius) in enumerate(profile):
        for side in range(sides):
            phi=math.tau*side/sides
            vertices.append((center[0]+radius*math.cos(phi),center[1]+height,center[2]+radius*math.sin(phi)))
            uv.append((side/sides,height*.45))
    for row in range(len(profile)-1):
        for side in range(sides):
            nxt=(side+1)%sides
            faces.append((row*sides+side,(row+1)*sides+side,(row+1)*sides+nxt,row*sides+nxt))
    first,last=len(vertices),len(vertices)+1
    vertices.extend(((center[0],center[1]+profile[0][0],center[2]),
                     (center[0],center[1]+profile[-1][0],center[2])))
    uv.extend(((.5,.5),(.5,.5)))
    for side in range(sides):
        nxt=(side+1)%sides
        faces.extend(((first,side,nxt),(last,(len(profile)-1)*sides+nxt,(len(profile)-1)*sides+side)))
    return mesh_object(name,vertices,faces,mat,part,uv,"SIDES",hull)


def cylinder(name, center, radius, height, mat, part="decor", sides=24, hull=None):
    return lathe(name,center,[(-height/2,radius),(height/2,radius)],mat,part,sides,hull)


def tube(name, points, radii, mat, part="decor", sides=8, hull=None):
    points=[Vector(point) for point in points]
    if len(points)<2 or len(points)!=len(radii) or min(radii)<=0:
        raise RuntimeError("Invalid positive-radius sweep: "+name)
    vertices,faces,uv=[],[],[]
    frame=previous=None
    for row,point in enumerate(points):
        tangent=points[min(row+1,len(points)-1)]-points[max(row-1,0)]
        if tangent.length_squared<1e-14:
            raise RuntimeError("Undefined sweep tangent: "+name)
        tangent.normalize()
        if frame is None:
            ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((0,0,1))
            frame=tangent.cross(ref).normalized()
        else:
            # Minimal rotation, not projection (projection flipped old cushion loops).
            axis=previous.cross(tangent)
            if axis.length_squared>1e-16:
                frame=previous.rotation_difference(tangent) @ frame
            elif previous.dot(tangent)<-.999:
                raise RuntimeError("Sweep contains an unauthorable antiparallel cusp")
            frame=(frame-tangent*frame.dot(tangent)).normalized()
        across=tangent.cross(frame).normalized()
        for side in range(sides):
            phi=math.tau*side/sides
            vertices.append(tuple(point+(frame*math.cos(phi)+across*math.sin(phi))*radii[row]))
            uv.append((side/sides,row/(len(points)-1)))
        previous=tangent.copy()
    for row in range(len(points)-1):
        for side in range(sides):
            nxt=(side+1)%sides
            faces.append((row*sides+side,row*sides+nxt,(row+1)*sides+nxt,(row+1)*sides+side))
    first,last=len(vertices),len(vertices)+1
    vertices.extend((tuple(points[0]),tuple(points[-1])))
    uv.extend(((.5,.5),(.5,.5)))
    for side in range(sides):
        nxt=(side+1)%sides
        faces.extend(((first,nxt,side),(last,(len(points)-1)*sides+side,(len(points)-1)*sides+nxt)))
    return mesh_object(name,vertices,faces,mat,part,uv,"SIDES",hull)


def beam(name, start, end, width, depth, mat="Honey_Timber",part="shell"):
    start,end=Vector(start),Vector(end)
    direction=(end-start).normalized()
    obj=box(name,(0,0,0),(width,(end-start).length,depth),mat,part,.022,grain="Y")
    obj.rotation_euler=Vector(C(direction)).to_track_quat("Z","Y").to_euler()
    obj.location=C((start+end)/2)
    return obj


def solid_grid(name, rows, cols, sample, outward, thickness, mat, part="decor", smooth=False):
    normal=Vector(outward).normalized()
    vertices,faces,uv=[],[],[]
    for layer in (1,-1):
        for row in range(rows):
            for col in range(cols):
                t,w=row/(rows-1),col/(cols-1)
                vertices.append(tuple(Vector(sample(t,w))+normal*(layer*thickness/2)))
                uv.append((t,w))
    stride=rows*cols
    a,b,c=(Vector(vertices[index]) for index in (0,cols,cols+1))
    reverse=(b-a).cross(c-a).dot(normal)<0
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col
            face=(a,a+cols,a+cols+1,a+1)
            if reverse: face=tuple(reversed(face))
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    perimeter=list(range(cols))+[row*cols+cols-1 for row in range(1,rows)]
    perimeter+=list(range(stride-2,stride-cols-1,-1))+[row*cols for row in range(rows-2,0,-1)]
    for index,a in enumerate(perimeter):
        b=perimeter[(index+1)%len(perimeter)]
        face=(a,b,b+stride,a+stride)
        faces.append(tuple(reversed(face)) if reverse else face)
    return mesh_object(name,vertices,faces,mat,part,uv,smooth)


def ellipsoid(name, center, scale, mat, part="decor", rings=8, sides=16):
    verts,faces,uv=[],[],[]
    for row in range(1,rings):
        phi=math.pi*row/rings
        for side in range(sides):
            theta=math.tau*side/sides
            verts.append((center[0]+scale[0]*math.sin(phi)*math.cos(theta),
                          center[1]+scale[1]*math.cos(phi),
                          center[2]+scale[2]*math.sin(phi)*math.sin(theta)))
            uv.append((side/sides,row/rings))
    for row in range(rings-2):
        for side in range(sides):
            nxt=(side+1)%sides
            faces.append((row*sides+side,row*sides+nxt,(row+1)*sides+nxt,(row+1)*sides+side))
    top,bottom=len(verts),len(verts)+1
    verts.extend(((center[0],center[1]+scale[1],center[2]),(center[0],center[1]-scale[1],center[2])))
    uv.extend(((.5,0),(.5,1)))
    for side in range(sides):
        nxt=(side+1)%sides
        faces.extend(((top,nxt,side),(bottom,(rings-2)*sides+side,(rings-2)*sides+nxt)))
    return mesh_object(name,verts,faces,mat,part,uv,True)


def torus(name, center, major, minor, mat, part="decor", normal=(0,1,0), segments=32, sides=8):
    n=Vector(normal).normalized()
    ref=Vector((1,0,0)) if abs(n.x)<.85 else Vector((0,0,1))
    u=n.cross(ref).normalized(); v=n.cross(u).normalized()
    vertices,faces,uv=[],[],[]
    for row in range(segments):
        phi=math.tau*row/segments
        radial=u*math.cos(phi)+v*math.sin(phi)
        point=Vector(center)+radial*major
        for side in range(sides):
            theta=math.tau*side/sides
            vertices.append(tuple(point+(n*math.cos(theta)+radial*math.sin(theta))*minor))
            uv.append((side/sides,row/segments))
    for row in range(segments):
        for side in range(sides):
            nr,ns=(row+1)%segments,(side+1)%sides
            faces.append((row*sides+side,row*sides+ns,nr*sides+ns,nr*sides+side))
    return mesh_object(name,vertices,faces,mat,part,uv,True)


def compass(name, center, radius, normal=(0,0,1), part="decor"):
    n=Vector(normal).normalized(); u=Vector((1,0,0))
    u=(u-n*u.dot(n)).normalized(); v=n.cross(u).normalized()
    torus(name+"_Navigator_Ring",center,radius*.94,.013,"Brass",part,n,40,6)
    vertices,faces=[],[]
    count=32
    for layer in (1,-1):
        for index in range(count):
            phi=math.tau*index/count
            radial=radius*(.84 if index%4==0 else .58 if index%2==0 else .14)
            vertices.append(tuple(Vector(center)+(u*math.cos(phi)+v*math.sin(phi))*radial+n*(layer*.009)))
    first,last=len(vertices),len(vertices)+1
    vertices.extend((tuple(Vector(center)+n*.009),tuple(Vector(center)-n*.009)))
    for index in range(count):
        nxt=(index+1)%count
        faces.extend(((first,index,nxt),(last,count+nxt,count+index),
                      (index,count+index,count+nxt,nxt)))
    mesh_object(name+"_Original_Eight_Point_Rose",vertices,faces,"Brass",part)
    ellipsoid(name+"_Centre_Pin",tuple(Vector(center)+n*.028),(.032,.032,.032),"Brass",part,6,12)


def lantern(name, center, scale=1, part="decor"):
    x,y,z=center
    cylinder(name+"_Metal_Foot",(x,y-.22*scale,z),.18*scale,.075*scale,"Brass",part,16)
    cylinder(name+"_Crown",(x,y+.24*scale,z),.215*scale,.055*scale,"Brass",part,16)
    for dx,dz in ((-.12,-.12),(.12,-.12),(.12,.12),(-.12,.12)):
        tube(name+"_Corner_%s_%s"%(dx,dz),[(x+dx*scale,y-.2*scale,z+dz*scale),
             (x+dx*scale,y+.23*scale,z+dz*scale)],[.014*scale]*2,"Brass",part,6)
    ellipsoid(name+"_Warm_Opaque_Core",center,(.11*scale,.18*scale,.11*scale),"Amber_Core",part,7,16)
    lathe(name+"_Capped_Lid",(x,y+.28*scale,z),[(0,.22*scale),(.075*scale,.12*scale),
          (.12*scale,.025*scale)],"Dark_Iron",part,16)
    torus(name+"_Hanging_Eye",(x,y+.48*scale,z),.067*scale,.014*scale,"Brass",part,(0,0,1),20,6)


def tower_radius(y):
    return 2.27-.025*float(y)


def build_tower():
    hull="contact-lighthouse-tower"
    lathe("Buried_Limestone_Foot",(0,0,0),[(-.12,2.36),(.02,2.36),(.12,2.34),(.39,2.30)],
          "Stone_Shade","shell",64,hull)
    lathe("Continuous_Mortar_Tower",(0,0,0),[(.30,tower_radius(.3)-.015),
          (3.6,tower_radius(3.6)-.015),(7.8,tower_radius(7.8)-.015),
          (10.5,tower_radius(10.5)-.015),(13,tower_radius(13)-.015)],"Mortar","shell",72,hull)
    # Closed subtly chamfered curved blocks. Mortar is a continuous concealed volume.
    for course in range(23):
        low=.40+course*.545
        height=.529
        for block in range(20):
            first=math.tau*(block+(course%2)*.5)/20+.008
            last=first+math.tau/20-.016
            def sample(t,w,low=low,height=height,first=first,last=last):
                phi=first+(last-first)*w
                y=low+height*t
                edge=.018*(abs(2*t-1)**8)+.009*(abs(2*w-1)**8)
                r=tower_radius(y)+.018-edge
                return (r*math.cos(phi),y,r*math.sin(phi))
            mid=(first+last)/2
            material="Terracotta" if 13<=course<=14 else ("Stone_Shade" if (course*7+block)%29==0 else "Cream_Limestone")
            obj=solid_grid("Tower_Course_%02d_Sculpted_Block_%02d"%(course,block),4,6,sample,
                           (math.cos(mid),0,math.sin(mid)),.055,material,"shell",False)
            obj["shared_hull_id"]=hull; obj["collision_policy"]="shared_conservative_hull"
    for height,radius in ((.39,2.33),(12.985,1.97)):
        lathe("Limestone_Cornice_%.2f"%height,(0,height,0),[(0,radius),(.015,radius)],
              "Cream_Limestone","shell",64,hull)
    # The closed non-enterable door matches the solid cylinder, not a fictional interior.
    box("Closed_Tower_Door",(0,1.18,2.294),(1.04,2.12,.027),"Dark_Joinery","shell",.008,hull)
    for index in range(6):
        box("Door_Vertical_Oak_Plank_%d"%index,(-.434+index*.174,1.18,2.315),
            (.159,2.055,.028),"Honey_Timber","shell",.006,hull,grain="Y")
    for side in (-1,1):
        box("Door_Crafted_Frame_%d"%side,(side*.59,1.20,2.292),(.11,2.34,.04),
            "Honey_Timber","shell",.012,hull,grain="Y")
    box("Door_Lintel",(0,2.365,2.282),(1.16,.13,.058),"Honey_Timber","shell",.012,hull)
    ellipsoid("Door_Brass_Handle",(.31,1.10,2.358),(.026,.048,.02),"Brass","decor",6,10)
    for index,height in enumerate((5.7,10.0)):
        front=tower_radius(height)+.024
        box("Tower_Window_%d_Inset_Shadow"%index,(0,height,front),(.72,1.10,.045),"Dark_Joinery","shell",.012,hull)
        box("Tower_Window_%d_Amber_Panes"%index,(0,height,front+.027),(.57,.91,.024),"Amber_Glass","decor",.009)
        for side in (-1,1):
            box("Tower_Window_%d_Jamb_%d"%(index,side),(side*.385,height,front+.053),
                (.13,1.23,.145),"Honey_Timber","shell",.018,hull,grain="Y")
        for side in (-1,1):
            box("Tower_Window_%d_Crosspiece_%d"%(index,side),(0,height+side*.56,front+.066),
                (.91,.11,.17),"Honey_Timber","shell",.016,hull)
        box("Tower_Window_%d_Central_Mullion"%index,(0,height,front+.057),(.042,.96,.06),"Brass","decor",.006)
        box("Tower_Window_%d_Central_Transom"%index,(0,height,front+.058),(.64,.042,.06),"Brass","decor",.006)
    # Gallery parts are deliberately high soft architecture, not upper Rapier floors.
    lathe("Gallery_Structural_Deck",(0,0,0),[(13.0,2.74),(13.08,2.83),(13.23,2.83)],"Honey_Timber","roof",64)
    lathe("Gallery_Terracotta_Fascia",(0,0,0),[(13.12,2.848),(13.27,2.848)],"Terracotta","roof",64)
    for index in range(16):
        phi=math.tau*index/16
        direction=Vector((math.cos(phi),0,math.sin(phi)))
        beam("Gallery_Joined_Corbel_%02d"%index,tuple(direction*1.92+Vector((0,12.61,0))),
             tuple(direction*2.66+Vector((0,13.05,0))),.17,.20,"Honey_Timber","roof")
        x,z=2.71*math.cos(phi),2.71*math.sin(phi)
        lathe("Gallery_Baluster_%02d"%index,(x,13.24,z),[(0,.065),(.08,.085),(.78,.065),(.9,.10)],
              "Honey_Timber","roof",12)
        ellipsoid("Gallery_Brass_Finial_%02d"%index,(x,14.17,z),(.086,.091,.086),"Brass","roof",6,12)
    for height in (13.59,14.03):
        torus("Gallery_Continuous_Railing_%.2f"%height,(0,height,0),2.71,.047,"Brass","roof",segments=64,sides=8)
    lathe("Lantern_Dark_Base",(0,0,0),[(13.25,1.90),(13.36,1.90)],"Dark_Joinery","roof",8)
    for side in range(8):
        phi=math.tau*side/8+math.pi/8
        next_phi=phi+math.tau/8
        first=Vector((1.80*math.cos(phi),0,1.80*math.sin(phi)))
        last=Vector((1.80*math.cos(next_phi),0,1.80*math.sin(next_phi)))
        normal=(first+last).normalized()
        def glass(t,w,first=first,last=last):
            point=first*(1-w)+last*w
            return (point.x,13.44+2.18*t,point.z)
        solid_grid("Lantern_Octagonal_Amber_Panel_%d"%side,3,4,glass,normal,.032,"Amber_Glass","roof",False)
        tube("Lantern_Brass_Mullion_%d"%side,[(first.x,13.32,first.z),(first.x,15.76,first.z)],
             [.058,.058],"Brass","roof",10)
        midpoint=(first+last)/2
        for height in (13.44,14.59,15.66):
            beam("Lantern_Panel_%d_Transom_%.2f"%(side,height),(first.x,height,first.z),
                 (last.x,height,last.z),.048,.052,"Brass","roof")
    ellipsoid("Stationary_Optical_Lamp_Core",(0,14.66,0),(.30,.76,.30),"Amber_Core","interior",12,24)
    for height in (14.14,14.38,14.62,14.86,15.10):
        torus("Optical_Brass_Lens_Band_%.2f"%height,(0,height,0),.38,.018,"Brass","interior",segments=32,sides=6)
    lathe("Lantern_Eave_Ring",(0,0,0),[(15.73,2.13),(15.82,2.13)],"Brass","roof",64)
    roof_profile=[(15.82,2.15),(15.93,2.03),(16.12,1.75),(16.30,1.38),
                  (16.43,.96),(16.54,.48),(16.59,.20)]
    for side in range(8):
        first=math.tau*side/8+math.pi/8
        next_phi=first+math.tau/8
        def roof(t,w,first=first,next_phi=next_phi):
            position=t*(len(roof_profile)-1)
            low=min(len(roof_profile)-2,int(position)); q=position-low
            height=roof_profile[low][0]*(1-q)+roof_profile[low+1][0]*q
            radius=roof_profile[low][1]*(1-q)+roof_profile[low+1][1]*q
            x=math.cos(first)*(1-w)+math.cos(next_phi)*w
            z=math.sin(first)*(1-w)+math.sin(next_phi)*w
            return (x*radius,height+.018*math.sin(math.pi*w),z*radius)
        mid=(first+next_phi)/2
        solid_grid("Lantern_Curved_Terracotta_Roof_Panel_%d"%side,7,5,roof,
                   (math.cos(mid),.75,math.sin(mid)),.048,
                   "Terracotta_Sun" if side%3==0 else "Terracotta","roof",False)
        seam=[(r*math.cos(first),y+.025,r*math.sin(first)) for y,r in roof_profile]
        tube("Lantern_Roof_Rolled_Seam_%d"%side,seam,[.022]*len(seam),"Terracotta_Sun","roof",6)
    ellipsoid("Roof_Crown_Ceramic",(0,16.65,0),(.20,.14,.20),"Terracotta","roof",8,16)
    lathe("Brass_Weather_Finial",(0,0,0),[(16.71,.06),(16.78,.13),(16.93,.115),
          (16.99,.042),(17.23,.010)],"Brass","roof",16)
    # Original violet compass pennant hangs clear of the stone (no coplanar decal).
    tube("Violet_Flag_Crossbar",[(-.78,7.33,2.275),(.78,7.33,2.275)],[.046]*2,"Honey_Timber","decor",10)
    def banner(t,w):
        return ((w-.5)*1.42,7.18-3.48*t+.32*abs(2*w-1)*t**8,
                2.244+.022*math.sin(w*math.tau*2+.5)*math.sin(t*math.pi))
    solid_grid("Original_Violet_Compass_Flag",15,9,banner,(0,0,1),.014,"Violet_Linen","decor",False)
    compass("Flag_Gold_Compass",(0,5.53,2.31),.49)


def build_hut_floor(contract):
    floor=contract["deck"]; deck_id=floor["id"]
    box("Radio_Hut_Structural_Floor",(-5.2,-.1275,2.7),(6.6,.225,4.6),
        "Mortar","shell",0,deck=deck_id)
    for row in range(7):
        for col in range(10):
            x=-8.5+(col+.5)*.66; z=.4+(row+.5)*(4.6/7)
            box("Hut_Floor_Limestone_Paver_%02d_%02d"%(row,col),(x,-.0075,z),
                (.648,.015,4.6/7-.012),"Stone_Shade" if (col+row*3)%11==0 else "Cream_Limestone",
                "shell",.0016,deck=deck_id)
    for hull in contract["hulls"]:
        if hull["role"]=="foundation":
            box(hull["id"]+"_Masonry_Toe",(hull["x"],hull["bottom"]+hull["height"]/2,hull["z"]),
                (hull["width"],hull["height"],hull["depth"]),"Stone_Shade","shell",.014,hull["id"])


def build_hut_shell(contract):
    for hull in contract["hulls"]:
        if hull["role"]=="post":
            x,z=hull["x"],hull["z"]
            box(hull["id"]+"_Mortised_Timber",(x,1.75,z),(.29,3.5,.29),"Honey_Timber","shell",.025,hull["id"],grain="Y")
            for height in (.08,2.9,3.36):
                box(hull["id"]+"_Brass_Collar_%.2f"%height,(x,height,z),(.36,.085,.36),"Brass","shell",.012,hull["id"])
            for height in (.66,2.48):
                ellipsoid(hull["id"]+"_Peg_%.2f"%height,(x, height,z+.162),(.034,.034,.015),"Pale_Endgrain","decor",5,10)
        if hull["role"]=="wall":
            box(hull["id"]+"_Solid_Limestone",(hull["x"],hull["height"]/2,hull["z"]),
                (hull["width"],hull["height"],hull["depth"]),"Cream_Limestone","shell",.009,hull["id"])
    # Rear/side timber strips sit inside their solid wall envelopes, not outside inflated hulls.
    for index in range(15):
        x=-8.18+index*.424
        box("Rear_Wall_Joined_Batten_%02d"%index,(x,1.45,.722),(.074,2.83,.042),"Honey_Timber","shell",.006,
            "contact-hut-back-wall",grain="Y")
    for height in (.18,2.92):
        box("Rear_Wall_Tie_%.2f"%height,(-5.2,height,.72),(5.96,.105,.05),"Honey_Timber","shell",.009,"contact-hut-back-wall")
    for index,z in enumerate((1.08,2.14,3.16)):
        box("West_Wall_Batten_%d"%index,(-8.18,1.43,z),(.034,2.76,.075),"Honey_Timber","shell",.008,
            "contact-hut-west-wall",grain="Y")
    for name,start,end in (("Front_Tie",(-8.37,3.44,4.75),(-2.00,3.44,4.75)),
        ("Back_Tie",(-8.34,3.44,.65),(-1.98,3.44,.65)),
        ("West_Tie",(-8.15,3.44,.41),(-8.15,3.44,4.99)),
        ("East_Wall_Tie",(-2.25,3.44,.65),(-2.25,3.44,4.98))):
        beam(name+"_Handworked_Upper_Beam",start,end,.22,.24,"Honey_Timber","roof")
    for side,x in ((-1,-8.15),(1,-2.25)):
        beam("Front_Scarfed_Knee_Brace_%d"%side,(x,2.66,4.75),(x-side*.60,3.39,4.75),.12,.14,"Honey_Timber","roof")
    beam("Back_West_Joined_Brace",(-8.15,2.67,.65),(-7.42,3.4,.65),.13,.14,"Honey_Timber","roof")
    beam("Tower_To_Hut_Timber_Tie",(-2.25,3.42,.65),(-1.66,3.73,.65),.16,.19,"Honey_Timber","roof")
    # Recessed hut side window on the west face; physically framed, not a raster wall.
    box("Hut_West_Window_Dark_Inset",(-8.37,1.83,2.03),(.036,1.06,.76),"Dark_Joinery","decor",.012)
    box("Hut_West_Window_Amber_Glass",(-8.40,1.83,2.03),(.027,.84,.57),"Amber_Glass","decor",.009)
    for offset in (-1,1):
        box("Hut_West_Window_Jamb_%d"%offset,(-8.4,1.83,2.03+offset*.39),(.13,1.17,.11),"Honey_Timber","decor",.012,grain="Y")
        box("Hut_West_Window_Sill_%d"%offset,(-8.4,1.83+offset*.52,2.03),(.14,.12,.92),"Honey_Timber","decor",.012,grain="Z")


def build_hut_roof():
    cx,cz=-5.2,2.7
    width,half_depth=7.20,2.49
    eave,rise=3.58,1.10
    cols,rows=18,6
    tile_width=width/cols
    for side in (-1,1):
        def bed(t,w,side=side):
            return (cx-width/2+w*width,eave+rise*(1-t),cz+side*half_depth*t)
        solid_grid("Hut_%d_Solid_Timber_Roof_Bed"%side,3,9,bed,(0,.8,side*.4),.095,"Dark_Joinery","roof",False)
        for row in range(rows):
            low=max(0,row/rows-.012)
            high=min(1,(row+1)/rows+.047)
            for col in range(cols):
                x=cx-width/2+(col+.5)*tile_width
                def tile(t,w,side=side,low=low,high=high,x=x,row=row,col=col):
                    along=low+(high-low)*t
                    q=2*w-1
                    arch=.075*math.cos(q*math.pi/2)
                    scallop=.014*math.sin(math.pi*w)**2*math.sin(math.pi*t)
                    return (x+q*tile_width*.489,
                            eave+rise*(1-along)+.104+arch+scallop+row*.0015,
                            cz+side*half_depth*along)
                solid_grid("Hut_%d_Tile_Row_%02d_Column_%02d"%(side,row,col),4,7,tile,
                           (0,.8,side*.4),.027,"Terracotta_Sun" if (row*5+col)%13==0 else "Terracotta","roof",False)
        beam("Hut_%d_Grained_Eave_Fascia"%side,(cx-width/2-.05,eave-.035,cz+side*half_depth),
             (cx+width/2+.05,eave-.035,cz+side*half_depth),.17,.22,"Honey_Timber","roof")
        for index in range(19):
            x=cx-width/2+index*tile_width
            box("Hut_%d_Eave_Handpeg_%02d"%(side,index),(x,eave-.004,cz+side*(half_depth+.12)),
                (.055,.06,.032),"Brass","roof",.008)
    for end in (-1,1):
        x=cx+end*(width/2+.025)
        for side in (-1,1):
            beam("Hut_Gable_%d_%d_Scarfed_Rafter"%(end,side),(x,eave+.018,cz+side*half_depth),
                 (x,eave+rise+.045,cz),.135,.145,"Pale_Endgrain","roof")
    # Separate overlapping ridge cap modules, each closed with curved lip/end faces.
    for col in range(18):
        x=cx-width/2+(col+.5)*tile_width
        def ridge(t,w,x=x):
            angle=-math.pi*.47+w*math.pi*.94
            return (x+(t-.5)*tile_width*1.05,eave+rise+.13+.125*math.cos(angle),
                    cz+.125*math.sin(angle))
        solid_grid("Hut_Curved_Ridge_Cap_%02d"%col,3,9,ridge,(0,1,0),.024,"Terracotta_Sun","roof",False)
    for index in range(8):
        x=cx-3.0+index*.86
        beam("Hut_Exposed_Front_Rafter_Tail_%d"%index,(x,3.46,4.91),(x,3.60,5.27),.10,.125,"Honey_Timber","roof")


def atlas_panel(name, center, size, radio=False, part="interior"):
    obj=box(name,center,size,"Radio_Atlas" if radio else "Map_Atlas",part,.002)
    layer=obj.data.uv_layers.active
    for polygon in obj.data.polygons:
        normal=G(polygon.normal)
        if normal[2]>.9:
            for loop_index in polygon.loop_indices:
                p=G(obj.data.vertices[obj.data.loops[loop_index].vertex_index].co)
                u=(p[0]-center[0])/size[0]+.5
                v=(p[1]-center[1])/size[1]+.5
                layer.data[loop_index].uv=((.53+.44*u,.035+.425*v) if radio else (.025+.45*u,.525+.45*v))
    return obj


def book(name, center, width, height, depth, color, part="interior"):
    x,y,z=center
    box(name+"_Paper_Block",(x,y,z),(width*.84,height*.95,depth*.94),"Paper",part,0)
    for side in (-1,1):
        box(name+"_Cloth_Cover_%d"%side,(x+side*width*.47,y,z),(width*.075,height,depth),color,part,.003)
    box(name+"_Rounded_Spine",(x,y,z+depth*.46),(width,height,depth*.07),color,part,.004,grain="Y")
    for sign in (-1,1):
        box(name+"_Original_Spine_Band_%d"%sign,(x,y+sign*height*.34,z+depth*.507),
            (width*.64,.014,.005),"Brass",part,0)


def cabinet(name, hull, columns=2):
    x,z=hull["x"],hull["z"]
    width,depth,height=hull["width"],hull["depth"],hull["height"]
    hid=hull["id"]
    box(name+"_Plinth",(x,.07,z),(width-.015,.14,depth-.015),"Dark_Joinery","interior",.015,hid)
    for side in (-1,1):
        box(name+"_Crafted_Side_%d"%side,(x+side*(width/2-.055),height/2,z),(.105,height,depth-.018),
            "Honey_Timber","interior",.014,hid,grain="Y")
    box(name+"_Grained_Top",(x,height-.044,z),(width,.088,depth),"Honey_Timber","interior",.014,hid)
    box(name+"_Closed_Rear",(x,height/2,z-depth/2+.035),(width-.16,height-.14,.055),
        "Dark_Joinery","interior",.006,hid)
    for col in range(columns):
        centre=x-width/2+(col+.5)*width/columns
        for row in range(2):
            cy=.17+(height-.25)*(row+.5)/2
            box(name+"_Inset_Drawer_%d_%d"%(col,row),(centre,cy,z+depth/2-.05),
                (width/columns-.115,(height-.25)/2-.035,.07),"Honey_Timber","interior",.010,hid)
            box(name+"_Metal_Handle_%d_%d"%(col,row),(centre,cy+.02,z+depth/2-.007),
                (.13,.032,.012),"Brass","interior",.004,hid)


def bookcase(name, hull):
    x,z,width,depth,height=hull["x"],hull["z"],hull["width"],hull["depth"],hull["height"]
    hid=hull["id"]
    for side in (-1,1):
        box(name+"_Framed_Side_%d"%side,(x+side*(width/2-.035),height/2,z),(.07,height,depth),
            "Honey_Timber","interior",.012,hid,grain="Y")
    box(name+"_Dark_Back",(x,height/2,z-depth/2+.026),(width-.14,height-.06,.052),
        "Dark_Joinery","interior",.007,hid)
    for row in range(6):
        y=.075+row*(height-.15)/5
        box(name+"_Shelf_%d"%row,(x,y,z),(width-.10,.065,depth-.018),"Honey_Timber","interior",.009,hid)
        if row==5: continue
        available=width-.17
        for index in range(6):
            bw=available/6-.009
            bh=.21+.075*((index*3+row)%4)
            bx=x-available/2+(index+.5)*available/6
            book(name+"_Book_%d_%d"%(row,index),(bx,y+.04+bh/2,z+.08),bw,bh,min(.255,depth*.65),
                 ("Violet_Linen","Book_Ochre","Book_Teal")[index%3])


def build_interior(contract):
    by_id={hull["id"]:hull for hull in contract["hulls"]}
    hid="contact-radio-desk"
    # Exact existing station envelope: x=-5,z=3.5,width3,depth1.35,height1.3.
    for side in (-1,1):
        sub={"id":hid,"x":-5+side*1.10,"z":3.5,"width":.64,"depth":1.26,"height":.75}
        cabinet("Radio_Desk_%d_Joinered_Cabinet"%side,sub,1)
    box("Radio_Desk_Unbroken_Oak_Top",(-5,.805,3.5),(3,.10,1.35),"Honey_Timber","interior",.016,hid)
    box("Radio_Desk_Rear_Tool_Shelf",(-5,.975,2.91),(2.8,.075,.17),"Honey_Timber","interior",.009,hid)
    for side in (-1,1):
        box("Radio_Desk_Shelf_Support_%d"%side,(-5+side*1.29,.925,2.91),(.065,.16,.09),
            "Dark_Joinery","interior",.006,hid)
    box("Crafted_Radio_Transceiver",(-5.16,1.068,3.31),(1.04,.43,.42),"Dark_Iron","interior",.027,hid)
    box("Radio_Brass_Faceplate",(-5.16,1.07,3.536),(.962,.357,.022),"Brass","interior",.009,hid)
    atlas_panel("Original_Abstract_Radio_Waveform",(-5.29,1.103,3.554),(.56,.22,.016),True)
    for index in range(3):
        # Face-front knobs are closed round solids, not open zero-area circles.
        torus("Radio_Control_%d_Brass_Bezel"%index,(-4.88,1.165-index*.092,3.555),.034,.010,
              "Brass","interior",(0,0,1),20,6)
        ellipsoid("Radio_Control_%d_Knob"%index,(-4.88,1.165-index*.092,3.579),(.023,.023,.018),
                  "Dark_Iron","interior",6,12)
    for side in (-1,1):
        x=-5+side*1.12
        box("Radio_Speaker_%d_Wood_Casing"%side,(x,1.07,3.23),(.31,.43,.32),"Honey_Timber","interior",.019,hid)
        for row in range(8):
            box("Radio_Speaker_%d_Grille_%d"%(side,row),(x,.905+row*.047,3.405),(.23,.017,.015),
                "Dark_Iron","interior",.002)
    for index in range(3):
        x=-6.04+index*.26
        book("Desk_Pocket_Manual_%d"%index,(x,.915,3.835),.09,.11,.23,
             ("Book_Ochre","Book_Teal","Violet_Linen")[index])
    # Stool stays entirely inside the same conservative station hull.
    cylinder("Desk_Tucked_Stool_Seat",(-5,.46,4.0),.13,.072,"Honey_Timber","interior",24,hid)
    for index in range(3):
        phi=math.tau*index/3
        tube("Desk_Tucked_Stool_Leg_%d"%index,[(-5+.10*math.cos(phi),.005,4+.10*math.sin(phi)),
             (-5+.075*math.cos(phi),.445,4+.075*math.sin(phi))],[.023,.022],"Honey_Timber","interior",8,hid)
    cabinet("Rear_Radio_Counter",by_id["contact-rear-console"],4)
    for name in ("west","east"):
        bookcase("Open_%s_Nautical_Bookcase"%name,by_id["contact-bookcase-"+name])
    atlas_panel("Rear_Illustrative_Nautical_Chart",(-5.45,1.96,.789),(1.64,1.03,.026))
    for dx in (-1,1):
        box("Chart_Handworked_Side_Frame_%d"%dx,(-5.45+dx*.875,1.96,.792),(.10,1.18,.085),
            "Honey_Timber","interior",.013,grain="Y")
    for dy in (-1,1):
        box("Chart_Handworked_Cross_Frame_%d"%dy,(-5.45,1.96+dy*.574,.792),(1.79,.105,.085),
            "Honey_Timber","interior",.013)
    compass("Interior_Cartographic_Compass",(-3.87,1.99,.838),.30,part="interior")
    for index in range(5):
        height=.038+index*.041
        box("Counter_Small_Original_Notebook_%d"%index,(-6.42,.90+height,1.16),(.48,.035,.31),
            "Paper" if index%2 else "Book_Ochre","interior",.004)
    cylinder("Desk_Ivory_Mug",(-3.85,.922,3.86),.070,.145,"Ivory_Linen","interior",20)
    torus("Desk_Mug_Handle",(-3.759,.941,3.86),.041,.012,"Ivory_Linen","interior",(0,0,1),20,6)
    lantern("Hut_Interior_Warm_Lamp_West",(-7.44,2.90,1.24),.66,"interior")
    lantern("Hut_Interior_Warm_Lamp_East",(-3.30,2.86,1.28),.60,"interior")
    for index,x in enumerate((-7.57,-3.0)):
        beam("Front_Lantern_Grained_Bracket_%d"%index,(x,3.43,4.78),(x,3.31,5.13),.058,.064,"Honey_Timber","roof")
        lantern("Hut_Front_Exterior_Lantern_%d"%index,(x,2.90,5.13),.82)


def dish(name, center, diameter, normal, part="roof"):
    n=Vector(normal).normalized()
    ref=Vector((1,0,0)) if abs(n.x)<.85 else Vector((0,0,1))
    u=n.cross(ref).normalized(); v=n.cross(u).normalized()
    radius=diameter/2; depth=diameter*.16; sides=32; rows=5
    vertices,faces=[],[]
    for layer in (1,-1):
        for row in range(1,rows+1):
            q=row/rows
            for side in range(sides):
                phi=math.tau*side/sides
                radial=u*math.cos(phi)+v*math.sin(phi)
                vertices.append(tuple(Vector(center)+radial*(radius*q)+n*(depth*q*q+layer*.017)))
    stride=rows*sides
    for row in range(rows-1):
        for side in range(sides):
            nxt=(side+1)%sides
            face=(row*sides+side,(row+1)*sides+side,(row+1)*sides+nxt,row*sides+nxt)
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    a,b=len(vertices),len(vertices)+1
    vertices.extend((tuple(Vector(center)+n*.017),tuple(Vector(center)-n*.017)))
    for side in range(sides):
        nxt=(side+1)%sides
        faces.extend(((a,side,nxt),(b,stride+nxt,stride+side),
                      ((rows-1)*sides+side,stride+(rows-1)*sides+side,
                       stride+(rows-1)*sides+nxt,(rows-1)*sides+nxt)))
    mesh_object(name+"_Closed_Parabolic_Bowl",vertices,faces,"Cream_Limestone",part,smooth=False)
    torus(name+"_Rolled_Brass_Rim",tuple(Vector(center)+n*depth),radius,.024,"Brass",part,n,40,8)
    focus=Vector(center)+n*(depth+.27*diameter)
    for index in range(3):
        phi=math.tau*index/3
        start=Vector(center)+(u*math.cos(phi)+v*math.sin(phi))*(radius*.79)+n*(depth*.64)
        tube(name+"_Feed_Bracket_%d"%index,[tuple(start),tuple(focus)],[.012,.012],"Dark_Iron",part,6)
    ellipsoid(name+"_Feed",tuple(focus),(.056,.056,.056),"Brass",part,6,12)


def build_radio_mast():
    x,z=-5.08,2.67
    box("Mast_Roof_Socket",(x,4.86,z),(.34,.27,.35),"Dark_Iron","roof",.024)
    tube("Mast_Crafted_Timber_Centre",[(x,4.79,z),(x,7.47,z)],[.12,.080],"Honey_Timber","roof",12)
    for side in (-1,1):
        tube("Mast_Side_Steel_Upright_%d"%side,[(x+side*.20,4.79,z),(x+side*.14,7.4,z)],
             [.025,.023],"Dark_Iron","roof",8)
    for height in (5.02,5.65,6.28,6.91):
        box("Mast_Joined_Cross_Bracket_%.2f"%height,(x,height,z),(.55,.09,.16),"Brass","roof",.014)
    tube("Mast_Main_Antenna",[(x,7.35,z),(x,8.21,z)],[.029,.016],"Dark_Iron","roof",10)
    ellipsoid("Mast_Red_Ceramic_Beacon",(x,8.245,z),(.080,.083,.080),"Hibiscus_Coral","roof",7,16)
    tube("Mast_Secondary_Antenna",[(x+.37,5.38,z),(x+.37,7.63,z)],[.026,.016],"Dark_Iron","roof",8)
    ellipsoid("Mast_Secondary_Beacon",(x+.37,7.68,z),(.069,.075,.069),"Hibiscus_Coral","roof",7,16)
    for sign,height in ((-1,6.72),(1,5.80)):
        tube("Mast_Dish_Bracket_%d"%sign,[(x,height,z),(x+sign*.49,height,z)],[.025,.025],"Brass","roof",8)
        dish("Mast_Communications_Dish_%d"%sign,(x+sign*.55,height,z),.39,(sign*.77,.15,.61))
    # Single larger rooftop dish, with a crafted tripod and no duplicated gameplay mechanism.
    centre=(-6.76,5.13,2.34)
    for index in range(3):
        phi=math.tau*index/3
        beam("Main_Dish_Tripod_%d"%index,(-6.76+.26*math.cos(phi),4.70,2.34+.26*math.sin(phi)),
             centre,.053,.061,"Dark_Iron","roof")
    dish("Main_Rooftop_Radio_Dish",centre,1.26,(-.21,.58,.79))
    for index in range(3):
        xx=x+(index-1)*.078
        tube("Mast_Tied_Communication_Cable_%d"%index,[(xx,6.94,z+.105),(xx,5.21,z+.18),
             (xx-.10,4.83,z+.25)],[.011,.011,.011],"Dark_Iron","roof",6)


def leaf(name, origin, direction, normal, length, material="Leaf_Green"):
    origin,direction,normal=Vector(origin),Vector(direction).normalized(),Vector(normal)
    normal-=direction*normal.dot(direction); normal.normalize()
    across=normal.cross(direction).normalized()
    def sample(t,w):
        q=2*w-1
        width=length*(.013+.265*math.sin(math.pi*t)**.82)
        bend=.085*math.sin(math.pi*t)-.022*t*t
        bowl=.025*q*q*math.sin(math.pi*t)
        return origin+direction*(length*t)+across*(width*q)+normal*(length*(bend-bowl))
    return solid_grid(name,5,5,sample,normal,.012,material,"decor",False)


def hibiscus(name, center, normal, radius=.22, phase=0):
    n=Vector(normal).normalized(); u=Vector((1,0,0))
    if abs(n.dot(u))>.9: u=Vector((0,0,1))
    u=(u-n*u.dot(n)).normalized(); v=n.cross(u).normalized()
    for index in range(5):
        phi=phase+math.tau*index/5
        radial=u*math.cos(phi)+v*math.sin(phi); across=n.cross(radial)
        def petal(t,w,radial=radial,across=across):
            q=2*w-1
            width=radius*(.009+.47*math.sin(math.pi*t)**.72)
            return Vector(center)+radial*(radius*(.05+.97*t))+across*(width*q)+n*(radius*(.20*math.sin(math.pi*t)-.06*q*q))
        solid_grid(name+"_Curved_Petal_%d"%index,5,5,petal,n,.010,
                   "Hibiscus_Coral" if index%3 else "Hibiscus_Pink","decor",False)
    tube(name+"_Attached_Stamen",[center,tuple(Vector(center)+n*radius*.43)],
         [.013,.009],"Book_Ochre","decor",8)
    for index in range(3):
        tip=Vector(center)+n*radius*.48+u*((index-1)*.018)
        ellipsoid(name+"_Golden_Anther_%d"%index,tuple(tip),(.017,.016,.017),"Book_Ochre","decor",5,8)


def vine(name, points, leaves_per_segment=5, scale=.55, flowers=()):
    points=[Vector(point) for point in points]
    tube(name+"_Continuous_Attached_Stem",[tuple(point) for point in points],
         [.020]*len(points),"Leaf_Deep","decor",6)
    for segment in range(len(points)-1):
        a,b=points[segment],points[segment+1]
        for index in range(leaves_per_segment):
            t=(index+.5)/leaves_per_segment
            anchor=a*(1-t)+b*t
            side=1 if (segment+index)%2 else -1
            radial=Vector((side*.73,.22,.32))
            direction=(radial+Vector((.12*math.sin(segment+index),.35,0))).normalized()
            normal=Vector((.12,.13,1))
            end=anchor+direction*.105
            tube(name+"_Petiole_%d_%d"%(segment,index),[tuple(anchor),tuple(end)],[.011,.008],"Leaf_Deep","decor",6)
            leaf(name+"_Sculpted_Leaf_%d_%d"%(segment,index),tuple(end),direction,normal,
                 scale*(.75+.21*((index+segment)%3)),("Leaf_Green","Leaf_Deep","Leaf_Young")[(segment+index)%3])
    for index in flowers:
        anchor=points[index]
        hibiscus(name+"_Attached_Hibiscus_%d"%index,tuple(anchor+Vector((.05,.02,.095))),(.10,.15,1),.23,index*.61)


def build_botanical_edges(contract):
    for hull in contract["hulls"]:
        if not hull["id"].startswith("contact-pot-"): continue
        x,z,r,height= hull["x"],hull["z"],hull["radius"],hull["height"]
        lathe(hull["id"]+"_Crafted_Terracotta",(x,0,z),[(0,r*.68),(.045,r*.73),
              (height*.88,r*.91),(height*.94,r),(height,r),(height,r*.84),(height-.14,r*.83)],
              "Terracotta","decor",24,hull["id"])
        cylinder(hull["id"]+"_Dark_Soil",(x,height-.035,z),r*.80,.035,"Soil","decor",24)
        for index in range(9):
            phi=math.tau*index/9
            origin=(x,height-.024,z)
            direction=(math.cos(phi)*.71,.53,math.sin(phi)*.71)
            normal=(math.cos(phi)*.5,-.2,math.sin(phi)*.5)
            leaf(hull["id"]+"_Fan_Leaf_%d"%index,origin,direction,normal,.56,
                 "Leaf_Young" if index%3==0 else "Leaf_Green")
    # The central front desk approach remains clear: greenery lives on posts/edges/rear.
    vine("West_Front_Post_Ivy",[(-8.28,.72,4.79),(-8.28,1.58,4.81),(-8.20,2.46,4.85),
         (-8.17,3.31,4.84),(-7.46,3.59,4.91)],5,.46,(1,3))
    vine("West_Rear_Roof_Fern",[(-8.26,.65,.49),(-8.26,1.50,.50),(-8.29,2.42,.52),
         (-8.43,3.35,.61),(-7.76,3.61,.58),(-6.93,3.65,.57)],5,.54,(1,3))
    vine("Front_Left_Eave_Climber",[(-8.30,3.57,5.09),(-7.67,3.64,5.10),
         (-7.06,3.65,5.09),(-6.58,3.62,5.09)],4,.37,(1,))
    vine("Front_Right_Eave_Climber",[(-3.57,3.64,5.10),(-2.96,3.64,5.09),
         (-2.29,3.57,5.04),(-2.24,2.79,4.87)],4,.41,(1,))
    for variant,phase in enumerate((2.36,2.63)):
        points=[]
        for index in range(10):
            y=1.55+index*1.01
            phi=phase+.095*math.sin(index*.8)
            r=tower_radius(y)+.09
            points.append((r*math.cos(phi),y,r*math.sin(phi)))
        vine("Tower_Attached_Ivy_%d"%variant,points,4,.43,(1,4,7) if variant==0 else (2,6))
    # Rearward broad leaves attach to the wall; no palm, island or world-scale props duplicated.
    for index in range(12):
        x=-8.29+.047*(index%3); z=.59+index*.198
        leaf("Hut_West_Broadleaf_Border_%02d"%index,(x,.24,z),(-.64,.62,.10),(-.15,.25,1),
             .76+.075*(index%3),"Leaf_Deep" if index%3 else "Leaf_Green")


def initialize_scene():
    global COLLECTION, PREVIEW_COLLECTION
    if bpy.data.objects.get(ROOT_NAME) is not None:
        raise RuntimeError("This initial recipe already exists; use a guarded differential, never overwrite")
    COLLECTION=bpy.data.collections.new(COLLECTION_NAME)
    PREVIEW_COLLECTION=bpy.data.collections.new(PREVIEW_COLLECTION_NAME)
    bpy.context.scene.collection.children.link(COLLECTION)
    bpy.context.scene.collection.children.link(PREVIEW_COLLECTION)
    root=bpy.data.objects.new(ROOT_NAME,None)
    COLLECTION.objects.link(root)
    root["units"]="metres"
    root["asset_id"]="contact-lighthouse-v1"
    root["foot_origin_gltf"]=[0,0,0]
    root["reference_led_original_geometry"]=True
    root["automatic_multiview_reconstruction"]=False
    for part in ("shell","roof","interior","decor"):
        group=bpy.data.objects.new("Lighthouse_"+part,None)
        COLLECTION.objects.link(group)
        group.parent=root
        group["runtime_group"]=part
        GROUPS[part]=group
    return root


def audit_actual_source(contract):
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    by_id={hull["id"]:hull for hull in contract["hulls"]}
    floor=contract["deck"]
    all_min=np.array([np.inf]*3); all_max=np.array([-np.inf]*3)
    hull_points={name:[] for name in by_id}
    deck_points=[]
    triangles=vertices=normal_candidates=zero_uv=0
    pair_counts={}
    batches=set()
    by_mesh=[]
    for obj in sorted(COLLECTION.objects,key=lambda item:item.name):
        if obj.type!="MESH": continue
        evaluated=obj.evaluated_get(deps); data=evaluated.to_mesh()
        try:
            data.calc_loop_triangles()
            triangles+=len(data.loop_triangles); vertices+=len(data.vertices)
            points=np.asarray([G(obj.matrix_world@vertex.co) for vertex in data.vertices],dtype=np.float64)
            if not np.all(np.isfinite(points)):
                raise RuntimeError("Non-finite evaluated positions: "+obj.name)
            all_min=np.minimum(all_min,points.min(axis=0)); all_max=np.maximum(all_max,points.max(axis=0))
            if "shared_hull_id" in obj:
                hid=obj["shared_hull_id"]
                if hid not in hull_points: raise RuntimeError("Unknown actual solid owner: "+hid)
                hull_points[hid].extend(points.tolist())
            if "shared_deck_id" in obj:
                if obj["shared_deck_id"]!=floor["id"]: raise RuntimeError("Unknown source floor")
                deck_points.extend(points.tolist())
            if not data.uv_layers or not hasattr(data,"corner_normals"):
                raise RuntimeError("Actual UV and Blender 5.2 corner-normal data are required")
            layer=data.uv_layers.active; corners=data.corner_normals
            if len(corners)!=len(data.loops): raise RuntimeError("Invalid actual corner normals")
            edges={}; volume=0.0; mesh_candidates=0
            for polygon in data.polygons:
                ids=list(polygon.vertices)
                for index,a in enumerate(ids):
                    b=ids[(index+1)%len(ids)]
                    edges.setdefault((min(a,b),max(a,b)),[]).append(1 if a<b else -1)
            if any(len(uses)!=2 or sum(uses)!=0 for uses in edges.values()):
                raise RuntimeError("Open/inconsistently wound source solid: "+obj.name)
            normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
            for triangle in data.loop_triangles:
                a,b,c=(obj.matrix_world@data.vertices[index].co for index in triangle.vertices)
                face=(b-a).cross(c-a)
                if face.length_squared<=1e-20:
                    raise RuntimeError("Near-zero evaluated face: "+obj.name)
                volume+=a.dot(b.cross(c))/6
                normals=sum((normal_matrix@corners[index].vector for index in triangle.loops),Vector())
                if not all(math.isfinite(value) for value in normals) or normals.length_squared<=1e-20:
                    raise RuntimeError("Invalid evaluated average normals: "+obj.name)
                dot=face.normalized().dot(normals.normalized())
                if dot<-.05: normal_candidates+=1; mesh_candidates+=1
                uvs=[layer.data[index].uv for index in triangle.loops]
                if not all(math.isfinite(value) for uv in uvs for value in uv):
                    raise RuntimeError("Non-finite actual UVs: "+obj.name)
                a,b,c=uvs
                det=abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))
                if det<=1e-14:
                    zero_uv+=1
                    raise RuntimeError("Actual degenerate end-face UVs: "+obj.name)
            if volume<=1e-12:
                raise RuntimeError("Source is inverted/non-volumetric: "+obj.name)
            for material in data.materials:
                if material:
                    if not material.use_backface_culling: raise RuntimeError("Double-sided hiding is prohibited")
                    batches.add((obj["runtime_group"],material.name))
            by_mesh.append({"name":obj.name,"triangles":len(data.loop_triangles),
                            "normalOppositionCandidates":mesh_candidates})
        finally:
            evaluated.to_mesh_clear()
    if triangles>TRIANGLE_LIMIT or len(batches)>60:
        raise RuntimeError("Actual source/compatible aggregate bucket safety exceeded: %s"%((triangles,len(batches)),))
    if len(TEXTURES)!=8 or any(not image.packed_file or tuple(image.size)!=(512,512) for image in TEXTURES):
        raise RuntimeError("Exactly eight packed portable 512-pixel images are required")
    hard_bounds={}; max_excess=0
    for name,hull in by_id.items():
        if not hull_points[name]: raise RuntimeError("Proposed hull has no matching visible hard geometry: "+name)
        points=np.asarray(hull_points[name])
        vertical=np.maximum(hull["bottom"]-points[:,1],points[:,1]-(hull["bottom"]+hull["height"]))
        if hull["kind"]=="cylinder":
            horizontal=np.hypot(points[:,0]-hull["x"],points[:,2]-hull["z"])-hull["radius"]
        else:
            horizontal=np.maximum(np.abs(points[:,0]-hull["x"])-hull["width"]/2,
                                  np.abs(points[:,2]-hull["z"])-hull["depth"]/2)
        excess=max(0.0,float(vertical.max()),float(horizontal.max()))
        max_excess=max(max_excess,excess)
        if excess>2e-6: raise RuntimeError("Actual hard geometry exceeds proposed hull %s by %.9fm"%(name,excess))
        hard_bounds[name]={"vertices":len(points),"minimum":points.min(axis=0).tolist(),
                           "maximum":points.max(axis=0).tolist(),"maximumHullExcess":excess}
    points=np.asarray(deck_points)
    if not len(points): raise RuntimeError("The small hut floor is missing")
    excess=max(0.0,float(np.max(np.abs(points[:,0]-floor["x"])-floor["width"]/2)),
               float(np.max(np.abs(points[:,2]-floor["z"])-floor["depth"]/2)),
               float(np.max(floor["bottom"]-points[:,1])),float(np.max(points[:,1]-floor["walkingTop"])))
    if excess>2e-6: raise RuntimeError("Actual floor exceeds its only support envelope")
    if all_min[1]<-.500002 or all_max[1]>17.300002:
        raise RuntimeError("Asset foot/apex exceeded the declared local height contract")
    if normal_candidates:
        candidates=[item for item in by_mesh if item["normalOppositionCandidates"]]
        raise RuntimeError("Review/fix actual source normal opposition, never hide it: "+json.dumps(candidates))
    return {"actualMeshes":len(by_mesh),"actualTriangles":triangles,"actualVertices":vertices,
            "predictedMaterialGroupBuckets":len(batches),"materials":len(MATERIALS),"packedImages":len(TEXTURES),
            "minimum":all_min.tolist(),"maximum":all_max.tolist(),"hardBounds":hard_bounds,
            "maximumHardHullExcess":max_excess,"floorBounds":{"minimum":points.min(axis=0).tolist(),
            "maximum":points.max(axis=0).tolist()},"nearZeroAreaFaces":0,"degenerateUVTriangles":zero_uv,
            "normalOppositionCandidates":normal_candidates,"closedOutwardSources":True}


def setup_preview():
    scene=bpy.context.scene
    try:
        scene.render.engine="BLENDER_EEVEE"
    except (TypeError,ValueError) as error:
        raise RuntimeError("Blender 5.2 BLENDER_EEVEE is required") from error
    scene.render.resolution_x=1920; scene.render.resolution_y=1080
    scene.render.resolution_percentage=65
    scene.render.image_settings.file_format="PNG"
    for transform in ("Khronos PBR Neutral","AgX","Standard"):
        try:
            scene.view_settings.view_transform=transform
            break
        except (TypeError,ValueError): pass
    scene.view_settings.exposure=0; scene.view_settings.gamma=1
    if scene.world is None: scene.world=bpy.data.worlds.new(PREFIX+"Preview_World")
    scene.world.use_nodes=True
    background=scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value=(.69,.77,.85,1)
    background.inputs["Strength"].default_value=.43
    camera_data=bpy.data.cameras.new(PREFIX+"Preview_Camera_Data")
    camera=bpy.data.objects.new(PREFIX+"Preview_Camera_Excluded_From_Asset",camera_data)
    PREVIEW_COLLECTION.objects.link(camera)
    camera.location=C((-23,14.2,31))
    camera.rotation_euler=(Vector(C((-2.7,7.5,1.05)))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera_data.lens=52; scene.camera=camera
    specs=(("Warm_Daylight_Key","SUN",(-12,24,15),2.25,(1,.86,.69),0),
           ("Broad_Sky_Fill","POINT",(11,18,9),1500,(.69,.81,1),3.8),
           ("Rear_Bounced_Warmth","POINT",(-6,12,-9),1050,(1,.75,.49),2.8),
           ("Radio_Interior_Practical","POINT",(-5.3,2.80,2.48),55,(1,.58,.25),.45),
           ("Lighthouse_Optical_Practical","POINT",(0,14.6,0),65,(1,.56,.19),.5))
    for name,kind,position,energy,color,size in specs:
        data=bpy.data.lights.new(PREFIX+name+"_Preview_Data",kind)
        data.energy=energy; data.color=color
        if kind=="SUN": data.angle=math.radians(9)
        elif kind=="POINT": data.shadow_soft_size=size
        obj=bpy.data.objects.new(PREFIX+name+"_Preview_Only",data)
        PREVIEW_COLLECTION.objects.link(obj); obj.location=C(position)
        if kind!="POINT":
            obj.rotation_euler=(Vector(C((-2.0,6.0,1.5)))-obj.location).to_track_quat("-Z","Y").to_euler()
    for obj in PREVIEW_COLLECTION.objects: obj["preview_only"]=True
    scene.unit_settings.system="METRIC"; scene.unit_settings.scale_length=1


def build_asset():
    contract=json.loads(CONTRACT_JSON)
    if len(contract["hulls"])!=18 or contract["deck"]["walkingTop"]!=0:
        raise RuntimeError("The agreed small hut/18-solid proposal is required")
    root=initialize_scene()
    make_materials()
    build_tower()
    build_hut_floor(contract)
    build_hut_shell(contract)
    build_hut_roof()
    build_interior(contract)
    build_radio_mast()
    build_botanical_edges(contract)
    audit=audit_actual_source(contract)
    root["proposed_solid_contract_json"]=json.dumps(contract,separators=(",",":"))
    root["contract_status"]="PROPOSED native geometry; runtime approval is a separate map/physics contract"
    root["native_geometry_audit_json"]=json.dumps(audit,separators=(",",":"))
    root["factual_boundary"]=contract["factualBoundary"]
    setup_preview()
    return {"recipe":"contact-lighthouse-v1-original-reference-led",
            "root":ROOT_NAME,"groups":[group.name for group in GROUPS.values()],
            "audit":audit,"proposedContract":contract,
            "referenceStatus":"Original user Contact drawing + new 4K modelling sheet, not automatic reconstruction",
            "scope":"Native source only; actual exported GLB/native raster/aggregate/runtime review still required",
            "filesWritten":0,"networkRequests":0,"rendersPerformed":0,"runtimeMutations":0}


result=build_asset()
