import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  BufferGeometry,
  SRGBColorSpace,
  LinearSRGBColorSpace,
  GLBufferAttribute,
  PointsMaterial,
  Points,
  Sphere,
  Vector3,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let container, stats;

let camera, scene, renderer;

let points;

const particles = 300000;
let drawCount = 10000;

init();
animate();

function init() {
  container = document.getElementById("container");

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);

  container.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    5,
    3500
  );
  camera.position.z = 2750;

  scene = new Scene();
  scene.background = new Color(0x050505);
  scene.fog = new Fog(0x050505, 2000, 3500);

  //

  const geometry = new BufferGeometry();

  const positions = [];
  const positions2 = [];
  const colors = [];

  const color = new Color();

  const n = 1000,
    n2 = n / 2; // particles spread in the cube

  for (let i = 0; i < particles; i++) {
    // positions

    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    positions.push(x, y, z);
    positions2.push(z * 0.3, x * 0.3, y * 0.3);

    // colors

    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz, SRGBColorSpace);

    const hex = color.getHex(LinearSRGBColorSpace);
    colors.push((hex >> 16) & 255, (hex >> 8) & 255, hex & 255);
  }

  const gl = renderer.getContext();

  const pos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const pos2 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos2);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions2), gl.STATIC_DRAW);

  const rgb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, rgb);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);

  const posAttr1 = new GLBufferAttribute(pos, gl.FLOAT, 3, 4, particles);
  const posAttr2 = new GLBufferAttribute(pos2, gl.FLOAT, 3, 4, particles);
  geometry.setAttribute("position", posAttr1);

  setInterval(function () {
    const attr = geometry.getAttribute("position");

    geometry.setAttribute("position", attr === posAttr1 ? posAttr2 : posAttr1);
  }, 2000);

  geometry.setAttribute(
    "color",
    new GLBufferAttribute(rgb, gl.UNSIGNED_BYTE, 3, 1, particles, true)
  );

  //

  const material = new PointsMaterial({ size: 15, vertexColors: true });

  points = new Points(geometry, material);

  geometry.boundingSphere = new Sphere().set(new Vector3(), 500);

  scene.add(points);

  //

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

//

function animate() {
  drawCount =
    (Math.max(5000, drawCount) + Math.floor(500 * Math.random())) % particles;
  points.geometry.setDrawRange(0, drawCount);

  const time = Date.now() * 0.001;

  points.rotation.x = time * 0.1;
  points.rotation.y = time * 0.2;

  renderer.render(scene, camera);

  stats.update();
}
