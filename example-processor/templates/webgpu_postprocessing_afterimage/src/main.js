import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  instancedBufferAttribute,
  mod,
  pass,
  texture,
  float,
  time,
  vec2,
  vec3,
  vec4,
  sin,
  cos,
} from "three/tsl";
import { afterImage } from "three/addons/tsl/display/AfterImageNode.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, particles, stats;
let postProcessing, afterImagePass, scenePass;

const params = {
  damp: 0.8,
  enabled: true,
};

init();

function init() {
  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 1000;

  scene = new Scene();

  const sprite = new TextureLoader().load("textures/sprites/circle.png");

  // geometry

  const radius = 600;
  const count = 50000;

  const vertex = new Vector3();
  const color = new Color();

  const colors = [];
  const vertices = [];
  const timeOffsets = [];

  for (var i = 0; i < count; i++) {
    getRandomPointOnSphere(radius, vertex);
    vertices.push(vertex.x, vertex.y, vertex.z);

    color.setHSL(i / count, 0.7, 0.7, SRGBColorSpace);
    colors.push(color.r, color.g, color.b);

    timeOffsets.push(i / count);
  }

  const positionAttribute = new InstancedBufferAttribute(
    new Float32Array(vertices),
    3
  );
  const colorAttribute = new InstancedBufferAttribute(
    new Float32Array(colors),
    3
  );
  const timeAttribute = new InstancedBufferAttribute(
    new Float32Array(timeOffsets),
    1
  );

  // material and TSL

  const material = new SpriteNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
  });

  const localTime = instancedBufferAttribute(timeAttribute).add(time.mul(0.1));
  const modTime = mod(localTime, 1.0);
  const accTime = modTime.mul(modTime);

  const angle = accTime.mul(40.0);
  const pulse = vec2(sin(angle).mul(20.0), cos(angle).mul(20.0));
  const pos = instancedBufferAttribute(positionAttribute);

  const animated = vec3(
    pos.x.mul(accTime).add(pulse.x),
    pos.y.mul(accTime).add(pulse.y),
    pos.z.mul(accTime).mul(1.75)
  );
  const fAlpha = modTime.oneMinus().mul(2.0);

  material.colorNode = texture(sprite).mul(
    vec4(instancedBufferAttribute(colorAttribute), fAlpha)
  );
  material.positionNode = animated;
  material.scaleNode = float(2);

  particles = new Sprite(material);
  particles.count = count;
  scene.add(particles);

  // postprocessing

  postProcessing = new PostProcessing(renderer);

  scenePass = pass(scene, camera);

  afterImagePass = afterImage(scenePass, params.damp);

  postProcessing.outputNode = afterImagePass;

  //

  const gui = new GUI({ title: "Damp setting" });
  gui.add(afterImagePass.damp, "value", 0.25, 1);
  gui.add(params, "enabled").onChange(updatePassChain);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function updatePassChain() {
  if (params.enabled === true) {
    postProcessing.outputNode = afterImagePass;
  } else {
    postProcessing.outputNode = scenePass;
  }

  postProcessing.needsUpdate = true;
}

function getRandomPointOnSphere(r, v) {
  const angle = Math.random() * Math.PI * 2;
  const u = Math.random() * 2 - 1;

  v.set(
    Math.cos(angle) * Math.sqrt(1 - Math.pow(u, 2)) * r,
    Math.sin(angle) * Math.sqrt(1 - Math.pow(u, 2)) * r,
    u * r
  );

  return v;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
  particles.rotation.z = time * 0.001;

  postProcessing.render();

  stats.update();
}
