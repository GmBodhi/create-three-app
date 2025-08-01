import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  float,
  mx_noise_float,
  Loop,
  color,
  positionLocal,
  sin,
  vec2,
  vec3,
  mul,
  time,
  uniform,
  Fn,
  transformNormalToView,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, controls;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(1.25, 1.25, 1.25);

  scene = new Scene();

  // lights

  const directionalLight = new DirectionalLight("#ffffff", 3);
  directionalLight.position.set(-4, 2, 0);
  scene.add(directionalLight);

  // material

  const material = new MeshStandardNodeMaterial({
    color: "#271442",
    roughness: 0.15,
  });

  const emissiveColor = uniform(color("#ff0a81"));
  const emissiveLow = uniform(-0.25);
  const emissiveHigh = uniform(0.2);
  const emissivePower = uniform(7);
  const largeWavesFrequency = uniform(vec2(3, 1));
  const largeWavesSpeed = uniform(1.25);
  const largeWavesMultiplier = uniform(0.15);
  const smallWavesIterations = uniform(3);
  const smallWavesFrequency = uniform(2);
  const smallWavesSpeed = uniform(0.3);
  const smallWavesMultiplier = uniform(0.18);
  const normalComputeShift = uniform(0.01);

  // TSL functions

  const wavesElevation = Fn(([position]) => {
    // large waves

    const elevation = mul(
      sin(position.x.mul(largeWavesFrequency.x).add(time.mul(largeWavesSpeed))),
      sin(position.z.mul(largeWavesFrequency.y).add(time.mul(largeWavesSpeed))),
      largeWavesMultiplier
    ).toVar();

    Loop({ start: float(1), end: smallWavesIterations.add(1) }, ({ i }) => {
      const noiseInput = vec3(
        position.xz
          .add(2) // avoids a-hole pattern
          .mul(smallWavesFrequency)
          .mul(i),
        time.mul(smallWavesSpeed)
      );

      const wave = mx_noise_float(noiseInput, 1, 0)
        .mul(smallWavesMultiplier)
        .div(i)
        .abs();

      elevation.subAssign(wave);
    });

    return elevation;
  });

  // position

  const elevation = wavesElevation(positionLocal);
  const position = positionLocal.add(vec3(0, elevation, 0));

  material.positionNode = position;

  // normals

  let positionA = positionLocal.add(vec3(normalComputeShift, 0, 0));
  let positionB = positionLocal.add(vec3(0, 0, normalComputeShift.negate()));

  positionA = positionA.add(vec3(0, wavesElevation(positionA), 0));
  positionB = positionB.add(vec3(0, wavesElevation(positionB), 0));

  const toA = positionA.sub(position).normalize();
  const toB = positionB.sub(position).normalize();
  const normal = toA.cross(toB);

  material.normalNode = transformNormalToView(normal);

  // emissive

  const emissive = elevation
    .remap(emissiveHigh, emissiveLow)
    .pow(emissivePower);
  material.emissiveNode = emissiveColor.mul(emissive);

  // mesh

  const geometry = new PlaneGeometry(2, 2, 256, 256);
  geometry.rotateX(-Math.PI * 0.5);
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // debug

  const gui = new GUI();

  gui
    .addColor({ color: material.color.getHex(SRGBColorSpace) }, "color")
    .name("color")
    .onChange((value) => material.color.set(value));
  gui.add(material, "roughness", 0, 1, 0.001);

  const colorGui = gui.addFolder("emissive");
  colorGui
    .addColor({ color: emissiveColor.value.getHex(SRGBColorSpace) }, "color")
    .name("color")
    .onChange((value) => emissiveColor.value.set(value));
  colorGui.add(emissiveLow, "value", -1, 0, 0.001).name("low");
  colorGui.add(emissiveHigh, "value", 0, 1, 0.001).name("high");
  colorGui.add(emissivePower, "value", 1, 10, 1).name("power");

  const wavesGui = gui.addFolder("waves");
  wavesGui.add(largeWavesSpeed, "value", 0, 5).name("largeSpeed");
  wavesGui.add(largeWavesMultiplier, "value", 0, 1).name("largeMultiplier");
  wavesGui.add(largeWavesFrequency.value, "x", 0, 10).name("largeFrequencyX");
  wavesGui.add(largeWavesFrequency.value, "y", 0, 10).name("largeFrequencyY");
  wavesGui.add(smallWavesIterations, "value", 0, 5, 1).name("smallIterations");
  wavesGui.add(smallWavesFrequency, "value", 0, 10).name("smallFrequency");
  wavesGui.add(smallWavesSpeed, "value", 0, 1).name("smallSpeed");
  wavesGui.add(smallWavesMultiplier, "value", 0, 1).name("smallMultiplier");
  wavesGui
    .add(normalComputeShift, "value", 0, 0.1, 0.0001)
    .name("normalComputeShift");

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.y = -0.25;
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

async function animate() {
  controls.update();

  renderer.render(scene, camera);
}
