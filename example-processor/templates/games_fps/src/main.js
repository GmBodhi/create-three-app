//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  Clock,
  Scene,
  Color,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
  VSMShadowMap,
  SphereGeometry,
  MeshStandardMaterial,
  Mesh,
  Sphere,
  Vector3,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { Octree } from "three/examples/jsm/math/Octree.js";
import { Capsule } from "three/examples/jsm/math/Capsule.js";

const clock = new Clock();

const scene = new Scene();
scene.background = new Color(0x88ccff);

const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.rotation.order = "YXZ";

const ambientlight = new AmbientLight(0x6688cc);
scene.add(ambientlight);

const fillLight1 = new DirectionalLight(0xff9999, 0.5);
fillLight1.position.set(-1, 1, 2);
scene.add(fillLight1);

const fillLight2 = new DirectionalLight(0x8888ff, 0.2);
fillLight2.position.set(0, -1, 0);
scene.add(fillLight2);

const directionalLight = new DirectionalLight(0xffffaa, 1.2);
directionalLight.position.set(-5, 25, -1);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.00006;
scene.add(directionalLight);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = VSMShadowMap;

const container = document.getElementById("container");

container.appendChild(renderer.domElement);

const stats = new Stats();
stats.domElement.style.position = "absolute";
stats.domElement.style.top = "0px";

container.appendChild(stats.domElement);

const GRAVITY = 30;

const NUM_SPHERES = 20;
const SPHERE_RADIUS = 0.2;

const STEPS_PER_FRAME = 5;

const sphereGeometry = new SphereGeometry(SPHERE_RADIUS, 32, 32);
const sphereMaterial = new MeshStandardMaterial({
  color: 0x888855,
  roughness: 0.8,
  metalness: 0.5,
});

const spheres = [];
let sphereIdx = 0;

for (let i = 0; i < NUM_SPHERES; i++) {
  const sphere = new Mesh(sphereGeometry, sphereMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;

  scene.add(sphere);

  spheres.push({
    mesh: sphere,
    collider: new Sphere(new Vector3(0, -100, 0), SPHERE_RADIUS),
    velocity: new Vector3(),
  });
}

const worldOctree = new Octree();

const playerCollider = new Capsule(
  new Vector3(0, 0.35, 0),
  new Vector3(0, 1, 0),
  0.35
);

const playerVelocity = new Vector3();
const playerDirection = new Vector3();

let playerOnFloor = false;

const keyStates = {};

document.addEventListener("keydown", (event) => {
  keyStates[event.code] = true;
});

document.addEventListener("keyup", (event) => {
  keyStates[event.code] = false;
});

document.addEventListener("mousedown", () => {
  document.body.requestPointerLock();
});

document.body.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    camera.rotation.y -= event.movementX / 500;
    camera.rotation.x -= event.movementY / 500;
  }
});

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

document.addEventListener("click", () => {
  const sphere = spheres[sphereIdx];

  camera.getWorldDirection(playerDirection);

  sphere.collider.center.copy(playerCollider.end);
  sphere.velocity.copy(playerDirection).multiplyScalar(30);

  sphereIdx = (sphereIdx + 1) % spheres.length;
});

function playerCollitions() {
  const result = worldOctree.capsuleIntersect(playerCollider);

  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;

    if (!playerOnFloor) {
      playerVelocity.addScaledVector(
        result.normal,
        -result.normal.dot(playerVelocity)
      );
    }

    playerCollider.translate(result.normal.multiplyScalar(result.depth));
  }
}

function updatePlayer(deltaTime) {
  if (playerOnFloor) {
    const damping = Math.exp(-3 * deltaTime) - 1;
    playerVelocity.addScaledVector(playerVelocity, damping);
  } else {
    playerVelocity.y -= GRAVITY * deltaTime;
  }

  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerCollider.translate(deltaPosition);

  playerCollitions();

  camera.position.copy(playerCollider.end);
}

function spheresCollisions() {
  for (let i = 0; i < spheres.length; i++) {
    const s1 = spheres[i];

    for (let j = i + 1; j < spheres.length; j++) {
      const s2 = spheres[j];

      const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
      const r = s1.collider.radius + s2.collider.radius;
      const r2 = r * r;

      if (d2 < r2) {
        const normal = s1.collider
          .clone()
          .center.sub(s2.collider.center)
          .normalize();
        const v1 = normal.clone().multiplyScalar(normal.dot(s1.velocity));
        const v2 = normal.clone().multiplyScalar(normal.dot(s2.velocity));
        s1.velocity.add(v2).sub(v1);
        s2.velocity.add(v1).sub(v2);

        const d = (r - Math.sqrt(d2)) / 2;

        s1.collider.center.addScaledVector(normal, d);
        s2.collider.center.addScaledVector(normal, -d);
      }
    }
  }
}

function updateSpheres(deltaTime) {
  spheres.forEach((sphere) => {
    sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

    const result = worldOctree.sphereIntersect(sphere.collider);

    if (result) {
      sphere.velocity.addScaledVector(
        result.normal,
        -result.normal.dot(sphere.velocity) * 1.5
      );
      sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
    } else {
      sphere.velocity.y -= GRAVITY * deltaTime;
    }

    const damping = Math.exp(-1.5 * deltaTime) - 1;
    sphere.velocity.addScaledVector(sphere.velocity, damping);

    spheresCollisions();

    sphere.mesh.position.copy(sphere.collider.center);
  });
}

function getForwardVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();

  return playerDirection;
}

function getSideVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);

  return playerDirection;
}

function controls(deltaTime) {
  const speed = 25;

  if (playerOnFloor) {
    if (keyStates["KeyW"]) {
      playerVelocity.add(getForwardVector().multiplyScalar(speed * deltaTime));
    }

    if (keyStates["KeyS"]) {
      playerVelocity.add(getForwardVector().multiplyScalar(-speed * deltaTime));
    }

    if (keyStates["KeyA"]) {
      playerVelocity.add(getSideVector().multiplyScalar(-speed * deltaTime));
    }

    if (keyStates["KeyD"]) {
      playerVelocity.add(getSideVector().multiplyScalar(speed * deltaTime));
    }

    if (keyStates["Space"]) {
      playerVelocity.y = 15;
    }
  }
}

const loader = new GLTFLoader().setPath("three/examples/models/gltf/");

loader.load("collision-world.glb", (gltf) => {
  scene.add(gltf.scene);

  worldOctree.fromGraphNode(gltf.scene);

  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material.map) {
        child.material.map.anisotropy = 8;
      }
    }
  });

  animate();
});

function animate() {
  const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

  // we look for collisions in substeps to mitigate the risk of
  // an object traversing another too quickly for detection.

  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    controls(deltaTime);

    updatePlayer(deltaTime);

    updateSpheres(deltaTime);
  }

  renderer.render(scene, camera);

  stats.update();

  requestAnimationFrame(animate);
}
