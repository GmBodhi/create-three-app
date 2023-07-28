//Shaders

import vertexshader_ from "./shaders/vertexshader.glsl";
import fragmentshader_ from "./shaders/fragmentshader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  ShaderMaterial,
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  DynamicDrawUsage,
  Points,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let renderer, scene, camera, stats;

let particleSystem, uniforms, geometry;

const particles = 100000;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 300;

  scene = new Scene();

  uniforms = {
    pointTexture: {
      value: new TextureLoader().load("textures/sprites/spark1.png"),
    },
  };

  const shaderMaterial = new ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexshader_,
    fragmentShader: fragmentshader_,

    blending: AdditiveBlending,
    depthTest: false,
    transparent: true,
    vertexColors: true,
  });

  const radius = 200;

  geometry = new BufferGeometry();

  const positions = [];
  const colors = [];
  const sizes = [];

  const color = new Color();

  for (let i = 0; i < particles; i++) {
    positions.push((Math.random() * 2 - 1) * radius);
    positions.push((Math.random() * 2 - 1) * radius);
    positions.push((Math.random() * 2 - 1) * radius);

    color.setHSL(i / particles, 1.0, 0.5);

    colors.push(color.r, color.g, color.b);

    sizes.push(20);
  }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute(
    "size",
    new Float32BufferAttribute(sizes, 1).setUsage(DynamicDrawUsage)
  );

  particleSystem = new Points(geometry, shaderMaterial);

  scene.add(particleSystem);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

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

  particleSystem.rotation.z = 0.01 * time;

  const sizes = geometry.attributes.size.array;

  for (let i = 0; i < particles; i++) {
    sizes[i] = 10 * (1 + Math.sin(0.1 * i + time));
  }

  geometry.attributes.size.needsUpdate = true;

  renderer.render(scene, camera);
}
