//Shaders

import PCSS_ from "./shaders/PCSS.glsl";
import PCSSGetShadow_ from "./shaders/PCSSGetShadow.glsl";

import "./style.css"; // For webpack support

import {
  Scene,
  Fog,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  CameraHelper,
  Group,
  SphereGeometry,
  MeshPhongMaterial,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  ShaderChunk,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let stats;
let camera, scene, renderer;

let group;

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  // scene

  scene = new Scene();
  scene.fog = new Fog(0xcce0ff, 5, 100);

  // camera

  camera = new PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );

  // We use this particular camera position in order to expose a bug that can sometimes happen presumably
  // due to lack of precision when interpolating values over really large triangles.
  // It reproduced on at least NVIDIA GTX 1080 and GTX 1050 Ti GPUs when the ground plane was not
  // subdivided into segments.
  camera.position.x = 7;
  camera.position.y = 13;
  camera.position.z = 7;

  scene.add(camera);

  // lights

  scene.add(new AmbientLight(0xaaaaaa, 3));

  const light = new DirectionalLight(0xf0f6ff, 4.5);
  light.position.set(2, 8, 4);

  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  light.shadow.camera.far = 20;

  scene.add(light);

  // scene.add( new DirectionalLightHelper( light ) );
  scene.add(new CameraHelper(light.shadow.camera));

  // group

  group = new Group();
  scene.add(group);

  const geometry = new SphereGeometry(0.3, 20, 20);

  for (let i = 0; i < 20; i++) {
    const material = new MeshPhongMaterial({ color: Math.random() * 0xffffff });

    const sphere = new Mesh(geometry, material);
    sphere.position.x = Math.random() - 0.5;
    sphere.position.z = Math.random() - 0.5;
    sphere.position.normalize();
    sphere.position.multiplyScalar(Math.random() * 2 + 1);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.userData.phase = Math.random() * Math.PI;
    group.add(sphere);
  }

  // ground

  const groundMaterial = new MeshPhongMaterial({ color: 0x898989 });

  const ground = new Mesh(
    new PlaneGeometry(20000, 20000, 8, 8),
    groundMaterial
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // column

  const column = new Mesh(new BoxGeometry(1, 4, 1), groundMaterial);
  column.position.y = 2;
  column.castShadow = true;
  column.receiveShadow = true;
  scene.add(column);

  // overwrite shadowmap code

  let shader = ShaderChunk.shadowmap_pars_fragment;

  shader = shader.replace(
    "#ifdef USE_SHADOWMAP",
    "#ifdef USE_SHADOWMAP" + PCSS_
  );

  shader = shader.replace(
    "#if defined( SHADOWMAP_TYPE_PCF )",
    PCSSGetShadow_ + "#if defined( SHADOWMAP_TYPE_PCF )"
  );

  ShaderChunk.shadowmap_pars_fragment = shader;

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.setClearColor(scene.fog.color);

  container.appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.minDistance = 10;
  controls.maxDistance = 75;
  controls.target.set(0, 2.5, 0);
  controls.update();

  // performance monitor

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

//

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  const time = performance.now() / 1000;

  group.traverse(function (child) {
    if ("phase" in child.userData) {
      child.position.y =
        Math.abs(Math.sin(time + child.userData.phase)) * 4 + 0.3;
    }
  });

  renderer.render(scene, camera);

  stats.update();
}
