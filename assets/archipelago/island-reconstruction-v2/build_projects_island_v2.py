"""Projects V2: a drawn, interconnected limestone island, not a radial hill.

Run only in a freshly inspected EMPTY Higgsfield Scene Builder Blender 5.2
project. The user selected the bare-island V2 sheet, with separate elements
later. That sheet is a morphological guide, not metric orthographic CAD.

The deliberate landmarks are the connected rear cannon terraces, broad honey
earth apron, cleft western buttress, three front spurs and lower southeast
headland. These are individually drawn footprints and connected bedrock, not
three cylindrical hills or random scattered boulders. No building, vegetation
mesh, water, deck, collider or invisible support is created.

Metres. glTF X right / Y up / Z front; Blender (X,-Z,Y). Root is SEA LEVEL.
The worker owns save/export. No network, imported bytes or external images.
Actual export/render review remains mandatory before any integration or claim.
"""
import json
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


PREFIX = "ProjectsIsland_V2_"
ROOT_NAME = "ProjectsIsland_V2_Origin_At_Sea_Level"
ASSET_COLLECTION = PREFIX + "Editable_Terraced_Limestone_Master"
PREVIEW_COLLECTION = PREFIX + "Preview_Only_Not_Asset"
SEA_LEVEL, BOTTOM, APRON = 0.0, -10.0, 4.8
SECTORS, RINGS = 256, 144
MATERIALS = {}
IMAGES = []
SOLIDS = []
LANDMARKS = []

# Clockwise in glTF XZ. Several deep front incisions and the right-hand channel
# are actual boundary changes, not painted seams on an oval.
COAST = [
    (0.0, 34.0), (8.2, 32.2), (9.2, 25.0), (8.5, 23.0),
    (10.5, 28.0), (14.0, 30.0), (17.0, 26.0), (17.5, 21.0),
    (19.8, 22.4), (23.5, 26.0), (28.0, 29.0), (31.5, 25.0),
    (31.0, 18.0), (27.5, 15.0), (28.5, 10.0), (32.0, 8.0),
    (34.0, 2.0), (31.5, -2.0), (33.0, -8.0), (30.5, -15.0),
    (32.0, -19.0), (29.0, -24.0), (26.5, -27.0), (22.0, -28.0),
    (15.0, -33.0), (8.0, -35.0), (1.0, -36.0), (-8.0, -34.0),
    (-12.0, -32.0), (-19.0, -32.0), (-23.0, -29.0), (-27.0, -29.0),
    (-31.0, -24.0), (-30.5, -18.0), (-33.0, -13.0), (-32.0, -5.0),
    (-30.0, 3.0), (-34.0, 8.0), (-34.0, 17.0), (-31.0, 20.0),
    (-31.0, 27.0), (-27.0, 30.0), (-24.0, 27.0), (-18.6, 22.4),
    (-20.0, 26.2), (-19.0, 30.0), (-15.0, 32.0), (-12.0, 29.0),
    (-9.5, 24.0), (-7.0, 23.0), (-5.0, 28.0), (-4.0, 32.0),
]


def C(p):
    return (p[0], -p[2], p[1])


def G(p):
    return (p[0], p[2], -p[1])


def clamp(x, a=0.0, b=1.0):
    return min(b, max(a, x))


def smooth(a, b, x):
    t = clamp((x - a) / (b - a))
    return t * t * (3.0 - 2.0 * t)


def distance_segment(x, z, a, b):
    ax, az = a
    bx, bz = b
    dx, dz = bx - ax, bz - az
    t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))
    return math.hypot(x - ax - t * dx, z - az - t * dz)


def in_polygon(x, z, polygon):
    inside = False
    for i, (ax, az) in enumerate(polygon):
        bx, bz = polygon[(i + 1) % len(polygon)]
        if (az > z) != (bz > z):
            crossing = (bx - ax) * (z - az) / (bz - az) + ax
            if x < crossing:
                inside = not inside
    return inside


def ray_shore(theta):
    dx, dz = math.cos(theta), math.sin(theta)
    intersections = []
    for i, (ax, az) in enumerate(COAST):
        bx, bz = COAST[(i + 1) % len(COAST)]
        ex, ez = bx - ax, bz - az
        determinant = dx * ez - dz * ex
        if abs(determinant) < 1e-10:
            continue
        radius = (ax * ez - az * ex) / determinant
        edge_t = (ax * dz - az * dx) / determinant
        if radius > 0 and -1e-8 <= edge_t <= 1.0 + 1e-8:
            intersections.append(radius)
    if not intersections:
        raise RuntimeError("Authored silhouette has no radial intersection")
    # Multiple intersections would fill an authored inlet incorrectly. The
    # contour is deliberately star-shaped; validate it rather than hide it.
    unique = sorted(set(round(v, 7) for v in intersections))
    if len(unique) > 1 and unique[-1] - unique[0] > 1e-5:
        raise RuntimeError("Authored coastline is not star-shaped at %.7f" % theta)
    return max(intersections)


def route_height(x, z, base):
    """Prospective actual-soil descents, not independent invisible ramps."""
    paths = (
        ((4.6834, 26.3442), (0.0, 15.0), 2.75, 1.25364),
        ((29.0315, 1.296), (0.0, 15.0), 1.75, 1.23396),
    )
    height = base
    for a, b, radius, landing_y in paths:
        ax, az = a
        bx, bz = b
        dx, dz = bx - ax, bz - az
        t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))
        distance = math.hypot(x - ax - t * dx, z - az - t * dz)
        blend = 1.0 - smooth(radius, radius + 1.15, distance)
        if blend > 0:
            target = landing_y + (APRON - landing_y) * smooth(0.0, 0.88, t)
            height = height * (1.0 - blend) + target * blend
    return height


def base_y(x, z, q):
    """Low coastal support under the bespoke attached limestone volumes."""
    clearing = max(abs(x) / 16.0, abs(z + 3.0) / 13.0)
    if clearing <= 1.0:
        return APRON
    protected = 1.0 - smooth(1.0, 1.16, clearing)
    coast = smooth(0.72, 1.0, q)
    y = APRON * (1.0 - coast) + 0.52 * coast
    # The golden apron extends forward without a domed green collar. The
    # western cleft and east waterfall channel stay low between integral spurs.
    western_cleft = math.exp(-((x + 27.1) / 1.05) ** 2) * smooth(1.0, 9.0, z)
    right_channel = math.exp(-((x - 27.0) / 1.0) ** 2) * (1.0 - smooth(-8.0, 8.0, z))
    y -= min(2.7, 2.7 * max(western_cleft, right_channel))
    y = route_height(x, z, y)
    # Route influence may never change the reserved workshop rectangle.
    y = y * (1.0 - protected) + APRON * protected
    return max(0.40, y)


def packed(name, rgb, data=True):
    rows, columns = rgb.shape[:2]
    image = bpy.data.images.new(PREFIX + name, width=columns, height=rows, alpha=True)
    image.colorspace_settings.name = "Non-Color" if data else "sRGB"
    rgba = np.concatenate((np.clip(rgb, 0.0, 1.0), np.ones((rows, columns, 1))), axis=2)
    image.pixels.foreach_set(np.asarray(rgba, dtype=np.float32).ravel())
    image.update()
    image.pack()
    IMAGES.append(image)
    return image


def material(name, roughness, seed):
    """Four original packed PNGs total; vertex paint is the portable base color."""
    u, v = np.meshgrid(np.linspace(0, 1, 1024, endpoint=False), np.linspace(0, 1, 1024, endpoint=False))
    grain = 0.42 * np.sin(u * 17.0 + seed) * np.cos(v * 13.0 - seed)
    grain += 0.23 * np.sin(u * 42.0 + v * 7.0 + seed * 0.13)
    grain += 0.12 * np.cos(u * 79.0 - v * 51.0)
    mr = packed(name + "_MetallicRoughness_1024", np.stack((np.ones_like(u),
                np.clip(roughness + 0.045 * grain, 0.72, 0.98), np.zeros_like(u)), axis=2))
    nu, nv = np.meshgrid(np.linspace(0, 1, 512, endpoint=False), np.linspace(0, 1, 512, endpoint=False))
    relief = 0.50 * np.sin(nu * 17.0 + seed) * np.cos(nv * 13.0 - seed)
    relief += 0.15 * np.sin(nu * 53.0 + nv * 21.0)
    dy, dx = np.gradient(relief)
    normal = np.stack((-dx * 2.8, -dy * 2.8, np.ones_like(dx)), axis=2)
    normal /= np.linalg.norm(normal, axis=2)[..., None]
    normal_image = packed(name + "_WornMicroNormal_512", normal * 0.5 + 0.5)
    mat = bpy.data.materials.new(PREFIX + name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    mat.diffuse_color = (0.68, 0.51, 0.32, 1) if name == "HoneyEarth" else (0.56, 0.51, 0.43, 1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = roughness
    vertex = nodes.new("ShaderNodeVertexColor")
    vertex.layer_name = "TerrainColour"
    links.new(vertex.outputs["Color"], bsdf.inputs["Base Color"])
    mr_node = nodes.new("ShaderNodeTexImage")
    mr_node.image = mr
    separate = nodes.new("ShaderNodeSeparateColor")
    links.new(mr_node.outputs["Color"], separate.inputs[0])
    links.new(separate.outputs["Green"], bsdf.inputs["Roughness"])
    normal_node = nodes.new("ShaderNodeTexImage")
    normal_node.image = normal_image
    norm = nodes.new("ShaderNodeNormalMap")
    norm.inputs["Strength"].default_value = 0.38 if name == "Limestone" else 0.23
    links.new(normal_node.outputs["Color"], norm.inputs["Color"])
    links.new(norm.outputs["Normal"], bsdf.inputs["Normal"])
    mat["portable_base_color"] = "TerrainColour COLOR_0, direct VertexColor to Principled"
    mat["ambient_occlusion_texture_assigned"] = False
    MATERIALS[name] = mat
    return mat


def moss_mask(x, y, z, role, normal):
    # Deliberate moss pockets are restricted to mineral edges/ledges. The large
    # central apron is honey-earth, never an uninterrupted grass blanket.
    if normal[1] < 0.20 or y < 1.1:
        return 0.0
    clearing = max(abs(x) / 16.0, abs(z + 3.0) / 13.0)
    if clearing <= 1.05:
        return 0.0
    pockets = (
        (-28, 12, 5.0, 5.0), (-24, 24, 3.8, 4.1), (-18, 17, 2.4, 3.0),
        (-27, -22, 4.8, 3.8), (-13, -25, 4.8, 2.7), (9, -30, 5.2, 2.8),
        (20, -23, 3.8, 3.4), (26, -9, 2.0, 5.0), (22, 13, 3.1, 3.8),
        (27, 25, 2.9, 3.2), (-3, 29, 2.0, 2.4), (13, 27, 2.5, 2.3),
    )
    envelope = max(math.exp(-(((x - px) / rx) ** 2 + ((z - pz) / rz) ** 2)) for px, pz, rx, rz in pockets)
    brush = 0.50 + 0.25 * math.sin(x * 1.2 + z * 0.6) + 0.19 * math.cos(z * 1.7 - x * 0.8)
    return min(0.84, envelope * smooth(0.20, 0.70, brush) * (0.80 if role == "earth" else 0.90))


def painted(x, y, z, normal, role, seed=0):
    warmth = 0.5 + 0.23 * math.sin(x * 0.30 + z * 0.19 + seed) + 0.14 * math.cos(z * 0.49 - x * 0.16)
    fine = 0.5 + 0.24 * math.sin(x * 1.31 + z * 0.92) * math.cos(y * 1.28 + z * 0.44)
    if role == "earth":
        color = np.array((0.71, 0.475, 0.215)) * (0.91 + 0.12 * warmth + 0.035 * fine)
    else:
        warm = np.array((0.58, 0.525, 0.435))
        cool = np.array((0.32, 0.365, 0.42))
        cleavage = 0.25 + 0.22 * (1.0 - warmth) + 0.08 * math.sin(y * 1.6 + x * 0.7 + seed)
        color = warm * (1.0 - cleavage) + cool * cleavage
        color *= 0.91 + 0.16 * fine
        # Sedimentary bands are broad staining, not alternating pixel stripes.
        seam = math.exp(-(math.sin(y * 1.17 + x * 0.035) / 0.16) ** 2)
        color *= 1.0 - 0.065 * seam
    moss = moss_mask(x, y, z, role, normal)
    olive = np.array((0.18, 0.265, 0.045)) * (0.91 + 0.12 * warmth)
    color = color * (1.0 - moss) + olive * moss
    wet = (1.0 - smooth(-0.10, 0.88, y)) * (0.12 if role == "earth" else 0.24)
    return tuple(np.clip(color * (1.0 - wet), 0.0, 1.0))


def paint_mesh(obj, solid_seed=0, base=False, soil_top=True):
    mesh = obj.data
    mesh.materials.clear()
    mesh.materials.append(MATERIALS["Limestone"])
    mesh.materials.append(MATERIALS["HoneyEarth"])
    uv = mesh.uv_layers.new(name="UVMap")
    colors = mesh.color_attributes.new(name="TerrainColour", type="FLOAT_COLOR", domain="CORNER")
    mesh.color_attributes.active_color_index = 0
    for poly in mesh.polygons:
        normal = G(poly.normal)
        centroid = G(poly.center)
        # Real soil surfaces are material-separated from vertical limestone.
        earth = normal[1] > (0.79 if base else 0.90) and centroid[1] > 0.1 and soil_top
        poly.material_index = 1 if earth else 0
        # Flat shallow caps and broad cliff facets stay readable. Fine geometry
        # below the water has no need for expensive custom shading normals.
        poly.use_smooth = base and normal[1] > 0.52
        role = "earth" if earth else "stone"
        axis = max(range(3), key=lambda i: abs(normal[i]))
        for loop in poly.loop_indices:
            p = G(mesh.vertices[mesh.loops[loop].vertex_index].co)
            planes = ((p[2], p[1]), (p[0], p[2]), (p[0], p[1]))
            u, v = planes[axis]
            uv.data[loop].uv = ((u + solid_seed * 0.37) / 6.4, (v - solid_seed * 0.21) / 6.4)
            colors.data[loop].color = (*painted(*p, normal, role, solid_seed * 0.17), 1.0)


def finish_body_creases(obj):
    """Retain positions; give actual high-curvature folds their own normals.

    A smooth corner average across a narrow incision can point behind an
    adjacent real face. Such a face is a geological crease, not a smooth patch.
    Set only those actual faces flat; never flip normals or suppress the audit.
    Triangles have already been authored before paint/normal inspection.
    """
    mesh = obj.data
    creases = set()
    for attempt in range(4):
        mesh.update()
        mesh.calc_loop_triangles()
        normals = mesh.corner_normals
        unsafe = set()
        for tri in mesh.loop_triangles:
            poly = mesh.polygons[tri.polygon_index]
            if not poly.use_smooth:
                continue
            a,b,c = [mesh.vertices[i].co for i in tri.vertices]
            face = (b-a).cross(c-a)
            average = sum((normals[i].vector for i in tri.loops),Vector())
            if face.length_squared > 1e-20 and average.length_squared > 1e-20:
                if face.normalized().dot(average.normalized()) < 0.10:
                    unsafe.add(tri.polygon_index)
        if not unsafe:
            obj["authored_high_curvature_crease_faces"] = len(creases)
            return
        for index in unsafe:
            mesh.polygons[index].use_smooth = False
        creases.update(unsafe)
    raise RuntimeError("Continuous bedrock crease shading did not converge")


def triangulate_final_mesh(mesh, label):
    """Resolve real non-planar quads after the bevel, without moving vertices."""
    before = [(v.co.x,v.co.y,v.co.z) for v in mesh.vertices]
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm, faces=list(bm.faces), quad_method="BEAUTY", ngon_method="BEAUTY")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if not all(e.is_manifold for e in bm.edges) or bm.calc_volume(signed=True) <= 0:
        bm.free()
        raise RuntimeError("Triangulated source is not closed/outward: "+label)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    after = [(v.co.x,v.co.y,v.co.z) for v in mesh.vertices]
    if before != after:
        raise RuntimeError("Final normal/topology finishing moved source vertices: "+label)


def mesh_object(name, vertices, faces, group, seed=0, base=False, soil_top=True):
    mesh = bpy.data.meshes.new(PREFIX + name + "_Mesh")
    mesh.from_pydata([C(p) for p in vertices], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if not all(edge.is_manifold for edge in bm.edges):
        bm.free()
        raise RuntimeError("Authored source is not closed: " + name)
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if base:
        triangulate_final_mesh(mesh, name)
    obj = bpy.data.objects.new(PREFIX + name, mesh)
    ASSET.objects.link(obj)
    obj.parent = ROOT
    obj["master_role"] = group
    obj["review_only"] = True
    obj["metre_origin"] = "Shared sea plane Y0; source bottom Y-10"
    paint_mesh(obj, seed, base, soil_top)
    if base:
        finish_body_creases(obj)
    SOLIDS.append(obj)
    return obj


def make_continuous_body():
    """Connected soil/foundation, including every visible front incision."""
    shore = [ray_shore(i * math.tau / SECTORS) for i in range(SECTORS)]
    verts = [(0, APRON, 0)]
    faces = []
    for ring in range(1, RINGS + 1):
        q = ring / RINGS
        for sector in range(SECTORS):
            angle = sector * math.tau / SECTORS
            radius = shore[sector] * q
            x, z = radius * math.cos(angle), radius * math.sin(angle)
            verts.append((x, base_y(x, z, q), z))
    for sector in range(SECTORS):
        faces.append((0, 1 + sector, 1 + (sector + 1) % SECTORS))
    for ring in range(1, RINGS):
        a = 1 + (ring - 1) * SECTORS
        b = a + SECTORS
        for sector in range(SECTORS):
            n = (sector + 1) % SECTORS
            faces.append((a + sector, b + sector, b + n, a + n))
    last = 1 + (RINGS - 1) * SECTORS
    for y in (0.0, -0.48, -1.25, -2.75, -4.5, -6.25, -8.0, BOTTOM):
        start = len(verts)
        for sector in range(SECTORS):
            angle = sector * math.tau / SECTORS
            expansion = 1.0 + 0.013 * abs(y) / 10.0
            radius = shore[sector] * expansion
            verts.append((radius * math.cos(angle), y, radius * math.sin(angle)))
        for sector in range(SECTORS):
            n = (sector + 1) % SECTORS
            faces.append((last + sector, start + sector, start + n, last + n))
        last = start
    centre = len(verts)
    verts.append((0, BOTTOM, 0))
    for sector in range(SECTORS):
        faces.append((centre, last + (sector + 1) % SECTORS, last + sector))
    body = mesh_object("Continuous_Connected_Coast_And_Bedrock", verts, faces, "Foundation_and_clearing", base=True)
    body["terrain_role"] = "continuous-bedrock"
    body["silhouette_polygon_xz_json"] = json.dumps(COAST, separators=(",", ":"))
    body["reserved_apron"] = "32x26m centre(0,-3), actual authored level4.8 above sea"
    return body


def signed_area(polygon):
    return sum(a[0] * b[1] - a[1] * b[0] for a, b in zip(polygon, polygon[1:] + polygon[:1])) / 2.0


def densify(polygon, step):
    points = []
    if signed_area(polygon) < 0:
        polygon = list(reversed(polygon))
    for i, (ax, az) in enumerate(polygon):
        bx, bz = polygon[(i + 1) % len(polygon)]
        length = math.hypot(bx - ax, bz - az)
        count = max(2, int(math.ceil(length / step)))
        nx, nz = (bz - az) / length, -(bx - ax) / length
        for j in range(count):
            t = j / count
            points.append((ax + (bx - ax) * t, az + (bz - az) * t, nx, nz, t, i))
    return points


def cap_triangles(vectors, start_index, reverse):
    """Blender 5.2 returns local indices; older Blender returned Vectors.

    Validate the full polygon boundary explicitly so a tessellator dropping a
    boundary point cannot create an open solid hidden behind a positive volume.
    No repair by filling the drawn concavity or ignoring missing edges.
    """
    n = len(vectors)
    lookup = {tuple(v): j for j, v in enumerate(vectors)}
    result_faces = []
    edge_counts = {}
    for tri in tessellate_polygon([vectors]):
        if len(tri) != 3:
            raise RuntimeError("Tessellator returned a non-triangle cap")
        if all(isinstance(v, int) for v in tri):
            local = tuple(tri)
        else:
            local = tuple(lookup[tuple(v)] for v in tri)
        if any(i < 0 or i >= n for i in local) or len(set(local)) != 3:
            raise RuntimeError("Invalid local cap triangle indices")
        for a, b in zip(local, local[1:] + local[:1]):
            edge = tuple(sorted((a, b)))
            edge_counts[edge] = edge_counts.get(edge, 0) + 1
        indices = tuple(start_index + i for i in local)
        result_faces.append(tuple(reversed(indices)) if reverse else indices)
    perimeter = {tuple(sorted((j, (j + 1) % n))) for j in range(n)}
    if any(edge_counts.get(edge) != 1 for edge in perimeter):
        raise RuntimeError("Tessellation dropped a real authored cap boundary edge")
    if any(count != (1 if edge in perimeter else 2) for edge, count in edge_counts.items()):
        raise RuntimeError("Cap tessellation has an open or non-manifold internal edge")
    return result_faces


def prism(name, polygon, top, group, seed, bottom=BOTTOM, step=0.90,
          clefts=(), soil_top=True, bevel=0.15, cap_tilt=(0, 0)):
    """Drawn fractured prismatic strata. Narrow clefts have real depth.

    The source is one closed volume. Clefts indent an actual wall rather than
    dark decals; they stop at the upper lip so the broad ledge remains coherent.
    Bevelled angular footprints and connected layered volumes are the primary
    form. Deterministic sub-15cm wear is secondary, never the silhouette itself.
    """
    points = densify(polygon, step)
    n = len(points)
    cx = sum(p[0] for p in polygon) / len(polygon)
    cz = sum(p[1] for p in polygon) / len(polygon)
    span = max(top - bottom, 1.0)
    levels = [bottom]
    levels += [y for y in (-7.0, -4.0, -1.5, -0.3, 0.25, 0.65) if bottom < y < top - 0.4]
    start = max(0.65, bottom + 0.1)
    count = max(5, int((top - start) / 0.42))
    levels += [start + (top - start) * j / count for j in range(1, count)]
    levels += [top]
    levels = sorted(set(levels))
    verts = []
    faces = []
    for level, y in enumerate(levels):
        relative = (y - bottom) / span
        for x, z, nx, nz, edge_t, edge in points:
            corner_protect = math.sin(math.pi * edge_t) ** 0.8
            worn = (0.065 * math.sin(x * 1.05 + z * 0.65 + seed)
                    + 0.030 * math.cos(z * 1.7 - y * 0.5 + seed)) * corner_protect
            stratum = 0.10 * math.sin(y * 1.26 + seed * 0.61) * smooth(-0.5, 1.8, y)
            cut = 0.0
            for px, pz, width, depth in clefts:
                along = math.hypot(x - px, z - pz)
                cut += depth * math.exp(-(along / width) ** 2) * (1.0 - smooth(top - 0.90, top, y))
            # Broad bedrock continues down to the sea; lower pieces do not turn
            # into hanging tapered rocks. Top rounding is a narrow true bevel.
            extension = 0.025 * (1.0 - relative) * span
            outward = worn + stratum + extension - cut
            vx, vz = x + nx * outward, z + nz * outward
            vy = y + (cap_tilt[0] * (x - cx) + cap_tilt[1] * (z - cz)) * relative
            verts.append((vx, vy, vz))
        if level:
            a, b = (level - 1) * n, level * n
            for j in range(n):
                nxt = (j + 1) % n
                faces.append((a + j, a + nxt, b + nxt, b + j))
    # Blender's tessellator handles concave footprints without filling a cleft
    # with a triangle fan outside the drawn polygon.
    for start_index, reverse in ((0, True), ((len(levels) - 1) * n, False)):
        vectors = [Vector(C(verts[start_index + j])) for j in range(n)]
        faces.extend(cap_triangles(vectors, start_index, reverse))
    obj = mesh_object(name, verts, faces, group, seed, soil_top=soil_top)
    # Apply a small, finite physical edge bevel before final corner paint. A
    # bevel on all micro-grid edges would produce decorative triangulation, so
    # use angle-limited structural edges only.
    if bevel > 0:
        modifier = obj.modifiers.new("Worn_Structural_Edges_Not_Noise", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
        modifier.angle_limit = 0.52
        modifier.use_clamp_overlap = True
        modifier.profile = 0.58
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    # Triangulate the final bevelled surface first: original non-planar wall
    # quads must not shade using one averaged quad normal opposed to a real
    # exported triangle. No vertex is displaced and the strict audit remains.
    triangulate_final_mesh(obj.data, name)
    # Repaint every actual final loop, including generated bevel triangles.
    for layer in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(layer)
    for layer in list(obj.data.color_attributes):
        obj.data.color_attributes.remove(layer)
    obj.data.update()
    paint_mesh(obj, seed, soil_top=soil_top)
    obj["drawn_footprint_xz_json"] = json.dumps(polygon, separators=(",", ":"))
    obj["proposed_top_above_sea"] = top
    obj["landmark_group"] = group
    return obj


def add_landmark(name, polygon, top, group, seed, **kwargs):
    obj = prism(name, polygon, top, group, seed, **kwargs)
    LANDMARKS.append({"name": name, "role": group, "top_proposal": top, "footprint_xz": polygon,
                      "bottom_proposal": kwargs.get("bottom", BOTTOM)})
    return obj


def make_rear_ridge():
    # One connected wall/shoulder under all rear tiers. Its irregular front lip
    # stays entirely beyond the 32x26m workshop apron, not three round hills.
    add_landmark("Rear_Connected_Low_Saddle", [(-29,-23),(-24,-30),(-13,-32),(-4,-31),(6,-33),
        (16,-31),(24,-27),(29,-21),(29,-16.7),(22,-16.7),(15,-18.4),(7,-17.5),
        (-2,-18.2),(-10,-17.2),(-20,-17.2),(-26,-15.8)], 6.55, "Rear_connected_terraces", 11,
        clefts=((-22,-17.2,.68,.50),(4,-18,.62,.55),(21,-16.8,.62,.68)))
    add_landmark("Western_Broad_Second_Terrace", [(-29,-23),(-25,-28),(-19,-30),(-12,-28.5),
        (-8,-24),(-10.5,-20.7),(-18,-20),(-22,-17.4),(-26.7,-17.4)], 10.2,
        "Rear_connected_terraces", 12, bottom=2.8, clefts=((-23,-18,.72,1.05),(-11,-22,.66,.62)))
    add_landmark("Cannon_Continuous_Middle_Terrace", [(-15,-27),(-10,-31.5),(-2,-33.8),(7,-32),
        (15,-28),(19,-23.8),(16,-20.5),(9,-21.8),(2,-20.9),(-5,-21.3),(-11,-23)], 11.55,
        "Rear_connected_terraces", 13, bottom=3.1, clefts=((-1,-21,.68,.85),(15,-22,.73,.66)))
    add_landmark("Cannon_Asymmetric_High_Plateau", [(-9,-30),(-5,-34),(2,-34.7),(8,-32.8),
        (12,-29.3),(10.2,-26.5),(4,-26.0),(-1,-26.4),(-6.5,-26.7)], 15.4,
        "Dominant_rear_cannon_ridge", 14, bottom=8.7, cap_tilt=(.026,.025),
        clefts=((-3,-26.5,.71,.98),(8.9,-28,.61,.73)), bevel=.20)
    add_landmark("Western_High_Shoulder_Connected_To_Cannon", [(-22,-26),(-19,-29.2),
        (-12.5,-28.6),(-9.7,-25),(-12,-22.1),(-16.6,-22.3),(-21,-23.5)], 12.45,
        "Rear_connected_terraces", 15, bottom=7.1, cap_tilt=(-.028,0), bevel=.18)
    add_landmark("East_Long_Lower_Shoulder", [(11.5,-25),(16,-29),(22,-27.6),(26.5,-23),
        (27.8,-19),(24.7,-16.7),(20.4,-17.3),(17,-20.4),(13,-21)], 9.05,
        "Rear_right_saddle", 16, bottom=3.1, cap_tilt=(.018,.014),
        clefts=((25.1,-18.2,.62,1.1),), bevel=.18)
    add_landmark("Front_Low_Connecting_Ridge_Ledge", [(-19.5,-19),(-13,-20.4),(-7,-19.6),
        (-1,-20.4),(7,-19.4),(12,-18),(9,-16.8),(1,-17.15),(-6,-16.8),(-13,-17.0),
        (-19.2,-17.1)], 6.15, "Rear_connected_terraces", 17, bottom=2.9, bevel=.13)


def make_western_buttress():
    # Two tall, oblong limestone shoulders with a deliberate continuous deep
    # cleft, not a heap of rocks under a platform. They physically join bedrock.
    add_landmark("West_Front_Outer_Cleft_Buttress", [(-33.0,8),(-29.6,5.4),(-27.6,9.8),
        (-28.0,15.1),(-27.6,21.6),(-29.5,25.3),(-31.0,23.8),(-31.1,19.7),(-33.4,16.3)],
        8.15, "Western_front_cleft_buttress", 21,
        clefts=((-28.0,15.2,.82,1.30),(-32.5,12.4,.72,.75)), cap_tilt=(-.023,-.007), bevel=.21)
    add_landmark("West_Front_Inner_Cleft_Buttress", [(-26.6,8.6),(-23.1,7.8),(-19.2,11.5),
        (-19.4,17.5),(-21.7,20.8),(-22.8,24.4),(-25.1,23.8),(-26.4,19.5),(-25.6,14.7)],
        6.60, "Western_front_cleft_buttress", 22,
        clefts=((-26.1,15.2,.79,.78),(-20.3,15,.75,.83)), cap_tilt=(.006,.018), bevel=.19)
    add_landmark("West_Low_Shelf_Before_Cleft", [(-30.8,-2),(-26.7,-3.5),(-22.1,-.9),
        (-20.2,4.2),(-20.5,8.5),(-24.0,10.1),(-27.1,7.7),(-29.9,5.4)], 6.0,
        "Western_front_cleft_buttress", 23, bottom=-4.5, bevel=.18)
    add_landmark("West_Toe_Grounded_Not_Hanging", [(-33.1,15),(-31.6,12.3),(-29.8,16.1),
        (-29.4,22),(-31.3,24.2),(-32.1,22.2),(-33.8,18.1)], 2.1,
        "Low_coastal_toes", 24, soil_top=False, bevel=.22)


def make_front_spurs_and_east():
    add_landmark("Front_Left_Principal_Finger", [(-20,23.9),(-16.7,21.0),(-12.8,22.4),
        (-12.3,27.7),(-14.8,31.1),(-17.2,30.6),(-18.8,28.6)], 4.5,
        "Front_incision_spurs", 31, clefts=((-15.1,30.6,.55,.77),), bevel=.18)
    add_landmark("Front_Central_Long_Finger", [(-5.5,24.8),(-1.8,22.7),(2.2,24.7),
        (3.5,30.3),(.7,33.5),(-2.1,32.7),(-3.6,30)], 4.12,
        "Front_incision_spurs", 32, cap_tilt=(.015,-.052), bevel=.18)
    add_landmark("Front_East_Short_Finger", [(8.9,24.1),(12.7,22.5),(15.8,24.1),
        (16.0,27.0),(13.4,29.6),(10.7,28.4)], 3.25,
        "Front_incision_spurs", 33, cap_tilt=(0,-.045), bevel=.17)
    add_landmark("Southeast_Low_Access_Headland", [(20.1,19.2),(23.2,17.0),(27.7,17.1),
        (29.7,21.6),(31.0,24.6),(28.1,28.1),(24.6,26.7),(23.2,24)], 2.58,
        "Lower_front_right_headland", 34, cap_tilt=(0,-.023), bevel=.20)
    add_landmark("East_Ledge_North_Of_Access", [(26.2,5.2),(29.5,3.9),(33.0,3.2),
        (31.7,7.2),(28.5,10.0),(26.5,13.4),(22.9,13.4),(22.4,10.6)], 3.58,
        "Lower_front_right_headland", 35, clefts=((29,7.3,.59,.70),), bevel=.19)
    # Two integral steep banks frame the future waterfall. The narrow low gap
    # between them remains actual terrain: there is no water/ribbon/fake portal.
    add_landmark("East_Waterfall_Channel_Rear_Bank", [(27.5,-13.7),(29.2,-15.5),(30.5,-12.1),
        (31.7,-8.3),(30.1,-5.2),(27.6,-5.7),(27.0,-9.2)], 7.15,
        "Right_flank_future_waterfall_channel", 36,
        clefts=((27.2,-9.0,.68,1.02),), cap_tilt=(.026,-.018), bevel=.18)
    add_landmark("East_Waterfall_Channel_Front_Bank", [(22.2,-6.6),(24.8,-7.3),(25.7,-4.0),
        (25.5,-.3),(23.5,1.0),(20.9,-1.3)], 6.22,
        "Right_flank_future_waterfall_channel", 37,
        clefts=((25.5,-3.4,.66,.97),), bevel=.18)


def fracture_courses():
    """Authored attached mineral facets along landmarks, not loose boulders.

    The handful of contour-following pieces changes a block's geological
    reading. Each has an explicit source coordinate and role; no RNG placement.
    All avoid the workshop rectangle and the prospective landing corridors.
    """
    drawings = [
        # x,z,width,depth,height,orientation,role: these are narrow wall ribs,
        # stepped lips and fractured toe slabs, not rounded generic rocks.
        (-30.2,10.5,2.3,1.4,5.9,.18,"West_buttress_attached_facets"),
        (-30.9,18.5,1.8,1.5,5.1,-.20,"West_buttress_attached_facets"),
        (-24.4,20.8,2.5,1.4,4.4,.43,"West_buttress_attached_facets"),
        (-20.7,12.8,1.6,1.4,3.8,-.12,"West_buttress_attached_facets"),
        (-18.6,27.5,1.5,1.1,3.7,-.28,"Front_attached_fracture_faces"),
        (-13.8,29.0,1.2,1.2,2.4,.16,"Front_attached_fracture_faces"),
        (-3.2,29.2,1.0,1.1,2.8,.10,"Front_attached_fracture_faces"),
        (1.8,30.5,1.2,1.0,2.4,-.25,"Front_attached_fracture_faces"),
        (12.0,27.8,1.4,1.0,1.9,.30,"Front_attached_fracture_faces"),
        (27.8,25.5,1.6,1.1,1.6,-.31,"Low_headland_attached_facets"),
        (30.0,22.1,1.4,1.0,1.9,.20,"Low_headland_attached_facets"),
        (30.4,6.5,1.5,1.1,2.5,-.12,"Low_headland_attached_facets"),
        (29.1,-8.6,1.4,1.2,4.9,-.28,"Channel_integral_fracture_faces"),
        (24.3,-3.3,1.0,1.2,3.7,.22,"Channel_integral_fracture_faces"),
        (-26.5,-21.4,2.1,1.5,7.4,-.16,"Ridge_attached_strata_lips"),
        (-21.8,-18.2,2.4,1.3,6.5,.30,"Ridge_attached_strata_lips"),
        (-16.8,-22.9,2.7,1.6,8.8,-.13,"Ridge_attached_strata_lips"),
        (-10.5,-23.5,2.4,1.4,9.4,.14,"Ridge_attached_strata_lips"),
        (-3.8,-22.1,2.8,1.3,8.8,-.10,"Ridge_attached_strata_lips"),
        (3.8,-21.7,2.5,1.5,8.7,.08,"Ridge_attached_strata_lips"),
        (10.3,-23.0,2.3,1.4,9.0,-.22,"Ridge_attached_strata_lips"),
        (18.8,-20.3,2.5,1.3,7.1,.25,"Ridge_attached_strata_lips"),
        (24.3,-20.0,1.8,1.3,6.8,.12,"Ridge_attached_strata_lips"),
        (-4.4,-27.2,2.4,1.4,12.8,-.09,"Cannon_high_terrace_fractures"),
        (5.8,-27.0,2.7,1.4,12.7,.21,"Cannon_high_terrace_fractures"),
    ]
    for j, (x,z,w,d,h,angle,role) in enumerate(drawings):
        outline = [(-1,-.54),(-.42,-1),(.61,-.83),(1,-.24),(.78,.65),(.15,1),(-.76,.73)]
        ca, sa = math.cos(angle), math.sin(angle)
        polygon = [(x+px*w*ca-pz*d*sa,z+px*w*sa+pz*d*ca) for px,pz in outline]
        # All faces bury themselves in their parent landform. These pieces have
        # no independent new ground declaration or traversability guarantee.
        bottom = -1.1 if h < 5.5 else 1.8
        if role == "Cannon_high_terrace_fractures":
            bottom = 9.2
        prism("Attached_Fracture_%02d" % j, polygon, h, role, 50+j,
              bottom=bottom, step=.48, soil_top=True, bevel=.11, cap_tilt=(.017,-.022))
    return len(drawings)


def preview():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "Khronos PBR Neutral"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    world = bpy.data.worlds.new(PREFIX + "Neutral_Review_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (.73,.82,.96,1)
    background.inputs["Strength"].default_value = .32
    data = bpy.data.cameras.new(PREFIX + "Review_Camera_Data")
    camera = bpy.data.objects.new(PREFIX + "Review_Camera_Excluded", data)
    PREVIEW.objects.link(camera)
    camera["preview_only"] = True
    data.type = "ORTHO"
    data.ortho_scale = 88
    camera.location = C((56,43,77))
    target = Vector(C((0,3,-2)))
    camera.rotation_euler = (target-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.camera = camera
    for name,position,energy,color,angle in (
        ("Warm_Key",(-40,60,35),2.1,(1,.88,.70),.11),
        ("Cool_Sky_Fill",(38,45,-30),.34,(.65,.81,1),.38),
    ):
        light = bpy.data.lights.new(PREFIX+name+"_Data", "SUN")
        light.energy = energy
        light.color = color
        light.angle = angle
        obj = bpy.data.objects.new(PREFIX+name+"_Preview_Only",light)
        PREVIEW.objects.link(obj)
        obj.location = C(position)
        obj.rotation_euler = (Vector(C((0,0,0)))-obj.location).to_track_quat("-Z","Y").to_euler()
        obj["preview_only"] = True


def audit():
    deps = bpy.context.evaluated_depsgraph_get()
    minimum = np.full(3,np.inf)
    maximum = np.full(3,-np.inf)
    triangle_total = vertex_total = zero_total = opposition_total = uv_zero_total = 0
    reports = []
    for obj in SOLIDS:
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            points = np.asarray([G(v.co) for v in mesh.vertices],dtype=np.float64)
            if not np.isfinite(points).all():
                raise RuntimeError("Non-finite geometry: "+obj.name)
            minimum = np.minimum(minimum,points.min(axis=0))
            maximum = np.maximum(maximum,points.max(axis=0))
            triangle_total += len(mesh.loop_triangles)
            vertex_total += len(mesh.vertices)
            bm = bmesh.new()
            bm.from_mesh(mesh)
            closed = all(e.is_manifold for e in bm.edges)
            volume = bm.calc_volume(signed=True)
            bm.free()
            if not closed or volume <= 0:
                raise RuntimeError("Open/inverted source: "+obj.name)
            uv = mesh.uv_layers.active
            colors = mesh.color_attributes.get("TerrainColour")
            if not uv or not colors:
                raise RuntimeError("Missing portable UV/color: "+obj.name)
            normals = mesh.corner_normals
            zero = opposition = uv_zero = 0
            for tri in mesh.loop_triangles:
                a,b,c = [mesh.vertices[i].co for i in tri.vertices]
                face = (b-a).cross(c-a)
                if face.length_squared < 1e-20:
                    zero += 1
                normal = sum((normals[i].vector for i in tri.loops),Vector())
                if normal.length_squared > 1e-20 and face.length_squared > 1e-20:
                    if face.normalized().dot(normal.normalized()) < -.05:
                        opposition += 1
                uvs = [uv.data[i].uv for i in tri.loops]
                if not all(math.isfinite(v) for pair in uvs for v in pair):
                    raise RuntimeError("Non-finite UV: "+obj.name)
                determinant = (uvs[1].x-uvs[0].x)*(uvs[2].y-uvs[0].y)-(uvs[1].y-uvs[0].y)*(uvs[2].x-uvs[0].x)
                if abs(determinant) < 1e-14:
                    uv_zero += 1
                for loop in tri.loops:
                    if not all(math.isfinite(v) for v in colors.data[loop].color):
                        raise RuntimeError("Non-finite vertex paint: "+obj.name)
            zero_total += zero
            opposition_total += opposition
            uv_zero_total += uv_zero
            reports.append({"name":obj.name,"role":obj["master_role"],"closed_source":closed,
                "positive_signed_volume":volume,"triangles":len(mesh.loop_triangles),
                "zero_area":zero,"normal_opposition":opposition,"uv_degenerate":uv_zero})
        finally:
            evaluated.to_mesh_clear()
    if zero_total or opposition_total or uv_zero_total:
        raise RuntimeError("Fix real source geometry/UV/shading: zero=%d opposition=%d uv=%d" %
                           (zero_total,opposition_total,uv_zero_total))
    if not 100000 <= triangle_total <= 180000:
        raise RuntimeError("Study geometry unexpectedly outside100k-180k: %d" % triangle_total)
    clearing = [base_y(x,z,math.hypot(x,z)/ray_shore(math.atan2(z,x)))
                for x in np.linspace(-16,16,65) for z in np.linspace(-16,10,53)]
    if max(abs(y-APRON) for y in clearing) > 1e-7:
        raise RuntimeError("Protected workshop apron is not planar")
    # Raised solids must never intrude into the cleared workshop footprint.
    intrusive = []
    for obj in SOLIDS[1:]:
        for v in obj.data.vertices:
            x,y,z = G(v.co)
            if y > APRON+.02 and -16.0 <= x <= 16.0 and -16.0 <= z <= 10.0:
                intrusive.append(obj.name)
                break
    if intrusive:
        raise RuntimeError("Raised master clips reserved apron: "+",".join(intrusive))
    return {"triangles":triangle_total,"source_vertices":vertex_total,"meshes":len(SOLIDS),
        "materials":len(MATERIALS),"packed_images":len(IMAGES),
        "packed_image_sizes":[list(i.size) for i in IMAGES],
        "minimum_gltf":minimum.tolist(),"maximum_gltf":maximum.tolist(),
        "size_gltf":(maximum-minimum).tolist(),"zero_area_triangles":zero_total,
        "normal_opposition_candidates":opposition_total,"uv_degenerate_triangles":uv_zero_total,
        "closed_positive_volume_sources":True,"source_details":reports,
        "sea_origin_gltf":[0,0,0],"bottom_depth_below_sea":10,
        "apron_proposal":{"width":32,"depth":26,"centre_xz":[0,-3],
            "height_above_sea":APRON,"analytic_samples":len(clearing),
            "maximum_analytic_deviation":max(abs(y-APRON) for y in clearing)},
        "coast_base_proposal_range":[.40,.72],"drawn_coastline_xz":COAST,
        "landmarks":LANDMARKS,"physics_support_not_approved":True,
        "portable_material_scope":"COLOR_0 plus2normal/2MR PNGs; noAO texture assignment",
        "automatic_multiview_reconstruction":False,"reference_identical_not_proven":True}


if (bpy.data.objects or bpy.data.collections.get(ASSET_COLLECTION)
        or bpy.data.collections.get(PREVIEW_COLLECTION)):
    raise RuntimeError("Requires the freshly inspected empty Projects V2 native project")
ASSET = bpy.data.collections.new(ASSET_COLLECTION)
bpy.context.scene.collection.children.link(ASSET)
PREVIEW = bpy.data.collections.new(PREVIEW_COLLECTION)
bpy.context.scene.collection.children.link(PREVIEW)
ROOT = bpy.data.objects.new(ROOT_NAME,None)
ASSET.objects.link(ROOT)
ROOT["asset_id"] = "projects-island-terrain-v2"
ROOT["units"] = "metres"
ROOT["origin_gltf"] = [0,0,0]
ROOT["origin_semantics"] = "Sea level, not a walking floor"
ROOT["reference_status"] = "User-selected bareProjects turnaroundV2, morphological guide not orthographicCAD"
ROOT["automatic_multiview_reconstruction"] = False
ROOT["workflow"] = "Original reference-led Blender sculptural authoring through HiggsfieldSceneBuilder"
ROOT["runtime_status"] = "Standalone unapproved study, no current terrain/map/physics mutation"
ROOT["element_separation"] = "No buildings, vegetation meshes, water, support deck or colliders"
material("Limestone",.84,7.1)
material("HoneyEarth",.91,17.7)
BODY = make_continuous_body()
make_rear_ridge()
make_western_buttress()
make_front_spurs_and_east()
facet_count = fracture_courses()
preview()
metrics = audit()
ROOT["native_geometry_audit_json"] = json.dumps(metrics,separators=(",",":"))
result = {"recipe":"projects-island-reference-led-v2-interconnected-terraces",
          "root":ROOT_NAME,"audit":metrics,"attached_authored_facets":facet_count,
          "network_requests":0,"renders_performed":0,"gameplay_changes":0,
          "next":"Reject or accept actual sea-level hero and same-mesh FRONT/RIGHT/TOP; then actual portableGLB"}
