import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  TextureLoader,
  RepeatWrapping,
  PlaneGeometry,
  Vector2,
  AmbientLight,
  DirectionalLight,
  WebGPURenderer,
  NeutralToneMapping,
  PostProcessing,
} from "three";

import { pass, mrt, output, emissive, color, screenUV } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { WaterMesh } from "three/addons/objects/Water2Mesh.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, water, postProcessing, controls;

const params = {
  color: "#ffffff",
  scale: 2,
  flowX: 0.25,
  flowY: 0.25,
};

init();

async function init() {
  // scene

  scene = new Scene();
  scene.backgroundNode = screenUV
    .distance(0.5)
    .remap(0, 0.5)
    .mix(color(0x666666), color(0x111111));

  // camera

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(-25, 10, -25);
  camera.lookAt(scene.position);

  // asset loading

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  const textureLoader = new TextureLoader();

  const [gltf, normalMap0, normalMap1] = await Promise.all([
    gltfLoader.loadAsync("models/gltf/pool.glb"),
    textureLoader.loadAsync("textures/water/Water_1_M_Normal.jpg"),
    textureLoader.loadAsync("textures/water/Water_2_M_Normal.jpg"),
  ]);

  gltf.scene.scale.setScalar(0.1);
  scene.add(gltf.scene);

  // water

  normalMap0.wrapS = normalMap0.wrapT = RepeatWrapping;
  normalMap1.wrapS = normalMap1.wrapT = RepeatWrapping;

  const waterGeometry = new PlaneGeometry(30, 40);

  water = new WaterMesh(waterGeometry, {
    color: params.color,
    scale: params.scale,
    flowDirection: new Vector2(params.flowX, params.flowY),
    normalMap0: normalMap0,
    normalMap1: normalMap1,
  });

  water.position.set(0, 0.2, -2);
  water.rotation.x = Math.PI * -0.5;
  water.renderOrder = Infinity;
  scene.add(water);

  // light

  const ambientLight = new AmbientLight(0xccccccc, 0.4);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xf435ab, 3);
  directionalLight.position.set(-1, 1, 1);
  scene.add(directionalLight);

  // renderer

  renderer = new WebGPURenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = NeutralToneMapping;
  document.body.appendChild(renderer.domElement);

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  scenePass.setMRT(
    mrt({
      output,
      emissive,
    })
  );

  const outputPass = scenePass.getTextureNode();
  const emissivePass = scenePass.getTextureNode("emissive");

  const bloomPass = bloom(emissivePass);

  postProcessing.outputNode = outputPass.add(bloomPass);

  // gui

  const gui = new GUI();
  const waterNode = water.material.colorNode;

  gui.addColor(params, "color").onChange(function (value) {
    waterNode.color.value.set(value);
  });
  gui.add(params, "scale", 1, 10).onChange(function (value) {
    waterNode.scale.value = value;
  });
  gui
    .add(params, "flowX", -1, 1)
    .step(0.01)
    .onChange(function (value) {
      waterNode.flowDirection.value.x = value;
      waterNode.flowDirection.value.normalize();
    });
  gui
    .add(params, "flowY", -1, 1)
    .step(0.01)
    .onChange(function (value) {
      waterNode.flowDirection.value.y = value;
      waterNode.flowDirection.value.normalize();
    });

  gui.open();

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.enableDamping = true;

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  postProcessing.render();
}
