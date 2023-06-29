import "./style.css"; // For webpack support

import {
  Color,
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  IcosahedronGeometry,
  MeshStandardMaterial,
  InstancedMesh,
  Matrix4,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let camera, scene, renderer, controls, stats, mesh, material;

let composer, renderPass, taaRenderPass, outputPass;

let needsUpdate = false;

const amount = parseInt(window.location.search.slice(1)) || 3;
const count = Math.pow(amount, 3);

const color = new Color();

const params = {
  alpha: 0.5,
  alphaHash: true,
  taa: true,
  sampleLevel: 2,
};

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(amount, amount, amount);
  camera.lookAt(0, 0, 0);

  scene = new Scene();

  const light = new HemisphereLight(0xffffff, 0x888888);
  light.position.set(0, 1, 0);
  scene.add(light);

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

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  composer = new EffectComposer(renderer);

  renderPass = new RenderPass(scene, camera);
  renderPass.enabled = false;

  taaRenderPass = new TAARenderPass(scene, camera);

  outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(taaRenderPass);
  composer.addPass(outputPass);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.dampingFactor = 0.2;

  controls.addEventListener("change", () => (needsUpdate = true));

  //

  const gui = new GUI();

  gui.add(params, "alpha", 0, 1).onChange(onMaterialUpdate);
  gui.add(params, "alphaHash").onChange(onMaterialUpdate);

  const taaFolder = gui.addFolder("Temporal Anti-Aliasing");

  taaFolder
    .add(params, "taa")
    .name("enabled")
    .onChange(() => {
      renderPass.enabled = !params.taa;
      taaRenderPass.enabled = params.taa;

      sampleLevelCtrl.enable(params.taa);

      needsUpdate = true;
    });

  const sampleLevelCtrl = taaFolder
    .add(params, "sampleLevel", 0, 6, 1)
    .onChange(() => (needsUpdate = true));

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  needsUpdate = true;
}

function onMaterialUpdate() {
  material.opacity = params.alpha;
  material.alphaHash = params.alphaHash;
  material.transparent = !params.alphaHash;
  material.depthWrite = params.alphaHash;

  material.needsUpdate = true;
  needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  render();

  stats.update();
}

function render() {
  if (needsUpdate) {
    taaRenderPass.accumulate = false;
    taaRenderPass.sampleLevel = 0;

    needsUpdate = false;
  } else {
    taaRenderPass.accumulate = true;
    taaRenderPass.sampleLevel = params.sampleLevel;
  }

  composer.render();
}
