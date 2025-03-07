import "./style.css"; // For webpack support

import {
  Data3DTexture,
  RedFormat,
  LinearFilter,
  RepeatWrapping,
  WebGPURenderer,
  NeutralToneMapping,
  Scene,
  PerspectiveCamera,
  VolumeNodeMaterial,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  DoubleSide,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  MeshBasicMaterial,
  SpotLight,
  TextureLoader,
  PostProcessing,
  Layers,
} from "three";
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
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

import { bayer16 } from "three/addons/tsl/math/Bayer.js";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let renderer, scene, camera;
let volumetricMesh, teapot, pointLight, spotLight;
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
  const LAYER_VOLUMETRIC_LIGHTING = 10;

  stats = new Stats();
  document.body.appendChild(stats.dom);

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
    100
  );
  camera.position.set(-8, 1, -6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxDistance = 40;
  controls.minDistance = 2;

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

  volumetricMesh = new Mesh(new BoxGeometry(20, 10, 20), volumetricMaterial);
  volumetricMesh.receiveShadow = true;
  volumetricMesh.position.y = 2;
  volumetricMesh.layers.disableAll();
  volumetricMesh.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  scene.add(volumetricMesh);

  // Objects

  teapot = new Mesh(
    new TeapotGeometry(0.8, 18),
    new MeshStandardMaterial({ color: 0xffffff, side: DoubleSide })
  );
  teapot.castShadow = true;
  scene.add(teapot);

  const floor = new Mesh(
    new PlaneGeometry(100, 100),
    new MeshStandardMaterial({ color: 0xffffff })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3;
  floor.receiveShadow = true;
  scene.add(floor);

  // Lights

  pointLight = new PointLight(0xf9bb50, 3, 100);
  pointLight.castShadow = true;
  pointLight.position.set(0, 1.4, 0);
  pointLight.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  //lightBase.add( new Mesh( new SphereGeometry( 0.1, 16, 16 ), new MeshBasicMaterial( { color: 0xf9bb50 } ) ) );
  scene.add(pointLight);

  spotLight = new SpotLight(0xffffff, 100);
  spotLight.position.set(2.5, 5, 2.5);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 2;
  spotLight.distance = 0;
  spotLight.map = new TextureLoader().setPath("textures/").load("colors.png");
  spotLight.castShadow = true;
  spotLight.shadow.intensity = 0.98;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 15;
  spotLight.shadow.focus = 1;
  spotLight.shadow.bias = -0.003;
  spotLight.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  //sunLight.add( new Mesh( new SphereGeometry( 0.1, 16, 16 ), new MeshBasicMaterial( { color: 0xffffff } ) ) );
  scene.add(spotLight);

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
  lighting.add(pointLight, "intensity", 0, 6).name("light intensity");
  lighting.add(spotLight, "intensity", 0, 200).name("spot intensity");
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
  stats.update();

  const time = performance.now() * 0.001;
  const scale = 2.4;

  pointLight.position.x = Math.sin(time * 0.7) * scale;
  pointLight.position.y = Math.cos(time * 0.5) * scale;
  pointLight.position.z = Math.cos(time * 0.3) * scale;

  spotLight.position.x = Math.cos(time * 0.3) * scale;
  spotLight.lookAt(0, 0, 0);

  teapot.rotation.y = time * 0.2;

  postProcessing.render();
}
