"""Fix actual glTF portable vertex-paint graph on the inspected island R1.

Blender's exporter did not recognize TerrainColour behind the legacy MixRGB.
Connect the named colour attribute directly; ORM and normal maps stay embedded.
This preserves every geometry/material/height/pivot and the editable base maps.
"""
import bpy
import json

root=bpy.data.objects.get("ProjectsIsland_V1_Origin_At_Sea_Level")
assert root and root.get("asset_id")=="projects-island-terrain-v1"
audit=json.loads(root["native_geometry_audit_json"])
assert audit["triangles"]==47820 and audit["meshes"]==22
changed=[]
for name in ("ProjectsIsland_Soil","ProjectsIsland_Limestone"):
    material=bpy.data.materials.get(name)
    assert material and material.use_nodes
    nodes=material.node_tree.nodes;links=material.node_tree.links
    vertex=[n for n in nodes if n.bl_idname=="ShaderNodeVertexColor" and n.layer_name=="TerrainColour"]
    assert len(vertex)==1
    bsdf=nodes.get("Principled BSDF")
    links.new(vertex[0].outputs["Color"],bsdf.inputs["Base Color"])
    for obj in bpy.data.collections["ProjectsIsland_V1_Editable_Terrain"].objects:
        if obj.type=="MESH" and material in obj.data.materials.values():
            assert obj.data.color_attributes.get("TerrainColour")
    changed.append(material.name)
root["portable_colour_graph_revision"]=2
root["glb_colour_contract"]="TerrainColour directly drives Base Color; actual COLOR_0 required on every exported primitive"
root["source_base_maps"]="Retained in editable material graph; disconnected from glTF surface; portable ORM and tangent normal remain connected"
result={"recipe":"projects-island-material-portability-r2","changed_materials":changed,
        "geometry_changed":False,"native_audit":audit,"actual_glb_colour_review_required":True,
        "automatic_image_to_3d":False,"runtime_changes":0}
