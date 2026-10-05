"""Original articulated explorer, Blender 5.2 / dedicated authoring project.

Reference-led actual geometry, not a sprite, person scan or automatic image-to-3D
reconstruction. Metres, Blender Z-up; glTF exports (X,Z,-Y), front=+Z. The root is
the flat foot plane. Five rigid semantic pivots retain the existing gait model;
there is no armature, skin or authored animation. All mesh vertices are LOCAL to
their joint. Materials are combined only WITHIN each joint, never across pivots.
Own portable packed PBR maps; no external assets/network. Parent owns guards,
GLB export, runtime integration and art approval. Execute in its dedicated
project with bpy/numpy and the artifacts registry; preview is outside the root.
"""

import bpy
import math
import json
import numpy as np
from mathutils import Vector


PREFIX="Explorer_"
ROOT_NAME="Explorer_V1_Foot_Origin"
COLLECTION_NAME="Explorer_V1_Editable_Asset"
PREVIEW_NAME="explorer-v1-eevee.png"
HEIGHT_MAX=2.35
TRIANGLE_MAX=70_000
MESH_MAX=96
IMAGE_MAX=6
JOINTS=(
    ("Explorer_body",ROOT_NAME,(0,0,0)),
    ("Explorer_arm_L","Explorer_body",(-0.44,0,1.31)),
    ("Explorer_arm_R","Explorer_body",(0.44,0,1.31)),
    ("Explorer_leg_L",ROOT_NAME,(-0.20,0,0.73)),
    ("Explorer_leg_R",ROOT_NAME,(0.20,0,0.73)),
)
GROUPS,MATERIALS,TEXTURES={},{},[]
COLLECTION=None


def rgba(rgb):
    return np.concatenate((np.clip(rgb,0,1),np.ones((*rgb.shape[:2],1))),axis=2)


def packed_image(name,pixels,non_color=False):
    image=bpy.data.images.new(PREFIX+name,width=pixels.shape[1],height=pixels.shape[0],alpha=True)
    image.colorspace_settings.name="Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(np.asarray(pixels,dtype=np.float32).ravel())
    image.update();image.pack();TEXTURES.append(image)
    return image


def normal_image(name,height,strength):
    dy,dx=np.gradient(height)
    normal=np.stack((-dx*strength,-dy*strength,np.ones_like(dx)),axis=2)
    normal/=np.linalg.norm(normal,axis=2)[...,None]
    return packed_image(name,rgba(normal*0.5+0.5),True)


def material(name,color,roughness=0.65,metallic=0,base=None,normal=None,rough_map=None):
    mat=bpy.data.materials.new(PREFIX+"PBR_"+name);mat.use_nodes=True
    mat.diffuse_color=(*color,1)
    bsdf=mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(*color,1)
    bsdf.inputs["Roughness"].default_value=roughness
    bsdf.inputs["Metallic"].default_value=metallic
    for image,socket in ((base,"Base Color"),(rough_map,"Roughness")):
        if image is not None:
            tex=mat.node_tree.nodes.new("ShaderNodeTexImage");tex.image=image
            mat.node_tree.links.new(tex.outputs["Color"],bsdf.inputs[socket])
    if normal is not None:
        tex=mat.node_tree.nodes.new("ShaderNodeTexImage");tex.image=normal
        converter=mat.node_tree.nodes.new("ShaderNodeNormalMap")
        converter.inputs["Strength"].default_value=0.27
        mat.node_tree.links.new(tex.outputs["Color"],converter.inputs["Color"])
        mat.node_tree.links.new(converter.outputs["Normal"],bsdf.inputs["Normal"])
    MATERIALS[name]=mat
    return mat


def make_materials():
    u,v=np.meshgrid(np.linspace(0,1,256,endpoint=False),np.linspace(0,1,256,endpoint=False))
    weave=np.sin(u*math.tau*79)*np.sin(v*math.tau*67)
    fabric_n=normal_image("Fine_Woven_Fabric_Normal_256",weave*0.019,3)
    rough=np.clip(0.77+weave*0.016,0.72,0.82)
    fabric_r=packed_image("Woven_Fabric_Roughness_256",rgba(np.repeat(rough[...,None],3,axis=2)),True)
    fibre=np.sin(u*math.tau*93+0.85*np.sin(v*18))+0.32*np.sin(u*math.tau*167+v*9)
    hair_n=normal_image("Soft_Hair_Fibre_Normal_256",fibre*0.012,2)
    canvas=packed_image("Amber_Canvas_Base_256",rgba((0.99+weave*0.012)[...,None]*(0.94,0.60,0.115)))
    fine=np.sin(u*271+v*179)*np.sin(u*197-v*301)
    shoe_n=normal_image("Fine_Sneaker_Leather_Normal_256",fine*0.009,2)
    material("Violet_Fabric",(0.33,0.067,0.70),0.75,normal=fabric_n,rough_map=fabric_r)
    material("Violet_Fold",(0.245,0.045,0.53),0.78,normal=fabric_n)
    material("Amber_Canvas",(0.94,0.60,0.115),0.75,base=canvas,normal=fabric_n,rough_map=fabric_r)
    material("Amber_Trim",(0.86,0.46,0.06),0.77,normal=fabric_n)
    material("Dark_Trouser",(0.105,0.11,0.145),0.85,normal=fabric_n,rough_map=fabric_r)
    material("Sneaker_Ivory",(0.91,0.91,0.88),0.59,normal=shoe_n)
    material("Sneaker_Panel",(0.82,0.84,0.83),0.66,normal=shoe_n)
    material("Rubber_Sole",(0.72,0.72,0.67),0.90)
    material("Warm_Skin",(0.91,0.50,0.28),0.55)
    material("Skin_Shade",(0.78,0.32,0.18),0.61)
    material("Soft_Cheek",(0.92,0.43,0.28),0.62)
    material("Dark_Hair",(0.090,0.042,0.026),0.71,normal=hair_n)
    material("Hair_Accent",(0.145,0.072,0.039),0.75,normal=hair_n)
    material("Smile_Warm",(0.28,0.074,0.04),0.67)
    material("Eye_Ivory",(0.96,0.96,0.89),0.28)
    material("Iris_Brown",(0.18,0.075,0.034),0.25)
    material("Pupil_Dark",(0.015,0.012,0.014),0.22)
    material("Eye_Glint",(1,1,0.98),0.16)
    material("Graphite_Buckle",(0.13,0.14,0.14),0.42,0.50)


def mesh_object(name,vertices,faces,mat,joint,uv=None,smooth=False):
    data=bpy.data.meshes.new(PREFIX+name+"_Mesh");data.from_pydata(vertices,[],faces);data.update()
    data.calc_loop_triangles()
    for triangle in data.loop_triangles:
        a,b,c=(data.vertices[index].co for index in triangle.vertices)
        if (b-a).cross(c-a).length_squared<1e-20:
            raise RuntimeError("Zero-area source triangle in "+name)
    if uv is not None:
        layer=data.uv_layers.new(name="UVMap")
        for polygon in data.polygons:
            for loop_id in polygon.loop_indices:
                index=data.loops[loop_id].vertex_index
                layer.data[loop_id].uv=uv(data.vertices[index].co,polygon.normal) if callable(uv) else uv[index]
    data.materials.append(MATERIALS[mat])
    for polygon in data.polygons:
        polygon.use_smooth=len(polygon.vertices)==4 if smooth=="SIDES" else bool(smooth)
    obj=bpy.data.objects.new(PREFIX+name,data);COLLECTION.objects.link(obj);obj.parent=GROUPS[joint]
    obj["runtime_joint"]=joint
    obj["part_semantic"]=name
    return obj


def spow(value,power):
    return math.copysign(abs(value)**power,value)


def ellipsoid(name,center,scale,mat,joint,rings=12,sides=24,roundness=1):
    # Unique poles avoid the collapsed triangle fans of duplicated latitude poles.
    vertices=[(center[0],center[1],center[2]+scale[2])];faces=[];uv=[(0.5,1)]
    for row in range(1,rings):
        theta=math.pi*row/rings
        for side in range(sides):
            phi=math.tau*side/sides
            vertices.append((center[0]+scale[0]*spow(math.sin(theta),roundness)*spow(math.cos(phi),roundness),
                             center[1]+scale[1]*spow(math.sin(theta),roundness)*spow(math.sin(phi),roundness),
                             center[2]+scale[2]*spow(math.cos(theta),roundness)))
            uv.append((side/sides,1-row/rings))
    bottom=len(vertices);vertices.append((center[0],center[1],center[2]-scale[2]));uv.append((0.5,0))
    for side in range(sides):faces.append((0,1+side,1+(side+1)%sides))
    for row in range(rings-2):
        for side in range(sides):
            nxt=(side+1)%sides;a=1+row*sides+side;b=1+(row+1)*sides+side
            faces.append((a,b,1+(row+1)*sides+nxt,1+row*sides+nxt))
    last=1+(rings-2)*sides
    for side in range(sides):faces.append((last+side,bottom,last+(side+1)%sides))
    return mesh_object(name,vertices,faces,mat,joint,uv,True)


def loft(name,levels,mat,joint,sides=32,roundness=1):
    """Closed sculpted rings: each level is(cx,cy,z,rx,ry), all joint-local."""
    vertices,faces,uv=[],[],[]
    for row,(cx,cy,z,rx,ry) in enumerate(levels):
        if rx<=0 or ry<=0:raise ValueError("Loft rings need positive radii")
        for side in range(sides):
            phi=side*math.tau/sides
            vertices.append((cx+rx*spow(math.cos(phi),roundness),cy+ry*spow(math.sin(phi),roundness),z))
            uv.append((side/sides,row/(len(levels)-1)))
    for row in range(len(levels)-1):
        for side in range(sides):
            nxt=(side+1)%sides
            faces.append((row*sides+side,row*sides+nxt,(row+1)*sides+nxt,(row+1)*sides+side))
    first,last=len(vertices),len(vertices)+1
    vertices.extend((tuple(levels[0][:3]),tuple(levels[-1][:3])));uv.extend(((0.5,0),(0.5,1)))
    for side in range(sides):
        faces.append((first,(side+1)%sides,side))
        faces.append((last,(len(levels)-1)*sides+side,(len(levels)-1)*sides+(side+1)%sides))
    return mesh_object(name,vertices,faces,mat,joint,uv,"SIDES")


def swept(name,points,radii,mat,joint,sides=10,flatness=1,reference=(1,0,0)):
    points=[Vector(tuple(float(v) for v in p)) for p in points]
    radii=[float(r) for r in radii]
    if len(points)<2 or len(points)!=len(radii) or min(radii)<=0:raise ValueError("Invalid swept profile")
    vertices,faces,uv=[],[],[];frame=None
    for row,p in enumerate(points):
        tangent=points[min(row+1,len(points)-1)]-points[max(0,row-1)]
        tangent.normalize()
        if frame is None:
            frame=Vector(reference)-tangent*Vector(reference).dot(tangent)
            if frame.length_squared<1e-10:frame=tangent.cross(Vector((0,0,1)))
        else:frame=frame-tangent*frame.dot(tangent)
        frame.normalize();other=tangent.cross(frame).normalized()
        for side in range(sides):
            phi=side*math.tau/sides
            vertices.append(tuple(p+(frame*math.cos(phi)+other*(math.sin(phi)*flatness))*radii[row]))
            uv.append((side/sides,row/(len(points)-1)))
    for row in range(len(points)-1):
        for side in range(sides):
            nxt=(side+1)%sides
            faces.append((row*sides+side,row*sides+nxt,(row+1)*sides+nxt,(row+1)*sides+side))
    first,last=len(vertices),len(vertices)+1;vertices.extend((tuple(points[0]),tuple(points[-1])));uv.extend(((0.5,0),(0.5,1)))
    for side in range(sides):
        faces.append((first,(side+1)%sides,side))
        faces.append((last,(len(points)-1)*sides+side,(len(points)-1)*sides+(side+1)%sides))
    return mesh_object(name,vertices,faces,mat,joint,uv,"SIDES")


def solid_grid(name,rows,cols,sample,outward,thickness,mat,joint):
    normal=Vector(outward).normalized();vertices,faces,uv=[],[],[]
    for layer in (1,-1):
        for row in range(rows):
            for col in range(cols):
                t,w=row/(rows-1),col/(cols-1)
                vertices.append(tuple(Vector(sample(t,w))+normal*(layer*thickness/2)));uv.append((t,w))
    stride=rows*cols;a,b,c=(Vector(vertices[i]) for i in (0,cols,cols+1));reverse=(b-a).cross(c-a).dot(normal)<0
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col;face=(a,a+cols,a+cols+1,a+1)
            if reverse:face=tuple(reversed(face))
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    perimeter=list(range(cols))+[row*cols+cols-1 for row in range(1,rows)]
    perimeter+=list(range(stride-2,stride-cols-1,-1))+[row*cols for row in range(rows-2,0,-1)]
    rim_start=len(faces)
    for index,a in enumerate(perimeter):
        b=perimeter[(index+1)%len(perimeter)];face=(a,b,b+stride,a+stride)
        faces.append(tuple(reversed(face)) if reverse else face)
    obj=mesh_object(name,vertices,faces,mat,joint,uv,True)
    for polygon in obj.data.polygons:
        if polygon.index>=rim_start:polygon.use_smooth=False
    return obj


def panel(name,center,size,mat,joint,roundness=0.55):
    # A true rounded solid, not a cube or a plane disguised by a normal texture.
    return ellipsoid(name,center,tuple(value/2 for value in size),mat,joint,10,20,roundness)


def curve_points(a,b,c,count=13):
    a,b,c=Vector(a),Vector(b),Vector(c)
    return [a*(1-t)**2+b*(2*t*(1-t))+c*t*t for t in (index/(count-1) for index in range(count))]


def build_body():
    joint="Explorer_body"
    loft("Soft_Collared_Shirt",((0,0,0.755,0.30,0.185),(0,0,0.79,0.325,0.195),
         (0,0,0.99,0.315,0.210),(0,0,1.18,0.326,0.214),(0,0,1.29,0.336,0.210),
         (0,0,1.35,0.29,0.180),(0,0,1.405,0.19,0.133)),"Violet_Fabric",joint,36,0.84)
    ellipsoid("Rounded_Trouser_Waist",(0,0.012,0.748),(0.31,0.184,0.101),"Dark_Trouser",joint,10,28,0.8)
    loft("Visible_Neck",((0,0,1.37,0.105,0.10),(0,-0.012,1.48,0.108,0.10),(0,-0.018,1.575,0.125,0.11)),
         "Warm_Skin",joint,24)
    panel("Concealed_Shirt_Front_Placket",(0,-0.220,1.065),(0.035,0.022,0.535),"Violet_Fold",joint)
    for index,z in enumerate((0.865,0.99,1.115,1.25)):
        ellipsoid("Tiny_Shirt_Button_%d"%index,(0,-0.236,z),(0.011,0.004,0.011),"Violet_Fold",joint,6,10)
    panel("Shirt_Rounded_Chest_Pocket",(0.182,-0.222,1.171),(0.13,0.025,0.158),"Violet_Fabric",joint)
    pts=curve_points((0.125,-0.239,1.228),(0.182,-0.243,1.218),(0.239,-0.239,1.228),9)
    swept("Pocket_Fold_Seam",pts,[0.0022]*len(pts),"Violet_Fold",joint,5)
    # Soft folded left/right collar leaves, with V opening and white inner tee.
    for side in (-1,1):
        corners=[Vector((side*0.055,-0.155,1.422)),Vector((side*0.222,-0.103,1.372)),
                 Vector((side*0.169,-0.230,1.305)),Vector((side*0.017,-0.220,1.386))]
        def sample(t,w):
            p=(corners[0]*(1-w)+corners[1]*w)*(1-t)+(corners[3]*(1-w)+corners[2]*w)*t
            p.y-=0.012*math.sin(math.pi*t)*math.sin(math.pi*w)
            return p
        solid_grid("Folded_Collar_%s"%side,7,7,sample,(0,-1,0),0.012,"Violet_Fold",joint)
    panel("Small_Inner_Ivory_Tee",(0,-0.180,1.392),(0.132,0.022,0.106),"Sneaker_Ivory",joint,0.95)
    for index in range(2):
        pts=[]
        for step in range(33):
            phi=step/32*math.tau
            pts.append((0.303*math.cos(phi),0.188*math.sin(phi),0.775+index*0.015))
        # Near-complete stitched line, endpoints deliberately separated to avoid
        # coincident caps; the shirt itself is the closed load-bearing solid.
        swept("Shirt_Lower_Double_Seam_%d"%index,pts[:-1],[0.0021]*32,"Violet_Fold",joint,5)


def build_head():
    joint="Explorer_body"
    loft("Sculpted_Rounded_Head",((0,-0.004,1.505,0.09,0.083),(0,-0.019,1.535,0.18,0.145),
         (0,-0.013,1.59,0.263,0.204),(0,-0.007,1.69,0.314,0.243),
         (0,0,1.82,0.343,0.251),(0,0.008,1.94,0.331,0.232),(0,0.016,2.025,0.29,0.198),
         (0,0.018,2.075,0.19,0.133),(0,0.018,2.095,0.07,0.051)),"Warm_Skin",joint,48)
    for side in (-1,1):
        x=side*0.349
        ellipsoid("Rounded_Ear_%s"%side,(x,0.008,1.788),(0.067,0.055,0.098),"Warm_Skin",joint,12,20)
        ellipsoid("Ear_Inner_Fold_%s"%side,(x+side*0.005,-0.044,1.790),(0.035,0.013,0.058),"Skin_Shade",joint,10,16)
        pts=curve_points((x-side*0.011,-0.056,1.83),(x+side*0.026,-0.062,1.81),(x+side*0.013,-0.057,1.759),11)
        swept("Ear_Soft_Cartilage_Ridge_%s"%side,pts,[0.009]*len(pts),"Warm_Skin",joint,6)
        ex=side*0.138
        ellipsoid("Eye_White_%s"%side,(ex,-0.245,1.848),(0.076,0.037,0.092),"Eye_Ivory",joint,14,24)
        ellipsoid("Eye_Brown_Iris_%s"%side,(ex,-0.279,1.849),(0.045,0.013,0.061),"Iris_Brown",joint,12,20)
        ellipsoid("Eye_Dark_Pupil_%s"%side,(ex,-0.291,1.850),(0.029,0.007,0.044),"Pupil_Dark",joint,10,20)
        ellipsoid("Eye_Large_Catchlight_%s"%side,(ex-0.012,-0.299,1.869),(0.014,0.004,0.015),"Eye_Glint",joint,8,12)
        ellipsoid("Eye_Small_Catchlight_%s"%side,(ex+0.011,-0.299,1.833),(0.005,0.0025,0.006),"Eye_Glint",joint,6,10)
        pts=[(ex+0.076*math.cos(math.pi*step/14),-0.251-0.011*math.sin(math.pi*step/14),1.848+0.091*math.sin(math.pi*step/14)) for step in range(15)]
        swept("Eye_Upper_Soft_Lid_%s"%side,pts,[0.006]*len(pts),"Dark_Hair",joint,6)
        pts=curve_points((ex-side*0.067,-0.236,1.958),(ex,-0.252,1.985),(ex+side*0.069,-0.235,1.961),13)
        swept("Expressive_Brow_%s"%side,pts,[0.016+0.003*math.sin(step/12*math.pi) for step in range(13)],"Dark_Hair",joint,8,0.45)
        ellipsoid("Warm_Cheek_%s"%side,(side*0.219,-0.205,1.712),(0.062,0.025,0.041),"Soft_Cheek",joint,10,20)
    ellipsoid("Rounded_Nose",(0,-0.283,1.767),(0.044,0.050,0.037),"Warm_Skin",joint,12,24)
    for side in (-1,1):
        ellipsoid("Nostril_Shadow_%s"%side,(side*0.021,-0.315,1.753),(0.010,0.009,0.0055),"Skin_Shade",joint,6,10)
    pts=[(-0.077+0.154*step/16,-0.244+0.010*(abs(-0.077+0.154*step/16)/0.077)**2,
          1.671+0.014*((-0.077+0.154*step/16)/0.077)**2) for step in range(17)]
    swept("Gentle_Physical_Smile",pts,[0.0030]*len(pts),"Smile_Warm",joint,6)
    for side in (-1,1):
        ellipsoid("Smile_Corner_%s"%side,(side*0.077,-0.234,1.685),(0.005,0.004,0.005),"Smile_Warm",joint,6,10)


def build_hair():
    joint="Explorer_body";rows,cols=15,48
    # Scalp wraps the back and temples, never paints over the face/eyes.
    vertices,faces,uv=[],[],[]
    for layer in (0,1):
        for row in range(rows):
            t=row/(rows-1)
            for col in range(cols):
                phi=col*math.tau/cols
                front=(1-math.sin(phi))/2
                theta_max=2.83-1.53*front**3
                theta=0.045+(theta_max-0.045)*t
                radius_x=0.352-layer*0.017;radius_y=0.267-layer*0.017;radius_z=0.247-layer*0.018
                vertices.append((radius_x*math.sin(theta)*math.cos(phi),0.043+radius_y*math.sin(theta)*math.sin(phi),
                                 1.945+radius_z*math.cos(theta)))
                uv.append((col/cols,t))
    stride=rows*cols
    for row in range(rows-1):
        for col in range(cols):
            nxt=(col+1)%cols;a=row*cols+col
            face=(a,(row+1)*cols+col,(row+1)*cols+nxt,row*cols+nxt)
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    for col in range(cols):
        nxt=(col+1)%cols
        faces.append((col,nxt,nxt+stride,col+stride))
        a=(rows-1)*cols+col;b=(rows-1)*cols+nxt
        faces.append((b,a,a+stride,b+stride))
    mesh_object("Wrapped_Sculpted_Hair_Scalp",vertices,faces,"Dark_Hair",joint,uv,True)
    for index,(a,b,c) in enumerate((
        ((-0.26,-0.172,2.04),(-0.236,-0.231,2.015),(-0.130,-0.245,1.985)),
        ((-0.12,-0.192,2.056),(-0.106,-0.253,2.009),(0.009,-0.251,1.986)),
        ((0.030,-0.190,2.059),(0.131,-0.247,2.026),(0.117,-0.247,1.997)),
        ((0.219,-0.154,2.038),(0.298,-0.188,2.004),(0.257,-0.209,1.982)),
    )):
        points=curve_points(a,b,c,13)
        radii=[0.027+0.019*math.sin(step/12*math.pi) if step<12 else 0.009 for step in range(13)]
        swept("Soft_Swept_Fringe_Lock_%d"%index,points,radii,"Dark_Hair",joint,12,0.45)
    # Slight shaped locks on the back, visible in the genuine rear view.
    for index,phi in enumerate((0.35,0.77,1.17,1.58,1.99,2.39,2.80)):
        a=(0.326*math.cos(phi),0.043+0.238*math.sin(phi),1.946)
        b=(0.297*math.cos(phi),0.054+0.247*math.sin(phi),1.803)
        c=(0.232*math.cos(phi),0.044+0.214*math.sin(phi),1.735+0.013*math.cos(index))
        points=curve_points(a,b,c,11)
        swept("Back_Hair_Lock_%d"%index,points,[0.035-0.028*(step/10)**1.8 for step in range(11)],
              "Hair_Accent" if index%3==0 else "Dark_Hair",joint,10,0.49)


def build_cap():
    joint="Explorer_body";rows,sides=12,48
    # Real closed domed cloth crown, unique inner/outer apex and finished rim.
    vertices,faces,uv=[],[],[]
    for layer in (0,1):
        vertices.append((0,0.012,2.22-layer*0.018));uv.append((0.5,1))
        for row in range(1,rows+1):
            theta=row/rows*math.pi/2
            for side in range(sides):
                phi=side*math.tau/sides
                vertices.append(((0.385-layer*0.018)*math.sin(theta)*math.cos(phi),
                                 0.012+(0.304-layer*0.018)*math.sin(theta)*math.sin(phi),
                                 2.035+(0.185-layer*0.018)*math.cos(theta)))
                uv.append((side/sides,1-row/rows))
    stride=1+rows*sides
    for side in range(sides):
        nxt=(side+1)%sides
        faces.extend(((0,1+side,1+nxt),(stride,stride+1+nxt,stride+1+side)))
    for row in range(rows-1):
        for side in range(sides):
            nxt=(side+1)%sides;a=1+row*sides+side;b=1+(row+1)*sides+side
            face=(a,b,1+(row+1)*sides+nxt,1+row*sides+nxt)
            faces.extend((face,tuple(index+stride for index in reversed(face))))
    for side in range(sides):
        a=1+(rows-1)*sides+side;b=1+(rows-1)*sides+(side+1)%sides
        faces.append((b,a,a+stride,b+stride))
    mesh_object("Cap_Closed_Soft_Paneled_Crown",vertices,faces,"Violet_Fabric",joint,uv,True)
    loft("Cap_Lower_Soft_Band",((0,0.012,2.014,0.375,0.294),(0,0.012,2.049,0.386,0.304)),
         "Violet_Fold",joint,48)
    # Curved opaque visor with a rounded elliptic outline and actual thickness.
    count=48;vertices,faces,uv=[],[],[]
    for layer in (0,1):
        for side in range(count):
            phi=side*math.tau/count;x=0.349*math.cos(phi);y=-0.263+0.176*math.sin(phi)
            z=2.015-0.024*max(0,(-y-0.17)/0.27)+0.016*(x/0.349)**2-layer*0.022
            vertices.append((x,y,z));uv.append((side/count,layer))
    top,bottom=len(vertices),len(vertices)+1
    vertices.extend(((0,-0.263,2.007),(0,-0.263,1.985)));uv.extend(((0.5,0.5),(0.5,0.5)))
    for side in range(count):
        nxt=(side+1)%count
        faces.extend(((top,side,nxt),(bottom,count+nxt,count+side),(side,count+side,count+nxt,nxt)))
    mesh_object("Cap_Thick_Curved_Visor",vertices,faces,"Violet_Fabric",joint,uv,True)
    ellipsoid("Cap_Apex_Cloth_Button",(0,0.012,2.224),(0.021,0.021,0.015),"Violet_Fold",joint,8,16)
    for index in range(6):
        phi=index*math.tau/6
        pts=[]
        for step in range(14):
            theta=0.07+(math.pi/2-0.07)*step/13
            pts.append((0.387*math.sin(theta)*math.cos(phi),0.012+0.306*math.sin(theta)*math.sin(phi),2.035+0.187*math.cos(theta)))
        swept("Cap_Panel_Seam_%d"%index,pts,[0.0023]*len(pts),"Violet_Fold",joint,5)
    for index in range(2):
        pts=[]
        for step in range(29):
            phi=math.pi+math.pi*step/28
            x=(0.334-index*0.011)*math.cos(phi);y=-0.263+(0.164-index*0.007)*math.sin(phi)
            z=2.018-0.024*max(0,(-y-0.17)/0.27)+0.016*(x/0.349)**2
            pts.append((x,y,z))
        swept("Cap_Visor_Stitch_%d"%index,pts,[0.0015]*len(pts),"Violet_Fold",joint,5)


def build_backpack():
    joint="Explorer_body"
    ellipsoid("Amber_Rounded_Backpack_Main",(0,0.312,1.087),(0.262,0.151,0.302),"Amber_Canvas",joint,16,32,0.53)
    panel("Backpack_Padded_Rear_Flap",(0,0.451,1.212),(0.471,0.093,0.257),"Amber_Canvas",joint,0.58)
    panel("Backpack_Lower_Utility_Pocket",(0,0.465,0.963),(0.368,0.061,0.221),"Amber_Canvas",joint,0.52)
    for side in (-1,1):
        panel("Backpack_Side_Pocket_%s"%side,(side*0.263,0.318,0.987),(0.082,0.205,0.226),"Amber_Trim",joint,0.55)
        # Wide, flattened, curved shoulder straps. Points are body-local; they
        # wrap the shoulder and remain with the torso during its runtime bob.
        pts=curve_points((side*0.221,0.305,1.35),(side*0.321,0.111,1.526),(side*0.267,-0.188,1.349),17)
        swept("Backpack_Over_Shoulder_Strap_%s"%side,pts,[0.037]*len(pts),"Amber_Canvas",joint,10,0.31)
        pts=curve_points((side*0.267,-0.188,1.349),(side*0.283,-0.238,1.095),(side*0.232,-0.178,0.877),17)
        swept("Backpack_Front_Chest_Strap_%s"%side,pts,[0.033]*len(pts),"Amber_Canvas",joint,10,0.30)
        pts=curve_points((side*0.23,-0.172,0.878),(side*0.323,0.056,0.842),(side*0.244,0.261,0.922),13)
        swept("Backpack_Lower_Return_Strap_%s"%side,pts,[0.024]*len(pts),"Amber_Trim",joint,8,0.27)
        panel("Backpack_Front_Adjuster_%s"%side,(side*0.274,-0.232,1.127),(0.070,0.028,0.097),"Graphite_Buckle",joint,0.43)
        panel("Backpack_Adjuster_Amber_Webbing_%s"%side,(side*0.274,-0.249,1.126),(0.049,0.008,0.055),"Amber_Trim",joint,0.62)
    pts=curve_points((-0.074,0.329,1.371),(0,0.334,1.545),(0.074,0.329,1.371),17)
    swept("Backpack_True_Carry_Handle",pts,[0.016]*len(pts),"Amber_Trim",joint,8,0.68)
    panel("Backpack_Central_Flap_Strap",(0,0.505,1.051),(0.059,0.018,0.154),"Amber_Trim",joint)
    panel("Backpack_Rear_Clip",(0,0.519,1.103),(0.074,0.031,0.079),"Graphite_Buckle",joint,0.48)
    for index in range(2):
        pts=[]
        for step in range(33):
            phi=math.tau*step/32
            pts.append(((0.222-index*0.008)*spow(math.cos(phi),0.62),0.500+index*0.002,
                        1.212+(0.111-index*0.009)*spow(math.sin(phi),0.62)))
        swept("Backpack_Flap_Stitched_Piping_%d"%index,pts[:-1],[0.0030]*32,"Amber_Trim",joint,5)
    pts=curve_points((-0.220,0.438,1.386),(0,0.466,1.420),(0.220,0.438,1.386),21)
    swept("Backpack_Main_Zipper_Welt",pts,[0.004]*len(pts),"Amber_Trim",joint,6)
    panel("Backpack_Zipper_Pull",(0.171,0.457,1.392),(0.020,0.013,0.052),"Graphite_Buckle",joint)


def build_arm(side,joint):
    # Everything is authored local to the shoulder pivot; no absolute torso
    # height is baked into the limb or counter-rotation hidden in the object.
    points=curve_points((0,0,0.017),(side*0.041,0,-0.111),(side*0.075,-0.006,-0.234),11)
    swept("Sleeve_%s"%joint,points,[0.135-0.026*step/10 for step in range(11)],"Violet_Fabric",joint,24,0.98)
    points=curve_points((side*0.062,-0.003,-0.198),(side*0.081,-0.005,-0.232),(side*0.089,-0.007,-0.258),5)
    swept("Soft_Folded_Sleeve_Cuff_%s"%joint,points,[0.112]*len(points),"Violet_Fold",joint,24,0.96)
    points=curve_points((side*0.081,-0.006,-0.233),(side*0.109,-0.022,-0.374),(side*0.127,-0.041,-0.49),13)
    swept("Rounded_Forearm_%s"%joint,points,[0.075-0.018*step/12 for step in range(13)],"Warm_Skin",joint,20,0.92)
    ellipsoid("Soft_Palm_%s"%joint,(side*0.131,-0.043,-0.555),(0.073,0.057,0.096),"Warm_Skin",joint,12,20,0.82)
    for finger in range(4):
        dx=-0.043+finger*0.029
        tall=(0.087,0.102,0.100,0.082)[finger]
        points=curve_points((side*0.131+dx,-0.054,-0.592),(side*0.134+dx,-0.058,-0.622-tall*0.20),
                            (side*0.133+dx,-0.045,-0.592-tall),9)
        swept("Rounded_Finger_%s_%d"%(joint,finger),points,[0.0155-0.0050*step/8 for step in range(9)],"Warm_Skin",joint,10,0.90)
        ellipsoid("Finger_Tip_%s_%d"%(joint,finger),points[-1],(0.011,0.010,0.012),"Warm_Skin",joint,6,10)
    points=curve_points((side*0.077,-0.055,-0.536),(side*0.070,-0.078,-0.575),(side*0.075,-0.064,-0.607),9)
    swept("Opposed_Soft_Thumb_%s"%joint,points,[0.022-0.007*step/8 for step in range(9)],"Warm_Skin",joint,12,0.91)
    ellipsoid("Thumb_Tip_%s"%joint,points[-1],(0.016,0.014,0.018),"Warm_Skin",joint,8,12)


def build_leg(side,joint):
    # Sole bottom -.73 plus joint elevation .73 is exactly the root foot plane.
    loft("Rounded_Cargo_Trouser_%s"%joint,((0,0.009,-0.548,0.128,0.135),(0,0.008,-0.47,0.131,0.137),
         (0,-0.006,-0.315,0.142,0.143),(0,0.0,-0.105,0.146,0.146),(0,0.009,0.041,0.150,0.15)),
         "Dark_Trouser",joint,28,0.82)
    loft("Folded_Trouser_Cuff_%s"%joint,((0,0.009,-0.584,0.135,0.145),(0,0.009,-0.541,0.140,0.150),
         (0,0.009,-0.501,0.134,0.143)),"Dark_Trouser",joint,28,0.72)
    panel("Cargo_Side_Pocket_%s"%joint,(side*0.135,0.0,-0.204),(0.033,0.172,0.218),"Dark_Trouser",joint,0.56)
    panel("Cargo_Side_Pocket_Flap_%s"%joint,(side*0.155,-0.005,-0.104),(0.037,0.177,0.064),"Dark_Trouser",joint,0.60)
    for index,phi in enumerate((-math.pi/2,math.pi/2)):
        pts=curve_points((0.014*side,0.149*math.sin(phi),0.018),(0.020*side,0.146*math.sin(phi),-0.234),
                         (0.013*side,0.138*math.sin(phi),-0.521),11)
        swept("Trouser_Long_Seam_%s_%d"%(joint,index),pts,[0.002]*len(pts),"Graphite_Buckle",joint,5)
    loft("Flat_Rubber_Outsole_%s"%joint,((0,-0.064,-0.73,0.169,0.261),(0,-0.064,-0.707,0.178,0.275),
         (0,-0.064,-0.681,0.179,0.276)),"Rubber_Sole",joint,40,0.72)
    loft("Chunky_Ivory_Midsole_%s"%joint,((0,-0.064,-0.681,0.179,0.276),(0,-0.064,-0.625,0.177,0.274),
         (0,-0.064,-0.606,0.166,0.255)),"Sneaker_Ivory",joint,40,0.71)
    ellipsoid("Rounded_Sneaker_Upper_%s"%joint,(0,-0.054,-0.568),(0.165,0.257,0.131),"Sneaker_Ivory",joint,14,32,0.68)
    ellipsoid("Rounded_Sneaker_Toe_Cap_%s"%joint,(0,-0.207,-0.601),(0.166,0.129,0.069),"Sneaker_Panel",joint,12,28,0.72)
    panel("Sneaker_Padded_Tongue_%s"%joint,(0,-0.061,-0.431),(0.174,0.194,0.066),"Sneaker_Ivory",joint,0.71)
    for index in range(4):
        yy=-0.153+index*0.043;zz=-0.486+index*0.019
        pts=curve_points((-0.077,yy,zz),(0,yy-0.012,zz+0.028),(0.077,yy,zz),9)
        swept("Raised_Sneaker_Lace_%s_%d"%(joint,index),pts,[0.0072]*len(pts),"Sneaker_Ivory",joint,8,0.69)
        for end in (-1,1):
            ellipsoid("Lace_Eyelet_%s_%d_%s"%(joint,index,end),(end*0.078,yy,zz-0.003),(0.015,0.012,0.005),
                      "Sneaker_Panel",joint,6,10)
    for side_ in (-1,1):
        pts=curve_points((side_*0.168,-0.188,-0.564),(side_*0.174,-0.033,-0.560),(side_*0.142,0.142,-0.527),15)
        swept("Sneaker_Lateral_Panel_Seam_%s_%s"%(joint,side_),pts,[0.003]*len(pts),"Sneaker_Panel",joint,6)
    panel("Sneaker_Heel_Padded_Tab_%s"%joint,(0,0.174,-0.497),(0.11,0.034,0.100),"Sneaker_Panel",joint)
    for index in range(5):
        # Small side grooves above the sole plane, never negative-height tread.
        pts=[(-0.11+index*0.055,-0.331,-0.706),(-0.11+index*0.055,-0.338,-0.681)]
        swept("Toe_Sole_Groove_%s_%d"%(joint,index),pts,[0.0023]*2,"Rubber_Sole",joint,5)


def batch_within_joint(joint_name):
    """Keep pivots and per-loop UV/smoothing; concatenate only disconnected
    local parts sharing one material inside ONE joint. No scene/global bake.
    The resulting mesh remains editable; source part names are retained as extras.
    """
    joint=GROUPS[joint_name]
    source=[obj for obj in list(joint.children) if obj.type=="MESH"]
    buckets={}
    for obj in source:
        if len(obj.data.materials)!=1:raise RuntimeError("One material per authored part is required")
        mat=obj.data.materials[0];buckets.setdefault(mat.name,[]).append(obj)
    depsgraph=bpy.context.evaluated_depsgraph_get()
    for material_name,objects in buckets.items():
        vertices,faces,uvs,smooth_flags,semantics=[],[],[],[],[]
        for obj in objects:
            evaluated=obj.evaluated_get(depsgraph);data=evaluated.to_mesh()
            try:
                offset=len(vertices);basis=obj.matrix_basis
                vertices.extend(tuple(basis@vertex.co) for vertex in data.vertices)
                layer=data.uv_layers.active
                if layer is None:raise RuntimeError("Missing portable UVs in "+obj.name)
                for polygon in data.polygons:
                    faces.append(tuple(offset+index for index in polygon.vertices))
                    smooth_flags.append(polygon.use_smooth)
                    uvs.extend(tuple(layer.data[index].uv) for index in polygon.loop_indices)
                semantics.append(obj.get("part_semantic",obj.name))
            finally:evaluated.to_mesh_clear()
        data=bpy.data.meshes.new(joint_name+"_"+material_name+"_Editable_Mesh")
        data.from_pydata(vertices,[],faces);data.update();data.materials.append(bpy.data.materials[material_name])
        layer=data.uv_layers.new(name="UVMap")
        if len(layer.data)!=len(uvs):raise RuntimeError("Joint-local batching lost loop UV parity")
        for index,uv in enumerate(uvs):layer.data[index].uv=uv
        for polygon,smooth in zip(data.polygons,smooth_flags):polygon.use_smooth=smooth
        obj=bpy.data.objects.new(joint_name+"_"+material_name.replace(PREFIX+"PBR_",""),data)
        COLLECTION.objects.link(obj);obj.parent=joint
        obj["runtime_joint"]=joint_name;obj["source_part_names"]=semantics
        obj["batch_policy"]="Joint-local material concatenation only; hierarchy/pivot not flattened"
    for obj in source:bpy.data.objects.remove(obj,do_unlink=True)
    for data in list(bpy.data.meshes):
        if data.name.startswith(PREFIX) and data.users==0:bpy.data.meshes.remove(data)
    return len(source),len(buckets)


def pose_contract():
    return {"schema":"archipelago-rigid-explorer-contract-v1","asset":"explorer-v1","root":ROOT_NAME,
            "units":"metres","heightTarget":2.24,"heightMax":2.35,"footPlane":0,
            "joints":[{"name":name,"parent":parent,"translation":[p[0],p[2],-p[1]],
                       "rotation":[0,0,0],"scale":[1,1,1]} for name,parent,p in JOINTS],
            "physics":{"change":"none","capsuleRadius":0.32,"capsuleHalfHeight":0.7,"controllerOffset":0.025,"capsuleCentreAboveFoot":1.045},
            "animation":"Rigid local-X glTF swing; arms inherit body bob, legs remain root children. No skin/armature/clips.",
            "factualBoundary":"Original illustrative explorer, not a scanned identity or automatic reconstruction"}


def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def setup_preview(scene):
    scene.render.engine="BLENDER_EEVEE";scene.render.resolution_x,scene.render.resolution_y=800,650
    scene.render.resolution_percentage=100;scene.render.image_settings.media_type="IMAGE"
    scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=False;scene.view_settings.view_transform="Khronos PBR Neutral"
    scene.view_settings.exposure=0
    world=bpy.data.worlds.new(PREFIX+"Preview_Environment");world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(0.90,0.94,1,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=0.85;scene.world=world
    camera_data=bpy.data.cameras.new(PREFIX+"Preview_Camera");camera_data.type="ORTHO";camera_data.ortho_scale=3.35
    camera=bpy.data.objects.new(PREFIX+"Preview_Camera",camera_data);scene.collection.objects.link(camera)
    camera.location=(3.5,-7.5,3.05);aim(camera,(0,0,1.13));scene.camera=camera
    for name,kind,position,energy,color in (
        ("Warm_Key","AREA",(-3,-4,5),480,(1,0.88,0.74)),
        ("Soft_Front_Fill","AREA",(3,-4,2.4),210,(0.83,0.92,1)),
        ("Back_Rim","AREA",(0,3,3.8),380,(1,0.96,0.83))):
        data=bpy.data.lights.new(PREFIX+"Preview_"+name,kind);data.energy=energy;data.color=color;data.shape="DISK";data.size=4
        light=bpy.data.objects.new(PREFIX+"Preview_"+name,data);scene.collection.objects.link(light);light.location=position;aim(light,(0,0,1.15))


def main():
    global COLLECTION
    # Dedicated asset project only; parent validates the project/revision guards.
    for obj in list(bpy.data.objects):bpy.data.objects.remove(obj,do_unlink=True)
    for blocks in (bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.worlds):
        for data in list(blocks):
            if data.name.startswith(PREFIX) and data.users==0:blocks.remove(data)
    for previous in list(bpy.data.collections):
        if previous.name.startswith(COLLECTION_NAME) and not previous.objects and not previous.children:bpy.data.collections.remove(previous)
    COLLECTION=bpy.data.collections.new(COLLECTION_NAME);bpy.context.scene.collection.children.link(COLLECTION)
    root=bpy.data.objects.new(ROOT_NAME,None);COLLECTION.objects.link(root)
    root["asset_id"]="explorer-v1";root["units"]="metres; Blender Z-up, glTF exporter Y-up";root["foot_plane_z"]=0.0
    root["rig_type"]="Five rigid named pivots; no armature, skin or authored animation"
    root["reference_status"]="Original illustrative avatar, not scanned or automatic image reconstruction"
    for name,parent,position in JOINTS:
        group=bpy.data.objects.new(name,None);COLLECTION.objects.link(group)
        group.parent=root if parent==ROOT_NAME else GROUPS[parent];group.location=position
        group["runtime_joint"]=name;group["pivot_contract"]="All child mesh coordinates local to this joint; rigid articulation only"
        GROUPS[name]=group
    make_materials();build_body();build_head();build_hair();build_cap();build_backpack()
    build_arm(-1,"Explorer_arm_L");build_arm(1,"Explorer_arm_R")
    build_leg(-1,"Explorer_leg_L");build_leg(1,"Explorer_leg_R")
    bpy.context.view_layer.update()
    batch_counts={name:batch_within_joint(name) for name,parent,p in JOINTS}
    bpy.context.view_layer.update()
    meshes=[obj for obj in COLLECTION.objects if obj.type=="MESH"]
    points=[obj.matrix_world@Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not points or not all(math.isfinite(value) for point in points for value in point):raise RuntimeError("Explorer has non-finite/empty bounds")
    minimum=Vector(tuple(min(p[axis] for p in points) for axis in range(3)))
    maximum=Vector(tuple(max(p[axis] for p in points) for axis in range(3)))
    if abs(minimum.z)>1e-5 or maximum.z>HEIGHT_MAX:raise RuntimeError("Explorer foot/height contract: minZ=%.7f maxZ=%.7f"%(minimum.z,maximum.z))
    triangles=vertices=0
    for obj in meshes:
        data=obj.data;data.calc_loop_triangles();triangles+=len(data.loop_triangles);vertices+=len(data.vertices)
        if not all(math.isfinite(value) for vertex in data.vertices for value in vertex.co):raise RuntimeError("Non-finite joint-local position")
        if not all(math.isfinite(value) for layer in data.uv_layers for loop in layer.data for value in loop.uv):raise RuntimeError("Non-finite joint-local UV")
    if triangles>TRIANGLE_MAX or len(meshes)>MESH_MAX or len(TEXTURES)>IMAGE_MAX:
        raise RuntimeError("Explorer budget: triangles=%d/%d; meshes=%d/%d; images=%d/%d"%(triangles,TRIANGLE_MAX,len(meshes),MESH_MAX,len(TEXTURES),IMAGE_MAX))
    if any(not image.packed_file or max(image.size)>512 for image in TEXTURES):raise RuntimeError("Explorer PBR images must be portable packed sources at most512px")
    for name,parent,p in JOINTS:
        actual=GROUPS[name]
        if actual.parent.name!=parent or max(abs(actual.location[axis]-p[axis]) for axis in range(3))>1e-6:
            raise RuntimeError("Explorer rigid pivot hierarchy changed: "+name)
    contract=pose_contract();text_name="Explorer_V1_Rigid_Pose_Contract_JSON"
    previous=bpy.data.texts.get(text_name)
    if previous is not None:bpy.data.texts.remove(previous)
    text=bpy.data.texts.new(text_name);text.write(json.dumps(contract,indent=2))
    scene=bpy.context.scene;scene.unit_settings.system="METRIC";scene.unit_settings.scale_length=1.0
    setup_preview(scene)
    output=artifacts.file(name=PREVIEW_NAME,media_type="image/png");scene.render.filepath=str(output.path)
    bpy.ops.render.render(write_still=True);output.publish()
    return {"asset":"explorer-v1","root":ROOT_NAME,"blender_version":bpy.app.version_string,"triangles":triangles,"vertices":vertices,
            "mesh_objects":len(meshes),"joint_batch_counts":{name:{"source_parts":count[0],"runtime_meshes":count[1]} for name,count in batch_counts.items()},
            "materials":len(MATERIALS),"packed_pbr_images":[image.name for image in TEXTURES],
            "packed_image_dimensions":{image.name:list(image.size) for image in TEXTURES},
            "bounds_min_blender":[round(v,6) for v in minimum],"bounds_max_blender":[round(v,6) for v in maximum],
            "dimensions_m":[round(v,6) for v in maximum-minimum],"foot_plane_z":0,"joint_contract":contract,
            "glb_byte_limit_to_verify_after_export":8388608,"preview":PREVIEW_NAME,"contract_text":text_name,
            "acceptance":"True rigid articulated original mesh; exported pivots/PBR, runtime gait, art fidelity and performance remain to verify"}


result=main()

