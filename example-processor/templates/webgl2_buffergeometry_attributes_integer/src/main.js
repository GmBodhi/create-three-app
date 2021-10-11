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
  Float32BufferAttribute,
  Int32BufferAttribute,
  TextureLoader,
  ShaderMaterial,
  DoubleSide,
  GLSL3,
  Mesh,
  WebGLRenderer,
} from "three";

import { WEBGL } from "three/examples/jsm/WebGL.js";

if (WEBGL.isWebGL2Available() === false) {
  document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
}

let camera, scene, renderer, mesh;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    1,
    3500
  );
  camera.position.z = 2500;

  scene = new Scene();
  scene.background = new Color(0x050505);
  scene.fog = new Fog(0x050505, 2000, 3500);

  // geometry

  const triangles = 10000;

  const geometry = new BufferGeometry();

  const positions = [];
  const uvs = [];
  const textureIndices = [];

  const n = 800,
    n2 = n / 2; // triangles spread in the cube
  const d = 50,
    d2 = d / 2; // individual triangle size

  for (let i = 0; i < triangles; i++) {
    // positions

    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    const ax = x + Math.random() * d - d2;
    const ay = y + Math.random() * d - d2;
    const az = z + Math.random() * d - d2;

    const bx = x + Math.random() * d - d2;
    const by = y + Math.random() * d - d2;
    const bz = z + Math.random() * d - d2;

    const cx = x + Math.random() * d - d2;
    const cy = y + Math.random() * d - d2;
    const cz = z + Math.random() * d - d2;

    positions.push(ax, ay, az);
    positions.push(bx, by, bz);
    positions.push(cx, cy, cz);

    // uvs

    uvs.push(0, 0);
    uvs.push(0.5, 1);
    uvs.push(1, 0);

    // texture indices

    const t = i % 3;
    textureIndices.push(t, t, t);
  }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute(
    "textureIndex",
    new Int32BufferAttribute(textureIndices, 1)
  );

  geometry.computeBoundingSphere();

  // material

  const loader = new TextureLoader();

  const map1 = loader.load("textures/crate.gif");
  const map2 = loader.load("textures/floors/FloorsCheckerboard_S_Diffuse.jpg");
  const map3 = loader.load("textures/terrain/grasslight-big.jpg");

  const material = new ShaderMaterial({
    uniforms: {
      uTextures: {
        value: [map1, map2, map3],
      },
    },
    vertexShader: vertexShader_,
    fragmentShader: fragmentShader_,
    side: DoubleSide,
    glslVersion: GLSL3,
  });

  // mesh

  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.001;

  mesh.rotation.x = time * 0.25;
  mesh.rotation.y = time * 0.5;

  renderer.render(scene, camera);
}
