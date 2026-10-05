"""Editable reference-led Welcome Harbor for the existing six-territory world.
Standalone Blender 5.2 authoring in a dedicated Higgsfield 3D Jutsu project.
Original metre-scale geometry and embedded portable PBR; not image-to-3D.
Blender(X,Y,Z) -> glTF(X,Z,-Y). Asset origin is the shared harbor floor centre.
Terrain, main walking paths, boarding ramps, contact jetty and spawn are external.
"""
import bpy
import json
import math
import random
import numpy as np
from mathutils import Vector, Matrix

PREFIX = "WelcomeHarbor_"
ROOT_NAME = "WelcomeHarbor_V1_Origin_At_Deck_Centre"
COLLECTION_NAME = "WelcomeHarbor_V1_Editable_Asset"
PREVIEW_NAME = "welcome-harbor-v1-eevee.png"
SEED = 271012
TRIANGLE_BUDGET = 135_000
TEXTURE_DIMENSION_MAX = 384
GROUPS, MATERIALS, TEXTURES = {}, {}, []
COLLECTION = None
CONTRACT = json.loads("{\"schema\":\"archipelago-static-building-contract-v1\",\"asset\":\"welcome-harbor-v1\",\"root\":\"WelcomeHarbor_V1_Origin_At_Deck_Centre\",\"units\":\"metres\",\"axes\":\"Local glTF Y-up: X right, Y up, Z south; entrance opens toward +X. Blender(X,Y,Z) -> glTF(X,Z,-Y). No runtime yaw rotation.\",\"anchor\":{\"island\":\"welcome\",\"x\":-13,\"y\":12.06,\"z\":70,\"yaw\":0},\"deck\":{\"id\":\"welcome-harbor-deck\",\"x\":0,\"z\":0,\"width\":6.2,\"depth\":4.2,\"bottom\":-0.24,\"height\":0.24,\"walkingTop\":0,\"yaw\":0},\"runtimeGroups\":[\"shell\",\"roof\",\"interior\",\"decor\"],\"semanticNodes\":[\"Harbor_shell\",\"Harbor_roof\",\"Harbor_interior\",\"Harbor_decor\"],\"visualEnvelope\":{\"shellWidth\":5.5,\"shellDepth\":3.5,\"roofWidth\":6.5,\"roofDepth\":4.7,\"roofSurfaceHalfDepth\":2.09,\"heightMax\":7,\"roofSoftNonSolid\":true},\"navigation\":{\"entry\":{\"x\":13,\"z\":-5},\"mapApproach\":{\"x\":2.6,\"z\":-0.7},\"outsideEntry\":{\"x\":3.7,\"z\":0.6},\"insideEntry\":{\"x\":0.65,\"z\":0.6},\"entryLaneClear\":{\"xMin\":0.65,\"xMax\":3.7,\"zMin\":0.5,\"zMax\":0.7},\"frontPortal\":{\"x\":2.55,\"zMin\":-1.33,\"zMax\":1.33,\"width\":2.66},\"front\":\"Open +X toward the existing plaza. Four corner posts only; no front wall, steps, continuous rail or extra solid centre post.\",\"noUpperWalkingFloors\":true},\"stations\":[],\"hulls\":[{\"id\":\"harbor-post-back-north\",\"role\":\"post\",\"kind\":\"box\",\"x\":-2.55,\"z\":-1.5,\"width\":0.34,\"depth\":0.34,\"bottom\":0,\"height\":3.65,\"yaw\":0},{\"id\":\"harbor-post-back-south\",\"role\":\"post\",\"kind\":\"box\",\"x\":-2.55,\"z\":1.5,\"width\":0.34,\"depth\":0.34,\"bottom\":0,\"height\":3.65,\"yaw\":0},{\"id\":\"harbor-post-front-north\",\"role\":\"post\",\"kind\":\"box\",\"x\":2.55,\"z\":-1.5,\"width\":0.34,\"depth\":0.34,\"bottom\":0,\"height\":3.65,\"yaw\":0},{\"id\":\"harbor-post-front-south\",\"role\":\"post\",\"kind\":\"box\",\"x\":2.55,\"z\":1.5,\"width\":0.34,\"depth\":0.34,\"bottom\":0,\"height\":3.65,\"yaw\":0},{\"id\":\"harbor-back-wall\",\"role\":\"wall\",\"kind\":\"box\",\"x\":-2.65,\"z\":0,\"width\":0.16,\"depth\":3.3,\"bottom\":0,\"height\":2.65,\"yaw\":0},{\"id\":\"harbor-counter\",\"role\":\"desk\",\"kind\":\"box\",\"x\":-1.6,\"z\":0,\"width\":0.9,\"depth\":2.15,\"bottom\":0,\"height\":1.1,\"yaw\":0},{\"id\":\"harbor-map-desk\",\"role\":\"desk\",\"kind\":\"box\",\"x\":1.1,\"z\":-0.7,\"width\":1.2,\"depth\":1.4,\"bottom\":0,\"height\":1.2,\"yaw\":0},{\"id\":\"harbor-crate\",\"role\":\"furniture\",\"kind\":\"box\",\"x\":-0.15,\"z\":-1.3,\"width\":0.65,\"depth\":0.65,\"bottom\":0,\"height\":0.65,\"yaw\":0},{\"id\":\"harbor-compass-mast\",\"role\":\"machine\",\"kind\":\"cylinder\",\"x\":-2.85,\"z\":-2.35,\"radius\":0.105,\"width\":0.21,\"depth\":0.21,\"bottom\":-0.12,\"height\":5.82,\"yaw\":0},{\"id\":\"harbor-barrel\",\"role\":\"furniture\",\"kind\":\"cylinder\",\"x\":-0.2,\"z\":1.2,\"radius\":0.4,\"width\":0.8,\"depth\":0.8,\"bottom\":0,\"height\":1,\"yaw\":0},{\"id\":\"harbor-pot\",\"role\":\"furniture\",\"kind\":\"cylinder\",\"x\":-1.9,\"z\":1.65,\"radius\":0.35,\"width\":0.7,\"depth\":0.7,\"bottom\":0,\"height\":0.8,\"yaw\":0}],\"collisionPolicy\":{\"solid\":\"One 6.2x4.2 structural floor plus the eleven listed conservative hulls. Ten solids stand on the floor; the lowered mast base is on existing terrain just north of the roof. No separate landing, bridge or upper walking floor.\",\"softNonSolid\":[\"roof and high rafters\",\"cloth and pennants\",\"leaves\",\"lamps\",\"compass decoration\",\"cartographic schematics\",\"books and small tools\"],\"noUpperWalkingFloors\":true,\"docksNotMerged\":true},\"mapProposal\":{\"architectureClearing\":null,\"preserved\":[\"six entire top/index buffers\",\"576 Float32 shoreline XYZ vertices\",\"four bridge profiles\",\"all 196 existing WORLD_PROPS\",\"all 21 hotspot anchors\",\"spawn (0,65) at Y12\",\"CONTACT_DOCK\",\"both boarding ramps\",\"four guided-transfer endpoints\",\"WALK_PATHS\"],\"seededPlacementPolicy\":\"Exclude only the new Welcome deck/hulls from seeded WORLD_PROPS rejection, retaining every old position/id/scale/yaw. Do not exclude them from navigation or Rapier. Nearest preserved palm trunk is 2.7668m beyond the high soft roof envelope.\",\"measuredTerrainRange\":[11.93039,11.99119],\"measuredPathEdgeClearanceMin\":1.823,\"existingDocks\":{\"contact\":{\"x\":0,\"z\":89,\"top\":9.335671792282461,\"width\":5,\"depth\":7.5,\"owner\":\"existing world/physics, not Harbor GLB\"},\"harborBoatStart\":{\"x\":-27,\"z\":63},\"harborBoatEnd\":{\"x\":-47,\"z\":63},\"owner\":\"existing separate boarding ramps and transit props\"}},\"authoringBudgets\":{\"trianglesSafetyMax\":135000,\"materialsMax\":26,\"imagesMax\":10,\"textureDimensionMax\":384,\"runtimeBytesMax\":8388608,\"runtimeMeshesMax\":96,\"runtimeTrianglesMax\":180000},\"factualBoundary\":\"Original fictional nautical welcome kiosk. Decorative map and compass are not personal facts, project screenshots or proof. No new content station, personal claim or unlock gate.\",\"status\":\"Approved source contract; local map/fallback and actual-module Rapier implementation in progress. Actual GLB fidelity, runtime readiness and device acceptance remain unverified.\"}")

def rgba(rgb):
    return np.concatenate((np.clip(rgb, 0, 1), np.ones((*rgb.shape[:2], 1))), axis=2)


def packed_image(name, pixels, non_color=False):
    if max(pixels.shape[:2]) > TEXTURE_DIMENSION_MAX:
        raise RuntimeError("Harbor texture sizing guard")
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
    obj["asset_role"]="Original reference-led welcome harbor geometry"
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


def make_materials():
    u,v = np.meshgrid(np.linspace(0,1,384,endpoint=False), np.linspace(0,1,288,endpoint=False))
    flow=v+.013*np.sin(u*15+v*8)+.004*np.sin(u*42-v*18)
    grain=np.sin(flow*math.tau*29)+.28*np.sin(flow*math.tau*73+u*7)
    r=np.sqrt(((u-.58)*1.5)**2+((v-.48)*4.5)**2)
    knot=np.sin(r*52)*np.exp(-r*7)
    fine=np.sin(u*411+v*311)*np.sin(u*217-v*533)
    timber=packed_image("Honey_Timber_Base_384",rgba((.98+grain*.027+knot*.049+fine*.007)[...,None]*(.73,.425,.185)))
    timber_n=normal_image("Honey_Timber_Normal_384",grain*.024+knot*.025,7)
    rough=np.clip(.68+grain*.023+fine*.009,.59,.79)
    timber_r=packed_image("Honey_Timber_Roughness_384",rgba(np.repeat(rough[...,None],3,axis=2)),True)
    material("Honey_Timber",(.73,.425,.185),base=timber,normal=timber_n,rough_map=timber_r)
    material("Dark_Joinery",(.28,.13,.051),.77,normal=timber_n)
    material("Pale_Cut_Timber",(.80,.53,.28),.73,normal=timber_n)
    clay=np.sin(u*37+v*31)*.016+np.sin(u*131-v*111)*.005
    clay_n=normal_image("Terracotta_Normal_384",clay,5)
    material("Terracotta",(.68,.21,.095),.76,normal=clay_n)
    material("Terracotta_Sun",(.80,.29,.13),.74,normal=clay_n)
    hammer=np.sin(u*159+v*183)*np.sin(u*231-v*127)
    metal_n=normal_image("Hammered_Brass_Normal_384",hammer*.011,3)
    material("Brass",(.76,.51,.18),.32,.75,normal=metal_n)
    material("Dark_Iron",(.074,.089,.11),.51,.65,normal=metal_n)
    u,v=np.meshgrid(np.linspace(0,1,256,endpoint=False),np.linspace(0,1,256,endpoint=False))
    weave=np.sin(u*math.tau*63)*np.sin(v*math.tau*59)
    linen_n=normal_image("Woven_Linen_Normal_256",weave*.025,3)
    material("Cream_Linen",(.94,.86,.69),.88,normal=linen_n)
    material("Violet_Cloth",(.32,.060,.64),.86,normal=linen_n)
    material("Paper",(.88,.80,.61),.95)
    material("Ivory_Ceramic",(.90,.85,.72),.37)
    vein=np.exp(-((v-.5)/.042)**2); ribs=np.sin(u*53-abs(v-.5)*15)
    leaf=packed_image("Broad_Leaf_Base_256",rgba((.97+.052*np.sin(u*19+v*11)+ribs*.026)[...,None]*(.28,.48,.065)+vein[...,None]*(.08,.09,.012)))
    leaf_n=normal_image("Broad_Leaf_Normal_256",vein*.060+ribs*.016,4)
    material("Leaf_Green",(.28,.48,.065),.53,base=leaf,normal=leaf_n)
    material("Leaf_Deep",(.08,.24,.051),.59,normal=leaf_n)
    material("Leaf_Young",(.46,.63,.13),.56,normal=leaf_n)
    material("Soil",(.09,.06,.032),.96)
    material("Bloom_Coral",(.88,.15,.095),.67)
    material("Book_Violet",(.30,.085,.50),.81)
    material("Book_Ochre",(.76,.43,.12),.81)
    material("Book_Teal",(.071,.34,.32),.81)
    material("Chart_Sea",(.045,.37,.52),.81)
    material("Chart_Island",(.46,.56,.19),.81)
    material("Amber_Light",(.98,.68,.22),.33,emission=(1,.51,.10),emission_strength=1.4)

def B(x,z,h):
    return (x,-z,h)


def fit_radial_dressing(objects,x,z,factor):
    """Only shrink the physical footprint, never lower the supported base."""
    centre=Vector(B(x,z,0))
    matrix=Matrix.Translation(centre)@Matrix.Diagonal((factor,factor,1,1))@Matrix.Translation(-centre)
    # Fresh TRS, not dependency-graph matrix_local: newly created boxes still
    # have stale identity there until Blender updates, losing their location.
    for obj in objects:
        fresh=Matrix.LocRotScale(obj.location.copy(),obj.rotation_euler.to_quaternion(),obj.scale.copy())
        obj.matrix_basis=matrix@fresh


def fit_supported_dressing(objects, x, z, width, depth, top, ground=False):
    """Fit evaluated physical geometry, including trim/bevels, into its hull."""
    bpy.context.view_layer.update()
    graph=bpy.context.evaluated_depsgraph_get(); points=[]
    for obj in objects:
        evaluated=obj.evaluated_get(graph); mesh=evaluated.to_mesh()
        try: points.extend(obj.matrix_world@v.co for v in mesh.vertices)
        finally: evaluated.to_mesh_clear()
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    centre=Vector(B(x,z,0))
    fx=min(1,width/2/max(high.x-centre.x,centre.x-low.x))
    fy=min(1,depth/2/max(high.y-centre.y,centre.y-low.y))
    shift=-low.z if ground else 0
    fz=min(1,top/(high.z+shift))
    matrix=Matrix.Translation(centre)@Matrix.Diagonal((fx,fy,fz,1))@Matrix.Translation(-centre+Vector((0,0,shift)))
    for obj in objects:
        fresh=Matrix.LocRotScale(obj.location.copy(),obj.rotation_euler.to_quaternion(),obj.scale.copy())
        obj.matrix_basis=matrix@fresh


def barrel(name,x,z,scale=1):
    y=-z
    profile=[(.36*scale,.035*scale),(.46*scale,.26*scale),
             (.49*scale,.63*scale),(.445*scale,.98*scale),
             (.37*scale,1.15*scale),(.32*scale,1.15*scale),
             (.32*scale,1.10*scale),(.30*scale,.055*scale)]
    lathe(name+"_Rounded_Staved_Body",(x,y,0),profile,"Honey_Timber","decor",32)
    for i in range(16):
        angle=i*math.tau/16
        tube(name+"_Stave_Join_%02d"%i,[(x+r*math.cos(angle),y+r*math.sin(angle),h)
             for r,h in profile[:5]],[.007*scale]*5,"Dark_Joinery","decor",5)
    for i,h in enumerate((.19,.57,1.00)):
        torus(name+"_Iron_Hoop_%02d"%i,(x,y,h*scale),(.43 if i!=1 else .495)*scale,.024*scale,"Dark_Iron","decor",segments=32)
        for j in range(8):
            phi=j*math.tau/8
            ellipsoid(name+"_Hoop_Rivet_%d_%d"%(i,j),(x+.50*scale*math.cos(phi),y+.50*scale*math.sin(phi),h*scale),(.018*scale,)*3,"Brass","decor",5,8)
    for i in range(5):
        offset=(i-2)*.132*scale
        length=2*math.sqrt(max(.001,(.348*scale)**2-offset**2))
        box(name+"_Lid_Plank_%02d"%i,(x+offset,y,1.137*scale),(.128*scale,length,.030*scale),"Pale_Cut_Timber","decor",.006)
    box(name+"_Lid_Bung",(x+.12*scale,y-.10*scale,1.16*scale),(.08*scale,.10*scale,.020*scale),"Dark_Joinery","decor",.007)


def crate(name,x,z,size=.72):
    y=-z
    box(name+"_Recessed_Core",(x,y,size/2),(size*.94,)*3,"Dark_Joinery","decor",.015)
    for i in range(5):
        shift=(i-2)*size/5
        for side in (-1,1):
            box(name+"_Front_Back_%d_%d"%(i,side),(x+shift,y+side*size/2,size/2),(size/5-.012,.055,size),"Honey_Timber","decor",.009,"Z")
            box(name+"_Side_%d_%d"%(i,side),(x+side*size/2,y+shift,size/2),(.055,size/5-.012,size),"Honey_Timber","decor",.009,"Z")
        box(name+"_Top_%d"%i,(x+shift,y,size),(size/5-.012,size,.055),"Pale_Cut_Timber","decor",.009)
    for side in (-1,1):
        for h in (.13*size,.85*size):
            box(name+"_Band_%d_%s"%(side,h),(x,y+side*(size/2+.025),h),(size+.10,.05,.13*size),"Pale_Cut_Timber","decor",.009)
        timber_between(name+"_Diagonal_%d"%side,(x-size*.42,y+side*(size/2+.005),size*.14),(x+size*.42,y+side*(size/2+.005),size*.86),.09,.045,"decor","Pale_Cut_Timber")


def hibiscus(name,x,z,h):
    center=Vector(B(x,z,h))
    for p in range(5):
        phi=p*math.tau/5
        ellipsoid(name+"_Petal_%d"%p,center+Vector((math.cos(phi),-.18,math.sin(phi)))*.14,
                  (.14,.045,.17),"Bloom_Coral","decor",7,12)
    ellipsoid(name+"_Centre",center+Vector((0,-.035,0)),(.055,.055,.055),"Book_Ochre","decor",7,12)


def compass(name,center,radius=.47,normal=(0,-1,0),part="decor"):
    c=Vector(center); n=Vector(normal).normalized()
    a=Vector((1,0,0)) if abs(n.x)<.8 else Vector((0,1,0))
    a=(a-n*a.dot(n)).normalized(); b=n.cross(a).normalized()
    torus(name+"_Outer_Ring",c,radius*.84,radius*.022,"Brass",part,n,40,6)
    for i in range(8):
        angle=i*math.tau/8; d=a*math.cos(angle)+b*math.sin(angle); cross=n.cross(d)
        reach=radius*(1 if i%2==0 else .72)
        vertices=[tuple(c+d*reach+n*.009),tuple(c+d*.09+cross*radius*.10+n*.009),
                  tuple(c+d*.17-n*.005),tuple(c+d*.09-cross*radius*.10+n*.009)]
        mesh_object(name+"_Point_%d"%i,vertices,[(0,1,2),(0,2,3),(0,3,1),(1,3,2)],"Brass",part,[(.5,1),(0,0),(.5,0),(1,0)],False)


def gable_roof(width,depth,eave=3.36,rise=1.30):
    # Curved individual barrel tiles with thickness, overlapping in downslope
    # rows. They retain portable PBR, true edge silhouettes and open end lips.
    margin=.24; cols=math.ceil((depth+margin*2)/.29); rows=8
    tile_w=(depth+margin*2)/cols; half=width/2+.28
    for side in (-1,1):
        def base(t,w,side=side):
            return (side*half*t,(w-.5)*(depth+.48),eave+rise*(1-t))
        solid_grid("Roof_%d_Timber_Bed"%side,3,5,base,(side*.3,0,1),.09,"Dark_Joinery","roof")
        for row in range(rows):
            lo=row/rows; hi=min(1,(row+1.19)/rows)
            for col in range(cols):
                yc=-(depth/2+.24)+(col+.5)*tile_w
                def tile(t,w,lo=lo,hi=hi,yc=yc,side=side):
                    slope=lo+(hi-lo)*t
                    q=(w-.5)*2
                    arch=.075*math.sqrt(max(.05,1-q*q))
                    return (side*half*slope,yc+q*(tile_w*.49),eave+rise*(1-slope)+.10+arch+row*.001)
                solid_grid("Roof_%d_Row_%02d_Handmade_Tile_%02d"%(side,row,col),4,9,tile,(side*.3,0,1),.027,
                           "Terracotta_Sun" if (row+col)%7==0 else "Terracotta","roof")
        for edge in (-1,1):
            timber_between("Gable_Rafter_%d_%d"%(side,edge),(side*half,edge*(depth/2+.30),eave-.07),
                           (0,edge*(depth/2+.30),eave+rise-.07),.16,.14,"roof","Pale_Cut_Timber")
    tube("Ridge_Curved_Cap",[(0,y,eave+rise+.16) for y in np.linspace(-depth/2-.31,depth/2+.31,24)],
         [.15]*24,"Terracotta_Sun","roof",12)
    for edge in (-1,1):
        box("Eave_%d_Crafted_Fascia"%edge,(edge*half,0,eave-.045),(.12,depth+.64,.19),"Honey_Timber","roof",.02,"Y")


def hanging_awning(width,depth,eave):
    def cloth(t,w):
        x=(w-.5)*width; y=-depth/2-.12-t*.35
        return (x,y,eave-.11-.20*math.sin(math.pi*t)*(.50+.50*math.sin(math.pi*w)))
    solid_grid("Front_Cream_Scalloped_Linen",9,25,cloth,(0,-.3,1),.012,"Cream_Linen","roof")
    tube("Awning_Front_Rope",[(x,-depth/2-.47,eave-.11-.03*math.sin(x*4)) for x in np.linspace(-width/2,width/2,36)],
         [.014]*36,"Cream_Linen","roof",6)


def mast_banner(x,z,height=5.7):
    cylinder("Compass_Flag_Mast",B(x,z,height/2),.105,height,"Honey_Timber","shell",16)
    timber_between("Compass_Flag_Crossbar",B(x-.13,z,height-.20),B(x+1.55,z,height-.20),.13,.13,"roof")
    def cloth(t,w):
        x0=x+.14+w*1.24
        bottom=height-.4-1.90+.32*(1-abs(w-.5)*2)
        return (x0,-z+.08*math.sin(t*4+w*3),height-.4+(bottom-height+.4)*t)
    solid_grid("Violet_Compass_Pennant",19,13,cloth,(0,-1,0),.009,"Violet_Cloth","roof")
    compass("Gold_Navigator_Emblem",B(x+.76,z+.09,height-1.12),.48,(0,-1,0),"roof")
    for h in (.35,1.12,height-.22): binding("Mast_Rope_%s"%h,B(x,z,h),.122,"shell")


def chart_table(x,z,width=1.8,depth=1.10,height=1.16):
    y=-z
    for dx in (-width*.39,width*.39):
        timber_between("Cartography_Trestle_%s"%dx,(x+dx,y-.39,0),(x+dx,y+.28,height-.07),.15,.13,"interior")
        timber_between("Cartography_Trestle_Back_%s"%dx,(x+dx,y+.39,0),(x+dx,y-.28,height-.07),.15,.13,"interior")
    box("Cartography_Desk_Base",(x,y,height-.08),(width,depth,.16),"Honey_Timber","interior",.026)
    chart=box("Illustrative_Archipelago_Chart",(x,y,height+.017),(width-.17,depth-.15,.024),"Chart_Sea","interior",.007)
    # No source screenshots, invented labels or texture text: abstract island map.
    marks=((-0.32,-.23,.13,.11),(.23,-.08,.19,.12),(-.08,.26,.14,.09),(.48,.29,.075,.08),(-.47,.26,.075,.07),(.02,-.33,.075,.05))
    for i,(dx,dz,sx,sy) in enumerate(marks):
        ellipsoid("Chart_Illustrated_Island_%d"%i,(x+dx*width,y+dz*depth,height+.038),(sx*width,sy*depth,.018),"Chart_Island","interior",5,12)
    for dx in (-1,1):
        box("Chart_Frame_Long_%d"%dx,(x,y+dx*(depth-.12)/2,height+.045),(width,.08,.085),"Pale_Cut_Timber","interior",.014)
        box("Chart_Frame_Side_%d"%dx,(x+dx*(width-.10)/2,y,height+.045),(.08,depth,.085),"Pale_Cut_Timber","interior",.014,"Y")
    compass("Chart_Compass_Rose",(x+width*.31,y-depth*.30,height+.08),.11,(0,0,1),"interior")
    for i in range(3):
        cylinder("Chart_Metal_Pin_%d"%i,(x+(i-1)*.37,y+.04,height+.073),.022,.019,"Brass","interior",8)


def authored_book(name,x,y,z,height=.35,thickness=.085):
    box(name+"_Binding",(x,y,z+height/2),(thickness,.20,height),"Book_Violet" if int(abs(x*100))%3==0 else "Book_Ochre","interior",.009,"Z")
    box(name+"_Page_Block",(x,y-.007,z+height/2),(thickness*.76,.19,height*.90),"Paper","interior",.005,"Z")
    box(name+"_Spine",(x,y+.097,z+height/2),(thickness+.018,.027,height+.017),"Book_Teal","interior",.005,"Z")

def build_floor():
    width,depth=6.2,4.2
    for row in range(10):
        z=-depth/2+(row+.5)*depth/10
        for col in range(3):
            x=-width/2+(col+.5)*width/3
            box("Floor_Row_%02d_Board_%d"%(row,col),B(x,z,-.09),
                (width/3-.018,depth/10-.023,.18),
                "Pale_Cut_Timber" if (row+col)%7==0 else "Honey_Timber","shell",.012)
            for end in (-1,1):
                bolt("Board_Nail_%d_%d_%d"%(row,col,end),B(x+end*(width/6-.09),z,.004),(0,0,1),.022,"shell")
    for z in (-depth/2+.15,depth/2-.15):
        box("Foundation_Beam_Z_%s"%z,B(0,z,-.24),(width,.30,.24),"Dark_Joinery","shell",.025)
    for x in (-width/2+.15,width/2-.15):
        box("Foundation_Beam_X_%s"%x,B(x,0,-.24),(.30,depth,.24),"Dark_Joinery","shell",.025,"Y")
    # Buried below the unchanged terrain: no stilts, floating undercroft or
    # new water-level jetty masquerading as the terrestrial welcome booth.


def build_structure(contract):
    for h in contract["hulls"]:
        name=h["id"]; x,z=h["x"],h["z"]; bottom=h.get("bottom",0); height=h["height"]
        if name.startswith("harbor-post-"):
            radius=min(h["width"],h["depth"])*.45
            cylinder(name,B(x,z,bottom+height/2),radius,height,"Honey_Timber","shell",16)
            box(name+"_Brass_Foot",B(x,z,.10),(h["width"],h["depth"],.16),"Brass","shell",.02)
            for y in (.67,2.75):
                binding(name+"_Rope_%s"%y,B(x,z,y),radius+.002,"shell")
            if x>0:
                lantern(name+"_Arrival_Lantern",B(x+.08,z,2.36),1.10)
        elif h["role"]=="wall":
            # A shallow backing on -X only; the entire +X facade and +Z entry
            # remain genuinely open, with no opaque side wall or UI image plane.
            for i in range(14):
                wz=z+(i-6.5)*h["depth"]/14
                box(name+"_Board_%02d"%i,B(x,wz,height/2),(h["width"],h["depth"]/14-.008,height),"Honey_Timber","shell",.01,"Z")
            for y in (.19,1.33,height-.1):
                box(name+"_Batten_%s"%y,B(x+.045,z,y),(.07,h["depth"],.11),"Dark_Joinery","shell",.008,"Y")
        elif name=="harbor-counter":
            box("Counter_Cabinet_Core",B(x,z,.48),(h["width"]-.03,h["depth"]-.03,.96),"Dark_Joinery","interior",.024)
            for i in range(9):
                pz=z+(i-4)*h["depth"]/9
                box("Counter_Joinery_Front_%d"%i,B(x+h["width"]/2-.025,pz,.48),(.05,h["depth"]/9-.012,.91),"Honey_Timber","interior",.007,"Z")
            box("Harbor_Counter_Slab",B(x,z,height-.07),(h["width"],h["depth"],.14),"Pale_Cut_Timber","interior",.024,"Y")
        elif name in ("harbor-chart","harbor-map-desk"):
            # The desk footprint and maximum solid height follow this hull.
            chart_table(x,z,h["width"],h["depth"],height-.12)
        elif "barrel" in name:
            existing=set(COLLECTION.objects)
            barrel(name,x,z,height/1.17)
            fit_radial_dressing(set(COLLECTION.objects)-existing,x,z,h["radius"]/(.519*height/1.17))
            fit_supported_dressing(set(COLLECTION.objects)-existing,x,z,h["radius"]*2,h["radius"]*2,height,ground=True)
        elif "crate" in name:
            crate(name,x,z,min(h["width"],h["depth"],height)-.10)
        elif "pot" in name:
            existing=set(COLLECTION.objects)
            wooden_planter(name,x,z)
            fit_radial_dressing(set(COLLECTION.objects)-existing,x,z,h["radius"]/.48)
        elif "mast" in name:
            mast_banner(x,z,bottom+height)
            if bottom<0:
                cylinder("Compass_Mast_Buried_Terrain_Foot",B(x,z,bottom/2),h["radius"],-bottom,"Honey_Timber","shell",16)
    # Four upper tie beams, knee braces and roof only: no decorative beam at
    # chest height through an entrance.
    for side in (-1,1):
        box("High_Tie_Beam_X_%d"%side,B(0,side*1.50,3.18),(5.62,.21,.25),"Dark_Joinery","shell",.025)
        box("High_Tie_Beam_Z_%d"%side,B(side*2.55,0,3.18),(.21,3.22,.25),"Dark_Joinery","shell",.025,"Y")
        for z in (-1.5,1.5):
            timber_between("Knee_Brace_%d_%s"%(side,z),B(side*2.55,z,2.56),B(side*1.9,z,3.22),.14,.14)
    # Build the gable in local front+Z, then rotate just its new objects so
    # its front and cream canopy face world+X, toward the plaza.
    existing=set(COLLECTION.objects)
    gable_roof(3.5,5.5,3.36,1.21)
    hanging_awning(3.62,5.5,3.36)
    for obj in set(COLLECTION.objects)-existing:
        fresh=Matrix.LocRotScale(obj.location.copy(),obj.rotation_euler.to_quaternion(),obj.scale.copy())
        obj.matrix_basis=Matrix.Rotation(math.pi/2,4,"Z")@fresh


def build_interior(contract):
    counter=next(h for h in contract["hulls"] if h["id"]=="harbor-counter")
    x,z=counter["x"],counter["z"]; top=counter["height"]
    for i in range(6):
        authored_book("Navigator_Ledger_%d"%i,x-.15,-z+(i-2.5)*.13,top,.33+(i%3)*.06)
    lantern("Counter_Warm_Work_Lantern",B(x+.08,z+.58,top+.35),.80)
    cylinder("Counter_Ink_Cup",B(x+.12,z-.49,top+.09),.065,.18,"Ivory_Ceramic","interior",20)
    cylinder("Counter_Recessed_Ink",B(x+.12,z-.49,top+.180),.052,.012,"Dark_Iron","interior",20)
    tube("Counter_Quill", [B(x+.10,z-.50,top+.11),B(x+.18,z-.60,top+.49)],[.008,.007],"Pale_Cut_Timber","interior",6)
    for i in range(2):
        box("Rolled_Navigation_Charts_%d"%i,B(x-.05,z-.25+i*.19,top+.025+i*.031),(.40,.15,.025),"Paper","interior",.005)
    # Shelving and a traditional wheel are mounted to the sole rear wall, not
    # scattered as rigid obstacles through the centre of the booth.
    for y in (1.55,2.28):
        box("Back_Wall_Shelf_%s"%y,B(-2.49,-.55,y),(.28,1.45,.075),"Pale_Cut_Timber","interior",.015,"Y")
        for i in range(7):
            authored_book("Shelf_%s_Travel_Ledger_%d"%(y,i),-2.38,.18+i*.14,y+.045,.29+(i%3)*.04)
    wheel_center=Vector(B(-2.48,.70,2.03))
    torus("Traditional_Harbor_Wheel",wheel_center,.42,.031,"Dark_Joinery","interior",(1,0,0),48,8)
    torus("Wheel_Inner_Brass_Ring",wheel_center+Vector((.015,0,0)),.31,.017,"Brass","interior",(1,0,0),32,6)
    oriented_cylinder("Wheel_Solid_Hub",wheel_center,.090,.075,(1,0,0),"Brass","interior",20)
    for i in range(8):
        phi=i*math.tau/8; direction=Vector((0,math.cos(phi),math.sin(phi)))
        tube("Wheel_Spoke_%d"%i,[wheel_center+direction*.07,wheel_center+direction*.53],[.021,.026],"Pale_Cut_Timber","interior",8)
        ellipsoid("Wheel_Grip_%d"%i,wheel_center+direction*.53,(.042,.037,.055),"Honey_Timber","interior",7,12)


def build_dressing(contract):
    for h in contract["hulls"]:
        if "pot" in h["id"]:
            for i in range(3):
                hibiscus("Pot_Coral_Flower_%d"%i,h["x"]+.24*math.sin(i*2.5),h["z"]+.24*math.cos(i*2.5),1.05+i*.09)
    vine("Attached_Back_Gable_Vine",[B(-2.57,-1.46,3.25),B(-2.69,-1.67,2.40),B(-2.67,-1.64,1.03)],12,.35)
    vine("Attached_Eave_Greenery",[B(-2.65,1.46,3.32),B(-1.40,1.80,3.20),B(.15,1.65,3.23)],15,.37)
    lantern("Rear_Eave_Lantern_Left",B(-2.13,-1.50,2.96),.89)
    lantern("Rear_Eave_Lantern_Right",B(-2.13,1.50,2.96),.89)
    # Small rope loops hang from the rear of the structure only; never a rail
    # across the +X entry or a rope network outside the supported footprint.
    for i in range(2):
        torus("Rear_Mooring_Rope_Loop_%d"%i,B(-2.45,.17+i*.28,.55),.14,.022,"Cream_Linen","decor",(1,0,0),24,6)


def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def setup_preview(scene):
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x,scene.render.resolution_y=900,700
    scene.render.resolution_percentage=100
    scene.render.image_settings.media_type="IMAGE"
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=False
    scene.view_settings.view_transform="Khronos PBR Neutral"
    scene.view_settings.exposure=0
    world=bpy.data.worlds.new(PREFIX+"Preview_White_Environment"); world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(.90,.95,1,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=.80; scene.world=world
    target=Vector((0,0,2.60))
    data=bpy.data.cameras.new(PREFIX+"Preview_Camera"); data.type="ORTHO"; data.ortho_scale=12.2
    camera=bpy.data.objects.new(PREFIX+"Preview_Camera",data); scene.collection.objects.link(camera)
    camera.location=target+Vector((12,-8,7.5)); aim(camera,target); scene.camera=camera
    for name,kind,position,energy,color in (
        ("Warm_Daylight_Key","SUN",(12,-10,17),2.25,(1,.87,.71)),
        ("Open_Pier_Sky_Fill","AREA",(10,-3,9),1050,(.81,.92,1)),
        ("Rear_Cottage_Rim","SUN",(-10,8,14),.65,(1,.97,.85))):
        data=bpy.data.lights.new(PREFIX+"Preview_"+name,kind); data.energy=energy; data.color=color
        if kind=="SUN": data.angle=math.radians(9)
        else: data.shape="DISK"; data.size=8
        light=bpy.data.objects.new(PREFIX+"Preview_"+name,data); scene.collection.objects.link(light)
        light.location=position; aim(light,target)


def main():
    global COLLECTION
    random.seed(SEED); GROUPS.clear(); MATERIALS.clear(); TEXTURES.clear()
    for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
    for blocks in (bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.worlds):
        for data in list(blocks):
            if data.name.startswith(PREFIX) and data.users==0: blocks.remove(data)
    COLLECTION=bpy.data.collections.new(COLLECTION_NAME); bpy.context.scene.collection.children.link(COLLECTION)
    root=bpy.data.objects.new(ROOT_NAME,None); COLLECTION.objects.link(root)
    root["asset_id"]="welcome-harbor-v1"; root["units"]="metres"
    root["deck_walking_top_z"]=0.0; root["world_anchor_gltf"]=[-13,12.06,70]
    root["design_note"]="Compact inhabited harbor office; original semantic geometry; no personal evidence or raster background"
    for part in ("shell","roof","interior","decor"):
        obj=bpy.data.objects.new("Harbor_"+part,None); COLLECTION.objects.link(obj); obj.parent=root
        obj["runtime_group"]=part; GROUPS[part]=obj
    make_materials()
    build_floor(); build_structure(CONTRACT); build_interior(CONTRACT); build_dressing(CONTRACT)
    bpy.context.view_layer.update()
    meshes=[obj for obj in COLLECTION.objects if obj.type=="MESH"]
    depsgraph=bpy.context.evaluated_depsgraph_get(); triangles=vertices=0; points=[]
    for obj in meshes:
        evaluated=obj.evaluated_get(depsgraph); data=evaluated.to_mesh()
        try:
            data.calc_loop_triangles(); triangles+=len(data.loop_triangles); vertices+=len(data.vertices)
            points.extend(obj.matrix_world@vertex.co for vertex in data.vertices)
            if not all(math.isfinite(v) for vertex in data.vertices for v in vertex.co):
                raise RuntimeError("Nonfinite harbor evaluated mesh "+obj.name)
            if not all(math.isfinite(v) for layer in data.uv_layers for loop in layer.data for v in loop.uv):
                raise RuntimeError("Nonfinite harbor UV "+obj.name)
        finally: evaluated.to_mesh_clear()
    minimum=Vector(tuple(min(p[axis] for p in points) for axis in range(3)))
    maximum=Vector(tuple(max(p[axis] for p in points) for axis in range(3)))
    if triangles>TRIANGLE_BUDGET or len(MATERIALS)>26 or len(TEXTURES)>10:
        raise RuntimeError("Harbor authoring budget %s"%((triangles,len(MATERIALS),len(TEXTURES)),))
    if any(not img.packed_file or max(img.size)>TEXTURE_DIMENSION_MAX for img in TEXTURES):
        raise RuntimeError("Harbor portable texture guard")
    block=bpy.data.texts.new("WelcomeHarbor_V1_Collision_Contract_JSON"); block.write(json.dumps(CONTRACT,indent=2))
    scene=bpy.context.scene; scene.unit_settings.system="METRIC"; scene.unit_settings.scale_length=1.0
    setup_preview(scene)
    output=artifacts.file(name=PREVIEW_NAME,media_type="image/png")
    scene.render.filepath=str(output.path); bpy.ops.render.render(write_still=True); output.publish()
    return {"asset":"welcome-harbor-v1","root":ROOT_NAME,"mesh_objects":len(meshes),
            "evaluated_triangles":triangles,"evaluated_vertices":vertices,"materials":len(MATERIALS),
            "packed_images":[img.name for img in TEXTURES],
            "packed_image_dimensions":{img.name:list(img.size) for img in TEXTURES},
            "dimensions_blender":list(maximum-minimum),"minimum_blender":list(minimum),
            "maximum_blender":list(maximum),"groups":[g.name for g in GROUPS.values()],
            "contract":CONTRACT,"preview":PREVIEW_NAME,
            "acceptance":"Editable reference-led asset only; actual GLB/runtime/collision/art/performance gates remain independent"}

result=main()
