import "./style.css"; // For webpack support

import {
  Vector3,
  PerspectiveCamera,
  Scene,
  TextureLoader,
  SpriteNodeMaterial,
  Mesh,
  PlaneGeometry,
  GridHelper,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
  WebGPURenderer,
  TimestampQuery,
} from "three";
import {
  Fn,
  uniform,
  texture,
  instancedArray,
  instanceIndex,
  float,
  hash,
  vec3,
  If,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const particleCount = 500000;

const gravity = uniform(-0.0098);
const bounce = uniform(0.8);
const friction = uniform(0.99);
const size = uniform(0.12);

const clickPosition = uniform(new Vector3());

let camera, scene, renderer;
let controls, stats;
let computeParticles;

const timestamps = document.getElementById("timestamps");

init();

function init() {
  const { innerWidth, innerHeight } = window;

  camera = new PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(15, 30, 15);

  scene = new Scene();

  // textures

  const textureLoader = new TextureLoader();
  const map = textureLoader.load("textures/sprite1.png");

  //

  const positionBuffer = instancedArray(particleCount, "vec3");
  const velocityBuffer = instancedArray(particleCount, "vec3");
  const colorBuffer = instancedArray(particleCount, "vec3");

  // compute

  const computeInit = Fn(() => {
    const position = positionBuffer.element(instanceIndex);
    const color = colorBuffer.element(instanceIndex);

    const randX = hash(instanceIndex);
    const randY = hash(instanceIndex.add(2));
    const randZ = hash(instanceIndex.add(3));

    position.x = randX.mul(100).add(-50);
    position.y = 0; // randY.mul( 10 );
    position.z = randZ.mul(100).add(-50);

    color.assign(vec3(randX, randY, randZ));
  })().compute(particleCount);

  //

  const computeUpdate = Fn(() => {
    const position = positionBuffer.element(instanceIndex);
    const velocity = velocityBuffer.element(instanceIndex);

    velocity.addAssign(vec3(0.0, gravity, 0.0));
    position.addAssign(velocity);

    velocity.mulAssign(friction);

    // floor

    If(position.y.lessThan(0), () => {
      position.y = 0;
      velocity.y = velocity.y.negate().mul(bounce);

      // floor friction

      velocity.x = velocity.x.mul(0.9);
      velocity.z = velocity.z.mul(0.9);
    });
  });

  computeParticles = computeUpdate().compute(particleCount);

  // create nodes

  const textureNode = texture(map);

  // create particles

  const particleMaterial = new SpriteNodeMaterial();
  particleMaterial.colorNode = textureNode.mul(
    colorBuffer.element(instanceIndex)
  );
  particleMaterial.positionNode = positionBuffer.toAttribute();
  particleMaterial.scaleNode = size;
  particleMaterial.depthWrite = false;
  particleMaterial.depthTest = true;
  particleMaterial.transparent = true;

  const particles = new Mesh(new PlaneGeometry(1, 1), particleMaterial);
  particles.count = particleCount;
  particles.frustumCulled = false;
  scene.add(particles);

  //

  const helper = new GridHelper(60, 40, 0x303030, 0x303030);
  scene.add(helper);

  const geometry = new PlaneGeometry(1000, 1000);
  geometry.rotateX(-Math.PI / 2);

  const plane = new Mesh(geometry, new MeshBasicMaterial({ visible: false }));
  scene.add(plane);

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  //

  renderer = new WebGPURenderer({ antialias: true, trackTimestamp: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  renderer.computeAsync(computeInit);

  // click event

  const computeHit = Fn(() => {
    const position = positionBuffer.element(instanceIndex);
    const velocity = velocityBuffer.element(instanceIndex);

    const dist = position.distance(clickPosition);
    const direction = position.sub(clickPosition).normalize();
    const distArea = float(6).sub(dist).max(0);

    const power = distArea.mul(0.01);
    const relativePower = power.mul(hash(instanceIndex).mul(0.5).add(0.5));

    velocity.assign(velocity.add(direction.mul(relativePower)));
  })().compute(particleCount);

  //

  function onMove(event) {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects([plane], false);

    if (intersects.length > 0) {
      const { point } = intersects[0];

      // move to uniform

      clickPosition.value.copy(point);
      clickPosition.value.y = -1;

      // compute

      renderer.computeAsync(computeHit);
    }
  }

  // events

  renderer.domElement.addEventListener("pointermove", onMove);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 200;
  controls.target.set(0, 0, 0);
  controls.update();

  //

  window.addEventListener("resize", onWindowResize);

  // gui

  const gui = new GUI();

  gui.add(gravity, "value", -0.0098, 0, 0.0001).name("gravity");
  gui.add(bounce, "value", 0.1, 1, 0.01).name("bounce");
  gui.add(friction, "value", 0.96, 0.99, 0.01).name("friction");
  gui.add(size, "value", 0.12, 0.5, 0.01).name("size");
}

function onWindowResize() {
  const { innerWidth, innerHeight } = window;

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
}

async function animate() {
  stats.update();

  await renderer.computeAsync(computeParticles);
  renderer.resolveTimestampsAsync(TimestampQuery.COMPUTE);

  await renderer.renderAsync(scene, camera);
  renderer.resolveTimestampsAsync(TimestampQuery.RENDER);

  // throttle the logging

  if (renderer.hasFeature("timestamp-query")) {
    if (renderer.info.render.calls % 5 === 0) {
      timestamps.innerHTML = `

							Compute ${
                renderer.info.compute.frameCalls
              } pass in ${renderer.info.compute.timestamp.toFixed(6)}ms<br>
							Draw ${
                renderer.info.render.drawCalls
              } pass in ${renderer.info.render.timestamp.toFixed(6)}ms`;
    }
  } else {
    timestamps.innerHTML = "Timestamp queries not supported";
  }
}
