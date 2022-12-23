import "./style.css"; // For webpack support

import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  AmbientLight,
  PointLight,
  AxesHelper,
  TextureLoader,
  Group,
  DodecahedronGeometry,
  Vector3,
  PointsMaterial,
  BufferGeometry,
  Points,
  MeshLambertMaterial,
  TwoPassDoubleSide,
  Mesh,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

let group, camera, scene, renderer;

init();
animate();

function init() {
  scene = new Scene();

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // camera

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(15, 20, 30);
  scene.add(camera);

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 20;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2;

  // ambient light

  scene.add(new AmbientLight(0x222222));

  // point light

  const light = new PointLight(0xffffff, 1);
  camera.add(light);

  // helper

  scene.add(new AxesHelper(20));

  // textures

  const loader = new TextureLoader();
  const texture = loader.load("textures/sprites/disc.png");

  group = new Group();
  scene.add(group);

  // points

  let dodecahedronGeometry = new DodecahedronGeometry(10);

  // if normal and uv attributes are not removed, mergeVertices() can't consolidate indentical vertices with different normal/uv data

  dodecahedronGeometry.deleteAttribute("normal");
  dodecahedronGeometry.deleteAttribute("uv");

  dodecahedronGeometry =
    BufferGeometryUtils.mergeVertices(dodecahedronGeometry);

  const vertices = [];
  const positionAttribute = dodecahedronGeometry.getAttribute("position");

  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positionAttribute, i);
    vertices.push(vertex);
  }

  const pointsMaterial = new PointsMaterial({
    color: 0x0080ff,
    map: texture,
    size: 1,
    alphaTest: 0.5,
  });

  const pointsGeometry = new BufferGeometry().setFromPoints(vertices);

  const points = new Points(pointsGeometry, pointsMaterial);
  group.add(points);

  // convex hull

  const meshMaterial = new MeshLambertMaterial({
    color: 0xffffff,
    opacity: 0.5,
    side: TwoPassDoubleSide,
    transparent: true,
  });

  const meshGeometry = new ConvexGeometry(vertices);

  const mesh = new Mesh(meshGeometry, meshMaterial);
  group.add(mesh);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  group.rotation.y += 0.005;

  render();
}

function render() {
  renderer.render(scene, camera);
}
