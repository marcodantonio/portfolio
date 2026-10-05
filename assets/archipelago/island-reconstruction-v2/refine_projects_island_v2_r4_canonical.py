"""Projects V2 R4: native R3 standalone constrained terrain reconstruction.

Local authoring recipe ONLY. Parent owns provider apply, saved project, native
render/export and actual GLB review. R1-R3 recipes/files are immutable.
Reference-led modelling, NOT automatic multiview reconstruction.

Rebuild the body's above-water surface with a true 32x26m square clearing,
centre(0,-3), Y4.8, plus its constrained coastal annulus. Reuse the exact actual
R3 submerged triangle geometry and sea-ring. Replace 11 primary cap/collars
with constrained interior topology, broad folded mineral planes and two actual
fault troughs meeting the perimeter. No scattered rocks, new building, plant,
floor, collider or gameplay integration. 44 mesh owners remain.

Single PBR slot per mesh; same two PBR and four packed PNG bytes untouched.
COLOR_0 sampled on new interior vertices, no periodic sediment pigment bands.
Underwater source geometry, source sea-origin and foundationY-10 stay exact.
New top triangles are the eventual support, never a layer above old colliders.
Hard source budget180000, expected120000-165000. Artist/browser/runtime approval
is separate. Blender5.2 CDT signature/ID semantics were queried on real R3.
"""
import hashlib
import json
import math
from collections import Counter
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

PREFIX="ProjectsIsland_V2_"
ROOT_NAME=PREFIX+"Origin_At_Sea_Level"
BODY_NAME=PREFIX+"Continuous_Connected_Coast_And_Bedrock"
COLOR_NAME="TerrainColour"
ROOT=bpy.data.objects.get(ROOT_NAME)
BODY=bpy.data.objects.get(BODY_NAME)
ROCK=bpy.data.materials.get(PREFIX+"Limestone")
EARTH=bpy.data.materials.get(PREFIX+"HoneyEarth")
if ROOT is None or BODY is None or ROCK is None or EARTH is None:
    raise RuntimeError("R4 requires committed Projects V2 R3")
OBJECTS=sorted((o for o in ROOT.children if o.type=="MESH"),key=lambda o:o.name)
if len(OBJECTS)!=44 or BODY not in OBJECTS or not ROOT.get("native_macro_terraces_r3_audit_json"):
    raise RuntimeError("Not the actual guarded R3 source")
if ROOT.get("origin_semantics")!="Sea level, not a walking floor":
    raise RuntimeError("Unexpected sea-root")
PRIMARY={
    "Rear_Connected_Low_Saddle","Western_Broad_Second_Terrace",
    "Cannon_Continuous_Middle_Terrace","Cannon_Asymmetric_High_Plateau",
    "Western_High_Shoulder_Connected_To_Cannon","East_Long_Lower_Shoulder",
    "West_Front_Outer_Cleft_Buttress","West_Front_Inner_Cleft_Buttress",
    "Front_Left_Principal_Finger","Front_Central_Long_Finger",
    "Front_East_Short_Finger"}
BODY_SPACING=.85
CAP_SPACING=.58
EPS=1e-8


def snapshot(obj):
    mesh=obj.data
    mesh.calc_loop_triangles()
    return gltf_points(mesh),np.asarray([t.vertices[:] for t in mesh.loop_triangles],dtype=np.int32)


def underwater_digest(points,faces):
    chosen=faces[np.all(points[faces,1]<=0,axis=1)]
    keys=[]
    for tri in chosen:
        rows=[np.asarray(points[i],dtype=np.float32).tobytes() for i in tri]
        keys.append(min(rows[0]+rows[1]+rows[2],rows[1]+rows[2]+rows[0],rows[2]+rows[0]+rows[1]))
    return hashlib.sha256(b"".join(sorted(keys))).hexdigest(),len(chosen)


def signed_area(poly):
    q=np.asarray(poly,dtype=np.float64)
    n=np.roll(q,-1,axis=0)
    return float(np.sum(q[:,0]*n[:,1]-q[:,1]*n[:,0])*.5)


def point_inside(p,poly):
    x,z=p
    inside=False
    for a,b in zip(poly,poly[1:]+poly[:1]):
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
            inside=not inside
    return inside


def border_distance(p,poly):
    p=np.asarray(p,dtype=np.float64)
    a=np.asarray(poly,dtype=np.float64)
    d=np.roll(a,-1,axis=0)-a
    lengths=np.einsum("ij,ij->i",d,d)
    if np.any(lengths<=0):
        raise RuntimeError("Collapsed source contour edge")
    t=np.clip(np.einsum("ij,ij->i",p-a,d)/lengths,0,1)
    return float(np.min(np.linalg.norm(p-a-t[:,None]*d,axis=1)))


def boundary_loop(points,faces,label):
    counts=Counter()
    direction={}
    for a,b,c in faces:
        for start,end in ((a,b),(b,c),(c,a)):
            key=tuple(sorted((int(start),int(end))))
            counts[key]+=1
            direction[key]=(int(start),int(end))
    if any(v>2 for v in counts.values()):
        raise RuntimeError("Nonmanifold lower source: "+label)
    edges=[direction[e] for e,count in counts.items() if count==1]
    outgoing={}
    incoming=Counter()
    for a,b in edges:
        if a in outgoing:
            raise RuntimeError("Branched lower boundary: "+label)
        outgoing[a]=b
        incoming[b]+=1
    if not edges or any(n!=1 for n in incoming.values()) or set(incoming)!=set(outgoing):
        raise RuntimeError("Not one directed lower boundary: "+label)
    first=min(outgoing)
    loop=[]
    current=first
    while current not in loop:
        loop.append(current)
        current=outgoing[current]
    if current!=first or len(loop)!=len(edges):
        raise RuntimeError("Multiple lower boundary loops: "+label)
    polygon=points[loop][:,[0,2]].tolist()
    if signed_area(polygon)<=0:
        raise RuntimeError("Actual outward lower boundary is not CCW XZ: "+label)
    return loop


def add_vertex(vertices,lookup,point):
    point=np.asarray(point,dtype=np.float32).astype(np.float64)
    key=tuple(point)
    index=lookup.get(key)
    if index is None:
        index=len(vertices)
        lookup[key]=index
        vertices.append(point.tolist())
    return index


def clip_lower(points,faces,height,label):
    """Actual triangle clipping, preserving ALL wholly lower triangles."""
    vertices=[]
    output=[]
    lookup={}
    intersections={}
    cut=float(np.float32(height))
    for ids in faces:
        tri=points[ids]
        if np.all(tri[:,1]>cut):
            continue
        polygon=[]
        a=tri[-1]
        previous_id=int(ids[-1])
        da=cut-a[1]
        for next_id in ids:
            next_id=int(next_id)
            b=points[next_id]
            db=cut-b[1]
            if (da>=0)!=(db>=0):
                # Canonical ORIGINAL edge, not orientation-dependent Float32
                # rounding of A->B versus B->A on adjacent source triangles.
                edge=tuple(sorted((previous_id,next_id)))
                p=intersections.get(edge)
                if p is None:
                    aa,bb=points[list(edge)]
                    t=(cut-aa[1])/(bb[1]-aa[1])
                    p=np.asarray(aa+(bb-aa)*t,dtype=np.float32).astype(np.float64)
                    p[1]=cut
                    intersections[edge]=p
                polygon.append(p)
            if db>=0:
                polygon.append(b)
            a,da=b,db
            previous_id=next_id
        indices=[]
        for p in polygon:
            index=add_vertex(vertices,lookup,p)
            if not indices or indices[-1]!=index:
                indices.append(index)
        if len(indices)>1 and indices[0]==indices[-1]:
            indices.pop()
        for k in range(1,len(indices)-1):
            face=(indices[0],indices[k],indices[k+1])
            if len(set(face))==3:
                output.append(face)
    p=np.asarray(vertices,dtype=np.float64)
    f=np.asarray(output,dtype=np.int32)
    loop=boundary_loop(p,f,label)
    if not np.all(p[loop,1]==cut):
        raise RuntimeError("Clipped boundary is not the exact cut plane")
    return vertices,output,loop


def cdt(coords,edges,outer_count,label):
    """Snap returned IDs to exact input positions; never assume output order."""
    original=np.asarray(coords,dtype=np.float32).astype(np.float64)
    result=delaunay_2d_cdt([Vector(tuple(p)) for p in original],edges,
        [tuple(range(outer_count))],1,EPS,True)
    out,_,tri,orig_v,_,_=result
    points=np.asarray([tuple(p) for p in out],dtype=np.float64)
    mapping={}
    for index,ids in enumerate(orig_v):
        if ids:
            first=int(ids[0])
            if any(np.linalg.norm(original[int(i)]-original[first])>1e-9 for i in ids):
                raise RuntimeError("CDT merged distinct input vertices: "+label)
            points[index]=original[first]
            for i in ids:
                if int(i) in mapping:
                    raise RuntimeError("CDT duplicated an input ID")
                mapping[int(i)]=index
    if any(i not in mapping for i in range(outer_count)):
        raise RuntimeError("CDT lost exact boundary input IDs: "+label)
    triangles=[]
    for t in tri:
        if len(t)!=3:
            raise RuntimeError("Native type1 CDT returned a nontriangle")
        a,b,c=map(int,t)
        area=signed_area(points[[a,b,c]])
        if abs(area)<1e-12:
            raise RuntimeError("CDT made a collapsed planar face: "+label
                +" triangle="+repr((a,b,c))+" area="+repr(area)
                +" points="+repr(points[[a,b,c]].tolist()))
        # CW in glTF XZ is positiveY, independently of native CDT orientation.
        triangles.append((a,c,b) if area>0 else (a,b,c))
    count=Counter()
    for a,b,c in triangles:
        for u,v in ((a,b),(b,c),(c,a)):
            count[tuple(sorted((u,v)))]+=1
    for i in range(outer_count):
        edge=tuple(sorted((mapping[i],mapping[(i+1)%outer_count])))
        if count[edge]!=1:
            raise RuntimeError("CDT subdivided/lost a wall's exact boundary edge: "+label)
    return points,triangles,mapping


def perimeter_edges(n,start=0):
    return [(start+i,start+(i+1)%n) for i in range(n)]


def rectangle_perimeter():
    corners=[(-16,-16),(16,-16),(16,10),(-16,10)]
    out=[]
    for a,b in zip(corners,corners[1:]+corners[:1]):
        n=math.ceil(math.dist(a,b)/BODY_SPACING)
        for j in range(n):
            t=j/n
            out.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
    return out


def body_height(x,z,coast):
    d=math.hypot(max(abs(x)-16,0),max(abs(z+3)-13,0))
    if d<1e-6:
        return 4.8
    sea=border_distance((x,z),coast)
    t=d/(d+sea)
    y=4.8*(1-float(smooth(0,1,t)))+.48*float(smooth(0,1,t))
    # Actual mineral recesses under the western cleft / future east channel.
    west=math.exp(-((x+27.1)/1.15)**2)*float(smooth(1,9,z))
    east=math.exp(-((x-27.0)/1.0)**2)*(1-float(smooth(-8,8,z)))
    y-=min(1.9,1.9*max(west,east))*float(smooth(.4,3.0,d))
    # Prospective entrances are sculpted into this same REAL top, never planes.
    for a,b,radius,arrival_y in (((4.6834,26.3442),(0,15),2.75,1.25364),
                                ((29.0315,1.296),(0,15),1.75,1.23396)):
        a,b=np.asarray(a),np.asarray(b)
        direction=b-a
        q=float(np.clip(np.dot(np.array((x,z))-a,direction)/np.dot(direction,direction),0,1))
        distance=float(np.linalg.norm(np.array((x,z))-a-q*direction))
        influence=(1-float(smooth(radius,radius+1.15,distance)))*float(smooth(.20,1.25,d))
        target=arrival_y+(4.8-arrival_y)*float(smooth(0,.88,q))
        y=y*(1-influence)+target*influence
    return max(.38,y)


def replace_mesh(obj,vertices,faces):
    old=obj.data
    mesh=bpy.data.meshes.new(obj.name+"_R4_Constrained_Source")
    native=[(p[0],-p[2],p[1]) for p in vertices]
    mesh.from_pydata(native,[],faces)
    mesh.update()
    bm=bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if not all(e.is_manifold for e in bm.edges) or bm.calc_volume(signed=True)<=0:
        bm.free()
        bpy.data.meshes.remove(mesh)
        raise RuntimeError("Reconstructed source is not closed/outward: "+obj.name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj.data=mesh
    if old.users==0:
        bpy.data.meshes.remove(old)
    return len(mesh.vertices),len(mesh.polygons)


def rebuild_body(obj):
    old,indices=ORIGINAL[obj.name]
    lower_faces=indices[np.all(old[indices,1]<=0,axis=1)]
    used=np.unique(lower_faces)
    lookup={int(v):i for i,v in enumerate(used)}
    lower=old[used].tolist()
    faces=[tuple(lookup[int(v)] for v in f) for f in lower_faces]
    points=np.asarray(lower)
    loop=boundary_loop(points,np.asarray(faces),"continuous body")
    if len(loop)!=256 or not np.all(points[loop,1]==0):
        raise RuntimeError("Not the actual R3 256-point sea-contact ring")
    coast=points[loop][:,[0,2]].tolist()
    coords=list(coast)
    constraints=perimeter_edges(len(coords))
    square=rectangle_perimeter()
    square_start=len(coords)
    coords.extend(square)
    constraints.extend(perimeter_edges(len(square),square_start))
    # Grid excludes every constraint collar, so no unannounced coast splitting.
    mins,maxs=np.min(coast,axis=0),np.max(coast,axis=0)
    for row,z in enumerate(np.arange(mins[1]+.3,maxs[1]-.2,BODY_SPACING)):
        for x in np.arange(mins[0]+.3+(row%2)*BODY_SPACING*.5,maxs[0]-.2,BODY_SPACING):
            if not point_inside((x,z),coast) or border_distance((x,z),coast)<.25:
                continue
            in_clear=(-16<=x<=16 and -16<=z<=10)
            clear_dist=min(abs(x+16),abs(x-16),abs(z+16),abs(z-10))
            if clear_dist<.20:
                continue
            coords.append((float(x),float(z)))
    top,tri,mapping=cdt(coords,constraints,len(coast),"body top + constrained clearing")
    offset=len(lower)
    square_ids=set(range(square_start,square_start+len(square)))
    exact_square_outputs={mapping[i] for i in square_ids}
    for i,(x,z) in enumerate(top):
        y=4.8 if i in exact_square_outputs or (-16<=x<=16 and -16<=z<=10) else body_height(x,z,coast)
        lower.append([float(x),y,float(z)])
    faces.extend(tuple(offset+i for i in f) for f in tri)
    for k,a in enumerate(loop):
        b=loop[(k+1)%len(loop)]
        ta,tb=offset+mapping[k],offset+mapping[(k+1)%len(loop)]
        faces.extend(((b,a,ta),(b,ta,tb)))
    counts=replace_mesh(obj,lower,faces)
    obj["r4_true_clearing"]="Constrained rectangle32x26m centre(0,-3), exact sourceY4.8"
    obj["r4_coast_source"]="Actual R3 sea-ring256 and ALL original submerged triangles unchanged"
    return {"name":obj.name,"vertices":counts[0],"triangles":counts[1],
        "source_sea_ring":256,"submerged_triangle_count":len(lower_faces),
        "true_square_boundary_vertices":len(square),"body_top_cdt_points":len(top)}


def dominant_cap(points,indices,label):
    tri=points[indices]
    face=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
    area=np.linalg.norm(face,axis=1)
    normals=face/np.maximum(area,1e-30)[:,None]
    good=(normals[:,1]>.85)&(tri[:,:,1].mean(axis=1)>.72)
    quantized=np.round(normals[good],2)
    keys,inv=np.unique(quantized,axis=0,return_inverse=True)
    weights=np.bincount(inv,weights=area[good])
    target=keys[int(np.argmax(weights))]
    target/=np.linalg.norm(target)
    selected=good&(normals@target>.999)
    selected_faces=tri[selected]
    weights=area[selected]
    if len(selected_faces)<3 or weights.sum()<1:
        raise RuntimeError("No genuine large source cap: "+label)
    normal=np.sum(normals[selected]*weights[:,None],axis=0)
    normal/=np.linalg.norm(normal)
    offset=float(np.sum((selected_faces.mean(axis=1)@normal)*weights)/weights.sum())
    projected=selected_faces.reshape(-1,3)
    plane_y=(offset-normal[0]*projected[:,0]-normal[2]*projected[:,2])/normal[1]
    nominal=max(.95,float(plane_y.min())-1.30)
    # Avoid old source vertices / bevel skins by choosing a nearby safe slice.
    values=[float(np.float32(nominal+d)) for d in np.linspace(-.035,.035,41)]
    height=max(values,key=lambda v:float(np.min(np.abs(points[:,1]-v))))
    if float(np.min(np.abs(points[:,1]-height)))<1e-6:
        raise RuntimeError("Cannot choose a safe cap-collar cut plane")
    return normal,offset,height


def cap_frame(poly,label):
    centre=np.asarray(poly).mean(axis=0)
    span=np.ptp(np.asarray(poly),axis=0)
    # Broad rear folds share a diagonal direction, western/front geology differs.
    angle=.28 if "Cannon" in label or "Rear" in label or "Terrace" in label or "Shoulder" in label else -.42
    axis=np.array((math.cos(angle),math.sin(angle)))
    side=np.array((-axis[1],axis[0]))
    radius=max(2.0,float(np.max(span))*.5)
    return centre,axis,side,radius


def top_height(x,z,normal,offset,cut,frame):
    centre,axis,side,radius=frame
    local=np.array((x,z))-centre
    u,v=float(local@axis),float(local@side)
    baseline=(offset-normal[0]*x-normal[2]*z)/normal[1]
    # Three intersecting broad sloping mineral planes, not smooth Gaussian hills.
    amplitude=min(1.35,.13*radius)
    folded=min(amplitude+.105*u-.055*v,
               amplitude*1.12-.135*u+.065*v,
               amplitude*.84+.030*u-.120*v)
    # Two V-fractures actually reach the cap/wall boundary.
    d1=abs(u+.36*v+radius*.28)/math.sqrt(1+.36**2)
    d2=abs(u-.24*v-radius*.33)/math.sqrt(1+.24**2)
    width=min(.85,.09*radius+.25)
    depth1=min(1.25,.15*radius+.25)*max(0,1-d1/width)
    depth2=min(.95,.12*radius+.20)*max(0,1-d2/(width*.88))
    return max(cut+.40,baseline+folded-depth1-depth2)


def add_fault_constraints(coords,edges,poly,frame):
    centre,axis,side,radius=frame
    # Build ONE analytical junction graph before Float32 CDT. The three
    # equality-lines necessarily meet at one point: independently rounded
    # sampled lines gave the real5.2 solver a sub-micron triangle at that
    # triple junction. Shared graph vertices remove its cause, not its faces.
    # Endpoints stay .28m inside the contour: no shared-wall subdivision.
    lines=((1,.36,radius*.28),(1,-.24,-radius*.33))
    folded=( (.105,-.055,1),(-.135,.065,1.12),(.030,-.120,.84) )
    amplitude=min(1.35,.13*radius)
    for i,j in ((0,1),(1,2),(0,2)):
        a,b,c=folded[i]
        d,e,f=folded[j]
        lines+=((a-d,b-e,amplitude*(c-f)),)
    runs=[]
    for line_id,(a,b,c) in enumerate(lines):
        norm=math.hypot(a,b)
        if norm<1e-6:
            continue
        closest=-c*np.array((a,b))/(norm*norm)
        direction=np.array((-b,a))/norm
        samples=[]
        for t in np.arange(-radius*2.2,radius*2.2,CAP_SPACING*.83):
            uv=closest+direction*t
            p=centre+axis*uv[0]+side*uv[1]
            if not point_inside(p,poly) or border_distance(p,poly)<.28:
                if len(samples)>1:
                    runs.append({"line":line_id,"closest":closest,
                        "direction":direction,"samples":samples})
                samples=[]
                continue
            samples.append((float(t),p))
        if len(samples)>1:
            runs.append({"line":line_id,"closest":closest,
                "direction":direction,"samples":samples})
    junctions=[]
    for i in range(len(lines)):
        for j in range(i+1,len(lines)):
            matrix=np.asarray((lines[i][:2],lines[j][:2]),dtype=np.float64)
            if abs(float(np.linalg.det(matrix)))<1e-8:
                continue
            uv=np.linalg.solve(matrix,-np.asarray((lines[i][2],lines[j][2])))
            p=centre+axis*uv[0]+side*uv[1]
            members=[]
            for run_id,run in enumerate(runs):
                if run["line"] not in (i,j):
                    continue
                t=float((uv-run["closest"])@run["direction"])
                if run["samples"][0][0]-1e-9<=t<=run["samples"][-1][0]+1e-9:
                    members.append((run_id,t))
            if len({runs[r]["line"] for r,_ in members})!=2:
                continue
            shared=next((v for v in junctions if np.linalg.norm(v["point"]-p)<1e-4),None)
            if shared is None:
                shared={"point":p,"members":{},"index":len(coords)}
                coords.append(tuple(p))
                junctions.append(shared)
            for run_id,t in members:
                shared["members"][run_id]=t
    for run_id,run in enumerate(runs):
        nodes=[(v["members"][run_id],v["index"])
               for v in junctions if run_id in v["members"]]
        for t,p in run["samples"]:
            if any(np.linalg.norm(p-v["point"])<.12
                   for v in junctions if run_id in v["members"]):
                continue
            index=len(coords)
            coords.append(tuple(p))
            nodes.append((t,index))
        nodes.sort()
        for (_,a),(_,b) in zip(nodes,nodes[1:]):
            if a==b or np.linalg.norm(np.asarray(coords[a])-coords[b])<1e-5:
                raise RuntimeError("Collapsed analytical fracture-network segment")
            edges.append((a,b))
    return {"analytical_junctions":len(junctions),"interior_constraint_runs":len(runs)}


def rebuild_cap(obj):
    points,indices=ORIGINAL[obj.name]
    normal,plane,cut=dominant_cap(points,indices,obj.name)
    vertices,faces,loop=clip_lower(points,indices,cut,obj.name)
    lower=np.asarray(vertices)
    centre=lower[loop][:,[0,2]].mean(axis=0)
    # Whole contour is narrowed6% above the new lower shoulder. Unlike R3 the
    # roof will NOT remain affine; its entire old fragile cap has been removed.
    poly=(centre+(lower[loop][:,[0,2]]-centre)*.94).tolist()
    frame=cap_frame(poly,obj.name)
    coords=list(poly)
    edges=perimeter_edges(len(poly))
    network=add_fault_constraints(coords,edges,poly,frame)
    fracture_edges=np.asarray(edges[len(poly):],dtype=np.int32)
    if not len(fracture_edges):
        raise RuntimeError("Missing canonical fracture graph")
    graph=np.asarray(coords,dtype=np.float64)
    segment_a=graph[fracture_edges[:,0]]
    segment_d=graph[fracture_edges[:,1]]-segment_a
    segment_l2=np.einsum("ij,ij->i",segment_d,segment_d)
    lo,hi=np.min(poly,axis=0),np.max(poly,axis=0)
    for row,z in enumerate(np.arange(lo[1]+.25,hi[1]-.2,CAP_SPACING)):
        for x in np.arange(lo[0]+.25+(row%2)*CAP_SPACING*.5,hi[0]-.2,CAP_SPACING):
            if not point_inside((x,z),poly) or border_distance((x,z),poly)<=.27:
                continue
            p=np.array((x,z))
            t=np.clip(np.einsum("ij,ij->i",p-segment_a,segment_d)/segment_l2,0,1)
            distance=np.min(np.linalg.norm(p-segment_a-t[:,None]*segment_d,axis=1))
            # A genuine grid collar: avoid near-coincidences between samples
            # and constraints instead of loosening the source/CDT area gates.
            if distance>.12:
                coords.append((float(x),float(z)))
    top,tri,mapping=cdt(coords,edges,len(poly),obj.name+" cap")
    top_offset=len(vertices)
    for x,z in top:
        vertices.append([float(x),top_height(x,z,normal,plane,cut,frame),float(z)])
    faces.extend(tuple(top_offset+i for i in f) for f in tri)
    # An intermediate rim provides one broad supporting slope before the cap.
    middle=[]
    for k,a in enumerate(loop):
        x,z=poly[k]
        y=top_height(x,z,normal,plane,cut,frame)
        bottom=lower[a]
        middle.append(len(vertices))
        vertices.append([float(bottom[0]*.52+x*.48),cut+(y-cut)*.48,
                         float(bottom[2]*.52+z*.48)])
    for k,a in enumerate(loop):
        n=(k+1)%len(loop)
        b=loop[n]
        ma,mb=middle[k],middle[n]
        ta,tb=top_offset+mapping[k],top_offset+mapping[n]
        faces.extend(((b,a,ma),(b,ma,mb),(mb,ma,ta),(mb,ta,tb)))
    counts=replace_mesh(obj,vertices,faces)
    obj["r4_cap_retopology"]="Interior CDT, three folded mineral planes, two real Vfaults, lower true source retained"
    obj["r4_original_dominant_cap_plane"]=json.dumps({"normal":normal.tolist(),"offset":plane,"cut_y":cut})
    return {"name":obj.name,"triangles":counts[1],"vertices":counts[0],
        "cut_y":cut,"upper_boundary_vertices":len(loop),"cap_interior_points":len(top)-len(loop),
        "cap_triangles":len(tri),"folded_planes":3,"real_v_faults":2,
        "canonical_fracture_graph":network}

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


def gltf_points(mesh):
    values = np.empty(len(mesh.vertices)*3,dtype=np.float32)
    mesh.vertices.foreach_get("co",values)
    native = values.reshape(-1,3)
    return np.stack((native[:,0],native[:,2],-native[:,1]),axis=1).astype(np.float64)


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
    soil = np.array((.74,.485,.215))[None,:]*(.88+.14*tint+.035*np.sin(x*.68+z*.37))[:,None]
    moss = ledge_moss(points)
    corner_stone,corner_soil = stone[vertex_indices],soil[vertex_indices]
    up = smooth(.34,.94,corner_normals[:,1])
    if is_body:
        # The big central inhabited clearing remains golden earth. Rock/soil
        # paint does not raise chips or create another navigable support plane.
        clearing = np.maximum(np.abs(x)/16.0,np.abs(z+3.0)/13.0)
        central = 1.0-smooth(1.0,1.32,clearing)
        pockets = .22*smooth(.30,.75,tint)*(1-central)
        cover = (central+pockets)*smooth(.65,2.5,y)
        earth_mix = up*cover[vertex_indices]
    else:
        # Wide mineral caps with discontinuous deposits, never every up-face
        # assigned a perfectly uniform thick golden slab.
        deposits = .10+.55*smooth(.45,.84,tint[vertex_indices])
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



def audit_sources():
    reports=[]
    triangles=0
    lower_exact=True
    for obj in OBJECTS:
        points,indices=snapshot(obj)
        if not np.isfinite(points).all():
            raise RuntimeError("Nonfinite real source: "+obj.name)
        digest,count=underwater_digest(points,indices)
        old_digest,old_count=UNDERWATER[obj.name]
        if digest!=old_digest or count!=old_count:
            raise RuntimeError("Altered actual submerged source geometry: "+obj.name)
        lower_exact &= digest==old_digest
        mesh=obj.data
        bm=bmesh.new();bm.from_mesh(mesh)
        closed=all(e.is_manifold for e in bm.edges)
        volume=bm.calc_volume(signed=True);bm.free()
        if not closed or volume<=0 or not math.isfinite(volume):
            raise RuntimeError("Actual R4 not closed outward: "+obj.name)
        a,b,c=points[indices[:,0]],points[indices[:,1]],points[indices[:,2]]
        cross=np.cross(b-a,c-a)
        area=np.linalg.norm(cross,axis=1)
        if np.any(area<1e-10):
            triangle=int(np.argmin(area))
            raise RuntimeError("Actual R4 zero-area source: "+obj.name
                +" triangle="+str(triangle)+" cross_length="+repr(float(area[triangle])))
        mesh.calc_loop_triangles()
        loop_ids=np.asarray([t.loops[:] for t in mesh.loop_triangles],dtype=np.int32)
        corner=np.asarray([n.vector[:] for n in mesh.corner_normals],dtype=np.float64)
        # Native normals are Z-up, positions glTF Y-up.
        corner=np.stack((corner[:,0],corner[:,2],-corner[:,1]),axis=1)
        average=corner[loop_ids].sum(axis=1)
        average_length=np.linalg.norm(average,axis=1)
        dot=np.sum(cross*average,axis=1)/np.maximum(area*average_length,1e-30)
        if np.any(dot<-.05) or not np.isfinite(corner).all():
            triangle=int(np.argmin(dot))
            raise RuntimeError("Actual R4 normal opposition: "+obj.name
                +" triangle="+str(triangle)+" dot="+repr(float(dot[triangle])))
        uv=np.asarray([d.uv[:] for d in mesh.uv_layers.active.data])
        t=uv[loop_ids];d1=t[:,1]-t[:,0];d2=t[:,2]-t[:,0]
        determinants=d1[:,0]*d2[:,1]-d1[:,1]*d2[:,0]
        if not np.isfinite(uv).all() or np.any(np.abs(determinants)<1e-14):
            triangle=int(np.argmin(np.abs(determinants)))
            raise RuntimeError("Actual R4 UV-degenerate source: "+obj.name
                +" triangle="+str(triangle)+" determinant="+repr(float(determinants[triangle])))
        color=np.asarray([d.color[:] for d in mesh.color_attributes[COLOR_NAME].data])
        if not np.isfinite(color).all() or not np.all(np.ptp(color[:,:3],axis=0)>1e-5) or len(mesh.materials)!=1:
            raise RuntimeError("Actual R4 source COLOR_0/single-slot defect: "+obj.name)
        if obj!=BODY:
            assert_clear_apron(points,indices,obj.name)
        else:
            # The constraints, not a vertex-only clamp, make this exact plane.
            tri=points[indices]
            relevant=(tri[:,:,0].max(axis=1)>-16)&(tri[:,:,0].min(axis=1)<16)&(tri[:,:,2].max(axis=1)>-16)&(tri[:,:,2].min(axis=1)<10)&(tri[:,:,1].max(axis=1)>0)
            for source in tri[relevant]:
                poly=list(source)
                for axis,bound,sign in ((0,-16,1),(0,16,-1),(2,-16,1),(2,10,-1)):
                    result=[]
                    if not poly:break
                    aa=poly[-1];da=(aa[axis]-bound)*sign
                    for bb in poly:
                        db=(bb[axis]-bound)*sign
                        if (da>=0)!=(db>=0):result.append(aa+(bb-aa)*(da/(da-db)))
                        if db>=0:result.append(bb)
                        aa,da=bb,db
                    poly=result
                if len(poly)<3:continue
                poly=np.asarray(poly)
                if abs(signed_area(poly[:,[0,2]]))>1e-7 and np.any(np.abs(poly[:,1]-4.8)>1e-5):
                    raise RuntimeError("Actual clearing triangle not planar at4.8: "+obj.name
                        +" clipped_height_range="+repr((float(poly[:,1].min()),float(poly[:,1].max()))))
        triangles+=len(indices)
        reports.append({"name":obj.name,"triangles":len(indices),"closed":True,
            "positive_signed_volume":volume,"zero_area":0,"normal_opposition":0,"uv_degenerate":0,
            "actual_submerged_triangles_exact":count})
    if triangles>180000 or triangles<60000:
        raise RuntimeError("R4 source budget unexpected: "+str(triangles))
    for image,digest in PNGS:
        if hashlib.sha256(bytes(image.packed_file.data)).hexdigest()!=digest:
            raise RuntimeError("R4 modified original packed PNG")
    return {"meshes":len(OBJECTS),"triangles":triangles,"hard_triangle_limit":180000,
        "all_closed_positive":True,"zero_area_triangles":0,"normal_opposition_candidates":0,
        "uv_degenerate_triangles":0,"all_actual_underwater_geometry_exact":lower_exact,
        "true_clearing_32x26_at_y48":True,"sea_origin_y":0,"foundation_y":-10,
        "materials":2,"packed_original_png_unchanged":4,"source_details":reports,
        "not_automatic_reconstruction":True,"art_and_runtime_not_approved":True}

ORIGINAL={obj.name:snapshot(obj) for obj in OBJECTS}
if sum(len(faces) for _,faces in ORIGINAL.values())!=172522:
    raise RuntimeError("R4 requires actual172522-triangleR3")
UNDERWATER={name:underwater_digest(points,faces) for name,(points,faces) in ORIGINAL.items()}
PNGS=[]
for material in (ROCK,EARTH):
    for node in material.node_tree.nodes:
        if node.bl_idname=="ShaderNodeTexImage" and node.image:
            image=node.image
            if image.packed_file is None or image.file_format!="PNG":
                raise RuntimeError("Missing original packed PNG")
            PNGS.append((image,hashlib.sha256(bytes(image.packed_file.data)).hexdigest()))
if len(PNGS)!=4 or len({image.name for image,_ in PNGS})!=4:
    raise RuntimeError("R4 requires unchanged four original maps")
body_report=rebuild_body(BODY)
cap_reports=[]
for obj in OBJECTS:
    if obj.name.removeprefix(PREFIX) in PRIMARY:
        cap_reports.append(rebuild_cap(obj))
if len(cap_reports)!=11:
    raise RuntimeError("Incorrect 11 cap ownership")
pigment=[paint_and_rebind(obj,obj==BODY) for obj in OBJECTS]
metrics=audit_sources()
ROOT["native_constrained_geology_r4_audit_json"]=json.dumps(metrics,separators=(",",":"))
ROOT["r4_scope"]="True constrained clearing/coast,11 interior folded caps; exact actual submerged geometry"
ROOT["r4_runtime_status"]="Standalone art study, not map/floor/bridge/collider integration approval"
result={"recipe":"projects-island-v2-r4-constrained-upper-retopology",
    "root":ROOT_NAME,"audit":metrics,"body":body_report,"caps":cap_reports,
    "source_pigment":pigment,"new_mesh_owners":0,"provider_requests":0,"renders":0,
    "original_png_bytes_unchanged":True,"no_automatic_reconstruction":True,
    "next":"Actual native/source/GLB audits and same-camera hero; never overlay above old gameplay terrain"}
