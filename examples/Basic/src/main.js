import {
  BoxBufferGeometry,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

import "./style.css"; // Import the stylesheet for webpack

let camera, scene, renderer, mesh;

init();

function init() {
  // camera
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 400;

  // Create scene
  scene = new Scene();

  // Cube
  const geometry = new BoxBufferGeometry(200, 200, 200);
  const material = new MeshLambertMaterial({ color: 0xff0000 });
  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // Lights
  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  // Renderer
  renderer = new WebGLRenderer({
    antialias: true,
    canvas: document.getElementById("canvas"),
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

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

  // Auto rotate cube
  mesh.rotation.x += 0.005;
  mesh.rotation.y += 0.01;
}
