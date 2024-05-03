import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Mesh,
  BoxGeometry,
  TorusGeometry,
  WebGLRenderer,
  TextureLoader,
  SRGBColorSpace,
  LinearFilter,
  WebGLRenderTarget,
} from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { TexturePass } from "three/addons/postprocessing/TexturePass.js";
import { ClearPass } from "three/addons/postprocessing/ClearPass.js";
import {
  MaskPass,
  ClearMaskPass,
} from "three/addons/postprocessing/MaskPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let camera, composer, renderer;
let box, torus;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 10;

  const scene1 = new Scene();
  const scene2 = new Scene();

  box = new Mesh(new BoxGeometry(4, 4, 4));
  scene1.add(box);

  torus = new Mesh(new TorusGeometry(3, 1, 16, 32));
  scene2.add(torus);

  renderer = new WebGLRenderer();
  renderer.setClearColor(0xe0e0e0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.autoClear = false;
  document.body.appendChild(renderer.domElement);

  //

  const clearPass = new ClearPass();

  const clearMaskPass = new ClearMaskPass();

  const maskPass1 = new MaskPass(scene1, camera);
  const maskPass2 = new MaskPass(scene2, camera);

  const texture1 = new TextureLoader().load(
    "textures/758px-Canestra_di_frutta_(Caravaggio).jpg"
  );
  texture1.colorSpace = SRGBColorSpace;
  texture1.minFilter = LinearFilter;
  const texture2 = new TextureLoader().load(
    "textures/2294472375_24a3b8ef46_o.jpg"
  );
  texture2.colorSpace = SRGBColorSpace;

  const texturePass1 = new TexturePass(texture1);
  const texturePass2 = new TexturePass(texture2);

  const outputPass = new OutputPass();

  const parameters = {
    stencilBuffer: true,
  };

  const renderTarget = new WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    parameters
  );

  composer = new EffectComposer(renderer, renderTarget);
  composer.addPass(clearPass);
  composer.addPass(maskPass1);
  composer.addPass(texturePass1);
  composer.addPass(clearMaskPass);
  composer.addPass(maskPass2);
  composer.addPass(texturePass2);
  composer.addPass(clearMaskPass);
  composer.addPass(outputPass);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}

function animate() {
  const time = performance.now() * 0.001 + 6000;

  box.position.x = Math.cos(time / 1.5) * 2;
  box.position.y = Math.sin(time) * 2;
  box.rotation.x = time;
  box.rotation.y = time / 2;

  torus.position.x = Math.cos(time) * 2;
  torus.position.y = Math.sin(time / 1.5) * 2;
  torus.rotation.x = time;
  torus.rotation.y = time / 2;

  renderer.clear();
  composer.render(time);
}
