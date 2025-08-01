import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  Fn,
  vec4,
  fract,
  abs,
  uniform,
  pow,
  color,
  max,
  length,
  rangeFogFactor,
  sub,
  reflector,
  normalWorld,
  hue,
  time,
  mix,
  positionWorld,
} from "three/tsl";

import { hashBlur } from "three/addons/tsl/display/hashBlur.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer;
let model, mixer, clock;
let controls;
let stats;
let gui;

init();

async function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.25,
    30
  );
  camera.position.set(-2.5, 2, 2.5);
  camera.lookAt(0, 0.4, 0);

  scene = new Scene();
  scene.backgroundNode = hue(
    normalWorld.y.mix(0, color(0x0066ff)).mul(0.1),
    time
  );

  const waterAmbientLight = new HemisphereLight(0xffffff, 0x0066ff, 10);
  scene.add(waterAmbientLight);

  clock = new Clock();

  // animated model

  const gltfLoader = new GLTFLoader();
  gltfLoader.load("models/gltf/Michelle.glb", function (gltf) {
    model = gltf.scene;
    model.children[0].children[0].castShadow = true;

    mixer = new AnimationMixer(model);

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    scene.add(model);
  });

  // textures

  const textureLoader = new TextureLoader();

  const uvMap = textureLoader.load("textures/uv_grid_directx.jpg");
  uvMap.colorSpace = SRGBColorSpace;

  // uv map for debugging

  const uvMaterial = new MeshStandardNodeMaterial({
    map: uvMap,
    side: DoubleSide,
  });

  const uvMesh = new Mesh(new PlaneGeometry(2, 2), uvMaterial);
  uvMesh.position.set(0, 1, -3);
  scene.add(uvMesh);

  // circle effect

  const drawCircle = Fn(
    ([pos, radius, width, power, color, timer = time.mul(0.5)]) => {
      // https://www.shadertoy.com/view/3tdSRn

      const dist1 = length(pos);
      dist1.assign(fract(dist1.mul(5.0).sub(fract(timer))));
      const dist2 = dist1.sub(radius);
      const intensity = pow(radius.div(abs(dist2)), width);
      const col = color.rgb
        .mul(intensity)
        .mul(power)
        .mul(max(sub(0.8, abs(dist2)), 0.0));

      return col;
    }
  );

  const circleFadeY = positionWorld.y.mul(0.7).oneMinus().max(0);
  const animatedColor = mix(
    color(0x74ccf4),
    color(0x7f00c5),
    positionWorld.xz.distance(0).div(10).clamp()
  );
  const animatedCircle = hue(
    drawCircle(positionWorld.xz.mul(0.1), 0.5, 0.8, 0.01, animatedColor).mul(
      circleFadeY
    ),
    time
  );

  const floorLight = new PointLight(0xffffff);
  floorLight.colorNode = animatedCircle.mul(50);
  scene.add(floorLight);

  // reflection

  const roughness = uniform(0.9);
  const radius = uniform(0.2);

  const reflection = reflector({
    resolution: 0.5,
    depth: true,
    bounces: false,
  }); // 0.5 is half of the rendering view
  const reflectionDepth = reflection.getDepthNode();
  reflection.target.rotateX(-Math.PI / 2);
  scene.add(reflection.target);

  const floorMaterial = new MeshStandardNodeMaterial();
  floorMaterial.transparent = true;
  floorMaterial.colorNode = Fn(() => {
    // ranges adjustment

    const radiusRange = mix(0.01, 0.1, radius); // range [ 0.01, 0.1 ]
    const roughnessRange = mix(0.3, 0.03, roughness); // range [ 0.03, 0.3 ]

    // blur the reflection

    const reflectionBlurred = hashBlur(reflection, radiusRange, {
      repeats: 40,
      mask: reflectionDepth,
      premultipliedAlpha: true,
    });

    // reflection composite

    const reflectionMask = reflectionBlurred.a
      .mul(reflectionDepth)
      .remapClamp(0, roughnessRange);
    const reflectionIntensity = 0.1;
    const reflectionMixFactor = reflectionMask.mul(roughness.mul(2).min(1));
    const reflectionFinal = mix(
      reflection.rgb,
      reflectionBlurred.rgb,
      reflectionMixFactor
    ).mul(reflectionIntensity);

    // mix reflection with animated circle

    const output = animatedCircle.add(reflectionFinal);

    // falloff opacity by distance like an opacity-fog

    const opacity = rangeFogFactor(7, 25).oneMinus();

    // final output

    return vec4(output, opacity);
  })();

  const floor = new Mesh(new BoxGeometry(50, 0.001, 50), floorMaterial);
  floor.position.set(0, 0, 0);
  scene.add(floor);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.3;
  document.body.appendChild(renderer.domElement);

  gui = new GUI();
  gui.add(roughness, "value", 0, 1).name("roughness");
  gui.add(radius, "value", 0, 1).name("radius");
  gui.add(reflection.reflector, "resolution", 0.25, 1).name("resolution");

  stats = new Stats();
  document.body.appendChild(stats.dom);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2;
  //controls.autoRotate = true;
  controls.autoRotateSpeed = -0.1;
  controls.target.set(0, 0.5, 0);
  controls.update();

  // events

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  stats.update();

  controls.update();

  const delta = clock.getDelta();

  if (model) {
    mixer.update(delta);
  }

  renderer.render(scene, camera);
}
