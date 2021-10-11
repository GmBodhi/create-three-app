//Shaders

import vertexshader_ from "./shaders/vertexshader.glsl";
import fragmentshader_ from "./shaders/fragmentshader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Vector3,
  Color,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  TextureLoader,
  AdditiveBlending,
  Points,
  WebGLRenderer,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

let renderer, scene, camera, stats;

let sphere;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

init();
animate();

function init() {
  camera = new PerspectiveCamera(40, WIDTH / HEIGHT, 1, 10000);
  camera.position.z = 300;

  scene = new Scene();

  const amount = 100000;
  const radius = 200;

  const positions = new Float32Array(amount * 3);
  const colors = new Float32Array(amount * 3);
  const sizes = new Float32Array(amount);

  const vertex = new Vector3();
  const color = new Color(0xffffff);

  for (let i = 0; i < amount; i++) {
    vertex.x = (Math.random() * 2 - 1) * radius;
    vertex.y = (Math.random() * 2 - 1) * radius;
    vertex.z = (Math.random() * 2 - 1) * radius;
    vertex.toArray(positions, i * 3);

    if (vertex.x < 0) {
      color.setHSL(0.5 + 0.1 * (i / amount), 0.7, 0.5);
    } else {
      color.setHSL(0.0 + 0.1 * (i / amount), 0.9, 0.5);
    }

    color.toArray(colors, i * 3);

    sizes[i] = 10;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("customColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("size", new BufferAttribute(sizes, 1));

  //

  const material = new ShaderMaterial({
    uniforms: {
      color: { value: new Color(0xffffff) },
      pointTexture: {
        value: new TextureLoader().load("textures/sprites/spark1.png"),
      },
    },
    vertexShader: document.getElementById("vertexshader").textContent,
    fragmentShader: document.getElementById("fragmentshader").textContent,

    blending: AdditiveBlending,
    depthTest: false,
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

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = Date.now() * 0.005;

  sphere.rotation.z = 0.01 * time;

  const geometry = sphere.geometry;
  const attributes = geometry.attributes;

  for (let i = 0; i < attributes.size.array.length; i++) {
    attributes.size.array[i] = 14 + 13 * Math.sin(0.1 * i + time);
  }

  attributes.size.needsUpdate = true;

  renderer.render(scene, camera);
}
