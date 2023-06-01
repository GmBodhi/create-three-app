import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  TextureLoader,
  SRGBColorSpace,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

let camera, scene, renderer, composer, stats;

init();
animate();

function init() {
  const container = document.getElementById("container");

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  texture.anisotropy = 4;
  texture.colorSpace = SRGBColorSpace;

  const material2 = new MeshBasicMaterial({ map: texture });

  const mesh2 = new Mesh(geometry, material2);
  mesh2.position.x = 100;
  scene.add(mesh2);

  // postprocessing

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const pass = new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
  );
  composer.addPass(pass);

  const outputPass = new ShaderPass(GammaCorrectionShader);
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

  stats.begin();

  for (let i = 0; i < scene.children.length; i++) {
    const child = scene.children[i];

    child.rotation.x += 0.005;
    child.rotation.y += 0.01;
  }

  composer.render();

  stats.end();
}
