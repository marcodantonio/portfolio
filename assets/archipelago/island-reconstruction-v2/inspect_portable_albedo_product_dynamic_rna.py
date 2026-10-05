"""Ephemeral Blender query: real COLOR_0 times packed albedo PNG export.

Three UV/RGB-varied temporary triangles compare direct VertexColor, legacy
MixRGB MULTIPLY and modern RGBA Mix MULTIPLY in MATERIAL and ACTIVE exports.
Read operator RNA, including its actual dynamic enum callback, first.
Export only fixtures to a local temporary GLB, inspect its actual JSON/BIN,
then restore original selection/active object and dispose only owned fixtures.
No original geometry/material changes, provider calls, render, scene commit,
published GLB, artistic approval or actual terrain/runtime material proof.
"""
import hashlib
import json
import math
import struct
import tempfile
from pathlib import Path

import bpy


def png_info(data):
    if len(data) < 33 or data[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError("Actual texture is not bounded PNG")
    if struct.unpack_from(">I", data, 8)[0] != 13 or data[12:16] != b"IHDR":
        raise RuntimeError("PNG has no ordinary IHDR")
    width, height, depth, color_type, compression, filtering, interlace = struct.unpack_from(">IIBBBBB", data, 16)
    if width <= 0 or height <= 0 or compression or filtering:
        raise RuntimeError("Invalid PNG IHDR")
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "width": width, "height": height, "bitDepth": depth,
            "colorType": color_type, "interlace": interlace}


def color_info(doc, binary, accessor_id):
    accessor = doc["accessors"][accessor_id]
    view = doc["bufferViews"][accessor["bufferView"]]
    fmt, size, divisor = {5121: ("B", 1, 255), 5123: ("H", 2, 65535),
                          5126: ("f", 4, 1)}[accessor["componentType"]]
    width = {"VEC3": 3, "VEC4": 4}[accessor["type"]]
    stride = view.get("byteStride", width * size)
    local = accessor.get("byteOffset", 0)
    start = view.get("byteOffset", 0) + local
    count = accessor["count"]
    if count <= 0 or local + (count - 1) * stride + width * size > view["byteLength"]:
        raise RuntimeError("Actual COLOR_0 accessor range invalid")
    divisor = divisor if accessor.get("normalized", False) else 1
    values = [[value / divisor for value in struct.unpack_from("<" + fmt * width, binary, start + i * stride)]
              for i in range(count)]
    if not all(math.isfinite(value) and 0 <= value <= 1 for row in values for value in row):
        raise RuntimeError("Actual COLOR_0 nonfinite/out of range")
    lo = [min(row[c] for row in values) for c in range(3)]
    hi = [max(row[c] for row in values) for c in range(3)]
    return {"count": count, "componentType": accessor["componentType"],
            "normalized": bool(accessor.get("normalized", False)),
            "minRGB": lo, "maxRGB": hi, "varies": any(b - a > .01 for a, b in zip(lo, hi)),
            "values": values}


operator = bpy.ops.export_scene.gltf
rna = operator.get_rna_type()
properties = {prop.identifier: prop for prop in rna.properties}
enum_evidence = {}


def enum_values(name):
    """Dynamic RNA lists can be empty: resolve the registered class callback."""
    prop = properties[name]
    values = [item.identifier for item in prop.enum_items]
    source = "rna.enum_items"
    if not values:
        cls = bpy.types.Operator.bl_rna_get_subclass_py(rna.identifier)
        if cls is None:
            raise RuntimeError("No registered exporter class for dynamic enum")
        for owner in cls.__mro__:
            deferred = owner.__dict__.get("__annotations__", {}).get(name)
            items = getattr(deferred, "keywords", {}).get("items")
            if callable(items):
                actual_items = items(None, bpy.context)
                values = [item[0] for item in actual_items if item is not None]
                source = owner.__name__ + "." + getattr(items, "__name__", "items_callback")
            elif items:
                values = [item[0] for item in items if item is not None]
                source = owner.__name__ + ".items"
            if values:
                break
    if not values:
        raise RuntimeError("Actual exporter enum unresolved: " + name)
    enum_evidence[name] = {"source": source, "values": values, "rnaDefault": prop.default}
    return values


for name in ("filepath", "export_format", "export_vertex_color"):
    if name not in properties:
        raise RuntimeError("Actual exporter RNA lacks required option: " + name)
if "GLB" not in enum_values("export_format"):
    raise RuntimeError("Actual exporter callback lacks GLB format")
color_modes = enum_values("export_vertex_color")
if not all(mode in color_modes for mode in ("MATERIAL", "ACTIVE")):
    raise RuntimeError("Actual exporter lacks MATERIAL/ACTIVE vertex-colour modes")
selection_key = next((name for name in ("use_selection", "export_selected") if name in properties), None)
if selection_key is None:
    raise RuntimeError("Actual exporter RNA lacks selected-only export")
options = {"export_format": "GLB", selection_key: True}
for name, value in (("export_all_vertex_colors", True), ("export_cameras", False),
                    ("export_lights", False), ("export_animations", False)):
    if name in properties:
        options[name] = value

selected_before = list(bpy.context.selected_objects)
active_before = bpy.context.view_layer.objects.active
owned_objects, owned_meshes, owned_materials, owned_images = [], [], [], []
report = None
try:
    with tempfile.TemporaryDirectory(prefix="portable-albedo-product-query-") as folder:
        image = bpy.data.images.new("QueryAlbedoProduct_Pattern", width=16, height=16, alpha=True)
        owned_images.append(image)
        image.colorspace_settings.name = "sRGB"
        pixels = []
        for y in range(16):
            for x in range(16):
                pixels.extend((.30 + .55 * x / 15, .25 + .60 * y / 15,
                               .35 if (x // 4 + y // 4) % 2 else .75, 1.))
        image.pixels.foreach_set(pixels)
        image.filepath_raw = str(Path(folder) / "pattern.png")
        image.file_format = "PNG"
        image.save()
        image.pack()
        if image.packed_file is None:
            raise RuntimeError("Fixture PNG did not actually pack")
        source_png = png_info(bytes(image.packed_file.data))
        fixture_names = []
        graph_sources = {}
        for number, graph in enumerate(("DirectVertexColor", "MultiplyMixRGB", "MultiplyRGBA")):
            name = "QueryAlbedoProduct_" + graph
            fixture_names.append(name)
            mesh = bpy.data.meshes.new(name)
            owned_meshes.append(mesh)
            mesh.from_pydata([(number * 2., 0., 0.), (number * 2. + 1., 0., 0.),
                              (number * 2., 1., 0.)], [], [(0, 1, 2)])
            mesh.update()
            uv = mesh.uv_layers.new(name="UVMap")
            for index, value in enumerate(((0., 0.), (1., 0.), (0., 1.))):
                uv.data[index].uv = value
            color = mesh.color_attributes.new(name="FixtureColor", type="FLOAT_COLOR", domain="CORNER")
            mesh.color_attributes.active_color_index = 0
            for index, value in enumerate(((.90, .20, .30, 1.), (.10, .85, .30, 1.), (.10, .20, .95, 1.))):
                color.data[index].color = value
            material = bpy.data.materials.new(name)
            owned_materials.append(material)
            material.use_nodes = True
            nodes, links = material.node_tree.nodes, material.node_tree.links
            nodes.clear()
            shader = nodes.new("ShaderNodeBsdfPrincipled")
            shader.inputs["Metallic"].default_value = 0.
            shader.inputs["Roughness"].default_value = .75
            output = nodes.new("ShaderNodeOutputMaterial")
            links.new(shader.outputs["BSDF"], output.inputs["Surface"])
            vertex = nodes.new("ShaderNodeVertexColor")
            vertex.layer_name = "FixtureColor"
            if graph == "DirectVertexColor":
                links.new(vertex.outputs["Color"], shader.inputs["Base Color"])
            else:
                texture = nodes.new("ShaderNodeTexImage")
                texture.image = image
                texture.interpolation = "Linear"
                texture.extension = "REPEAT"
                mapping = nodes.new("ShaderNodeUVMap")
                mapping.uv_map = "UVMap"
                links.new(mapping.outputs["UV"], texture.inputs["Vector"])
                if graph == "MultiplyMixRGB":
                    product = nodes.new("ShaderNodeMixRGB")
                    product.blend_type = "MULTIPLY"
                    product.use_clamp = False
                    product.inputs["Fac"].default_value = 1.
                    a, b, out = product.inputs["Color1"], product.inputs["Color2"], product.outputs["Color"]
                else:
                    product = nodes.new("ShaderNodeMix")
                    product.data_type = "RGBA"
                    product.blend_type = "MULTIPLY"
                    product.clamp_factor = False
                    product.clamp_result = False
                    factor = next(socket for socket in product.inputs if socket.name == "Factor" and socket.type == "VALUE")
                    factor.default_value = 1.
                    a = next(socket for socket in product.inputs if socket.name == "A" and socket.type == "RGBA")
                    b = next(socket for socket in product.inputs if socket.name == "B" and socket.type == "RGBA")
                    out = next(socket for socket in product.outputs if socket.type == "RGBA")
                links.new(vertex.outputs["Color"], a)
                links.new(texture.outputs["Color"], b)
                links.new(out, shader.inputs["Base Color"])
            graph_sources[name] = {"graph": graph, "singlePBRSlot": True,
                                   "vertexColorLayer": "FixtureColor", "sourceImagePNG": graph != "DirectVertexColor"}
            mesh.materials.append(material)
            obj = bpy.data.objects.new(name, mesh)
            owned_objects.append(obj)
            bpy.context.collection.objects.link(obj)
        for obj in bpy.context.selected_objects:
            obj.select_set(False)
        for obj in owned_objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = owned_objects[0]
        exports = []
        for mode in ("MATERIAL", "ACTIVE"):
            options["export_vertex_color"] = mode
            path = Path(folder) / ("query-fixtures-" + mode.lower() + ".glb")
            operator(filepath=str(path), **options)
            payload = path.read_bytes()
            if struct.unpack_from("<III", payload, 0) != (0x46546C67, 2, len(payload)):
                raise RuntimeError("Actual fixture GLB header invalid")
            size, kind = struct.unpack_from("<II", payload, 12)
            if kind != 0x4E4F534A:
                raise RuntimeError("Actual fixture GLB JSON chunk missing")
            doc = json.loads(payload[20:20 + size])
            length, kind = struct.unpack_from("<II", payload, 20 + size)
            binary = payload[28 + size:]
            if kind != 0x004E4942 or length != len(binary):
                raise RuntimeError("Actual fixture GLB BIN chunk invalid")
            if sorted(mesh["name"] for mesh in doc["meshes"]) != sorted(fixture_names):
                raise RuntimeError("Export escaped temporary fixture ownership")
            primitives = []
            for mesh in doc["meshes"]:
                for primitive in mesh["primitives"]:
                    material = doc["materials"][primitive["material"]]
                    texture_ref = material.get("pbrMetallicRoughness", {}).get("baseColorTexture")
                    color_ref = primitive["attributes"].get("COLOR_0")
                    png = None
                    if texture_ref is not None:
                        texture = doc["textures"][texture_ref["index"]]
                        exported_image = doc["images"][texture["source"]]
                        if exported_image.get("uri") or exported_image.get("mimeType") != "image/png":
                            raise RuntimeError("Base-colour fixture texture not embedded PNG")
                        view = doc["bufferViews"][exported_image["bufferView"]]
                        offset = view.get("byteOffset", 0)
                        png = png_info(binary[offset:offset + view["byteLength"]])
                        png["sourcePackedBytesExact"] = png["sha256"] == source_png["sha256"]
                    measured_color = color_info(doc, binary, color_ref) if color_ref is not None else None
                    primitives.append({"mesh": mesh["name"], "source": graph_sources[mesh["name"]],
                                       "actualAttributes": primitive["attributes"],
                                       "actualCOLOR_0": measured_color, "actualBaseColorTexture": texture_ref,
                                       "actualBaseColorFactor": material.get("pbrMetallicRoughness", {}).get("baseColorFactor"),
                                       "actualEmbeddedPNG": png,
                                       "portableProductObserved": texture_ref is not None and measured_color is not None
                                                                 and measured_color["varies"]})
            exports.append({"vertexColorMode": mode, "RNAConfirmedOptions": dict(options),
                            "actualGLBBytes": len(payload),
                            "actualGLBSHA256": hashlib.sha256(payload).hexdigest(),
                            "actualMeshCount": len(doc["meshes"]),
                            "actualImageCount": len(doc.get("images", [])),
                            "primitives": primitives})
        report = {"temporaryQueryOnly": True, "originalSceneGeometryMaterialsUntouched": True,
                  "exportCount": len(exports), "publishedGLB": False, "rendered": False,
                  "actualBlenderVersion": bpy.app.version_string,
                  "exporterRNA": rna.identifier, "actualEnumEvidence": enum_evidence,
                  "sourcePackedPNG": source_png, "exports": exports,
                  "scope": "Actual portable graph fixtures only; not terrain UV/texture integration, rendering, runtime or art approval"}

finally:
    for obj in owned_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in owned_meshes:
        bpy.data.meshes.remove(mesh)
    for material in owned_materials:
        bpy.data.materials.remove(material)
    for image in owned_images:
        bpy.data.images.remove(image)
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    for obj in selected_before:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active_before
if report is None:
    raise RuntimeError("Fixture yielded no actual export report")
report["ownedFixturesDisposed"] = True
report["originalSelectionAndActiveObjectRestored"] = (
    set(bpy.context.selected_objects) == set(selected_before)
    and bpy.context.view_layer.objects.active == active_before)
if not report["originalSelectionAndActiveObjectRestored"]:
    raise RuntimeError("Fixture failed to restore original selection")
result = json.dumps(report, separators=(",", ":"))
