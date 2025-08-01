import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  color,
  fog,
  float,
  positionWorld,
  triNoise3D,
  positionView,
  normalWorld,
  uniform,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer;
let controls;

init();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    600
  );
  camera.position.set(30, 15, 30);

  scene = new Scene();

  // custom fog

  const skyColor = color(0xf0f5f5);
  const groundColor = color(0xd0dee7);

  const fogNoiseDistance = positionView.z
    .negate()
    .smoothstep(0, camera.far - 300);

  const distance = fogNoiseDistance.mul(20).max(4);
  const alpha = 0.98;
  const groundFogArea = float(distance)
    .sub(positionWorld.y)
    .div(distance)
    .pow(3)
    .saturate()
    .mul(alpha);

  // a alternative way to create a TimerNode
  const timer = uniform(0).onFrameUpdate((frame) => frame.time);

  const fogNoiseA = triNoise3D(positionWorld.mul(0.005), 0.2, timer);
  const fogNoiseB = triNoise3D(positionWorld.mul(0.01), 0.2, timer.mul(1.2));

  const fogNoise = fogNoiseA.add(fogNoiseB).mul(groundColor);

  // apply custom fog

  scene.fogNode = fog(
    fogNoiseDistance.oneMinus().mix(groundColor, fogNoise),
    groundFogArea
  );
  scene.backgroundNode = normalWorld.y.max(0).mix(groundColor, skyColor);

  // builds

  const buildWindows = positionWorld.y
    .mul(10)
    .floor()
    .mod(4)
    .sign()
    .mix(color(0x000066).add(fogNoiseDistance), color(0xffffff));

  const buildGeometry = new BoxGeometry(1, 1, 1);
  const buildMaterial = new MeshPhongNodeMaterial({
    colorNode: buildWindows,
  });

  const buildMesh = new InstancedMesh(buildGeometry, buildMaterial, 4000);
  scene.add(buildMesh);

  const dummy = new Object3D();
  const center = new Vector3();

  for (let i = 0; i < buildMesh.count; i++) {
    const scaleY = Math.random() * 7 + 0.5;

    dummy.position.x = Math.random() * 600 - 300;
    dummy.position.z = Math.random() * 600 - 300;

    const distance = Math.max(dummy.position.distanceTo(center) * 0.012, 1);

    dummy.position.y = 0.5 * scaleY * distance;

    dummy.scale.x = dummy.scale.z = Math.random() * 3 + 0.5;
    dummy.scale.y = scaleY * distance;

    dummy.updateMatrix();

    buildMesh.setMatrixAt(i, dummy.matrix);
  }

  // lights

  scene.add(new HemisphereLight(skyColor.value, groundColor.value, 0.5));

  // geometry

  const planeGeometry = new PlaneGeometry(200, 200);
  const planeMaterial = new MeshPhongMaterial({
    color: 0x999999,
  });

  const ground = new Mesh(planeGeometry, planeMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.scale.multiplyScalar(3);
  ground.castShadow = true;
  ground.receiveShadow = true;
  scene.add(ground);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.minDistance = 7;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.1;
  controls.update();

  window.addEventListener("resize", resize);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
