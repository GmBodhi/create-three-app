import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  Scene,
  PerspectiveCamera,
  WebGLCubeRenderTarget,
  RGBAFormat,
  CubeCamera,
  LightProbe,
  CubeTextureLoader,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LightProbeHelper } from "three/examples/jsm/helpers/LightProbeHelper.js";
import { LightProbeGenerator } from "three/examples/jsm/lights/LightProbeGenerator.js";

let renderer, scene, camera, cubeCamera;

let lightProbe;

init();

function init() {
  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.outputEncoding = sRGBEncoding;

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

  const cubeRenderTarget = new WebGLCubeRenderTarget(256, {
    encoding: sRGBEncoding, // since gamma is applied during rendering, the cubeCamera renderTarget texture encoding must be sRGBEncoding
    format: RGBAFormat,
  });

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

  new CubeTextureLoader().load(urls, function (cubeTexture) {
    cubeTexture.encoding = sRGBEncoding;

    scene.background = cubeTexture;

    cubeCamera.update(renderer, scene);

    lightProbe.copy(
      LightProbeGenerator.fromCubeRenderTarget(renderer, cubeRenderTarget)
    );

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
