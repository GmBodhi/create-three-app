import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import {
  uniform,
  time,
  instanceIndex,
  instancedBufferAttribute,
} from "three/tsl";

let camera, scene, renderer, stats, material;
let mouseX = 0,
  mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

init();

function init() {
  camera = new PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    2,
    2000
  );
  camera.position.z = 1000;

  scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.001);

  // positions

  const count = 10000;

  const positions = [];

  for (let i = 0; i < count; i++) {
    positions.push(
      2000 * Math.random() - 1000,
      2000 * Math.random() - 1000,
      2000 * Math.random() - 1000
    );
  }

  const positionAttribute = new InstancedBufferAttribute(
    new Float32Array(positions),
    3
  );

  // texture

  const map = new TextureLoader().load("textures/sprites/snowflake1.png");
  map.colorSpace = SRGBColorSpace;

  // material

  material = new SpriteNodeMaterial({
    sizeAttenuation: true,
    map,
    alphaMap: map,
    alphaTest: 0.1,
  });
  material.color.setHSL(1.0, 0.3, 0.7, SRGBColorSpace);
  material.positionNode = instancedBufferAttribute(positionAttribute);
  material.rotationNode = time.add(instanceIndex).sin();
  material.scaleNode = uniform(15);

  // sprites

  const particles = new Sprite(material);
  particles.count = count;

  scene.add(particles);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  const gui = new GUI();

  gui.add(material, "sizeAttenuation").onChange(function () {
    material.needsUpdate = true;
    material.scaleNode.value = material.sizeAttenuation ? 15 : 0.03;
  });

  gui.open();

  //

  document.body.style.touchAction = "none";
  document.body.addEventListener("pointermove", onPointerMove);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

//

function animate() {
  render();
  stats.update();
}

function render() {
  const time = Date.now() * 0.00005;

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  const h = ((360 * (1.0 + time)) % 360) / 360;
  material.color.setHSL(h, 0.5, 0.5);

  renderer.render(scene, camera);
}
