"""Reference-led digital workshop, standalone Blender 5.2 authoring script.

Dedicated asset project only; the caller owns project/revision guards and export.
Original metre-scale meshes, packed portable PBR, four separable semantic groups.
No network, external images, text, screenshots, cannon, island or upstairs floor.
Blender (X,Y,Z) becomes glTF (X,Z,-Y); floor walking top is Blender Z=0.
Requires bpy/numpy/mathutils and the worker's artifacts file registry.
"""

import bpy
import json
import math
import random
import numpy as np
from mathutils import Vector


PREFIX = "Workshop_"
ROOT_NAME = "DigitalWorkshop_V1_Origin_At_Deck_Centre"
COLLECTION_NAME = "DigitalWorkshop_V1_Editable_Asset"
PREVIEW_NAME = "workshop-v1-eevee.png"
TRIANGLE_BUDGET = 180_000
TEXTURE_DIMENSION_MAX = 512
SEED = 271005
GROUPS, MATERIALS, TEXTURES = {}, {}, []
COLLECTION = None

# Exact local glTF XZ contract; only the coordinate conversion happens in bpy.
POSTS = [
    ("back-0", -13.8, -10.8, 6.4), ("back-1", -6.9, -10.8, 8.1),
    ("back-2", 0, -10.8, 9.4), ("back-3", 6.9, -10.8, 8.2),
    ("back-4", 13.8, -10.8, 6.6), ("left-middle", -13.8, -3, 6.2),
    ("right-middle", 13.8, -3, 6.3), ("left-front", -13.8, 9.8, 5.2),
    ("right-front", 13.8, 9.8, 5.4),
]
STATIONS = [(-9, 2), (-5, -4), (2, -4), (9, -2), (10, 6)]
STOOLS = [(-10.5, 3.4), (-6.5, -2.6), (3.5, -2.6), (10.5, -0.6), (11.5, 7.4)]
LIBRARIES = [(-9, -10.1), (9, -10.1)]
POTS = [("back-left", -13, -9), ("back-right", 13, -9),
        ("front-left", -13, 8), ("front-right", 13, 8)]


def contract():
    def hull(name, role, x, z, width, depth, bottom, height, radius=None):
        value = {"id": name, "role": role, "kind": "cylinder" if radius else "box",
                 "x": x, "z": z, "width": width, "depth": depth,
                 "bottom": bottom, "height": height, "yaw": 0}
        if radius is not None:
            value["radius"] = radius
        return value
    hulls = [hull("workshop-post-" + name, "post", x, z, .54, .54, 0, h)
             for name, x, z, h in POSTS]
    hulls += [hull("workshop-wall-back-" + side, "wall", x, -11.2, 10, .20, .08, 3.3)
              for side, x in (("left", -7.5), ("right", 7.5))]
    hulls += [hull("projects-%d-station" % i, "furniture", x, z, 4.4, 1.35, 0, 1.3)
              for i, (x, z) in enumerate(STATIONS)]
    hulls += [hull("workshop-library-" + side, "furniture", x, z, 3.8, .72, .08, 3.3)
              for side, (x, z) in zip(("left", "right"), LIBRARIES)]
    hulls += [hull("workshop-stool-%d" % i, "furniture", x, z, .84, .84, 0, .95)
              for i, (x, z) in enumerate(STOOLS)]
    hulls += [hull("workshop-pot-" + name, "furniture", x, z, .9, .9, 0, .80, .45)
              for name, x, z in POTS]
    return {
        "asset": "digital-workshop-v1", "root": ROOT_NAME, "units": "metres",
        "axes": "Local glTF Y-up; Blender(X,Y,Z) -> glTF(X,Z,-Y)",
        "anchor": {"island": "projects", "x": -16, "y": 18.06, "z": -38, "yaw": 0},
        "deck": {"id": "workshop-deck", "x": 0, "z": 0, "width": 30, "depth": 24,
                 "bottom": -.24, "height": .24, "walkingTop": 0, "yaw": 0},
        "runtimeGroups": ["shell", "roof", "interior", "decor"],
        "hulls": hulls,
        "stations": [{"id": "projects-%d" % i, "x": x, "z": z,
                      "width": 4.4, "depth": 1.35, "height": 1.3,
                      "approach": {"x": x, "z": round(z + 3.1, 4)}}
                     for i, (x, z) in enumerate(STATIONS)],
        "nonSolid": ["cloth", "leaves", "vines", "lamps", "books", "screen diagrams"],
        "noUpperWalkingFloors": True,
        "status": "Authoring annotations, not automatically exported Rapier colliders",
    }


def rgba(rgb):
    return np.concatenate((np.clip(rgb, 0, 1), np.ones((*rgb.shape[:2], 1))), axis=2)


def packed_image(name, pixels, non_color=False):
    if max(pixels.shape[:2]) > TEXTURE_DIMENSION_MAX:
        raise RuntimeError("Texture dimension budget exceeded")
    image = bpy.data.images.new(PREFIX + name, width=pixels.shape[1], height=pixels.shape[0], alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(np.asarray(pixels, dtype=np.float32).ravel())
    image.update()
    image.pack()
    TEXTURES.append(image)
    return image


def normal_image(name, height, strength):
    dy, dx = np.gradient(height)
    normals = np.stack((-dx * strength, -dy * strength, np.ones_like(dx)), axis=2)
    normals /= np.linalg.norm(normals, axis=2)[..., None]
    return packed_image(name, rgba(normals * .5 + .5), True)


def material(name, color, roughness=.65, metal=0, base=None, normal=None,
             rough_map=None, emission=None):
    value = bpy.data.materials.new(PREFIX + "PBR_" + name)
    value.use_nodes = True
    value.diffuse_color = (*color, 1)
    bsdf = value.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metal
    for image, socket in ((base, "Base Color"), (rough_map, "Roughness")):
        if image is not None:
            node = value.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = image
            value.node_tree.links.new(node.outputs["Color"], bsdf.inputs[socket])
    if normal is not None:
        node = value.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = normal
        convert = value.node_tree.nodes.new("ShaderNodeNormalMap")
        convert.inputs["Strength"].default_value = .32
        value.node_tree.links.new(node.outputs["Color"], convert.inputs["Color"])
        value.node_tree.links.new(convert.outputs["Normal"], bsdf.inputs["Normal"])
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = .65
    MATERIALS[name] = value
    return value


def make_materials():
    # All own raster synthesis, packed for glTF; no procedural shader dependency.
    u, v = np.meshgrid(np.linspace(0, 1, 512, endpoint=False), np.linspace(0, 1, 256, endpoint=False))
    flow = v + .010 * np.sin(u * 17 + v * 7) + .004 * np.sin(u * 37 - v * 19)
    fibre = np.sin(flow * math.tau * 35) + .30 * np.sin(flow * math.tau * 83 + u * 6)
    knot_r = np.sqrt(((u - .53) * 1.4) ** 2 + ((v - .62) * 4.1) ** 2)
    knot = np.sin(knot_r * 55) * np.exp(-knot_r * 6)
    fine = np.sin(u * 439 + v * 271) * np.sin(v * 677 - u * 211)
    tone = .96 + fibre * .041 + knot * .070 + fine * .011
    wood = packed_image("Timber_Warm_Grain_Base_512", rgba(tone[..., None] * (.71, .405, .18)))
    wood_normal = normal_image("Timber_Fibre_Normal_512", fibre * .036 + knot * .03, 8)
    rough = np.clip(.69 + fibre * .025 + fine * .013, .58, .80)
    wood_rough = packed_image("Timber_Weather_Roughness_512", rgba(np.repeat(rough[..., None], 3, axis=2)), True)
    material("Honey_Timber", (.71, .405, .18), base=wood, normal=wood_normal, rough_map=wood_rough)
    material("Dark_Joinery", (.26, .115, .040), .73, normal=wood_normal)
    material("Cut_Endgrain", (.52, .31, .14), .78, normal=wood_normal)
    weave = np.sin(u * math.tau * 71) * np.sin(v * math.tau * 61)
    linen = packed_image("Linen_Cream_Weave_Base_512", rgba((.97 + weave * .016)[..., None] * (.89, .82, .67)))
    linen_normal = normal_image("Linen_Weave_Normal_512", weave * .024, 3)
    material("Cream_Linen", (.89, .82, .67), .88, base=linen, normal=linen_normal)
    material("Violet_Cloth", (.30, .058, .61), .84, normal=linen_normal)
    vein = np.exp(-((v - .5) / .035) ** 2)
    leaf_tone = .95 + .055 * np.sin(u * 23 + v * 11) + .028 * np.sin(u * 53 - abs(v - .5) * 14)
    leaf_rgb = leaf_tone[..., None] * (.28, .49, .065) + vein[..., None] * (.09, .09, .015)
    leaf = packed_image("Leaf_Broad_Veins_Base_512", rgba(leaf_rgb))
    leaf_n = normal_image("Leaf_Broad_Veins_Normal_512", vein * .07 + np.sin(u * 53 - abs(v - .5) * 14) * .02, 5)
    material("Leaf_Green", (.28, .49, .065), .56, base=leaf, normal=leaf_n)
    clay_noise = np.sin(u * 47 + v * 23) * np.sin(u * 17 - v * 61)
    clay = packed_image("Ceramic_Fired_Clay_Base_512", rgba((.98 + .045 * clay_noise)[..., None] * (.63, .25, .105)))
    material("Terracotta", (.63, .25, .105), .68, base=clay)
    for name, color, roughness, metal in (
        ("Brass", (.72, .50, .16), .35, .72), ("Iron", (.072, .085, .092), .49, .65),
        ("Screen_Glass", (.018, .046, .072), .28, .12), ("Paper", (.84, .78, .64), .93, 0),
        ("Soil", (.09, .06, .032), .96, 0), ("Ivory_Ceramic", (.86, .82, .71), .38, 0),
        ("Book_Indigo", (.11, .15, .26), .82, 0), ("Book_Olive", (.21, .27, .09), .82, 0),
        ("Book_Russet", (.43, .11, .065), .82, 0), ("Book_Ochre", (.63, .39, .11), .82, 0),
    ):
        material(name, color, roughness, metal)
    material("Diagram_Cyan", (.14, .66, .89), .48, emission=(.10, .48, .69))
    material("Diagram_Violet", (.49, .24, .81), .50, emission=(.26, .10, .55))
    material("Amber_Lamp", (.95, .64, .23), .36, emission=(1, .56, .15))
    material("Flower_Coral", (.71, .13, .064), .70)


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
    data.materials.append(MATERIALS[mat])
    for polygon in data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4 if smooth == "SIDES" else bool(smooth)
    obj = bpy.data.objects.new(PREFIX + name, data)
    COLLECTION.objects.link(obj)
    obj.parent = GROUPS[part]
    obj["runtime_group"] = part
    obj["asset_role"] = "Original reference-led digital workshop part"
    return obj


def box(name, center, size, mat, part, bevel=.025, grain="X"):
    x, y, z = (value / 2 for value in size)
    vertices = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
                (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    def uv(point, normal):
        primary = {"X": point.x, "Y": point.y, "Z": point.z}[grain]
        secondary = point.y if grain == "X" and abs(normal.z) > .5 else point.z
        if grain == "Y":
            secondary = point.x if abs(normal.z) > .5 else point.z
        elif grain == "Z":
            secondary = point.x if abs(normal.y) > .5 else point.y
        return (primary * .28, secondary * .6 + .5)
    obj = mesh_object(name, vertices, faces, mat, part, uv)
    obj.location = center
    if bevel > 0:
        modifier = obj.modifiers.new("Conservative worn edge bevel", "BEVEL")
        modifier.width = min(bevel, min(size) * .14)
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
    return obj


def tube(name, points, radii, mat, part, sides=8):
    points = [Vector(point) for point in points]
    radii = [float(radius) for radius in radii]
    if len(radii) != len(points) or any(radius <= 0 for radius in radii):
        raise RuntimeError("Invalid tube radii " + name)
    if len(points) < 2 or any((points[i+1] - points[i]).length < 1e-7 for i in range(len(points)-1)):
        raise RuntimeError("Invalid tube centreline " + name)
    vertices, faces, uv, frame = [], [], [], None
    for index, point in enumerate(points):
        tangent = points[min(len(points)-1,index+1)] - points[max(0,index-1)]
        tangent.normalize()
        if frame is None:
            ref = Vector((0,0,1)) if abs(tangent.z) < .9 else Vector((0,1,0))
            frame = tangent.cross(ref).normalized()
        else:
            projected = frame - tangent * frame.dot(tangent)
            if projected.length < 1e-7:
                projected = tangent.cross(Vector((0,1,0)) if abs(tangent.y) < .9 else Vector((1,0,0)))
            frame = projected.normalized()
        across = tangent.cross(frame).normalized()
        for side in range(sides):
            angle = math.tau * side / sides
            vertices.append(tuple(point + radii[index] * (frame * math.cos(angle) + across * math.sin(angle))))
            uv.append((side/sides,index/(len(points)-1)))
    for row in range(len(points)-1):
        for side in range(sides):
            a = row * sides + side
            faces.append((a,row*sides+(side+1)%sides,(row+1)*sides+(side+1)%sides,(row+1)*sides+side))
    start, end = len(vertices), len(vertices)+1
    vertices.extend((tuple(points[0]),tuple(points[-1])))
    uv.extend(((.5,0),(.5,1)))
    for side in range(sides):
        faces.append((start,(side+1)%sides,side))
        faces.append((end,(len(points)-1)*sides+side,(len(points)-1)*sides+(side+1)%sides))
    return mesh_object(name, vertices, faces, mat, part, uv, "SIDES")


def cylinder(name, center, radius, depth, mat, part, sides=16):
    return tube(name, [(center[0],center[1],center[2]-depth/2),
                       (center[0],center[1],center[2]+depth/2)], [radius,radius], mat, part, sides)


def timber_between(name, a, b, width, depth, part="shell", mat="Honey_Timber"):
    a, b = Vector(a), Vector(b)
    obj = box(name, (a+b)/2, (width,depth,(b-a).length), mat, part, min(width,depth)*.12, "Z")
    obj.rotation_euler = (b-a).to_track_quat("Z","Y").to_euler()
    return obj


def ellipsoid(name, center, scale, mat, part="decor", rings=8, sides=12):
    vertices, faces, uv = [(0,0,scale[2])], [], [(.5,0)]
    for ring in range(1,rings):
        latitude = ring/rings*math.pi
        for side in range(sides):
            a = side/sides*math.tau
            vertices.append((math.cos(a)*math.sin(latitude)*scale[0],math.sin(a)*math.sin(latitude)*scale[1],math.cos(latitude)*scale[2]))
            uv.append((side/sides,ring/rings))
    bottom = len(vertices)
    vertices.append((0,0,-scale[2]))
    uv.append((.5,1))
    for side in range(sides):
        faces.append((0,1+side,1+(side+1)%sides))
    for ring in range(rings-2):
        for side in range(sides):
            a,b = 1+ring*sides+side,1+(ring+1)*sides+side
            faces.append((a,b,1+(ring+1)*sides+(side+1)%sides,1+ring*sides+(side+1)%sides))
    last = 1+(rings-2)*sides
    for side in range(sides):
        faces.append((last+side,bottom,last+(side+1)%sides))
    obj = mesh_object(name, vertices, faces, mat, part, uv, True)
    obj.location = center
    return obj


def lathe(name, center, profile, mat, part="decor", sides=20):
    vertices, faces, uv = [], [], []
    for row,(radius,height) in enumerate(profile):
        if radius <= 0:
            raise RuntimeError("Lathe profile must use nonzero radii")
        for side in range(sides):
            a = math.tau * side/sides
            vertices.append((center[0]+radius*math.cos(a),center[1]+radius*math.sin(a),center[2]+height))
            uv.append((side/sides,row/len(profile)))
    for row in range(len(profile)):
        next_row = (row+1)%len(profile)
        for side in range(sides):
            a,b = row*sides+side,next_row*sides+side
            faces.append((a,row*sides+(side+1)%sides,next_row*sides+(side+1)%sides,b))
    return mesh_object(name,vertices,faces,mat,part,uv,True)


def solid_grid(name, rows, cols, sample, outward, thickness, mat, part):
    outward = Vector(outward)
    vertices,faces,uv = [],[],[]
    for layer in (1,-1):
        for row in range(rows):
            for col in range(cols):
                t,w = row/(rows-1),col/(cols-1)
                vertices.append(tuple(Vector(sample(t,w))+outward*(layer*thickness/2)))
                uv.append((t,w))
    stride = rows*cols
    a,b,c = (Vector(vertices[index]) for index in (0,cols,cols+1))
    reverse = (b-a).cross(c-a).dot(outward) < 0
    for row in range(rows-1):
        for col in range(cols-1):
            a = row*cols+col
            front = (a,a+cols,a+cols+1,a+1)
            if reverse:
                front = tuple(reversed(front))
            faces.extend((front,tuple(index+stride for index in reversed(front))))
    perimeter = list(range(cols))
    perimeter += [row*cols+cols-1 for row in range(1,rows)]
    perimeter += list(range(stride-2,stride-cols-1,-1))
    perimeter += [row*cols for row in range(rows-2,0,-1)]
    smooth_count = len(faces)
    for index,a in enumerate(perimeter):
        b = perimeter[(index+1)%len(perimeter)]
        side = (a,b,b+stride,a+stride)
        faces.append(tuple(reversed(side)) if reverse else side)
    obj = mesh_object(name,vertices,faces,mat,part,uv,True)
    for polygon in obj.data.polygons:
        if polygon.index >= smooth_count:
            polygon.use_smooth = False
    return obj


def binding(name, center, radius=.32):
    points = [(center[0]+radius*math.cos(t*math.tau*3),center[1]+radius*math.sin(t*math.tau*3),center[2]+t*.24)
              for t in np.linspace(0,1,31)]
    return tube(name,points,[.027]*len(points),"Cream_Linen","decor",6)


def bolt(name, center, face="Y", radius=.042):
    obj = cylinder(name, (0,0,0), radius, .018, "Iron", "decor", 6)
    obj.location = center
    if face == "Y":
        obj.rotation_euler.x = math.pi/2
    elif face == "X":
        obj.rotation_euler.y = math.pi/2
    return obj


def build_shell():
    # Staggered timber lengths, continuous top=0; subfloor never a second island.
    for row in range(60):
        y = -11.80 + row*.4
        cuts = [-14.84,-7.50,-.15,7.30,14.84] if row%2 == 0 else [-14.84,-8.3,-.9,6.6,14.84]
        for index in range(4):
            left,right = cuts[index]+.012,cuts[index+1]-.012
            box("Deck_Plank_%02d_%d"%(row,index),((left+right)/2,y,-.12),(right-left,.378,.24),"Honey_Timber","shell",.018)
    for y in (-11.89,11.89):
        box("Deck_Fascia_%s"%y,(0,y,-.20),(30,.18,.40),"Dark_Joinery","shell",.020)
    for x in (-14.89,14.89):
        box("Deck_Side_Rim_%s"%x,(x,0,-.20),(.22,24,.40),"Honey_Timber","shell",.020,"Y")
    for x in (-12,-6,0,6,12):
        box("Underdeck_Joist_%s"%x,(x,0,-.37),(.30,23.5,.26),"Dark_Joinery","shell",.021,"Y")
    for index in range(15):
        x = -14.45+index*2.06
        box("Front_Crafted_Fascia_Plate_%02d"%index,(x,-11.983,-.29),(.28,.004,.20),"Iron","decor",0)
        for dx in (-.082,.082):
            bolt("Front_Fascia_Bolt_%02d_%s"%(index,dx),(x+dx,-11.990,-.29),radius=.025)
    for name,x,z,height in POSTS:
        y = -z
        obj = box("Post_"+name,(x,y,height/2),(.48,.48,height),"Honey_Timber","shell",.05,"Z")
        obj["collider_id"] = "workshop-post-"+name
        box("Post_Shoe_"+name,(x,y,.13),(.54,.54,.26),"Iron","shell",.020)
        box("Post_Crafted_Cap_"+name,(x,y,height-.065),(.53,.53,.13),"Cut_Endgrain","shell",.018)
        binding("Post_Rope_Binding_"+name,(x,y,height-.39))
        for dz in (.27,height-.29):
            bolt("Post_Forged_Bolt_"+name+str(dz),(x,y-.253,dz))
    # Open two rear wall portions, not a generic closed box/hut.
    for side,x0 in (("left",-7.5),("right",7.5)):
        for index in range(25):
            x = x0-4.8+index*.4
            box("Rear_Weathered_Board_%s_%02d"%(side,index),(x,11.2,1.73),(.385,.20,3.3),"Honey_Timber","shell",.013,"Z")
        for height in (.27,1.88,3.25):
            box("Rear_Joinery_Crossbeam_%s_%s"%(side,height),(x0,11.155,height),(9.8,.10,.15),"Dark_Joinery","shell",.012)
    rear = [(x,10.8,h-.22) for _,x,_,h in POSTS[:5]]
    for index in range(4):
        timber_between("High_Rear_Stepped_Lintel_%d"%index,rear[index],rear[index+1],.32,.34)
        # Braced crown is visibly a pergola lattice, never an upstairs deck.
        a,b = rear[index],rear[index+1]
        timber_between("Crown_Diagonal_%d"%index,(a[0]+.32,a[1],a[2]-1.32),(b[0]-.32,b[1],b[2]-.20),.20,.19,"shell","Dark_Joinery")
    for x,back_h,front_h in ((-13.8,6.4,5.2),(13.8,6.6,5.4)):
        timber_between("Side_Continuous_Eave_%s"%x,(x,10.8,back_h-.20),(x,-9.8,front_h-.20),.30,.33)
        for y,h in ((10.8,back_h),(-9.8,front_h)):
            inward = 1 if x<0 else -1
            timber_between("Corner_Knee_%s_%s"%(x,y),(x,y,h-1.18),(x+inward*.92,y,h-.24),.19,.18)


def canopy(name, corners, mat, sag):
    corners = [Vector(point) for point in corners]
    def sample(t,w):
        p = (corners[0]*(1-w)+corners[1]*w)*(1-t)+(corners[3]*(1-w)+corners[2]*w)*t
        p.z -= sag*math.sin(math.pi*t)*math.sin(math.pi*w)
        p.z += .045*math.sin(w*23)*math.sin(math.pi*t)
        return p
    obj = solid_grid(name,25,19,sample,(0,0,1),.018,mat,"roof")
    obj["part"] = "Tensioned closed thin linen canopy; no upper walkable floor"
    for i,j in ((0,1),(1,2),(2,3),(3,0)):
        points = [corners[i]*(1-t)+corners[j]*t-Vector((0,0,.045*math.sin(math.pi*t)))
                  for t in np.linspace(0,1,15)]
        tube(name+"_Stitched_Rope_Edge_%d_%d"%(i,j),points,[.025]*len(points),"Cream_Linen","roof",6)


def build_roof():
    # Asymmetric overlapping planes with a high visible rear crown, open front.
    canopy("Left_Cream_Sail",[(-13.65,10.25,6.36),(-3.2,10.25,8.62),
                            (-3.2,-1.0,6.35),(-13.65,-7.0,5.37)],"Cream_Linen",.78)
    canopy("Right_Cream_Sail",[(3.2,10.25,8.67),(13.65,10.25,6.53),
                             (13.65,-7.5,5.49),(3.2,-1.9,6.42)],"Cream_Linen",.80)
    canopy("Central_Violet_Sail",[(-3.15,10.05,8.69),(3.15,10.05,8.69),
                                (3.15,2.35,6.47),(-3.15,2.35,6.47)],"Violet_Cloth",.46)
    for side,x in (("left",-13.8),("right",13.8)):
        # Decorative cantilever arms are above all walking and approach capsules.
        for y,h,span in ((7.3,6.31,1.18),(1.4,5.96,1.45),(-6.0,5.58,1.05)):
            sign = 1 if x<0 else -1
            timber_between("Eave_Cantilever_%s_%s"%(side,y),(x,y,h),(x+sign*span,y,h+.04),.16,.18,"roof")
    for index,x in enumerate((-10.5,-7.0,-3.5,0,3.5,7.0,10.5)):
        h = 8.93-abs(x)*.205
        timber_between("Rear_Crown_Open_Rafter_%d"%index,(x,10.7,h),(x,7.15,h-.26),.14,.17,"roof")


def book(name, center, size, color, horizontal=False):
    x,y,z = size
    pivot = bpy.data.objects.new(PREFIX+name+"_Binding_Pivot",None)
    COLLECTION.objects.link(pivot)
    pivot.parent = GROUPS["interior"]
    pivot.location = center
    thickness = min(.014,(z if horizontal else x)*.1)
    def piece(suffix,position,dimensions,mat):
        obj = box(name+suffix,position,dimensions,mat,"interior",.001)
        obj.parent = pivot
    if horizontal:
        for side in (-1,1):
            piece("_Cover_%s"%side,(0,0,side*(z-thickness)/2),(x,y,thickness),color)
        piece("_Front_Spine",(0,-(y-thickness)/2,0),(x,thickness,z-thickness*2),color)
        page_size = (x*.965,y-thickness-.003,z-thickness*2-.002)
    else:
        for side in (-1,1):
            piece("_Cover_%s"%side,(side*(x-thickness)/2,0,0),(thickness,y,z),color)
        piece("_Front_Spine",(0,-(y-thickness)/2,0),(x-thickness*2,thickness,z),color)
        page_size = (x-thickness*2-.002,y-thickness-.003,z*.95)
    piece("_Exposed_Pages",(0,thickness/2,0),page_size,"Paper")
    return pivot


def build_libraries():
    colors = ("Book_Indigo","Book_Olive","Book_Russet","Book_Ochre")
    for library,(x,z) in enumerate(LIBRARIES):
        y = -z
        for side in (-1,1):
            box("Library_%d_Side_%s"%(library,side),(x+side*1.84,y,1.73),(.12,.72,3.3),"Honey_Timber","interior",.021,"Z")
        box("Library_%d_Thin_Back"%library,(x,y+.32,1.73),(3.68,.07,3.3),"Dark_Joinery","interior",.007,"Z")
        for row in range(5):
            h = .15+row*.78
            box("Library_%d_Shelf_%d"%(library,row),(x,y,h),(3.8,.72,.14),"Honey_Timber","interior",.018)
            if row == 4:
                continue
            for index in range(7):
                width = .19+.05*math.sin(index*2.3+row)
                tall = .48+.12*math.sin(index*.9+row*.8)**2
                volume = book("Shelf_Book_%d_%d_%d"%(library,row,index),
                              (x-1.50+index*.42,y-.10,h+.07+tall/2),
                              (width,.44,tall),colors[(row+index+library)%4])
                volume.rotation_euler.y = math.radians((-1 if index%2 else 1)*(index%3)*2)
        for index in range(3):
            book("Shelf_Top_Horizontal_%d_%d"%(library,index),(x+1.1,y-.10,3.34+index*.095),(.55,.43,.085),colors[index],True)


def diagram_line(name,a,b,mat="Diagram_Cyan",radius=.015):
    return tube(name,[a,b],[radius,radius],mat,"interior",6)


def screen(index,x,y,style):
    base_z,glass_y,screen_z = 1.3,y+.14,2.99
    box("Display_%d_Weighted_Foot"%index,(x,y+.26,base_z+.035),(.66,.52,.07),"Iron","interior",.010)
    box("Display_%d_Adjustable_Stem"%index,(x,y+.31,1.78),(.12,.16,.91),"Iron","interior",.016,"Z")
    box("Display_%d_Crafted_Casing"%index,(x,y+.24,screen_z),(3.58,.20,2.27),"Iron","interior",.055)
    glass = box("Display_%d_Abstract_Glass"%index,(x,glass_y-.014,screen_z),(3.35,.020,2.03),"Screen_Glass","interior",.001)
    glass["factual_boundary"] = "Decorative mathematical schematic only; not a factual project UI/screenshot"
    plane_y = glass_y-.032
    def point(a,b):
        return (x+a,plane_y,screen_z+b)
    if style == "network":
        nodes = [(-1.15,.05),(-.56,.63),(.38,.65),(1.16,.06),(.39,-.63),(-.57,-.61),(0,.03)]
        for edge,(i,j) in enumerate(((0,1),(1,2),(2,3),(3,4),(4,5),(5,0),(0,6),(2,6),(4,6))):
            diagram_line("Display_%d_Network_Link_%d"%(index,edge),point(*nodes[i]),point(*nodes[j]))
        for i,(a,b) in enumerate(nodes):
            ellipsoid("Display_%d_Node_%d"%(index,i),point(a,b),(.105,.025,.105),"Diagram_Violet" if i==6 else "Diagram_Cyan","interior",6,12)
    elif style == "system":
        for column in range(3):
            a = -.96+column*.96
            for row in range(2):
                b = -.46+row*.92
                box("Display_%d_Module_%d_%d"%(index,column,row),point(a,b),(.58,.026,.42),"Diagram_Violet" if column==1 else "Diagram_Cyan","interior",.003)
        for row in range(2):
            for column in range(2):
                diagram_line("Display_%d_System_Link_%d_%d"%(index,row,column),point(-.67+column*.96,-.46+row*.92),point(-.29+column*.96,-.46+row*.92))
        for column in range(3):
            diagram_line("Display_%d_System_Vertical_%d"%(index,column),point(-.96+column*.96,-.25),point(-.96+column*.96,.25),"Diagram_Violet")
    else:
        corners = [(-.87,-.50),(.46,-.50),(.46,.72),(-.87,.72),(-.38,-.78),(.95,-.78),(.95,.43),(-.38,.43)]
        edges = ((0,1),(1,2),(2,3),(3,0),(4,5),(5,6),(6,7),(7,4),(0,4),(1,5),(2,6),(3,7))
        for e,(i,j) in enumerate(edges):
            diagram_line("Display_%d_Cube_Edge_%d"%(index,e),point(*corners[i]),point(*corners[j]),"Diagram_Cyan" if e<8 else "Diagram_Violet",.017)


def build_desks():
    for index,(x,z) in enumerate(STATIONS):
        y = -z
        top = box("Station_%d_Crafted_Worksurface"%index,(x,y,1.22),(4.4,1.35,.16),"Honey_Timber","interior",.04)
        top["interaction_id"] = "projects-%d"%index
        top["collider_id"] = "projects-%d-station"%index
        for side in (-1,1):
            dx = x+side*1.78
            box("Station_%d_Drawer_Carcass_%s"%(index,side),(dx,y+.055,.61),(.66,1.14,1.22),"Honey_Timber","interior",.029)
            for row in range(3):
                h = .26+row*.31
                box("Station_%d_Inset_Drawer_%s_%d"%(index,side,row),(dx,y-.537,h),(.56,.053,.25),"Dark_Joinery","interior",.007)
                diagram_line("Station_%d_Brass_Pull_%s_%d"%(index,side,row),(dx-.10,y-.577,h),(dx+.10,y-.577,h),"Brass",.013)
        box("Station_%d_Rear_Joinery"%index,(x,y+.50,.78),(3.55,.14,.20),"Dark_Joinery","interior",.018)
        if index in (0,2,3):
            screen(index,x,y, {0:"network",2:"system",3:"cube"}[index])
            box("Station_%d_Keyboard_Tray"%index,(x-.40,y-.32,1.335),(1.16,.35,.07),"Iron","interior",.009)
            for row in range(3):
                for col in range(10):
                    box("Station_%d_Key_%d_%d"%(index,row,col),(x-.9+col*.11,y-.425+row*.10,1.382),(.082,.074,.026),"Ivory_Ceramic","interior",.002)
        else:
            # Physical abstract prototypes, deliberately not project evidence.
            cylinder("Station_%d_Prototype_Round_Base"%index,(x,y+.16,1.385),.58,.15,"Iron","interior",24)
            for e in range(6):
                a = e/6*math.tau
                a1 = (x+math.cos(a)*.36,y+.16+math.sin(a)*.36,1.46)
                a2 = (x+math.cos(a+.38)*.24,y+.16+math.sin(a+.38)*.24,2.10)
                diagram_line("Station_%d_Abstract_Prototype_Strut_%d"%(index,e),a1,a2,"Brass",.026)
            ellipsoid("Station_%d_Abstract_Prototype_Core"%index,(x,y+.16,1.83),(.24,.24,.26),"Diagram_Violet","interior",10,16)
        for stack in range(3):
            book("Station_%d_Unlabelled_Notebook_%d"%(index,stack),(x+1.09,y-.09,1.35+stack*.085),(.62,.43,.075),"Book_Indigo" if stack%2 else "Book_Ochre",True)
        lathe("Station_%d_Ceramic_Cup"%index,(x+.55,y-.36,1.3),[(.075,0),(.11,.02),(.11,.22),(.10,.24),(.084,.237),(.081,.045),(.04,.04)],"Ivory_Ceramic","interior",16)
    for index,(x,z) in enumerate(STOOLS):
        y = -z
        cylinder("Stool_%d_Rounded_Seat"%index,(x,y,.89),.40,.12,"Honey_Timber","interior",20)
        for sx,sy in ((-1,-1),(1,-1),(1,1),(-1,1)):
            timber_between("Stool_%d_Splayed_Leg_%s_%s"%(index,sx,sy),(x+sx*.30,y+sy*.30,.04),(x+sx*.22,y+sy*.22,.85),.084,.084,"interior","Dark_Joinery")
        for a,b in (((-.27,-.27),(.27,-.27)),((.27,-.27),(.27,.27)),((.27,.27),(-.27,.27)),((-.27,.27),(-.27,-.27))):
            timber_between("Stool_%d_Brace_%s_%s"%(index,a,b),(x+a[0],y+a[1],.33),(x+b[0],y+b[1],.33),.05,.05,"interior")


def lantern(name, center, scale=1):
    x,y,z = center
    cylinder(name+"_Forged_Base",(x,y,z-.25*scale),.20*scale,.08*scale,"Brass","decor",12)
    cylinder(name+"_Crown",(x,y,z+.25*scale),.21*scale,.08*scale,"Brass","decor",12)
    for dx,dy in ((-1,-1),(1,-1),(1,1),(-1,1)):
        tube(name+"_Cage_%s_%s"%(dx,dy),[(x+dx*.14*scale,y+dy*.14*scale,z-.22*scale),(x+dx*.14*scale,y+dy*.14*scale,z+.22*scale)],[.015*scale]*2,"Brass","decor",6)
    ellipsoid(name+"_Warm_Core",center,(.11*scale,.11*scale,.19*scale),"Amber_Lamp")
    points = [(x+.075*scale*math.cos(t),y,z+.36*scale+.075*scale*math.sin(t)) for t in np.linspace(0,math.tau,19)]
    tube(name+"_Hanging_Loop",points,[.013*scale]*len(points),"Iron","decor",6)


def broadleaf(name, origin, direction, length, width, rise=.4, part="decor"):
    origin, direction = Vector(origin),Vector(direction).normalized()
    across = Vector((-direction.y,direction.x,0)).normalized()
    def centre(t):
        return origin+direction*(length*t)+Vector((0,0,rise*math.sin(math.pi*t*.86)+.08*t))
    def surface(t,w):
        span = width*(.016+math.sin(math.pi*t)**.72)
        p = centre(t)+across*((2*w-1)*span)
        p.z -= .07*(2*w-1)**2*math.sin(math.pi*t)
        return p
    solid_grid(name+"_Closed_Blade",9,5,surface,(0,0,1),.009,"Leaf_Green",part)
    points = [centre(t) for t in np.linspace(0,1,9)]
    tube(name+"_Midrib",points,[.009]*len(points),"Leaf_Green",part,5)


def potted_plant(name,x,z):
    y = -z
    profile = [(.22,0),(.32,.05),(.40,.63),(.45,.70),(.45,.80),(.40,.80),(.37,.69),(.31,.18),(.075,.16)]
    lathe(name+"_Ceramic_Pot",(x,y,0),profile,"Terracotta")
    cylinder(name+"_Recessed_Soil",(x,y,.735),.39,.045,"Soil","decor",16)
    for index in range(8):
        angle = index/8*math.tau+.35
        length = .66+.21*math.sin(index*1.7)**2
        broadleaf(name+"_Leaf_%02d"%index,(x,y,.80+index*.014),(math.cos(angle),math.sin(angle),0),length,.22,.47)


def vine_cluster(name,origin,inward,drop):
    x,y,z = origin
    points = [(x+inward*.17*math.sin(t*8),y+.12*math.sin(t*11),z-drop*t) for t in np.linspace(0,1,21)]
    tube(name+"_Soft_Stem",points,[.019]*len(points),"Leaf_Green","decor",6)
    for index in range(10):
        t = .04+index*.086
        origin_leaf = (x+inward*.17*math.sin(t*8),y+.12*math.sin(t*11),z-drop*t)
        direction = (inward*.8,(-1 if index%2 else 1)*.6,0)
        broadleaf(name+"_Leaf_%d"%index,origin_leaf,direction,.42+.11*(index%3),.20,.15)
        if index in (2,6):
            centre = (origin_leaf[0]+inward*.22,origin_leaf[1]-.12,origin_leaf[2]+.10)
            for petal in range(5):
                a = petal/5*math.tau
                obj = ellipsoid(name+"_Coral_Flower_%d_%d"%(index,petal),(centre[0]+.10*math.cos(a),centre[1]-.018,centre[2]+.10*math.sin(a)),(.09,.035,.065),"Flower_Coral","decor",6,8)
                obj.rotation_euler.y = -a
            ellipsoid(name+"_Flower_Centre_%d"%index,centre,(.045,.037,.045),"Brass","decor",6,8)


def banner(name,x,y,z):
    timber_between(name+"_Crossbar",(x-.62,y,z+.09),(x+.62,y,z+.09),.085,.085,"decor")
    def sample(t,w):
        return (x+(w-.5)*1.04,y-.05-.06*math.sin(t*math.pi)*math.cos(w*math.tau),
                z-t*1.9+t**8*.28*(1-abs(w*2-1)))
    solid_grid(name+"_Violet_Notched_Cloth",19,11,sample,(0,-1,0),.012,"Violet_Cloth","decor")
    centre = (x,y-.124,z-.73)
    ring = [(centre[0]+.33*math.cos(a),centre[1],centre[2]+.33*math.sin(a)) for a in np.linspace(0,math.tau,25)]
    tube(name+"_Compass_Ring",ring,[.012]*len(ring),"Brass","decor",6)
    for index in range(8):
        a = index/8*math.tau
        radius = .43 if index%2==0 else .26
        tube(name+"_Compass_Ray_%d"%index,[centre,(centre[0]+radius*math.cos(a),centre[1]-.005,centre[2]+radius*math.sin(a))],[.021,.007],"Brass","decor",6)


def build_decor():
    for index,(name,x,z) in enumerate(POTS):
        potted_plant("Pot_"+name,x,z)
    for index,(x,y,z,inward,drop) in enumerate(((-13.55,10.3,6.5,1,2.4),(-6.8,10.1,8.0,1,2.6),
                                              (0,10.3,9.2,1,2.0),(6.8,10.1,8.1,-1,2.5),
                                              (13.55,10.3,6.6,-1,2.1),(-13.5,2.9,6.1,1,1.8),
                                              (13.5,2.9,6.2,-1,1.8))):
        vine_cluster("Vine_Cluster_%d"%index,(x,y,z),inward,drop)
    banner("Left_Identity_Banner",-13.4,-8.5,4.84)
    banner("Right_Identity_Banner",13.4,-8.5,5.00)
    for index,(x,z) in enumerate(STATIONS):
        lantern("Desk_Lantern_%d"%index,(x-1.05,-z+.39,1.68),.68)
    for name,x,z,h in POSTS:
        if name == "back-2":
            continue
        centre = (x+.34 if x<0 else x-.34,-z-.29,h-1.15)
        lantern("Pergola_Lantern_"+name,centre,1.08)
        timber_between("Lantern_Bracket_"+name,(x,-z,h-.64),(centre[0],centre[1],h-.64),.075,.075,"decor","Iron")
    for side in (-1,1):
        points = [(side*13.5*(1-t)+side*3.0*t,7.4,6.15+1.25*t-.18*math.sin(math.pi*t)) for t in np.linspace(0,1,21)]
        tube("Rear_Light_String_%s"%side,points,[.018]*len(points),"Iron","decor",6)
        for index in range(5):
            t = .1+index*.19
            x,y,z = side*13.5*(1-t)+side*3.0*t,7.4,6.15+1.25*t-.18*math.sin(math.pi*t)
            tube("Rear_Light_Drop_%s_%s"%(side,index),[(x,y,z),(x,y,z-.19)],[.013,.013],"Iron","decor",6)
            ellipsoid("Rear_Amber_Bulb_%s_%s"%(side,index),(x,y,z-.25),(.066,.066,.082),"Amber_Lamp","decor",6,8)


def aim(obj,target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def setup_preview(scene,minimum,maximum):
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x,scene.render.resolution_y = 800,650
    scene.render.resolution_percentage = 100
    scene.render.image_settings.media_type = "IMAGE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Khronos PBR Neutral"
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new(PREFIX+"Preview_White_Environment")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.90,.94,1,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .85
    scene.world = world
    target = (minimum+maximum)/2
    camera_data = bpy.data.cameras.new(PREFIX+"Preview_Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 41.5
    camera = bpy.data.objects.new(PREFIX+"Preview_Camera",camera_data)
    scene.collection.objects.link(camera)
    camera.location = target+Vector((27,-42,30))
    aim(camera,target)
    scene.camera = camera
    # High front daylight shows the open interior; rear rim separates crown/linen.
    for name,kind,position,energy,color in (
        ("Warm_Daylight_Key","SUN",(-18,-25,28),2.35,(1,.89,.75)),
        ("Cool_Openfront_Fill","AREA",(0,-17,12),1800,(.80,.90,1)),
        ("Crown_Rim","SUN",(9,15,24),.72,(1,.98,.87)),
        ("Interior_Warm_Fill","AREA",(0,3.0,5),420,(1,.83,.62)),
    ):
        data = bpy.data.lights.new(PREFIX+"Preview_"+name,kind)
        data.energy,data.color = energy,color
        if kind == "SUN":
            data.angle = math.radians(10)
        else:
            data.shape = "DISK"
            data.size = 12 if name.startswith("Cool") else 8
        light = bpy.data.objects.new(PREFIX+"Preview_"+name,data)
        scene.collection.objects.link(light)
        light.location = position
        aim(light,target)


def main():
    global COLLECTION
    random.seed(SEED)
    GROUPS.clear()
    MATERIALS.clear()
    TEXTURES.clear()
    # Run only in caller's dedicated authoring project, not a populated game.
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj,do_unlink=True)
    for datablocks in (bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.worlds):
        for data in list(datablocks):
            if data.name.startswith(PREFIX) and data.users == 0:
                datablocks.remove(data)
    for previous in list(bpy.data.collections):
        if previous.name.startswith(COLLECTION_NAME) and not previous.objects and not previous.children:
            bpy.data.collections.remove(previous)
    COLLECTION = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(COLLECTION)
    root = bpy.data.objects.new(ROOT_NAME,None)
    COLLECTION.objects.link(root)
    root["asset_id"] = "digital-workshop-v1"
    root["units"] = "metres; Blender Z-up exports glTF Y-up"
    root["deck_walking_top_z"] = 0.0
    root["world_anchor_gltf"] = [-16,18.06,-38]
    root["no_upper_walking_floor"] = True
    root["design_note"] = "30x24 open workshop; five existing stations; no cannon or invented project proof"
    for part in ("shell","roof","interior","decor"):
        obj = bpy.data.objects.new(PREFIX+part,None)
        COLLECTION.objects.link(obj)
        obj.parent = root
        obj["runtime_group"] = part
        GROUPS[part] = obj
    GROUPS["roof"]["visibility_contract"] = "Separable canopies/rafters; no upstairs floor"
    make_materials()
    build_shell()
    build_roof()
    build_libraries()
    build_desks()
    build_decor()
    bpy.context.view_layer.update()
    meshes = [obj for obj in COLLECTION.objects if obj.type == "MESH"]
    points = [obj.matrix_world@Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not points or not all(math.isfinite(value) for point in points for value in point):
        raise RuntimeError("Empty or nonfinite workshop bounds")
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    if minimum.x < -15.0001 or maximum.x > 15.0001 or minimum.y < -12.0001 or maximum.y > 12.0001:
        raise RuntimeError("Workshop mesh exceeds 30x24 footprint: %s / %s"%(tuple(minimum),tuple(maximum)))
    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangles,vertices = 0,0
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        data = evaluated.to_mesh()
        try:
            data.calc_loop_triangles()
            triangles += len(data.loop_triangles)
            vertices += len(data.vertices)
        finally:
            evaluated.to_mesh_clear()
    if triangles > TRIANGLE_BUDGET or len(MATERIALS) > 30 or len(TEXTURES) > 12:
        raise RuntimeError("Workshop exceeds master study geometry/material/image budget")
    annotation = contract()
    text_name = "DigitalWorkshop_V1_Contract_JSON"
    previous = bpy.data.texts.get(text_name)
    if previous is not None:
        bpy.data.texts.remove(previous)
    block = bpy.data.texts.new(text_name)
    block.write(json.dumps(annotation,indent=2))
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    setup_preview(scene,minimum,maximum)
    output = artifacts.file(name=PREVIEW_NAME,media_type="image/png")
    scene.render.filepath = str(output.path)
    bpy.ops.render.render(write_still=True)
    output.publish()
    return {
        "asset": "digital-workshop-v1", "blender_version": bpy.app.version_string,
        "root": ROOT_NAME, "mesh_objects": len(meshes), "evaluated_triangles": triangles,
        "evaluated_vertices": vertices, "materials": len(MATERIALS),
        "packed_pbr_images": [image.name for image in TEXTURES],
        "texture_dimensions": [[image.size[0],image.size[1]] for image in TEXTURES],
        "bounds_min_blender": [round(value,4) for value in minimum],
        "bounds_max_blender": [round(value,4) for value in maximum],
        "groups": [{"name":obj.name,"runtime_group":part} for part,obj in GROUPS.items()],
        "walking_top_z": 0.0, "station_count": 5, "large_display_count": 3,
        "screen_content": "Decorative abstract diagrams; no factual project UI, text or metrics",
        "preview": PREVIEW_NAME, "contract_text": text_name, "contract": annotation,
        "glb_byte_limit": 8_388_608,
        "acceptance": "Original reference-led master; caller must verify export size, visual fidelity, runtime/collision and performance",
    }


result = main()
