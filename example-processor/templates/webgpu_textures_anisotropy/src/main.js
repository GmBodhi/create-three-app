import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";

let container, stats;

let camera, scene1, scene2, renderer;

let mouseX = 0,
  mouseY = 0;

init();

function init() {
  const SCREEN_WIDTH = window.innerWidth;
  const SCREEN_HEIGHT = window.innerHeight;

  container = document.createElement("div");
  document.body.appendChild(container);

  renderer = new WebGPURenderer({ antialias: true, forceWebGL: false });

  // RENDERER

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  renderer.setAnimationLoop(animate);
  renderer.autoClear = false;

  renderer.domElement.style.position = "relative";
  container.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(35, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 25000);
  camera.position.z = 1500;

  scene1 = new Scene();
  scene1.fog = new Fog(0xf2f7ff, 1, 25000);

  scene2 = new Scene();
  scene2.fog = new Fog(0xf2f7ff, 1, 25000);

  scene1.add(new AmbientLight(0xeef0ff, 3));
  scene2.add(new AmbientLight(0xeef0ff, 3));

  const light1 = new DirectionalLight(0xffffff, 6);
  light1.position.set(1, 1, 1);
  scene1.add(light1);

  const light2 = new DirectionalLight(0xffffff, 6);
  light2.position.set(1, 1, 1);
  scene2.add(light2);

  // GROUND

  const textureLoader = new TextureLoader();

  const maxAnisotropy = renderer.getMaxAnisotropy();

  const texture1 = textureLoader.load("textures/crate.gif");
  const material1 = new MeshPhongMaterial({ color: 0xffffff, map: texture1 });

  texture1.colorSpace = SRGBColorSpace;
  texture1.anisotropy = renderer.getMaxAnisotropy();
  texture1.wrapS = texture1.wrapT = RepeatWrapping;
  texture1.repeat.set(512, 512);

  const texture2 = textureLoader.load("textures/crate.gif");
  const material2 = new MeshPhongMaterial({ color: 0xffffff, map: texture2 });

  texture2.colorSpace = SRGBColorSpace;
  texture2.anisotropy = 1;
  texture2.wrapS = texture2.wrapT = RepeatWrapping;
  texture2.repeat.set(512, 512);

  if (maxAnisotropy > 0) {
    document.getElementById("val_left").innerHTML = texture1.anisotropy;
    document.getElementById("val_right").innerHTML = texture2.anisotropy;
  } else {
    document.getElementById("val_left").innerHTML = "not supported";
    document.getElementById("val_right").innerHTML = "not supported";
  }

  //

  const geometry = new PlaneGeometry(100, 100);

  const mesh1 = new Mesh(geometry, material1);
  mesh1.rotation.x = -Math.PI / 2;
  mesh1.scale.set(1000, 1000, 1000);

  const mesh2 = new Mesh(geometry, material2);
  mesh2.rotation.x = -Math.PI / 2;
  mesh2.scale.set(1000, 1000, 1000);

  scene1.add(mesh1);
  scene2.add(mesh2);

  // STATS1

  stats = new Stats();
  container.appendChild(stats.dom);

  document.addEventListener("mousemove", onDocumentMouseMove);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;

  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

function animate() {
  render();
  stats.update();
}

function render() {
  const SCREEN_WIDTH = window.innerWidth;
  const SCREEN_HEIGHT = window.innerHeight;

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y = MathUtils.clamp(
    camera.position.y + (-(mouseY - 200) - camera.position.y) * 0.05,
    50,
    1000
  );

  camera.lookAt(scene1.position);
  renderer.clear();

  renderer.setScissorTest(true);

  renderer.setScissor(0, 0, SCREEN_WIDTH / 2 - 2, SCREEN_HEIGHT);
  renderer.render(scene1, camera);

  renderer.setScissorTest(true);

  renderer.setScissor(SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2 - 2, SCREEN_HEIGHT);
  renderer.render(scene2, camera);

  renderer.setScissorTest(false);
}
