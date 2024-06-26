import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  Vector3,
  SpriteNodeMaterial,
  Mesh,
  PlaneGeometry,
  AdditiveBlending,
  GridHelper,
  WebGPURenderer,
} from "three";
import {
  range,
  texture,
  mix,
  uv,
  color,
  positionLocal,
  timerLocal,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer;
let controls;

init();

function init() {
  const { innerWidth, innerHeight } = window;

  camera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 5000);
  camera.position.set(1300, 500, 0);

  scene = new Scene();
  //scene.fogNode = rangeFog( color( 0x0000ff ), 1500, 2100 );

  // textures

  const textureLoader = new TextureLoader();
  const map = textureLoader.load("textures/opengameart/smoke1.png");

  // create nodes

  const lifeRange = range(0.1, 1);
  const offsetRange = range(new Vector3(-2, 3, -2), new Vector3(2, 5, 2));

  const timer = timerLocal(0.2, 1 /*100000*/); // @TODO: need to work with 64-bit precision

  const lifeTime = timer.mul(lifeRange).mod(1);
  const scaleRange = range(0.3, 2);
  const rotateRange = range(0.1, 4);

  const life = lifeTime.div(lifeRange);

  const fakeLightEffect = positionLocal.y.oneMinus().max(0.2);

  const textureNode = texture(map, uv().rotateUV(timer.mul(rotateRange)));

  const opacityNode = textureNode.a.mul(life.oneMinus());

  const smokeColor = mix(
    color(0x2c1501),
    color(0x222222),
    positionLocal.y.mul(3).clamp()
  );

  // create particles

  const smokeNodeMaterial = new SpriteNodeMaterial();
  smokeNodeMaterial.colorNode = mix(
    color(0xf27d0c),
    smokeColor,
    life.mul(2.5).min(1)
  ).mul(fakeLightEffect);
  smokeNodeMaterial.opacityNode = opacityNode;
  smokeNodeMaterial.positionNode = offsetRange.mul(lifeTime);
  smokeNodeMaterial.scaleNode = scaleRange.mul(lifeTime.max(0.3));
  smokeNodeMaterial.depthWrite = false;
  smokeNodeMaterial.transparent = true;

  const smokeInstancedSprite = new Mesh(
    new PlaneGeometry(1, 1),
    smokeNodeMaterial
  );
  smokeInstancedSprite.scale.setScalar(400);
  smokeInstancedSprite.count = 2000;
  scene.add(smokeInstancedSprite);

  //

  const fireNodeMaterial = new SpriteNodeMaterial();
  fireNodeMaterial.colorNode = mix(color(0xb72f17), color(0xb72f17), life);
  fireNodeMaterial.positionNode = range(
    new Vector3(-1, 1, -1),
    new Vector3(1, 2, 1)
  ).mul(lifeTime);
  fireNodeMaterial.scaleNode = smokeNodeMaterial.scaleNode;
  fireNodeMaterial.opacityNode = opacityNode;
  fireNodeMaterial.blending = AdditiveBlending;
  fireNodeMaterial.transparent = true;
  fireNodeMaterial.depthWrite = false;

  const fireInstancedSprite = new Mesh(
    new PlaneGeometry(1, 1),
    fireNodeMaterial
  );
  fireInstancedSprite.scale.setScalar(400);
  fireInstancedSprite.count = 100;
  fireInstancedSprite.position.y = -100;
  fireInstancedSprite.renderOrder = 1;
  scene.add(fireInstancedSprite);

  //

  const helper = new GridHelper(3000, 40, 0x303030, 0x303030);
  helper.position.y = -75;
  scene.add(helper);

  //

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  document.body.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxDistance = 2700;
  controls.target.set(0, 500, 0);
  controls.update();

  //

  window.addEventListener("resize", onWindowResize);

  // gui

  const gui = new GUI();

  gui.add(timer, "scale", 0, 1, 0.01).name("speed");
}

function onWindowResize() {
  const { innerWidth, innerHeight } = window;

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
}

function render() {
  renderer.render(scene, camera);
}
