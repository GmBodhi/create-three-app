import "./style.css"; // For webpack support

import {
  Vector3,
  PerspectiveCamera,
  Scene,
  TextureLoader,
  InstancedBufferAttribute,
  Mesh,
  PlaneGeometry,
  GridHelper,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
} from "three";
import {
  tslFn,
  uniform,
  texture,
  instanceIndex,
  float,
  vec3,
  storage,
  SpriteNodeMaterial,
  If,
} from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const particleCount = 100000;

const gravity = uniform(-0.0098);
const bounce = uniform(0.8);
const friction = uniform(0.99);
const size = uniform(0.12);

const clickPosition = uniform(new Vector3());

let camera, scene, renderer;
let controls, stats;
let computeParticles;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const { innerWidth, innerHeight } = window;

  camera = new PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(40, 15, 40);

  scene = new Scene();

  // textures

  const textureLoader = new TextureLoader();
  const map = textureLoader.load("textures/sprite1.png");

  //

  const createBuffer = () =>
    storage(
      new InstancedBufferAttribute(new Float32Array(particleCount * 4), 4),
      "vec3",
      particleCount
    );

  const positionBuffer = createBuffer();
  const velocityBuffer = createBuffer();
  const colorBuffer = createBuffer();

  // compute

  const computeInit = tslFn(() => {
    const position = positionBuffer.element(instanceIndex);
    const color = colorBuffer.element(instanceIndex);

    const randX = instanceIndex.hash();
    const randY = instanceIndex.add(2).hash();
    const randZ = instanceIndex.add(3).hash();

    position.x = randX.mul(60).add(-30);
    position.y = randY.mul(10);
    position.z = randZ.mul(60).add(-30);

    color.assign(vec3(randX, randY, randZ));
  })().compute(particleCount);

  //

  const computeUpdate = tslFn(() => {
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
  particles.isInstancedMesh = true;
  particles.count = particleCount;
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

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);
  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  renderer.compute(computeInit);

  // click event

  const computeHit = tslFn(() => {
    const position = positionBuffer.element(instanceIndex);
    const velocity = velocityBuffer.element(instanceIndex);

    const dist = position.distance(clickPosition);
    const direction = position.sub(clickPosition).normalize();
    const distArea = float(7).sub(dist).max(0);

    const power = distArea.mul(0.1);
    const relativePower = power.mul(instanceIndex.hash().mul(0.5).add(0.5));

    velocity.assign(velocity.add(direction.mul(relativePower)));
  })().compute(particleCount);

  //

  function onHit(event) {
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

      renderer.compute(computeHit);
    }
  }

  // events

  renderer.domElement.addEventListener("pointerdown", onHit);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 70;
  controls.target.set(0, -1, 0);
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

function animate() {
  stats.update();
  renderer.compute(computeParticles);
  renderer.render(scene, camera);
}