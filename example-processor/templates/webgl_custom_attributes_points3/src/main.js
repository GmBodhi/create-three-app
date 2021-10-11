//Shaders

import vertexshader_ from "./shaders/vertexshader.glsl";
import fragmentshader_ from "./shaders/fragmentshader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Vector3,
  BoxGeometry,
  Matrix4,
  Euler,
  Quaternion,
  Float32BufferAttribute,
  Color,
  BufferGeometry,
  TextureLoader,
  RepeatWrapping,
  ShaderMaterial,
  Points,
  WebGLRenderer,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

let renderer, scene, camera, stats;

let object;

let vertices1;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

init();
animate();

function init() {
  camera = new PerspectiveCamera(40, WIDTH / HEIGHT, 1, 1000);
  camera.position.z = 500;

  scene = new Scene();

  let radius = 100;
  const inner = 0.6 * radius;
  const vertex = new Vector3();
  const vertices = [];

  for (let i = 0; i < 100000; i++) {
    vertex.x = Math.random() * 2 - 1;
    vertex.y = Math.random() * 2 - 1;
    vertex.z = Math.random() * 2 - 1;
    vertex.multiplyScalar(radius);

    if (
      vertex.x > inner ||
      vertex.x < -inner ||
      vertex.y > inner ||
      vertex.y < -inner ||
      vertex.z > inner ||
      vertex.z < -inner
    )
      vertices.push(vertex.x, vertex.y, vertex.z);
  }

  vertices1 = vertices.length / 3;

  radius = 200;

  let boxGeometry1 = new BoxGeometry(
    radius,
    0.1 * radius,
    0.1 * radius,
    50,
    5,
    5
  );

  // if normal and uv attributes are not removed, mergeVertices() can't consolidate indentical vertices with different normal/uv data

  boxGeometry1.deleteAttribute("normal");
  boxGeometry1.deleteAttribute("uv");

  boxGeometry1 = BufferGeometryUtils.mergeVertices(boxGeometry1);

  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Euler();
  const quaternion = new Quaternion();
  const scale = new Vector3(1, 1, 1);

  function addGeo(geo, x, y, z, ry) {
    position.set(x, y, z);
    rotation.set(0, ry, 0);

    matrix.compose(position, quaternion.setFromEuler(rotation), scale);

    const positionAttribute = geo.getAttribute("position");

    for (var i = 0, l = positionAttribute.count; i < l; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      vertex.applyMatrix4(matrix);
      vertices.push(vertex.x, vertex.y, vertex.z);
    }
  }

  // side 1

  addGeo(boxGeometry1, 0, 110, 110, 0);
  addGeo(boxGeometry1, 0, 110, -110, 0);
  addGeo(boxGeometry1, 0, -110, 110, 0);
  addGeo(boxGeometry1, 0, -110, -110, 0);

  // side 2

  addGeo(boxGeometry1, 110, 110, 0, Math.PI / 2);
  addGeo(boxGeometry1, 110, -110, 0, Math.PI / 2);
  addGeo(boxGeometry1, -110, 110, 0, Math.PI / 2);
  addGeo(boxGeometry1, -110, -110, 0, Math.PI / 2);

  // corner edges

  let boxGeometry2 = new BoxGeometry(
    0.1 * radius,
    radius * 1.2,
    0.1 * radius,
    5,
    60,
    5
  );

  boxGeometry2.deleteAttribute("normal");
  boxGeometry2.deleteAttribute("uv");

  boxGeometry2 = BufferGeometryUtils.mergeVertices(boxGeometry2);

  addGeo(boxGeometry2, 110, 0, 110, 0);
  addGeo(boxGeometry2, 110, 0, -110, 0);
  addGeo(boxGeometry2, -110, 0, 110, 0);
  addGeo(boxGeometry2, -110, 0, -110, 0);

  const positionAttribute = new Float32BufferAttribute(vertices, 3);

  const colors = [];
  const sizes = [];

  const color = new Color();

  for (let i = 0; i < positionAttribute.count; i++) {
    if (i < vertices1) {
      color.setHSL(0.5 + 0.2 * (i / vertices1), 1, 0.5);
    } else {
      color.setHSL(0.1, 1, 0.5);
    }

    color.toArray(colors, i * 3);

    sizes[i] = i < vertices1 ? 10 : 40;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("ca", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("size", new Float32BufferAttribute(sizes, 1));

  //

  const texture = new TextureLoader().load("textures/sprites/ball.png");
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  const material = new ShaderMaterial({
    uniforms: {
      amplitude: { value: 1.0 },
      color: { value: new Color(0xffffff) },
      pointTexture: { value: texture },
    },
    vertexShader: vertexshader_,
    fragmentShader: fragmentshader_,
  });

  //

  object = new Points(geometry, material);
  scene.add(object);

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

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = Date.now() * 0.01;

  object.rotation.y = object.rotation.z = 0.02 * time;

  const geometry = object.geometry;
  const attributes = geometry.attributes;

  for (let i = 0; i < attributes.size.array.length; i++) {
    if (i < vertices1) {
      attributes.size.array[i] = Math.max(
        0,
        26 + 32 * Math.sin(0.1 * i + 0.6 * time)
      );
    }
  }

  attributes.size.needsUpdate = true;

  renderer.render(scene, camera);
}
