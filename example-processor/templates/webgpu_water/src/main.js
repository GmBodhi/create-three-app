import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { pass, mrt, output, emissive, renderOutput } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { UltraHDRLoader } from "three/addons/loaders/UltraHDRLoader.js";

import { WaterMesh } from "three/addons/objects/Water2Mesh.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, water, postProcessing, controls;

const params = {
  color: "#99e0ff",
  scale: 2,
  flowX: 1,
  flowY: 1,
};

init();

async function init() {
  scene = new Scene();

  const loader = new UltraHDRLoader();
  loader.setDataType(HalfFloatType);
  loader.load(
    "textures/equirectangular/moonless_golf_2k.hdr.jpg",
    function (texture) {
      texture.mapping = EquirectangularReflectionMapping;
      texture.needsUpdate = true;

      scene.background = texture;
      scene.environment = texture;
    }
  );

  // camera

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(-20, 6, -30);

  // asset loading

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  const textureLoader = new TextureLoader();

  const [gltf, normalMap0, normalMap1] = await Promise.all([
    gltfLoader.loadAsync("models/gltf/pool.glb"),
    textureLoader.loadAsync("textures/water/Water_1_M_Normal.jpg"),
    textureLoader.loadAsync("textures/water/Water_2_M_Normal.jpg"),
  ]);

  gltf.scene.position.z = 2;
  gltf.scene.scale.setScalar(0.1);
  scene.add(gltf.scene);

  // water

  normalMap0.wrapS = normalMap0.wrapT = RepeatWrapping;
  normalMap1.wrapS = normalMap1.wrapT = RepeatWrapping;

  const waterGeometry = new PlaneGeometry(30, 40);

  water = new WaterMesh(waterGeometry, {
    color: params.color,
    scale: params.scale,
    flowDirection: new Vector2(params.flowX, params.flowY),
    normalMap0: normalMap0,
    normalMap1: normalMap1,
  });

  water.position.set(0, 0.2, -2);
  water.rotation.x = Math.PI * -0.5;
  water.renderOrder = Infinity;
  scene.add(water);

  // floor

  const floorGeometry = new PlaneGeometry(1, 1);
  floorGeometry.rotateX(-Math.PI * 0.5);
  const floorMaterial = new MeshStandardMaterial({
    color: 0x444444,
    roughness: 1,
    metalness: 0,
    side: DoubleSide,
  });

  {
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.position.set(20, 0, 0);
    floor.scale.set(15, 1, 80);
    scene.add(floor);
  }

  {
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.position.set(-20, 0, 0);
    floor.scale.set(15, 1, 80);
    scene.add(floor);
  }

  {
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.position.set(0, 0, 30);
    floor.scale.set(30, 1, 20);
    scene.add(floor);
  }

  {
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.position.set(0, 0, -30);
    floor.scale.set(30, 1, 20);
    scene.add(floor);
  }

  // renderer

  renderer = new WebGPURenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  document.body.appendChild(renderer.domElement);

  // postprocessing

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputColorTransform = false;

  const scenePass = pass(scene, camera);
  scenePass.setMRT(
    mrt({
      output,
      emissive,
    })
  );

  const beautyPass = scenePass.getTextureNode();
  const emissivePass = scenePass.getTextureNode("emissive");

  const bloomPass = bloom(emissivePass, 2);

  const outputPass = renderOutput(beautyPass.add(bloomPass));

  const fxaaPass = fxaa(outputPass);
  postProcessing.outputNode = fxaaPass;

  // gui

  const gui = new GUI();
  const waterNode = water.material.colorNode;

  gui.addColor(params, "color").onChange(function (value) {
    waterNode.color.value.set(value);
  });
  gui.add(params, "scale", 1, 10).onChange(function (value) {
    waterNode.scale.value = value;
  });
  gui
    .add(params, "flowX", -1, 1)
    .step(0.01)
    .onChange(function (value) {
      waterNode.flowDirection.value.x = value;
      waterNode.flowDirection.value.normalize();
    });
  gui
    .add(params, "flowY", -1, 1)
    .step(0.01)
    .onChange(function (value) {
      waterNode.flowDirection.value.y = value;
      waterNode.flowDirection.value.normalize();
    });

  gui.open();

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, -5);
  controls.update();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  postProcessing.render();
}
