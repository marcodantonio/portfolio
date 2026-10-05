"""Revision2: correct only the soft arrival net height, keep all solid hulls.
Run against the settled revision1 dedicated Higgsfield project.
"""
import bpy

raised = []
for obj in bpy.data.objects:
    if obj.type == "MESH" and obj.name.startswith(("SuspendedLab_Arrival_Soft_Catch_Net_", "SuspendedLab_Arrival_Net_Bound_Edge_")):
        # These tubes store their authored world coordinates in mesh vertices.
        # Raising the object is editable and leaves station/solid pivots intact.
        obj.location.z += .09
        raised.append(obj.name)
if len(raised) != 26:
    raise RuntimeError("Unexpected catch net geometry: %d" % len(raised))
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 520
scene.render.resolution_percentage = 100
scene.render.image_settings.media_type = "IMAGE"
scene.render.image_settings.file_format = "PNG"
output = artifacts.file(name="suspended-lab-v1-r2-eevee.png", media_type="image/png")
scene.render.filepath = str(output.path)
bpy.ops.render.render(write_still=True)
output.publish()
result = {"softNetMeshCount": len(raised), "localBlenderZLift": .09,
          "solidHullsChanged": False, "geometryCountChanged": False,
          "note": "Rectangular soft net now above the original terrain; isolated preview intentionally omits game rock."}
