import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  Clock,
  AnimationMixer,
  DoubleSide,
  Mesh,
  BoxGeometry,
  LinearToneMapping,
} from "three";
import {
  color,
  depth,
  depthTexture,
  toneMapping,
  viewportSharedTexture,
  viewportMipTexture,
  viewportTopLeft,
  checker,
  uv,
  modelScale,
  MeshBasicNodeMaterial,
} from "three/nodes";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer;
let mixer, clock;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.25,
    25
  );
  camera.position.set(3, 2, 3);

  scene = new Scene();
  scene.background = new Color(0x333333);
  camera.lookAt(0, 1, 0);

  clock = new Clock();

  // model

  const loader = new GLTFLoader();
  loader.load("models/gltf/Michelle.glb", function (gltf) {
    const object = gltf.scene;
    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    scene.add(object);
  });

  // volume

  const depthDistance = depthTexture().distance(depth);
  const depthAlphaNode = depthDistance
    .oneMinus()
    .smoothstep(0.9, 2)
    .mul(20)
    .saturate();
  const depthBlurred = viewportMipTexture().bicubic(
    depthDistance
      .smoothstep(0, 0.6)
      .mul(40 * 5)
      .clamp(0, 5)
  );

  const blurredBlur = new MeshBasicNodeMaterial();
  blurredBlur.backdropNode = depthBlurred.add(
    depthAlphaNode.mix(color(0x0066ff), 0)
  );
  blurredBlur.transparent = true;
  blurredBlur.side = DoubleSide;

  const volumeMaterial = new MeshBasicNodeMaterial();
  volumeMaterial.colorNode = color(0x0066ff);
  volumeMaterial.backdropNode = viewportSharedTexture();
  volumeMaterial.backdropAlphaNode = depthAlphaNode;
  volumeMaterial.transparent = true;
  volumeMaterial.side = DoubleSide;

  const depthMaterial = new MeshBasicNodeMaterial();
  depthMaterial.backdropNode = depthAlphaNode;
  depthMaterial.transparent = true;
  depthMaterial.side = DoubleSide;

  const bicubicMaterial = new MeshBasicNodeMaterial();
  bicubicMaterial.backdropNode = viewportMipTexture().bicubic(5); // @TODO: Move to alpha value [ 0, 1 ]
  bicubicMaterial.backdropAlphaNode = checker(uv().mul(3).mul(modelScale.xy));
  bicubicMaterial.opacityNode = bicubicMaterial.backdropAlphaNode;
  bicubicMaterial.transparent = true;
  bicubicMaterial.side = DoubleSide;

  const pixelMaterial = new MeshBasicNodeMaterial();
  pixelMaterial.backdropNode = viewportSharedTexture(
    viewportTopLeft.mul(100).floor().div(100)
  );
  pixelMaterial.transparent = true;

  // box / floor

  const box = new Mesh(new BoxGeometry(2, 2, 2), volumeMaterial);
  box.position.set(0, 1, 0);
  scene.add(box);

  const floor = new Mesh(
    new BoxGeometry(1.99, 0.01, 1.99),
    new MeshBasicNodeMaterial({ color: 0x333333 })
  );
  floor.position.set(0, 0, 0);
  scene.add(floor);

  // renderer

  renderer = new WebGPURenderer();
  renderer.stencil = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMappingNode = toneMapping(LinearToneMapping, 0.15);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  // gui

  const materials = {
    blurred: blurredBlur,
    volume: volumeMaterial,
    depth: depthMaterial,
    bicubic: bicubicMaterial,
    pixel: pixelMaterial,
  };

  const gui = new GUI();
  const options = { material: "blurred" };

  box.material = materials[options.material];

  gui.add(box.scale, "x", 0.1, 2, 0.01);
  gui.add(box.scale, "z", 0.1, 2, 0.01);
  gui.add(options, "material", Object.keys(materials)).onChange((name) => {
    box.material = materials[name];
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
