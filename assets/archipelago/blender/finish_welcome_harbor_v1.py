"""Measured contact/trim correction of settled Welcome Harbor revision 2.
Run in its Higgsfield project only; authoring recipe contains equivalent fixes.
No floor, terrain, hull, texture, content or navigation changes.
"""
import bpy
from mathutils import Vector, Matrix

PREFIX="WelcomeHarbor_"

def mesh_bounds(objects):
    bpy.context.view_layer.update()
    graph=bpy.context.evaluated_depsgraph_get(); points=[]
    for obj in objects:
        evaluated=obj.evaluated_get(graph); mesh=evaluated.to_mesh()
        try: points.extend(obj.matrix_world@v.co for v in mesh.vertices)
        finally: evaluated.to_mesh_clear()
    return [[min(p[i] for p in points) for i in range(3)],
            [max(p[i] for p in points) for i in range(3)]]

counter=[obj for obj in bpy.data.objects if obj.name.startswith(PREFIX+"Counter_Joinery_Front_")]
battens=[obj for obj in bpy.data.objects if obj.name.startswith(PREFIX+"harbor-back-wall_Batten_")]
barrel=[obj for obj in bpy.data.objects if obj.name.startswith(PREFIX+"harbor-barrel_")]
assert len(counter)==9 and len(battens)==3 and len(barrel)==50
for obj in counter: obj.location.x-=.025
for obj in battens:
    obj.location.x-=.01
    obj.scale.y*=3.3/3.4
for side in (-1,1):
    obj=bpy.data.objects[PREFIX+"harbor-crate_Diagonal_"+str(side)]
    obj.location.y-=side*.07
    bands=[o for o in bpy.data.objects if o.name.startswith(PREFIX+"harbor-crate_Band_"+str(side)+"_")]
    assert len(bands)==2
    for obj in bands: obj.location.y-=side*.015
low,_=mesh_bounds(barrel)
assert .027<low[2]<.028
for obj in barrel: obj.location.z-=low[2]

checks={"counter":mesh_bounds(counter),"rearBattens":mesh_bounds(battens),
        "crate":mesh_bounds([o for o in bpy.data.objects if o.name.startswith(PREFIX+"harbor-crate_")]),
        "barrel":mesh_bounds(barrel)}
assert checks["counter"][1][0]<=-1.15+1e-6
assert checks["rearBattens"][1][0]<=-2.57+1e-6
assert checks["rearBattens"][0][1]>=-1.65-1e-6 and checks["rearBattens"][1][1]<=1.65+1e-6
assert checks["crate"][0][1]>=.975-1e-6 and checks["crate"][1][1]<=1.625+1e-6
assert abs(checks["barrel"][0][2])<1e-6

camera=bpy.context.scene.camera
target=Vector((0,0,2.6)); camera.location=target+Vector((12,-8,7.5))
camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.ortho_scale=12.2
scene=bpy.context.scene; scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=640; scene.render.resolution_y=500
scene.render.resolution_percentage=100
scene.render.image_settings.media_type="IMAGE"; scene.render.image_settings.file_format="PNG"
image=artifacts.file(name="welcome-harbor-v1-r3-full-eevee.png",media_type="image/png")
scene.render.filepath=str(image.path); bpy.ops.render.render(write_still=True); image.publish()
result={"asset":"welcome-harbor-v1","contactChecksBlender":checks,
        "boundsBlender":mesh_bounds([o for o in bpy.data.objects if o.type=="MESH" and o.name.startswith(PREFIX)]),
        "changes":"9 counter panels -25mm X; 3 battens fit 3.3m hull; crate diagonals inset 70mm and bands 15mm; barrel grounded by evaluated minZ",
        "contractUnchanged":True,"preview":"welcome-harbor-v1-r3-full-eevee.png"}
