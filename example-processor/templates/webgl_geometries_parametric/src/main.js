import "./style.css"; // For webpack support

import {
  ColorManagement,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  PointLight,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  MeshPhongMaterial,
  DoubleSide,
  Mesh,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import * as Curves from "three/addons/curves/CurveExtras.js";
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import { ParametricGeometries } from "three/addons/geometries/ParametricGeometries.js";

ColorManagement.enabled = true;

let camera, scene, renderer, stats;

init();
animate();

function init() {
  const container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.y = 400;

  scene = new Scene();

  //

  const ambientLight = new AmbientLight(0xcccccc, 0.4);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xffffff, 0.8);
  camera.add(pointLight);
  scene.add(camera);

  //

  const map = new TextureLoader().load("textures/uv_grid_opengl.jpg");
  map.wrapS = map.wrapT = RepeatWrapping;
  map.anisotropy = 16;
  map.colorSpace = SRGBColorSpace;

  const material = new MeshPhongMaterial({ map: map, side: DoubleSide });

  //

  let geometry, object;

  geometry = new ParametricGeometry(
    ParametricGeometries.plane(100, 100),
    10,
    10
  );
  geometry.center();
  object = new Mesh(geometry, material);
  object.position.set(-200, 0, 200);
  scene.add(object);

  geometry = new ParametricGeometry(ParametricGeometries.klein, 20, 20);
  object = new Mesh(geometry, material);
  object.position.set(0, 0, 200);
  object.scale.multiplyScalar(5);
  scene.add(object);

  geometry = new ParametricGeometry(ParametricGeometries.mobius, 20, 20);
  object = new Mesh(geometry, material);
  object.position.set(200, 0, 200);
  object.scale.multiplyScalar(30);
  scene.add(object);

  //

  const GrannyKnot = new Curves.GrannyKnot();

  const torus = new ParametricGeometries.TorusKnotGeometry(
    50,
    10,
    50,
    20,
    2,
    3
  );
  const sphere = new ParametricGeometries.SphereGeometry(50, 20, 10);
  const tube = new ParametricGeometries.TubeGeometry(
    GrannyKnot,
    100,
    3,
    8,
    true
  );

  object = new Mesh(torus, material);
  object.position.set(-200, 0, -200);
  scene.add(object);

  object = new Mesh(sphere, material);
  object.position.set(0, 0, -200);
  scene.add(object);

  object = new Mesh(tube, material);
  object.position.set(200, 0, -200);
  object.scale.multiplyScalar(2);
  scene.add(object);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const timer = Date.now() * 0.0001;

  camera.position.x = Math.cos(timer) * 800;
  camera.position.z = Math.sin(timer) * 800;

  camera.lookAt(scene.position);

  scene.traverse(function (object) {
    if (object.isMesh === true) {
      object.rotation.x = timer * 5;
      object.rotation.y = timer * 2.5;
    }
  });

  renderer.render(scene, camera);
}
