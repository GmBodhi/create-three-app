import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Clock,
  Scene,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let stats;

let camera, scene, renderer, clock;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 0, 1);

  clock = new Clock();

  scene = new Scene();

  const colorArray = [
    new Color(0xff0080),
    new Color(0xffffff),
    new Color(0x8000ff),
  ];
  const positions = [];
  const colors = [];

  for (let i = 0; i < 100; i++) {
    positions.push(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    );

    const clr = colorArray[Math.floor(Math.random() * colorArray.length)];

    colors.push(clr.r, clr.g, clr.b);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

  const material = new PointsMaterial({
    size: 4,
    vertexColors: true,
    depthTest: false,
    sizeAttenuation: false,
  });

  const mesh = new Points(geometry, material);
  scene.add(mesh);

  renderer = new WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClearColor = false;
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

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const elapsedTime = clock.getElapsedTime();

  scene.rotation.y = elapsedTime * 0.5;

  renderer.render(scene, camera);
}
