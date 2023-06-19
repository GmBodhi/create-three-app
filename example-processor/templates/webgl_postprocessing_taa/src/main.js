import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  TextureLoader,
  NearestFilter,
  SRGBColorSpace,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let camera, scene, renderer, composer, taaRenderPass, renderPass;
let gui, stats;
let index = 0;

const param = { TAAEnabled: "1", TAASampleLevel: 0 };

init();
animate();

clearGui();

function clearGui() {
  if (gui) gui.destroy();

  gui = new GUI();

  gui
    .add(param, "TAAEnabled", {
      Disabled: "0",
      Enabled: "1",
    })
    .onFinishChange(function () {
      if (taaRenderPass) {
        taaRenderPass.enabled = param.TAAEnabled === "1";
        renderPass.enabled = param.TAAEnabled !== "1";
      }
    });

  gui
    .add(param, "TAASampleLevel", {
      "Level 0: 1 Sample": 0,
      "Level 1: 2 Samples": 1,
      "Level 2: 4 Samples": 2,
      "Level 3: 8 Samples": 3,
      "Level 4: 16 Samples": 4,
      "Level 5: 32 Samples": 5,
    })
    .onFinishChange(function () {
      if (taaRenderPass) {
        taaRenderPass.sampleLevel = param.TAASampleLevel;
      }
    });

  gui.open();
}

function init() {
  const container = document.getElementById("container");

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 300;

  scene = new Scene();

  const geometry = new BoxGeometry(120, 120, 120);
  const material1 = new MeshBasicMaterial({ color: 0xffffff, wireframe: true });

  const mesh1 = new Mesh(geometry, material1);
  mesh1.position.x = -100;
  scene.add(mesh1);

  const texture = new TextureLoader().load("textures/brick_diffuse.jpg");
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.anisotropy = 1;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;

  const material2 = new MeshBasicMaterial({ map: texture });

  const mesh2 = new Mesh(geometry, material2);
  mesh2.position.x = 100;
  scene.add(mesh2);

  // postprocessing

  composer = new EffectComposer(renderer);

  taaRenderPass = new TAARenderPass(scene, camera);
  taaRenderPass.unbiased = false;
  composer.addPass(taaRenderPass);

  renderPass = new RenderPass(scene, camera);
  renderPass.enabled = false;
  composer.addPass(renderPass);

  const outputPass = new OutputPass();
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
  requestAnimationFrame(animate);

  index++;

  if (Math.round(index / 200) % 2 === 0) {
    for (let i = 0; i < scene.children.length; i++) {
      const child = scene.children[i];

      child.rotation.x += 0.005;
      child.rotation.y += 0.01;
    }

    if (taaRenderPass) taaRenderPass.accumulate = false;
  } else {
    if (taaRenderPass) taaRenderPass.accumulate = true;
  }

  composer.render();

  stats.update();
}
