import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  SphereGeometry,
  PointLight,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  BufferGeometry,
  Points,
} from "three";

import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import WebGPU from "three/examples/jsm/renderers/webgpu/WebGPU.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import * as Nodes from "three/examples/jsm/renderers/nodes/Nodes.js";
import { add } from "three/examples/jsm/renderers/nodes/ShaderNode.js";

let camera, scene, renderer;

let light1, light2, light3;

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw "No WebGPU support";
  }

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.z = 2;

  scene = new Scene();
  scene.background = new Color(0x222222);

  // lights

  const sphere = new SphereGeometry(0.02, 16, 8);

  light1 = new PointLight(0xffaa00, 2, 1);
  light1.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0xffaa00 })));
  scene.add(light1);

  light2 = new PointLight(0x0040ff, 2, 1);
  light2.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0x0040ff })));
  scene.add(light2);

  light3 = new PointLight(0x80ff80, 2, 1);
  light3.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0x80ff80 })));
  scene.add(light3);

  //light nodes ( selective lights )

  const allLightsNode = Nodes.LightsNode.fromLights([light1, light2, light3]);

  // points

  const points = [];

  for (let i = 0; i < 3000; i++) {
    const point = new Vector3().random().subScalar(0.5).multiplyScalar(2);
    points.push(point);
  }

  const geometryPoints = new BufferGeometry().setFromPoints(points);
  const materialPoints = new Nodes.PointsNodeMaterial();

  // custom lighting model

  const customLightingModel = new Nodes.ShaderNode((inputs) => {
    const { lightColor, directDiffuse } = inputs;

    directDiffuse.value = add(directDiffuse.value, lightColor);
  });

  const lightingModelContext = new Nodes.ContextNode(allLightsNode);
  lightingModelContext.setContextValue("lightingModel", customLightingModel);

  materialPoints.lightNode = lightingModelContext;

  //

  const pointCloud = new Points(geometryPoints, materialPoints);
  scene.add(pointCloud);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0;
  controls.maxDistance = 4;

  // events

  window.addEventListener("resize", onWindowResize);

  //

  return renderer.init();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.0005;
  const scale = 0.5;

  light1.position.x = Math.sin(time * 0.7) * scale;
  light1.position.y = Math.cos(time * 0.5) * scale;
  light1.position.z = Math.cos(time * 0.3) * scale;

  light2.position.x = Math.cos(time * 0.3) * scale;
  light2.position.y = Math.sin(time * 0.5) * scale;
  light2.position.z = Math.sin(time * 0.7) * scale;

  light3.position.x = Math.sin(time * 0.7) * scale;
  light3.position.y = Math.cos(time * 0.3) * scale;
  light3.position.z = Math.sin(time * 0.5) * scale;

  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
