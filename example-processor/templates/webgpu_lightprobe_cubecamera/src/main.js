import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LightProbeHelper } from "three/addons/helpers/LightProbeHelperGPU.js";
import { LightProbeGenerator } from "three/addons/lights/LightProbeGenerator.js";

let renderer, scene, camera, cubeCamera;

let lightProbe;

init();

function init() {
  // renderer
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // scene
  scene = new Scene();

  // camera
  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 30);

  const cubeRenderTarget = new WebGLCubeRenderTarget(256);

  cubeCamera = new CubeCamera(1, 1000, cubeRenderTarget);

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.enablePan = false;

  // probe
  lightProbe = new LightProbe();
  scene.add(lightProbe);

  // envmap
  const genCubeUrls = function (prefix, postfix) {
    return [
      prefix + "px" + postfix,
      prefix + "nx" + postfix,
      prefix + "py" + postfix,
      prefix + "ny" + postfix,
      prefix + "pz" + postfix,
      prefix + "nz" + postfix,
    ];
  };

  const urls = genCubeUrls("textures/cube/pisa/", ".png");

  new CubeTextureLoader().load(urls, async function (cubeTexture) {
    scene.background = cubeTexture;

    await renderer.init();

    cubeCamera.update(renderer, scene);

    const probe = await LightProbeGenerator.fromCubeRenderTarget(
      renderer,
      cubeRenderTarget
    );

    lightProbe.copy(probe);

    scene.add(new LightProbeHelper(lightProbe, 5));

    render();
  });

  // listener
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  render();
}

function render() {
  renderer.render(scene, camera);
}
