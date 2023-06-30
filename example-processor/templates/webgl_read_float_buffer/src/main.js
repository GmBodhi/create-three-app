//Shaders

import fragment_shader_screen_ from "./shaders/fragment_shader_screen.glsl";
import fragment_shader_pass_1_ from "./shaders/fragment_shader_pass_1.glsl";
import vertexShader_ from "./shaders/vertexShader.glsl";

import "./style.css"; // For webpack support

import {
  OrthographicCamera,
  Scene,
  DirectionalLight,
  WebGLRenderTarget,
  LinearFilter,
  NearestFilter,
  RGBAFormat,
  FloatType,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  TorusGeometry,
  MeshPhongMaterial,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let container, stats;

let cameraRTT, sceneRTT, sceneScreen, renderer, zmesh1, zmesh2;

let mouseX = 0,
  mouseY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

let rtTexture, material, quad;

let delta = 0.01;
let valueNode;

init();
animate();

function init() {
  container = document.getElementById("container");

  cameraRTT = new OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    -10000,
    10000
  );
  cameraRTT.position.z = 100;

  //

  sceneRTT = new Scene();
  sceneScreen = new Scene();

  let light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 0, 1).normalize();
  sceneRTT.add(light);

  light = new DirectionalLight(0xffd5d5, 4.5);
  light.position.set(0, 0, -1).normalize();
  sceneRTT.add(light);

  rtTexture = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: LinearFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType,
  });

  material = new ShaderMaterial({
    uniforms: { time: { value: 0.0 } },
    vertexShader: vertexShader_,
    fragmentShader: fragment_shader_pass_1_,
  });

  const materialScreen = new ShaderMaterial({
    uniforms: { tDiffuse: { value: rtTexture.texture } },
    vertexShader: vertexShader_,
    fragmentShader: fragment_shader_screen_,

    depthWrite: false,
  });

  const plane = new PlaneGeometry(window.innerWidth, window.innerHeight);

  quad = new Mesh(plane, material);
  quad.position.z = -100;
  sceneRTT.add(quad);

  const geometry = new TorusGeometry(100, 25, 15, 30);

  const mat1 = new MeshPhongMaterial({
    color: 0x9c9c9c,
    specular: 0xffaa00,
    shininess: 5,
  });
  const mat2 = new MeshPhongMaterial({
    color: 0x9c0000,
    specular: 0xff2200,
    shininess: 5,
  });

  zmesh1 = new Mesh(geometry, mat1);
  zmesh1.position.set(0, 0, 100);
  zmesh1.scale.set(1.5, 1.5, 1.5);
  sceneRTT.add(zmesh1);

  zmesh2 = new Mesh(geometry, mat2);
  zmesh2.position.set(0, 150, 100);
  zmesh2.scale.set(0.75, 0.75, 0.75);
  sceneRTT.add(zmesh2);

  quad = new Mesh(plane, materialScreen);
  quad.position.z = -100;
  sceneScreen.add(quad);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = false;
  renderer.autoClear = false;

  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  valueNode = document.getElementById("values");

  document.addEventListener("mousemove", onDocumentMouseMove);
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = Date.now() * 0.0015;

  if (zmesh1 && zmesh2) {
    zmesh1.rotation.y = -time;
    zmesh2.rotation.y = -time + Math.PI / 2;
  }

  if (
    material.uniforms["time"].value > 1 ||
    material.uniforms["time"].value < 0
  ) {
    delta *= -1;
  }

  material.uniforms["time"].value += delta;

  renderer.clear();

  // Render first scene into texture

  renderer.setRenderTarget(rtTexture);
  renderer.clear();
  renderer.render(sceneRTT, cameraRTT);

  // Render full screen quad with generated texture

  renderer.setRenderTarget(null);
  renderer.render(sceneScreen, cameraRTT);

  const read = new Float32Array(4);
  renderer.readRenderTargetPixels(
    rtTexture,
    windowHalfX + mouseX,
    windowHalfY - mouseY,
    1,
    1,
    read
  );

  valueNode.innerHTML =
    "r:" + read[0] + "<br/>g:" + read[1] + "<br/>b:" + read[2];
}
