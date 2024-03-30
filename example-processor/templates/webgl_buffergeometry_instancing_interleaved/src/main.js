import "./style.css"; // For webpack support

import {
  Quaternion,
  Matrix4,
  PerspectiveCamera,
  Scene,
  Color,
  InstancedBufferGeometry,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  BufferAttribute,
  MeshBasicMaterial,
  TextureLoader,
  SRGBColorSpace,
  Vector3,
  InstancedMesh,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let container, stats;
let camera, scene, renderer, mesh;

const instances = 5000;
let lastTime = 0;

const moveQ = new Quaternion(0.5, 0.5, 0.5, 0.0).normalize();
const tmpQ = new Quaternion();
const tmpM = new Matrix4();
const currentM = new Matrix4();

init();
animate();

function init() {
  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );

  scene = new Scene();
  scene.background = new Color(0x101010);

  // geometry

  const geometry = new InstancedBufferGeometry();

  // per mesh data x,y,z,w,u,v,s,t for 4-element alignment
  // only use x,y,z and u,v; but x, y, z, nx, ny, nz, u, v would be a good layout
  const vertexBuffer = new InterleavedBuffer(
    new Float32Array([
      // Front
      -1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, -1, -1, 1, 0, 0, 1, 0, 0,
      1, -1, 1, 0, 1, 1, 0, 0,
      // Back
      1, 1, -1, 0, 1, 0, 0, 0, -1, 1, -1, 0, 0, 0, 0, 0, 1, -1, -1, 0, 1, 1, 0,
      0, -1, -1, -1, 0, 0, 1, 0, 0,
      // Left
      -1, 1, -1, 0, 1, 1, 0, 0, -1, 1, 1, 0, 1, 0, 0, 0, -1, -1, -1, 0, 0, 1, 0,
      0, -1, -1, 1, 0, 0, 0, 0, 0,
      // Right
      1, 1, 1, 0, 1, 0, 0, 0, 1, 1, -1, 0, 1, 1, 0, 0, 1, -1, 1, 0, 0, 0, 0, 0,
      1, -1, -1, 0, 0, 1, 0, 0,
      // Top
      -1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, -1, 1, -1, 0, 0, 1, 0, 0,
      1, 1, -1, 0, 1, 1, 0, 0,
      // Bottom
      1, -1, 1, 0, 1, 0, 0, 0, -1, -1, 1, 0, 0, 0, 0, 0, 1, -1, -1, 0, 1, 1, 0,
      0, -1, -1, -1, 0, 0, 1, 0, 0,
    ]),
    8
  );

  // Use vertexBuffer, starting at offset 0, 3 items in position attribute
  const positions = new InterleavedBufferAttribute(vertexBuffer, 3, 0);
  geometry.setAttribute("position", positions);
  // Use vertexBuffer, starting at offset 4, 2 items in uv attribute
  const uvs = new InterleavedBufferAttribute(vertexBuffer, 2, 4);
  geometry.setAttribute("uv", uvs);

  const indices = new Uint16Array([
    0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15,
    13, 16, 17, 18, 18, 17, 19, 20, 21, 22, 22, 21, 23,
  ]);

  geometry.setIndex(new BufferAttribute(indices, 1));

  // material

  const material = new MeshBasicMaterial();
  material.map = new TextureLoader().load("textures/crate.gif");
  material.map.colorSpace = SRGBColorSpace;
  material.map.flipY = false;

  // per instance data

  const matrix = new Matrix4();
  const offset = new Vector3();
  const orientation = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  let x, y, z, w;

  mesh = new InstancedMesh(geometry, material, instances);

  for (let i = 0; i < instances; i++) {
    // offsets

    x = Math.random() * 100 - 50;
    y = Math.random() * 100 - 50;
    z = Math.random() * 100 - 50;

    offset.set(x, y, z).normalize();
    offset.multiplyScalar(5); // move out at least 5 units from center in current direction
    offset.set(x + offset.x, y + offset.y, z + offset.z);

    // orientations

    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    z = Math.random() * 2 - 1;
    w = Math.random() * 2 - 1;

    orientation.set(x, y, z, w).normalize();

    matrix.compose(offset, orientation, scale);

    mesh.setMatrixAt(i, matrix);
  }

  scene.add(mesh);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = performance.now();

  mesh.rotation.y = time * 0.00005;

  const delta = (time - lastTime) / 5000;
  tmpQ.set(moveQ.x * delta, moveQ.y * delta, moveQ.z * delta, 1).normalize();
  tmpM.makeRotationFromQuaternion(tmpQ);

  for (let i = 0, il = instances; i < il; i++) {
    mesh.getMatrixAt(i, currentM);
    currentM.multiply(tmpM);
    mesh.setMatrixAt(i, currentM);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();

  lastTime = time;

  renderer.render(scene, camera);
}
