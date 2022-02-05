import "./style.css"; // For webpack support

import {
  TextureLoader,
  sRGBEncoding,
  EquirectangularReflectionMapping,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  WebGLCubeRenderTarget,
  CubeCamera,
  MeshStandardMaterial,
  Mesh,
  IcosahedronGeometry,
  BoxGeometry,
  TorusKnotGeometry,
  MathUtils,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

let camera, scene, renderer, stats;
let cube, sphere, torus, material;

let count = 0,
  cubeCamera1,
  cubeCamera2,
  cubeRenderTarget1,
  cubeRenderTarget2;

let onPointerDownPointerX,
  onPointerDownPointerY,
  onPointerDownLon,
  onPointerDownLat;

let lon = 0,
  lat = 0;
let phi = 0,
  theta = 0;

const textureLoader = new TextureLoader();

textureLoader.load("textures/2294472375_24a3b8ef46_o.jpg", function (texture) {
  texture.encoding = sRGBEncoding;
  texture.mapping = EquirectangularReflectionMapping;

  init(texture);
  animate();
});

function init(texture) {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  scene = new Scene();
  scene.background = texture;

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );

  //

  const envSize = 64; // minimum size for roughness >= 0.1

  cubeRenderTarget1 = new WebGLCubeRenderTarget(envSize);
  cubeRenderTarget1.texture.image[0] = { width: envSize, height: envSize };

  cubeCamera1 = new CubeCamera(1, 1000, cubeRenderTarget1);

  cubeRenderTarget2 = new WebGLCubeRenderTarget(envSize);
  cubeRenderTarget2.texture.image[0] = { width: envSize, height: envSize };

  cubeCamera2 = new CubeCamera(1, 1000, cubeRenderTarget2);

  //

  material = new MeshStandardMaterial({
    envMap: cubeRenderTarget2.texture,
    roughness: 0.1,
    metalness: 1,
  });

  sphere = new Mesh(new IcosahedronGeometry(20, 8), material);
  scene.add(sphere);

  cube = new Mesh(new BoxGeometry(20, 20, 20), material);
  scene.add(cube);

  torus = new Mesh(new TorusKnotGeometry(10, 5, 128, 16), material);
  scene.add(torus);

  //

  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("wheel", onDocumentMouseWheel);

  window.addEventListener("resize", onWindowResized);
}

function onWindowResized() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function onPointerDown(event) {
  event.preventDefault();

  onPointerDownPointerX = event.clientX;
  onPointerDownPointerY = event.clientY;

  onPointerDownLon = lon;
  onPointerDownLat = lat;

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(event) {
  lon = (event.clientX - onPointerDownPointerX) * 0.1 + onPointerDownLon;
  lat = (event.clientY - onPointerDownPointerY) * 0.1 + onPointerDownLat;
}

function onPointerUp() {
  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
}

function onDocumentMouseWheel(event) {
  const fov = camera.fov + event.deltaY * 0.05;

  camera.fov = MathUtils.clamp(fov, 10, 75);

  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now();

  lon += 0.15;

  lat = Math.max(-85, Math.min(85, lat));
  phi = MathUtils.degToRad(90 - lat);
  theta = MathUtils.degToRad(lon);

  cube.position.x = Math.cos(time * 0.001) * 30;
  cube.position.y = Math.sin(time * 0.001) * 30;
  cube.position.z = Math.sin(time * 0.001) * 30;

  cube.rotation.x += 0.02;
  cube.rotation.y += 0.03;

  torus.position.x = Math.cos(time * 0.001 + 10) * 30;
  torus.position.y = Math.sin(time * 0.001 + 10) * 30;
  torus.position.z = Math.sin(time * 0.001 + 10) * 30;

  torus.rotation.x += 0.02;
  torus.rotation.y += 0.03;

  camera.position.x = 100 * Math.sin(phi) * Math.cos(theta);
  camera.position.y = 100 * Math.cos(phi);
  camera.position.z = 100 * Math.sin(phi) * Math.sin(theta);

  camera.lookAt(scene.position);

  // pingpong

  if (count % 2 === 0) {
    cubeCamera1.update(renderer, scene);
    material.envMap = cubeRenderTarget1.texture;
  } else {
    cubeCamera2.update(renderer, scene);
    material.envMap = cubeRenderTarget2.texture;
  }

  count++;

  render();

  stats.update();
}

function render() {
  renderer.render(scene, camera);
}
