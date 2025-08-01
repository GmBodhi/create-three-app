import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  pass,
  color,
  mx_worley_noise_float,
  time,
  screenUV,
  vec2,
  uv,
  normalWorld,
  mx_fractal_noise_vec3,
} from "three/tsl";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, sceneMain, scenePortal, renderer;
let clock;

const mixers = [];

init();

function init() {
  //

  sceneMain = new Scene();
  sceneMain.background = new Color(0x222222);
  sceneMain.backgroundNode = normalWorld.y.mix(
    color(0x0066ff),
    color(0xff0066)
  );

  scenePortal = new Scene();
  scenePortal.backgroundNode = mx_worley_noise_float(
    normalWorld.mul(20).add(vec2(0, time.oneMinus()))
  ).mul(color(0x0066ff));

  //

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    30
  );
  camera.position.set(2.5, 1, 3);
  camera.position.multiplyScalar(0.8);
  camera.lookAt(0, 1, 0);

  clock = new Clock();

  // lights

  const light = new PointLight(0xffffff, 1);
  light.position.set(0, 1, 5);
  light.power = 17000;

  sceneMain.add(new HemisphereLight(0xff0066, 0x0066ff, 7));
  sceneMain.add(light);
  scenePortal.add(light.clone());

  // models

  const loader = new GLTFLoader();
  loader.load("models/gltf/Xbot.glb", function (gltf) {
    const createModel = (colorNode = null) => {
      let object;

      if (mixers.length === 0) {
        object = gltf.scene;
      } else {
        object = gltf.scene.clone();

        const children = object.children[0].children;

        const applyFX = (index) => {
          children[index].material = children[index].material.clone();
          children[index].material.colorNode = colorNode;
          children[index].material.wireframe = true;
        };

        applyFX(0);
        applyFX(1);
      }

      const mixer = new AnimationMixer(object);

      const action = mixer.clipAction(gltf.animations[6]);
      action.play();

      mixers.push(mixer);

      return object;
    };

    const colorNode = mx_fractal_noise_vec3(uv().mul(20).add(time));

    const modelMain = createModel();
    const modelPortal = createModel(colorNode);

    // model portal

    sceneMain.add(modelMain);
    scenePortal.add(modelPortal);
  });

  // portal

  const geometry = new PlaneGeometry(1.7, 2);

  const material = new MeshBasicNodeMaterial();
  material.colorNode = pass(scenePortal, camera).context({
    getUV: () => screenUV,
  });
  material.opacityNode = uv().distance(0.5).remapClamp(0.3, 0.5).oneMinus();
  material.side = DoubleSide;
  material.transparent = true;

  const plane = new Mesh(geometry, material);
  plane.position.set(0, 1, 0.8);
  sceneMain.add(plane);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = LinearToneMapping;
  renderer.toneMappingExposure = 0.15;
  document.body.appendChild(renderer.domElement);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  for (const mixer of mixers) {
    mixer.update(delta);
  }

  renderer.render(sceneMain, camera);
}
