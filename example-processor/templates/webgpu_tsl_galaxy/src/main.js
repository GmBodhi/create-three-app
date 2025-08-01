import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  color,
  cos,
  float,
  mix,
  range,
  sin,
  time,
  uniform,
  uv,
  vec3,
  vec4,
  PI2,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, controls;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(4, 2, 5);

  scene = new Scene();
  scene.background = new Color(0x201919);

  // galaxy

  const material = new SpriteNodeMaterial({
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const size = uniform(0.08);
  material.scaleNode = range(0, 1).mul(size);

  const radiusRatio = range(0, 1);
  const radius = radiusRatio.pow(1.5).mul(5).toVar();

  const branches = 3;
  const branchAngle = range(0, branches).floor().mul(PI2.div(branches));
  const angle = branchAngle.add(time.mul(radiusRatio.oneMinus()));

  const position = vec3(cos(angle), 0, sin(angle)).mul(radius);

  const randomOffset = range(vec3(-1), vec3(1))
    .pow(3)
    .mul(radiusRatio)
    .add(0.2);

  material.positionNode = position.add(randomOffset);

  const colorInside = uniform(color("#ffa575"));
  const colorOutside = uniform(color("#311599"));
  const colorFinal = mix(
    colorInside,
    colorOutside,
    radiusRatio.oneMinus().pow(2).oneMinus()
  );
  const alpha = float(0.1).div(uv().sub(0.5).length()).sub(0.2);
  material.colorNode = vec4(colorFinal, alpha);

  const mesh = new InstancedMesh(new PlaneGeometry(1, 1), material, 20000);
  scene.add(mesh);

  // debug

  const gui = new GUI();

  gui.add(size, "value", 0, 1, 0.001).name("size");

  gui
    .addColor({ color: colorInside.value.getHex(SRGBColorSpace) }, "color")
    .name("colorInside")
    .onChange(function (value) {
      colorInside.value.set(value);
    });

  gui
    .addColor({ color: colorOutside.value.getHex(SRGBColorSpace) }, "color")
    .name("colorOutside")
    .onChange(function (value) {
      colorOutside.value.set(value);
    });

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
