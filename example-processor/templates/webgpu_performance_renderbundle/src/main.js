import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { Inspector } from "three/addons/inspector/Inspector.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer;
let controls;
let gui;
let geometries, group;

//

const position = new Vector3();
const rotation = new Euler();
const quaternion = new Quaternion();
const scale = new Vector3();

//

const api = {
  webgpu: true,
  renderBundle: true,
  count: 4000,
  opacity: 1,
  dynamic: false,
};

init();

//

function randomizeMatrix(matrix) {
  position.x = Math.random() * 80 - 40;
  position.y = Math.random() * 80 - 40;
  position.z = Math.random() * 80 - 40;

  rotation.x = Math.random() * 2 * Math.PI;
  rotation.y = Math.random() * 2 * Math.PI;
  rotation.z = Math.random() * 2 * Math.PI;

  quaternion.setFromEuler(rotation);

  scale.x = scale.y = scale.z = 0.35 + Math.random() * 0.5;

  return matrix.compose(position, quaternion, scale);
}

function randomizeRotationSpeed(rotation) {
  rotation.x = Math.random() * 0.05;
  rotation.y = Math.random() * 0.05;
  rotation.z = Math.random() * 0.05;
  return rotation;
}

function initGeometries() {
  geometries = [
    new ConeGeometry(1.0, 2.0, 3, 1),
    new BoxGeometry(2.0, 2.0, 2.0),
    new PlaneGeometry(2.0, 2, 1, 1),
    new CapsuleGeometry(),
    new CircleGeometry(1.0, 3),
    new CylinderGeometry(1.0, 1.0, 2.0, 3, 1),
    new DodecahedronGeometry(1.0, 0),
    new IcosahedronGeometry(1.0, 0),
    new OctahedronGeometry(1.0, 0),
    new PolyhedronGeometry([0, 0, 0], [0, 0, 0], 1, 0),
    new RingGeometry(1.0, 1.5, 3),
    new SphereGeometry(1.0, 3, 2),
    new TetrahedronGeometry(1.0, 0),
    new TorusGeometry(1.0, 0.5, 3, 3),
    new TorusKnotGeometry(1.0, 0.5, 20, 3, 1, 1),
  ];
}

function initMesh(count) {
  initRegularMesh(count);
}

function initRegularMesh(count) {
  group = api.renderBundle ? new BundleGroup() : new Group();

  for (let i = 0; i < count; i++) {
    const material = new MeshToonNodeMaterial({
      color: new Color(Math.random() * 0xffffff),
      side: DoubleSide,
    });

    const child = new Mesh(geometries[i % geometries.length], material);
    randomizeMatrix(child.matrix);
    child.matrix.decompose(child.position, child.quaternion, child.scale);
    child.userData.rotationSpeed = randomizeRotationSpeed(new Euler());
    child.frustumCulled = false;
    group.add(child);
  }

  scene.add(group);
}

function init() {
  const searchParams = new URLSearchParams(window.location.search);
  api.webgpu = searchParams.get("backend") !== "webgl";
  api.renderBundle = searchParams.get("renderBundle") !== "false";
  api.count = parseFloat(searchParams.get("count") || 4000);

  const count = api.count;

  // camera

  const aspect = window.innerWidth / window.innerHeight;

  camera = new PerspectiveCamera(70, aspect, 1, 100);
  camera.position.z = 50;

  // renderer

  renderer = new WebGPURenderer({ antialias: true, forceWebGL: !api.webgpu });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.inspector = new Inspector();
  renderer.setAnimationLoop(animate);

  // scene

  scene = new Scene();
  scene.background = new Color(0xc1c1c1);

  const light = new DirectionalLight(0xffffff, 3.4);
  scene.add(light);

  document.body.appendChild(renderer.domElement);

  initGeometries();
  initMesh(count);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;

  // gui

  gui = renderer.inspector.createParameters("Settings");
  gui.add(api, "renderBundle").name("render bundle").onChange(reload);

  gui.add(api, "webgpu").onChange(reload);

  gui.add(api, "dynamic").onChange(() => {
    group.static = !group.static;
  });

  // listeners

  window.addEventListener("resize", onWindowResize);

  function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    group.needsUpdate = true;
  }

  function reload() {
    const backendParam = "backend=" + (api.webgpu ? "webgpu" : "webgl");
    const renderBundleParam =
      "&renderBundle=" + (api.renderBundle ? "true" : "false");
    const countParam = "&count=" + api.count;

    location.href =
      location.pathname + "?" + backendParam + renderBundleParam + countParam; // relative redirect with parameters
  }

  function animate() {
    animateMeshes();

    controls.update();

    renderer.render(scene, camera);
  }

  function animateMeshes() {
    const count = api.count;
    const loopNum = api.dynamic ? count : 0;

    for (let i = 0; i < loopNum; i++) {
      const child = group.children[i];
      const rotationSpeed = child.userData.rotationSpeed;

      child.rotation.set(
        child.rotation.x + rotationSpeed.x,
        child.rotation.y + rotationSpeed.y,
        child.rotation.z + rotationSpeed.z
      );
    }
  }
}
