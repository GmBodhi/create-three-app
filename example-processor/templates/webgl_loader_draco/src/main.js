import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  HemisphereLight,
  SpotLight,
  MeshStandardMaterial,
  WebGLRenderer,
  sRGBEncoding,
} from "three";

import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

let camera, scene, renderer;

const container = document.querySelector("#container");

// Configure and create Draco decoder.
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("jsm/libs/draco/");
dracoLoader.setDecoderConfig({ type: "js" });

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    15
  );
  camera.position.set(3, 0.25, 3);

  scene = new Scene();
  scene.background = new Color(0x443333);
  scene.fog = new Fog(0x443333, 1, 4);

  // Ground
  const plane = new Mesh(
    new PlaneGeometry(8, 8),
    new MeshPhongMaterial({ color: 0x999999, specular: 0x101010 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.03;
  plane.receiveShadow = true;
  scene.add(plane);

  // Lights
  const hemiLight = new HemisphereLight(0x443333, 0x111122);
  scene.add(hemiLight);

  const spotLight = new SpotLight();
  spotLight.angle = Math.PI / 16;
  spotLight.penumbra = 0.5;
  spotLight.castShadow = true;
  spotLight.position.set(-1, 1, 1);
  scene.add(spotLight);

  dracoLoader.load("models/draco/bunny.drc", function (geometry) {
    geometry.computeVertexNormals();

    const material = new MeshStandardMaterial({ color: 0x606060 });
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Release decoder resources.
    dracoLoader.dispose();
  });

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  render();
  requestAnimationFrame(animate);
}

function render() {
  const timer = Date.now() * 0.0003;

  camera.position.x = Math.sin(timer) * 0.5;
  camera.position.z = Math.cos(timer) * 0.5;
  camera.lookAt(0, 0.1, 0);

  renderer.render(scene, camera);
}
