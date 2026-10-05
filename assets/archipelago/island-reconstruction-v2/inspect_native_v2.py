"""Read-only Higgsfield query. Prefix VIEW='hero'/'front'/'right'/'top'.

Camera axes refer to glTF (+Y up, +Z front). Blender is +Z up.
Only the hero may add temporary water at sea level; this is not exported art.
"""
import bpy
from mathutils import Vector

view = globals().get('VIEW', 'hero')
assert view in ('hero', 'front', 'right', 'top')
root = bpy.data.objects['ProjectsIsland_V2_Origin_At_Sea_Level']
meshes = [o for o in root.children_recursive if o.type == 'MESH']
points = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]
lo = Vector([min(p[i] for p in points) for i in range(3)])
hi = Vector([max(p[i] for p in points) for i in range(3)])
center = (lo + hi) * .5
camera_data = bpy.data.cameras.new('QueryOnly_ActualGLB_Axes')
camera = bpy.data.objects.new('QueryOnly_ActualGLB_Axes', camera_data)
bpy.context.collection.objects.link(camera)
camera_data.type = 'ORTHO'
camera_data.clip_start = .1
camera_data.clip_end = 1000
if view == 'top':
    camera.location = (center.x, center.y, 200)
    camera.rotation_euler = (0, 0, 0)
elif view in ('front', 'right'):
    direction = Vector((0, -1, 0) if view == 'front' else (1, 0, 0))
    camera.location = center + direction*200
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()
else:
    center.z = max(3, center.z)
    camera.location = center + Vector((90, -110, 88))
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()
    # Diagnostic sea datum, never a child of the model or a scene mutation.
    bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0))
    water = bpy.context.object
    water.name = 'QueryOnly_Sea_Datum_Not_Exported'
    mat = bpy.data.materials.new('QueryOnly_Sea_Datum_Not_Runtime_Water')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.022, .25, .31, 1)
    bsdf.inputs['Roughness'].default_value = .26
    bsdf.inputs['Metallic'].default_value = 0
    water.data.materials.append(mat)
# Fit actual owned geometry, not an assumed scale. Blender's ortho_scale is
# horizontal with this landscape render; vertical coverage is scale/aspect.
projected = [camera.rotation_euler.to_matrix().transposed() @ (p-center) for p in points]
span_x = max(p.x for p in projected)-min(p.x for p in projected)
span_y = max(p.y for p in projected)-min(p.y for p in projected)
camera_data.ortho_scale = max(span_x, span_y*4/3)*1.12
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 8
scene.eevee.use_raytracing = False
scene.eevee.use_fast_gi = False
scene.render.resolution_x = 480
scene.render.resolution_y = 360
scene.render.resolution_percentage = 100
scene.render.image_settings.media_type = 'IMAGE'
scene.render.image_settings.file_format = 'PNG'
target = artifacts.file(name='projects-island-v2-'+view+'.png', media_type='image/png')
scene.render.filepath = str(target.path)
bpy.ops.render.render(write_still=True)
target.publish()
result = {'view':view, 'assetMeshes':len(meshes), 'blenderBounds':[list(lo),list(hi)],
          'orthographic':True, 'diagnosticWater':view=='hero', 'sampleCount':8,
          'temporaryQueryOnly':True, 'noRuntimeWaterClaim':True}
