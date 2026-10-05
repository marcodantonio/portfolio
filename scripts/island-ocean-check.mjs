import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as THREE from "three";

// Actual owned ocean/field/uniforms, without a renderer or a substitute sea.
// These checks cannot establish GPU compilation, FPS or reference fidelity.
const modules = new Map();
function moduleURL(file) {
  const url = new URL(file, import.meta.url);
  if (modules.has(url.href)) return modules.get(url.href);
  let code = ts.transpileModule(fs.readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  code = code.replace(/from\s+(["'])([^"']+)\1/g, (_match, _quote, specifier) =>
    `from ${JSON.stringify(specifier.startsWith(".")
      ? moduleURL(new URL(`${specifier}.ts`, url).href) : import.meta.resolve(specifier))}`);
  const output = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  modules.set(url.href, output); return output;
}
const { createIslandOcean } = await import(moduleURL("../lib/island-ocean.ts"));
const map = await import(moduleURL("../lib/island-map.ts"));
const { getSeaCliffWaterRadius } = await import(moduleURL("../lib/island-coast.ts"));
let checks = 0;
const check = (condition, label) => { assert(condition, label); checks++; };

function sampleField(texture, bounds, x, z) {
  const { width, height, data } = texture.image;
  const px = (x - bounds.x) / bounds.z * width - .5, pz = (z - bounds.y) / bounds.w * height - .5;
  const ix = Math.floor(px), iz = Math.floor(pz), tx = px - ix, tz = pz - iz;
  const texel = (a, b) => {
    a = THREE.MathUtils.clamp(a, 0, width - 1); b = THREE.MathUtils.clamp(b, 0, height - 1);
    const offset = (b * width + a) * 4;
    return (data[offset] * 256 + data[offset + 1]) / 65535 * 128 - 64;
  };
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(texel(ix, iz), texel(ix + 1, iz), tx),
    THREE.MathUtils.lerp(texel(ix, iz + 1), texel(ix + 1, iz + 1), tx), tz);
}

const results = [];
for (const compact of [false, true]) {
  const ocean = createIslandOcean({ compact }), surface = ocean.group.children[0];
  const material = surface.material, uniforms = material.uniforms;
  const texture = uniforms.uCoast.value, bounds = uniforms.uCoastBounds.value, target = surface.getRenderTarget();
  const counters = { geometry: 0, material: 0, coast: 0, reflection: 0 };
  surface.geometry.addEventListener("dispose", () => counters.geometry++);
  material.addEventListener("dispose", () => counters.material++);
  texture.addEventListener("dispose", () => counters.coast++);
  target.addEventListener("dispose", () => counters.reflection++);
  try {
    check(ocean.group.children.length === 1 && surface.isReflector, "one actual planar reflection owner");
    check(surface.position.y === map.WATER_LEVEL, "unchanged shared sea level");
    check(target.width === (compact ? 384 : 768) && target.height === target.width && target.samples === 0,
      "unchanged bounded reflection resolution/multisampling");
    check(surface.userData.reflectionMaxHz === (compact ? 15 : 24), "unchanged reflection rate setting, not measured FPS");
    check(uniforms.tDiffuse.value === target.texture, "live addon reflection texture remains attached");
    check(texture.image.width === target.width && texture.image.height === target.height
      && texture.image.data.length === target.width ** 2 * 4, "actual RGBA byte coastal field dimensions");
    check(texture.minFilter === THREE.LinearFilter && texture.magFilter === THREE.LinearFilter
      && !texture.generateMipmaps, "portable linear field without float extension or extra mip budget");
    for (let i = 0; i < texture.image.data.length; i += 4) {
      check(texture.image.data[i + 2] === 0 && texture.image.data[i + 3] === 255,
        "reserved BA unchanged: no extra floor/depth/reconstruction channel");
    }
    const tolerance = Math.hypot(bounds.z / target.width, bounds.w / target.height) + .3;
    let maximumContactError = 0, samples = 0;
    for (const territory of map.TERRITORIES.filter((place) => !place.floating)) {
      for (let i = 0; i < 96; i++) {
        const angle = i / 96 * Math.PI * 2, radius = getSeaCliffWaterRadius(territory, angle);
        const x = territory.x + Math.cos(angle) * radius, z = territory.z + Math.sin(angle) * radius;
        const error = Math.abs(sampleField(texture, bounds, x, z));
        check(error < tolerance, `${territory.id}: field follows shared physical sea contact ${i}`);
        maximumContactError = Math.max(maximumContactError, error); samples++;
      }
      const radius = getSeaCliffWaterRadius(territory, 0);
      check(Math.abs(sampleField(texture, bounds, territory.x + radius + 5, territory.z)) > tolerance,
        `${territory.id}: shifted fake contact negative is rejected`);
    }
    const skills = map.TERRITORIES.find((place) => place.floating);
    check(sampleField(texture, bounds, skills.x, skills.z) > 10,
      "suspended Skills adds no sea-contact foam field");
    ocean.update(12.5, false); check(uniforms.uTime.value === 12.5, "owned live time follows supplied game time");
    ocean.update(44, true); check(uniforms.uTime.value === 0, "reduced motion has a stable neutral water state");
    ocean.update(72, true); check(uniforms.uTime.value === 0, "later reduced update remains neutral");
    ocean.setNight(true); check(uniforms.uNight.value === 1, "night uniform toggles");
    ocean.setNight(false); check(uniforms.uNight.value === 0, "day uniform restores");
    ocean.setSunDirection(1, 2, 3); check(Math.abs(uniforms.uSunDirection.value.length() - 1) < 1e-12, "finite normalized sun");
    const direction = uniforms.uSunDirection.value.clone();
    ocean.setSunDirection(NaN, 2, 3); ocean.setSunDirection(0, 0, 0);
    check(uniforms.uSunDirection.value.equals(direction), "invalid light directions preserve last valid sun");
    check(material.fragmentShader.includes("filteredNoise") && material.fragmentShader.includes("fwidth(shore)"),
      "actual shader has screen-filtered fields and coastal antialiasing; not compilation proof");
    check(material.fragmentShader.includes("float coastalFoam = coastActivity * (")
      && !material.fragmentShader.includes("edgeFoam * (.49 +"),
      "actual shader masks all coastal foam without the historical positive ring floor");
    check(material.fragmentShader.includes("fwidth(activity)") && material.fragmentShader.includes("activityResolution")
      && material.fragmentShader.includes("fwidth(secondPhase)"),
      "actual shader independently filters broad coastal pockets and both narrow fronts");
    check(material.fragmentShader.includes("shore * .91 - uTime * .67")
      && material.fragmentShader.includes("shore * .67 - uTime * .51"),
      "actual incoming fronts use different spatial phases and speeds");
    results.push({ compact, field: target.width, contactSamples: samples, maximumContactError,
      contactTolerance: tolerance, reflectionMaxHzSetting: surface.userData.reflectionMaxHz, resources: counters });
  } finally { ocean.dispose(); ocean.dispose(); }
  check(Object.values(counters).every((value) => value === 1), "each owned resource disposed exactly once");
  check(ocean.group.children.length === 0, "disposed ocean detaches scene children");
}
console.log(JSON.stringify({ status: "PASS", checks,
  scope: "actual CPU coastal field, uniforms and ownership; not GPU/FPS/art approval", results }, null, 2));
