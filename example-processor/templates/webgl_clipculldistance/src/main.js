//Shaders

import vertexShader_ from "./shaders/vertexShader.glsl";
import fragmentShader_ from "./shaders/fragmentShader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  WebGLRenderer,
  BufferGeometry,
  Float32BufferAttribute,
  Uint8BufferAttribute,
  ShaderMaterial,
  DoubleSide,
  Mesh,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, controls, clock, scene, renderer, stats;

let material;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    10
  );
  camera.position.z = 2;

  scene = new Scene();

  clock = new Clock();

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  if (renderer.extensions.has("WEBGL_clip_cull_distance") === false) {
    document.getElementById("notSupported").style.display = "";
    return;
  }

  const ext = renderer.getContext().getExtension("WEBGL_clip_cull_distance");
  const gl = renderer.getContext();

  gl.enable(ext.CLIP_DISTANCE0_WEBGL);

  // geometry

  const vertexCount = 200 * 3;

  const geometry = new BufferGeometry();

  const positions = [];
  const colors = [];

  for (let i = 0; i < vertexCount; i++) {
    // adding x,y,z
    positions.push(Math.random() - 0.5);
    positions.push(Math.random() - 0.5);
    positions.push(Math.random() - 0.5);

    // adding r,g,b,a
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
  }

  const positionAttribute = new Float32BufferAttribute(positions, 3);
  const colorAttribute = new Uint8BufferAttribute(colors, 4);
  colorAttribute.normalized = true;

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);

  // material

  material = new ShaderMaterial({
    uniforms: {
      time: { value: 1.0 },
    },
    vertexShader: vertexShader_,
    fragmentShader: fragmentShader_,
    side: DoubleSide,
    transparent: true,
    vertexColors: true,
  });

  material.extensions.clipCullDistance = true;

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  controls = new OrbitControls(camera, renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();
  stats.update();

  material.uniforms.time.value = clock.getElapsedTime();

  renderer.render(scene, camera);
}
