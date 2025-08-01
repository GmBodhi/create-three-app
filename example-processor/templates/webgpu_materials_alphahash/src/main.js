import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { ssaaPass } from "three/addons/tsl/display/SSAAPassNode.js";

let camera, scene, renderer, controls, stats, mesh, material, postProcessing;

const amount = parseInt(window.location.search.slice(1)) || 3;
const count = Math.pow(amount, 3);

const color = new Color();

const params = {
  alpha: 0.5,
  alphaHash: true,
};

init();

async function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(amount, amount, amount);
  camera.lookAt(0, 0, 0);

  scene = new Scene();

  const geometry = new IcosahedronGeometry(0.5, 3);

  material = new MeshStandardMaterial({
    color: 0xffffff,
    alphaHash: params.alphaHash,
    opacity: params.alpha,
  });

  mesh = new InstancedMesh(geometry, material, count);

  let i = 0;
  const offset = (amount - 1) / 2;

  const matrix = new Matrix4();

  for (let x = 0; x < amount; x++) {
    for (let y = 0; y < amount; y++) {
      for (let z = 0; z < amount; z++) {
        matrix.setPosition(offset - x, offset - y, offset - z);

        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, color.setHex(Math.random() * 0xffffff));

        i++;
      }
    }
  }

  scene.add(mesh);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  //

  const environment = new RoomEnvironment();
  const pmremGenerator = new PMREMGenerator(renderer);

  scene.environment = pmremGenerator.fromScene(environment).texture;
  environment.dispose();

  //

  // postprocessing

  postProcessing = new PostProcessing(renderer);
  const scenePass = ssaaPass(scene, camera);
  scenePass.sampleLevel = 3;

  postProcessing.outputNode = scenePass;

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;

  //

  const gui = new GUI();

  gui.add(params, "alpha", 0, 1).onChange(onMaterialUpdate);
  gui.add(params, "alphaHash").onChange(onMaterialUpdate);

  const ssaaFolder = gui.addFolder("SSAA");
  ssaaFolder.add(scenePass, "sampleLevel", 0, 4, 1);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMaterialUpdate() {
  material.opacity = params.alpha;
  material.alphaHash = params.alphaHash;
  material.transparent = !params.alphaHash;
  material.depthWrite = params.alphaHash;

  material.needsUpdate = true;
}

function animate() {
  postProcessing.render();

  stats.update();
}
