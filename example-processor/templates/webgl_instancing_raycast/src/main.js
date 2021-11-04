import "./style.css"; // For webpack support

import {
  Raycaster,
  Vector2,
  Color,
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  IcosahedronGeometry,
  MeshPhongMaterial,
  InstancedMesh,
  Matrix4,
  WebGLRenderer,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer, stats;

let mesh;
const amount = parseInt(window.location.search.substr(1)) || 10;
const count = Math.pow(amount, 3);

const raycaster = new Raycaster();
const mouse = new Vector2(1, 1);

const color = new Color();

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(amount, amount, amount);
  camera.lookAt(0, 0, 0);

  scene = new Scene();

  const light1 = new HemisphereLight(0xffffff, 0x000088);
  light1.position.set(-1, 1.5, 1);
  scene.add(light1);

  const light2 = new HemisphereLight(0xffffff, 0x880000, 0.5);
  light2.position.set(-1, -1.5, -1);
  scene.add(light2);

  const geometry = new IcosahedronGeometry(0.5, 3);
  const material = new MeshPhongMaterial();

  mesh = new InstancedMesh(geometry, material, count);

  let i = 0;
  const offset = (amount - 1) / 2;

  const matrix = new Matrix4();

  for (let x = 0; x < amount; x++) {
    for (let y = 0; y < amount; y++) {
      for (let z = 0; z < amount; z++) {
        matrix.setPosition(offset - x, offset - y, offset - z);

        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, color);

        i++;
      }
    }
  }

  scene.add(mesh);

  //

  const gui = new GUI();
  gui.add(mesh, "count", 0, count);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  new OrbitControls(camera, renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onMouseMove);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  raycaster.setFromCamera(mouse, camera);

  const intersection = raycaster.intersectObject(mesh);

  if (intersection.length > 0) {
    const instanceId = intersection[0].instanceId;

    mesh.setColorAt(instanceId, color.setHex(Math.random() * 0xffffff));
    mesh.instanceColor.needsUpdate = true;
  }

  renderer.render(scene, camera);

  stats.update();
}
