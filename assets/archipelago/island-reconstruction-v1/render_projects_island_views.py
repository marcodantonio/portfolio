"""Query-only previews from the actual settled island mesh; no committed water.

Front/right/top use strict orthographic camera axes; hero adds a temporary
sea-level plane solely to expose excessive elevation or unsupported rock.
"""
import bpy
import math
from mathutils import Vector

def C(p):return (p[0],-p[2],p[1])
scene=bpy.context.scene
root=bpy.data.objects.get("ProjectsIsland_V1_Origin_At_Sea_Level")
assert root and root.get("asset_id")=="projects-island-terrain-v1"
camera=scene.camera;assert camera and camera.get("preview_only")
scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_percentage=100
scene.render.image_settings.media_type="IMAGE"
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=True
views=[("front",(0,2,100),(0,2,0),79,960,540),
       ("right",(100,2,0),(0,2,0),75,960,540),
       ("top",(0,100,0),(0,0,0),78,800,800),
       ("hero",(52,34,75),(0,3,0),78,960,720)]
water=None;rendered=[]
for name,position,target,scale,width,height in views:
    camera.data.type="ORTHO";camera.data.ortho_scale=scale
    camera.location=C(position)
    camera.rotation_euler=(Vector(C(target))-camera.location).to_track_quat("-Z","Y").to_euler()
    if name=="top":camera.rotation_euler=(0,0,0)
    scene.render.resolution_x=width;scene.render.resolution_y=height
    if name=="hero":
        scene.render.film_transparent=False
        mesh=bpy.data.meshes.new("QUERY_ONLY_SEA_LEVEL_MESH")
        mesh.from_pydata([(-110,-110,0),(110,-110,0),(110,110,0),(-110,110,0)],[],[(0,1,2,3)])
        water=bpy.data.objects.new("QUERY_ONLY_WATER_NOT_AN_ASSET",mesh)
        scene.collection.objects.link(water)
        material=bpy.data.materials.new("QUERY_ONLY_WATER_MATERIAL");material.use_nodes=True
        shader=material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value=(.035,.34,.43,1)
        shader.inputs["Roughness"].default_value=.32
        shader.inputs["Metallic"].default_value=.18
        mesh.materials.append(material)
    output=artifacts.file(name="projects-island-r2-"+name+".png",media_type="image/png")
    scene.render.filepath=str(output.path);bpy.ops.render.render(write_still=True);output.publish()
    rendered.append({"view":name,"width":width,"height":height,"camera_gltf":position,
                     "target_gltf":target,"orthographic":True,"scale":scale,
                     "top_view_north_up":name=="top","sea_level_plane":name=="hero"})
result={"views":rendered,"geometry_committed":False,"water_exported":False,
        "projection":"Actual same mesh, not independently reinterpreted images",
        "interpretation":"Native lighting preview only; inspect actual GLB separately"}
