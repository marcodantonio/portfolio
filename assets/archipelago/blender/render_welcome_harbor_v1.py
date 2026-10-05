"""Read-only settled-scene preview recipe; no geometry or GLB revision.
Used through Higgsfield query_python at Welcome Harbor committed revision 2.
"""
import bpy
from mathutils import Vector
scene=bpy.context.scene
camera=scene.camera
target=Vector((0,0,2.6))
camera.location=target+Vector((12,-8,7.5))
camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.ortho_scale=12.2
scene.render.resolution_x,scene.render.resolution_y=640,500
scene.render.resolution_percentage=100
scene.render.image_settings.media_type="IMAGE"
scene.render.image_settings.file_format="PNG"
output=artifacts.file(name="welcome-harbor-v1-r2-full-preview.png",media_type="image/png")
scene.render.filepath=str(output.path)
bpy.ops.render.render(write_still=True)
output.publish()
result={"preview":"welcome-harbor-v1-r2-full-preview.png","geometry_mutation":False,"width":640,"height":500}

