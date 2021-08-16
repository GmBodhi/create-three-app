import {
  AmbientLight,
  BoxBufferGeometry,
  DirectionalLight,
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
  // camera
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );

  camera.position.set(100, 400, 0);

  // Create scene
  scene = new Scene();

  // Cube
  const geometry = new BoxBufferGeometry(200, 200, 200);
  const material = new MeshLambertMaterial({ color: 0xffffff });
  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // Lights
  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 1, 0);
  scene.add(directionalLight);

  //ambient light
  const light = new AmbientLight(0x404040, 1); // soft white light
  scene.add(light);

  // Renderer
  renderer = new WebGLRenderer({
    antialias: true,
    canvas: document.getElementById("canvas"),
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true; // Auto rotate the camera around the target
  controls.enableDamping = true; // Damping of the rotation so it stops the camera from going too fast

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

  // Auto rotate cube
  // mesh.rotation.x += 0.005;
  // mesh.rotation.y += 0.01;
}
