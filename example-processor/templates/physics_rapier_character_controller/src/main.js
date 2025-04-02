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
  CapsuleGeometry,
  SphereGeometry,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
import { RapierHelper } from "three/addons/helpers/RapierHelper.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, stats;
let physics, characterController, physicsHelper;
let player, movement;

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
  camera.position.set(2, 5, 15);

  const ambient = new HemisphereLight(0x555555, 0xffffff);

  scene.add(ambient);

  const light = new DirectionalLight(0xffffff, 3);

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

  const geometry = new BoxGeometry(20, 0.5, 20);
  const material = new MeshStandardMaterial({ color: 0xffffff });

  const ground = new Mesh(geometry, material);
  ground.receiveShadow = true;

  ground.position.y = -0.25;
  ground.userData.physics = { mass: 0 };

  scene.add(ground);

  new TextureLoader().load("textures/grid.png", function (texture) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(20, 20);
    ground.material.map = texture;
    ground.material.needsUpdate = true;
  });

  for (let i = 0; i < 10; i++) addBody(Math.random() > 0.7);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  initPhysics();

  onWindowResize();

  // Movement input
  movement = { forward: 0, right: 0 };

  window.addEventListener("keydown", (event) => {
    if (event.key === "w" || event.key === "ArrowUp") movement.forward = 1;
    if (event.key === "s" || event.key === "ArrowDown") movement.forward = -1;
    if (event.key === "a" || event.key === "ArrowLeft") movement.right = -1;
    if (event.key === "d" || event.key === "ArrowRight") movement.right = 1;
  });

  window.addEventListener("keyup", (event) => {
    if (
      event.key === "w" ||
      event.key === "s" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    )
      movement.forward = 0;
    if (
      event.key === "a" ||
      event.key === "d" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    )
      movement.right = 0;
  });

  window.addEventListener("resize", onWindowResize, false);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

async function initPhysics() {
  //Initialize physics engine using the script in the jsm/physics folder
  physics = await RapierPhysics();

  //Optionally display collider outlines
  physicsHelper = new RapierHelper(physics.world);
  scene.add(physicsHelper);

  physics.addScene(scene);

  addCharacterController();
}

function addCharacterController() {
  // Character Capsule
  const geometry = new CapsuleGeometry(0.3, 1, 8, 8);
  const material = new MeshStandardMaterial({ color: 0x0000ff });
  player = new Mesh(geometry, material);
  player.castShadow = true;
  player.position.set(0, 0.8, 0);
  scene.add(player);

  // Rapier Character Controller
  characterController = physics.world.createCharacterController(0.01);
  characterController.setApplyImpulsesToDynamicBodies(true);
  characterController.setCharacterMass(3);
  const colliderDesc = physics.RAPIER.ColliderDesc.capsule(
    0.5,
    0.3
  ).setTranslation(0, 0.8, 0);
  player.userData.collider = physics.world.createCollider(colliderDesc);
}

function addBody(fixed = true) {
  const geometry = fixed ? new BoxGeometry(1, 1, 1) : new SphereGeometry(0.25);
  const material = new MeshStandardMaterial({
    color: fixed ? 0xff0000 : 0x00ff00,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;

  mesh.position.set(random(-10, 10), 0.5, random(-10, 10));

  mesh.userData.physics = {
    mass: fixed ? 0 : 0.5,
    restitution: fixed ? 0 : 0.3,
  };

  scene.add(mesh);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  if (physicsHelper) physicsHelper.update();

  renderer.render(scene, camera);

  if (physics && characterController) {
    const deltaTime = 1 / 60;

    // Character movement
    const speed = 2.5 * deltaTime;
    const moveVector = new physics.RAPIER.Vector3(
      movement.right * speed,
      0,
      -movement.forward * speed
    );

    characterController.computeColliderMovement(
      player.userData.collider,
      moveVector
    );

    // Read the result.
    const translation = characterController.computedMovement();
    const position = player.userData.collider.translation();

    position.x += translation.x;
    position.y += translation.y;
    position.z += translation.z;

    player.userData.collider.setTranslation(position);

    // Sync Three.js mesh with Rapier collider
    player.position.set(position.x, position.y, position.z);
  }

  stats.update();
}
