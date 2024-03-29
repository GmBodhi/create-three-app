import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  ACESFilmicToneMapping,
  PMREMGenerator,
  Color,
} from "three";
import { NodeMaterial, uv, mix, color, checker } from "three/nodes";

import { nodeFrame } from "three/addons/renderers/webgl-legacy/nodes/WebGLNodes.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

let camera, scene, renderer, controls;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    20
  );
  camera.position.set(-0.75, 0.7, 1.25);

  scene = new Scene();

  // model

  new GLTFLoader()
    .setPath("models/gltf/")
    .load("SheenChair.glb", function (gltf) {
      scene.add(gltf.scene);

      const object = gltf.scene.getObjectByName("SheenChair_fabric");

      // Convert to NodeMaterial
      const material = NodeMaterial.fromMaterial(object.material); // @TODO: NodeMaterial.fromMaterial can be removed if WebGLNodes will apply it by default (as in WebGPURenderer)

      const checkerNode = checker(uv().mul(5));

      material.sheenNode = mix(color(0x00ffff), color(0xffff00), checkerNode);
      material.sheenRoughnessNode = checkerNode;

      object.material = material;
    });

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  const environment = new RoomEnvironment(renderer);
  const pmremGenerator = new PMREMGenerator(renderer);

  scene.background = new Color(0xbbbbbb);
  scene.environment = pmremGenerator.fromScene(environment).texture;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.target.set(0, 0.35, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  nodeFrame.update();

  controls.update(); // required if damping enabled

  render();
}

function render() {
  renderer.render(scene, camera);
}
