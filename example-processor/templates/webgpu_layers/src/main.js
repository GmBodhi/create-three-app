import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  SRGBColorSpace,
  PlaneGeometry,
  Mesh,
  WebGPURenderer,
  Vector3,
  MathUtils,
  InstancedBufferAttribute,
  MeshBasicNodeMaterial,
  DoubleSide,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import {
  positionLocal,
  time,
  mod,
  instancedBufferAttribute,
  rotate,
  screenUV,
  color,
  vec2,
} from "three/tsl";

let camera, scene, renderer;

init();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.layers.enable(0); // enabled by default
  camera.layers.enable(1);
  camera.layers.enable(2);

  camera.position.z = 10;

  scene = new Scene();

  const horizontalEffect = screenUV.x.mix(color(0xf996ae), color(0xf6f0a3));
  const lightEffect = screenUV
    .distance(vec2(0.5, 1.0))
    .oneMinus()
    .mul(color(0xd9b6fd));

  scene.backgroundNode = horizontalEffect.add(lightEffect);

  scene.add(camera);

  const sprite = new TextureLoader().load("textures/sprites/blossom.png");
  sprite.colorSpace = SRGBColorSpace;

  const count = 2500;

  const geometry = new PlaneGeometry(0.25, 0.25);

  const colors = [0xd70654, 0xffd95f, 0xb8d576];

  for (let i = 0; i < 3; i++) {
    const particles = new Mesh(geometry, getMaterial(count, colors[i], sprite));
    particles.layers.set(i);
    particles.count = count;
    scene.add(particles);
  }

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // GUI

  const layers = {
    "toggle red": function () {
      camera.layers.toggle(0);
    },

    "toggle yellow": function () {
      camera.layers.toggle(1);
    },

    "toggle green": function () {
      camera.layers.toggle(2);
    },

    "enable all": function () {
      camera.layers.enableAll();
    },

    "disable all": function () {
      camera.layers.disableAll();
    },
  };

  const gui = new GUI();
  gui.add(layers, "toggle red");
  gui.add(layers, "toggle yellow");
  gui.add(layers, "toggle green");
  gui.add(layers, "enable all");
  gui.add(layers, "disable all");

  //

  window.addEventListener("resize", onWindowResize);
}

function getMaterial(count, color, sprite) {
  // instance data

  const positions = [];
  const rotations = [];
  const directions = [];
  const timeOffsets = [];

  const v = new Vector3();

  for (let i = 0; i < count; i++) {
    positions.push(
      MathUtils.randFloat(-25, -20),
      MathUtils.randFloat(-10, 50),
      MathUtils.randFloat(-5, 5)
    );

    v.set(
      MathUtils.randFloat(0.7, 0.9),
      MathUtils.randFloat(-0.3, -0.15),
      0
    ).normalize();

    rotations.push(Math.random(), Math.random(), Math.random());

    directions.push(v.x, v.y, v.z);

    timeOffsets.push(i / count);
  }

  const positionAttribute = new InstancedBufferAttribute(
    new Float32Array(positions),
    3
  );
  const rotationAttribute = new InstancedBufferAttribute(
    new Float32Array(rotations),
    3
  );
  const directionAttribute = new InstancedBufferAttribute(
    new Float32Array(directions),
    3
  );
  const timeAttribute = new InstancedBufferAttribute(
    new Float32Array(timeOffsets),
    1
  );

  // material

  const material = new MeshBasicNodeMaterial({
    color: color,
    map: sprite,
    alphaMap: sprite,
    alphaTest: 0.1,
    side: DoubleSide,
    forceSinglePass: true,
  });

  // TSL

  const instancePosition = instancedBufferAttribute(positionAttribute);
  const instanceDirection = instancedBufferAttribute(directionAttribute);
  const instanceRotation = instancedBufferAttribute(rotationAttribute);

  const localTime = instancedBufferAttribute(timeAttribute).add(time.mul(0.02));
  const modTime = mod(localTime, 1.0);

  const rotatedPositon = rotate(
    positionLocal,
    instanceRotation.mul(modTime.mul(20))
  );
  material.positionNode = rotatedPositon
    .add(instancePosition)
    .add(instanceDirection.mul(modTime.mul(50)));

  return material;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.render(scene, camera);
}
