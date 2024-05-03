//Shaders

import vertexShader_ from "./shaders/vertexShader.glsl";
import fragmentShader_ from "./shaders/fragmentShader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  BufferGeometry,
  RawShaderMaterial,
  DoubleSide,
  GLSL3,
  Mesh,
  WebGLRenderer,
} from "three";

let camera, scene, renderer, mesh;

init();

function init() {
  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    1,
    3500
  );
  camera.position.z = 4;

  scene = new Scene();
  scene.background = new Color(0x050505);
  scene.fog = new Fog(0x050505, 2000, 3500);

  // geometry

  const triangleCount = 10000;
  const vertexCountPerTriangle = 3;
  const vertexCount = triangleCount * vertexCountPerTriangle;

  const geometry = new BufferGeometry();
  geometry.setDrawRange(0, vertexCount);

  // material

  const material = new RawShaderMaterial({
    uniforms: {
      seed: { value: 42 },
    },
    vertexShader: vertexShader_,
    fragmentShader: fragmentShader_,
    side: DoubleSide,
    glslVersion: GLSL3,
  });

  // mesh

  mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);
}

function animate(time) {
  mesh.rotation.x = (time / 1000.0) * 0.25;
  mesh.rotation.y = (time / 1000.0) * 0.5;

  renderer.render(scene, camera);
}
