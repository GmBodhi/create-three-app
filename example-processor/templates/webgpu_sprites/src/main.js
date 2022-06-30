import "./style.css"; // For webpack support

import { PerspectiveCamera, Scene, TextureLoader, Group, Sprite } from "three";
import * as Nodes from "three-nodes/Nodes.js";

import { texture, uv, mul, float, color, userData } from "three-nodes/Nodes.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;

let map;

let group;

let imageWidth = 1,
  imageHeight = 1;

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new PerspectiveCamera(60, width / height, 1, 2100);
  camera.position.z = 1500;

  scene = new Scene();
  scene.fogNode = new Nodes.FogRangeNode(
    color(0x0000ff),
    float(1500),
    float(2100)
  );

  // create sprites

  const amount = 200;
  const radius = 500;

  const textureLoader = new TextureLoader();

  map = textureLoader.load("textures/sprite1.png", (map) => {
    imageWidth = map.image.width;
    imageHeight = map.image.height;
  });

  group = new Group();

  const textureNode = texture(map);

  const material = new Nodes.SpriteNodeMaterial();
  material.colorNode = mul(textureNode, mul(uv(), 2));
  material.opacityNode = textureNode.a;
  material.rotationNode = userData("rotation", "float"); // get value of: sprite.userData.rotation
  material.transparent = true;

  for (let a = 0; a < amount; a++) {
    const x = Math.random() - 0.5;
    const y = Math.random() - 0.5;
    const z = Math.random() - 0.5;

    const sprite = new Sprite(material);

    sprite.position.set(x, y, z);
    sprite.position.normalize();
    sprite.position.multiplyScalar(radius);

    // individual rotation per sprite
    sprite.userData.rotation = 0;

    group.add(sprite);
  }

  scene.add(group);

  //

  renderer = new WebGPURenderer({
    requiredFeatures: ["texture-compression-bc"],
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  return renderer.init();
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  const time = Date.now() / 1000;

  for (let i = 0, l = group.children.length; i < l; i++) {
    const sprite = group.children[i];
    const scale = Math.sin(time + sprite.position.x * 0.01) * 0.3 + 1.0;

    sprite.userData.rotation += 0.1 * (i / l);
    sprite.scale.set(scale * imageWidth, scale * imageHeight, 1.0);
  }

  group.rotation.x = time * 0.5;
  group.rotation.y = time * 0.75;
  group.rotation.z = time * 1.0;

  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
