import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  AmbientLight,
  PointLight,
  DirectionalLight,
  TextureLoader,
  SRGBColorSpace,
  MeshPhongMaterial,
  Vector2,
  Mesh,
  WebGLRenderer,
  WebGLRenderTarget,
  HalfFloatType,
  DepthTexture,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { BleachBypassShader } from "three/addons/shaders/BleachBypassShader.js";
import { ColorCorrectionShader } from "three/addons/shaders/ColorCorrectionShader.js";
import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let container, loader;

let camera, scene, renderer, controls;

let mesh;

let directionalLight, pointLight, ambientLight;

let composer;

const params = {
  enableNormalMap: true,
  normalScale: 1,
};

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 12;

  scene = new Scene();
  scene.background = new Color(0x494949);

  // LIGHTS

  ambientLight = new AmbientLight(0xffffff);
  scene.add(ambientLight);

  pointLight = new PointLight(0xffffff, 30);
  pointLight.position.set(0, 0, 6);

  scene.add(pointLight);

  directionalLight = new DirectionalLight(0xffffff, 3);
  directionalLight.position.set(1, -0.5, -1);
  scene.add(directionalLight);

  const textureLoader = new TextureLoader();

  const diffuseMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Map-COL.jpg"
  );
  diffuseMap.colorSpace = SRGBColorSpace;

  const specularMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Map-SPEC.jpg"
  );
  specularMap.colorSpace = SRGBColorSpace;

  const normalMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg"
  );

  const material = new MeshPhongMaterial({
    color: 0xefefef,
    specular: 0x222222,
    shininess: 35,
    map: diffuseMap,
    specularMap: specularMap,
    normalMap: normalMap,
    normalScale: new Vector2(params.normalScale, params.normalScale),
  });

  loader = new GLTFLoader();
  loader.load("models/gltf/LeePerrySmith/LeePerrySmith.glb", function (gltf) {
    const geometry = gltf.scene.children[0].geometry;

    mesh = new Mesh(geometry, material);

    mesh.position.y = -0.5;

    scene.add(mesh);
  });

  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  // COMPOSER

  renderer.autoClear = false;

  const renderModel = new RenderPass(scene, camera);

  const effectBleach = new ShaderPass(BleachBypassShader);
  const effectColor = new ShaderPass(ColorCorrectionShader);
  const outputPass = new OutputPass();
  const effectFXAA = new FXAAPass();

  effectBleach.uniforms["opacity"].value = 0.2;

  effectColor.uniforms["powRGB"].value.set(1.4, 1.45, 1.45);
  effectColor.uniforms["mulRGB"].value.set(1.1, 1.1, 1.1);

  const renderTarget = new WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    { type: HalfFloatType, depthTexture: new DepthTexture() }
  );

  composer = new EffectComposer(renderer, renderTarget);

  composer.addPass(renderModel);
  composer.addPass(effectBleach);
  composer.addPass(effectColor);
  composer.addPass(outputPass);
  composer.addPass(effectFXAA);

  // EVENTS

  window.addEventListener("resize", onWindowResize);

  // GUI

  const gui = new GUI();

  gui
    .add(params, "enableNormalMap")
    .name("enable normal map")
    .onChange((value) => {
      material.normalMap = value === true ? normalMap : null;
      material.needsUpdate = true;
    });
  gui
    .add(params, "normalScale", 0, 2)
    .name("normal scale")
    .onChange((value) => material.normalScale.setScalar(value));
  gui.open();

  // CONTROLS

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 8;
  controls.maxDistance = 50;
  controls.enablePan = false;
  controls.enableDamping = true;
}

//

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}

//

function animate() {
  controls.update();

  composer.render();
}
