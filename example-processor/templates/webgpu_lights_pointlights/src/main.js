import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  abs,
  attribute,
  distance,
  float,
  max,
  modelWorldMatrixInverse,
  positionLocal,
  sin,
  time,
  uniform,
} from "three/tsl";

let camera, scene, timer, renderer, controls;

let light1, light2;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 100;

  scene = new Scene();

  timer = new Timer();
  timer.connect(document);

  // model

  const loader = new OBJLoader();
  loader.load("models/obj/walt/WaltHead.obj", function (obj) {
    const mesh = obj.children[0];
    mesh.geometry = createGeometry(mesh.geometry);
    mesh.material = createMaterial();

    mesh.scale.multiplyScalar(0.8);
    mesh.position.y = -30;
    scene.add(mesh);
  });

  const sphere = new SphereGeometry(0.5, 16, 8);

  // lights

  light1 = new PointLight(0xff0040, 2000);
  light1.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0xff0040 })));
  scene.add(light1);

  light2 = new PointLight(0x0040ff, 2000);
  light2.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0x0040ff })));
  scene.add(light2);

  scene.add(new AmbientLight(0xaaaaaa, 0.1));

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  timer.update();

  const time = timer.getElapsed() * 0.5;

  controls.update();

  light1.position.x = Math.sin(time) * 20;
  light1.position.y = Math.cos(time * 0.75) * -30;
  light1.position.z = Math.cos(time * 0.5) * 20;

  light2.position.x = Math.cos(time * 0.5) * 20;
  light2.position.y = Math.sin(time * 0.75) * -30;
  light2.position.z = Math.sin(time) * 20;

  renderer.render(scene, camera);
}

// helpers

function createMaterial() {
  const material = new MeshPhongNodeMaterial();

  const seedAttribute = attribute("seed");
  const displaceNormalAttribute = attribute("displaceNormal");

  const localTime = attribute("time").add(time);

  const effector1 = uniform(light1.position).toVar();
  const effector2 = uniform(light2.position).toVar();

  const distance1 = distance(
    positionLocal,
    modelWorldMatrixInverse.mul(effector1)
  );
  const distance2 = distance(
    positionLocal,
    modelWorldMatrixInverse.mul(effector2)
  );

  const invDistance1 = max(0.0, float(20.0).sub(distance1)).div(2.0);
  const invDistance2 = max(0.0, float(20.0).sub(distance2)).div(2.0);

  const s = abs(sin(localTime.mul(2).add(seedAttribute)).mul(0.5))
    .add(invDistance1)
    .add(invDistance2);

  material.positionNode = positionLocal.add(displaceNormalAttribute.mul(s));

  return material;
}

function createGeometry(geometry) {
  const positionAttribute = geometry.getAttribute("position");

  const v0 = new Vector3();
  const v1 = new Vector3();
  const v2 = new Vector3();
  const v3 = new Vector3();
  const n = new Vector3();

  const plane = new Plane();

  const vertices = [];
  const times = [];
  const seeds = [];
  const displaceNormal = [];

  for (let i = 0; i < positionAttribute.count; i += 3) {
    v0.fromBufferAttribute(positionAttribute, i);
    v1.fromBufferAttribute(positionAttribute, i + 1);
    v2.fromBufferAttribute(positionAttribute, i + 2);

    plane.setFromCoplanarPoints(v0, v1, v2);

    v3.copy(v0).add(v1).add(v2).divideScalar(3); // compute center
    v3.add(n.copy(plane.normal).multiplyScalar(-1)); // displace center inwards

    // generate tetrahedron for each triangle

    vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    vertices.push(v3.x, v3.y, v3.z, v1.x, v1.y, v1.z, v0.x, v0.y, v0.z);
    vertices.push(v3.x, v3.y, v3.z, v2.x, v2.y, v2.z, v1.x, v1.y, v1.z);
    vertices.push(v3.x, v3.y, v3.z, v0.x, v0.y, v0.z, v2.x, v2.y, v2.z);

    const t = Math.random();
    const s = Math.random();
    n.copy(plane.normal);

    times.push(t, t, t);
    times.push(t, t, t);
    times.push(t, t, t);
    times.push(t, t, t);
    seeds.push(s, s, s);
    seeds.push(s, s, s);
    seeds.push(s, s, s);
    seeds.push(s, s, s);

    displaceNormal.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    displaceNormal.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    displaceNormal.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    displaceNormal.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
  }

  const newGeometry = new BufferGeometry();
  newGeometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  newGeometry.setAttribute("time", new Float32BufferAttribute(times, 1));
  newGeometry.setAttribute("seed", new Float32BufferAttribute(seeds, 1));
  newGeometry.setAttribute(
    "displaceNormal",
    new Float32BufferAttribute(displaceNormal, 3)
  );

  newGeometry.computeVertexNormals();

  return newGeometry;
}
