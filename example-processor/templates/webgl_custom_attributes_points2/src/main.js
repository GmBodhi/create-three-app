import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  BoxGeometry,
  Color,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  TextureLoader,
  RepeatWrapping,
  ShaderMaterial,
  Points,
  WebGLRenderer,
  Matrix4,
  BufferAttribute,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

let renderer, scene, camera, stats;
let sphere, length1;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

init();
animate();

function init() {
  camera = new PerspectiveCamera(45, WIDTH / HEIGHT, 1, 10000);
  camera.position.z = 300;

  scene = new Scene();

  const radius = 100,
    segments = 68,
    rings = 38;

  let sphereGeometry = new SphereGeometry(radius, segments, rings);
  let boxGeometry = new BoxGeometry(
    0.8 * radius,
    0.8 * radius,
    0.8 * radius,
    10,
    10,
    10
  );

  // if normal and uv attributes are not removed, mergeVertices() can't consolidate identical vertices with different normal/uv data

  sphereGeometry.deleteAttribute("normal");
  sphereGeometry.deleteAttribute("uv");

  boxGeometry.deleteAttribute("normal");
  boxGeometry.deleteAttribute("uv");

  sphereGeometry = BufferGeometryUtils.mergeVertices(sphereGeometry);
  boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);

  const combinedGeometry = BufferGeometryUtils.mergeBufferGeometries([
    sphereGeometry,
    boxGeometry,
  ]);
  const positionAttribute = combinedGeometry.getAttribute("position");

  const colors = [];
  const sizes = [];

  const color = new Color();
  const vertex = new Vector3();

  length1 = sphereGeometry.getAttribute("position").count;

  for (let i = 0, l = positionAttribute.count; i < l; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);

    if (i < length1) {
      color.setHSL(
        0.01 + 0.1 * (i / length1),
        0.99,
        (vertex.y + radius) / (4 * radius)
      );
    } else {
      color.setHSL(0.6, 0.75, 0.25 + vertex.y / (2 * radius));
    }

    color.toArray(colors, i * 3);

    sizes[i] = i < length1 ? 10 : 40;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("size", new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("ca", new Float32BufferAttribute(colors, 3));

  //

  const texture = new TextureLoader().load("textures/sprites/disc.png");
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  const material = new ShaderMaterial({
    uniforms: {
      color: { value: new Color(0xffffff) },
      pointTexture: { value: texture },
    },
    vertexShader: document.getElementById("vertexshader").textContent,
    fragmentShader: document.getElementById("fragmentshader").textContent,
    transparent: true,
  });

  //

  sphere = new Points(geometry, material);
  scene.add(sphere);

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(WIDTH, HEIGHT);

  const container = document.getElementById("container");
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function sortPoints() {
  const vector = new Vector3();

  // Model View Projection matrix

  const matrix = new Matrix4();
  matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  matrix.multiply(sphere.matrixWorld);

  //

  const geometry = sphere.geometry;

  let index = geometry.getIndex();
  const positions = geometry.getAttribute("position").array;
  const length = positions.length / 3;

  if (index === null) {
    const array = new Uint16Array(length);

    for (let i = 0; i < length; i++) {
      array[i] = i;
    }

    index = new BufferAttribute(array, 1);

    geometry.setIndex(index);
  }

  const sortArray = [];

  for (let i = 0; i < length; i++) {
    vector.fromArray(positions, i * 3);
    vector.applyMatrix4(matrix);

    sortArray.push([vector.z, i]);
  }

  function numericalSort(a, b) {
    return b[0] - a[0];
  }

  sortArray.sort(numericalSort);

  const indices = index.array;

  for (let i = 0; i < length; i++) {
    indices[i] = sortArray[i][1];
  }

  geometry.index.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = Date.now() * 0.005;

  sphere.rotation.y = 0.02 * time;
  sphere.rotation.z = 0.02 * time;

  const geometry = sphere.geometry;
  const attributes = geometry.attributes;

  for (let i = 0; i < attributes.size.array.length; i++) {
    if (i < length1) {
      attributes.size.array[i] = 16 + 12 * Math.sin(0.1 * i + time);
    }
  }

  attributes.size.needsUpdate = true;

  sortPoints();

  renderer.render(scene, camera);
}
