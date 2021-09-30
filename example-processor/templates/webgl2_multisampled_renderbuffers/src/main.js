//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  Clock,
  HemisphereLight,
  Group,
  SphereGeometry,
  MeshLambertMaterial,
  MeshBasicMaterial,
  Mesh,
  WebGLRenderer,
  RGBFormat,
  Vector2,
  WebGLMultisampleRenderTarget,
} from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";
import { WEBGL } from "three/examples/jsm/WebGL.js";

let camera, renderer, clock, group, container;

let composer1, composer2;

init();

function init() {
  if (WEBGL.isWebGL2Available() === false) {
    document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
    return;
  }

  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    container.offsetWidth / container.offsetHeight,
    1,
    2000
  );
  camera.position.z = 500;

  const scene = new Scene();
  scene.background = new Color(0xffffff);
  scene.fog = new Fog(0xcccccc, 100, 1500);

  clock = new Clock();

  //

  const hemiLight = new HemisphereLight(0xffffff, 0x222222, 1.5);
  hemiLight.position.set(1, 1, 1);
  scene.add(hemiLight);

  //

  group = new Group();

  const geometry = new SphereGeometry(10, 64, 40);
  const material = new MeshLambertMaterial({ color: 0xee0808 });
  const material2 = new MeshBasicMaterial({ color: 0xffffff, wireframe: true });

  for (let i = 0; i < 10; i++) {
    const mesh = new Mesh(geometry, material);
    mesh.position.x = Math.random() * 600 - 300;
    mesh.position.y = Math.random() * 600 - 300;
    mesh.position.z = Math.random() * 600 - 300;
    mesh.rotation.x = Math.random();
    mesh.rotation.z = Math.random();
    mesh.scale.setScalar(Math.random() * 5 + 5);
    group.add(mesh);

    const mesh2 = new Mesh(geometry, material2);
    mesh2.position.copy(mesh.position);
    mesh2.rotation.copy(mesh.rotation);
    mesh2.scale.copy(mesh.scale);
    group.add(mesh2);
  }

  scene.add(group);

  //

  renderer = new WebGLRenderer();
  renderer.autoClear = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);

  //

  const parameters = {
    format: RGBFormat,
  };

  const size = renderer.getDrawingBufferSize(new Vector2());
  const renderTarget = new WebGLMultisampleRenderTarget(
    size.width,
    size.height,
    parameters
  );

  const renderPass = new RenderPass(scene, camera);
  const copyPass = new ShaderPass(CopyShader);

  //

  composer1 = new EffectComposer(renderer);
  composer1.addPass(renderPass);
  composer1.addPass(copyPass);

  //

  composer2 = new EffectComposer(renderer, renderTarget);
  composer2.addPass(renderPass);
  composer2.addPass(copyPass);

  //

  window.addEventListener("resize", onWindowResize);

  animate();
}

function onWindowResize() {
  camera.aspect = container.offsetWidth / container.offsetHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(container.offsetWidth, container.offsetHeight);
  composer1.setSize(container.offsetWidth, container.offsetHeight);
  composer2.setSize(container.offsetWidth, container.offsetHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const halfWidth = container.offsetWidth / 2;

  group.rotation.y += clock.getDelta() * 0.1;

  renderer.setScissorTest(true);

  renderer.setScissor(0, 0, halfWidth - 1, container.offsetHeight);
  composer1.render();

  renderer.setScissor(halfWidth, 0, halfWidth, container.offsetHeight);
  composer2.render();

  renderer.setScissorTest(false);
}
