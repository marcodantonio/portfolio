/** Static, lossless-material GLB batching. Not a decimator or gameplay approval. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Matrix3, Matrix4, Quaternion, Vector3 } from "three";

const catalog = {
  bridge: ["bridge-v1", "BridgeAsset__walking_surface_pivot"],
  palm: ["palm-v1", "Palm_V1_Origin_At_Trunk_Base"],
  cliff: ["cliff-v1", "Cliff_V1_Origin_At_Coast_Base"],
  "cliff-v2": ["cliff-v2", "Cliff_V2_Origin_At_Coast_Base"],
  studio: ["studio-v1", "HomeStudio_V1_Origin_At_Deck_Centre"],
  "studio-v2": ["studio-v2", "HomeStudio_V2_Origin_At_Deck_Centre"],
  workshop: ["workshop-v1", "DigitalWorkshop_V1_Origin_At_Deck_Centre"],
  archive: ["archive-v1", "ArchiveObservatory_V1_Origin_At_Deck_Centre"],
  laboratory: ["suspended-lab-v1", "SuspendedLab_V1_Origin_At_Deck_Centre"],
  harbor: ["welcome-harbor-v1", "WelcomeHarbor_V1_Origin_At_Deck_Centre"],
  dance: ["dance-pavilion-v1", "DancePavilion_V1_Origin_At_Deck_Centre"],
  lighthouse: ["contact-lighthouse-v1", "ContactLighthouse_V1_Origin_At_Tower_Base"],
  "projects-terrain": ["projects-island-v1", "ProjectsIsland_V1_Origin_At_Sea_Level"],
  "projects-terrain-v2": ["projects-island-v2-r8", "ProjectsIsland_V2_Origin_At_Sea_Level"],
};
const selected = Object.hasOwn(catalog, process.argv[2]) ? catalog[process.argv[2]] : undefined;
assert(selected, `Choose a closed-catalog asset: ${Object.keys(catalog).join(", ")}`);
const [file, rootName] = selected;
const building = ["studio-v1", "studio-v2", "workshop-v1", "archive-v1", "suspended-lab-v1", "welcome-harbor-v1", "dance-pavilion-v1", "contact-lighthouse-v1"].includes(file);
const semanticPrefix = file === "contact-lighthouse-v1" ? "Lighthouse" : file === "dance-pavilion-v1" ? "Dance" : file === "welcome-harbor-v1" ? "Harbor" : file === "suspended-lab-v1" ? "Lab" : file === "archive-v1" ? "Archive" : file === "workshop-v1" ? "Workshop" : "Studio";
const source = new URL(`../public/models/archipelago/${file}.glb`, import.meta.url);
const output = new URL(`../public/models/archipelago/${file}-batched.glb`, import.meta.url);
const bytes = await readFile(source);
assert.equal(bytes.readUInt32LE(0), 0x46546c67); assert.equal(bytes.readUInt32LE(4), 2);
assert.equal(bytes.readUInt32LE(8), bytes.length); assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
const jsonEnd = 20 + bytes.readUInt32LE(12), doc = JSON.parse(bytes.subarray(20, jsonEnd).toString("utf8"));
assert.equal(bytes.readUInt32LE(jsonEnd + 4), 0x004e4942);
const bin = bytes.subarray(jsonEnd + 8, jsonEnd + 8 + bytes.readUInt32LE(jsonEnd));
assert.equal(doc.buffers.length, 1); assert(!doc.buffers[0].uri);
assert(!doc.animations?.length && !doc.skins?.length, "Static masters only; never flatten a rig or animation");
assert(!(doc.extensionsRequired ?? []).some(n => /draco|meshopt|basisu/i.test(n)), "No compressed/decoder-dependent sources");
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const formats = { 5120: [1,"getInt8",127], 5121: [1,"getUint8",255], 5122: [2,"getInt16",32767], 5123: [2,"getUint16",65535], 5125: [4,"getUint32",4294967295], 5126: [4,"getFloat32",1] };
const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
const decoded = new Map();
function values(index) {
  if (decoded.has(index)) return decoded.get(index);
  const a = doc.accessors[index], b = doc.bufferViews[a.bufferView], f = formats[a.componentType], width = widths[a.type];
  assert(!a.sparse && f && width && b.buffer === 0, "Portable non-sparse attribute");
  const stride = b.byteStride ?? f[0] * width, start = (b.byteOffset ?? 0) + (a.byteOffset ?? 0);
  assert(stride >= width * f[0] && a.count > 0);
  assert(start + (a.count - 1) * stride + width * f[0] <= (b.byteOffset ?? 0) + b.byteLength);
  const out = [];
  for (let i = 0; i < a.count; i++) for (let c = 0; c < width; c++) {
    let n = view[f[1]](start + i * stride + c * f[0], true);
    if (a.normalized) n = Math.max(a.componentType === 5120 || a.componentType === 5122 ? -1 : 0, n / f[2]);
    assert(Number.isFinite(n)); out.push(n);
  }
  decoded.set(index, out); return out;
}
function local(n) {
  return n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(
    new Vector3().fromArray(n.translation ?? [0,0,0]), new Quaternion().fromArray(n.rotation ?? [0,0,0,1]), new Vector3().fromArray(n.scale ?? [1,1,1]));
}
const batches = new Map(); let roots = 0, inputMeshes = 0, inputTriangles = 0, removed = 0;
const p = new Vector3(), a = new Vector3(), b = new Vector3(), c = new Vector3();
function walk(index, parent, active, ancestors = new Set(), semantic) {
  assert(!ancestors.has(index), "Acyclic node graph");
  const n = doc.nodes[index], matrix = parent.clone().multiply(local(n));
  assert(matrix.elements.every(Number.isFinite) && Math.abs(matrix.determinant()) > 1e-12);
  if (n.name === rootName) { roots++; active = true; }
  if (building && ["shell", "roof", "interior", "decor"].includes(n.extras?.runtime_group)) semantic = n.extras.runtime_group;
  if (active && n.mesh !== undefined) for (const prim of doc.meshes[n.mesh].primitives) {
    assert.equal(prim.mode ?? 4, 4); assert(!prim.targets && !prim.extensions, "Static uncompressed triangle primitives");
    assert(prim.material !== undefined && prim.attributes.POSITION !== undefined && prim.attributes.NORMAL !== undefined);
    const keys = Object.keys(prim.attributes).sort();
    assert(keys.every(k => /^(POSITION|NORMAL|TANGENT|TEXCOORD_[01]|COLOR_[01])$/.test(k)), "Unsupported geometry semantic");
    const data = Object.fromEntries(keys.map(k => [k, [...values(prim.attributes[k])]]));
    const count = data.POSITION.length / 3, normalMatrix = new Matrix3().getNormalMatrix(matrix), mirrored = matrix.determinant() < 0;
    const indices = prim.indices === undefined ? Array.from({length:count}, (_,i) => i) : values(prim.indices);
    assert(indices.length % 3 === 0); inputMeshes++; inputTriangles += indices.length / 3;
    for (const i of indices) assert(Number.isInteger(i) && i >= 0 && i < count);
    for (let i = 0; i < count; i++) {
      p.fromArray(data.POSITION, i*3).applyMatrix4(matrix); p.toArray(data.POSITION, i*3);
      p.fromArray(data.NORMAL, i*3).applyMatrix3(normalMatrix).normalize(); assert(p.lengthSq() > .5); p.toArray(data.NORMAL, i*3);
      if (data.TANGENT) {
        p.fromArray(data.TANGENT, i*4).transformDirection(matrix); p.toArray(data.TANGENT, i*4);
        if (mirrored) data.TANGENT[i*4+3] *= -1;
      }
    }
    // Test the coordinates that will actually be stored, not their temporary
    // double-precision transforms: Float32 rounding can collapse tiny bevels.
    for (const k of keys) if (!k.startsWith("COLOR")) data[k] = data[k].map(Math.fround);
    const kept = [];
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i], ib = indices[i+1], ic = indices[i+2];
      a.fromArray(data.POSITION, ia*3); b.fromArray(data.POSITION, ib*3); c.fromArray(data.POSITION, ic*3);
      if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-20) { removed++; continue; }
      kept.push(ia, mirrored ? ic : ib, mirrored ? ib : ic);
    }
    if (!kept.length) continue;
    const signature = keys.map(k => { const a=doc.accessors[prim.attributes[k]]; return `${k}:${a.type}:${k.startsWith("COLOR")?`${a.componentType}:${!!a.normalized}`:"FLOAT"}`; }).join("|");
    const key = `${semantic ?? "asset"}|${prim.material}|${signature}`;
    let batch = batches.get(key);
    if (!batch) { batch = { semantic, material:prim.material, data:Object.fromEntries(keys.map(k => [k,[]])), types:Object.fromEntries(keys.map(k => [k,doc.accessors[prim.attributes[k]].type])), formats:Object.fromEntries(keys.map(k=>[k,k.startsWith("COLOR")?doc.accessors[prim.attributes[k]]:undefined])), indices:[], vertexKeys:new Map() }; batches.set(key,batch); }
    // Compact away vertices referenced only by a collapsed face, preserving all
    // surviving UV/normal splits and authored attributes exactly.
    const remap = new Map();
    for (const index of kept) {
      if (!remap.has(index)) {
        // Exact output-Float32 identity, including UVs and split normals. Do not
        // weld merely by position or soften authored edges to reduce counts.
        const vertexKey=keys.map(k=>{const w=widths[batch.types[k]];return data[k].slice(index*w,index*w+w).map(Math.fround).join(",");}).join("|");
        let mapped=batch.vertexKeys.get(vertexKey);
        if (mapped===undefined) {
          mapped=batch.data.POSITION.length/3; batch.vertexKeys.set(vertexKey,mapped);
          for (const k of keys) { const w = widths[batch.types[k]]; for (let j=0;j<w;j++) batch.data[k].push(data[k][index*w+j]); }
        }
        remap.set(index,mapped);
      }
      batch.indices.push(remap.get(index));
    }
  }
  const next = new Set(ancestors); next.add(index);
  for (const child of n.children ?? []) walk(child, matrix, active, next, semantic);
}
for (const n of doc.scenes[doc.scene ?? 0].nodes) walk(n, new Matrix4(), false);
assert.equal(roots,1); assert(batches.size > 0);
const chunks = [], bufferViews = [], accessors = []; let length = 0;
function append(payload, target) {
  const pad = (4 - length % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); length += pad; }
  const index = bufferViews.length; bufferViews.push({buffer:0,byteOffset:length,byteLength:payload.length,...(target ? {target} : {})});
  chunks.push(payload); length += payload.length; return index;
}
function accessor(data,type,index=false,format) {
  const componentType=index?(data.some(n=>n>=65536)?5125:5123):format?.componentType??5126;
  const constructors={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
  const normalized=!!format?.normalized, maximum=formats[componentType][2];
  const array=constructors[componentType].from(normalized?data.map(n=>Math.round(n*maximum)):data), width = widths[type];
  assert(data.length % width === 0 && data.every(Number.isFinite));
  const entry = {bufferView:append(Buffer.from(array.buffer),index?34963:34962),componentType,count:data.length/width,type,...(normalized?{normalized:true}:{})};
  if (type === "VEC3") {
    entry.min = [Infinity,Infinity,Infinity]; entry.max = [-Infinity,-Infinity,-Infinity];
    for (let i=0;i<array.length;i++) {entry.min[i%3] = Math.min(entry.min[i%3],array[i]); entry.max[i%3] = Math.max(entry.max[i%3],array[i]);}
  }
  const i=accessors.length; accessors.push(entry); return i;
}
const meshes = [], nodes = [{name:rootName,children:[]}]; let outputTriangles=0;
const semanticNodes = new Map();
for (const batch of batches.values()) {
  const attributes = Object.fromEntries(Object.keys(batch.data).map(k=>[k,accessor(batch.data[k],batch.types[k],false,batch.formats[k])]));
  const prim = {attributes,indices:accessor(batch.indices,"SCALAR",true),material:batch.material,mode:4};
  const mesh=meshes.length; meshes.push({name:`Batched_${mesh}_${doc.materials[batch.material].name??"PBR"}`,primitives:[prim]});
  let parent = 0;
  if (batch.semantic) {
    if (!semanticNodes.has(batch.semantic)) {
      semanticNodes.set(batch.semantic, nodes.length); nodes[0].children.push(nodes.length);
      nodes.push({name:`${semanticPrefix}_${batch.semantic}`,children:[],extras:{runtime_group:batch.semantic}});
    }
    parent = semanticNodes.get(batch.semantic);
  }
  nodes[parent].children.push(nodes.length); nodes.push({name:meshes[mesh].name,mesh}); outputTriangles += batch.indices.length / 3;
}
const images = (doc.images??[]).map(image=>{
  assert(!image.uri && image.bufferView !== undefined && /image\/(png|jpeg)/.test(image.mimeType));
  const source=doc.bufferViews[image.bufferView]; assert(source.buffer===0);
  const start=source.byteOffset??0; assert(start+source.byteLength<=bin.length);
  return {...image,bufferView:append(bin.subarray(start,start+source.byteLength))};
});
const packed = {
  asset:{version:"2.0",generator:"portfolio static asset batcher; no decimation"},scene:0,scenes:[{nodes:[0]}],nodes,meshes,
  materials:doc.materials,textures:doc.textures,samplers:doc.samplers,images,bufferViews,accessors,buffers:[{byteLength:length}],
  extensionsUsed:(doc.extensionsUsed??[]).filter(n=>n!=="KHR_lights_punctual"),
  extensionsRequired:(doc.extensionsRequired??[]).filter(n=>n!=="KHR_lights_punctual"),
  extras:{sourceSha256:createHash("sha256").update(bytes).digest("hex"),inputMeshes,inputTriangles,removedNearZeroAreaTriangles:removed,outputTriangles,notLOD:true,runtimeApproval:false,semanticGroups:[...semanticNodes.keys()]},
};
assert.equal(outputTriangles, inputTriangles-removed);
const rawJson=Buffer.from(JSON.stringify(packed)), json=Buffer.concat([rawJson,Buffer.alloc((4-rawJson.length%4)%4,0x20)]);
const rawBin=Buffer.concat(chunks), payload=Buffer.concat([rawBin,Buffer.alloc((4-rawBin.length%4)%4)]);
const header=Buffer.alloc(20); header.writeUInt32LE(0x46546c67,0); header.writeUInt32LE(2,4); header.writeUInt32LE(28+json.length+payload.length,8); header.writeUInt32LE(json.length,12); header.writeUInt32LE(0x4e4f534a,16);
const binHead=Buffer.alloc(8); binHead.writeUInt32LE(payload.length,0); binHead.writeUInt32LE(0x004e4942,4);
const final=Buffer.concat([header,json,binHead,payload]); await writeFile(output,final);
console.log(JSON.stringify({source:source.pathname,output:output.pathname,sourceBytes:bytes.length,bytes:final.length,inputMeshes,outputMeshes:meshes.length,inputTriangles,triangles:outputTriangles,removedNearZeroAreaTriangles:removed,sha256:createHash("sha256").update(final).digest("hex"),status:"Batched static study only; not a LOD or runtime/collision approval"},null,2));
