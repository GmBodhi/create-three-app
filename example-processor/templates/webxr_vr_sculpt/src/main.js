import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  PlaneGeometry,
  GridHelper,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  sRGBEncoding,
  CylinderGeometry,
  IcosahedronGeometry,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

let container;
let camera, scene, renderer;
let controller1, controller2;

let controls, blob;

let points = [];

init();
initBlob();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();
  scene.background = new Color(0x222222);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    50
  );
  camera.position.set(0, 1.6, 3);

  controls = new OrbitControls(camera, container);
  controls.target.set(0, 1.6, 0);
  controls.update();

  const tableGeometry = new BoxGeometry(0.5, 0.8, 0.5);
  const tableMaterial = new MeshStandardMaterial({
    color: 0x444444,
    roughness: 1.0,
    metalness: 0.0,
  });
  const table = new Mesh(tableGeometry, tableMaterial);
  table.position.y = 0.35;
  table.position.z = 0.85;
  scene.add(table);

  const floorGometry = new PlaneGeometry(4, 4);
  const floorMaterial = new MeshStandardMaterial({
    color: 0x222222,
    roughness: 1.0,
    metalness: 0.0,
  });
  const floor = new Mesh(floorGometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new GridHelper(10, 20, 0x111111, 0x111111);
  // grid.material.depthTest = false; // avoid z-fighting
  scene.add(grid);

  scene.add(new HemisphereLight(0x888877, 0x777788));

  const light = new DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  scene.add(light);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  function onSelectStart() {
    this.userData.isSelecting = true;
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;
  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.userData.id = 0;
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.userData.id = 1;
  scene.add(controller2);

  //

  const geometry = new CylinderGeometry(0.01, 0.02, 0.08, 5);
  geometry.rotateX(-Math.PI / 2);
  const material = new MeshStandardMaterial({ flatShading: true });
  const mesh = new Mesh(geometry, material);

  const pivot = new Mesh(new IcosahedronGeometry(0.01, 3));
  pivot.name = "pivot";
  pivot.position.z = -0.05;
  mesh.add(pivot);

  controller1.add(mesh.clone());
  controller2.add(mesh.clone());

  //

  window.addEventListener("resize", onWindowResize);
}

function initBlob() {
  /*
				let path = "textures/cube/SwedishRoyalCastle/";
				let format = '.jpg';
				let urls = [
					path + 'px' + format, path + 'nx' + format,
					path + 'py' + format, path + 'ny' + format,
					path + 'pz' + format, path + 'nz' + format
				];

				let reflectionCube = new CubeTextureLoader().load( urls );
				*/

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    // envMap: reflectionCube,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
  });

  blob = new MarchingCubes(64, material);
  blob.position.y = 1;
  scene.add(blob);

  initPoints();
}

function initPoints() {
  points = [
    { position: new Vector3(), strength: 0.04, subtract: 10 },
    { position: new Vector3(), strength: -0.08, subtract: 10 },
  ];
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.setAnimationLoop(render);
}

function transformPoint(vector) {
  vector.x = (vector.x + 1.0) / 2.0;
  vector.y = vector.y / 2.0;
  vector.z = (vector.z + 1.0) / 2.0;
}

function handleController(controller) {
  const pivot = controller.getObjectByName("pivot");

  if (pivot) {
    const id = controller.userData.id;
    const matrix = pivot.matrixWorld;

    points[id].position.setFromMatrixPosition(matrix);
    transformPoint(points[id].position);

    if (controller.userData.isSelecting) {
      const strength = points[id].strength / 2;

      const vector = new Vector3().setFromMatrixPosition(matrix);

      transformPoint(vector);

      points.push({ position: vector, strength: strength, subtract: 10 });
    }
  }
}

function updateBlob() {
  blob.reset();

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const position = point.position;

    blob.addBall(
      position.x,
      position.y,
      position.z,
      point.strength,
      point.subtract
    );
  }
}

function render() {
  handleController(controller1);
  handleController(controller2);

  updateBlob();

  renderer.render(scene, camera);
}
