import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  vec4,
  storage,
  Fn,
  If,
  uniform,
  instanceIndex,
  objectWorldMatrix,
  color,
  screenUV,
  attribute,
} from "three/tsl";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer;
let raycaster, pointer;
let stats;

let mesh;

const pointerPosition = uniform(vec4(0));
const elasticity = uniform(0.4); // elasticity ( how "strong" the spring is )
const damping = uniform(0.94); // damping factor ( energy loss )
const brushSize = uniform(0.25);
const brushStrength = uniform(0.22);

init();

const jelly = Fn(({ renderer, geometry, object }) => {
  const count = geometry.attributes.position.count;

  // Create storage buffer attribute for modified position.

  const positionBaseAttribute = geometry.attributes.position;
  const positionStorageBufferAttribute = new StorageBufferAttribute(count, 3);
  const speedBufferAttribute = new StorageBufferAttribute(count, 3);

  geometry.setAttribute("storagePosition", positionStorageBufferAttribute);

  // Attributes

  const positionAttribute = storage(positionBaseAttribute, "vec3", count);
  const positionStorageAttribute = storage(
    positionStorageBufferAttribute,
    "vec3",
    count
  );

  const speedAttribute = storage(speedBufferAttribute, "vec3", count);

  // Vectors

  // Base vec3 position of the mesh vertices.
  const basePosition = positionAttribute.element(instanceIndex);
  // Mesh vertices after compute modification.
  const currentPosition = positionStorageAttribute.element(instanceIndex);
  // Speed of each mesh vertex.
  const currentSpeed = speedAttribute.element(instanceIndex);

  //

  const computeInit = Fn(() => {
    // Modified storage position starts out the same as the base position.

    currentPosition.assign(basePosition);
  })().compute(count);

  //

  const computeUpdate = Fn(() => {
    // pinch

    If(pointerPosition.w.equal(1), () => {
      const worldPosition = objectWorldMatrix(object).mul(currentPosition);

      const dist = worldPosition.distance(pointerPosition.xyz);
      const direction = pointerPosition.xyz.sub(worldPosition).normalize();

      const power = brushSize.sub(dist).max(0).mul(brushStrength);

      currentPosition.addAssign(direction.mul(power));
    });

    // compute ( jelly )

    const distance = basePosition.distance(currentPosition);
    const force = elasticity
      .mul(distance)
      .mul(basePosition.sub(currentPosition));

    currentSpeed.addAssign(force);
    currentSpeed.mulAssign(damping);

    currentPosition.addAssign(currentSpeed);
  })().compute(count);

  // initialize the storage buffer with the base position

  computeUpdate.onInit(() => renderer.compute(computeInit));

  //

  return computeUpdate;
});

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 0, 1);

  scene = new Scene();

  raycaster = new Raycaster();
  pointer = new Vector2();

  // background

  const bgColor = screenUV.y.mix(color(0x9f87f7), color(0xf2cdcd));
  const bgVignette = screenUV.distance(0.5).remapClamp(0.3, 0.8).oneMinus();
  const bgIntensity = 4;

  scene.backgroundNode = bgColor.mul(
    bgVignette.mul(color(0xa78ff6).mul(bgIntensity))
  );

  // model

  new GLTFLoader().load(
    "models/gltf/LeePerrySmith/LeePerrySmith.glb",
    function (gltf) {
      // create jelly effect material

      const material = new MeshNormalNodeMaterial();
      material.geometryNode = jelly();
      material.positionNode = attribute("storagePosition");

      // apply the material to the mesh

      mesh = gltf.scene.children[0];
      mesh.scale.setScalar(0.1);
      mesh.material = material;
      scene.add(mesh);
    }
  );

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.7;
  controls.maxDistance = 2;

  const gui = new GUI();
  gui.add(elasticity, "value", 0, 0.5).name("elasticity");
  gui.add(damping, "value", 0.9, 0.98).name("damping");
  gui.add(brushSize, "value", 0.1, 0.5).name("brush size");
  gui.add(brushStrength, "value", 0.1, 0.3).name("brush strength");

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("pointermove", onPointerMove);
}

function onPointerMove(event) {
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObject(scene);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    pointerPosition.value.copy(intersect.point);
    pointerPosition.value.w = 1; // enable
  } else {
    pointerPosition.value.w = 0; // disable
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  stats.update();

  renderer.render(scene, camera);
}
