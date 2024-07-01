import "./style.css"; // For webpack support

import {
  WebGPURenderer,
  PerspectiveCamera,
  Scene,
  Fog,
  Object3D,
  SphereGeometry,
  MeshPhongMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  PostProcessing,
} from "three";
import { pass } from "three/tsl";

let camera, renderer, postProcessing;
let object;

init();

function init() {
  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 400;

  const scene = new Scene();
  scene.fog = new Fog(0x000000, 1, 1000);

  object = new Object3D();
  scene.add(object);

  const geometry = new SphereGeometry(1, 4, 4);
  const material = new MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
  });

  for (let i = 0; i < 100; i++) {
    const mesh = new Mesh(geometry, material);
    mesh.position
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize();
    mesh.position.multiplyScalar(Math.random() * 400);
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 50;
    object.add(mesh);
  }

  scene.add(new AmbientLight(0xcccccc));

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1);
  scene.add(light);

  // postprocessing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode();

  const dotScreenPass = scenePassColor.dotScreen();
  dotScreenPass.scale.value = 0.3;

  const rgbShiftPass = dotScreenPass.getTextureNode().rgbShift();
  rgbShiftPass.amount.value = 0.001;

  postProcessing.outputNode = rgbShiftPass;

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  object.rotation.x += 0.005;
  object.rotation.y += 0.01;

  postProcessing.render();
}
