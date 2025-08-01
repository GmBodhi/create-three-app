import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer;
let mesh;
let stats;

const AMOUNT = 6;

init();

function init() {
  const subCameras = [];

  for (let i = 0; i < AMOUNT * AMOUNT; i++) {
    const subCamera = new PerspectiveCamera(40, 1, 0.1, 10);
    subCamera.viewport = new Vector4();

    subCameras.push(subCamera);
  }

  camera = new ArrayCamera(subCameras);
  camera.position.z = 3;

  updateCameras();

  scene = new Scene();

  scene.add(new AmbientLight(0x999999));

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(0.5, 0.5, 1);
  light.castShadow = true;
  light.shadow.bias = -0.001;
  light.shadow.camera.zoom = 4; // tighter shadow map
  scene.add(light);

  const geometryBackground = new PlaneGeometry(100, 100);
  const materialBackground = new MeshPhongMaterial({ color: 0x000066 });

  const background = new Mesh(geometryBackground, materialBackground);
  background.receiveShadow = true;
  background.position.set(0, 0, -1);
  scene.add(background);

  const geometryCylinder = new CylinderGeometry(0.5, 0.5, 1, 32);
  const materialCylinder = new MeshPhongMaterial({ color: 0xff0000 });

  mesh = new Mesh(geometryCylinder, materialCylinder);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  renderer = new WebGPURenderer(/*{ forceWebGL: true }*/);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);
}

function updateCameras() {
  const ASPECT_RATIO = window.innerWidth / window.innerHeight;
  const WIDTH = window.innerWidth / AMOUNT;
  const HEIGHT = window.innerHeight / AMOUNT;

  camera.aspect = ASPECT_RATIO;
  camera.updateProjectionMatrix();

  for (let y = 0; y < AMOUNT; y++) {
    for (let x = 0; x < AMOUNT; x++) {
      const subcamera = camera.cameras[AMOUNT * y + x];
      subcamera.copy(camera); // copy fov, aspect ratio, near, far from the root camera

      subcamera.viewport.set(
        Math.floor(x * WIDTH),
        Math.floor(y * HEIGHT),
        Math.ceil(WIDTH),
        Math.ceil(HEIGHT)
      );
      subcamera.updateProjectionMatrix();

      subcamera.position.x = x / AMOUNT - 0.5;
      subcamera.position.y = 0.5 - y / AMOUNT;
      subcamera.position.z = 1.5 + (x + y) * 0.5;
      subcamera.position.multiplyScalar(2);

      subcamera.lookAt(0, 0, 0);
      subcamera.updateMatrixWorld();
    }
  }
}

function onWindowResize() {
  updateCameras();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  mesh.rotation.x += 0.005;
  mesh.rotation.z += 0.01;

  renderer.render(scene, camera);

  stats.update();
}
