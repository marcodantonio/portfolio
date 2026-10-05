"""Projects V2 R7: two editable neutral albedo tiles, materials only.

Source is actual committed R6, not R5 and not the rejected V1. Geometry, every
UV layer, corner normals, all44 TerrainColour buffers, material ownership and
four original native normal/MR PNGs remain exact. Modern RGBA Mix MULTIPLY is
the graph actually measured in the portable fixture, not legacy MixRGB.

This is a controlled mineral/sediment albedo pass, not sculpting, vegetation,
automatic image reconstruction, full reference fidelity or gameplay approval.
Parent owns ephemeral renders, actual GLB checks and submission. No exporter,
render, provider request, scene-camera edit or game-map mutation occurs here.
Two generated PNGs are explicitly linear-to-sRGB encoded with stdlib, loaded
locally into Blender, packed byte-exact, then their temporary files disappear.
"""
import hashlib
import json
import math
import struct
import tempfile
import zlib
from pathlib import Path

import bpy
import numpy as np

PREFIX = "ProjectsIsland_V2_"
COLOR_NAME = "TerrainColour"
ROOT = bpy.data.objects.get(PREFIX + "Origin_At_Sea_Level")
BODY = bpy.data.objects.get(PREFIX + "Continuous_Connected_Coast_And_Bedrock")
ROCK = bpy.data.materials.get(PREFIX + "Limestone")
EARTH = bpy.data.materials.get(PREFIX + "HoneyEarth")
SIZE = 1024
NEW_PREFIX = "R7Albedo_"
AUDIT_KEY = "native_neutral_albedo_r7_audit_json"
EXPECTED_PNGS = {
    PREFIX + "Limestone_MetallicRoughness_1024": "1242a472494cd0b0856f143fc75375c8405ca3d01a229053374178a5833cd79f",
    PREFIX + "Limestone_WornMicroNormal_512": "11e7d290e9302e02c0f37ec446a6ac263d54b91a263877eb6081c4db4285a8d9",
    PREFIX + "HoneyEarth_MetallicRoughness_1024": "ac750c1d1117c9adc06491280c31a63a6480a3e2e1c17211775aa418e9981c87",
    PREFIX + "HoneyEarth_WornMicroNormal_512": "2167248438b2f71a7b9aacc5bf1ae21448ee87c3f4a6f0badcc2b651031c5144",
}


def require(condition, message):
    if not condition:
        raise RuntimeError("R7 " + message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def array_hash(data):
    return sha(np.ascontiguousarray(data).tobytes())


def read_values(collection, field, width, dtype):
    values = np.empty(len(collection) * width, dtype=dtype)
    collection.foreach_get(field, values)
    require(np.isfinite(values).all(), "nonfinite source " + field)
    return values.reshape(-1, width)


def snapshot(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    points = read_values(mesh.vertices, "co", 3, np.float32)
    faces = np.asarray([tuple(t.vertices) for t in mesh.loop_triangles], dtype=np.int32)
    uv = [(layer.name, array_hash(read_values(layer.data, "uv", 2, np.float32)),
           bool(layer.active_render)) for layer in mesh.uv_layers]
    normals = np.asarray([n.vector[:] for n in mesh.corner_normals], dtype=np.float32)
    require(np.isfinite(normals).all(), "nonfinite corner normals")
    colour = mesh.color_attributes.get(COLOR_NAME)
    require(colour is not None and colour.data_type == "FLOAT_COLOR" and colour.domain == "CORNER",
            "unexpected native paint ownership " + obj.name)
    rgba = read_values(colour.data, "color", 4, np.float32)
    require(len(rgba) == len(mesh.loops) and np.ptp(rgba[:, :3], axis=0).max() > .01,
            "missing varied corner paint " + obj.name)
    require(np.all((rgba >= 0) & (rgba <= 1)), "paint outside unit range")
    polygon_data = [(p.loop_start, p.loop_total, p.material_index, bool(p.use_smooth)) for p in mesh.polygons]
    return {"co": array_hash(points), "faces": array_hash(faces),
            "loops": array_hash(read_values(mesh.loops, "vertex_index", 1, np.int32)),
            "edges": array_hash(read_values(mesh.edges, "vertices", 2, np.int32)),
            "polygons": sha(json.dumps(polygon_data).encode()), "uv": uv,
            "active_uv": mesh.uv_layers.active_index,
            "normal": array_hash(normals), "custom_normals": bool(mesh.has_custom_normals),
            "colour": array_hash(rgba), "colour_count": len(mesh.color_attributes),
            "active_colour": mesh.color_attributes.active_color_index,
            "render_colour": mesh.color_attributes.render_color_index,
            "slots": [m.name if m else None for m in mesh.materials],
            "counts": [len(mesh.vertices), len(mesh.edges), len(mesh.loops), len(mesh.polygons), len(faces)],
            "matrix": np.asarray(obj.matrix_world, dtype=np.float64).tolist(),
            "bounds_min": points.min(axis=0).tolist(), "bounds_max": points.max(axis=0).tolist()}


def scalar(value):
    if isinstance(value, (bool, int, float, str)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)


def node_state(node):
    state = {"type": node.bl_idname,
             "inputs": [(s.identifier, scalar(s.default_value)) for s in node.inputs if hasattr(s, "default_value")]}
    for field in ("layer_name", "attribute_name", "operation", "blend_type", "space", "uv_map",
                  "interpolation", "extension", "data_type", "clamp_factor", "clamp_result"):
        if hasattr(node, field):
            state[field] = scalar(getattr(node, field))
    if hasattr(node, "image"):
        state["image"] = node.image.name if node.image else None
    return state


def link_key(link):
    return (link.from_node.name, link.from_socket.identifier, link.to_node.name, link.to_socket.identifier)


def material_state(material):
    return {"nodes": {n.name: node_state(n) for n in material.node_tree.nodes},
            "links": sorted(link_key(l) for l in material.node_tree.links),
            "diffuse": list(material.diffuse_color), "roughness": material.roughness,
            "metallic": material.metallic, "use_nodes": material.use_nodes}


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def periodic_noise(x, y, grid, seed):
    """Bounded periodic smooth lattice; no random pixel field or external data."""
    rng = np.random.default_rng(seed)
    values = rng.uniform(-1, 1, (grid, grid)).astype(np.float32)
    u, v = x * grid, y * grid
    ix, iy = np.floor(u).astype(np.int32), np.floor(v).astype(np.int32)
    tx, ty = smooth(u - ix), smooth(v - iy)
    a = values[iy % grid, ix % grid]
    b = values[iy % grid, (ix + 1) % grid]
    c = values[(iy + 1) % grid, ix % grid]
    d = values[(iy + 1) % grid, (ix + 1) % grid]
    return ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty).astype(np.float32)


def cells(x, y, grid, seed):
    """Periodic jittered mineral aggregate distances plus coherent site ID."""
    rng = np.random.default_rng(seed)
    jitter = rng.uniform(.16, .84, (grid, grid, 2)).astype(np.float32)
    pigment = rng.uniform(0, 1, (grid, grid)).astype(np.float32)
    u, v = x * grid, y * grid
    ix, iy = np.floor(u).astype(np.int32), np.floor(v).astype(np.int32)
    first = np.full(x.shape, np.inf, dtype=np.float32)
    second = first.copy()
    identity = np.zeros(x.shape, dtype=np.float32)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            gx, gy = ix + ox, iy + oy
            point = jitter[gy % grid, gx % grid]
            distance = (u - gx - point[:, :, 0]) ** 2 + (v - gy - point[:, :, 1]) ** 2
            closer = distance < first
            second = np.where(closer, first, np.minimum(second, distance))
            identity = np.where(closer, pigment[gy % grid, gx % grid], identity)
            first = np.minimum(first, distance)
    return np.sqrt(first), np.sqrt(second), identity


def fracture_distance(x, y, paths):
    """Three finite stress traces with periodic copies, not a cobblestone grid."""
    nearest = np.full(x.shape, np.inf, dtype=np.float32)
    for path in paths:
        for a, b in zip(path, path[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length2 = dx * dx + dy * dy
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    px, py = x - a[0] - ox, y - a[1] - oy
                    t = np.clip((px * dx + py * dy) / length2, 0, 1)
                    distance2 = (px - t * dx) ** 2 + (py - t * dy) ** 2
                    nearest = np.minimum(nearest, distance2)
    return np.sqrt(nearest)


def tile_linear(kind):
    axis = np.linspace(0, 1, SIZE, dtype=np.float32)
    x, y = np.meshgrid(axis, axis)
    cloud = .65 * periodic_noise(x, y, 4, 7101) + .35 * periodic_noise(x, y, 11, 7102)
    fine = periodic_noise(x, y, 186, 7103)
    if kind == "Limestone":
        warp = .095 * periodic_noise(x, y, 5, 7111) + .03 * np.sin(2 * math.pi * x)
        phase = 9 * y + warp
        bedding = np.exp(-(np.sin(math.pi * phase) / .055) ** 2)
        bedding *= .40 + .60 * smooth(.5 + .5 * periodic_noise(x, y, 7, 7112))
        cracks = fracture_distance(x, y, (
            ((.08, .18), (.24, .27), (.33, .31), (.51, .45), (.68, .47)),
            ((.33, .31), (.40, .18), (.44, .08)),
            ((.79, .60), (.75, .82), (.86, .94)),
        ))
        fracture = np.exp(-(cracks / .0016) ** 2)
        halo = np.exp(-(cracks / .0060) ** 2)
        f1, f2, identity = cells(x, y, 82, 7113)
        inclusion = np.exp(-(f1 / .22) ** 2) * (identity < .065)
        pores = np.exp(-(f1 / .10) ** 2) * (identity > .935)
        linear = .940 + .075 * cloud + .025 * fine + .035 * inclusion
        linear -= .080 * bedding + .280 * fracture + .035 * halo + .100 * pores
        rgb = linear[:, :, None] * np.array((.995, 1., .998), dtype=np.float32)
    elif kind == "HoneyEarth":
        f1, f2, identity = cells(x, y, 104, 7121)
        deposit = periodic_noise(x, y, 23, 7122)
        aggregate_edges = np.exp(-((f2 - f1) / .045) ** 2)
        quartz = np.exp(-(f1 / .21) ** 2) * (identity < .055)
        dark_mineral = np.exp(-(f1 / .15) ** 2) * (identity > .94)
        crumb = periodic_noise(x, y, 320, 7123)
        linear = .934 + .080 * cloud + .055 * deposit + .020 * fine + .014 * crumb
        linear += .075 * quartz - .050 * aggregate_edges - .100 * dark_mineral
        rgb = linear[:, :, None] * np.array((1., .997, .990), dtype=np.float32)
    else:
        raise RuntimeError("R7 unknown tile kind")
    rgb = np.clip(rgb, .450, .998).astype(np.float32)
    # Exact opposing texels: tile wrap is explicit, not an unmeasured seam claim.
    rgb[-1, :, :] = rgb[0, :, :]
    rgb[:, -1, :] = rgb[:, 0, :]
    return rgb


def srgb_encode(linear):
    return np.where(linear <= .0031308, 12.92 * linear, 1.055 * linear ** (1 / 2.4) - .055)


def srgb_decode(encoded):
    return np.where(encoded <= .04045, encoded / 12.92, ((encoded + .055) / 1.055) ** 2.4)


def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)


def rgba_png(rgba):
    require(rgba.dtype == np.uint8 and rgba.shape == (SIZE, SIZE, 4), "invalid generated RGBA buffer")
    scanlines = np.zeros((SIZE, SIZE * 4 + 1), dtype=np.uint8)
    scanlines[:, 1:] = rgba.reshape(SIZE, SIZE * 4)
    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr)
            + png_chunk(b"sRGB", b"\x00") + png_chunk(b"IDAT", zlib.compress(scanlines.tobytes(), 6))
            + png_chunk(b"IEND", b""))


def read_generated_png(data):
    require(data[:8] == b"\x89PNG\r\n\x1a\n", "generated payload is not PNG")
    offset, compressed, dimensions, ended = 8, [], None, False
    while offset < len(data):
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        stored_crc = struct.unpack_from(">I", data, offset + 8 + length)[0]
        require(stored_crc == zlib.crc32(kind + payload) & 0xffffffff, "PNG CRC mismatch")
        if kind == b"IHDR":
            dimensions = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            compressed.append(payload)
        elif kind == b"IEND":
            ended = True
        offset += length + 12
    require(ended and offset == len(data) and dimensions == (SIZE, SIZE, 8, 6, 0, 0, 0), "PNG IHDR/bounds mismatch")
    decoded = np.frombuffer(zlib.decompress(b"".join(compressed)), dtype=np.uint8)
    require(len(decoded) == SIZE * (SIZE * 4 + 1), "PNG scanline bounds mismatch")
    rows = decoded.reshape(SIZE, SIZE * 4 + 1)
    require(np.all(rows[:, 0] == 0), "unexpected generated PNG filter")
    return rows[:, 1:].reshape(SIZE, SIZE, 4)


def texture_stats(rgb, png):
    decoded = read_generated_png(png)
    srgb = decoded[:, :, :3].astype(np.float32) / 255
    measured_linear = srgb_decode(srgb)
    require(np.isfinite(rgb).all() and np.isfinite(measured_linear).all(), "nonfinite tile")
    require(np.all(decoded[:, :, 3] == 255), "albedo not opaque")
    require(np.array_equal(decoded[0], decoded[-1]) and np.array_equal(decoded[:, 0], decoded[:, -1]), "tile edges not exact")
    mean = rgb.mean(axis=(0, 1), dtype=np.float64)
    require(np.all(mean > .88) and np.all(mean < .97), "tile excessively dark/bright")
    require(float(rgb.std()) > .007 and float(rgb.std()) < .07, "tile is flat or excessive contrast")
    require(float(np.max(np.abs(measured_linear - rgb))) < .005, "linear/sRGB quantization mismatch")
    return {"width": SIZE, "height": SIZE, "bytes": len(png), "sha256": sha(png),
            "PNG": {"bitDepth": 8, "colorType": 6, "opaque": True},
            "generated_linear_RGB_mean": mean.tolist(),
            "generated_linear_min_max_std": [float(rgb.min()), float(rgb.max()), float(rgb.std())],
            "actual_png_sRGB_RGB_mean": srgb.mean(axis=(0, 1), dtype=np.float64).tolist(),
            "actual_png_decoded_linear_RGB_mean": measured_linear.mean(axis=(0, 1), dtype=np.float64).tolist(),
            "maximum_linear_quantization_error": float(np.max(np.abs(measured_linear - rgb))),
            "opposing_edge_texels_exact": True, "nominal_metres_per_uv_tile": 6.4}


def install_graph(material, image, source):
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = next(n for n in nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")
    original_link = shader.inputs["Base Color"].links[0]
    vertex = original_link.from_node
    texture = nodes.new("ShaderNodeTexImage")
    texture.name, texture.label, texture.image = NEW_PREFIX + "Image", "R7 neutral mineral albedo (sRGB)", image
    texture.interpolation, texture.extension = "Linear", "REPEAT"
    mapping = nodes.new("ShaderNodeUVMap")
    mapping.name, mapping.uv_map = NEW_PREFIX + "UV", "UVMap"
    product = nodes.new("ShaderNodeMix")
    product.name, product.label = NEW_PREFIX + "Product", "TerrainColour x neutral albedo"
    require(all(p in product.bl_rna.properties for p in ("data_type", "blend_type", "clamp_factor", "clamp_result")),
            "actual modern Mix RNA differs from verified fixture")
    product.data_type, product.blend_type = "RGBA", "MULTIPLY"
    product.clamp_factor, product.clamp_result = False, False
    factors = [s for s in product.inputs if s.name == "Factor" and s.type == "VALUE"]
    a = [s for s in product.inputs if s.name == "A" and s.type == "RGBA"]
    b = [s for s in product.inputs if s.name == "B" and s.type == "RGBA"]
    out = [s for s in product.outputs if s.type == "RGBA"]
    require(len(factors) == len(a) == len(b) == len(out) == 1, "actual RGBA Mix sockets differ")
    factors[0].default_value = 1.
    links.remove(original_link)
    links.new(mapping.outputs["UV"], texture.inputs["Vector"])
    links.new(vertex.outputs["Color"], a[0])
    links.new(texture.outputs["Color"], b[0])
    links.new(out[0], shader.inputs["Base Color"])
    texture.location, mapping.location, product.location = (-440, 440), (-640, 440), (-200, 320)
    current = material_state(material)
    require(all(current["nodes"].get(name) == state for name, state in source["nodes"].items()), "original PBR node changed")
    require(len(current["nodes"]) == len(source["nodes"]) + 3, "unexpected new PBR nodes")
    added = {texture.name, mapping.name, product.name}
    original_retained = sorted(k for k in current["links"] if k[0] not in added and k[2] not in added)
    removed = (vertex.name, vertex.outputs["Color"].identifier, shader.name, shader.inputs["Base Color"].identifier)
    require(original_retained == sorted(k for k in source["links"] if k != removed), "normal/MR or other original links changed")
    require(len(current["links"]) == len(source["links"]) + 3, "unexpected link count")
    for field in ("diffuse", "roughness", "metallic", "use_nodes"):
        require(current[field] == source[field], "original PBR scalar changed")
    require(product.data_type == "RGBA" and product.blend_type == "MULTIPLY" and factors[0].default_value == 1., "Mix product not exact")
    require(shader.inputs["Base Color"].links[0].from_node == product, "BaseColor not driven by modern product")
    return {"material": material.name, "vertex_colour": vertex.layer_name, "uv_map": mapping.uv_map,
            "graph": "ShaderNodeMix RGBA MULTIPLY factor1: COLOR_0 x sRGB baseColorTexture",
            "original_nodes_and_non_albedo_links_exact": True, "new_nodes": 3}


require(ROOT is not None and BODY is not None and ROCK is not None and EARTH is not None, "missing source")
require(ROOT.get("native_geological_recomposition_r6_audit_json") and not ROOT.get(AUDIT_KEY), "requires committed R6, not already R7")
require(ROOT.get("origin_semantics") == "Sea level, not a walking floor", "unexpected origin")
objects = sorted((o for o in ROOT.children if o.type == "MESH"), key=lambda o: o.name)
require(len(objects) == 44 and BODY in objects, "requires44 source owners")
source_audit_text = ROOT["native_geological_recomposition_r6_audit_json"]
source_audit = json.loads(source_audit_text)
source_details = {entry["name"]: entry for entry in source_audit["source_details"]}
require(source_audit["triangles"] == 109088 and set(source_details) == {o.name for o in objects}, "R6 source audit mismatch")
before = {o.name: snapshot(o) for o in objects}
require(sum(s["counts"][-1] for s in before.values()) == 109088, "triangle count changed before R7")
for obj in objects:
    state, audit = before[obj.name], source_details[obj.name]
    require(state["co"] == audit["source_co_sha256"] and state["normal"] == audit["source_corner_normal_sha256"], "actual R6 position/normal digest mismatch")
    require(obj.data.uv_layers.active is not None and obj.data.uv_layers.active.name == "UVMap", "unexpected active UV name")
    require(next(uv[1] for uv in state["uv"] if uv[0] == "UVMap") == audit["source_uv_sha256"], "actual R6 UV digest mismatch")
    require(state["slots"] == [EARTH.name if obj == BODY else ROCK.name], "source material ownership changed")
    require(state["matrix"] == np.eye(4).tolist(), "source nonidentity matrix")
material_before = {m.name: material_state(m) for m in (ROCK, EARTH)}
png_before = {}
for material in (ROCK, EARTH):
    require(material.use_nodes and not any(n.name.startswith(NEW_PREFIX) for n in material.node_tree.nodes), "preexisting R7 graph")
    shaders = [n for n in material.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"]
    require(len(shaders) == 1, "requires one Principled per material")
    linked = list(shaders[0].inputs["Base Color"].links)
    require(len(linked) == 1 and linked[0].from_node.bl_idname == "ShaderNodeVertexColor"
            and linked[0].from_node.layer_name == COLOR_NAME and linked[0].from_socket.name == "Color", "requires proven direct TerrainColour graph")
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeTexImage" and node.image:
            image = node.image
            require(image.packed_file is not None and image.file_format == "PNG", "original texture not packed PNG")
            digest = sha(bytes(image.packed_file.data))
            require(EXPECTED_PNGS.get(image.name) == digest, "original native PNG guard mismatch " + image.name)
            png_before[image.name] = digest
require(png_before == EXPECTED_PNGS, "requires exactly four original native normal/MR PNGs")
image_count_before, material_count_before = len(bpy.data.images), len(bpy.data.materials)
new_images, textures, graphs = [], [], []
with tempfile.TemporaryDirectory(prefix="projects-v2-r7-native-albedo-") as folder:
    for kind, material in (("Limestone", ROCK), ("HoneyEarth", EARTH)):
        image_name = PREFIX + kind + "_NeutralAlbedo_R7_1024"
        require(bpy.data.images.get(image_name) is None, "new texture name already exists")
        rgb = tile_linear(kind)
        rgba = np.empty((SIZE, SIZE, 4), dtype=np.uint8)
        rgba[:, :, :3] = np.rint(srgb_encode(rgb) * 255).astype(np.uint8)
        rgba[:, :, 3] = 255
        png = rgba_png(rgba)
        stats = texture_stats(rgb, png)
        path = Path(folder) / (image_name + ".png")
        path.write_bytes(png)
        image = bpy.data.images.load(str(path), check_existing=False)
        image.name, image.colorspace_settings.name = image_name, "sRGB"
        image.alpha_mode = "STRAIGHT"
        image.pack()
        require(image.packed_file is not None and bytes(image.packed_file.data) == png, "new native packed PNG not byte-exact")
        require(tuple(image.size) == (SIZE, SIZE) and image.channels == 4 and image.file_format == "PNG", "actual Blender image bounds/format mismatch")
        image["r7_albedo_stats_json"] = json.dumps(stats, separators=(",", ":"))
        image["r7_editable_recipe"] = "refine_projects_island_v2_r7_albedo.py: deterministic native tile generation"
        new_images.append(image)
        textures.append(dict(name=image_name, kind=kind, **stats))
        del rgb, rgba, png
    for material, image in zip((ROCK, EARTH), new_images):
        graphs.append(install_graph(material, image, material_before[material.name]))

after = {o.name: snapshot(o) for o in objects}
require(before == after, "geometry/UV/normals/COLOR_0/source ownership changed")
require(ROOT["native_geological_recomposition_r6_audit_json"] == source_audit_text, "historical R6 audit changed")
require(len(bpy.data.materials) == material_count_before and len(bpy.data.images) == image_count_before + 2, "unexpected material/image count")
for name, digest in png_before.items():
    image = bpy.data.images.get(name)
    require(image is not None and image.packed_file is not None and sha(bytes(image.packed_file.data)) == digest, "original normal/MR PNG bytes changed")
audit = {"schemaVersion": 1, "recipe": "projects-island-v2-r7-neutral-mineral-albedo", "source_revision": "R6",
         "source_owners_exact": 44, "source_triangles_exact": 109088,
         "source_geometry_uv_corner_normals_colour_and_ownership_exact": True,
         "source_state_sha256": sha(json.dumps(before, sort_keys=True, separators=(",", ":")).encode()),
         "historical_r6_audit_exact": True, "original_native_png_bytes_exact": 4,
         "new_albedo_pngs": 2, "new_materials": 0, "existing_terrain_materials": 2,
         "textures": textures, "graphs": graphs, "provider_requests": 0, "renders": 0, "exports": 0,
         "original_roughness_metallic_normal_MR_graphs_exact": True,
         "full_reference_fidelity_verified": False, "runtime_integrated": False,
         "scope": "Albedo-only; rear/ledge geometry targets remain OPEN. Not sculpting, union, gameplay, performance or art approval."}
ROOT[AUDIT_KEY] = json.dumps(audit, separators=(",", ":"))
result = json.dumps(audit, separators=(",", ":"))
require(len(result.encode()) < 14000, "concise result exceeds14KiB")

r7_material_audit=json.loads(result)
import bpy
bpy.context.view_layer.update()
VIEW='hero'
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
scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.media_type = 'IMAGE'
scene.render.image_settings.file_format = 'PNG'
target = artifacts.file(name='projects-island-v2-r7-candidate-'+view+'.png', media_type='image/png')
scene.render.filepath = str(target.path)
bpy.ops.render.render(write_still=True)
target.publish()
result = {'view':view, 'assetMeshes':len(meshes), 'blenderBounds':[list(lo),list(hi)],
          'orthographic':True, 'diagnosticWater':view=='hero', 'sampleCount':8,
          'temporaryQueryOnly':True, 'noRuntimeWaterClaim':True}

r6_hero=result
for query_water in bpy.data.objects:
    if query_water.name.startswith('QueryOnly_Sea_Datum_'):
        query_water.hide_render=True
views=[]
for VIEW in ('front','right','top'):
    exec("\"\"\"Read-only Higgsfield query. Prefix VIEW='hero'/'front'/'right'/'top'.\n\nCamera axes refer to glTF (+Y up, +Z front). Blender is +Z up.\nOnly the hero may add temporary water at sea level; this is not exported art.\n\"\"\"\nimport bpy\nfrom mathutils import Vector\n\nview = globals().get('VIEW', 'hero')\nassert view in ('hero', 'front', 'right', 'top')\nroot = bpy.data.objects['ProjectsIsland_V2_Origin_At_Sea_Level']\nmeshes = [o for o in root.children_recursive if o.type == 'MESH']\npoints = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]\nlo = Vector([min(p[i] for p in points) for i in range(3)])\nhi = Vector([max(p[i] for p in points) for i in range(3)])\ncenter = (lo + hi) * .5\ncamera_data = bpy.data.cameras.new('QueryOnly_ActualGLB_Axes')\ncamera = bpy.data.objects.new('QueryOnly_ActualGLB_Axes', camera_data)\nbpy.context.collection.objects.link(camera)\ncamera_data.type = 'ORTHO'\ncamera_data.clip_start = .1\ncamera_data.clip_end = 1000\nif view == 'top':\n    camera.location = (center.x, center.y, 200)\n    camera.rotation_euler = (0, 0, 0)\nelif view in ('front', 'right'):\n    direction = Vector((0, -1, 0) if view == 'front' else (1, 0, 0))\n    camera.location = center + direction*200\n    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()\nelse:\n    center.z = max(3, center.z)\n    camera.location = center + Vector((90, -110, 88))\n    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()\n    # Diagnostic sea datum, never a child of the model or a scene mutation.\n    bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0))\n    water = bpy.context.object\n    water.name = 'QueryOnly_Sea_Datum_Not_Exported'\n    mat = bpy.data.materials.new('QueryOnly_Sea_Datum_Not_Runtime_Water')\n    mat.use_nodes = True\n    bsdf = mat.node_tree.nodes.get('Principled BSDF')\n    bsdf.inputs['Base Color'].default_value = (.022, .25, .31, 1)\n    bsdf.inputs['Roughness'].default_value = .26\n    bsdf.inputs['Metallic'].default_value = 0\n    water.data.materials.append(mat)\n# Fit actual owned geometry, not an assumed scale. Blender's ortho_scale is\n# horizontal with this landscape render; vertical coverage is scale/aspect.\nprojected = [camera.rotation_euler.to_matrix().transposed() @ (p-center) for p in points]\nspan_x = max(p.x for p in projected)-min(p.x for p in projected)\nspan_y = max(p.y for p in projected)-min(p.y for p in projected)\ncamera_data.ortho_scale = max(span_x, span_y*4/3)*1.12\nscene = bpy.context.scene\nscene.camera = camera\nscene.render.engine = 'BLENDER_EEVEE'\nscene.eevee.taa_render_samples = 8\nscene.eevee.use_raytracing = False\nscene.eevee.use_fast_gi = False\nscene.render.resolution_x = 480\nscene.render.resolution_y = 360\nscene.render.resolution_percentage = 100\nscene.render.image_settings.media_type = 'IMAGE'\nscene.render.image_settings.file_format = 'PNG'\ntarget = artifacts.file(name='projects-island-v2-r7-candidate-'+view+'.png', media_type='image/png')\nscene.render.filepath = str(target.path)\nbpy.ops.render.render(write_still=True)\ntarget.publish()\nresult = {'view':view, 'assetMeshes':len(meshes), 'blenderBounds':[list(lo),list(hi)],\n          'orthographic':True, 'diagnosticWater':view=='hero', 'sampleCount':8,\n          'temporaryQueryOnly':True, 'noRuntimeWaterClaim':True}\n",globals(),globals())
    views.append(result)
result={'views':views,'temporaryQueryOnly':True,'seaPlaneExported':False}

r6_axes=result
result={'hero':r6_hero,'axes':r6_axes,'committedRootActualVertexBounds':[[min((o.matrix_world@v.co)[i] for o in meshes for v in o.data.vertices) for i in range(3)],[max((o.matrix_world@v.co)[i] for o in meshes for v in o.data.vertices) for i in range(3)]],'allRendersQueryOnly':True}

r7_views=result
for generated_image in new_images:
    target=artifacts.file(name=generated_image.name+".png",media_type="image/png")
    Path(str(target.path)).write_bytes(bytes(generated_image.packed_file.data))
    target.publish()
result={'nativeMaterialAudit':r7_material_audit,'views':r7_views,'newTilePNGsActuallyPublished':2,'temporaryQueryOnly':True,'committedRevisionStill':6}

