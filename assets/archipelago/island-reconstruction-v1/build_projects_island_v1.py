"""Bare Projects island, reference-led Blender authoring through Higgsfield.

User explicitly selected the same Scene Builder workflow as the lighthouse.
Metres; glTF X right / Y up / Z front, Blender (X,-Z,Y). Origin is sea level.
No network, external images/files, imported model bytes, save or export calls.
Packed original material maps and geometry are editable; worker exports GLB.
This is a standalone review master, not the current map or a mounted terrain.
"""
import math
import json
import random
import bpy
import bmesh
import numpy as np
from mathutils import Vector

PREFIX = "ProjectsIsland_"
ROOT_NAME = PREFIX + "V1_Origin_At_Sea_Level"
ASSET_COLLECTION = PREFIX + "V1_Editable_Terrain"
PREVIEW_COLLECTION = PREFIX + "V1_Preview_Only"
SECTORS, RINGS = 192, 96
SEA, CLEARING, BOTTOM = 0.0, 4.8, -10.0
RNG = random.Random(310033)
IMAGES = []
MATERIALS = {}


def C(p):
    return (p[0], -p[2], p[1])


def G(p):
    return (p[0], p[2], -p[1])


def smooth(a, b, x):
    q = max(0.0, min(1.0, (x-a)/(b-a)))
    return q*q*(3-2*q)


def wrap(a):
    return (a+math.pi) % (2*math.pi)-math.pi


def shore(theta):
    # Broad asymmetric headlands, never a circular disc or a floating cone.
    elliptical = 1/math.sqrt((math.cos(theta)/30.2)**2 + (math.sin(theta)/28.5)**2)
    body = elliptical*(1 + .034*math.sin(3*theta+.3) + .021*math.cos(5*theta-.6))
    cove = 3.8*math.exp(-(wrap(theta-2.28)/.23)**2)
    inlet = 1.7*math.exp(-(wrap(theta-.98)/.19)**2)
    east = 1.4*math.exp(-(wrap(theta-.035)/.22)**2)
    right_head = 2.4*math.exp(-(wrap(theta-.55)/.24)**2)
    return body-cove-inlet+east+right_head


def terrain_y(x, z, q=None):
    q = q if q is not None else math.hypot(x,z)/shore(math.atan2(z,x))
    # Protected flat workshop apron centred 3m rearward; actual dimensions below.
    inside = max(abs(x)/16.0, abs(z+3)/13.0)
    guard = smooth(1.0, 1.24, inside)
    beach = smooth(.47, .89, q)*smooth(4.0, 18.0, z)
    coast = smooth(.62, 1.0, q)
    ground = CLEARING*(1-coast) + .46*coast - 1.60*beach*(1-coast)
    # Central inhabited patch is exactly planar; hill height is outside it.
    if inside <= 1.0:
        return CLEARING
    ground = CLEARING*(1-guard)+ground*guard
    relief = 0.0
    for cx, cz, rx, rz, peak in ((-16.5,-20.5,6.0,4.0,6.3),
                               (0,-23,7.5,4.0,9.7),
                               (17.2,-20.5,5.8,3.5,5.1)):
        d = math.sqrt(((x-cx)/rx)**2+((z-cz)/rz)**2)
        if d < 1.15:
            bump = (1-smooth(.15,1.15,d))
            # Rounded ledges, not staircase cubes. Layer widths are deliberately large.
            ledge = bump*peak
            ledge += .19*math.sin(ledge*math.pi/1.7)*smooth(.12,.50,bump)
            relief = max(relief, ledge)
    micro = .045*math.sin(x*.63+z*.17)*math.sin(z*.48-x*.09)
    return ground+guard*(relief*(1-smooth(.92,1.0,q)) + micro*(1-coast))


def packed(name, rgb, data=False):
    size = rgb.shape[0]
    image = bpy.data.images.new(PREFIX+name, width=rgb.shape[1], height=size, alpha=True)
    image.colorspace_settings.name = "Non-Color" if data else "sRGB"
    rgba = np.concatenate((np.clip(rgb,0,1),np.ones((*rgb.shape[:2],1))),axis=2)
    image.pixels.foreach_set(np.asarray(rgba,dtype=np.float32).ravel())
    image.update()
    image.pack()
    IMAGES.append(image)
    return image


def noise(u, v, seed):
    # Low-amplitude, broad portable colour/roughness; no high-frequency pixel style.
    return (.45*np.sin(u*12.7+seed)*np.sin(v*14.1-seed*.3)
            + .25*np.sin(u*35.6-v*9.3+seed*.8)
            + .15*np.cos(u*71.1+v*49.3-seed))


def material(name, tint, grain, roughness):
    u,v = np.meshgrid(np.linspace(0,1,1024,endpoint=False),np.linspace(0,1,1024,endpoint=False))
    n = noise(u,v,grain)
    rgb = np.repeat((.91+.045*n)[...,None],3,axis=2)
    colour = packed(name+"_Mineral_Base_1024",rgb)
    # Portable ORM with bounded variation and no arbitrary metallic stone.
    orm = packed(name+"_ORM_1024",np.stack((np.ones_like(n),
                    np.clip(roughness+.035*n,.68,.99),np.zeros_like(n)),axis=2),True)
    nu,nv = np.meshgrid(np.linspace(0,1,512,endpoint=False),np.linspace(0,1,512,endpoint=False))
    nsmall=noise(nu,nv,grain+.31)
    dy,dx=np.gradient(nsmall)
    normals=np.stack((-dx*1.6,-dy*1.6,np.ones_like(dx)),axis=2)
    normals/=np.linalg.norm(normals,axis=2)[...,None]
    normal=packed(name+"_Fine_Normal_512",normals*.5+.5,True)
    mat=bpy.data.materials.new(PREFIX+name)
    mat.use_nodes=True;mat.use_backface_culling=True
    mat.diffuse_color=(*tint,1)
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    bsdf=nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value=roughness
    bsdf.inputs["Metallic"].default_value=0
    base=nodes.new("ShaderNodeTexImage");base.image=colour
    vertex=nodes.new("ShaderNodeVertexColor");vertex.layer_name="TerrainColour"
    mix=nodes.new("ShaderNodeMixRGB");mix.blend_type="MULTIPLY";mix.inputs[0].default_value=1
    links.new(base.outputs["Color"],mix.inputs[1]);links.new(vertex.outputs["Color"],mix.inputs[2])
    links.new(mix.outputs["Color"],bsdf.inputs["Base Color"])
    image=nodes.new("ShaderNodeTexImage");image.image=orm
    sep=nodes.new("ShaderNodeSeparateColor")
    links.new(image.outputs["Color"],sep.inputs[0]);links.new(sep.outputs["Green"],bsdf.inputs["Roughness"])
    image=nodes.new("ShaderNodeTexImage");image.image=normal
    norm=nodes.new("ShaderNodeNormalMap");norm.inputs["Strength"].default_value=.26
    links.new(image.outputs["Color"],norm.inputs["Color"]);links.new(norm.outputs["Normal"],bsdf.inputs["Normal"])
    MATERIALS[name]=mat
    return mat


def colour_at(x,y,z,normal,stone=False):
    broad=.5+.23*math.sin(x*.23+z*.31)+.13*math.sin(z*.71-x*.47)
    sand=np.array((.82,.665,.415));grass=np.array((.32,.425,.095))
    rock=np.array((.58,.565,.50));cool=np.array((.465,.495,.50))
    if stone:
        rock=rock*(.91+.15*broad)
        wet=1-smooth(-.10,.75,y)
        return tuple(rock*(1-.28*wet))
    q=math.hypot(x,z)/shore(math.atan2(z,x)) if math.hypot(x,z)>0 else 0
    sand_mix=max(smooth(.67,.95,q)*smooth(2,16,z),
                 .78*math.exp(-(((x+16)/9)**2+((z-18)/8)**2)),
                 .60*math.exp(-(((x-20)/5)**2+((z-15)/7)**2)))
    path=.6*math.exp(-((x+z*.10)/6)**2)*smooth(-18,12,z)
    base=grass*(1-max(sand_mix,path))+sand*max(sand_mix,path)
    slope=smooth(.17,.51,1-abs(normal[1]))
    high=smooth(5.3,7.5,y)*.40
    mineral=max(slope,high)*(.90+.08*broad)
    base=base*(1-mineral)+(rock*(.90+.16*broad)+cool*.04)*mineral
    return tuple(np.clip(base,0,1))


def mesh_object(name,vertices,faces,stone=False):
    mesh=bpy.data.meshes.new(PREFIX+name+"_Mesh")
    mesh.from_pydata([C(p) for p in vertices],[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if any(not e.is_manifold for e in bm.edges):
        raise RuntimeError("Open authored island solid: "+name)
    bm.to_mesh(mesh);bm.free();mesh.update()
    obj=bpy.data.objects.new(PREFIX+name,mesh);ASSET.objects.link(obj);obj.parent=ROOT
    obj["runtime_group"]="BareTerrain";obj["terrain_review_only"]=True
    mat=MATERIALS["Limestone" if stone else "Soil"]
    mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name="UVMap")
    colors=mesh.color_attributes.new(name="TerrainColour",type="FLOAT_COLOR",domain="CORNER")
    mesh.color_attributes.active_color_index=0
    for poly in mesh.polygons:
        poly.use_smooth=True
        normal=G(poly.normal)
        axis=max(range(3),key=lambda i:abs(normal[i]))
        for loop in poly.loop_indices:
            p=G(mesh.vertices[mesh.loops[loop].vertex_index].co)
            planes=((p[2],p[1]),(p[0],p[2]),(p[0],p[1]))
            u,v=planes[axis]
            uv.data[loop].uv=(u/9.1,v/9.1)
            colors.data[loop].color=(*colour_at(*p,normal,stone),1)
    return obj


def make_body():
    verts=[(0,CLEARING,0)];faces=[]
    for ring in range(1,RINGS+1):
        q=ring/RINGS
        for s in range(SECTORS):
            theta=s*math.tau/SECTORS;r=shore(theta)*q
            x,z=r*math.cos(theta),r*math.sin(theta)
            verts.append((x,terrain_y(x,z,q),z))
    for s in range(SECTORS):faces.append((0,1+s,1+(s+1)%SECTORS))
    for ring in range(1,RINGS):
        a=1+(ring-1)*SECTORS;b=a+SECTORS
        for s in range(SECTORS):
            n=(s+1)%SECTORS;faces.append((a+s,b+s,b+n,a+n))
    last=1+(RINGS-1)*SECTORS
    for level in range(1,13):
        start=len(verts);t=level/12
        for s in range(SECTORS):
            theta=s*math.tau/SECTORS;r=shore(theta)
            rim=terrain_y(r*math.cos(theta),r*math.sin(theta),1)
            # Seabed is as broad as the coast: the foundation never hangs or tapers.
            expansion=.035*t+.012*math.sin(4*theta+.8)*math.sin(math.pi*t)
            r*=1+expansion
            verts.append((r*math.cos(theta),rim*(1-t)+BOTTOM*t,r*math.sin(theta)))
        for s in range(SECTORS):
            n=(s+1)%SECTORS;faces.append((last+s,start+s,start+n,last+n))
        last=start
    centre=len(verts);verts.append((0,BOTTOM,0))
    for s in range(SECTORS):faces.append((centre,last+(s+1)%SECTORS,last+s))
    return mesh_object("Continuous_Land_Shore_And_Submerged_Bedrock",verts,faces)


def make_strata():
    made=0
    for cx,cz,rx,rz,peak in ((-16.5,-20.5,6.0,4.0,6.3),(0,-23,7.5,4.0,9.7),(17.2,-20.5,5.8,3.5,5.1)):
        for j in range(16):
            theta=j*math.tau/16+.16*math.sin(j*2.8)
            radius=.35+.40*((j*7)%16)/16
            x=cx+rx*radius*math.cos(theta);z=cz+rz*radius*math.sin(theta)
            if abs(x)<17.0 and -17<z<11:continue
            q=math.hypot(x,z)/shore(math.atan2(z,x))
            if q>.95:continue
            y=terrain_y(x,z)
            if y<6:continue
            width=1.35+RNG.random()*1.4;depth=1.1+RNG.random()*1.1
            height=.70+RNG.random()*1.15
            if abs(x)<16+width*1.12 and z+depth*1.12>-16 and z-depth*1.12<10:continue
            verts=[]
            for level in (0,1):
                for k in range(8):
                    angle=k*math.tau/8
                    r=1+.10*math.sin(k*2.9+j*.43)
                    vx=x+width*math.cos(angle)*r;vz=z+depth*math.sin(angle)*r
                    vy=y-height*(1-level)+(.12*math.sin(k*2+j) if level else -.38)
                    verts.append((vx,vy,vz))
            faces=[tuple(range(7,-1,-1)),tuple(range(8,16))]
            for k in range(8):faces.append((k,(k+1)%8,(k+1)%8+8,k+8))
            obj=mesh_object("Attached_Eroded_Ledge_%02d"%made,verts,faces,True)
            bevel=obj.modifiers.new("Rounded_Hand_Sculpted_Edges","BEVEL")
            bevel.width=.18;bevel.segments=3;bevel.affect="EDGES"
            bevel.profile=.58
            made+=1
    return made


def preview():
    scene=bpy.context.scene;scene.render.engine="BLENDER_EEVEE"
    scene.unit_settings.system="METRIC";scene.unit_settings.scale_length=1
    scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG";scene.render.image_settings.media_type="IMAGE"
    scene.view_settings.view_transform="Khronos PBR Neutral"
    scene.view_settings.exposure=0;scene.view_settings.gamma=1
    world=bpy.data.worlds.new(PREFIX+"Neutral_Studio_World");scene.world=world;world.use_nodes=True
    bg=world.node_tree.nodes.get("Background");bg.inputs["Color"].default_value=(.75,.83,.95,1)
    bg.inputs["Strength"].default_value=.40
    data=bpy.data.cameras.new(PREFIX+"Review_Camera_Data")
    camera=bpy.data.objects.new(PREFIX+"Preview_Camera_Excluded_From_Asset",data)
    PREVIEW.objects.link(camera);camera["preview_only"]=True;data.type="ORTHO";data.ortho_scale=79
    camera.location=C((62,36,78));target=Vector(C((0,2,0)))
    camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler();scene.camera=camera
    for name,position,energy,colour,size in (("Warm_Key",(-32,65,35),2.2,(1,.88,.72),.12),
                                           ("Sky_Fill",(45,38,-35),.50,(.68,.81,1),.40)):
        light=bpy.data.lights.new(PREFIX+name+"_Data","SUN")
        light.energy=energy;light.color=colour;light.angle=size
        obj=bpy.data.objects.new(PREFIX+name+"_Preview_Only",light);PREVIEW.objects.link(obj)
        obj.location=C(position);obj.rotation_euler=(Vector(C((0,0,0)))-obj.location).to_track_quat("-Z","Y").to_euler()
        obj["preview_only"]=True


def audit():
    deps=bpy.context.evaluated_depsgraph_get();triangles=vertices=0
    minimum=np.array([np.inf]*3);maximum=np.array([-np.inf]*3)
    mesh_reports=[];zero=opposition=0
    for obj in ASSET.objects:
        if obj.type!="MESH":continue
        evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            points=np.array([G(v.co) for v in mesh.vertices])
            if not np.isfinite(points).all():raise RuntimeError("Non-finite geometry")
            minimum=np.minimum(minimum,points.min(axis=0));maximum=np.maximum(maximum,points.max(axis=0))
            triangles+=len(mesh.loop_triangles);vertices+=len(mesh.vertices)
            bm=bmesh.new();bm.from_mesh(mesh)
            closed=all(e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);bm.free()
            if not closed or volume<=0:raise RuntimeError("Open/inverted solid: "+obj.name)
            uv=mesh.uv_layers.active;normals=mesh.corner_normals
            count=0
            for tri in mesh.loop_triangles:
                a,b,c=[mesh.vertices[i].co for i in tri.vertices]
                face=(b-a).cross(c-a)
                if face.length_squared<1e-20:zero+=1
                normal=sum((normals[i].vector for i in tri.loops),Vector())
                if normal.length_squared>1e-20 and face.length_squared>1e-20:
                    if face.normalized().dot(normal.normalized())<-.05:opposition+=1;count+=1
                uvs=[uv.data[i].uv for i in tri.loops]
                if not all(math.isfinite(v) for pair in uvs for v in pair):raise RuntimeError("Non-finite UV")
            mesh_reports.append({"name":obj.name,"triangles":len(mesh.loop_triangles),"closed":closed,
                                 "signed_volume":volume,"normal_opposition_candidates":count})
        finally:evaluated.to_mesh_clear()
    if zero or opposition:raise RuntimeError("Fix source shading/degenerate faces, don't mask: %s"%((zero,opposition),))
    clearing=[terrain_y(x,z) for x in np.linspace(-16,16,65) for z in np.linspace(-16,10,53)]
    coast=[terrain_y(shore(a)*math.cos(a),shore(a)*math.sin(a),1) for a in np.linspace(0,math.tau,193)[:-1]]
    if max(abs(h-CLEARING) for h in clearing)>1e-8:raise RuntimeError("Workshop apron not planar")
    return {"triangles":triangles,"vertices":vertices,"meshes":len(mesh_reports),"materials":len(MATERIALS),
            "packed_images":len(IMAGES),"image_sizes":[list(i.size) for i in IMAGES],
            "minimum_gltf":minimum.tolist(),"maximum_gltf":maximum.tolist(),
            "size_gltf":(maximum-minimum).tolist(),"closed_sources":True,
            "zero_area_triangles":zero,"normal_opposition_candidates":opposition,
            "clearing_proposal":{"width":32,"depth":26,"centre_z":-3,"height_above_sea":CLEARING,
                                 "samples":len(clearing),"maximum_analytic_deviation":max(abs(h-CLEARING) for h in clearing)},
            "coast_height_range_above_sea":[min(coast),max(coast)],"base_depth_below_sea":-BOTTOM,
            "solid_source_details":mesh_reports,"not_gameplay_support_approval":True}


if bpy.data.objects or bpy.data.collections:
    raise RuntimeError("This recipe requires the freshly inspected empty island project")
ASSET=bpy.data.collections.new(ASSET_COLLECTION);bpy.context.scene.collection.children.link(ASSET)
PREVIEW=bpy.data.collections.new(PREVIEW_COLLECTION);bpy.context.scene.collection.children.link(PREVIEW)
ROOT=bpy.data.objects.new(ROOT_NAME,None);ASSET.objects.link(ROOT)
ROOT["asset_id"]="projects-island-terrain-v1";ROOT["units"]="metres"
ROOT["origin_gltf"]=[0,0,0];ROOT["origin_semantics"]="Sea level, not a walking floor"
ROOT["reference_led_original_geometry"]=True;ROOT["automatic_multiview_reconstruction"]=False
ROOT["reference_status"]="User workshop/map and four image studies; same Higgsfield Scene Builder workflow as lighthouse"
ROOT["runtime_status"]="Standalone review; current terrain/map/physics untouched"
material("Soil",(.32,.42,.10),41,.91);material("Limestone",(.58,.56,.50),73,.84)
BODY=make_body();ledges=make_strata();preview();metrics=audit()
ROOT["native_geometry_audit_json"]=json.dumps(metrics,separators=(",",":"))
result={"recipe":"projects-island-terrain-reference-led-v1","root":ROOT_NAME,"audit":metrics,
        "ledges":ledges,"network_requests":0,"renders_performed":0,"gameplay_changes":0,
        "next":"Inspect native hero at sea and true FRONT/RIGHT/TOP of this same mesh, then actual GLB"}
