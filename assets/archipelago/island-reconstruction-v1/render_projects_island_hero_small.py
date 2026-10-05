"""Single low-cost native Eevee inspection after the four-view query timed out.

Query only. The flat water plane is a placement diagnostic, not ocean quality.
No geometry, camera or temporary water is committed to the terrain master.
"""
import bpy
from mathutils import Vector

def C(p):
    return (p[0], -p[2], p[1])

scene = bpy.context.scene
root = bpy.data.objects.get("ProjectsIsland_V1_Origin_At_Sea_Level")
assert root and root.get("asset_id") == "projects-island-terrain-v1"
camera = scene.camera
assert camera and camera.get("preview_only")
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 8
scene.eevee.use_raytracing = False
scene.eevee.use_fast_gi = False
scene.render.resolution_percentage = 100
scene.render.resolution_x = 480
scene.render.resolution_y = 360
scene.render.image_settings.media_type = "IMAGE"
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
camera.data.type = "ORTHO"
camera.data.ortho_scale = 78
camera.location = C((52, 34, 75))
camera.rotation_euler = (Vector(C((0, 3, 0))) - camera.location).to_track_quat("-Z", "Y").to_euler()
mesh = bpy.data.meshes.new("QUERY_ONLY_SEA_LEVEL_MESH")
mesh.from_pydata([(-110, -110, 0), (110, -110, 0), (110, 110, 0), (-110, 110, 0)], [], [(0, 1, 2, 3)])
water = bpy.data.objects.new("QUERY_ONLY_WATER_NOT_AN_ASSET", mesh)
scene.collection.objects.link(water)
material = bpy.data.materials.new("QUERY_ONLY_WATER_MATERIAL")
material.use_nodes = True
shader = material.node_tree.nodes.get("Principled BSDF")
shader.inputs["Base Color"].default_value = (.035, .34, .43, 1)
shader.inputs["Roughness"].default_value = .4
shader.inputs["Metallic"].default_value = 0
mesh.materials.append(material)
output = artifacts.file(name="projects-island-r2-hero-small.png", media_type="image/png")
scene.render.filepath = str(output.path)
bpy.ops.render.render(write_still=True)
output.publish()
result = {"width": 480, "height": 360, "samples": 8,
          "projection": "orthographic hero", "sea_level_plane": True,
          "water_exported": False, "geometry_committed": False,
          "scope": "Actual native material/light diagnostic, not final art acceptance"}
