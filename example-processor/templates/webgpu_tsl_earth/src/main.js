import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  step,
  normalWorldGeometry,
  output,
  texture,
  vec3,
  vec4,
  normalize,
  positionWorld,
  bumpMap,
  cameraPosition,
  color,
  uniform,
  mix,
  uv,
  max,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, controls, globe, clock;

init();

function init() {
  clock = new Clock();

  camera = new PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(4.5, 2, 3);

  scene = new Scene();

  // sun

  const sun = new DirectionalLight("#ffffff", 2);
  sun.position.set(0, 0, 3);
  scene.add(sun);

  // uniforms

  const atmosphereDayColor = uniform(color("#4db2ff"));
  const atmosphereTwilightColor = uniform(color("#bc490b"));
  const roughnessLow = uniform(0.25);
  const roughnessHigh = uniform(0.35);

  // textures

  const textureLoader = new TextureLoader();

  const dayTexture = textureLoader.load(
    "three/examples/textures/planets/earth_day_4096.jpg"
  );
  dayTexture.colorSpace = SRGBColorSpace;
  dayTexture.anisotropy = 8;

  const nightTexture = textureLoader.load(
    "three/examples/textures/planets/earth_night_4096.jpg"
  );
  nightTexture.colorSpace = SRGBColorSpace;
  nightTexture.anisotropy = 8;

  const bumpRoughnessCloudsTexture = textureLoader.load(
    "three/examples/textures/planets/earth_bump_roughness_clouds_4096.jpg"
  );
  bumpRoughnessCloudsTexture.anisotropy = 8;

  // fresnel

  const viewDirection = positionWorld.sub(cameraPosition).normalize();
  const fresnel = viewDirection
    .dot(normalWorldGeometry)
    .abs()
    .oneMinus()
    .toVar();

  // sun orientation

  const sunOrientation = normalWorldGeometry
    .dot(normalize(sun.position))
    .toVar();

  // atmosphere color

  const atmosphereColor = mix(
    atmosphereTwilightColor,
    atmosphereDayColor,
    sunOrientation.smoothstep(-0.25, 0.75)
  );

  // globe

  const globeMaterial = new MeshStandardNodeMaterial();

  const cloudsStrength = texture(bumpRoughnessCloudsTexture, uv()).b.smoothstep(
    0.2,
    1
  );

  globeMaterial.colorNode = mix(
    texture(dayTexture),
    vec3(1),
    cloudsStrength.mul(2)
  );

  const roughness = max(
    texture(bumpRoughnessCloudsTexture).g,
    step(0.01, cloudsStrength)
  );
  globeMaterial.roughnessNode = roughness.remap(
    0,
    1,
    roughnessLow,
    roughnessHigh
  );

  const night = texture(nightTexture);
  const dayStrength = sunOrientation.smoothstep(-0.25, 0.5);

  const atmosphereDayStrength = sunOrientation.smoothstep(-0.5, 1);
  const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0, 1);

  let finalOutput = mix(night.rgb, output.rgb, dayStrength);
  finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix);

  globeMaterial.outputNode = vec4(finalOutput, output.a);

  const bumpElevation = max(
    texture(bumpRoughnessCloudsTexture).r,
    cloudsStrength
  );
  globeMaterial.normalNode = bumpMap(bumpElevation);

  const sphereGeometry = new SphereGeometry(1, 64, 64);
  globe = new Mesh(sphereGeometry, globeMaterial);
  scene.add(globe);

  // atmosphere

  const atmosphereMaterial = new MeshBasicNodeMaterial({
    side: BackSide,
    transparent: true,
  });
  let alpha = fresnel.remap(0.73, 1, 1, 0).pow(3);
  alpha = alpha.mul(sunOrientation.smoothstep(-0.5, 1));
  atmosphereMaterial.outputNode = vec4(atmosphereColor, alpha);

  const atmosphere = new Mesh(sphereGeometry, atmosphereMaterial);
  atmosphere.scale.setScalar(1.04);
  scene.add(atmosphere);

  // debug

  const gui = new GUI();

  gui
    .addColor(
      { color: atmosphereDayColor.value.getHex(SRGBColorSpace) },
      "color"
    )
    .onChange((value) => {
      atmosphereDayColor.value.set(value);
    })
    .name("atmosphereDayColor");

  gui
    .addColor(
      { color: atmosphereTwilightColor.value.getHex(SRGBColorSpace) },
      "color"
    )
    .onChange((value) => {
      atmosphereTwilightColor.value.set(value);
    })
    .name("atmosphereTwilightColor");

  gui.add(roughnessLow, "value", 0, 1, 0.001).name("roughnessLow");
  gui.add(roughnessHigh, "value", 0, 1, 0.001).name("roughnessHigh");

  // renderer

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  const delta = clock.getDelta();
  globe.rotation.y += delta * 0.025;

  controls.update();

  renderer.render(scene, camera);
}
