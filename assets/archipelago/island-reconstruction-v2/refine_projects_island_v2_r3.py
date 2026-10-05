"""Macro-sculpt actual Projects V2 R2, in a separately reviewable R3 study.

Requires the committed actual R2 scene, not R1 and not an empty Blender project.
Reference-led manual terrain authoring, NOT automatic multiview reconstruction.
No provider, filesystem, imported asset, external image, render or collider.

The existing 43 limestone volumes become oblique, tapered, asymmetrically
pitched strata rather than thin parallel slabs. Their caps use whole-landmark
affine transforms; the intervening wall blends continuously to the fixed toes.
No stochastic noise, new solid, new vertex or new triangle is introduced.
Cap skins are not independently displaced: R2's fragile triangulated slivers
receive the same affine cap transform as their neighbours.

Body XYZ and its 32x26m clearing centred(0,-3) at Y4.8 remain bit-identical.
All source points at/below Y.72 and each prism's original bottom skin are fixed.
Other prism Y may change for this STANDALONE art study. This does not approve
runtime floors, routes, landing corridors, hills or map/physics integration.
43 prisms + body = 44 closed meshes, 172522 triangles, unchanged 180000 guard.
Single PBR slot per closed source; same two PBR/four packed original PNGs.

Metres, source root sea-level Y0, base Y-10. glTF Xright/Yup/Zfront.
Blender conversion is(X,-Z,Y). Parent owns guarded native apply/export/render.
"""
import hashlib
import json
import math
import bpy
import bmesh
import numpy as np

PREFIX = "ProjectsIsland_V2_"
ROOT_NAME = "ProjectsIsland_V2_Origin_At_Sea_Level"
BODY_NAME = PREFIX+"Continuous_Connected_Coast_And_Bedrock"
COLOR_NAME = "TerrainColour"
ROOT = bpy.data.objects.get(ROOT_NAME)
BODY = bpy.data.objects.get(BODY_NAME)
ROCK = bpy.data.materials.get(PREFIX+"Limestone")
EARTH = bpy.data.materials.get(PREFIX+"HoneyEarth")
if ROOT is None or BODY is None or ROCK is None or EARTH is None:
    raise RuntimeError("R3 requires the inspected committed Projects V2 R2")
OBJECTS = sorted((o for o in ROOT.children if o.type=="MESH"),key=lambda o:o.name)
if len(OBJECTS)!=44 or BODY not in OBJECTS:
    raise RuntimeError("Unexpected source ownership, not the R2 island")
if ROOT.get("origin_semantics")!="Sea level, not a walking floor":
    raise RuntimeError("Unexpected island sea-origin contract")
previous_audit = json.loads(ROOT.get("native_geological_finish_r2_audit_json","null"))
if (not previous_audit or previous_audit.get("triangles")!=172522
        or previous_audit.get("zero_area_triangles")!=0
        or previous_audit.get("normal_opposition_candidates")!=0
        or previous_audit.get("uv_degenerate_triangles")!=0):
    raise RuntimeError("No real successful R2 audit to authorize this scoped patch")


# Per landmark: taperX, taperZ, foot-wide, skew, upper shiftX, upper shiftZ,
# cap rise, cap slopeX, cap slopeZ. These are authored metre-scale forms,
# not RNG, independent boulders or a new generalized geology framework.
MACRO_FORMS = {
    "Rear_Connected_Low_Saddle": (.12,.15,.06,.020,.30,-.50,.30,.021,-.065),
    "Western_Broad_Second_Terrace": (.18,.22,.12,.050,1.30,-.55,.40,.120,-.110),
    "Cannon_Continuous_Middle_Terrace": (.16,.24,.10,-.020,-.40,-1.15,.35,-.045,-.160),
    "Cannon_Asymmetric_High_Plateau": (.18,.12,.05,.060,-.50,-.80,1.40,-.140,-.190),
    "Western_High_Shoulder_Connected_To_Cannon": (.15,.20,.09,.025,1.30,-.60,.30,.100,-.060),
    "East_Long_Lower_Shoulder": (.15,.24,.10,-.060,-1.10,.25,-.15,-.110,-.120),
    "Front_Low_Connecting_Ridge_Ledge": (.10,.20,.08,.010,.10,-.60,-.30,.025,-.180),
    "West_Front_Outer_Cleft_Buttress": (.18,.14,.12,-.040,.20,-.40,1.30,-.090,-.120),
    "West_Front_Inner_Cleft_Buttress": (.16,.13,.10,.030,.50,-.30,.85,-.110,-.080),
    "West_Low_Shelf_Before_Cleft": (.14,.12,.06,-.025,.30,.10,.20,-.100,-.045),
    "West_Toe_Grounded_Not_Hanging": (.10,.10,.025,.025,.10,-.10,.15,.015,-.025),
    "Front_Left_Principal_Finger": (.10,.14,.06,.015,.10,-.65,.15,.070,-.085),
    "Front_Central_Long_Finger": (.10,.14,.06,-.025,-.10,-.50,.10,-.025,-.110),
    "Front_East_Short_Finger": (.10,.12,.05,.020,-.15,-.35,-.10,.055,-.065),
    "Southeast_Low_Access_Headland": (.13,.10,.03,-.015,-.25,-.35,-.15,-.065,-.055),
    "East_Ledge_North_Of_Access": (.12,.16,.08,-.040,-.30,-.30,.10,-.045,-.090),
    "East_Waterfall_Channel_Rear_Bank": (.16,.16,.12,.035,-.25,-.45,1.00,.060,-.075),
    "East_Waterfall_Channel_Front_Bank": (.16,.16,.10,-.030,-.60,.10,.30,-.040,-.110),
}


def macro_parameters(name,role):
    local = name.removeprefix(PREFIX)
    if local in MACRO_FORMS:
        return MACRO_FORMS[local],True
    if not local.startswith("Attached_Fracture_"):
        raise RuntimeError("No intentional R3 form for "+name)
    index = int(local.rsplit("_",1)[1])
    sign = 1 if index%2 else -1
    if role=="Ridge_attached_strata_lips":
        return (.17,.11,.025,.050*sign,.20*sign,-.15,.15,.140*sign,-.120),False
    if role=="Cannon_high_terrace_fractures":
        return (.16,.10,.035,.040*sign,-.15,-.20,.55,-.110,-.100),False
    if role=="West_buttress_attached_facets":
        return (.19,.10,.07,.035*sign,.15,-.12,.25,.120*sign,-.070),False
    if role=="Channel_integral_fracture_faces":
        return (.14,.12,.045,.025*sign,-.15,-.10,.25,.080*sign,-.090),False
    if role in ("Front_attached_fracture_faces","Low_headland_attached_facets"):
        return (.12,.12,.03,.025*sign,.08*sign,-.08,.08,.100*sign,-.120),False
    raise RuntimeError("Unknown actual R2 attached role: "+role)


def macro_delta(points,polygon,parameters):
    """Whole caps affine; continuous broad walls; bottom/sea/apron protected."""
    taper_x,taper_z,foot,skew,shift_x,shift_z,rise,slope_x,slope_z = parameters
    polygon = np.asarray(polygon,dtype=np.float64)
    cx,cz = polygon.mean(axis=0)
    x,y,z = points[:,0],points[:,1],points[:,2]
    bottom,top = float(y.min()),float(y.max())
    # Cap skin's max .85m band gets ONE affine transform. R2's large caps have
    # no safe added interior vertices; nonlinear per-vertex crowns on skinny
    # cap triangles would counterfeit relief or cancel through backtracking.
    fade_bottom = max(.72,bottom+.35)
    fade_top = max(fade_bottom+.20,top-.85)
    g = smooth(fade_bottom,fade_top,y)*smooth(.72,1.55,y)
    # Actual R2 has no above-sea prism vertex inside this enlarged clearing.
    # Do not bend a skinny cap with a per-vertex XZ clearance fade: its whole
    # skin must remain affine. Refuse an unknown encroaching source instead.
    clearing_inside = ((np.abs(x)<=16.30)&(z>=-16.30)&(z<=10.30)&(y>.72))
    if np.any(clearing_inside):
        raise RuntimeError("R3 source prism already intrudes into reserved clearing")
    lx,lz = x-cx,z-cz
    # Finite 4*g*(1-g) broadens mid/lower support shoulders, then dies at the
    # cap. The sea/subsea footprint never tapers into a hovering inverted cone.
    bulge = 4*g*(1-g)*foot
    delta = np.zeros_like(points)
    delta[:,0] = (-taper_x*g+bulge)*lx+skew*g*lz+g*shift_x
    delta[:,2] = (-taper_z*g+bulge)*lz-skew*g*lx+g*shift_z
    delta[:,1] = g*(rise+slope_x*lx+slope_z*lz)
    fixed = y<=.72
    delta[fixed] = 0
    # Bottom skins of elevated, interconnected terraces also remain where
    # the verified R2 authored them, inside supporting parent rock volumes.
    delta[y<=bottom+.30] = 0
    return delta,{"pivot_xz":[float(cx),float(cz)],"original_bottom":bottom,
        "original_top":top,"cap_identity_band":.85,
        "taper_xz":[taper_x,taper_z],"wall_foot_bulge":foot,
        "upper_shift_xz":[shift_x,shift_z],"cap_rise":rise,
        "cap_slopes_xz":[slope_x,slope_z],"skew":skew}


def assert_clear_apron(points,indices,label):
    """Clip actual 3D triangles, not just vertices, to the reserved rectangle."""
    tri = points[indices]
    candidates = ((tri[:,:,0].max(axis=1)>-16)&(tri[:,:,0].min(axis=1)<16)
        &(tri[:,:,2].max(axis=1)>-16)&(tri[:,:,2].min(axis=1)<10)
        &(tri[:,:,1].max(axis=1)>4.80001))
    for source in tri[candidates]:
        polygon = list(source)
        for axis,bound,inside_sign in ((0,-16,1),(0,16,-1),(2,-16,1),(2,10,-1)):
            clipped = []
            if not polygon:
                break
            a = polygon[-1]
            da = (a[axis]-bound)*inside_sign
            for b in polygon:
                db = (b[axis]-bound)*inside_sign
                if (da>=0)!=(db>=0):
                    clipped.append(a+(b-a)*(da/(da-db)))
                if db>=0:
                    clipped.append(b)
                a,da = b,db
            polygon = clipped
        if len(polygon)<3:
            continue
        clipped = np.asarray(polygon)
        xz = clipped[:,[0,2]]
        following = np.roll(xz,-1,axis=0)
        area = abs(float(np.sum(xz[:,0]*following[:,1]-xz[:,1]*following[:,0])))*.5
        if area>1e-7 and float(clipped[:,1].max())>4.80001:
            raise RuntimeError("Actual R3 triangle covers the reserved apron: "+label)


def sculpt_macro_volume(obj):
    mesh = obj.data
    before = gltf_points(mesh)
    polygon = json.loads(obj.get("drawn_footprint_xz_json","null"))
    if not polygon:
        raise RuntimeError("No actual R2 drawn source footprint: "+obj.name)
    parameters,primary = macro_parameters(obj.name,obj.get("landmark_group"))
    mesh.calc_loop_triangles()
    indices = np.asarray([t.vertices[:] for t in mesh.loop_triangles],dtype=np.int32)
    delta,form = macro_delta(before,polygon,parameters)
    after,backtracking = bounded_sculpt_candidate(before,indices,delta,obj.name)
    if primary and backtracking["accepted_alpha"]<.25:
        raise RuntimeError("Macro proposal attenuated below a meaningful form: "+obj.name)
    fixed = before[:,1]<=.72
    bottom_fixed = before[:,1]<=before[:,1].min()+.30
    clearing_fixed = ((np.abs(before[:,0])<=16.30)&(before[:,2]>=-16.30)&(before[:,2]<=10.30))
    if not np.array_equal(before[fixed|bottom_fixed|clearing_fixed],after[fixed|bottom_fixed|clearing_fixed]):
        raise RuntimeError("R3 altered an exact coast, bottom skin or clearing point")
    new_inside = ((np.abs(after[:,0])<=16.30)&(after[:,2]>=-16.30)&(after[:,2]<=10.30)&(after[:,1]>.72))
    if np.any(new_inside):
        raise RuntimeError("R3 macro form encroaches into the reserved clearing")
    assert_clear_apron(after,indices,obj.name)
    native = np.stack((after[:,0],-after[:,2],after[:,1]),axis=1).astype(np.float32)
    mesh.vertices.foreach_set("co",native.ravel())
    mesh.update()
    actual = gltf_points(mesh)
    if not np.array_equal(actual,after):
        raise RuntimeError("Actual Float32 macro write mismatch")
    displacement = np.linalg.norm(actual-before,axis=1)
    form.update(name=obj.name,primary_landmark=primary,
        maximum_displacement_metres=float(displacement.max()),
        maximum_vertical_change=float(np.max(np.abs(actual[:,1]-before[:,1]))),
        sea_band_vertices_exact=int(fixed.sum()),
        bottom_skin_vertices_exact=int(bottom_fixed.sum()),
        actual_triangle_winding_backtracking=backtracking)
    obj["r3_macro_form_json"] = json.dumps(form,separators=(",",":"))
    obj["r3_art_scope"] = "Reference-led oblique pitched terrain; standalone, no runtime approval"
    return form


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
        raise RuntimeError("Fix actual R3 source: zero=%d opposition=%d uv=%d" %
                           (zero_area,opposition,uv_degenerate))
    if triangles!=ORIGINAL_TRIANGLES or triangles>180000:
        raise RuntimeError("R3 changed the triangle count or exceeded the review guard")
    if source_xyz_digest(BODY.data)!=BODY_DIGEST:
        raise RuntimeError("R3 changed protected continuous bodyXYZ")
    if abs(float(minimum[1])+10)>1e-7:
        raise RuntimeError("The sea-root foundation no longer reachesY-10")
    return {"triangles":triangles,"source_vertices":vertices,"meshes":len(OBJECTS),
        "materials":2,"packed_images":4,"minimum_gltf":minimum.tolist(),
        "maximum_gltf":maximum.tolist(),"size_gltf":(maximum-minimum).tolist(),
        "closed_positive_volume_sources":True,"zero_area_triangles":zero_area,
        "normal_opposition_candidates":opposition,"uv_degenerate_triangles":uv_degenerate,
        "continuous_body_xyz_unchanged":True,"body_xyz_sha256":BODY_DIGEST,
        "all_prism_y_unchanged":False, "macro_y_authoring_is_standalone":True,"sea_contact_below_y072_unchanged":True,
        "no_new_triangles":True,"source_details":reports,
        "not_automatic_reconstruction":True,"art_and_actual_export_not_approved":True}



BODY_DIGEST = source_xyz_digest(BODY.data)
ORIGINAL_TRIANGLES = 0
for obj in OBJECTS:
    obj.data.calc_loop_triangles()
    ORIGINAL_TRIANGLES += len(obj.data.loop_triangles)
if ORIGINAL_TRIANGLES!=172522:
    raise RuntimeError("R3 scoped only to the actual inspected172522-triangleR2")
for obj in OBJECTS:
    if len(obj.data.materials)!=1:
        raise RuntimeError("R2's verified one-slot PBR ownership is missing")
packed = []
for material in (ROCK,EARTH):
    for node in material.node_tree.nodes:
        if node.bl_idname=="ShaderNodeTexImage" and node.image is not None:
            image = node.image
            if image.packed_file is None or image.file_format!="PNG":
                raise RuntimeError("R2 portable PNG is not packed")
            packed.append({"name":image.name,"size":list(image.size),"packed":True})
if len(packed)!=4 or len({item["name"] for item in packed})!=4:
    raise RuntimeError("Expected same four original R2 packed PNGs")
macro_reports = []
paint_reports = []
for obj in OBJECTS:
    if obj!=BODY:
        macro_reports.append(sculpt_macro_volume(obj))
        recalc_closed_source(obj)
    paint_reports.append(paint_and_rebind(obj,obj==BODY))
metrics = strict_source_audit()
ROOT["native_macro_terraces_r3_audit_json"] = json.dumps(metrics,separators=(",",":"))
ROOT["r3_macro_scope"] = "43 existing closed forms; oblique pitched caps, tapered shoulder walls; unchanged body sea-root"
ROOT["r3_runtime_status"] = "Standalone study, not gameplay/map/support/collision integration approval"
result = {"recipe":"projects-island-v2-r3-macro-oblique-connected-geology",
    "root":ROOT_NAME,"audit":metrics,"macro_sources":macro_reports,
    "source_pigment":paint_reports,"unchanged_packed_maps":packed,
    "renders_performed":0,"network_requests":0,"new_meshes":0,"gameplay_changes":0,
    "no_automatic_reconstruction":True,"reference_fidelity_not_approved":True,
    "next":"Inspect actual FRONT/RIGHT/TOP/hero same camera and exported geometry before any map integration"}
