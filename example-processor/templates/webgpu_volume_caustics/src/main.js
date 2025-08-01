import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import {
  uniform,
  refract,
  div,
  frameId,
  lightViewPosition,
  float,
  positionView,
  positionViewDirection,
  screenUV,
  pass,
  texture3D,
  time,
  screenCoordinate,
  normalView,
  texture,
  Fn,
  vec2,
  vec3,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { bayer16 } from "three/addons/tsl/math/Bayer.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, controls;
let postProcessing;
let stats;
let gltf;

init();

async function init() {
  const LAYER_VOLUMETRIC_LIGHTING = 10;

  camera = new PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.025,
    5
  );
  camera.position.set(-0.7, 0.2, 0.2);

  scene = new Scene();

  // Light

  const spotLight = new SpotLight(0xffffff, 1);
  spotLight.position.set(0.2, 0.3, 0.2);
  spotLight.castShadow = true;
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 2;
  spotLight.distance = 0;
  spotLight.shadow.mapType = HalfFloatType; // For HDR Caustics
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 1;
  spotLight.shadow.bias = -0.003;
  spotLight.shadow.intensity = 0.95;
  spotLight.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  scene.add(spotLight);

  // Model / Textures

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/");
  dracoLoader.setDecoderConfig({ type: "js" });

  gltf = (
    await new GLTFLoader()
      .setDRACOLoader(dracoLoader)
      .loadAsync("three/examples/models/gltf/duck.glb")
  ).scene;
  gltf.scale.setScalar(0.5);
  scene.add(gltf);

  const causticMap = new TextureLoader().load(
    "three/examples/textures/opengameart/Caustic_Free.jpg"
  );
  causticMap.wrapS = causticMap.wrapT = RepeatWrapping;
  causticMap.colorSpace = SRGBColorSpace;

  // Material

  const duck = gltf.children[0];
  duck.material = new MeshPhysicalNodeMaterial();
  duck.material.side = DoubleSide;
  duck.material.transparent = true;
  duck.material.color = new Color(0xffd700);
  duck.material.transmission = 1;
  duck.material.thickness = 0.25;
  duck.material.ior = 1.5;
  duck.material.metalness = 0;
  duck.material.roughness = 0.1;
  duck.castShadow = true;

  // TSL Shader

  const causticOcclusion = uniform(1);

  const causticEffect = Fn(() => {
    const refractionVector = refract(
      positionViewDirection.negate(),
      normalView,
      div(1.0, duck.material.ior)
    ).normalize();
    const viewZ = normalView.z.pow(causticOcclusion);

    const textureUV = refractionVector.xy.mul(0.6);

    const causticColor = uniform(duck.material.color);
    const chromaticAberrationOffset = normalView.z.pow(-0.9).mul(0.004);

    const causticProjection = vec3(
      texture(
        causticMap,
        textureUV.add(vec2(chromaticAberrationOffset.x.negate(), 0))
      ).r,
      texture(
        causticMap,
        textureUV.add(vec2(0, chromaticAberrationOffset.y.negate()))
      ).g,
      texture(
        causticMap,
        textureUV.add(
          vec2(chromaticAberrationOffset.x, chromaticAberrationOffset.y)
        )
      ).b
    );

    return causticProjection.mul(viewZ.mul(60)).add(viewZ).mul(causticColor);
  })().toVar();

  duck.material.castShadowNode = causticEffect;

  duck.material.emissiveNode = Fn(() => {
    // Custom emissive for illuminating backside of the mesh based on the caustic effect and light direction

    const thicknessPowerNode = float(3.0);

    const scatteringHalf = lightViewPosition(spotLight)
      .sub(positionView)
      .normalize();
    const scatteringDot = float(
      positionViewDirection
        .dot(scatteringHalf.negate())
        .saturate()
        .pow(thicknessPowerNode)
    );

    return causticEffect.mul(scatteringDot.add(0.1)).mul(0.02);
  })();

  // GUI

  const gui = new GUI();
  gui.add(causticOcclusion, "value", 0, 20).name("caustic occlusion");
  gui.addColor(duck.material, "color").name("material color");

  // Ground

  const textureLoader = new TextureLoader();
  const map = textureLoader.load("textures/hardwood2_diffuse.jpg");
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(10, 10);

  const geometry = new PlaneGeometry(2, 2);
  const material = new MeshStandardMaterial({ color: 0 });

  const ground = new Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // Post-Processing

  postProcessing = new PostProcessing(renderer);

  // Layers

  const volumetricLightingIntensity = uniform(0.7);

  const volumetricLayer = new Layers();
  volumetricLayer.disableAll();
  volumetricLayer.enable(LAYER_VOLUMETRIC_LIGHTING);

  // Volumetric Fog Area

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

  const noiseTexture3D = createTexture3D();

  const smokeAmount = uniform(3);

  const volumetricMaterial = new VolumeNodeMaterial();
  volumetricMaterial.steps = 20;
  volumetricMaterial.offsetNode = bayer16(screenCoordinate.add(frameId)); // Add dithering to reduce banding
  volumetricMaterial.scatteringNode = Fn(({ positionRay }) => {
    // Return the amount of fog based on the noise texture

    const timeScaled = vec3(time.mul(0.01), 0, time.mul(0.03));

    const sampleGrain = (scale, timeScale = 1) =>
      texture3D(
        noiseTexture3D,
        positionRay.add(timeScaled.mul(timeScale)).mul(scale).mod(1),
        0
      ).r.add(0.5);

    let density = sampleGrain(1);
    density = density.mul(sampleGrain(0.5, 1));
    density = density.mul(sampleGrain(0.2, 2));

    return smokeAmount.mix(1, density);
  });

  const volumetricMesh = new Mesh(
    new BoxGeometry(1.5, 0.5, 1.5),
    volumetricMaterial
  );
  volumetricMesh.receiveShadow = true;
  volumetricMesh.position.y = 0.25;
  volumetricMesh.layers.disableAll();
  volumetricMesh.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  scene.add(volumetricMesh);

  // Scene Pass

  const scenePass = pass(scene, camera);
  const sceneDepth = scenePass.getTextureNode("depth");

  // Material - Apply occlusion depth of volumetric lighting based on the scene depth

  volumetricMaterial.depthNode = sceneDepth.sample(screenUV);

  // Volumetric Lighting Pass

  const volumetricPass = pass(scene, camera, { depthBuffer: false });
  volumetricPass.setLayers(volumetricLayer);
  volumetricPass.setResolution(0.5);

  // Compose and Denoise

  const bloomPass = bloom(volumetricPass, 1, 1, 0);

  const scenePassColor = scenePass.add(
    bloomPass.mul(volumetricLightingIntensity)
  );

  postProcessing.outputNode = scenePassColor;

  // Stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // Controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.z = -0.05;
  controls.target.y = 0.02;
  controls.maxDistance = 1;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  stats.update();

  for (const mesh of gltf.children) {
    mesh.rotation.y -= 0.01;
  }

  controls.update();

  postProcessing.render();
}
