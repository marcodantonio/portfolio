"""Reference-led suspended inventor laboratory; standalone Blender 5.2 asset.

Run only in the caller's dedicated Higgsfield Blender project. The caller owns
revision guards, GLB export, download, static batching and runtime acceptance.
Original editable meshes and packed portable Principled PBR; no network, raster
background, external texture, invented skill score, text or project screenshot.
Blender(X,Y,Z) exports as glTF(X,Z,-Y); the open front is Blender -Y / glTF +Z.
The 20x16 structural deck has Z=0 walking top. Six-territory map, guided arrival
and parachute departure remain external. The catch net is soft visual dressing
over already supported terrain, not a new walking surface or seventh island.
Helpers follow the existing archive/workshop authoring conventions, but this
source is self-contained so remote execution needs no repository filesystem.
Thrusters attach beneath the actual shared rock belly at local Z=-17..-20.5;
the isolated asset intentionally has a void where runtime terrain will appear.
"""

import bpy
import json
import math
import random
import numpy as np
from mathutils import Vector


PREFIX = "SuspendedLab_"
ROOT_NAME = "SuspendedLab_V1_Origin_At_Deck_Centre"
COLLECTION_NAME = "SuspendedLab_V1_Editable_Asset"
PREVIEW_NAME = "suspended-lab-v1-eevee.png"
SEED = 271011
TRIANGLE_BUDGET = 135_000
TEXTURE_DIMENSION_MAX = 384
DECK_WIDTH, DECK_DEPTH, DECK_THICKNESS = 20.0, 16.0, .24
GROUPS, MATERIALS, TEXTURES = {}, {}, []
COLLECTION = None

# All navigation/collision constants are local glTF XZ, not Blender XY.
STATIONS = ((-7, 1), (-6, -6), (6, -6), (7, 1), (0, 6))
POSTS = (("back-left", -9.1, -7, 6.8), ("back-mid-left", -4.5, -7, 7.7),
         ("back-mid-right", 4.5, -7, 7.2), ("back-right", 9.1, -7, 7.8),
         ("left-middle", -9.1, -2, 5.2), ("right-middle", 9.1, -2, 5.4),
         ("left-front", -9.1, 6.7, 4.4), ("right-front", 9.1, 6.7, 4.4))
POTS = (("front-left", -9, 5.2), ("back-left", -9, -5.5),
        ("middle-right", 9, -4.5))
STOOLS = ((-8.15, 2.4), (-7.15, -4.6), (7.15, -4.6), (8.2, 2.4))


def collider_contract():
    def hull(name, role, x, z, width, depth, bottom, height, radius=None):
        value = {"id": name, "role": role, "kind": "cylinder" if radius else "box",
                 "x": x, "z": z, "width": width, "depth": depth,
                 "bottom": bottom, "height": height, "yaw": 0}
        if radius is not None:
            value["radius"] = radius
        return value
    hulls = [hull("lab-post-" + name, "post", x, z, .46, .46, 0, h)
             for name, x, z, h in POSTS]
    hulls += [hull("skills-%d-station" % i, "desk", x, z, 3, 1.35, 0, 1.3)
              for i, (x, z) in enumerate(STATIONS)]
    hulls += [hull("skills-machine", "machine", 0, -2.9, 6.4, 6.4, 0, 3.2, 3.2)]
    hulls += [hull("lab-rear-technical-mast", "machine", -3.65, -6.55,
                   1.7, 1.7, 0, 7, .85)]
    hulls += [hull("lab-pot-" + name, "furniture", x, z, .9, .9, 0, .8, .45)
              for name, x, z in POTS]
    hulls += [hull("lab-stool-%d" % i, "furniture", x, z, .68, .68, 0, .86)
              for i, (x, z) in enumerate(STOOLS)]
    return {
        "schema": "archipelago-static-building-contract-v1",
        "asset": "suspended-lab-v1", "root": ROOT_NAME, "units": "metres",
        "axes": "Local glTF Y-up: X right, Y up, Z front; Blender(X,Y,Z) -> glTF(X,Z,-Y)",
        "anchor": {"island": "skills", "x": -9, "y": 38.06, "z": -133, "yaw": 0},
        "deck": {"id": "lab-deck", "x": 0, "z": 0, "width": 20, "depth": 16,
                 "bottom": -.24, "height": .24, "walkingTop": 0, "yaw": 0},
        "runtimeGroups": ["shell", "roof", "interior", "decor"],
        "navigation": {
            "entry": {"x": 0, "z": 15},
            "glideDeparture": {"x": 9, "z": 13},
            "frontEntryClear": {"xMin": -2, "xMax": 2, "zMin": 8, "zMax": 15.7},
            "frontCrossingClear": {"xMin": -8, "xMax": 9.7, "zMin": 8.1, "zMax": 10.3},
            "stationApproachOffsetZ": 3.1,
            "approachHalfWidth": .6, "approachHalfDepth": .7,
            "front": "No front wall/continuous rail/central post. Existing terrain supports arrival/glide and the front station approach outside the deck.",
            "centre": "Holographic apparatus is rearward at local(0,-2.9), not on arrival or front station route.",
            "landingNet": {"x": 0, "z": 14.5, "width": 3.6, "depth": 2,
                           "surfaceY": -.06, "collision": "soft decoration only; existing terrain owns support"},
            "noUpperWalkingFloors": True,
        },
        "hulls": hulls,
        "stations": [{"id": "skills-%d" % i, "x": x, "z": z,
                      "width": 3, "depth": 1.35, "height": 1.3,
                      "approach": {"x": x, "z": round(z + 3.1, 4)}}
                     for i, (x, z) in enumerate(STATIONS)],
        "collisionPolicy": {
            "solid": "One structural deck and22 listed conservative hulls; parent must integrate and verify actual map/Rapier contacts and approaches.",
            "softNonSolid": ["cloth", "leaves", "vines", "lamps", "screen diagrams", "catch net", "under-deck thrusters", "high crane/dish/windsock"],
            "noUpperWalkingFloors": True,
            "existingTerritoryUndersideNotMerged": True,
        },
        "authoringBudgets": {"trianglesSafetyMax": TRIANGLE_BUDGET, "materialsMax": 26,
                             "imagesMax": 10, "textureDimensionMax": TEXTURE_DIMENSION_MAX,
                             "runtimeBytesMax": 8_388_608, "runtimeMeshesMax": 96,
                             "runtimeTrianglesMax": 180_000},
        "factualBoundary": "Five existing skill groups remain HTML. Original technical diagrams are decoration, not ratings, screenshots, results or added qualifications.",
        "status": "Authoring proposal. Actual export, collision integration, visual fidelity and device performance require independent verification.",
    }


def rgba(rgb):
    return np.concatenate((np.clip(rgb, 0, 1), np.ones((*rgb.shape[:2], 1))), axis=2)


def packed_image(name, pixels, non_color=False):
    if max(pixels.shape[:2]) > TEXTURE_DIMENSION_MAX:
        raise RuntimeError("Lab texture sizing guard")
    image = bpy.data.images.new(PREFIX + name, width=pixels.shape[1],
                                height=pixels.shape[0], alpha=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(np.asarray(pixels, dtype=np.float32).ravel())
    image.update(); image.pack(); TEXTURES.append(image)
    return image


def normal_image(name, height, strength):
    dy, dx = np.gradient(height)
    normal = np.stack((-dx * strength, -dy * strength, np.ones_like(dx)), axis=2)
    normal /= np.linalg.norm(normal, axis=2)[..., None]
    return packed_image(name, rgba(normal * .5 + .5), True)


def material(name, color, roughness=.65, metal=0, base=None, normal=None,
             rough_map=None, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(PREFIX + "PBR_" + name); mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metal
    for image, socket in ((base, "Base Color"), (rough_map, "Roughness")):
        if image is not None:
            node = mat.node_tree.nodes.new("ShaderNodeTexImage"); node.image = image
            mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs[socket])
    if normal is not None:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage"); node.image = normal
        converter = mat.node_tree.nodes.new("ShaderNodeNormalMap")
        converter.inputs["Strength"].default_value = .30
        mat.node_tree.links.new(node.outputs["Color"], converter.inputs["Color"])
        mat.node_tree.links.new(converter.outputs["Normal"], bsdf.inputs["Normal"])
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    MATERIALS[name] = mat
    return mat


def make_materials():
    u, v = np.meshgrid(np.linspace(0, 1, 384, endpoint=False),
                       np.linspace(0, 1, 288, endpoint=False))
    flow = v + .011 * np.sin(u * 17 + v * 7) + .003 * np.sin(u * 39 - v * 19)
    fibre = np.sin(flow * math.tau * 32) + .33 * np.sin(flow * math.tau * 79 + u * 8)
    knot_r = np.sqrt(((u - .57) * 1.4) ** 2 + ((v - .49) * 4.5) ** 2)
    knot = np.sin(knot_r * 50) * np.exp(-knot_r * 7)
    fine = np.sin(u * 417 + v * 311) * np.sin(u * 229 - v * 577)
    wood = packed_image("Crafted_Timber_Base_384", rgba(
        (.98 + fibre * .024 + knot * .047 + fine * .006)[..., None] * (.71, .405, .18)))
    wood_n = normal_image("Crafted_Timber_Normal_384", fibre * .024 + knot * .026, 7)
    rough = np.clip(.68 + fibre * .019 + fine * .008, .60, .78)
    wood_r = packed_image("Crafted_Timber_Roughness_384",
                           rgba(np.repeat(rough[..., None], 3, axis=2)), True)
    material("Honey_Timber", (.71, .405, .18), base=wood, normal=wood_n, rough_map=wood_r)
    material("Dark_Joinery", (.27, .12, .045), .77, normal=wood_n)
    material("Pale_Cut_Timber", (.74, .48, .24), .76, normal=wood_n)
    hammer = np.sin(u * 157 + v * 181) * np.sin(u * 231 - v * 127)
    metal_base = packed_image("Tempered_Silver_Base_384", rgba(
        (.98 + hammer * .017)[..., None] * (.43, .49, .54)))
    metal_n = normal_image("Fine_Hammered_Metal_Normal_384", hammer * .010, 3)
    material("Tempered_Silver", (.43, .49, .54), .34, .73, base=metal_base, normal=metal_n)
    material("Brass", (.73, .49, .17), .32, .77, normal=metal_n)
    material("Dark_Iron", (.064, .080, .095), .51, .68, normal=metal_n)
    u, v = np.meshgrid(np.linspace(0, 1, 256, endpoint=False),
                       np.linspace(0, 1, 256, endpoint=False))
    weave = np.sin(u * math.tau * 63) * np.sin(v * math.tau * 59)
    linen_n = normal_image("Woven_Linen_Normal_256", weave * .024, 3)
    material("Cream_Linen", (.92, .86, .70), .89, normal=linen_n)
    material("Violet_Cloth", (.30, .068, .61), .86, normal=linen_n)
    material("Ivory_Ceramic", (.88, .83, .70), .39)
    material("Paper", (.84, .78, .65), .94)
    vein = np.exp(-((v - .5) / .042) ** 2)
    vein_lines = np.sin(u * 51 - abs(v - .5) * 14)
    leaf_base = packed_image("Broad_Leaf_Base_256", rgba(
        (.97 + .045 * np.sin(u * 19 + v * 11) + .028 * vein_lines)[..., None] * (.27, .48, .055)
        + vein[..., None] * (.08, .08, .012)))
    leaf_n = normal_image("Broad_Leaf_Normal_256", vein * .060 + vein_lines * .017, 4)
    material("Leaf_Green", (.27, .48, .055), .54, base=leaf_base, normal=leaf_n)
    material("Leaf_Deep", (.085, .25, .052), .59, normal=leaf_n)
    material("Leaf_Young", (.43, .62, .13), .57, normal=leaf_n)
    material("Soil", (.09, .061, .032), .96)
    material("Bloom_Coral", (.79, .14, .11), .71)
    material("Book_Violet", (.29, .10, .43), .83)
    material("Book_Ochre", (.74, .43, .11), .83)
    material("Book_Teal", (.075, .36, .32), .83)
    material("Windsock_Red", (.75, .10, .055), .82, normal=linen_n)
    material("Cyan_Light", (.045, .69, .94), .26, .12,
             emission=(.015, .61, 1), emission_strength=2.2)
    material("Amber_Light", (.97, .65, .21), .34,
             emission=(1, .51, .11), emission_strength=1.4)
    material("Violet_Light", (.39, .12, .71), .37,
             emission=(.32, .047, .73), emission_strength=1.25)
    make_screen_atlas()


def make_screen_atlas():
    """Five original schematic styles in one packed atlas, no text/UI/metrics."""
    width, height = 384, 288
    rgb = np.empty((height, width, 3), dtype=np.float32); rgb[:] = (.013, .047, .080)
    for k in range(6):
        x0, y0 = (k % 3) * 128, (k // 3) * 144
        x1, y1 = x0 + 127, y0 + 143
        def line(a, b, color=(.11, .70, .88), thickness=1):
            steps = max(abs(b[0] - a[0]), abs(b[1] - a[1])) + 1
            for t in np.linspace(0, 1, steps):
                x, y = int(round(a[0] * (1-t) + b[0] * t)), int(round(a[1] * (1-t) + b[1] * t))
                xx0, xx1 = max(x0, x-thickness), min(x1+1, x+thickness+1)
                yy0, yy1 = max(y0, y-thickness), min(y1+1, y+thickness+1)
                rgb[yy0:yy1, xx0:xx1] = color
        def p(x, y): return (x0 + int(x), y0 + int(y))
        for x in range(8, 123, 16): line(p(x, 8), p(x, 135), (.030, .082, .112), 0)
        for y in range(8, 139, 16): line(p(8, y), p(120, y), (.030, .082, .112), 0)
        if k == 0:  # Development: modular client/service composition.
            for a, b in (((17, 110), (111, 110)), ((17, 78), (111, 78)),
                         ((17, 46), (74, 46)), ((17, 30), (95, 30))):
                line(p(*a), p(*b), (.36, .22, .69), 1)
            for y in (112, 80, 48):
                line(p(24, y-11), p(37, y-11)); line(p(42, y-11), p(88, y-11))
        elif k == 1:  # Infrastructure: network modules, no claimed topology.
            nodes = ((63, 111), (29, 80), (96, 80), (29, 39), (96, 39))
            for i, j in ((0,1), (0,2), (1,3), (2,4), (3,4)):
                line(p(*nodes[i]), p(*nodes[j]), (.16, .49, .62), 0)
            for x, y in nodes:
                for a, b in (((x-10,y-7),(x+10,y-7)), ((x+10,y-7),(x+10,y+7)),
                             ((x+10,y+7),(x-10,y+7)), ((x-10,y+7),(x-10,y-7))):
                    line(p(*a), p(*b))
        elif k == 2:  # AI/vision: bounding-box and geometric feature diagram.
            for a, b in (((27,33),(95,33)), ((95,33),(95,110)),
                         ((95,110),(27,110)), ((27,110),(27,33))): line(p(*a), p(*b))
            for a, b in (((43,50),(80,50)), ((80,50),(89,83)),
                         ((89,83),(58,99)), ((58,99),(43,50)), ((43,50),(89,83))):
                line(p(*a), p(*b), (.33,.27,.78), 1)
        elif k == 3:  # Algorithms: abstract decision graph, no scores.
            nodes = ((63,118),(32,89),(94,89),(17,53),(49,53),(94,45))
            for i,j in ((0,1),(0,2),(1,3),(1,4),(2,5)):
                line(p(*nodes[i]), p(*nodes[j]), (.11,.47,.64), 0)
            for x,y in nodes:
                for i in range(24):
                    a=i*math.tau/24; b=(i+1)*math.tau/24
                    line(p(x+7*math.cos(a),y+7*math.sin(a)),
                         p(x+7*math.cos(b),y+7*math.sin(b)), (.20,.75,.91),0)
        elif k == 4:  # Security: layered shield, not a certification badge.
            path=((33,111),(63,123),(93,111),(88,70),(63,39),(38,70),(33,111))
            for a,b in zip(path,path[1:]): line(p(*a),p(*b),(.34,.27,.75),1)
            for a,b in (((47,89),(79,89)),((47,71),(79,71)),((63,102),(63,56))):
                line(p(*a),p(*b),(.16,.70,.89),1)
        else:
            for start in (0, math.pi/3, math.pi*2/3):
                pts=[p(63+43*math.cos(t)*math.cos(start)-19*math.sin(t)*math.sin(start),
                       73+43*math.cos(t)*math.sin(start)+19*math.sin(t)*math.cos(start))
                     for t in np.linspace(0,math.tau,65)]
                for a,b in zip(pts,pts[1:]): line(a,b,thickness=0)
    atlas=packed_image("Original_Technical_Schematic_Atlas_384",rgba(rgb))
    mat=material("Screen_Atlas",(.018,.046,.072),.28,.10,base=atlas)
    tex=next(node for node in mat.node_tree.nodes if node.type=="TEX_IMAGE")
    bsdf=mat.node_tree.nodes.get("Principled BSDF")
    mat.node_tree.links.new(tex.outputs["Color"],bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value=.75


def mesh_object(name, vertices, faces, mat, part, uv=None, smooth=False):
    data=bpy.data.meshes.new(PREFIX+name+"_Mesh")
    data.from_pydata(vertices,[],faces); data.update(); data.calc_loop_triangles()
    for triangle in data.loop_triangles:
        a,b,c=(data.vertices[index].co for index in triangle.vertices)
        if (b-a).cross(c-a).length_squared<1e-20:
            raise RuntimeError("Zero-area source triangle: "+name)
    if uv is not None:
        layer=data.uv_layers.new(name="UVMap")
        for polygon in data.polygons:
            for loop_id in polygon.loop_indices:
                index=data.loops[loop_id].vertex_index
                layer.data[loop_id].uv=uv(data.vertices[index].co,polygon.normal) if callable(uv) else uv[index]
    data.materials.append(MATERIALS[mat])
    for polygon in data.polygons:
        polygon.use_smooth=len(polygon.vertices)==4 if smooth=="SIDES" else bool(smooth)
    obj=bpy.data.objects.new(PREFIX+name,data); COLLECTION.objects.link(obj)
    obj.parent=GROUPS[part]; obj["runtime_group"]=part
    obj["asset_role"]="Original reference-led inventor laboratory geometry"
    return obj


def box(name, center, size, mat, part, bevel=.022, grain="X"):
    x,y,z=(float(value)/2 for value in size)
    vertices=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
              (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    def uv(p,n):
        first={"X":p.x,"Y":p.y,"Z":p.z}[grain]
        second=p.y if grain=="X" and abs(n.z)>.5 else p.z
        if grain=="Y": second=p.x if abs(n.z)>.5 else p.z
        if grain=="Z": second=p.x if abs(n.y)>.5 else p.y
        return (first*.31,second*.53+.5)
    obj=mesh_object(name,vertices,faces,mat,part,uv); obj.location=center
    if bevel>0 and min(size)>=.03:
        modifier=obj.modifiers.new("Crafted softened solid edges","BEVEL")
        modifier.width=min(bevel,min(size)*.12)
        modifier.segments=1 if min(size)<.20 else 2; modifier.limit_method="ANGLE"
    return obj


def tube(name, points, radii, mat, part, sides=8):
    points=[Vector(tuple(float(value) for value in point)) for point in points]
    if len(points)<2 or len(points)!=len(radii) or min(radii)<=0:
        raise ValueError("Invalid tube "+name)
    vertices,faces,uv,frame=[],[],[],None
    for row,point in enumerate(points):
        tangent=points[min(len(points)-1,row+1)]-points[max(0,row-1)]
        if tangent.length_squared<1e-20: raise ValueError("Repeated tube point "+name)
        tangent.normalize()
        if frame is None:
            ref=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((0,1,0))
            frame=tangent.cross(ref).normalized()
        else:
            frame-=tangent*frame.dot(tangent)
            if frame.length_squared<1e-16: frame=tangent.cross(Vector((0,1,0)))
            frame.normalize()
        other=tangent.cross(frame).normalized()
        for side in range(sides):
            phi=side*math.tau/sides
            vertices.append(tuple(point+(frame*math.cos(phi)+other*math.sin(phi))*radii[row]))
            uv.append((side/sides,row/(len(points)-1)))
    for row in range(len(points)-1):
        for side in range(sides):
            nxt=(side+1)%sides; a=row*sides+side; b=(row+1)*sides+side
            faces.append((a,row*sides+nxt,(row+1)*sides+nxt,b))
    start,end=len(vertices),len(vertices)+1
    vertices.extend((tuple(points[0]),tuple(points[-1]))); uv.extend(((.5,0),(.5,1)))
    for side in range(sides):
        faces.append((start,(side+1)%sides,side))
        faces.append((end,(len(points)-1)*sides+side,(len(points)-1)*sides+(side+1)%sides))
    return mesh_object(name,vertices,faces,mat,part,uv,"SIDES")


def cylinder(name, center, radius, height, mat, part, sides=24):
    return tube(name,[(center[0],center[1],center[2]-height/2),
                      (center[0],center[1],center[2]+height/2)],
                [radius,radius],mat,part,sides)


def oriented_cylinder(name, center, radius, height, axis, mat, part, sides=24):
    center,axis=Vector(center),Vector(axis).normalized()
    return tube(name,[center-axis*height/2,center+axis*height/2],[radius,radius],mat,part,sides)


def lathe(name, center, profile, mat, part, sides=32):
    vertices,faces,uv=[],[],[]
    if any(radius<=0 for radius,z in profile): raise ValueError("Collapsed lathe axis "+name)
    for row,(radius,z) in enumerate(profile):
        for side in range(sides):
            phi=side*math.tau/sides
            vertices.append((center[0]+radius*math.cos(phi),center[1]+radius*math.sin(phi),center[2]+z))
            uv.append((side/sides,row/len(profile)))
    for row in range(len(profile)):
        nxt=(row+1)%len(profile)
        for side in range(sides):
            edge=(side+1)%sides
            faces.append((row*sides+side,row*sides+edge,nxt*sides+edge,nxt*sides+side))
    return mesh_object(name,vertices,faces,mat,part,uv,True)


def torus(name, center, radius, minor, mat, part, normal=(0,0,1), segments=40, sides=6):
    normal=Vector(normal).normalized(); center=Vector(center)
    reference=Vector((0,0,1)) if abs(normal.z)<.9 else Vector((0,1,0))
    u=normal.cross(reference).normalized(); v=normal.cross(u).normalized()
    vertices,faces,uv=[],[],[]
    for row in range(segments):
        phi=row*math.tau/segments; radial=u*math.cos(phi)+v*math.sin(phi)
        for side in range(sides):
            theta=side*math.tau/sides
            vertices.append(tuple(center+radial*(radius+minor*math.cos(theta))+normal*(minor*math.sin(theta))))
            uv.append((row/segments,side/sides))
    for row in range(segments):
        nxt=(row+1)%segments
        for side in range(sides):
            edge=(side+1)%sides
            faces.append((row*sides+side,nxt*sides+side,nxt*sides+edge,row*sides+edge))
    return mesh_object(name,vertices,faces,mat,part,uv,True)


def ellipsoid(name, center, scale, mat, part, rings=8, sides=16):
    vertices,faces,uv=[(0,0,scale[2])],[],[(.5,1)]
    for row in range(1,rings):
        theta=math.pi*row/rings
        for side in range(sides):
            phi=side*math.tau/sides
            vertices.append((math.cos(phi)*math.sin(theta)*scale[0],math.sin(phi)*math.sin(theta)*scale[1],math.cos(theta)*scale[2]))
            uv.append((side/sides,1-row/rings))
    bottom=len(vertices); vertices.append((0,0,-scale[2])); uv.append((.5,0))
    for side in range(sides): faces.append((0,1+side,1+(side+1)%sides))
    for row in range(rings-2):
        for side in range(sides):
            nxt=(side+1)%sides; a=1+row*sides+side; b=1+(row+1)*sides+side
            faces.append((a,b,1+(row+1)*sides+nxt,1+row*sides+nxt))
    last=1+(rings-2)*sides
    for side in range(sides): faces.append((last+side,bottom,last+(side+1)%sides))
    obj=mesh_object(name,vertices,faces,mat,part,uv,True); obj.location=center
    return obj


def solid_grid(name, rows, cols, sample, outward, thickness, mat, part):
    outward=Vector(outward).normalized(); vertices,faces,uv=[],[],[]
    for layer in (1,-1):
        for row in range(rows):
            for col in range(cols):
                t,w=row/(rows-1),col/(cols-1)
                vertices.append(tuple(Vector(sample(float(t),float(w)))+outward*(layer*thickness/2)))
                uv.append((t,w))
    stride=rows*cols
    a,b,c=(Vector(vertices[i]) for i in (0,cols,cols+1))
    reverse=(b-a).cross(c-a).dot(outward)<0
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col; face=(a,a+cols,a+cols+1,a+1)
            if reverse: face=tuple(reversed(face))
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    perimeter=list(range(cols))+[row*cols+cols-1 for row in range(1,rows)]
    perimeter+=list(range(stride-2,stride-cols-1,-1))+[row*cols for row in range(rows-2,0,-1)]
    for index,a in enumerate(perimeter):
        b=perimeter[(index+1)%len(perimeter)]; face=(a,b,b+stride,a+stride)
        faces.append(tuple(reversed(face)) if reverse else face)
    return mesh_object(name,vertices,faces,mat,part,uv,True)


def timber_between(name, start, end, width, depth, part="shell", mat="Honey_Timber"):
    start,end=Vector(start),Vector(end)
    obj=box(name,(start+end)/2,(width,depth,(end-start).length),mat,part,min(width,depth)*.09,"Z")
    obj.rotation_euler=(end-start).to_track_quat("Z","Y").to_euler()
    return obj


def bolt(name, center, axis=(0,-1,0), radius=.045, part="decor"):
    return oriented_cylinder(name,center,radius,.032,axis,"Brass",part,6)


def binding(name, center, radius=.27, part="shell"):
    for ring in range(4):
        torus(name+"_%d"%ring,(center[0],center[1],center[2]+(ring-1.5)*.034),
              radius,.014,"Cream_Linen",part,segments=16,sides=5)


def build_deck_shell():
    # True flat deck: visible joints do not add unsupported gaps or height steps.
    box("Structural_Deck_Substrate",(0,0,-.17),(20,16,.14),"Dark_Joinery","shell",0)
    for row in range(30):
        y=-8+(row+.5)*16/30
        # Staggered handcrafted timber, rather than one large flat brown disc.
        seam=-2.8 if row%2 else 3.15
        for piece,(left,right) in enumerate(((-10,seam),(seam,10))):
            box("Deck_Plank_%02d_%d"%(row,piece),((left+right)/2,y,-.05),
                (right-left-.016,16/30-.014,.10),
                "Honey_Timber" if (row+piece)%7 else "Pale_Cut_Timber","shell",.009)
            for end in (left+.17,right-.17):
                cylinder("Deck_Recessed_Fastener_%02d_%d_%s"%(row,piece,end),
                         (end,y,-.006),.018,.008,"Dark_Iron","shell",6)
    for side in (-1,1):
        box("Deck_Side_Fascia_%s"%side,(side*9.91,0,-.27),(.18,16,.45),"Honey_Timber","shell",.020,"Y")
    for end in (-1,1):
        box("Deck_End_Fascia_%s"%end,(0,end*7.91,-.27),(19.8,.18,.45),"Honey_Timber","shell",.020)
    for name,x,z,height in POSTS:
        y=-z
        post=box("Crafted_Post_"+name,(x,y,height/2),(.46,.46,height),"Honey_Timber","shell",.042,"Z")
        post["collision_id"]="lab-post-"+name
        for h in (.24,height-.22):
            box("Forged_Post_Collar_%s_%s"%(name,h),(x,y,h),(.51,.51,.12),"Dark_Iron","shell",.016)
            bolt("Collar_Bolt_%s_%s"%(name,h),(x,y-.268,h),part="shell")
        binding("Post_Rope_Binding_"+name,(x,y,1.24),.272)
    # High beams join the rear and side posts. The public front remains unrailed.
    for a,b in zip(POSTS[:4],POSTS[1:4]):
        timber_between("Rear_Asymmetric_Beam_"+a[0],(a[1],-a[2],a[3]-.28),
                       (b[1],-b[2],b[3]-.28),.30,.34)
    for side,x,heights in (("left",-9.1,(6.8,5.2,4.4)),("right",9.1,(7.8,5.4,4.4))):
        for i,(z0,z1) in enumerate(((-7,-2),(-2,6.7))):
            timber_between("Side_Canted_Beam_%s_%d"%(side,i),(x,-z0,heights[i]-.20),
                           (x,-z1,heights[i+1]-.20),.25,.30)
        for i,z in enumerate((-6.6,-1.5)):
            h=heights[i]-.30
            timber_between("Knee_Brace_%s_%d"%(side,i),(x,-z,h-.76),(x+(-.85 if x>0 else .85),-z,h),.16,.18)
    # Sparse edge rail only behind the equipment. No front/transfer obstruction.
    for x0,x1 in ((-8.9,-6.5),(-2.1,2.7),(7.4,8.9)):
        for h in (.72,1.25):
            timber_between("Rear_Equipment_Rail_%s_%s"%(x0,h),(x0,7.65,h),(x1,7.65,h),.11,.14)
    for x in (-7.4,7.4):
        for y in (-5.5,0,5.5):
            timber_between("Underdeck_Solid_Brace_%s_%s"%(x,y),(x,y,-.35),(x*.77,y*.82,-2.02),.19,.22)


def canopy(name, corners, mat, sag):
    corners=[Vector(point) for point in corners]
    def sample(t,w):
        p=(corners[0]*(1-w)+corners[1]*w)*(1-t)+(corners[3]*(1-w)+corners[2]*w)*t
        p.z-=sag*math.sin(math.pi*t)*math.sin(math.pi*w)
        p.z+=.036*math.sin(w*21)*math.sin(math.pi*t)
        return p
    obj=solid_grid(name,19,15,sample,(0,0,1),.016,mat,"roof")
    obj["collision_policy"]="High non-walkable tensioned cloth"
    for a,b in ((0,1),(1,2),(2,3),(3,0)):
        points=[corners[a]*(1-t)+corners[b]*t-Vector((0,0,.030*math.sin(math.pi*t)))
                for t in np.linspace(0,1,12)]
        tube(name+"_Stitched_Edge_%d_%d"%(a,b),points,[.018]*len(points),"Cream_Linen","roof",6)


def build_open_canopies():
    # Concentrated rear planes keep all five case approaches in the open.
    canopy("Rear_Left_Cream_Sail",[(-9.02,6.77,6.47),(-4.6,6.77,7.38),
                                  (-4.6,3.2,5.63),(-9.02,2.25,4.97)],"Cream_Linen",.47)
    canopy("Rear_Central_Violet_Sail",[(-4.35,6.85,7.35),(4.35,6.85,6.83),
                                       (4.35,4.0,5.52),(-4.35,4.0,5.89)],"Violet_Cloth",.46)
    canopy("Rear_Right_Cream_Sail",[(4.55,6.78,6.9),(8.88,6.78,7.35),
                                   (8.88,3.25,5.41),(4.55,3.8,5.30)],"Cream_Linen",.43)
    # A narrow slatted left eave casts inhabited shadows, not a monolithic roof.
    for i,y in enumerate(np.linspace(2.15,6.55,12)):
        h=5.0+(float(y)-2.15)*.34
        timber_between("Left_Pergola_Rafter_%02d"%i,(-9.35,float(y),h),(-7.6,float(y),h+.08),.11,.14,"roof")
    for index,(x,y,h) in enumerate(((-4.5,7,7.7),(4.5,7,7.2),(-9.1,2,5.2),(9.1,2,5.4))):
        direction=1 if x<0 else -1
        timber_between("Handcut_Eave_Cantilever_%d"%index,(x,y,h-.20),(x+direction*.71,y,h-.15),.18,.22,"roof")


def build_central_holography():
    x,y=0,2.9
    base=lathe("Rear_Central_Holography_Foundation",(x,y,0),
               ((2.83,.02),(3.12,.16),(3.12,.54),(2.93,.72),(2.46,.72),(2.46,.56),(2.63,.16)),
               "Tempered_Silver","interior",64)
    base["collision_id"]="skills-machine"
    torus("Holography_Brass_Lower_Trim",(x,y,.15),3.04,.068,"Brass","interior",segments=64)
    torus("Holography_Cyan_Plane_Ring",(x,y,.75),2.49,.039,"Cyan_Light","interior",segments=80)
    cylinder("Holography_Dark_Recessed_Projection_Basin",(x,y,.625),2.44,.05,"Dark_Iron","interior",64)
    for i in range(12):
        phi=i*math.tau/12
        # Twelve actual housings break the saucer silhouette into a crafted machine.
        p=Vector((3.0*math.cos(phi),2.9+3.0*math.sin(phi),.39))
        panel=box("Holography_Segmented_Housing_%02d"%i,p,(.80,.31,.29),"Tempered_Silver","interior",.038)
        panel.rotation_euler.z=phi+math.pi/2
        lamp=box("Holography_Recessed_Cyan_Window_%02d"%i,(3.165*math.cos(phi),2.9+3.165*math.sin(phi),.39),
                 (.55,.018,.085),"Cyan_Light","interior",0)
        lamp.rotation_euler.z=phi+math.pi/2
        bolt("Holography_Radial_Fastener_%02d"%i,(2.89*math.cos(phi),2.9+2.89*math.sin(phi),.765),
             (0,0,1),.047,"interior")
    # Original physical wire holography: portable emissive geometry, not a shader
    # that disappears from exported GLB. Optional runtime rotation is separate.
    target=Vector((0,2.9,2.33))
    for i,normal in enumerate(((0,0,1),(0,.80,.60),(.80,.15,.58),(.18,.93,.31))):
        torus("Holography_Orbit_%d"%i,target,1.36+.09*(i%2),.020,"Cyan_Light","interior",normal,80,6)
    nodes=[]
    for i in range(8):
        phi=i*math.tau/8
        nodes.append(target+Vector((math.cos(phi)*.73,math.sin(phi)*.73,(.78 if i%2==0 else -.78))))
    for i,point in enumerate(nodes):
        tube("Holography_Polyhedral_Edge_%d"%i,[point,nodes[(i+1)%8]],[.017]*2,"Cyan_Light","interior",6)
        tube("Holography_Polyhedral_Diagonal_%d"%i,[point,nodes[(i+3)%8]],[.014]*2,"Cyan_Light","interior",5)
        ellipsoid("Holography_Feature_Node_%d"%i,point,(.052,)*3,"Cyan_Light","interior",5,10)
    for i in range(3):
        phi=.5+i*2.02; point=target+Vector((math.cos(phi)*1.40,math.sin(phi)*1.40,.28*math.sin(phi)))
        ellipsoid("Holography_Orbit_Emitter_%d"%i,point,(.090,)*3,"Cyan_Light","interior",7,12)


def schematic_panel(name, center, size, index, part="interior"):
    x,y,z=(v/2 for v in size)
    vertices=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
              (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    column,row=index%3,index//3
    def uv(p,n):
        return ((column+.018+.964*(p.x/size[0]+.5))/3,
                (row+.018+.964*(p.z/size[2]+.5))/2)
    obj=mesh_object(name,vertices,faces,"Screen_Atlas",part,uv); obj.location=center
    obj["content_status"]="Original decorative schematic, no factual UI/text or ratings"
    return obj


def small_book(name, center, color, horizontal=True):
    x,y,z=center
    if horizontal:
        for side in (-1,1):
            box(name+"_Cover_%s"%side,(x,y,z+side*.041),(.43,.31,.013),color,"interior",0)
        box(name+"_Page_Block",center,(.414,.295,.067),"Paper","interior",0)
        box(name+"_Coloured_Spine",(x,y-.151,z),(.43,.016,.074),color,"interior",0)
    else:
        for side in (-1,1): box(name+"_Cover_%s"%side,(x+side*.034,y,z),(.014,.29,.43),color,"interior",0)
        box(name+"_Page_Block",center,(.054,.275,.409),"Paper","interior",0)
        box(name+"_Coloured_Spine",(x,y-.143,z),(.07,.014,.43),color,"interior",0)


def build_capability_stations():
    for index,(x,z) in enumerate(STATIONS):
        y=-z; name="Skill_%d"%index
        top=box(name+"_Crafted_Technical_Worksurface",(x,y,1.23),(3,1.35,.14),"Honey_Timber","interior",.029)
        top["hotspot_id"]="skills-%d"%index; top["interaction_anchor_local_gltf"]=[x,1.3,z]
        for side in (-1,1):
            for end in (-1,1):
                timber_between(name+"_Leg_%s_%s"%(side,end),(x+side*1.25,y+end*.47,.02),
                               (x+side*1.19,y+end*.43,1.16),.15,.15,"interior")
            box(name+"_Drawer_%s"%side,(x+side*1.04,y+.025,.92),(.63,1.12,.34),"Honey_Timber","interior",.020)
            box(name+"_Drawer_Recess_%s"%side,(x+side*1.04,y-.55,.92),(.52,.022,.23),"Dark_Joinery","interior",.005)
            tube(name+"_Drawer_Brass_Pull_%s"%side,[(x+side*1.04-.08,y-.58,.92),(x+side*1.04+.08,y-.58,.92)],
                 [.013]*2,"Brass","interior",6)
        box(name+"_Rear_Drawer_Rail",(x,y+.48,.70),(2.60,.12,.18),"Dark_Joinery","interior",.012)
        # Small actual computer panels attached to their desks, not content boards.
        box(name+"_Display_Base",(x,y+.28,1.35),(.73,.38,.08),"Dark_Iron","interior",.017)
        box(name+"_Display_Stem",(x,y+.36,1.62),(.11,.11,.49),"Tempered_Silver","interior",.013)
        box(name+"_Display_Crafted_Rim",(x,y+.36,2.09),(1.83,.145,1.13),"Dark_Iron","interior",.021)
        schematic_panel(name+"_Original_Capability_Diagram",(x,y+.277,2.09),(1.65,.019,.96),index)
        for dx in (-.84,.84): bolt(name+"_Display_Corner_%s"%dx,(x+dx,y+.269,1.64),radius=.022,part="interior")
        box(name+"_Keyboard_Base",(x,y-.34,1.329),(.84,.27,.055),"Dark_Iron","interior",.007)
        for row in range(3):
            for col in range(11):
                box(name+"_Key_%d_%d"%(row,col),(x+(col-5)*.065,y-.426+row*.075,1.363),
                    (.047,.049,.015),"Ivory_Ceramic","interior",0)
        ellipsoid(name+"_Small_Desk_Mouse",(x+.65,y-.36,1.359),(.08,.11,.031),"Tempered_Silver","interior",5,10)
        for j in range(3): small_book(name+"_Reference_Notebook_%d"%j,(x+1.09,y+.15,1.36+j*.095),
                                    ("Book_Violet","Book_Ochre","Book_Teal")[(j+index)%3])
        # Five modest tangible cues follow the five actual category roles.
        if index==0:
            box(name+"_Modular_Code_Prototype",(x-.95,y+.12,1.60),(.40,.34,.58),"Violet_Cloth","interior",.045)
            for k in range(3): box(name+"_Prototype_Module_%d"%k,(x-.95,y-.06,1.43+k*.14),
                                  (.26,.028,.036),"Cyan_Light","interior",0)
        elif index==1:
            box(name+"_Miniature_Infrastructure_Rack",(x-.96,y+.12,1.57),(.42,.36,.55),"Dark_Iron","interior",.021)
            for k in range(4):
                box(name+"_Rack_Tray_%d"%k,(x-.96,y-.070,1.39+k*.115),(.34,.014,.075),"Tempered_Silver","interior",0)
                ellipsoid(name+"_Rack_Indicator_%d"%k,(x-.835,y-.083,1.39+k*.115),(.013,)*3,"Cyan_Light","interior",4,6)
        elif index==2:
            torus(name+"_Vision_Optic_Rim",(x-.96,y+.02,1.64),.26,.029,"Brass","interior",(0,-1,0),32,6)
            oriented_cylinder(name+"_Vision_Optic_Lens",(x-.96,y+.05,1.64),.23,.08,(0,-1,0),"Cyan_Light","interior",32)
            box(name+"_Vision_Optic_Stand",(x-.96,y+.11,1.40),(.11,.15,.20),"Dark_Iron","interior",.013)
        elif index==3:
            points=[Vector((x-.96,y+.06,1.59))+Vector(v) for v in ((-.21,0,0),(.19,0,.20),(.19,0,-.20))]
            for k in range(3):
                tube(name+"_Graph_Link_%d"%k,[points[k],points[(k+1)%3]],[.018]*2,"Brass","interior",6)
                ellipsoid(name+"_Graph_Node_%d"%k,points[k],(.062,)*3,"Violet_Light","interior",5,10)
        else:
            box(name+"_Layered_Security_Module",(x-.95,y+.10,1.58),(.38,.30,.52),"Tempered_Silver","interior",.025)
            torus(name+"_Security_Module_Lock_Rim",(x-.95,y-.06,1.59),.14,.023,"Brass","interior",(0,-1,0),24,6)
    for index,(x,z) in enumerate(STOOLS):
        y=-z
        cylinder("Stool_%d_Carved_Seat"%index,(x,y,.806),.32,.108,"Honey_Timber","interior",24)
        for dx,dy in ((-.19,-.19),(.19,-.19),(.19,.19),(-.19,.19)):
            timber_between("Stool_%d_Leg_%s_%s"%(index,dx,dy),(x+dx*1.2,y+dy*1.2,.03),
                           (x+dx,y+dy,.752),.085,.085,"interior")
        torus("Stool_%d_Footrest"%index,(x,y,.28),.24,.018,"Dark_Iron","interior",segments=20,sides=5)


def build_technical_mast_and_crane():
    # Rear technical stack and right crane supply the reference's uneven skyline.
    x,y=-3.65,6.55
    mast=lathe("Rear_Technical_Mast",(x,y,0),
               ((.73,0),(.81,.15),(.81,1.55),(.63,1.73),(.63,4.7),(.75,4.85),
                (.75,5.27),(.52,5.38),(.52,6.60),(.65,6.66),(.65,6.90),(.20,6.90),(.20,.10)),
               "Tempered_Silver","interior",32)
    mast["collision_id"]="lab-rear-technical-mast"
    for i,h in enumerate((.32,1.50,2.80,4.65,5.22,6.63)):
        torus("Rear_Mast_Forged_Collar_%d"%i,(x,y,h),.79 if i<2 else .69,.042,"Brass","interior",segments=32)
    for phi in np.linspace(0,math.tau,8,endpoint=False):
        tube("Rear_Mast_Longitudinal_Rib_%s"%phi,[(x+.64*math.cos(phi),y+.64*math.sin(phi),1.71),
             (x+.64*math.cos(phi),y+.64*math.sin(phi),4.74)],[.050]*2,"Dark_Iron","interior",6)
    for i,h in enumerate((2.1,3.5,5.75)):
        bolt("Rear_Mast_Square_Service_Hatch_Bolt_%d"%i,(x,y-.673,h),radius=.06,part="interior")
        box("Rear_Mast_Service_Hatch_%d"%i,(x,y-.653,h),(.42,.06,.44),"Dark_Iron","interior",.018)
    tube("Rear_Mast_Thin_Antenna",[(x+.52,y,6.4),(x+.52,y,8.33)],[.025]*2,"Brass","roof",8)
    ellipsoid("Rear_Mast_Antenna_Cap",(x+.52,y,8.36),(.068,)*3,"Amber_Light","roof",5,10)
    # Arm is high over the rear machine, not over a landing/approach capsule.
    pivot=Vector((9.1,7,7.52)); tip=Vector((1.6,4.4,7.88))
    timber_between("High_Crane_Handcrafted_Arm",pivot,tip,.37,.48,"roof")
    arm_axis=(tip-pivot).normalized()
    for i,fraction in enumerate((.06,.39,.76,.96)):
        point=pivot*(1-fraction)+tip*fraction
        oriented_cylinder("Crane_Silver_Hinge_%d"%i,point,.25,.58,(0,-1,0),"Tempered_Silver","roof",24)
        oriented_cylinder("Crane_Brass_Axle_%d"%i,point+Vector((0,-.31,0)),.105,.05,(0,-1,0),"Brass","roof",16)
    timber_between("Crane_Diagonal_Tension_Strut",(9.1,7,5.80),(7.15,6.32,7.68),.21,.23,"roof","Dark_Iron")
    for i,offset in enumerate((-.14,.14)):
        points=[pivot*(1-t)+tip*t+Vector((0,offset,-.27-.59*math.sin(math.pi*t))) for t in np.linspace(0,1,29)]
        tube("Crane_Hanging_Power_Cable_%d"%i,points,[.039]*len(points),"Dark_Iron","roof",8)
    sensor=Vector((1.6,4.4,6.37)); axis=Vector((0,-1,.04)).normalized()
    tube("Crane_Sensor_Suspension",[tip, sensor+Vector((0,0,.53))],[.048]*2,"Dark_Iron","roof",8)
    oriented_cylinder("Crane_Rounded_Sensor_Housing",sensor,.49,.58,axis,"Tempered_Silver","roof",40)
    for i,distance in enumerate((-.30,.30)):
        torus("Crane_Sensor_Brass_Trim_%d"%i,sensor+axis*distance,.50,.046,"Brass","roof",axis,40,6)
    oriented_cylinder("Crane_Sensor_Recessed_Optic",sensor+axis*.322,.35,.032,axis,"Cyan_Light","roof",40)
    for side in (-1,1): box("Crane_Sensor_Side_Bracket_%s"%side,(sensor.x+side*.51,sensor.y,sensor.z),
                            (.13,.32,.21),"Brass","roof",.018)


def build_dish_and_windsock():
    center=Vector((7.5,5.8,5.98)); normal=Vector((.14,-.76,.65)).normalized()
    ref=Vector((0,0,1)); u=normal.cross(ref).normalized(); v=normal.cross(u).normalized()
    # Closed, curved parabolic shell with a finite central plug (no collapsed rings).
    vertices,faces,uv=[],[],[]; sides,rings=48,10
    for surface in (0,1):
        for row in range(rings):
            radius=.12+(1.76-.12)*row/(rings-1)
            depth=.38*(radius/1.76)**2+surface*.045
            for side in range(sides):
                phi=side*math.tau/sides
                vertices.append(tuple(center+u*(radius*math.cos(phi))+v*(radius*math.sin(phi))+normal*depth))
                uv.append((side/sides,row/(rings-1)))
    stride=sides*rings
    for surface in (0,1):
        for row in range(rings-1):
            for side in range(sides):
                nxt=(side+1)%sides; a=surface*stride+row*sides+side
                face=(a,surface*stride+row*sides+nxt,surface*stride+(row+1)*sides+nxt,a+sides)
                faces.append(tuple(reversed(face)) if surface==0 else face)
    for row in (0,rings-1):
        for side in range(sides):
            nxt=(side+1)%sides; a=row*sides+side; b=row*sides+nxt
            face=(a,b,b+stride,a+stride)
            faces.append(tuple(reversed(face)) if row==0 else face)
    mesh_object("True_Parabolic_Satellite_Dish",vertices,faces,"Tempered_Silver","roof",uv,True)
    oriented_cylinder("Satellite_Dish_Centre_Plug",center+normal*.025,.121,.054,normal,"Tempered_Silver","roof",24)
    torus("Satellite_Dish_Forged_Rim",center+normal*.415,1.76,.036,"Brass","roof",normal,64,6)
    feed=center+normal*1.06
    for i,phi in enumerate((0,math.tau/3,math.tau*2/3)):
        edge=center+u*(1.61*math.cos(phi))+v*(1.61*math.sin(phi))+normal*.31
        tube("Dish_Receiver_Support_%d"%i,[edge,feed],[.031]*2,"Dark_Iron","roof",6)
    oriented_cylinder("Dish_Receiver",feed,.095,.23,normal,"Dark_Iron","roof",20)
    timber_between("Dish_High_Solid_Mount",(7.5,5.8,3.43),(7.5,5.8,5.74),.21,.25,"roof","Dark_Iron")
    # High windsock: original alternating opaque cloth segments with actual volume.
    x,y,h=9.45,6.25,9.25
    tube("Weather_Mast",[(x,y,3.40),(x,y,h)],[.043]*2,"Brass","roof",10)
    start=Vector((x,y,h)); axis=Vector((1,-.20,-.18)).normalized()
    for i in range(6):
        a=start+axis*(i*.25); b=start+axis*((i+1)*.25)
        radii=[.23-i*.017,.23-(i+1)*.017]
        tube("Windsock_Volumetric_Band_%d"%i,[a,b],radii,
             "Windsock_Red" if i%2==0 else "Cream_Linen","roof",16)
    torus("Windsock_Entry_Hoop",start,.23,.014,"Brass","roof",axis,24,5)
    ellipsoid("Weather_Mast_Finial",(x,y,h+.10),(.064,)*3,"Brass","roof",5,10)


def build_underside_thrusters():
    # Shared floating rock reaches about -17.56m below this root. Engines must
    # emerge under that real belly, not disappear inside its upper four metres.
    # No new rock surface or unsupported walking ledge is embedded in this GLB.
    for index,(x,y) in enumerate(((-8,-1),(0,3),(8,-1))):
        profile=((.89,-17),(1.06,-17.17),(1.06,-17.69),(.81,-17.86),(.81,-19.21),
                 (.94,-19.29),(.94,-19.64),(.62,-19.82),(.62,-20.33),(.45,-20.33),
                 (.45,-19.82),(.68,-19.68),(.68,-17.90),(.85,-17.68))
        lathe("Underdeck_Thruster_%d_Silver_Housing"%index,(x,y,0),profile,"Tempered_Silver","shell",40)
        for j,h in enumerate((-17.23,-17.66,-19.24,-19.64)):
            torus("Thruster_%d_Bronze_Reinforcement_%d"%(index,j),(x,y,h),1.07 if j<2 else .95,
                  .043,"Brass","shell",segments=40)
        for side in range(8):
            phi=side*math.tau/8
            tube("Thruster_%d_Protective_Rib_%d"%(index,side),
                 [(x+.87*math.cos(phi),y+.87*math.sin(phi),-17.85),
                  (x+.87*math.cos(phi),y+.87*math.sin(phi),-19.22)],
                 [.051]*2,"Dark_Iron","shell",6)
        torus("Thruster_%d_Cyan_Power_Core"%index,(x,y,-18.42),.818,.052,"Cyan_Light","shell",segments=48)
        cylinder("Thruster_%d_Recessed_Cyan_Exhaust"%index,(x,y,-20.25),.43,.07,"Cyan_Light","shell",32)
        pipe=[(x,y,-17.13),(x+(1 if x<0 else -1)*.84,y,-17.40),
              (x+(1 if x<0 else -1)*1.01,y,-19.15),(x,y,-19.45)]
        tube("Thruster_%d_Heavy_Curved_Power_Hose"%index,pipe,[.095]*4,"Dark_Iron","shell",10)
    # One shallow underdeck pipe loop ties machinery to the supporting platform.
    points=[(float(x),6.4,-.78-.13*math.sin(i*.7)) for i,x in enumerate(np.linspace(-8.7,8.7,18))]
    tube("Underdeck_Rear_Distribution_Pipe",points,[.10]*len(points),"Dark_Iron","shell",10)
    for side in (-1,1):
        # Outward bow passes beyond the upper rock shoulder before descending;
        # this is a service cable, not a physics hull or additional floor.
        anchors=[Vector((side*9.55,0,-.45)),Vector((side*13.5,.3,-5.5)),
                 Vector((side*13.2,.1,-13.6)),Vector((side*8.6,-1,-17.65))]
        points=[]
        for i in range(33):
            t=i/32
            points.append(anchors[0]*(1-t)**3+anchors[1]*3*t*(1-t)**2
                          +anchors[2]*3*t*t*(1-t)+anchors[3]*t**3)
        tube("External_Side_Service_Hose_%s"%side,points,[.14]*len(points),"Dark_Iron","shell",12)
        tube("External_Side_Amber_Service_Conduit_%s"%side,
             [point+Vector((0,.24,0)) for point in points],[.047]*len(points),"Brass","shell",8)


def lantern(name, center, scale=1):
    x,y,z=center
    for suffix,h,radius,height in (("Foot",-.245,.17,.057),("Crown",.245,.195,.061)):
        cylinder(name+"_"+suffix,(x,y,z+h*scale),radius*scale,height*scale,"Brass","decor",12)
    for dx,dy in ((-.12,-.12),(.12,-.12),(.12,.12),(-.12,.12)):
        tube(name+"_Frame_%s_%s"%(dx,dy),[(x+dx*scale,y+dy*scale,z-.22*scale),
             (x+dx*scale,y+dy*scale,z+.23*scale)],[.013*scale]*2,"Brass","decor",5)
    ellipsoid(name+"_Opaque_Warm_Core",center,(.097*scale,.097*scale,.185*scale),"Amber_Light","decor",7,12)
    torus(name+"_Suspension_Loop",(x,y,z+.35*scale),.069*scale,.010*scale,"Dark_Iron","decor",(0,1,0),12,5)


def broad_leaf(name, origin, direction, length, mat):
    origin,direction=Vector(origin),Vector(direction).normalized()
    normal=Vector((0,-1,.65)); normal-=direction*normal.dot(direction)
    if normal.length_squared<.02: normal=Vector((1,0,0)).cross(direction)
    normal.normalize(); across=normal.cross(direction).normalized()
    def sample(t,w):
        q=w*2-1; half=length*(.30*math.sin(math.pi*t)**.69+.012)
        return origin+direction*(length*t)+normal*(length*.16*math.sin(math.pi*t))\
            +across*(q*half)-normal*(length*.065*q*q*math.sin(math.pi*t))
    obj=solid_grid(name,7 if length>.65 else 5,5 if length>.65 else 3,sample,normal,.009,mat,"decor")
    obj["collision_policy"]="Soft volumetric greenery"


def vine(name, anchors, count=17, length=.43):
    a,b,c=(Vector(point) for point in anchors)
    def path(t): return a*(1-t)**2+b*2*t*(1-t)+c*t*t
    points=[path(float(t)) for t in np.linspace(0,1,19)]
    tube(name+"_Attached_Stem",points,[.024*(1-.35*t) for t in np.linspace(0,1,19)],"Dark_Joinery","decor",6)
    for i,t in enumerate(np.linspace(.03,.97,count)):
        direction=Vector(((-1 if i%2 else 1)*(.65+.12*math.sin(i)),-.33,-.23+.12*math.cos(i*1.4)))
        broad_leaf(name+"_Leaf_%02d"%i,path(float(t)),direction,length*(.86+.20*math.sin(i*1.7)),
                   ("Leaf_Green","Leaf_Deep","Leaf_Young")[(i//3)%3])


def wooden_planter(name, x, z):
    y=-z
    cylinder(name+"_Dark_Pot_Core",(x,y,.40),.42,.80,"Dark_Joinery","decor",20)
    for i in range(12):
        phi=i*math.tau/12
        stave=box(name+"_Crafted_Timber_Stave_%02d"%i,(x+.407*math.cos(phi),y+.407*math.sin(phi),.4),
                  (.19,.06,.77),"Honey_Timber","decor",.010,"Z")
        stave.rotation_euler.z=phi+math.pi/2
    for h in (.12,.68): torus(name+"_Iron_Hoop_%s"%h,(x,y,h),.439,.023,"Dark_Iron","decor",segments=24)
    cylinder(name+"_Recessed_Soil",(x,y,.746),.37,.035,"Soil","decor",24)
    for i in range(16):
        phi=i*math.tau/16
        direction=(math.cos(phi),math.sin(phi),.64+.10*math.sin(i))
        broad_leaf(name+"_Upright_Leaf_%02d"%i,(x,y,.79+i*.012),direction,.74+.18*math.sin(i*1.3),
                   ("Leaf_Green","Leaf_Deep","Leaf_Young")[i%3])


def build_greenery_lights_and_net():
    for name,x,z in POTS: wooden_planter("Wood_Planter_"+name,x,z)
    # Connected leafy masses are concentrated at edges, not scattered on approaches.
    for index,(x,y,h) in enumerate(((-9.08,2.12,5.02),(-9.07,6.82,6.58),(9.1,6.87,7.52),
                                  (-4.50,6.98,7.29))):
        vine("High_Post_Trailing_%d"%index,((x,y,h),(x+.22,y-.15,h-1.10),(x-.12,y-.03,h-2.15)),20,.47)
    for index,(left,right,y,h) in enumerate(((-9,-4.6,6.92,6.80),(-9,-7.55,2.15,5.02),
                                           (4.55,8.8,6.97,7.15))):
        vine("Leafy_Eave_Cluster_%d"%index,((left,y,h),((left+right)/2,y-.24,h-.40),(right,y,h-.10)),
             23,.43)
    for i,(x,y) in enumerate(((-9.90,-4.7),(9.90,3.9),(-8.7,7.86),(6.6,7.86))):
        vine("Underedge_Descending_Green_%d"%i,((x,y,.04),(x+.11,y-.03,-.85),(x-.15,y,-1.68)),18,.44)
    for i,point in enumerate(((-8.90,2.03,3.62),(-7.98,6.79,4.83),(-4.49,6.76,5.65),
                              (4.55,6.73,5.29),(8.86,2.09,3.90),(9.02,-6.45,3.42),(-9.0,-6.45,3.42))):
        lantern("Warm_Inhabited_Lantern_%d"%i,point,.84)
    pendant_points=[(float(x),6.72,5.78-.35*math.sin((float(x)+8.7)/17.4*math.pi))
                    for x in np.linspace(-8.7,8.7,30)]
    tube("Rear_Pendant_Cord",pendant_points,[.012]*len(pendant_points),"Dark_Iron","decor",6)
    for i,x in enumerate((-7.7,-5.1,-2.5,2.5,5.1,7.7)):
        h=5.78-.35*math.sin((x+8.7)/17.4*math.pi)
        lantern("Rear_Small_Pendant_%d"%i,(x,6.72,h-.28),.43)
    # Violet standard carries only an original geometric sun/gear symbol.
    x,y,h=-9.02,2.04,4.61
    timber_between("Violet_Standard_Crossbar",(x-.72,y,h+.07),(x+.72,y,h+.07),.10,.10,"decor")
    def sample(t,w):
        return (x+(w-.5)*1.20,y-.04-.065*math.sin(math.pi*t)*math.cos(w*math.tau),
                h-t*1.88+t**8*.23*(1-abs(w*2-1)))
    solid_grid("Violet_Standard_Closed_Cloth",17,11,sample,(0,-1,0),.012,"Violet_Cloth","decor")
    target=(x,y-.145,h-.73)
    torus("Standard_Golden_Gear_Core",target,.23,.024,"Brass","decor",(0,-1,0),32,6)
    for i in range(10):
        phi=i*math.tau/10
        tube("Standard_Gear_Ray_%d"%i,[(target[0]+math.cos(phi)*.24,target[1],target[2]+math.sin(phi)*.24),
             (target[0]+math.cos(phi)*.34,target[1],target[2]+math.sin(phi)*.34)],
             [.035,.024],"Brass","decor",6)
    # Shallow catch net draped over supported ground at the existing arrival.
    # It is not a new suspended footbridge and has no poles near player endpoints.
    for i,x in enumerate(np.linspace(-1.8,1.8,15)):
        points=[(float(x),-float(z),-.072-.015*math.sin((float(z)-13.5)*math.pi/2))
                for z in np.linspace(13.5,15.5,9)]
        tube("Arrival_Soft_Catch_Net_Long_%02d"%i,points,[.012]*len(points),"Cream_Linen","decor",5)
    for i,z in enumerate(np.linspace(13.5,15.5,9)):
        points=[(float(x),-float(z),-.072-.015*math.sin((float(z)-13.5)*math.pi/2))
                for x in np.linspace(-1.8,1.8,15)]
        tube("Arrival_Soft_Catch_Net_Cross_%02d"%i,points,[.012]*len(points),"Cream_Linen","decor",5)
    for side in (-1,1):
        tube("Arrival_Net_Bound_Edge_%s"%side,[(side*1.84,-13.45,-.073),(side*1.84,-15.55,-.073)],
             [.026]*2,"Cream_Linen","decor",6)


def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def setup_preview(scene,minimum,maximum):
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
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(.90,.95,1,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=.87
    scene.world=world
    # Whole authored asset including lower engines; runtime rock is intentionally
    # absent from this isolated preview and fills the central void in gameplay.
    target=Vector((.1,-.15,-5.3))
    data=bpy.data.cameras.new(PREFIX+"Preview_Camera"); data.type="ORTHO"; data.ortho_scale=42
    camera=bpy.data.objects.new(PREFIX+"Preview_Camera",data); scene.collection.objects.link(camera)
    camera.location=target+Vector((20,-31,18)); aim(camera,target); scene.camera=camera
    for name,kind,position,energy,color in (
        ("Warm_Daylight_Key","SUN",(-12,-17,23),2.35,(1,.89,.74)),
        ("Cool_Open_Front_Fill","AREA",(-2,-15,11),1750,(.79,.91,1)),
        ("Rear_Mechanical_Rim","SUN",(10,12,20),.73,(1,.97,.85)),
        ("Warm_Workbench_Fill","AREA",(0,5,4.4),260,(1,.82,.58))):
        data=bpy.data.lights.new(PREFIX+"Preview_"+name,kind); data.energy=energy; data.color=color
        if kind=="SUN": data.angle=math.radians(10)
        else: data.shape="DISK"; data.size=11 if name.startswith("Cool") else 6
        light=bpy.data.objects.new(PREFIX+"Preview_"+name,data); scene.collection.objects.link(light)
        light.location=position; aim(light,target)


def main():
    global COLLECTION
    random.seed(SEED); GROUPS.clear(); MATERIALS.clear(); TEXTURES.clear()
    # Only the dedicated author's asset/preview is replaced; not a game scene.
    for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
    for datablocks in (bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.worlds):
        for data in list(datablocks):
            if data.name.startswith(PREFIX) and data.users==0: datablocks.remove(data)
    for old in list(bpy.data.collections):
        if old.name.startswith(COLLECTION_NAME) and not old.objects and not old.children:
            bpy.data.collections.remove(old)
    COLLECTION=bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(COLLECTION)
    root=bpy.data.objects.new(ROOT_NAME,None); COLLECTION.objects.link(root)
    root["asset_id"]="suspended-lab-v1"; root["units"]="metres; Blender Z-up exports glTF Y-up"
    root["deck_walking_top_z"]=0.0; root["world_anchor_gltf"]=[-9,38.06,-133]
    root["no_upper_walking_floor"]=True
    root["design_note"]="Tropical open timber lab, five unchanged capability stations, rear holography, crafted high crane/dish and under-deck machinery; no invented skill score or credentials"
    for part in ("shell","roof","interior","decor"):
        obj=bpy.data.objects.new("Lab_"+part,None); COLLECTION.objects.link(obj); obj.parent=root
        obj["runtime_group"]=part; GROUPS[part]=obj
    GROUPS["roof"]["visibility_contract"]="High rear sails/crane/dish, no upper walkable floor"
    make_materials(); build_deck_shell(); build_open_canopies(); build_central_holography()
    build_capability_stations(); build_technical_mast_and_crane(); build_dish_and_windsock()
    build_underside_thrusters(); build_greenery_lights_and_net()
    bpy.context.view_layer.update()
    meshes=[obj for obj in COLLECTION.objects if obj.type=="MESH"]
    points=[obj.matrix_world@Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not points or not all(math.isfinite(value) for point in points for value in point):
        raise RuntimeError("Empty/nonfinite suspended-lab bounds")
    minimum=Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum=Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Equipment/foliage may soften deck margins, net extends to the actual arrival.
    if minimum.x < -14.2 or maximum.x > 14.2 or minimum.y < -15.9 or maximum.y > 9.0:
        raise RuntimeError("Lab exceeds authored equipment/arrival envelope: %s / %s"%(tuple(minimum),tuple(maximum)))
    if minimum.z < -20.5001 or maximum.z > 10.3:
        raise RuntimeError("Lab exceeds authored vertical envelope")
    depsgraph=bpy.context.evaluated_depsgraph_get(); triangles=vertices=0
    for obj in meshes:
        evaluated=obj.evaluated_get(depsgraph); data=evaluated.to_mesh()
        try:
            data.calc_loop_triangles(); triangles+=len(data.loop_triangles); vertices+=len(data.vertices)
            if not all(math.isfinite(value) for vertex in data.vertices for value in vertex.co):
                raise RuntimeError("Nonfinite evaluated geometry "+obj.name)
            if not all(math.isfinite(value) for layer in data.uv_layers for loop in layer.data for value in loop.uv):
                raise RuntimeError("Nonfinite evaluated UV "+obj.name)
        finally: evaluated.to_mesh_clear()
    if triangles>TRIANGLE_BUDGET or len(MATERIALS)>26 or len(TEXTURES)>10:
        raise RuntimeError("Lab authoring budget: triangles=%d/%d,materials=%d/26,images=%d/10,meshes=%d"%
                           (triangles,TRIANGLE_BUDGET,len(MATERIALS),len(TEXTURES),len(meshes)))
    if any(not image.packed_file or max(image.size)>TEXTURE_DIMENSION_MAX for image in TEXTURES):
        raise RuntimeError("Unpacked/oversized lab PBR image")
    annotation=collider_contract()
    text_name="SuspendedLab_V1_Collision_Proposal_JSON"; previous=bpy.data.texts.get(text_name)
    if previous is not None: bpy.data.texts.remove(previous)
    block=bpy.data.texts.new(text_name); block.write(json.dumps(annotation,indent=2))
    scene=bpy.context.scene; scene.unit_settings.system="METRIC"; scene.unit_settings.scale_length=1.0
    setup_preview(scene,minimum,maximum)
    output=artifacts.file(name=PREVIEW_NAME,media_type="image/png")
    scene.render.filepath=str(output.path); bpy.ops.render.render(write_still=True); output.publish()
    return {"asset":"suspended-lab-v1","blender_version":bpy.app.version_string,"root":ROOT_NAME,
            "mesh_objects":len(meshes),"evaluated_triangles":triangles,"evaluated_vertices":vertices,
            "materials":len(MATERIALS),"packed_pbr_images":[image.name for image in TEXTURES],
            "packed_image_dimensions":{image.name:list(image.size) for image in TEXTURES},
            "decoded_rgba8_texture_bytes":sum(int(image.size[0])*int(image.size[1])*4 for image in TEXTURES),
            "bounds_min_blender":[round(value,4) for value in minimum],
            "bounds_max_blender":[round(value,4) for value in maximum],
            "dimensions_m":[round(value,4) for value in maximum-minimum],
            "groups":[obj.name for obj in GROUPS.values()],"walking_top_z":0,
            "station_count":5,"solid_collider_proposal_count":len(annotation["hulls"]),
            "contract":annotation,"contract_text":text_name,"preview":PREVIEW_NAME,
            "acceptance":"Reference-led editable master. Actual GLB export/size, art, map/Rapier support/contacts, LOD and physical-device performance remain independent gates"}


result=main()
