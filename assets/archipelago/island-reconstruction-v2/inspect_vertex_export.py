"""Temporary native query: test real Blender exporter, never commit a scene."""
import bpy
import json
import struct
import tempfile
from pathlib import Path

rock = bpy.data.materials['ProjectsIsland_V2_Limestone']
earth = bpy.data.materials['ProjectsIsland_V2_HoneyEarth']
bpy.ops.object.select_all(action='DESELECT')
objects = []
for label, materials in [('TwoSlots',[rock,earth]), ('OnlyEarth',[earth]), ('OnlyRock',[rock])]:
    mesh = bpy.data.meshes.new('Query_'+label)
    mesh.from_pydata([(0,0,0),(1,0,0),(0,1,0),(0,0,1)], [], [(0,2,1),(0,1,3),(1,2,3),(2,0,3)])
    mesh.update()
    for mat in materials:
        mesh.materials.append(mat)
    attr = mesh.color_attributes.new(name='TerrainColour',type='FLOAT_COLOR',domain='CORNER')
    mesh.color_attributes.active_color_index = 0
    for poly in mesh.polygons:
        poly.material_index = poly.index%len(materials)
        for loop in poly.loop_indices:
            attr.data[loop].color = (.30+.01*loop,.22+.003*loop,.10+.001*loop,1)
    obj = bpy.data.objects.new('Query_'+label,mesh)
    bpy.context.collection.objects.link(obj)
    obj.select_set(True)
    objects.append(obj)
reports = []
with tempfile.TemporaryDirectory(prefix='vertex-export-inspection-') as folder:
    for mode in ['MATERIAL','ACTIVE']:
        path = str(Path(folder)/('test-'+mode+'.glb'))
        bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,
            export_vertex_color=mode,export_all_vertex_colors=True,export_cameras=False,export_lights=False)
        payload = Path(path).read_bytes()
        size = struct.unpack_from('<I',payload,12)[0]
        doc = json.loads(payload[20:20+size])
        binary = payload[28+size:]
        primitives=[]
        for mesh in doc['meshes']:
            for p in mesh['primitives']:
                a = doc['accessors'][p['attributes']['COLOR_0']]
                v = doc['bufferViews'][a['bufferView']]
                component = {5121:('B',1,255),5123:('H',2,65535),5126:('f',4,1)}[a['componentType']]
                width = {'VEC3':3,'VEC4':4}[a['type']]
                start=v.get('byteOffset',0)+a.get('byteOffset',0)
                stride=v.get('byteStride',component[1]*width)
                values=[struct.unpack_from('<'+component[0]*width,binary,start+i*stride) for i in range(a['count'])]
                divisor=component[2] if a.get('normalized') else 1
                primitives.append({'mesh':mesh['name'],'material':doc['materials'][p['material']]['name'],
                    'minRGB':[min(v[j] for v in values)/divisor for j in range(3)],
                    'maxRGB':[max(v[j] for v in values)/divisor for j in range(3)]})
        reports.append({'mode':mode,'primitives':primitives})
result={'temporaryQueryOnly':True,'committed':False,'portableFilesDelivered':False,'exports':reports}
