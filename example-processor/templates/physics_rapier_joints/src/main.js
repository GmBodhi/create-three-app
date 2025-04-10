import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Vector3,
  SphereGeometry,
  MeshStandardMaterial,
  Mesh,
  CapsuleGeometry,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
import { RapierHelper } from "three/addons/helpers/RapierHelper.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, stats;
let physics, pivot, physicsHelper;

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

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target = new Vector3(0, 2, 0);
  controls.update();

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //Create pivot point
  const geometry = new SphereGeometry(0.5);
  const material = new MeshStandardMaterial({ color: 0xff0000 });

  pivot = new Mesh(geometry, material);

  pivot.position.y = 6;
  pivot.userData.physics = { mass: 0 };

  scene.add(pivot);

  initPhysics();

  onWindowResize();

  window.addEventListener("resize", onWindowResize, false);
}

async function initPhysics() {
  //Initialize physics engine using the script in the jsm/physics folder
  physics = await RapierPhysics();

  physics.addScene(scene);

  //Optionally display collider outlines
  physicsHelper = new RapierHelper(physics.world);
  scene.add(physicsHelper);

  const link1 = addLink(pivot, 0);
  const link2 = addLink(link1, 2);
  addLink(link2, 4);
}

//link - the mesh that the new link will be attached to
//x    - used to position the new link
function addLink(link, x) {
  const geometry = new CapsuleGeometry(0.25, 1.8);
  const material = new MeshStandardMaterial({ color: 0xcccc00 });

  const mesh = new Mesh(geometry, material);
  mesh.rotateZ(Math.PI * 0.5);

  mesh.position.set(x + 0.9, 5.8, 0);

  scene.add(mesh);

  physics.addMesh(mesh, 1, 0.5);

  const jointParams = physics.RAPIER.JointData.spherical(
    link == pivot
      ? new physics.RAPIER.Vector3(0, -0.5, 0)
      : new physics.RAPIER.Vector3(0, -1.15, 0), // Joint position in world space
    new physics.RAPIER.Vector3(0, 1.15, 0) // Corresponding attachment on sphere
  );
  const body1 = link.userData.physics.body;
  const body2 = mesh.userData.physics.body;
  body2.setAngularDamping(10.0);

  physics.world.createImpulseJoint(jointParams, body1, body2, true);

  return mesh;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  if (physicsHelper) physicsHelper.update();

  renderer.render(scene, camera);

  stats.update();
}
