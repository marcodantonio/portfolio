"""Append to a reviewed, query-only R7 macro-sculpt recipe.

Four actual temporary views; no export, provider fetch or committed metadata.
The preceding recipe's `result` must contain its real source audit. Lighting and
PBR graphs are inherited unchanged. Diagnostic water exists only in the hero.
"""
import bpy
from mathutils import Vector

macro_source_audit = result
macro_root = bpy.data.objects["ProjectsIsland_V2_Origin_At_Sea_Level"]
macro_meshes = [o for o in macro_root.children_recursive if o.type == "MESH"]
assert macro_meshes and all(len(o.data.polygons) for o in macro_meshes)
macro_points = [o.matrix_world @ Vector(p) for o in macro_meshes for p in o.bound_box]
macro_lo = Vector([min(p[i] for p in macro_points) for i in range(3)])
macro_hi = Vector([max(p[i] for p in macro_points) for i in range(3)])
macro_center = (macro_lo + macro_hi) * .5
macro_scene = bpy.context.scene
macro_scene.render.engine = "BLENDER_EEVEE"
macro_scene.eevee.taa_render_samples = 16
macro_scene.eevee.use_raytracing = False
macro_scene.eevee.use_fast_gi = False
macro_scene.render.resolution_x = 640
macro_scene.render.resolution_y = 480
macro_scene.render.resolution_percentage = 100
macro_scene.render.image_settings.media_type = "IMAGE"
macro_scene.render.image_settings.file_format = "PNG"
macro_views = []

for macro_view in ("hero", "front", "right", "top"):
    macro_data = bpy.data.cameras.new("QueryOnly_Macro_" + macro_view)
    macro_camera = bpy.data.objects.new("QueryOnly_Macro_" + macro_view, macro_data)
    bpy.context.collection.objects.link(macro_camera)
    macro_data.type = "ORTHO"
    macro_data.clip_start = .1
    macro_data.clip_end = 1000
    macro_target = macro_center.copy()
    macro_water = None
    if macro_view == "top":
        macro_camera.location = (macro_target.x, macro_target.y, 200)
        macro_camera.rotation_euler = (0, 0, 0)
    elif macro_view in ("front", "right"):
        macro_direction = Vector((0, -1, 0) if macro_view == "front" else (1, 0, 0))
        macro_camera.location = macro_target + macro_direction * 200
        macro_camera.rotation_euler = (macro_target - macro_camera.location).to_track_quat("-Z", "Y").to_euler()
    else:
        macro_target.z = max(3, macro_target.z)
        macro_camera.location = macro_target + Vector((90, -110, 88))
        macro_camera.rotation_euler = (macro_target - macro_camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0))
        macro_water = bpy.context.object
        macro_water.name = "QueryOnly_Macro_Sea_Not_Exported"
        macro_material = bpy.data.materials.new("QueryOnly_Macro_Sea_Not_Runtime")
        macro_material.use_nodes = True
        macro_bsdf = macro_material.node_tree.nodes.get("Principled BSDF")
        macro_bsdf.inputs["Base Color"].default_value = (.022, .25, .31, 1)
        macro_bsdf.inputs["Roughness"].default_value = .26
        macro_bsdf.inputs["Metallic"].default_value = 0
        macro_water.data.materials.append(macro_material)
    macro_projected = [macro_camera.rotation_euler.to_matrix().transposed() @ (p - macro_target)
                       for p in macro_points]
    macro_span_x = max(p.x for p in macro_projected) - min(p.x for p in macro_projected)
    macro_span_y = max(p.y for p in macro_projected) - min(p.y for p in macro_projected)
    macro_data.ortho_scale = max(macro_span_x, macro_span_y * 4 / 3) * 1.12
    macro_scene.camera = macro_camera
    bpy.context.view_layer.update()
    macro_artifact = artifacts.file(name="projects-island-v2-macro-ridge-candidate-" + macro_view + ".png",
                                    media_type="image/png")
    macro_scene.render.filepath = str(macro_artifact.path)
    try:
        bpy.ops.render.render(write_still=True)
        macro_artifact.publish()
    finally:
        if macro_water:
            bpy.data.objects.remove(macro_water, do_unlink=True)
    macro_views.append({"view": macro_view, "width": 640, "height": 480,
                        "samples": 16, "orthographic": True,
                        "diagnosticWater": macro_view == "hero",
                        "actualOwnedMeshCount": len(macro_meshes)})
    bpy.data.objects.remove(macro_camera, do_unlink=True)

result = {"sourceAudit": macro_source_audit, "actualTemporaryViews": macro_views,
          "baseCommittedRevision": 7, "candidateNotCommitted": True,
          "queryOnly": True, "blenderBounds": [list(macro_lo), list(macro_hi)],
          "noRuntimeWaterClaim": True, "noReferenceFidelityClaim": True}
