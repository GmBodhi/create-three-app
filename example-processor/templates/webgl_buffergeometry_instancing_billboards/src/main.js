//Shaders

import vshader_ from "./shaders/vshader.glsl";
import fshader_ from "./shaders/fshader.glsl";

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  CircleGeometry,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  RawShaderMaterial,
  TextureLoader,
  Mesh,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let container, stats;

let camera, scene, renderer;
let geometry, material, mesh;

function init() {
  renderer = new WebGLRenderer();

  if (
    renderer.capabilities.isWebGL2 === false &&
    renderer.extensions.has("ANGLE_instanced_arrays") === false
  ) {
    document.getElementById("notSupported").style.display = "";
    return false;
  }

  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.z = 1400;

  scene = new Scene();

  const circleGeometry = new CircleGeometry(1, 6);

  geometry = new InstancedBufferGeometry();
  geometry.index = circleGeometry.index;
  geometry.attributes = circleGeometry.attributes;

  const particleCount = 75000;

  const translateArray = new Float32Array(particleCount * 3);

  for (let i = 0, i3 = 0, l = particleCount; i < l; i++, i3 += 3) {
    translateArray[i3 + 0] = Math.random() * 2 - 1;
    translateArray[i3 + 1] = Math.random() * 2 - 1;
    translateArray[i3 + 2] = Math.random() * 2 - 1;
  }

  geometry.setAttribute(
    "translate",
    new InstancedBufferAttribute(translateArray, 3)
  );

  material = new RawShaderMaterial({
    uniforms: {
      map: { value: new TextureLoader().load("textures/sprites/circle.png") },
      time: { value: 0.0 },
    },
    vertexShader: vshader_,
    fragmentShader: fshader_,
    depthTest: true,
    depthWrite: true,
  });

  mesh = new Mesh(geometry, material);
  mesh.scale.set(500, 500, 500);
  scene.add(mesh);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  return true;
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
  const time = performance.now() * 0.0005;

  material.uniforms["time"].value = time;

  mesh.rotation.x = time * 0.2;
  mesh.rotation.y = time * 0.4;

  renderer.render(scene, camera);
}

if (init()) {
  animate();
}
