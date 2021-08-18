import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  GridHelper,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import "./style.css"; // Import the stylesheet for webpack

let camera, scene, renderer, mesh, controls;

init();

function init() {
  // Create scene
  scene = new Scene();

  // Cube
  let geometry = new BoxGeometry(1, 1, 1);
  let material = new MeshPhongMaterial({ color: 0xff0000 });
  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // Lights
  const pointLight = new DirectionalLight(0xffffff, 0.5);
  pointLight.position.set(0, 1, 0);
  scene.add(pointLight);

  //ambient light
  const light = new AmbientLight(0x404040, 1); // soft white light
  scene.add(light);

  // Camera
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(10, 3, 10);
  scene.add(camera);

  // Ground
  let gorundGeometry = new PlaneGeometry(500, 500);
  let gorundMaterial = new MeshPhongMaterial({
    color: 0x2b2b2b,
    depthWrite: false,
  });

  let ground = new Mesh(gorundGeometry, gorundMaterial);
  ground.position.set(0, -3, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // GridHelper
  let grid = new GridHelper(500, 250, 0x000000, 0x000000);
  grid.position.y = -3;
  grid.material.fog = false;
  grid.material.transparent = true;
  scene.add(grid);

  //Fog
  scene.fog = new FogExp2(0x404040, 0.008);
  scene.background = new Color(0x2b2b2b);

  // Renderer
  renderer = new WebGLRenderer({
    antialias: true,
    canvas: document.getElementById("canvas"),
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // controls
  controls = new OrbitControls(camera, renderer.domElement);

  // Add distance limits to the controls
  controls.minDistance = 4.5;
  controls.maxDistance = 100;

  // Damping and autorotation
  controls.enableDamping = true;
  controls.autoRotate = true;

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
