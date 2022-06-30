import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  Vector3,
  Mesh,
  PlaneGeometry,
  AdditiveBlending,
  GridHelper,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import {
  range,
  texture,
  mix,
  uv,
  mul,
  mod,
  rotateUV,
  color,
  max,
  min,
  div,
  saturate,
  positionWorld,
  invert,
  timerLocal,
} from "three-nodes/Nodes.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;
let controls;

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const { innerWidth, innerHeight } = window;

  camera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 5000);
  camera.position.set(1300, 500, 0);

  scene = new Scene();
  //scene.fogNode = new Nodes.FogRangeNode( Nodes.color( 0x0000ff ), Nodes.float( 1500 ), Nodes.float( 2100 )  );

  // textures

  const textureLoader = new TextureLoader();
  const map = textureLoader.load("textures/opengameart/smoke1.png");

  // create nodes

  const lifeRange = range(0.1, 1);
  const offsetRange = range(new Vector3(-2, 3, -2), new Vector3(2, 5, 2));

  const timer = timerLocal(0.2, 1 /*100000*/); // @TODO: need to work with 64-bit precision

  const lifeTime = mod(mul(timer, lifeRange), 1);
  const scaleRange = range(0.3, 2);
  const rotateRange = range(0.1, 4);

  const life = div(lifeTime, lifeRange);

  const fakeLightEffect = max(0.2, invert(positionWorld.y));

  const textureNode = texture(map, rotateUV(uv(), mul(timer, rotateRange)));

  const opacityNode = mul(textureNode.a, invert(life));

  const smokeColor = mix(
    color(0x2c1501),
    color(0x222222),
    saturate(mul(positionWorld.y, 3))
  );

  // create particles

  const smokeNodeMaterial = new Nodes.SpriteNodeMaterial();
  smokeNodeMaterial.colorNode = mul(
    mix(color(0xf27d0c), smokeColor, min(mul(life, 2.5), 1)),
    fakeLightEffect
  );
  smokeNodeMaterial.opacityNode = opacityNode;
  smokeNodeMaterial.positionNode = mul(offsetRange, lifeTime);
  smokeNodeMaterial.scaleNode = mul(scaleRange, max(0.3, lifeTime));
  smokeNodeMaterial.depthWrite = false;
  smokeNodeMaterial.transparent = true;

  const smokeInstancedSprite = new Mesh(
    new PlaneGeometry(1, 1),
    smokeNodeMaterial
  );
  smokeInstancedSprite.scale.setScalar(400);
  smokeInstancedSprite.isInstancedMesh = true;
  smokeInstancedSprite.count = 2000;
  scene.add(smokeInstancedSprite);

  //

  const fireNodeMaterial = new Nodes.SpriteNodeMaterial();
  fireNodeMaterial.colorNode = mix(color(0xb72f17), color(0xb72f17), life);
  fireNodeMaterial.positionNode = mul(
    range(new Vector3(-1, 1, -1), new Vector3(1, 2, 1)),
    lifeTime
  );
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
  fireInstancedSprite.isInstancedMesh = true;
  fireInstancedSprite.count = 100;
  fireInstancedSprite.position.y = -100;
  fireInstancedSprite.renderOrder = 1;
  scene.add(fireInstancedSprite);

  //

  const helper = new GridHelper(3000, 40, 0x303030, 0x303030);
  helper.material.colorNode = new Nodes.AttributeNode("color");
  helper.position.y = -75;
  scene.add(helper);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
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

  return renderer.init();
}

function onWindowResize() {
  const { innerWidth, innerHeight } = window;

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
