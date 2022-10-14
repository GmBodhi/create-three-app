import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  SphereGeometry,
  Mesh,
  PointLight,
  Vector3,
  BufferGeometry,
  Points,
  LinearToneMapping,
  sRGBEncoding,
} from "three";
import * as Nodes from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer;

let light1, light2, light3;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
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

  const sphereGeometry = new SphereGeometry(0.02, 16, 8);

  const addLight = (hexColor, intensity = 2, distance = 1) => {
    const material = new Nodes.MeshStandardNodeMaterial();
    material.colorNode = new Nodes.ConstNode(new Color(hexColor));
    material.lightsNode = new Nodes.LightsNode(); // ignore scene lights

    const mesh = new Mesh(sphereGeometry, material);

    const light = new PointLight(hexColor, intensity, distance);
    light.add(mesh);

    scene.add(light);

    return light;
  };

  light1 = addLight(0xffaa00);
  light2 = addLight(0x0040ff);
  light3 = addLight(0x80ff80);

  //light nodes ( selective lights )

  const allLightsNode = new Nodes.LightsNode().fromLights([
    light1,
    light2,
    light3,
  ]);

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
    const { lightColor, reflectedLight } = inputs;

    reflectedLight.directDiffuse.add(lightColor);
  });

  const lightingModelContext = new Nodes.ContextNode(allLightsNode, {
    lightingModelNode: { direct: customLightingModel },
  });

  materialPoints.lightsNode = lightingModelContext;

  //

  const pointCloud = new Points(geometryPoints, materialPoints);
  scene.add(pointCloud);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMappingNode = new Nodes.ToneMappingNode(LinearToneMapping, 1);
  renderer.outputEncoding = sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0;
  controls.maxDistance = 4;

  // events

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
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
