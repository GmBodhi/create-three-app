import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import {
  abs,
  blendOverlay,
  color,
  float,
  Fn,
  instancedBufferAttribute,
  materialColor,
  max,
  normalWorldGeometry,
  pass,
  positionGeometry,
  positionLocal,
  pow2,
  reflector,
  screenUV,
  sin,
  sub,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import Stats from "three/addons/libs/stats.module.js";
import TWEEN from "three/addons/libs/tween.module.js";

let camera, scene, renderer;
let postProcessing;
let controls;
let stats;

// below uniforms will be animated via TWEEN.js

const uniformEffector1 = uniform(-0.2);
const uniformEffector2 = uniform(-0.2);

init();

async function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.25,
    30
  );
  camera.position.set(4, 2, 4);

  scene = new Scene();
  scene.fog = new Fog(0x4195a4, 1, 20);
  scene.backgroundNode = normalWorldGeometry.y.mix(
    color(0x4195a4),
    color(0x0066ff)
  );
  camera.lookAt(0, 1, 0);

  const sunLight = new DirectionalLight(0xffe499, 2);
  sunLight.position.set(7, 5, 7);
  sunLight.castShadow = true;
  sunLight.shadow.camera.zoom = 1.5;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.bias = -0.0001;
  scene.add(sunLight);

  const backLight = new DirectionalLight(0x0487e2, 0.5);
  backLight.position.set(7, -5, 7);
  scene.add(backLight);

  // textures

  const textureLoader = new TextureLoader();

  const floorColor = await textureLoader.loadAsync(
    "textures/floors/FloorsCheckerboard_S_Diffuse.jpg"
  );
  floorColor.wrapS = RepeatWrapping;
  floorColor.wrapT = RepeatWrapping;
  floorColor.colorSpace = SRGBColorSpace;
  floorColor.repeat.set(15, 15);

  const floorNormal = await textureLoader.loadAsync(
    "textures/floors/FloorsCheckerboard_S_Normal.jpg"
  );
  floorNormal.wrapS = RepeatWrapping;
  floorNormal.wrapT = RepeatWrapping;
  floorNormal.repeat.set(15, 15);

  // tree

  const treeMesh = createTreeMesh();
  treeMesh.castShadow = true;
  treeMesh.receiveShadow = true;
  scene.add(treeMesh);

  // floor

  const floorUV = uv().mul(15);
  const floorNormalOffset = texture(floorNormal, floorUV)
    .xy.mul(2)
    .sub(1)
    .mul(0.02);

  const reflection = reflector({ resolution: 0.2 });
  reflection.target.rotateX(-Math.PI / 2);
  reflection.uvNode = reflection.uvNode.add(floorNormalOffset);
  scene.add(reflection.target);

  const floorMaterial = new MeshPhongNodeMaterial();
  floorMaterial.colorNode = texture(floorColor, floorUV);
  floorMaterial.emissiveNode = reflection.mul(0.25);
  floorMaterial.normalMap = floorNormal;
  floorMaterial.normalScale.set(0.2, -0.2);

  const floor = new Mesh(new BoxGeometry(50, 0.001, 50), floorMaterial);
  floor.receiveShadow = true;
  scene.add(floor);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1;
  controls.target.set(0, 1, 0);
  controls.update();

  // post-processing

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode();
  const scenePassDepth = scenePass.getLinearDepthNode().remapClamp(0.3, 0.7);

  const scenePassColorBlurred = gaussianBlur(scenePassColor);
  scenePassColorBlurred.directionNode = scenePassDepth;

  const vignette = screenUV.distance(0.5).mul(1.25).clamp().oneMinus().sub(0.2);

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputNode = blendOverlay(scenePassColorBlurred, vignette);

  // tweens

  new TWEEN.Tween(uniformEffector1)
    .to({ value: 1.2 }, 3000)
    .delay(800)
    .repeat(Infinity)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .start();

  new TWEEN.Tween(uniformEffector2)
    .to({ value: 1.2 }, 3000)
    .repeat(Infinity)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .start();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  stats.update();

  controls.update();

  TWEEN.update();

  postProcessing.render();
}

function random() {
  return (Math.random() - 0.5) * 2.0;
}

function createTreeMesh() {
  const maxSteps = 5;
  const lengthMult = 0.8;

  const positions = [];
  const normals = [];
  const colors = [];
  const data = []; // will save seed, size and time

  let instanceCount = 0;

  const newPosition = new Vector3();
  const position = new Vector3();
  const normal = new Vector3();
  const color = new Color();

  function createTreePart(angle, x, y, z, length, count) {
    if (Math.random() > (maxSteps / count) * 0.25) return;

    if (count < maxSteps) {
      const newLength = length * lengthMult;
      const newX = x + Math.cos(angle) * length;
      const newY = y + Math.sin(angle) * length;
      const countSq = Math.min(3.2, count * count);
      const newZ = z + (Math.random() * countSq - countSq / 2) * length;

      let size = 30 - count * 8;
      if (size > 25) size = 25;
      if (size < 10) size = 10;

      size = size / 100;

      const subSteps = 50;

      // below loop generates the instanced data for a tree part

      for (let i = 0; i < subSteps; i++) {
        instanceCount++;

        const percent = i / subSteps;
        const extra = 1 / maxSteps;

        // position

        newPosition.set(x, y, z).lerp(new Vector3(newX, newY, newZ), percent);
        position.copy(newPosition);

        position.x += random() * size * 3;
        position.y += random() * size * 3;
        position.z += random() * size * 3;

        positions.push(position.x, position.y, position.z);

        const scale = Math.random() + 5;

        // normal

        normal.copy(position).sub(newPosition).normalize();
        normals.push(normal.x, normal.y, normal.z);

        // color

        color.setHSL(
          (count / maxSteps) * 0.5 + Math.random() * 0.05,
          0.75,
          0.6 + Math.random() * 0.1
        );
        colors.push(color.r, color.g, color.b);

        // to save vertex buffers, we store the size, time and seed in a single attribute

        const instanceSize = size * scale;
        const instanceTime = count / maxSteps + percent * extra;
        const instanceSeed = Math.random();

        data.push(instanceSize, instanceTime, instanceSeed);
      }

      createTreePart(
        angle + random(),
        newX,
        newY,
        newZ,
        newLength + random(),
        count + 1
      );
      createTreePart(
        angle + random(),
        newX,
        newY,
        newZ,
        newLength + random(),
        count + 1
      );
      createTreePart(
        angle + random(),
        newX,
        newY,
        newZ,
        newLength + random(),
        count + 1
      );
      createTreePart(
        angle + random(),
        newX,
        newY,
        newZ,
        newLength + random(),
        count + 1
      );
      createTreePart(
        angle + random(),
        newX,
        newY,
        newZ,
        newLength + random(),
        count + 1
      );
      createTreePart(
        angle + random(),
        newX,
        newY,
        newZ,
        newLength + random(),
        count + 1
      );
    }
  }

  const angle = Math.PI * 0.5;

  // the tree is represented as a collection of instances boxes generated with below recursive function

  createTreePart(angle, 0, 0, 0, 16, 0);

  const geometry = new BoxGeometry();
  const material = new MeshStandardNodeMaterial();
  const mesh = new Mesh(geometry, material);
  mesh.scale.setScalar(0.05);
  mesh.count = instanceCount;
  mesh.frustumCulled = false;

  // instanced data

  const attributePosition = new InstancedBufferAttribute(
    new Float32Array(positions),
    3
  );
  const attributeNormal = new InstancedBufferAttribute(
    new Float32Array(normals),
    3
  );
  const attributeColor = new InstancedBufferAttribute(
    new Float32Array(colors),
    3
  );
  const attributeData = new InstancedBufferAttribute(new Float32Array(data), 3);

  // TSL

  const instancePosition = instancedBufferAttribute(attributePosition);
  const instanceNormal = instancedBufferAttribute(attributeNormal);
  const instanceColor = instancedBufferAttribute(attributeColor);
  const instanceData = instancedBufferAttribute(attributeData);

  material.positionNode = Fn(() => {
    const instanceSize = instanceData.x;
    const instanceTime = instanceData.y;
    const instanceSeed = instanceData.z;

    // effectors (these are responsible for the blob-like scale effects)

    const dif1 = abs(instanceTime.sub(uniformEffector1)).toConst();
    let effect = dif1
      .lessThanEqual(0.15)
      .select(sub(0.15, dif1).mul(sub(1.7, instanceTime).mul(10)), float(0));

    const dif2 = abs(instanceTime.sub(uniformEffector2)).toConst();
    effect = dif2
      .lessThanEqual(0.15)
      .select(sub(0.15, dif2).mul(sub(1.7, instanceTime).mul(10)), effect);

    // accumulate different vertex animations

    let animated = positionLocal.add(instancePosition).toVar();
    const direction = positionGeometry.normalize().toConst();

    animated = animated.add(direction.mul(effect.add(instanceSize)));
    animated = animated.sub(direction.mul(effect));
    animated = animated.add(instanceNormal.mul(effect.mul(1)));
    animated = animated.add(
      instanceNormal.mul(abs(sin(time.add(instanceSeed.mul(2))).mul(1.5)))
    );

    return animated;
  })();

  const squareEdge = Fn(() => {
    const pos = uv().sub(vec2(0.5, 0.5));
    const squareDistance = max(abs(pos.x), abs(pos.y));
    return squareDistance.div(0.5).clamp(0.85, 1).sub(0.5).mul(2.0);
  })();

  material.colorNode = Fn(() => {
    return squareEdge.sub(instanceColor);
  })();

  material.emissiveNode = Fn(() => {
    const instanceTime = instanceData.y;

    const dif1 = abs(instanceTime.sub(uniformEffector1)).toConst();
    const effect1 = dif1
      .lessThanEqual(0.15)
      .select(sub(0.15, dif1).mul(sub(1.7, instanceTime).mul(10)), float(0));

    const dif2 = abs(instanceTime.sub(uniformEffector2)).toConst();
    const effect2 = dif2
      .lessThanEqual(0.15)
      .select(sub(0.15, dif2).mul(sub(1.7, instanceTime).mul(10)), effect1);

    return pow2(vec3(effect1, 0, effect2)).mul(instanceColor);
  })();

  return mesh;
}
