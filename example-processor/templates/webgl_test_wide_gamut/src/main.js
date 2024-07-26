import "./style.css"; // For webpack support

import {
  DisplayP3ColorSpace,
  ColorManagement,
  LinearDisplayP3ColorSpace,
  Scene,
  PerspectiveCamera,
  TextureLoader,
  WebGLRenderer,
  SRGBColorSpace,
  TextureUtils,
} from "three";

import WebGL from "three/addons/capabilities/WebGL.js";

let container, camera, renderer, loader;
let sceneL, sceneR, textureL, textureR;

let sliderPos = window.innerWidth / 2;

const slider = document.querySelector(".slider");

const isP3Context = WebGL.isColorSpaceAvailable(DisplayP3ColorSpace);

if (isP3Context) {
  ColorManagement.workingColorSpace = LinearDisplayP3ColorSpace;
}

init();

function init() {
  container = document.querySelector(".container");

  sceneL = new Scene();
  sceneR = new Scene();

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 6;

  loader = new TextureLoader();

  initTextures();
  initSlider();

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.setScissorTest(true);
  container.appendChild(renderer.domElement);

  if (isP3Context && window.matchMedia("( color-gamut: p3 )").matches) {
    renderer.outputColorSpace = DisplayP3ColorSpace;
  }

  window.addEventListener("resize", onWindowResize);
  window
    .matchMedia("( color-gamut: p3 )")
    .addEventListener("change", onGamutChange);
}

async function initTextures() {
  const path = "textures/wide_gamut/logo_{colorSpace}.png";

  textureL = await loader.loadAsync(path.replace("{colorSpace}", "srgb"));
  textureR = await loader.loadAsync(path.replace("{colorSpace}", "p3"));

  textureL.colorSpace = SRGBColorSpace;
  textureR.colorSpace = DisplayP3ColorSpace;

  sceneL.background = TextureUtils.contain(
    textureL,
    window.innerWidth / window.innerHeight
  );
  sceneR.background = TextureUtils.contain(
    textureR,
    window.innerWidth / window.innerHeight
  );
}

function initSlider() {
  function onPointerDown() {
    if (event.isPrimary === false) return;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerUp() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e) {
    if (event.isPrimary === false) return;

    updateSlider(e.pageX);
  }

  updateSlider(sliderPos);

  slider.style.touchAction = "none"; // disable touch scroll
  slider.addEventListener("pointerdown", onPointerDown);
}

function updateSlider(offset) {
  sliderPos = Math.max(10, Math.min(window.innerWidth - 10, offset));

  slider.style.left = sliderPos - slider.offsetWidth / 2 + "px";
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  TextureUtils.contain(
    sceneL.background,
    window.innerWidth / window.innerHeight
  );
  TextureUtils.contain(
    sceneR.background,
    window.innerWidth / window.innerHeight
  );

  updateSlider(sliderPos);
}

function onGamutChange({ matches }) {
  renderer.outputColorSpace =
    isP3Context && matches ? DisplayP3ColorSpace : SRGBColorSpace;

  textureL.needsUpdate = true;
  textureR.needsUpdate = true;
}

function animate() {
  renderer.setScissor(0, 0, sliderPos, window.innerHeight);
  renderer.render(sceneL, camera);

  renderer.setScissor(sliderPos, 0, window.innerWidth, window.innerHeight);
  renderer.render(sceneR, camera);
}
