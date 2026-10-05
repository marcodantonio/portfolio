"""Read-only Higgsfield query: three true axes and a detailed upper-deck view.
Temporary camera edits are discarded by query_python; no geometry is hidden.
"""
import bpy
from mathutils import Vector

scene = bpy.context.scene
camera = scene.camera
camera.data.type = "ORTHO"
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.media_type = "IMAGE"
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
views = (
    ("front", (0, -50, -5.4), (0, 0, -5.4), 34),
    ("right", (50, 0, -5.4), (0, 0, -5.4), 34),
    ("top", (0, 0, 50), (0, 0, 0), 29),
    ("deck-detail", (19, -29, 17), (0, 0, 2), 26),
)
for name, position, target, scale in views:
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = scale
    output = artifacts.file(name="suspended-lab-v1-" + name + ".png", media_type="image/png")
    scene.render.filepath = str(output.path)
    bpy.ops.render.render(write_still=True)
    output.publish()
result = {"views": [view[0] for view in views], "geometryHidden": False,
          "note": "True orthographic axes of the original model. No runtime rock included; lower service cables and thrusters are intentionally separated in this asset."}
