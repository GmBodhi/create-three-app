import "./style.css"; // For webpack support

import {
  LightingModel,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  NodeMaterial,
  Mesh,
  PointLight,
  Vector3,
  BufferGeometry,
  PointsNodeMaterial,
  Points,
  WebGPURenderer,
} from "three";
import { color, lights } from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

class CustomLightingModel extends LightingModel {
  direct({ lightColor, reflectedLight }, stack) {
    reflectedLight.directDiffuse.addAssign(lightColor);
  }
}

let camera, scene, renderer;

let light1, light2, light3;

init();

function init() {
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.z = 1.5;

  scene = new Scene();

  // lights

  const sphereGeometry = new SphereGeometry(0.02, 16, 8);

  const addLight = (hexColor) => {
    const material = new NodeMaterial();
    material.colorNode = color(hexColor);
    material.lightsNode = lights(); // ignore scene lights

    const mesh = new Mesh(sphereGeometry, material);

    const light = new PointLight(hexColor, 0.1, 1);
    light.add(mesh);

    scene.add(light);

    return light;
  };

  light1 = addLight(0xffaa00);
  light2 = addLight(0x0040ff);
  light3 = addLight(0x80ff80);

  //light nodes ( selective lights )

  const allLightsNode = lights([light1, light2, light3]);

  // points

  const points = [];

  for (let i = 0; i < 500_000; i++) {
    const point = new Vector3().random().subScalar(0.5).multiplyScalar(3);
    points.push(point);
  }

  const geometryPoints = new BufferGeometry().setFromPoints(points);
  const materialPoints = new PointsNodeMaterial();

  // custom lighting model

  const lightingModel = new CustomLightingModel();
  const lightingModelContext = allLightsNode.context({ lightingModel });

  materialPoints.lightsNode = lightingModelContext;

  //

  const pointCloud = new Points(geometryPoints, materialPoints);
  scene.add(pointCloud);

  //

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
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
  const time = Date.now() * 0.001;
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

  scene.rotation.y = time * 0.1;

  renderer.render(scene, camera);
}
