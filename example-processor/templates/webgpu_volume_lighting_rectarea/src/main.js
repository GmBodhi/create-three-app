import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  vec3,
  Fn,
  time,
  texture3D,
  screenUV,
  uniform,
  screenCoordinate,
  pass,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { RectAreaLightTexturesLib } from "three/addons/lights/RectAreaLightTexturesLib.js";

import { bayer16 } from "three/addons/tsl/math/Bayer.js";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let renderer, scene, camera;
let volumetricMesh, meshKnot;
let rectLight1, rectLight2, rectLight3;
let clock;
let postProcessing;
let stats;

init();

function createTexture3D() {
  let i = 0;

  const size = 128;
  const data = new Uint8Array(size * size * size);

  const scale = 10;
  const perlin = new ImprovedNoise();

  const repeatFactor = 5.0;

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size) * repeatFactor;
        const ny = (y / size) * repeatFactor;
        const nz = (z / size) * repeatFactor;

        const noiseValue = perlin.noise(nx * scale, ny * scale, nz * scale);

        data[i] = 128 + 128 * noiseValue;

        i++;
      }
    }
  }

  const texture = new Data3DTexture(data, size, size, size);
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;

  return texture;
}

function init() {
  RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

  const LAYER_VOLUMETRIC_LIGHTING = 10;

  stats = new Stats();
  document.body.appendChild(stats.dom);

  clock = new Clock();

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 2;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    250
  );
  camera.position.set(0, 5, -15);

  // Volumetric Fog Area

  const noiseTexture3D = createTexture3D();

  const smokeAmount = uniform(2);

  const volumetricMaterial = new VolumeNodeMaterial();
  volumetricMaterial.steps = 12;
  volumetricMaterial.offsetNode = bayer16(screenCoordinate); // Add dithering to reduce banding
  volumetricMaterial.scatteringNode = Fn(({ positionRay }) => {
    // Return the amount of fog based on the noise texture

    const timeScaled = vec3(time, 0, time.mul(0.3));

    const sampleGrain = (scale, timeScale = 1) =>
      texture3D(
        noiseTexture3D,
        positionRay.add(timeScaled.mul(timeScale)).mul(scale).mod(1),
        0
      ).r.add(0.5);

    let density = sampleGrain(0.1);
    density = density.mul(sampleGrain(0.05, 1));
    density = density.mul(sampleGrain(0.02, 2));

    return smokeAmount.mix(1, density);
  });

  volumetricMesh = new Mesh(new BoxGeometry(50, 40, 50), volumetricMaterial);
  volumetricMesh.receiveShadow = true;
  volumetricMesh.position.y = 20;
  volumetricMesh.layers.disableAll();
  volumetricMesh.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  scene.add(volumetricMesh);

  // Objects

  rectLight1 = new RectAreaLight(0xff0000, 5, 4, 10);
  rectLight1.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  rectLight1.position.set(-5, 5, 5);
  scene.add(rectLight1);

  rectLight2 = new RectAreaLight(0x00ff00, 5, 4, 10);
  rectLight2.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  rectLight2.position.set(0, 5, 5);
  scene.add(rectLight2);

  rectLight3 = new RectAreaLight(0x0000ff, 5, 4, 10);
  rectLight3.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  rectLight3.position.set(5, 5, 5);
  scene.add(rectLight3);

  //

  const createRectLightMesh = (rectLight) => {
    const geometry = new PlaneGeometry(4, 10);
    const frontMaterial = new MeshBasicMaterial({
      color: rectLight.color,
      side: BackSide,
    });
    const backMaterial = new MeshStandardMaterial({ color: 0x111111 });

    const backSide = new Mesh(geometry, backMaterial);
    backSide.position.set(0, 0, 0.08);

    const frontSide = new Mesh(geometry, frontMaterial);
    frontSide.position.set(0, 0, 0.01);

    rectLight.add(backSide);
    rectLight.add(frontSide);
  };

  createRectLightMesh(rectLight1);
  createRectLightMesh(rectLight2);
  createRectLightMesh(rectLight3);

  //

  const geoFloor = new BoxGeometry(2000, 0.1, 2000);
  const matStdFloor = new MeshStandardMaterial({
    color: 0xbcbcbc,
    roughness: 0.1,
    metalness: 0,
  });
  const mshStdFloor = new Mesh(geoFloor, matStdFloor);
  scene.add(mshStdFloor);

  const geoKnot = new TorusKnotGeometry(1.5, 0.5, 200, 16);
  const matKnot = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0,
    metalness: 0,
  });
  meshKnot = new Mesh(geoKnot, matKnot);
  meshKnot.position.set(0, 5, 0);
  scene.add(meshKnot);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 200;
  controls.target.copy(meshKnot.position);
  controls.update();

  // Post-Processing

  postProcessing = new PostProcessing(renderer);

  // Layers

  const volumetricLightingIntensity = uniform(1);

  const volumetricLayer = new Layers();
  volumetricLayer.disableAll();
  volumetricLayer.enable(LAYER_VOLUMETRIC_LIGHTING);

  // Scene Pass

  const scenePass = pass(scene, camera);
  const sceneDepth = scenePass.getTextureNode("depth");

  // Material - Apply occlusion depth of volumetric lighting based on the scene depth

  volumetricMaterial.depthNode = sceneDepth.sample(screenUV);

  // Volumetric Lighting Pass

  const volumetricPass = pass(scene, camera, { depthBuffer: false });
  volumetricPass.setLayers(volumetricLayer);
  volumetricPass.setResolution(0.25);

  // Compose and Denoise

  const denoiseStrength = uniform(0.6);

  const blurredVolumetricPass = gaussianBlur(volumetricPass, denoiseStrength);

  const scenePassColor = scenePass.add(
    blurredVolumetricPass.mul(volumetricLightingIntensity)
  );

  postProcessing.outputNode = scenePassColor;

  // GUI

  const params = {
    resolution: volumetricPass.getResolution(),
    denoise: true,
  };

  const gui = new GUI();

  const rayMarching = gui.addFolder("Ray Marching").close();
  rayMarching.add(params, "resolution", 0.1, 0.5).onChange((resolution) => {
    volumetricPass.setResolution(resolution);
  });
  rayMarching.add(volumetricMaterial, "steps", 2, 12).name("step count");
  rayMarching.add(denoiseStrength, "value", 0, 1).name("denoise strength");
  rayMarching.add(params, "denoise").onChange((denoise) => {
    const volumetric = denoise ? blurredVolumetricPass : volumetricPass;

    const scenePassColor = scenePass.add(
      volumetric.mul(volumetricLightingIntensity)
    );

    postProcessing.outputNode = scenePassColor;
    postProcessing.needsUpdate = true;
  });

  const lighting = gui.addFolder("Lighting / Scene").close();
  lighting
    .add(volumetricLightingIntensity, "value", 0, 2)
    .name("fog intensity");
  lighting.add(smokeAmount, "value", 0, 3).name("smoke amount");

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  stats.update();

  rectLight1.rotation.y += -delta;
  rectLight2.rotation.y += delta * 0.5;
  rectLight3.rotation.y += delta;

  postProcessing.render();
}
