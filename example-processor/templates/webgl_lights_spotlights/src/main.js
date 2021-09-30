//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  MeshPhongMaterial,
  PlaneGeometry,
  BoxGeometry,
  Mesh,
  AmbientLight,
  PCFSoftShadowMap,
  sRGBEncoding,
  SpotLightHelper,
  SpotLight,
} from "three";

import { TWEEN } from "three/examples/jsm/libs/tween.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);

const camera = new PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  1,
  2000
);

const controls = new OrbitControls(camera, renderer.domElement);

const scene = new Scene();

const matFloor = new MeshPhongMaterial();
const matBox = new MeshPhongMaterial({ color: 0xaaaaaa });

const geoFloor = new PlaneGeometry(2000, 2000);
const geoBox = new BoxGeometry(3, 1, 2);

const mshFloor = new Mesh(geoFloor, matFloor);
mshFloor.rotation.x = -Math.PI * 0.5;
const mshBox = new Mesh(geoBox, matBox);

const ambient = new AmbientLight(0x111111);

const spotLight1 = createSpotlight(0xff7f00);
const spotLight2 = createSpotlight(0x00ff7f);
const spotLight3 = createSpotlight(0x7f00ff);

let lightHelper1, lightHelper2, lightHelper3;

function init() {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputEncoding = sRGBEncoding;

  camera.position.set(46, 22, -21);

  spotLight1.position.set(15, 40, 45);
  spotLight2.position.set(0, 40, 35);
  spotLight3.position.set(-15, 40, 45);

  lightHelper1 = new SpotLightHelper(spotLight1);
  lightHelper2 = new SpotLightHelper(spotLight2);
  lightHelper3 = new SpotLightHelper(spotLight3);

  matFloor.color.set(0x808080);

  mshFloor.receiveShadow = true;
  mshFloor.position.set(0, -0.05, 0);

  mshBox.castShadow = true;
  mshBox.receiveShadow = true;
  mshBox.position.set(0, 5, 0);

  scene.add(mshFloor);
  scene.add(mshBox);
  scene.add(ambient);
  scene.add(spotLight1, spotLight2, spotLight3);
  scene.add(lightHelper1, lightHelper2, lightHelper3);

  document.body.appendChild(renderer.domElement);
  onWindowResize();
  window.addEventListener("resize", onWindowResize);

  controls.target.set(0, 7, 0);
  controls.maxPolarAngle = Math.PI / 2;
  controls.update();
}

function createSpotlight(color) {
  const newObj = new SpotLight(color, 2);

  newObj.castShadow = true;
  newObj.angle = 0.3;
  newObj.penumbra = 0.2;
  newObj.decay = 2;
  newObj.distance = 50;

  return newObj;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function tween(light) {
  new TWEEN.Tween(light)
    .to(
      {
        angle: Math.random() * 0.7 + 0.1,
        penumbra: Math.random() + 1,
      },
      Math.random() * 3000 + 2000
    )
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();

  new TWEEN.Tween(light.position)
    .to(
      {
        x: Math.random() * 30 - 15,
        y: Math.random() * 10 + 15,
        z: Math.random() * 30 - 15,
      },
      Math.random() * 3000 + 2000
    )
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
}

function animate() {
  tween(spotLight1);
  tween(spotLight2);
  tween(spotLight3);

  setTimeout(animate, 5000);
}

function render() {
  TWEEN.update();

  if (lightHelper1) lightHelper1.update();
  if (lightHelper2) lightHelper2.update();
  if (lightHelper3) lightHelper3.update();

  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

init();
render();
animate();
