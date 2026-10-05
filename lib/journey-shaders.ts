// One seeded field remains alive for the full page. Its topology changes with
// the scroll narrative; dust, surface and UI-like detail share the same map.
export const readingMask = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uDpr;
  uniform vec4 uTextRects[8];
  float readingMask() {
    vec2 pixel = vec2(gl_FragCoord.x/uDpr,uResolution.y-gl_FragCoord.y/uDpr);
    float visibility = 1.0;
    for (int i=0; i<8; i++) {
      vec4 r=uTextRects[i];
      if (r.z<=r.x) continue;
      vec2 d=abs(pixel-(r.xy+r.zw)*.5)-(r.zw-r.xy)*.5;
      float outside=length(max(d,0.0));
      visibility=min(visibility,mix(.12,1.0,smoothstep(0.0,64.0,outside)));
    }
    return visibility;
  }
`;

export const journeyField = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uEnergy;
  uniform vec2 uSelection;
  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;
  mat2 turn(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
  float smoother(float x) { return x*x*x*(x*(x*6.0-15.0)+10.0); }

  // Seven reference-led keyframes share one parameter space and one current:
  // signal, profile routes, education scans, skill strata, project artifacts,
  // delivery channels, and an open contact passage.
  vec3 form(float stage, vec2 uv, float layer) {
    float u = uv.x, v = uv.y;
    float band = layer - 2.0;
    float angle = u * TAU;
    float time = uTime * .16;
    vec3 p;
    if (stage < .5) {
      // A quiet source cloud tightens into one fine S-current, as in keyframe 01.
      float source = exp(-u*7.0);
      float width = mix(1.2,.24,smoothstep(.0,.34,u));
      float curve = sin(u*TAU*.94 + time*.45)*.58
        + sin(u*TAU*.47-time*.24)*.19;
      p = vec3((u-.5)*5.9,
        curve + (v-.5)*width + band*.075,
        sin(u*TAU*1.25-time+band*.26)*.26 + cos(v*PI)*.16
          + band*.035 + source*(v-.5)*.3);
      p.yz = turn(-.31) * p.yz;
    } else if (stage < 1.5) {
      // Three primary routes branch from, and return to, the same signal.
      float route = floor((layer+.5)*.5)-1.0;
      float split = smoothstep(.16,.72,u);
      float rejoin = smoothstep(.72,.98,u);
      float bend = sin(u*TAU*.78+time*.35)*.28;
      float branch = route*.72*split*(1.0-rejoin*.78);
      float width = .12+.10*smoothstep(.74,.98,u);
      float junction = exp(-pow((u-.52)*8.0,2.0));
      p = vec3((u-.5)*5.8,
        bend+branch+(v-.5)*width+band*.035,
        .12*sin(u*TAU+time*.45+route*.3)+route*.075
          + junction*(v-.5)*.36+band*.028);
      p.yz = turn(-.19) * p.yz;
    } else if (stage < 2.5) {
      // A warped measurement mesh is crossed by three education/research gates.
      float arch = sin(u*PI);
      float x = (u-.5)*5.15;
      float y = (v-.5)*2.75;
      float dx = (u-.53)*3.3, dy = (v-.52)*3.0;
      float scanObject = exp(-dx*dx-dy*dy);
      float gates = exp(-pow((u-.2)*17.0,2.0))
        + exp(-pow((u-.5)*17.0,2.0))
        + exp(-pow((u-.8)*17.0,2.0));
      float ridges = sin(u*TAU*2.2+time*.28)*cos(v*TAU*1.7-time*.18)*.34;
      float depth = scanObject*1.12 + sin(u*TAU*1.65+time*.42)*.48*arch
        + cos(v*TAU+u*PI*2.0)*.40 + ridges + gates*sin(v*PI)*.14
        + band*.09;
      p = vec3(x+sin(v*TAU+u*PI)*.28*scanObject,y,depth);
      p.xz = turn(.13) * p.xz;
    } else if (stage < 3.5) {
      // Five legible horizontal layers share one bright technical spine.
      float spine = exp(-abs(u-.5)*34.0)*.28;
      float ripple = sin(u*TAU*1.4+time+band*.4)*.045
        + cos(v*TAU*1.3-time*.35)*.035;
      p = vec3((u-.5)*5.0,
        band*.61 + spine + ripple,
        (v-.5)*3.05 + .12*sin(u*TAU+time+band*.22));
      p.xz = turn(.08) * p.xz;
    } else if (stage < 4.5) {
      // Five project artifacts sit along the living current, not in a dead row.
      float offset = layer-2.0;
      float tilt = offset*.13;
      vec2 face = vec2((u-.5)*.84,(v-.5)*1.38);
      face = turn(tilt)*face;
      float path = sin(offset*.72)*.46;
      float current = exp(-abs(v-.5)*18.0)*.12;
      p = vec3(offset*1.23+face.x,
        path+face.y+current*sin(u*TAU+time*.4),
        .54-abs(offset)*.25+.10*sin(u*PI*2.0+time*.35)*sin(v*PI));
      p.xz = turn(-tilt*.45) * p.xz;
    } else if (stage < 5.5) {
      // The vision scan resolves into two stable delivery channels/checkpoints.
      float x = (u-.5)*6.15;
      float research = exp(-pow((u-.31)*13.0,2.0));
      float delivery = exp(-pow((u-.74)*13.0,2.0));
      float milestone = research*.34+delivery*.42;
      float gates = exp(-pow((u-.31)*19.0,2.0))
        + exp(-pow((u-.74)*19.0,2.0));
      float laneGroup = band < 0.0 ? -1.0 : (band > 0.0 ? 1.0 : 0.0);
      float lane = laneGroup*.31+band*.035;
      float wave = sin(x*1.22+time*.58+band*.23)*.52
        + sin(x*2.18-time*.32+band*.31)*.19;
      float checkpoint = gates*sin(v*PI);
      p = vec3(x,
        lane+wave*.62+milestone*(.42+.52*sin(v*PI))+checkpoint*.28,
        (v-.5)*1.72 + cos(x*1.1-time*.4+band*.2)*.19+checkpoint*.72);
      p.yz = turn(.13) * p.yz;
    } else {
      // An unfinished C-shaped passage stays open; no petal ring or central orb.
      float a = (u*.82+.09)*TAU + time*.025;
      float radius = .78 + v*1.38 + band*.045;
      p = vec3(cos(a)*radius,
        sin(a)*radius,
        cos(a*1.35+time*.34+v*PI)*.16+band*.065
          + (v-.5)*.12*sin(a));
    }
    return p;
  }

  vec3 field(vec2 uv, float layer) {
    float progress = clamp(uProgress,0.0,6.0);
    float stage = min(floor(progress),5.0);
    float f = progress-stage;
    float blend = smoother(f);
    vec3 a = form(stage,uv,layer);
    vec3 b = form(stage+1.0,uv,layer);
    vec3 p = mix(a,b,blend);
    // A restrained depth fold makes transitions feel like one object turning,
    // not seven hard scene cuts. Scroll remains the direct source of progress.
    float transit = 4.0*f*(1.0-f);
    p.z += transit*(.16*sin(uv.x*TAU*2.0+uTime*.5)+.09*cos(uv.y*TAU*3.0-uTime*.3));
    p.xy = turn(transit*.075)*p.xy;
    p *= 1.0 + uEnergy*.032*sin(uv.y*18.0-uTime*3.0);
    return p;
  }
`;

export const surfaceVertex = /* glsl */ `
  ${journeyField}
  attribute float aLayer;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vLayer;
  void main() {
    vec3 p = field(uv,aLayer);
    vec4 world = modelMatrix*vec4(p,1.0);
    vWorld = world.xyz; vUv = uv; vLayer = aLayer;
    gl_Position = projectionMatrix*viewMatrix*world;
  }
`;

export const surfaceFragment = /* glsl */ `
  ${readingMask}
  uniform float uTime;
  uniform float uIntro;
  uniform float uDark;
  uniform float uProgress;
  uniform float uEnergy;
  uniform float uVeil;
  uniform vec2 uSelection;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vLayer;
  float lines(float coord) {
    float d = abs(fract(coord-.5)-.5);
    return 1.0-smoothstep(0.0,max(fwidth(coord)*1.2,.012),d);
  }
  void main() {
    vec3 normal = normalize(cross(dFdx(vWorld),dFdy(vWorld)));
    vec3 view = normalize(cameraPosition-vWorld);
    float rim = pow(1.0-abs(dot(normal,view)),2.25);
    float light = abs(dot(normal,normalize(vec3(-.5,1.0,1.3))));
    float grid = max(lines(vUv.x*72.0),lines(vUv.y*28.0)*.62);
    float edge = pow(abs(vUv.y-.5)*2.0,17.0);
    float flow = pow(.5+.5*sin(vUv.x*39.0-vUv.y*18.0-uTime*.78),13.0);
    float signal = 1.0-smoothstep(.35,1.05,abs(uProgress));
    float architecture = 1.0-smoothstep(.35,1.05,abs(uProgress-1.0));
    float scanning = 1.0-smoothstep(.35,1.05,abs(uProgress-2.0));
    float strata = 1.0-smoothstep(.35,1.05,abs(uProgress-3.0));
    float projects = 1.0-smoothstep(.35,1.05,abs(uProgress-4.0));
    float delivery = 1.0-smoothstep(.35,1.05,abs(uProgress-5.0));
    float aperture = 1.0-smoothstep(.35,1.05,abs(uProgress-6.0));

    // Three fixed calibration gates plus one slowly travelling scan pulse.
    float scanX = fract(uTime*.095+.14);
    float educationGates = max(exp(-pow((vUv.x-.2)*75.0,2.0)),
      max(exp(-pow((vUv.x-.5)*75.0,2.0)),exp(-pow((vUv.x-.8)*75.0,2.0))));
    float scanBand = max(educationGates*.48,exp(-pow((vUv.x-scanX)*72.0,2.0)))*scanning;
    // Five compact artifact frames keep the technical grid quiet on projects.
    vec2 edgeDistance = min(vUv,1.0-vUv);
    float panelFrame = 1.0-smoothstep(.004,.018,min(edgeDistance.x,edgeDistance.y));
    float header = 1.0-smoothstep(.018,.045,abs(vUv.y-.91));
    vec2 imageBox = abs(vUv-vec2(.34,.58))-vec2(.22,.23);
    float imageWell = 1.0-smoothstep(.0,.035,length(max(imageBox,0.0)));
    float titleRule = 1.0-smoothstep(.006,.018,abs(vUv.y-.82));
    float contentRows = max(lines(vUv.y*11.0),lines(vUv.y*17.0)*.45)*step(.13,vUv.y)*(1.0-step(.40,vUv.y));
    float textA = (1.0-smoothstep(.006,.02,abs(vUv.y-.37)))*step(.11,vUv.x)*(1.0-step(.87,vUv.x));
    float textB = (1.0-smoothstep(.006,.02,abs(vUv.y-.28)))*step(.11,vUv.x)*(1.0-step(.76,vUv.x));
    float textC = (1.0-smoothstep(.006,.02,abs(vUv.y-.19)))*step(.11,vUv.x)*(1.0-step(.68,vUv.x));
    float textLines = max(textA,max(textB,textC));
    float sideRail = 1.0-smoothstep(.015,.038,abs(vUv.x-.78))*step(.43,vUv.y)*(1.0-step(.76,vUv.y));
    float status = 1.0-smoothstep(.018,.055,length(vUv-vec2(.82,.91)));
    grid *= 1.0-projects*.84;
    float imageGrid = max(lines(vUv.x*7.0),lines(vUv.y*7.0)) * imageWell;
    float panelUI = (panelFrame*1.35+header*.9+imageWell*.44+imageGrid*.3+titleRule*.9+contentRows*.35+textLines*.95+sideRail*.48+status*.7)*projects;
    float skillSpine = exp(-abs(vUv.x-.5)*110.0)*strata;
    float routePulse = pow(.5+.5*sin(vUv.x*27.0-uTime*1.7+vLayer*.9),8.0)*delivery;

    float stage = floor(uProgress+.5);
    float selectStage = 1.0-smoothstep(.22,.66,abs(stage-uSelection.x));
    float selectLayer = 1.0-smoothstep(.18,.62,abs(vLayer-uSelection.y));
    float selected = selectStage*selectLayer*uEnergy;
    float detail = max(flow*mix(.3,1.0,signal),
      max(scanBand*.9,max(panelUI,max(skillSpine*.8,routePulse*.9))));
    detail = max(detail,selected*.95);
    float scanShape = exp(-pow((vUv.x-.53)*3.3,4.0)-pow((vUv.y-.52)*3.0,4.0))*scanning;

    vec3 violet = mix(vec3(.20,.07,.55),vec3(.42,.19,.88),uDark);
    vec3 silver = mix(vec3(.38,.21,.72),vec3(.91,.84,1.0),uDark);
    vec3 color = mix(violet,silver,clamp(rim*.62+grid*.30+edge*.7+detail*.8,0.0,1.0));
    color *= .68+light*.32;
    color += vec3(.43,.16,.95)*detail*(.32+uDark*.45);
    float alpha = .025+rim*.17+grid*.16+edge*.38*(1.0-scanning*.82)+detail*.14+scanShape*.10;
    alpha += (architecture*.035+scanning*.025+projects*.035+aperture*.025);
    alpha += projects*(.035+panelFrame*.14+header*.06+imageWell*.045+titleRule*.075+textLines*.09+sideRail*.025+status*.05);
    alpha *= (1.0-vLayer*.035)*uIntro*uVeil;
    float themeContrast = mix(2.7,1.0,uDark);
    gl_FragColor = vec4(color,clamp((alpha+uEnergy*detail*.10)*themeContrast,0.0,.86)*readingMask());
  }
`;

export const dustVertex = /* glsl */ `
  ${journeyField}
  attribute vec4 aSeed;
  uniform float uDpr;
  varying float vAlpha;
  varying float vSeed;
  varying vec2 vUv;
  void main() {
    float phase = aSeed.x*TAU+uTime*.12+aSeed.w*TAU;
    // Bounded drift preserves particle identity and never wraps at open edges.
    float u = aSeed.x+sin(phase+aSeed.z*TAU)*sin(aSeed.x*PI)*.022;
    vec2 uv = vec2(u,aSeed.y);
    vec3 p = field(uv,floor(aSeed.z*5.0));
    float progress = clamp(uProgress,0.0,6.0);
    float sourceCloud = 1.0-smoothstep(.08,.42,aSeed.x);
    float heroVolume = 1.0-smoothstep(.35,.92,progress);
    float scanVolume = 1.0-smoothstep(.35,1.0,abs(progress-2.0));
    float volume = .11+heroVolume*(.42+sourceCloud*.52)+scanVolume*.20;
    vec3 direction = normalize(vec3(sin(phase*37.0),cos(phase*23.0),sin(phase*17.0)));
    p += direction*volume*(.28+aSeed.w*.9);
    vec4 mv = modelViewMatrix*vec4(p,1.0);
    gl_Position = projectionMatrix*mv;
    gl_PointSize = clamp((1.35+pow(aSeed.w,5.5)*4.5)*uDpr*10.0/max(3.0,-mv.z),1.0,12.0);
    vAlpha = (.30+.70*aSeed.w)*(.82+.18*sin(uTime*.55+aSeed.x*42.0));
    vSeed = aSeed.w;
    vUv = uv;
  }
`;

export const dustFragment = /* glsl */ `
  ${readingMask}
  uniform float uIntro;
  uniform float uDark;
  uniform float uVeil;
  uniform float uTime;
  uniform float uProgress;
  uniform float uEnergy;
  varying float vAlpha;
  varying float vSeed;
  varying vec2 vUv;
  void main() {
    float r = length(gl_PointCoord-.5)*2.0;
    if(r>1.0) discard;
    float scan = 1.0-smoothstep(.35,1.05,abs(uProgress-2.0));
    float scanPulse = exp(-pow((vUv.x-fract(uTime*.095+.14))*54.0,2.0))*scan;
    float flare = .68+scanPulse*.75+uEnergy*.2;
    vec3 color = mix(vec3(.36,.12,.82),vec3(.93,.86,1.0),pow(vSeed,3.0)*uDark);
    float halo = exp(-r*r*4.0)+exp(-r*r*1.35)*.17;
    float projectScene = 1.0-smoothstep(.28,.82,abs(uProgress-4.0));
    float pointClarity = mix(1.0,.12,projectScene);
    float themeContrast = mix(2.1,1.0,uDark);
    gl_FragColor = vec4(color,halo*vAlpha*flare*pointClarity*themeContrast*uIntro*uVeil*readingMask());
  }
`;
