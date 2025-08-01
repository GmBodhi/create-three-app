import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Vector3,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  TextureLoader,
  RepeatWrapping,
  SphereGeometry,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
import { RapierHelper } from "three/addons/helpers/RapierHelper.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, stats, controls;
let physics, physicsHelper;

init();

async function init() {
  scene = new Scene();
  scene.background = new Color(0xbfd1e5);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 3, 10);

  const ambient = new HemisphereLight(0x555555, 0xffffff);

  scene.add(ambient);

  const light = new DirectionalLight(0xffffff, 4);

  light.position.set(0, 12.5, 12.5);
  light.castShadow = true;
  light.shadow.radius = 3;
  light.shadow.blurSamples = 8;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;

  const size = 10;
  light.shadow.camera.left = -size;
  light.shadow.camera.bottom = -size;
  light.shadow.camera.right = size;
  light.shadow.camera.top = size;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 50;

  scene.add(light);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  renderer.setAnimationLoop(animate);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target = new Vector3(0, 2, 0);
  controls.update();

  const geometry = new BoxGeometry(10, 0.5, 10);
  const material = new MeshStandardMaterial({ color: 0xffffff });

  const floor = new Mesh(geometry, material);
  floor.receiveShadow = true;

  floor.position.y = -0.25;
  floor.userData.physics = { mass: 0 };

  scene.add(floor);

  new TextureLoader().load("textures/grid.png", function (texture) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(20, 20);
    floor.material.map = texture;
    floor.material.needsUpdate = true;
  });

  stats = new Stats();
  document.body.appendChild(stats.dom);

  initPhysics();

  onWindowResize();

  window.addEventListener("resize", onWindowResize, false);
}

async function initPhysics() {
  //Initialize physics engine using the script in the jsm/physics folder
  physics = await RapierPhysics();

  physics.addScene(scene);

  addBody();

  //Optionally display collider outlines
  physicsHelper = new RapierHelper(physics.world);
  scene.add(physicsHelper);

  setInterval(addBody, 1000);
}

const geometries = [
  new BoxGeometry(1, 1, 1),
  new SphereGeometry(0.5),
  new RoundedBoxGeometry(1, 1, 1, 2, 0.25),
];

function addBody() {
  const geometry = geometries[Math.floor(Math.random() * geometries.length)];
  const material = new MeshStandardMaterial({
    color: Math.floor(Math.random() * 0xffffff),
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;

  mesh.position.set(
    Math.random() * 2 - 1,
    Math.random() * 3 + 6,
    Math.random() * 2 - 1
  );

  scene.add(mesh);

  //parameter 2 - mass, parameter 3 - restitution ( how bouncy )
  physics.addMesh(mesh, 1, 0.5);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  for (const object of scene.children) {
    if (object.isMesh) {
      if (object.position.y < -10) {
        scene.remove(object);
        physics.removeMesh(object);
      }
    }
  }

  if (physicsHelper) physicsHelper.update();

  controls.update();

  renderer.render(scene, camera);

  stats.update();
}
