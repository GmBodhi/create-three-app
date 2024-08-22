import "./style.css"; // For webpack support

import {
  Vector3,
  PerspectiveCamera,
  Scene,
  CubeTextureLoader,
  SphereGeometry,
  MeshBasicMaterial,
  InstancedMesh,
  DynamicDrawUsage,
  Mesh,
  WebGPURenderer,
  PostProcessing,
} from "three";

import { stereoPass, anaglyphPass, parallaxBarrierPass } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Timer } from "three/addons/misc/Timer.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, postProcessing;

let stereo, anaglyph, parallaxBarrier;

let mesh, dummy, timer;

const position = new Vector3();

const params = {
  effect: "stereo",
};

const effects = {
  Stereo: "stereo",
  Anaglyph: "anaglyph",
  ParallaxBarrier: "parallaxBarrier",
};

init();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 3;

  scene = new Scene();
  scene.background = new CubeTextureLoader()
    .setPath("textures/cube/Park3Med/")
    .load(["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"]);

  timer = new Timer();

  const geometry = new SphereGeometry(0.1, 32, 16);

  const textureCube = new CubeTextureLoader()
    .setPath("textures/cube/Park3Med/")
    .load(["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"]);

  const material = new MeshBasicMaterial({
    color: 0xffffff,
    envMap: textureCube,
  });

  mesh = new InstancedMesh(geometry, material, 500);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);

  dummy = new Mesh();

  for (let i = 0; i < 500; i++) {
    dummy.position.x = Math.random() * 10 - 5;
    dummy.position.y = Math.random() * 10 - 5;
    dummy.position.z = Math.random() * 10 - 5;
    dummy.scale.x = dummy.scale.y = dummy.scale.z = Math.random() * 3 + 1;

    dummy.updateMatrix();

    mesh.setMatrixAt(i, dummy.matrix);
  }

  scene.add(mesh);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  postProcessing = new PostProcessing(renderer);
  stereo = stereoPass(scene, camera);
  anaglyph = anaglyphPass(scene, camera);
  parallaxBarrier = parallaxBarrierPass(scene, camera);

  postProcessing.outputNode = stereo;

  //

  const gui = new GUI();
  gui.add(params, "effect", effects).onChange(update);

  //

  window.addEventListener("resize", onWindowResize);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 25;
}

function update(value) {
  if (value === "stereo") {
    postProcessing.outputNode = stereo;
  } else if (value === "anaglyph") {
    postProcessing.outputNode = anaglyph;
  } else if (value === "parallaxBarrier") {
    postProcessing.outputNode = parallaxBarrier;
  }

  postProcessing.needsUpdate = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function extractPosition(matrix, position) {
  position.x = matrix.elements[12];
  position.y = matrix.elements[13];
  position.z = matrix.elements[14];
}

//

function animate() {
  timer.update();

  const elapsedTime = timer.getElapsed() * 0.1;

  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, dummy.matrix);

    extractPosition(dummy.matrix, position);

    position.x = 5 * Math.cos(elapsedTime + i);
    position.y = 5 * Math.sin(elapsedTime + i * 1.1);

    dummy.matrix.setPosition(position);

    mesh.setMatrixAt(i, dummy.matrix);

    mesh.instanceMatrix.needsUpdate = true;
  }

  postProcessing.render();
}
