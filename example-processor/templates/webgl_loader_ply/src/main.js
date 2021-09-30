//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Vector3,
  Scene,
  Color,
  Fog,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  MeshStandardMaterial,
  HemisphereLight,
  WebGLRenderer,
  sRGBEncoding,
  DirectionalLight,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

let container, stats;

let camera, cameraTarget, scene, renderer;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    15
  );
  camera.position.set(3, 0.15, 3);

  cameraTarget = new Vector3(0, -0.1, 0);

  scene = new Scene();
  scene.background = new Color(0x72645b);
  scene.fog = new Fog(0x72645b, 2, 15);

  // Ground

  const plane = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshPhongMaterial({ color: 0x999999, specular: 0x101010 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.5;
  scene.add(plane);

  plane.receiveShadow = true;

  // PLY file

  const loader = new PLYLoader();
  loader.load(
    "three/examples/models/ply/ascii/dolphins.ply",
    function (geometry) {
      geometry.computeVertexNormals();

      const material = new MeshStandardMaterial({
        color: 0x0055ff,
        flatShading: true,
      });
      const mesh = new Mesh(geometry, material);

      mesh.position.y = -0.2;
      mesh.position.z = 0.3;
      mesh.rotation.x = -Math.PI / 2;
      mesh.scale.multiplyScalar(0.001);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
    }
  );

  loader.load(
    "three/examples/models/ply/binary/Lucy100k.ply",
    function (geometry) {
      geometry.computeVertexNormals();

      const material = new MeshStandardMaterial({
        color: 0x0055ff,
        flatShading: true,
      });
      const mesh = new Mesh(geometry, material);

      mesh.position.x = -0.2;
      mesh.position.y = -0.02;
      mesh.position.z = -0.2;
      mesh.scale.multiplyScalar(0.0006);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
    }
  );

  // Lights

  scene.add(new HemisphereLight(0x443333, 0x111122));

  addShadowedLight(1, 1, 1, 0xffffff, 1.35);
  addShadowedLight(0.5, 1, -1, 0xffaa00, 1);

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;

  renderer.shadowMap.enabled = true;

  container.appendChild(renderer.domElement);

  // stats

  stats = new Stats();
  container.appendChild(stats.dom);

  // resize

  window.addEventListener("resize", onWindowResize);
}

function addShadowedLight(x, y, z, color, intensity) {
  const directionalLight = new DirectionalLight(color, intensity);
  directionalLight.position.set(x, y, z);
  scene.add(directionalLight);

  directionalLight.castShadow = true;

  const d = 1;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;

  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 4;

  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;

  directionalLight.shadow.bias = -0.001;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const timer = Date.now() * 0.0005;

  camera.position.x = Math.sin(timer) * 2.5;
  camera.position.z = Math.cos(timer) * 2.5;

  camera.lookAt(cameraTarget);

  renderer.render(scene, camera);
}
