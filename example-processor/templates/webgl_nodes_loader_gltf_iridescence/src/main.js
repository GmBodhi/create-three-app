import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  ACESFilmicToneMapping,
  Scene,
  PerspectiveCamera,
  EquirectangularReflectionMapping,
} from "three";

import {
  NodeMaterial,
  uv,
  add,
  mul,
  vec2,
  checker,
  float,
  timerLocal,
} from "three-nodes/Nodes.js";

import { nodeFrame } from "three/examples/jsm/renderers/webgl/nodes/WebGLNodes.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

let renderer, scene, camera, controls;

init().catch(function (err) {
  console.error(err);
});

async function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setAnimationLoop(render);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(0.35, 0.05, 0.35);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.target.set(0, 0.2, 0);
  controls.update();

  const rgbeLoader = new RGBELoader().setPath("textures/equirectangular/");

  const gltfLoader = new GLTFLoader().setPath("models/gltf/");

  const [texture, gltf] = await Promise.all([
    rgbeLoader.loadAsync("venice_sunset_1k.hdr"),
    gltfLoader.loadAsync("IridescenceLamp.glb"),
  ]);

  // nodes

  gltf.scene.traverse((mesh) => {
    const material = mesh.material;

    if (material && material.iridescence > 0) {
      const iridescenceFactorNode = checker(
        mul(add(uv(), vec2(timerLocal(-0.05), 0)), 20)
      );

      const nodeMaterial = NodeMaterial.fromMaterial(material);
      nodeMaterial.iridescenceNode = iridescenceFactorNode;
      nodeMaterial.iridescenceIORNode = float(1.3);
      nodeMaterial.iridescenceThicknessNode = float(400);

      mesh.material = nodeMaterial;
    }
  });

  // environment

  texture.mapping = EquirectangularReflectionMapping;

  scene.background = texture;
  scene.environment = texture;

  // model

  scene.add(gltf.scene);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  nodeFrame.update();

  renderer.render(scene, camera);
}
