import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { pass, mrt, output, float, uniform } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

// scene

const scene = new Scene();

const camera = new PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  1,
  200
);
camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

const geometry = new IcosahedronGeometry(1, 15);

for (let i = 0; i < 50; i++) {
  const color = new Color();
  color.setHSL(Math.random(), 0.7, Math.random() * 0.2 + 0.05);

  const bloomIntensity = Math.random() > 0.5 ? 1 : 0;

  const material = new MeshBasicNodeMaterial({ color: color });
  material.mrtNode = mrt({
    bloomIntensity: uniform(bloomIntensity),
  });

  const sphere = new Mesh(geometry, material);
  sphere.position.x = Math.random() * 10 - 5;
  sphere.position.y = Math.random() * 10 - 5;
  sphere.position.z = Math.random() * 10 - 5;
  sphere.position.normalize().multiplyScalar(Math.random() * 4.0 + 2.0);
  sphere.scale.setScalar(Math.random() * Math.random() + 0.5);
  scene.add(sphere);
}

// renderer

const renderer = new WebGPURenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.toneMapping = NeutralToneMapping;
document.body.appendChild(renderer.domElement);

// post processing

const scenePass = pass(scene, camera);
scenePass.setMRT(
  mrt({
    output,
    bloomIntensity: float(0), // default bloom intensity
  })
);

const outputPass = scenePass.getTextureNode();
const bloomIntensityPass = scenePass.getTextureNode("bloomIntensity");

const bloomPass = bloom(outputPass.mul(bloomIntensityPass));

const postProcessing = new PostProcessing(renderer);
postProcessing.outputColorTransform = false;
postProcessing.outputNode = outputPass.add(bloomPass).renderOutput();

// controls

const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.5;
controls.minDistance = 1;
controls.maxDistance = 100;

// raycaster

const raycaster = new Raycaster();
const mouse = new Vector2();

window.addEventListener("pointerdown", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, false);

  if (intersects.length > 0) {
    const material = intersects[0].object.material;

    const bloomIntensity = material.mrtNode.get("bloomIntensity");
    bloomIntensity.value = bloomIntensity.value === 0 ? 1 : 0;
  }
});

// gui

const gui = new GUI();

const bloomFolder = gui.addFolder("bloom");
bloomFolder.add(bloomPass.threshold, "value", 0.0, 1.0).name("threshold");
bloomFolder.add(bloomPass.strength, "value", 0.0, 3).name("strength");
bloomFolder.add(bloomPass.radius, "value", 0.0, 1.0).name("radius");

const toneMappingFolder = gui.addFolder("tone mapping");
toneMappingFolder.add(renderer, "toneMappingExposure", 0.1, 3).name("exposure");

// events

window.onresize = function () {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
};

// animate

function animate() {
  postProcessing.render();
}
