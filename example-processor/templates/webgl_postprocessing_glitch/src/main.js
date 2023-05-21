import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Fog,
  Object3D,
  SphereGeometry,
  MeshPhongMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
} from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GlitchPass } from "three/addons/postprocessing/GlitchPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

let camera, scene, renderer, composer;
let object, light;

let glitchPass;

const button = document.querySelector("#startButton");
button.addEventListener("click", function () {
  const overlay = document.getElementById("overlay");
  overlay.remove();

  init();
  animate();
});

function updateOptions() {
  const wildGlitch = document.getElementById("wildGlitch");
  glitchPass.goWild = wildGlitch.checked;
}

function init() {
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 400;

  scene = new Scene();
  scene.fog = new Fog(0x000000, 1, 1000);

  object = new Object3D();
  scene.add(object);

  const geometry = new SphereGeometry(1, 4, 4);

  for (let i = 0; i < 100; i++) {
    const material = new MeshPhongMaterial({
      color: 0xffffff * Math.random(),
      flatShading: true,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize();
    mesh.position.multiplyScalar(Math.random() * 400);
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 50;
    object.add(mesh);
  }

  scene.add(new AmbientLight(0x666666));

  light = new DirectionalLight(0xffffff);
  light.position.set(1, 1, 1);
  scene.add(light);

  // postprocessing

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  glitchPass = new GlitchPass();
  composer.addPass(glitchPass);

  const outputPass = new ShaderPass(GammaCorrectionShader);
  composer.addPass(outputPass);

  //

  window.addEventListener("resize", onWindowResize);

  const wildGlitchOption = document.getElementById("wildGlitch");
  wildGlitchOption.addEventListener("change", updateOptions);

  updateOptions();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  object.rotation.x += 0.005;
  object.rotation.y += 0.01;

  composer.render();
}
