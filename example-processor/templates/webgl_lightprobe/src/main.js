import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  NoToneMapping,
  sRGBEncoding,
  Scene,
  PerspectiveCamera,
  LightProbe,
  DirectionalLight,
  CubeTextureLoader,
  SphereGeometry,
  TorusKnotGeometry,
  MeshStandardMaterial,
  Mesh,
} from "three";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LightProbeGenerator } from "three/examples/jsm/lights/LightProbeGenerator.js";

let mesh, renderer, scene, camera;

let gui;

let lightProbe;
let directionalLight;

// linear color space
const API = {
  lightProbeIntensity: 1.0,
  directionalLightIntensity: 0.2,
  envMapIntensity: 1,
};

init();

function init() {
  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // tone mapping
  renderer.toneMapping = NoToneMapping;

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

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.enablePan = false;

  // probe
  lightProbe = new LightProbe();
  scene.add(lightProbe);

  // light
  directionalLight = new DirectionalLight(
    0xffffff,
    API.directionalLightIntensity
  );
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

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

    lightProbe.copy(LightProbeGenerator.fromCubeTexture(cubeTexture));

    const geometry = new SphereGeometry(5, 64, 32);
    //const geometry = new TorusKnotGeometry( 4, 1.5, 256, 32, 2, 3 );

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      envMap: cubeTexture,
      envMapIntensity: API.envMapIntensity,
    });

    // mesh
    mesh = new Mesh(geometry, material);
    scene.add(mesh);

    render();
  });

  // gui
  gui = new GUI({ title: "Intensity" });

  gui
    .add(API, "lightProbeIntensity", 0, 1, 0.02)
    .name("light probe")
    .onChange(function () {
      lightProbe.intensity = API.lightProbeIntensity;
      render();
    });

  gui
    .add(API, "directionalLightIntensity", 0, 1, 0.02)
    .name("directional light")
    .onChange(function () {
      directionalLight.intensity = API.directionalLightIntensity;
      render();
    });

  gui
    .add(API, "envMapIntensity", 0, 1, 0.02)
    .name("envMap")
    .onChange(function () {
      mesh.material.envMapIntensity = API.envMapIntensity;
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
