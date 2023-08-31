import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  FogExp2,
  SphereGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  TextureLoader,
  SRGBColorSpace,
  AdditiveBlending,
  Points,
  WebGLRenderer,
} from "three";
import {
  attribute,
  timerLocal,
  positionLocal,
  spritesheetUV,
  pointUV,
  vec2,
  texture,
  uniform,
  mix,
  PointsNodeMaterial,
} from "three/nodes";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { nodeFrame } from "three/addons/renderers/webgl-legacy/nodes/WebGLNodes.js";

let camera, scene, renderer, stats;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    2,
    2000
  );
  camera.position.x = 0;
  camera.position.y = 100;
  camera.position.z = -300;

  scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.001);

  // geometries

  const teapotGeometry = new TeapotGeometry(50, 7);
  const sphereGeometry = new SphereGeometry(50, 130, 16);

  const geometry = new BufferGeometry();

  // buffers

  const speed = [];
  const intensity = [];
  const size = [];

  const positionAttribute = teapotGeometry.getAttribute("position");
  const particleCount = positionAttribute.count;

  for (let i = 0; i < particleCount; i++) {
    speed.push(20 + Math.random() * 50);

    intensity.push(Math.random() * 0.04);

    size.push(30 + Math.random() * 230);
  }

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute(
    "targetPosition",
    sphereGeometry.getAttribute("position")
  );
  geometry.setAttribute("particleSpeed", new Float32BufferAttribute(speed, 1));
  geometry.setAttribute(
    "particleIntensity",
    new Float32BufferAttribute(intensity, 1)
  );
  geometry.setAttribute("particleSize", new Float32BufferAttribute(size, 1));

  // maps

  // Forked from: https://answers.unrealengine.com/questions/143267/emergency-need-help-with-fire-fx-weird-loop.html

  const fireMap = new TextureLoader().load("textures/sprites/firetorch_1.jpg");
  fireMap.colorSpace = SRGBColorSpace;

  // nodes

  const targetPosition = attribute("targetPosition", "vec3");
  const particleSpeed = attribute("particleSpeed", "float");
  const particleIntensity = attribute("particleIntensity", "float");
  const particleSize = attribute("particleSize", "float");

  const time = timerLocal();

  const fireUV = spritesheetUV(
    vec2(6, 6), // count
    pointUV, // uv
    time.mul(particleSpeed) // current frame
  );

  const fireSprite = texture(fireMap, fireUV);
  const fire = fireSprite.mul(particleIntensity);

  const lerpPosition = uniform(0);

  const positionNode = mix(positionLocal, targetPosition, lerpPosition);

  // material

  const material = new PointsNodeMaterial({
    depthWrite: false,
    transparent: true,
    sizeAttenuation: true,
    blending: AdditiveBlending,
  });

  material.colorNode = fire;
  material.sizeNode = particleSize;
  material.positionNode = positionNode;

  const particles = new Points(geometry, material);
  scene.add(particles);

  // renderer

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // gui

  const gui = new GUI();
  const guiNode = { lerpPosition: 0 };

  gui.add(material, "sizeAttenuation").onChange(function () {
    material.needsUpdate = true;
  });

  gui.add(guiNode, "lerpPosition", 0, 1).onChange(function () {
    lerpPosition.value = guiNode.lerpPosition;
  });

  gui.open();

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxDistance = 1000;
  controls.update();

  // events

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  nodeFrame.update();

  renderer.render(scene, camera);
}
