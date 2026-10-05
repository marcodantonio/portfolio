import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { TERRITORIES, WATER_LEVEL, WORLD_BOUNDS } from "./island-map";
import { getSeaCliffWaterRadius } from "./island-coast";

type IslandOcean = {
  group: THREE.Group;
  update: (time: number, reducedMotion: boolean) => void;
  setNight: (night: boolean) => void;
  setSunDirection: (x: number, y: number, z: number) => void;
  dispose: () => void;
};

/** A CPU-baked signed coastal field from the grounded rock's shared sea contact.
 * RG stores a 16-bit distance in meters, not a separately drawn circular mask.
 * Byte textures permit linear filtering without an optional float extension.
 */
function createCoastalField(size: number) {
  const padding = 55;
  const minX = WORLD_BOUNDS.minX - padding, minZ = WORLD_BOUNDS.minZ - padding;
  const width = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + padding * 2;
  const depth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + padding * 2;
  const pixels = new Uint8Array(size * size * 4);
  // Sampling the shared wall profile once avoids millions of trigonometric
  // relief evaluations while baking the pixel field. Floating Skills is absent.
  const sectors = 384;
  const shorelines = TERRITORIES.filter((island) => !island.floating).map((island) => ({ island,
    radii: Float32Array.from({ length: sectors }, (_, index) => getSeaCliffWaterRadius(island, index / sectors * Math.PI * 2)) }));
  for (let row = 0; row < size; row++) {
    const z = minZ + (row + 0.5) / size * depth;
    for (let col = 0; col < size; col++) {
      const x = minX + (col + 0.5) / size * width;
      let shore = 64;
      for (const { island, radii } of shorelines) {
        const dx = x - island.x, dz = z - island.z;
        const angle = (Math.atan2(dz, dx) / (Math.PI * 2) + 1) % 1 * sectors;
        const index = Math.floor(angle), fraction = angle - index;
        const radius = radii[index] + (radii[(index + 1) % sectors] - radii[index]) * fraction;
        shore = Math.min(shore, Math.hypot(dx, dz) - radius);
      }
      const encoded = Math.round(THREE.MathUtils.clamp((shore + 64) / 128, 0, 1) * 65535);
      const offset = (row * size + col) * 4;
      pixels[offset] = encoded >> 8;
      pixels[offset + 1] = encoded & 255;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = "Shared irregular coastline distance field";
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return { texture, bounds: new THREE.Vector4(minX, minZ, width, depth) };
}

/** One owned planar reflection pass, plus procedural waves and coastal optics.
 * The installed Reflector supports both perspective and orthographic clipping.
 * Reflection resolution/rate are bounded settings, not frame-rate guarantees.
 */
export function createIslandOcean({ compact = false }: { compact?: boolean } = {}): IslandOcean {
  const group = new THREE.Group();
  group.name = "Tropical ocean with scene reflections";
  const coastal = createCoastalField(compact ? 384 : 768);
  // The opening camera now frames a genuinely spread-out archipelago. Keep the
  // finite water edge beyond its far view, not as a visible curved "horizon".
  const extent = Math.max(WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX, WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) + 3000;
  const geometry = new THREE.PlaneGeometry(extent, extent, compact ? 40 : 72, compact ? 40 : 72);
  const surface = new Reflector(geometry, {
    textureWidth: compact ? 384 : 768,
    textureHeight: compact ? 384 : 768,
    multisample: 0,
    clipBias: 0.002,
    shader: {
      name: "IslandOcean",
      uniforms: {
        color: { value: new THREE.Color("#007d9c") },
        tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() },
        uCoast: { value: null },
        uCoastBounds: { value: coastal.bounds },
        uTime: { value: 0 }, uNight: { value: 0 },
        uOrthographic: { value: 0 },
        uViewDirection: { value: new THREE.Vector3(0.3, 0.7, 0.65).normalize() },
        uSunDirection: { value: new THREE.Vector3(-25, 45, 25).normalize() },
      },
      vertexShader: /* glsl */`
        uniform mat4 textureMatrix;
        uniform float uTime;
        varying vec3 vWorld;
        varying vec4 vReflection;
        #include <common>
        #include <fog_pars_vertex>
        void main() {
          vec3 p = position;
          vec3 flatWorld = (modelMatrix * vec4(p, 1.)).xyz;
          // Long, low swell moves the silhouette; finer waves live in normals.
          p.z += sin(flatWorld.x * .031 + flatWorld.z * .024 - uTime * .43) * .095
            + sin(flatWorld.x * -.047 + flatWorld.z * .019 + uTime * .32) * .045;
          vec4 world = modelMatrix * vec4(p, 1.);
          vWorld = world.xyz;
          vReflection = textureMatrix * vec4(p, 1.);
          vec4 mvPosition = viewMatrix * world;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D uCoast;
        uniform vec4 uCoastBounds;
        uniform float uTime;
        uniform float uNight;
        uniform float uOrthographic;
        uniform vec3 uViewDirection;
        uniform vec3 uSunDirection;
        varying vec3 vWorld;
        varying vec4 vReflection;
        #include <common>
        #include <fog_pars_fragment>

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        float noise(vec2 p) {
          vec2 cell = floor(p), f = fract(p);
          f = f * f * (3. - 2. * f);
          return mix(mix(hash(cell), hash(cell + vec2(1., 0.)), f.x),
            mix(hash(cell + vec2(0., 1.)), hash(cell + vec2(1.)), f.x), f.y);
        }
        vec3 gradientNoise(vec2 p) {
          vec2 cell = floor(p), f = fract(p);
          vec2 u = f * f * (3. - 2. * f), du = 6. * f * (1. - f);
          float a = hash(cell), b = hash(cell + vec2(1., 0.));
          float c = hash(cell + vec2(0., 1.)), d = hash(cell + vec2(1.));
          float crossTerm = a - b - c + d;
          return vec3(a + (b - a) * u.x + (c - a) * u.y + crossTerm * u.x * u.y,
            du.x * (b - a + crossTerm * u.y), du.y * (c - a + crossTerm * u.x));
        }
        // Filter each wavelength independently. Fading the complete normal
        // with distance erased the long swell too, leaving a flat blue overview.
        // Unresolved value noise converges to its mean; its derivative to zero.
        vec3 filteredGradientNoise(vec2 p) {
          vec3 field = gradientNoise(p);
          float footprint = max(length(dFdx(p)), length(dFdy(p)));
          float visibility = 1. - smoothstep(.32, 1.35, footprint);
          return vec3(mix(.5, field.x, visibility), field.yz * visibility);
        }
        float filteredNoise(vec2 p) {
          float footprint = max(length(dFdx(p)), length(dFdy(p)));
          return mix(.5, noise(p), 1. - smoothstep(.32, 1.35, footprint));
        }
        float coastDistance(vec2 p) {
          vec2 uv = (p - uCoastBounds.xy) / uCoastBounds.zw;
          if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) return 64.;
          vec2 encoded = texture2D(uCoast, uv).rg;
          return dot(encoded, vec2(65280., 255.)) / 65535. * 128. - 64.;
        }

        void main() {
          vec2 p = vWorld.xz;
          float shore = coastDistance(p);
          float pixelWidth = max(length(dFdx(p)), length(dFdy(p)));
          float bottom = filteredNoise(p * .028) * .64
            + filteredNoise(p * .087 + 13.) * .36;
          float depth = max(0., shore) * (.26 + bottom * .075) + bottom * 1.25;
          // Uneven sandy shelves make local turquoise coves rather than the
          // same uniformly saturated halo around every coastline.
          float shelf = filteredNoise(p * .052 + 41.);
          float shallow = exp(-depth * .25) * (.58 + .42 * smoothstep(.28, .67, shelf));
          vec2 drift = vec2(uTime * .083, -uTime * .052);
          // Irregular long swell, crossed wind chop and capillary detail share
          // advection but not a repeated tile or synchronized sine-wave train.
          vec2 warped = p + vec2(filteredNoise(p * .023 + drift * .17),
            filteredNoise(p * .031 - drift * .13 + 19.)) * 4.7;
          vec2 axisA = vec2(.894, .447), crossA = vec2(-.447, .894);
          vec2 axisB = vec2(-.615, .788), crossB = vec2(-.788, -.615);
          vec2 axisC = vec2(.259, .966), crossC = vec2(-.966, .259);
          vec3 a = filteredGradientNoise(vec2(dot(warped, axisA), dot(warped, crossA))
            * vec2(.074, .13) + drift * .62);
          vec3 b = filteredGradientNoise(vec2(dot(warped, axisB), dot(warped, crossB))
            * vec2(.22, .34) - drift * 1.03 + 7.);
          vec3 c = filteredGradientNoise(vec2(dot(warped, axisC), dot(warped, crossC))
            * vec2(.57, .82) + drift * 1.6 + 31.);
          vec3 d = filteredGradientNoise(vec2(dot(warped, axisA), dot(warped, crossA))
            * vec2(1.21, 1.67) - drift * 2.17 + 53.);
          vec2 slope = (a.y * axisA * .074 + a.z * crossA * .13) * 2.2
            + (b.y * axisB * .22 + b.z * crossB * .34) * .61
            + (c.y * axisC * .57 + c.z * crossC * .82) * .135
            + (d.y * axisA * 1.21 + d.z * crossA * 1.67) * .027;
          float closeDetail = 1. / (1. + pixelWidth * .55);
          slope *= mix(.72, 1., smoothstep(0., 5., shore));
          vec3 normal = normalize(vec3(-slope.x, 1., -slope.y));
          vec3 viewDirection = normalize(mix(cameraPosition - vWorld, uViewDirection, uOrthographic));
          float facing = clamp(dot(viewDirection, normal), 0., 1.);
          float fresnel = .025 + .975 * pow(1. - facing, 5.);

          vec3 deepColor = mix(vec3(.007, .115, .33), vec3(.006, .032, .073), uNight);
          vec3 shoreColor = mix(vec3(.014, .53, .43), vec3(.008, .17, .19), uNight);
          vec3 waterColor = mix(deepColor, shoreColor, shallow);
          float litFace = clamp(dot(normal, uSunDirection), 0., 1.);
          waterColor *= .76 + bottom * .14 + litFace * .31;
          // Broad ridge/flank contrast stays resolved in the map view. This is
          // surface scattering, not a painted white highlight or screen mask.
          float waveFace = clamp(.5 + slope.x * .53 - slope.y * .7, .08, .92);
          waterColor += mix(vec3(.018, .105, .14), vec3(.008, .022, .04), uNight)
            * (waveFace - .37) * (1. - shallow * .36);

          // Shallow sand caustics are broad soft curves rather than a repeated grid.
          float cellular = abs(filteredNoise(p * .29 + drift * 1.4 + slope * 2.) - .51);
          float caustic = (1. - smoothstep(.018, .065 + pixelWidth * .018, cellular))
            * (1. - smoothstep(.8, 2.4, pixelWidth));
          waterColor += vec3(.2, .3, .16) * caustic * shallow * .13 * (1. - uNight * .83);

          vec2 reflectedUV = vReflection.xy / vReflection.w;
          reflectedUV += slope * .027 * mix(.55, 1., closeDetail);
          reflectedUV = clamp(reflectedUV, vec2(.003), vec2(.997));
          // Actual rendered geometry (palms, bridges, cliffs and character), not
          // an environment image painted over the surface.
          vec2 reflectionBlur = vec2(.0015, .0009) * (1. + pixelWidth * .12);
          vec3 reflected = texture2D(tDiffuse, reflectedUV).rgb * .55
            + texture2D(tDiffuse, clamp(reflectedUV + reflectionBlur, vec2(.003), vec2(.997))).rgb * .225
            + texture2D(tDiffuse, clamp(reflectedUV - reflectionBlur, vec2(.003), vec2(.997))).rgb * .225;
          // A restrained aquatic tint keeps bright sky reflections from bleaching
          // the lagoon; the geometry in the reflection is still the actual scene.
          reflected *= mix(vec3(.49, .76, .93), vec3(.67, .82, .95), uNight);
          // Water absorbs the darkest cliff undersides: their long silhouettes
          // should not read as transparent submerged duplicate islands. Keep
          // bright sky/architecture reflection and fragment it with wave normals.
          float reflectionLight = dot(reflected, vec3(.2126, .7152, .0722));
          float reflectionStrength = clamp(.19 + fresnel * .57, .19, .72)
            * mix(.46, 1., smoothstep(.035, .24, reflectionLight));
          vec3 color = mix(waterColor, reflected, reflectionStrength);

          vec3 halfVector = normalize(uSunDirection + viewDirection);
          // Integrate subpixel normal variance into the lobe instead of allowing
          // binary sparkle/popping. Broad reflected-wave detail is independent.
          float normalVariance = dot(fwidth(normal), fwidth(normal));
          float glossPower = 96. / (1. + normalVariance * 95.);
          float gloss = pow(max(0., dot(normal, halfVector)), glossPower)
            * glossPower / 96.;
          vec3 sunColor = mix(vec3(1., .86, .61), vec3(.32, .43, .67), uNight);
          color += sunColor * gloss * .56 * (1. - uNight * .7);

          float coastalNoise = filteredNoise(p * .16 + drift * .41);
          float foamPatch = filteredNoise(p * .38 - drift * .74 + 17.);
          // Metre-scale coastal pockets leave real unpainted gaps. The slow
          // envelope is independent of the wash, not a positive floor around
          // every shore. Unresolved pockets fade instead of averaging to a ring.
          float activity = filteredNoise(p * .063 + vec2(41., -23.)) * .74
            + coastalNoise * .26;
          float activityWidth = max(.012, fwidth(activity));
          float activityResolution = 1. - smoothstep(.45, 1.35, pixelWidth * .063);
          float coastActivity = smoothstep(.43 - activityWidth, .64 + activityWidth, activity)
            * activityResolution;
          float antialias = max(.085, fwidth(shore) * 1.1);
          float edgeFoam = 1. - smoothstep(.2, .88 + antialias,
            abs(shore - .35 - sin(uTime * .68 + coastalNoise * 6.) * .24));
          float shoreBreak = smoothstep(-.7, .25, shore)
            * (1. - smoothstep(2.1, 8.3, shore));
          // Different spatial phases/speeds let neighbouring pockets break at
          // different times. Filter narrow crests separately from the envelope.
          float phase = shore * .91 - uTime * .67 + coastalNoise * 7.6;
          float secondPhase = shore * .67 - uTime * .51 + foamPatch * 9.1 + 2.3;
          float front = pow(max(0., sin(phase)), 7.)
            * (1. - smoothstep(1., 3., fwidth(phase)));
          float secondFront = pow(max(0., sin(secondPhase)), 10.)
            * (1. - smoothstep(1., 3., fwidth(secondPhase)));
          float impact = max(front, secondFront * .65);
          float foamCells = abs(filteredNoise(p * .91 + drift * 1.23
            + vec2(coastalNoise, foamPatch) * 2.4) - .49);
          float cellLines = (1. - smoothstep(.025, .13 + pixelWidth * .018, foamCells))
            * (1. - smoothstep(.65, 2.5, pixelWidth));
          float washFoam = (front * .66 + secondFront * .27) * shoreBreak
            * (.32 + foamPatch * .73) * (.52 + cellLines * .63);
          float coastalFoam = coastActivity * (edgeFoam * impact * (.65 + coastalNoise * .25)
            + washFoam + cellLines * shoreBreak * foamPatch * impact * .16);
          // Rare broad open-water breakers belong to resolved wave crests. No
          // dotted glitter layer or uniform white outline is introduced.
          float crest = smoothstep(.72, .87, a.x * .47 + b.x * .53)
            * smoothstep(.15, .31, length(slope));
          float whitecap = crest * smoothstep(5., 18., shore) * .28;
          float foam = clamp(coastalFoam + whitecap, 0., .94);
          color = mix(color, mix(vec3(.88, .97, .93), vec3(.19, .42, .46), uNight), foam);

          gl_FragColor = vec4(color, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    },
  });
  surface.name = "Reflective irregular-shore ocean";
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = WATER_LEVEL;
  surface.renderOrder = -1;
  surface.userData.reflectionResolution = compact ? 384 : 768;
  surface.userData.reflectionMaxHz = compact ? 15 : 24;
  const material = surface.material as THREE.ShaderMaterial;
  material.uniforms.uCoast.value = coastal.texture;
  // Keep the addon's live textureMatrix/reference intact: merging/cloning these
  // uniforms would detach reflection updates and clone render-target textures.
  material.uniforms = { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...material.uniforms };
  material.fog = true;
  group.add(surface);

  const reflectionPass = surface.onBeforeRender.bind(surface);
  const lastView = new THREE.Matrix4(), lastProjection = new THREE.Matrix4();
  const viewDirection = material.uniforms.uViewDirection.value as THREE.Vector3;
  let lastReflection = -Infinity, reduced = false, dirty = true, disposed = false;
  surface.onBeforeRender = (renderer, scene, camera, drawGeometry, drawMaterial, renderGroup) => {
    if (disposed) return;
    camera.getWorldDirection(viewDirection).negate();
    material.uniforms.uOrthographic.value = camera instanceof THREE.OrthographicCamera ? 1 : 0;
    const cameraChanged = !lastView.equals(camera.matrixWorld) || !lastProjection.equals(camera.projectionMatrix);
    const now = performance.now();
    if (!dirty && ((reduced && !cameraChanged) || now - lastReflection < 1000 / (compact ? 15 : 24))) return;
    lastView.copy(camera.matrixWorld);
    lastProjection.copy(camera.projectionMatrix);
    lastReflection = now;
    dirty = false;
    const previousTarget = renderer.getRenderTarget();
    const previousXR = renderer.xr.enabled, previousShadowUpdate = renderer.shadowMap.autoUpdate;
    try {
      reflectionPass(renderer, scene, camera, drawGeometry, drawMaterial, renderGroup);
    } finally {
      // Also restore ownership boundaries if a renderer/context error interrupts
      // the addon's nested render; never strand the application in reflection mode.
      surface.visible = true;
      renderer.xr.enabled = previousXR;
      renderer.shadowMap.autoUpdate = previousShadowUpdate;
      renderer.setRenderTarget(previousTarget);
    }
  };

  return {
    group,
    update(time, reducedMotion) {
      if (disposed) return;
      if (reduced !== reducedMotion) dirty = true;
      reduced = reducedMotion;
      material.uniforms.uTime.value = reduced ? 0 : time;
    },
    setNight(night) {
      material.uniforms.uNight.value = night ? 1 : 0;
      dirty = true;
    },
    setSunDirection(x, y, z) {
      const direction = material.uniforms.uSunDirection.value as THREE.Vector3;
      if (Number.isFinite(x + y + z) && x * x + y * y + z * z > 0) direction.set(x, y, z).normalize();
      dirty = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      surface.onBeforeRender = () => undefined;
      geometry.dispose();
      coastal.texture.dispose();
      surface.dispose();
      group.clear();
    },
  };
}
