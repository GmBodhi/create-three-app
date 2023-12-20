import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Fog,
  DirectionalLight,
  HemisphereLight,
  Clock,
  AnimationMixer,
  TextureLoader,
  RepeatWrapping,
  NoColorSpace,
  TorusKnotGeometry,
  Group,
  Mesh,
  BoxGeometry,
  Vector3,
} from "three";
import {
  color,
  depth,
  depthTexture,
  normalWorld,
  triplanarTexture,
  texture,
  viewportSharedTexture,
  mx_worley_noise_float,
  positionWorld,
  timerLocal,
  MeshStandardNodeMaterial,
  MeshBasicNodeMaterial,
} from "three/nodes";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGL from "three/addons/capabilities/WebGL.js";

import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;
let mixer, objects, clock;
let model, floor, floorPosition;

init();

function init() {
  if (WebGPU.isAvailable() === false && WebGL.isWebGL2Available() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU or WebGL2 support");
  }

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.25,
    30
  );
  camera.position.set(3, 3, 4);

  scene = new Scene();
  scene.fog = new Fog(0x74ccf4, 7, 25);
  scene.backgroundNode = normalWorld.y.mix(color(0x74ccf4), color(0x0066ff));
  camera.lookAt(0, 1, 0);

  const sunLight = new DirectionalLight(0xffe499, 5);
  sunLight.castShadow = true;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 3;
  sunLight.shadow.camera.right = 2;
  sunLight.shadow.camera.left = -2;
  sunLight.shadow.camera.top = 2;
  sunLight.shadow.camera.bottom = -2;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.bias = -0.001;
  sunLight.position.set(1, 3, 1);

  const waterAmbientLight = new HemisphereLight(0x333366, 0x74ccf4, 5);
  const skyAmbientLight = new HemisphereLight(0x74ccf4, 0, 1);

  scene.add(sunLight);
  scene.add(skyAmbientLight);
  scene.add(waterAmbientLight);

  clock = new Clock();

  // animated model

  const loader = new GLTFLoader();
  loader.load("models/gltf/Michelle.glb", function (gltf) {
    model = gltf.scene;
    model.children[0].children[0].castShadow = true;

    mixer = new AnimationMixer(model);

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    scene.add(model);
  });

  // objects

  const textureLoader = new TextureLoader();
  const brick_diffuse = textureLoader.load(
    "three/examples/textures/brick_diffuse.jpg"
  );
  brick_diffuse.wrapS = RepeatWrapping;
  brick_diffuse.wrapT = RepeatWrapping;
  brick_diffuse.colorSpace = NoColorSpace;

  const brick = triplanarTexture(texture(brick_diffuse));

  const geometry = new TorusKnotGeometry(0.6, 0.3, 128, 64);
  const material = new MeshStandardNodeMaterial();
  material.colorNode = brick;

  const count = 100;
  const scale = 3.5;
  const column = 10;

  objects = new Group();

  for (let i = 0; i < count; i++) {
    const x = i % column;
    const y = i / column;

    const mesh = new Mesh(geometry, material);
    mesh.position.set(x * scale, 0, y * scale);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    objects.add(mesh);
  }

  objects.position.set(
    (column - 1) * scale * -0.5,
    -0.3,
    (count / column) * scale * -0.5
  );

  scene.add(objects);

  // water

  const depthEffect = depthTexture().distance(depth).remapClamp(0, 0.05);

  const timer = timerLocal(0.8);
  const floorUV = positionWorld.xzy;

  const waterLayer0 = mx_worley_noise_float(floorUV.mul(4).add(timer));
  const waterLayer1 = mx_worley_noise_float(floorUV.mul(2).add(timer));
  const waterLayer2 = mx_worley_noise_float(floorUV.mul(3).add(timer));

  const waterIntensity = waterLayer0.mul(waterLayer1).mul(waterLayer2).mul(5);
  const waterColor = waterIntensity.mix(color(0x0f5e9c), color(0x74ccf4));
  const viewportTexture = viewportSharedTexture();

  const waterMaterial = new MeshBasicNodeMaterial();
  waterMaterial.colorNode = waterColor;
  waterMaterial.backdropNode = depthEffect
    .mul(3)
    .min(1.4)
    .mix(viewportTexture, viewportTexture.mul(color(0x74ccf4)));
  waterMaterial.backdropAlphaNode = depthEffect.oneMinus();
  waterMaterial.transparent = true;

  const water = new Mesh(new BoxGeometry(100, 0.001, 100), waterMaterial);
  water.position.set(0, 0.8, 0);
  scene.add(water);

  // floor

  floor = new Mesh(
    new BoxGeometry(1.7, 10, 1.7),
    new MeshStandardNodeMaterial({ colorNode: brick })
  );
  floor.position.set(0, -5, 0);
  scene.add(floor);

  // caustics

  const waterPosY = positionWorld.y.sub(water.position.y);

  let transition = waterPosY.add(0.1).saturate().oneMinus();
  transition = waterPosY
    .lessThan(0)
    .cond(transition, normalWorld.y.mix(transition, 0))
    .toVar();

  material.colorNode = transition.mix(
    material.colorNode,
    material.colorNode.add(waterLayer0)
  );
  floor.material.colorNode = material.colorNode;

  // renderer

  renderer = new WebGPURenderer(/*{ antialias: true }*/);
  renderer.stencil = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI * 0.9;
  controls.target.set(0, 1, 0);
  controls.update();

  // gui

  const gui = new GUI();

  floorPosition = new Vector3(0, 1, 0);

  gui.add(floorPosition, "y", 0, 2, 0.001).name("position");

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  floor.position.y = floorPosition.y - 5;

  if (model) {
    mixer.update(delta);

    model.position.y = floorPosition.y;
  }

  for (const object of objects.children) {
    object.position.y = Math.sin(clock.elapsedTime + object.id) * 0.3;
    object.rotation.y += delta * 0.3;
  }

  renderer.render(scene, camera);
}
