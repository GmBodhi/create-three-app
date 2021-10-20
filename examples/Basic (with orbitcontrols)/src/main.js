import {
  ACESFilmicToneMapping,
  BoxBufferGeometry,
  Color,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/orbitcontrols";

import "./style.css"; // Import the stylesheet for webpack

let camera, scene, renderer, mesh, controls;

init();

function init() {
  // Camera
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(100, 400, 0);

  // Scene
  scene = new Scene();
  scene.background = new Color(0x96b9d0);

  // Cube
  const geometry = new BoxBufferGeometry(200, 200, 200);
  const material = new MeshLambertMaterial({ color: 0xff99f4 });
  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // Lights
  const light = new HemisphereLight(0xffffcc, 0x000033, 1.0);
  scene.add(light);

  // Renderer
  renderer = new WebGLRenderer({
    antialias: true,
    canvas: document.getElementById("canvas"),
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.enableDamping = true;

  window.addEventListener("resize", onWindowResize, false);

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

  controls.update();
}
