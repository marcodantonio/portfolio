"""Refine actual Projects V2 R1 through Higgsfield Scene Builder, separately.

Requires the inspected R1 island, with the44 actual closed source meshes.
R1 recipe/files remain immutable. This is sculptural reference-led authoring,
NOT automatic multiview reconstruction or artistic/runtime approval.

Three changes: fracture the EXISTING limestone-wall vertices; replace uniform
gold caps with exposed mineral / honey-earth deposits; paint readable warm / cool
geological cells and sparse ledge moss. No new mesh, triangle, element or image.
The continuous body XYZ, all prism Y, sea contact belowY.72 and bottom-10 remain
exact. The172522-triangle study stays under the unchanged180000 review guard.
Each closed solid uses ONE PBR slot, retaining two materials / four packed PNGs.
The preceding export fixture verified the multi-slot COLOR_0 whitening defect;
this actual R2 export still requires separate inspection.

Metres. glTF Xright/Yup/Zfront, Blender(X,-Z,Y). Worker owns save/export.
No imported asset bytes, network, render, external image/file or collider.
"""
import hashlib
import json
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector


PREFIX = "ProjectsIsland_V2_"
ROOT_NAME = "ProjectsIsland_V2_Origin_At_Sea_Level"
BODY_NAME = PREFIX + "Continuous_Connected_Coast_And_Bedrock"
COLOR_NAME = "TerrainColour"
ROOT = bpy.data.objects.get(ROOT_NAME)
BODY = bpy.data.objects.get(BODY_NAME)
ROCK = bpy.data.materials.get(PREFIX + "Limestone")
EARTH = bpy.data.materials.get(PREFIX + "HoneyEarth")
if ROOT is None or BODY is None or ROCK is None or EARTH is None:
    raise RuntimeError("Requires the actual inspected Projects V2 revision1 island")
OBJECTS = sorted((o for o in ROOT.children if o.type == "MESH"), key=lambda o:o.name)
if len(OBJECTS) != 44 or BODY not in OBJECTS:
    raise RuntimeError("Unexpected owned R1 sources; do not edit an unknown scene")
if ROOT.get("origin_semantics") != "Sea level, not a walking floor":
    raise RuntimeError("Unexpected island origin contract")


def gltf_points(mesh):
    values = np.empty(len(mesh.vertices)*3,dtype=np.float32)
    mesh.vertices.foreach_get("co",values)
    native = values.reshape(-1,3)
    return np.stack((native[:,0],native[:,2],-native[:,1]),axis=1).astype(np.float64)


def source_xyz_digest(mesh):
    values = np.empty(len(mesh.vertices)*3,dtype=np.float32)
    mesh.vertices.foreach_get("co",values)
    return hashlib.sha256(values.tobytes()).hexdigest()


def smooth(a,b,x):
    t = np.clip((x-a)/(b-a),0.0,1.0)
    return t*t*(3.0-2.0*t)


def fract(x):
    return x-np.floor(x)


def hash_cells(cells,seed):
    return fract(np.sin(cells[:,0]*127.1+cells[:,1]*311.7+cells[:,2]*74.7+seed)*43758.5453123)


def geological_cells(points,seed=7.3,search_radius=1):
    """Anisotropic3D stone cells: large slanted faces, not high-frequency noise."""
    q = points/np.array((2.8,4.4,2.8))
    # Bedding leans coherently: the guide's cliffs are not perfectly vertical
    # extrusions. Cells line up across connected terraces in shared worldspace.
    q[:,0] += q[:,1]*.13
    q[:,2] -= q[:,1]*.10
    base = np.floor(q)
    first = np.full(len(q),np.inf)
    second = np.full(len(q),np.inf)
    tint = np.zeros(len(q))
    neighbours = range(-search_radius,search_radius+1)
    for dx in neighbours:
        for dy in neighbours:
            for dz in neighbours:
                cell = base+np.array((dx,dy,dz))
                centre = cell+np.stack((.17+.66*hash_cells(cell,seed),
                    .17+.66*hash_cells(cell,seed+9.17),.17+.66*hash_cells(cell,seed+23.41)),axis=1)
                distance = np.sum((centre-q)**2,axis=1)
                closer = distance<first
                second = np.where(closer,first,np.minimum(second,distance))
                first = np.where(closer,distance,first)
                tint = np.where(closer,hash_cells(cell,seed+37.8),tint)
    boundary = np.sqrt(second)-np.sqrt(first)
    return boundary,tint


def footprint_directions(points,polygon):
    """Continuous outward directions across narrow bevels; no normal jumps."""
    polygon = np.asarray(polygon,dtype=np.float64)
    following = np.roll(polygon,-1,axis=0)
    area = np.sum(polygon[:,0]*following[:,1]-polygon[:,1]*following[:,0])*.5
    if abs(area)<1e-8:
        raise RuntimeError("Invalid authored prism footprint")
    directions = np.zeros((len(points),2))
    weights = np.zeros(len(points))
    xz = points[:,[0,2]]
    for a,b in zip(polygon,following):
        edge = b-a
        length = np.linalg.norm(edge)
        if length<1e-8:
            raise RuntimeError("Duplicate authored footprint edge")
        t = np.clip(np.sum((xz-a)*edge,axis=1)/(length*length),0,1)
        nearest = a+t[:,None]*edge
        distance2 = np.sum((xz-nearest)**2,axis=1)
        # A finite0.6m corner blend makes close bevel vertices move together.
        weight = np.exp(-distance2/(.60*.60))
        outward = np.array((edge[1],-edge[0]))/length*(1 if area>0 else -1)
        directions += weight[:,None]*outward
        weights += weight
    radial = xz-polygon.mean(axis=0)
    length = np.linalg.norm(radial,axis=1)
    radial /= np.maximum(length,1e-12)[:,None]
    norm = np.linalg.norm(directions,axis=1)
    directions = np.where((norm>1e-9)[:,None],directions/np.maximum(norm,1e-12)[:,None],radial)
    return directions


def footprint_thickness(polygon):
    polygon = np.asarray(polygon,dtype=np.float64)
    thickness = np.inf
    for a,b in zip(polygon,np.roll(polygon,-1,axis=0)):
        edge = b-a
        length = np.linalg.norm(edge)
        if length<1e-8:
            raise RuntimeError("Invalid drawn footprint edge")
        perpendicular = np.array((edge[1],-edge[0]))/length
        projection = polygon@perpendicular
        thickness = min(thickness,float(np.ptp(projection)))
    if not math.isfinite(thickness) or thickness<=0:
        raise RuntimeError("Invalid drawn footprint thickness")
    return thickness


def continuous_sculpt_delta(points,polygon):
    """Geometry never uses discontinuous nearest-cell pigment IDs."""
    directions = footprint_directions(points,polygon)
    # A two-cell halo contains the two nearest jittered centres throughout a
    # source cell, so crossing a grid boundary cannot drop a competing centre.
    boundary,_ = geological_cells(points,search_radius=2)
    thickness = footprint_thickness(polygon)
    scale = min(1.0,.17*thickness/.44)
    # F2-F1 is continuous even when nearest-cell identity changes. Pigment may
    # change at a geological facet; geometry must not jump at that same border.
    x,y,z = points[:,0],points[:,1],points[:,2]
    facet = .13+.025*np.sin(x*.24+z*.17+y*.10)
    cleft = 1.0-smooth(.02,.36,boundary)
    displacement = scale*(facet*(1-cleft)-.44*cleft)
    top,bottom = float(np.max(y)),float(np.min(y))
    # R1 contains very thin triangulated cap slivers at both ends. Their visible
    # geological deposits can be repainted, but nonlinear rim movement would
    # flip an almost-collinear cap even at tiny alpha. Freeze the cap skins and
    # fade continuously over the adjacent wall, not a global no-op fallback.
    cap_gate = smooth(bottom+.30,bottom+1.30,y)*(1.0-smooth(top-1.80,top-.80,y))
    displacement *= smooth(.72,1.85,y)*cap_gate
    clearing_distance = np.maximum.reduce((np.abs(x)-16.30,-16.30-z,z-10.30))
    displacement *= smooth(0,1.20,clearing_distance)
    delta = np.zeros_like(points)
    delta[:,0] = directions[:,0]*displacement
    delta[:,2] = directions[:,1]*displacement
    return delta,thickness,scale


def bounded_sculpt_candidate(before,indices,delta,label):
    """Actual triangle winding/area and signed-volume backtracking, pre-edit."""
    a,b,c = before[indices[:,0]],before[indices[:,1]],before[indices[:,2]]
    original_face = np.cross(b-a,c-a)
    original_area = np.linalg.norm(original_face,axis=1)
    if not np.all(original_area>1e-10):
        raise RuntimeError("Original actual source contains collapsed faces: "+label)
    original_volume = float(np.sum(np.einsum("ij,ij->i",a,original_face))/6)
    if original_volume<=0 or not math.isfinite(original_volume):
        raise RuntimeError("Original actual winding is not outward: "+label)
    for attempt in range(10):
        alpha = .5**attempt
        # Test exactly the Float32 coordinates Blender will receive, not a
        # favourable high-precision surrogate of tiny existing bevel triangles.
        candidate = np.asarray(before+delta*alpha,dtype=np.float32).astype(np.float64)
        aa,bb,cc = candidate[indices[:,0]],candidate[indices[:,1]],candidate[indices[:,2]]
        face = np.cross(bb-aa,cc-aa)
        area = np.linalg.norm(face,axis=1)
        ratio = area/original_area
        cosine = np.sum(face*original_face,axis=1)/np.maximum(area*original_area,1e-30)
        volume = float(np.sum(np.einsum("ij,ij->i",aa,face))/6)
        volume_ratio = volume/original_volume
        safe = (np.isfinite(candidate).all() and np.all(area>1e-10)
                and np.all(cosine>=.25) and np.all(ratio>=.40)
                and np.all(ratio<=2.40) and .68<=volume_ratio<=1.32)
        if safe:
            return candidate,{"accepted_alpha":alpha,"attempts":attempt+1,
                "minimum_winding_cosine":float(np.min(cosine)),
                "minimum_area_ratio":float(np.min(ratio)),
                "maximum_area_ratio":float(np.max(ratio)),
                "positive_volume_ratio":volume_ratio}
    raise RuntimeError("No bounded non-flipping sculpt within ten attempts: "+label)


def fracture_existing_prism(obj):
    mesh = obj.data
    before = gltf_points(mesh)
    polygon = json.loads(obj.get("drawn_footprint_xz_json","null"))
    if not polygon:
        raise RuntimeError("No source footprint on "+obj.name)
    mesh.calc_loop_triangles()
    indices = np.asarray([t.vertices[:] for t in mesh.loop_triangles],dtype=np.int32)
    delta,thickness,scale = continuous_sculpt_delta(before,polygon)
    after,backtracking = bounded_sculpt_candidate(before,indices,delta,obj.name)
    y = before[:,1]
    # All vertical coordinates are unchanged, including top/cap and seabed.
    if not np.array_equal(before[:,1],after[:,1]):
        raise RuntimeError("Fracturing changed a protected source height")
    fixed = y<=.72
    if not np.array_equal(before[fixed],after[fixed]):
        raise RuntimeError("Fracturing changed the actual low sea-contact band")
    native = np.stack((after[:,0],-after[:,2],after[:,1]),axis=1).astype(np.float32)
    mesh.vertices.foreach_set("co",native.ravel())
    mesh.update()
    actual = gltf_points(mesh)
    if not np.array_equal(actual[:,1],before[:,1]):
        raise RuntimeError("Float32 sculpt changed originalY")
    obj["r2_geological_finish"] = "Drawn limestone cells, reused vertices, no new triangles"
    obj["r2_maximum_horizontal_displacement"] = float(np.max(np.linalg.norm(actual[:,[0,2]]-before[:,[0,2]],axis=1)))
    obj["r2_winding_backtracking_json"] = json.dumps(backtracking,separators=(",",":"))
    return {"name":obj.name,"vertices":len(before),"height_unchanged":True,
        "sea_band_vertices_exact":int(np.count_nonzero(fixed)),
        "maximum_horizontal_displacement":obj["r2_maximum_horizontal_displacement"],
        "footprint_minimum_width":thickness,"geometry_amplitude_scale":scale,
        "actual_triangle_winding_backtracking":backtracking}


def recalc_closed_source(obj):
    mesh = obj.data
    before_count = len(mesh.vertices)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    before_triangles = sum(len(face.verts)-2 for face in bm.faces)
    bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method="BEAUTY",ngon_method="BEAUTY")
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if not all(e.is_manifold for e in bm.edges) or bm.calc_volume(signed=True)<=0:
        bm.free()
        raise RuntimeError("Sculpt is not a closed outward source: "+obj.name)
    if len(bm.verts)!=before_count or len(bm.faces)!=before_triangles:
        bm.free()
        raise RuntimeError("Finish unexpectedly changed source vertex/triangle counts")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def ledge_moss(points):
    x,y,z = points[:,0],points[:,1],points[:,2]
    mask = np.zeros(len(points))
    for px,pz,rx,rz in ((-29,12,4,4),(-25,23,3,3),(-24,-22,4,3),(-12,-27,4,2.5),
                       (6,-30,4,2.6),(22,-23,3,3),(26,-8,1.7,4),(26,24,3,3),
                       (-16,29,2,2.5),(-2,31,2,2)):
        mask = np.maximum(mask,np.exp(-(((x-px)/rx)**2+((z-pz)/rz)**2)))
    brush = .50+.25*np.sin(x*1.35+z*.80)+.18*np.cos(z*1.80-x*.72)
    mask *= smooth(.30,.72,brush)*smooth(.9,1.9,y)
    protected = ((np.abs(x)<=16.3)&(z>=-16.3)&(z<=10.3))
    mask[protected] = 0
    return np.minimum(.72,mask)


def paint_and_rebind(obj,is_body):
    mesh = obj.data
    points = gltf_points(mesh)
    vertex_indices = np.empty(len(mesh.loops),dtype=np.int32)
    mesh.loops.foreach_get("vertex_index",vertex_indices)
    totals = np.empty(len(mesh.polygons),dtype=np.int32)
    mesh.polygons.foreach_get("loop_total",totals)
    if not np.all(totals==3):
        raise RuntimeError("Finish expected actual triangle polygons")
    normals = np.empty(len(mesh.polygons)*3,dtype=np.float32)
    mesh.polygons.foreach_get("normal",normals)
    native_normals = normals.reshape(-1,3)
    face_normals = np.stack((native_normals[:,0],native_normals[:,2],-native_normals[:,1]),axis=1)
    corner_normals = np.repeat(face_normals,3,axis=0)
    corners = points[vertex_indices]
    boundary,tint = geological_cells(points)
    # Color remains world-coherent across shared landforms, rather than a new
    # palette on each source slab. Facets are warm mineral, joints cool bluegrey.
    exposure = smooth(.035,.30,boundary)
    warm = np.array((.60,.535,.415))
    cool = np.array((.245,.315,.405))
    cool_mix = .12+.42*(1-exposure)+.23*(1-tint)
    stone = warm[None,:]*(1-cool_mix[:,None])+cool[None,:]*cool_mix[:,None]
    stone *= (.85+.22*tint)[:,None]
    joint = 1.0-smooth(.02,.13,boundary)
    stone *= (1-.28*joint)[:,None]
    x,y,z = points[:,0],points[:,1],points[:,2]
    sediment = np.exp(-(np.sin(y*1.15+x*.035+z*.018)/.17)**2)
    stone *= (1-.07*sediment)[:,None]
    soil = np.array((.74,.485,.215))[None,:]*(.88+.14*tint+.035*np.sin(x*.68+z*.37))[:,None]
    moss = ledge_moss(points)
    corner_stone,corner_soil = stone[vertex_indices],soil[vertex_indices]
    up = smooth(.34,.94,corner_normals[:,1])
    if is_body:
        # The big central inhabited clearing remains golden earth. Rock/soil
        # paint does not raise chips or create another navigable support plane.
        earth_mix = up
    else:
        # Wide mineral caps with discontinuous deposits, never every up-face
        # assigned a perfectly uniform thick golden slab.
        deposits = .18+.65*smooth(.16,.76,tint[vertex_indices])
        edge_skin = .78+.22*np.sin(corners[:,0]*.18+corners[:,2]*.15)**2
        earth_mix = up*deposits*edge_skin
    color = corner_stone*(1-earth_mix[:,None])+corner_soil*earth_mix[:,None]
    corner_moss = moss[vertex_indices]*smooth(.18,.80,corner_normals[:,1])
    olive = np.array((.16,.255,.043))
    color = color*(1-corner_moss[:,None])+olive[None,:]*corner_moss[:,None]
    wet = (1-smooth(-.10,.85,corners[:,1]))*.24
    color *= (1-wet)[:,None]
    rgba = np.concatenate((np.clip(color,0,1),np.ones((len(corners),1))),axis=1).astype(np.float32)
    for old in list(mesh.color_attributes):
        mesh.color_attributes.remove(old)
    color_attr = mesh.color_attributes.new(name=COLOR_NAME,type="FLOAT_COLOR",domain="CORNER")
    color_attr.data.foreach_set("color",rgba.ravel())
    mesh.color_attributes.active_color_index = 0
    # Single-slot is the directly verified workaround, not a change of solidity.
    mesh.materials.clear()
    mesh.materials.append(EARTH if is_body else ROCK)
    for poly in mesh.polygons:
        poly.material_index = 0
        if not is_body:
            poly.use_smooth = False
    obj["portable_material_strategy"] = "OnePBRslot per closed solid; mineral/earth roles in COLOR_0"
    # Remap each real triangle on its dominant plane, eliminating zero UV areas
    # rather than tolerating them after a cosmetic sculpt.
    for old in list(mesh.uv_layers):
        mesh.uv_layers.remove(old)
    uv = mesh.uv_layers.new(name="UVMap")
    axis = np.argmax(np.abs(corner_normals),axis=1)
    uv_values = np.empty((len(corners),2),dtype=np.float32)
    for a,plane in enumerate(((2,1),(0,2),(0,1))):
        selection = axis==a
        uv_values[selection] = corners[selection][:,plane]/6.4
    uv.data.foreach_set("uv",uv_values.ravel())
    mesh.update()
    return {"name":obj.name,"single_material":mesh.materials[0].name,
        "minimum_source_rgb":rgba[:,:3].min(axis=0).tolist(),
        "maximum_source_rgb":rgba[:,:3].max(axis=0).tolist()}


def packed_maps_finish():
    """Repaint the existing four portable maps, not concept-image scenery."""
    changed = []
    for mat in (ROCK,EARTH):
        if not mat.use_nodes:
            raise RuntimeError("Missing actual Principled graph")
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        linked = list(bsdf.inputs["Base Color"].links) if bsdf else []
        if len(linked)!=1 or linked[0].from_node.bl_idname!="ShaderNodeVertexColor":
            raise RuntimeError("BaseColor is not a portable direct VertexColor connection")
        linked[0].from_node.layer_name = COLOR_NAME
        bsdf.inputs["Metallic"].default_value = 0
        for node in mat.node_tree.nodes:
            if node.bl_idname=="ShaderNodeNormalMap":
                node.inputs["Strength"].default_value = .55 if mat==ROCK else .30
            if node.bl_idname!="ShaderNodeTexImage" or node.image is None:
                continue
            image = node.image
            width,height = image.size
            u,v = np.meshgrid(np.linspace(0,1,width,endpoint=False),np.linspace(0,1,height,endpoint=False))
            if "MetallicRoughness" in image.name:
                if mat==ROCK:
                    variation = .48*np.sin(u*17+v*11)*np.cos(v*13-u*4)+.22*np.cos(u*43-v*27)
                    roughness = np.clip(.83+.075*variation,.72,.96)
                else:
                    variation = .45*np.sin(u*41)*np.cos(v*37)+.18*np.cos(u*87+v*51)
                    roughness = np.clip(.91+.045*variation,.82,.98)
                rgb = np.stack((np.ones_like(u),roughness,np.zeros_like(u)),axis=2)
            elif "WornMicroNormal" in image.name:
                if mat==ROCK:
                    # Oblique mesoscopic bedding and mineral dents supplement
                    # actual metre-scale fractured geometry, not replace it.
                    plane = .55*np.sin(u*21-v*7)+.34*np.cos(v*29+u*5)
                    seam = np.exp(-(np.sin(u*17+v*11)/.14)**2)
                    relief = .032*plane-.013*seam+.005*np.sin(u*113)*np.cos(v*97)
                else:
                    relief = .006*np.sin(u*67+v*17)*np.cos(v*71-u*13)
                    relief += .003*np.sin(u*157-v*93)
                dy,dx = np.gradient(relief)
                nx,ny = -dx*width/6.4,-dy*height/6.4
                normal = np.stack((nx,ny,np.ones_like(nx)),axis=2)
                normal /= np.linalg.norm(normal,axis=2)[...,None]
                rgb = normal*.5+.5
            else:
                raise RuntimeError("Unexpected external/original image node: "+image.name)
            image.colorspace_settings.name = "Non-Color"
            rgba = np.concatenate((rgb,np.ones((height,width,1))),axis=2).astype(np.float32)
            image.pixels.foreach_set(rgba.ravel())
            image.update()
            image.pack()
            changed.append({"name":image.name,"size":[width,height],"packed":image.packed_file is not None})
        mat["r2_finish"] = "Original mineral bedding maps, reused twoPBR/fourPNG; noAO assignment"
    if len(changed)!=4 or len({i["name"] for i in changed})!=4:
        raise RuntimeError("Expected exactly four original packed PBR maps")
    return changed


def strict_source_audit():
    triangles = vertices = zero_area = opposition = uv_degenerate = 0
    minimum,maximum = np.full(3,np.inf),np.full(3,-np.inf)
    reports = []
    for obj in OBJECTS:
        mesh = obj.data
        mesh.update()
        mesh.calc_loop_triangles()
        points = gltf_points(mesh)
        if not np.isfinite(points).all():
            raise RuntimeError("Non-finite actual sculpted source")
        minimum = np.minimum(minimum,points.min(axis=0))
        maximum = np.maximum(maximum,points.max(axis=0))
        bm = bmesh.new()
        bm.from_mesh(mesh)
        closed = all(e.is_manifold for e in bm.edges)
        volume = bm.calc_volume(signed=True)
        bm.free()
        if not closed or not math.isfinite(volume) or volume<=0:
            raise RuntimeError("Actual source no longer closed/outward: "+obj.name)
        count = len(mesh.loop_triangles)
        triangles += count
        vertices += len(mesh.vertices)
        indices = np.asarray([t.vertices[:] for t in mesh.loop_triangles],dtype=np.int32)
        loops = np.asarray([t.loops[:] for t in mesh.loop_triangles],dtype=np.int32)
        # Match normals and face coordinates in Blender's actual Z-up frame.
        native = np.stack((points[:,0],-points[:,2],points[:,1]),axis=1)
        a,b,c = native[indices[:,0]],native[indices[:,1]],native[indices[:,2]]
        face = np.cross(b-a,c-a)
        face_length = np.linalg.norm(face,axis=1)
        corner = np.asarray([n.vector[:] for n in mesh.corner_normals],dtype=np.float64)
        average = corner[loops].sum(axis=1)
        average_length = np.linalg.norm(average,axis=1)
        valid = (face_length>1e-10)&(average_length>1e-10)
        dot = np.zeros(count)
        dot[valid] = np.sum(face[valid]*average[valid],axis=1)/(face_length[valid]*average_length[valid])
        zero = int(np.count_nonzero(face_length<1e-10))
        opposed = int(np.count_nonzero(valid&(dot<-.05)))
        uv = np.asarray([d.uv[:] for d in mesh.uv_layers.active.data],dtype=np.float64)
        triplets = uv[loops]
        uv_a,uv_b = triplets[:,1]-triplets[:,0],triplets[:,2]-triplets[:,0]
        determinants = uv_a[:,0]*uv_b[:,1]-uv_a[:,1]*uv_b[:,0]
        uv_zero = int(np.count_nonzero(np.abs(determinants)<1e-14))
        colors = np.asarray([d.color[:] for d in mesh.color_attributes[COLOR_NAME].data],dtype=np.float64)
        if not np.isfinite(uv).all() or not np.isfinite(corner).all() or not np.isfinite(colors).all():
            raise RuntimeError("Non-finite actual normal/UV/COLOR_0")
        if len(mesh.materials)!=1 or not np.all(np.ptp(colors[:,:3],axis=0)>1e-5):
            raise RuntimeError("Missing one-slot/variable-pigment source: "+obj.name)
        zero_area += zero
        opposition += opposed
        uv_degenerate += uv_zero
        reports.append({"name":obj.name,"triangles":count,"closed_source":closed,
            "positive_signed_volume":volume,"zero_area":zero,"normal_opposition":opposed,
            "uv_degenerate":uv_zero,"single_material":mesh.materials[0].name})
    if zero_area or opposition or uv_degenerate:
        raise RuntimeError("Fix actual R2 source: zero=%d opposition=%d uv=%d" %
                           (zero_area,opposition,uv_degenerate))
    if triangles!=ORIGINAL_TRIANGLES or triangles>180000:
        raise RuntimeError("R2 changed the triangle count or exceeded the review guard")
    if source_xyz_digest(BODY.data)!=BODY_DIGEST:
        raise RuntimeError("R2 changed protected continuous bodyXYZ")
    if abs(float(minimum[1])+10)>1e-7:
        raise RuntimeError("The sea-root foundation no longer reachesY-10")
    return {"triangles":triangles,"source_vertices":vertices,"meshes":len(OBJECTS),
        "materials":2,"packed_images":4,"minimum_gltf":minimum.tolist(),
        "maximum_gltf":maximum.tolist(),"size_gltf":(maximum-minimum).tolist(),
        "closed_positive_volume_sources":True,"zero_area_triangles":zero_area,
        "normal_opposition_candidates":opposition,"uv_degenerate_triangles":uv_degenerate,
        "continuous_body_xyz_unchanged":True,"body_xyz_sha256":BODY_DIGEST,
        "all_prism_y_unchanged":True,"sea_contact_below_y072_unchanged":True,
        "no_new_triangles":True,"source_details":reports,
        "not_automatic_reconstruction":True,"art_and_actual_export_not_approved":True}


BODY_DIGEST = source_xyz_digest(BODY.data)
ORIGINAL_TRIANGLES = 0
for obj in OBJECTS:
    obj.data.calc_loop_triangles()
    ORIGINAL_TRIANGLES += len(obj.data.loop_triangles)
if ORIGINAL_TRIANGLES!=172522:
    raise RuntimeError("This patch is scoped to actual inspected172522-triangleR1")
fracture_reports = []
paint_reports = []
for obj in OBJECTS:
    is_body = obj==BODY
    if not is_body:
        fracture_reports.append(fracture_existing_prism(obj))
        recalc_closed_source(obj)
    paint_reports.append(paint_and_rebind(obj,is_body))
map_reports = packed_maps_finish()
metrics = strict_source_audit()
ROOT["native_geological_finish_r2_audit_json"] = json.dumps(metrics,separators=(",",":"))
ROOT["r2_material_export_strategy"] = "OnePBRslot per solid, same twoPBR/fourpackedPNG; actualexportpending"
ROOT["r2_reference_scope"] = "Fractured warm/cool limestone and irregular soil ledges; no scenery or fidelityclaim"
result = {"recipe":"projects-island-v2-r2-existing-vertex-geological-finish",
    "root":ROOT_NAME,"audit":metrics,"fracture_sources":fracture_reports,
    "source_pigment":paint_reports,"packed_maps":map_reports,
    "renders_performed":0,"network_requests":0,"new_meshes":0,"gameplay_changes":0,
    "next":"Inspect actual native FRONT/RIGHT/TOP/hero and verify exported single-slot COLOR_0 on every primitive"}
