import "./style.css"; // For webpack support

import {
  ColorManagement,
  PerspectiveCamera,
  Vector4,
  ArrayCamera,
  Scene,
  AmbientLight,
  DirectionalLight,
  PlaneGeometry,
  MeshPhongMaterial,
  Mesh,
  CylinderGeometry,
  WebGLRenderer,
} from "three";

ColorManagement.enabled = true;

let camera, scene, renderer;
let mesh;
const AMOUNT = 6;

init();
animate();

function init() {
  const ASPECT_RATIO = window.innerWidth / window.innerHeight;

  const WIDTH = (window.innerWidth / AMOUNT) * window.devicePixelRatio;
  const HEIGHT = (window.innerHeight / AMOUNT) * window.devicePixelRatio;

  const cameras = [];

  for (let y = 0; y < AMOUNT; y++) {
    for (let x = 0; x < AMOUNT; x++) {
      const subcamera = new PerspectiveCamera(40, ASPECT_RATIO, 0.1, 10);
      subcamera.viewport = new Vector4(
        Math.floor(x * WIDTH),
        Math.floor(y * HEIGHT),
        Math.ceil(WIDTH),
        Math.ceil(HEIGHT)
      );
      subcamera.position.x = x / AMOUNT - 0.5;
      subcamera.position.y = 0.5 - y / AMOUNT;
      subcamera.position.z = 1.5;
      subcamera.position.multiplyScalar(2);
      subcamera.lookAt(0, 0, 0);
      subcamera.updateMatrixWorld();
      cameras.push(subcamera);
    }
  }

  camera = new ArrayCamera(cameras);
  camera.position.z = 3;

  scene = new Scene();

  scene.add(new AmbientLight(0x222244));

  const light = new DirectionalLight();
  light.position.set(0.5, 0.5, 1);
  light.castShadow = true;
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

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const ASPECT_RATIO = window.innerWidth / window.innerHeight;
  const WIDTH = (window.innerWidth / AMOUNT) * window.devicePixelRatio;
  const HEIGHT = (window.innerHeight / AMOUNT) * window.devicePixelRatio;

  camera.aspect = ASPECT_RATIO;
  camera.updateProjectionMatrix();

  for (let y = 0; y < AMOUNT; y++) {
    for (let x = 0; x < AMOUNT; x++) {
      const subcamera = camera.cameras[AMOUNT * y + x];

      subcamera.viewport.set(
        Math.floor(x * WIDTH),
        Math.floor(y * HEIGHT),
        Math.ceil(WIDTH),
        Math.ceil(HEIGHT)
      );

      subcamera.aspect = ASPECT_RATIO;
      subcamera.updateProjectionMatrix();
    }
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  mesh.rotation.x += 0.005;
  mesh.rotation.z += 0.01;

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}
