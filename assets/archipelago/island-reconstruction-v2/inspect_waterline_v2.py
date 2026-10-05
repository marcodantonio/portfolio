"""Temporary native query: two close views with a diagnostic sea plane.

Inspect the committed actual mesh. No scene mutation, runtime-water shader,
foam, physical support or artistic approval is implied by these previews.
glTF +Y up/+Z front; Blender coordinates are (X,-Z,Y).
"""
import bpy
from mathutils import Vector


def native(point):
    x, y, z = point
    return Vector((x, -z, y))


root = bpy.data.objects['ProjectsIsland_V2_Origin_At_Sea_Level']
meshes = [o for o in root.children_recursive if o.type == 'MESH']
assert len(meshes) == 44
bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0))
water = bpy.context.object
water.name = 'QueryOnly_Close_Sea_Datum_Not_Exported'
material = bpy.data.materials.new('QueryOnly_Close_Sea_Datum')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.022, .25, .31, 1)
bsdf.inputs['Roughness'].default_value = .26
bsdf.inputs['Metallic'].default_value = 0
water.data.materials.append(material)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 8
scene.eevee.use_raytracing = False
scene.eevee.use_fast_gi = False
scene.render.resolution_x = 480
scene.render.resolution_y = 360
scene.render.resolution_percentage = 100
scene.render.image_settings.media_type = 'IMAGE'
scene.render.image_settings.file_format = 'PNG'
views = []
for name, focus, eye, lens in (
    ('west-waterline-perspective', (-27, 2, 14), (-42, 11, 40), 40),
    ('front-waterline-perspective', (0, 2, 30), (0, 8, 75), 48),
):
    data = bpy.data.cameras.new('QueryOnly_Close_'+name)
    camera = bpy.data.objects.new('QueryOnly_Close_'+name, data)
    bpy.context.collection.objects.link(camera)
    # Every ray begins above the sea. A horizontal orthographic view can have
    # lower rays already below the finite sea plane and expose the foundation;
    # that is a datum cutaway, not evidence of a floating shoreline.
    data.type = 'PERSP'
    data.lens = lens
    data.clip_start = .1
    data.clip_end = 2000
    camera.location = native(eye)
    camera.rotation_euler = (native(focus)-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    target = artifacts.file(name='projects-island-v2-'+name+'.png', media_type='image/png')
    scene.render.filepath = str(target.path)
    bpy.ops.render.render(write_still=True)
    target.publish()
    views.append({'name': name, 'focusGltf': list(focus), 'eyeGltf': list(eye),
                  'perspectiveLensMm': lens, 'diagnosticSeaY': 0})
result = {'views': views, 'actualAssetMeshes': len(meshes), 'temporaryQueryOnly': True,
          'waterExported': False, 'samples': 8, 'noRuntimeWaterOrContactApproval': True}
