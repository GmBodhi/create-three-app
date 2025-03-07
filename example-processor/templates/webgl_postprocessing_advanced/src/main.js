import "./style.css"; // For webpack support

import {
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  DirectionalLight,
  TextureLoader,
  SRGBColorSpace,
  MeshBasicMaterial,
  Mesh,
  PlaneGeometry,
  WebGLRenderer,
  Vector2,
  Uniform,
  Color,
  WebGLRenderTarget,
  MeshPhongMaterial,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { BloomPass } from "three/addons/postprocessing/BloomPass.js";
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
import { DotScreenPass } from "three/addons/postprocessing/DotScreenPass.js";
import {
  MaskPass,
  ClearMaskPass,
} from "three/addons/postprocessing/MaskPass.js";
import { TexturePass } from "three/addons/postprocessing/TexturePass.js";

import { BleachBypassShader } from "three/addons/shaders/BleachBypassShader.js";
import { ColorifyShader } from "three/addons/shaders/ColorifyShader.js";
import { HorizontalBlurShader } from "three/addons/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/addons/shaders/VerticalBlurShader.js";
import { SepiaShader } from "three/addons/shaders/SepiaShader.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let container, stats;

let composerScene, composer1, composer2, composer3, composer4;

let cameraOrtho,
  cameraPerspective,
  sceneModel,
  sceneBG,
  renderer,
  mesh,
  directionalLight;

const width = window.innerWidth || 2;
const height = window.innerHeight || 2;

let halfWidth = width / 2;
let halfHeight = height / 2;

let quadBG, quadMask, renderScene;

const delta = 0.01;

init();

function init() {
  container = document.getElementById("container");

  //

  cameraOrtho = new OrthographicCamera(
    -halfWidth,
    halfWidth,
    halfHeight,
    -halfHeight,
    -10000,
    10000
  );
  cameraOrtho.position.z = 100;

  cameraPerspective = new PerspectiveCamera(50, width / height, 1, 10000);
  cameraPerspective.position.z = 900;

  //

  sceneModel = new Scene();
  sceneBG = new Scene();

  //

  directionalLight = new DirectionalLight(0xffffff, 3);
  directionalLight.position.set(0, -0.1, 1).normalize();
  sceneModel.add(directionalLight);

  const loader = new GLTFLoader();
  loader.load("models/gltf/LeePerrySmith/LeePerrySmith.glb", function (gltf) {
    createMesh(gltf.scene.children[0].geometry, sceneModel, 100);
  });

  //

  const diffuseMap = new TextureLoader().load(
    "textures/cube/SwedishRoyalCastle/pz.jpg"
  );
  diffuseMap.colorSpace = SRGBColorSpace;

  const materialColor = new MeshBasicMaterial({
    map: diffuseMap,
    depthTest: false,
  });

  quadBG = new Mesh(new PlaneGeometry(1, 1), materialColor);
  quadBG.position.z = -500;
  quadBG.scale.set(width, height, 1);
  sceneBG.add(quadBG);

  //

  const sceneMask = new Scene();

  quadMask = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ color: 0xffaa00 })
  );
  quadMask.position.z = -300;
  quadMask.scale.set(width / 2, height / 2, 1);
  sceneMask.add(quadMask);

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.setAnimationLoop(animate);
  renderer.autoClear = false;

  //

  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  const shaderBleach = BleachBypassShader;
  const shaderSepia = SepiaShader;
  const shaderVignette = VignetteShader;

  const effectBleach = new ShaderPass(shaderBleach);
  const effectSepia = new ShaderPass(shaderSepia);
  const effectVignette = new ShaderPass(shaderVignette);
  const gammaCorrection = new ShaderPass(GammaCorrectionShader);

  effectBleach.uniforms["opacity"].value = 0.95;

  effectSepia.uniforms["amount"].value = 0.9;

  effectVignette.uniforms["offset"].value = 1.6;
  effectVignette.uniforms["darkness"].value = 0.95;

  const effectBloom = new BloomPass(0.5);
  const effectFilm = new FilmPass(0.35);
  const effectFilmBW = new FilmPass(0.35, true);
  const effectDotScreen = new DotScreenPass(new Vector2(0, 0), 0.5, 0.8);

  const effectHBlur = new ShaderPass(HorizontalBlurShader);
  const effectVBlur = new ShaderPass(VerticalBlurShader);
  effectHBlur.uniforms["h"].value = 2 / (width / 2);
  effectVBlur.uniforms["v"].value = 2 / (height / 2);

  const effectColorify1 = new ShaderPass(ColorifyShader);
  const effectColorify2 = new ShaderPass(ColorifyShader);
  effectColorify1.uniforms["color"] = new Uniform(new Color(1, 0.8, 0.8));
  effectColorify2.uniforms["color"] = new Uniform(new Color(1, 0.75, 0.5));

  const clearMask = new ClearMaskPass();
  const renderMask = new MaskPass(sceneModel, cameraPerspective);
  const renderMaskInverse = new MaskPass(sceneModel, cameraPerspective);

  renderMaskInverse.inverse = true;

  //

  const rtParameters = {
    stencilBuffer: true,
  };

  const rtWidth = width / 2;
  const rtHeight = height / 2;

  //

  const renderBackground = new RenderPass(sceneBG, cameraOrtho);
  const renderModel = new RenderPass(sceneModel, cameraPerspective);

  renderModel.clear = false;

  composerScene = new EffectComposer(
    renderer,
    new WebGLRenderTarget(rtWidth * 2, rtHeight * 2, rtParameters)
  );

  composerScene.addPass(renderBackground);
  composerScene.addPass(renderModel);
  composerScene.addPass(renderMaskInverse);
  composerScene.addPass(effectHBlur);
  composerScene.addPass(effectVBlur);
  composerScene.addPass(clearMask);

  //

  renderScene = new TexturePass(composerScene.renderTarget2.texture);

  //

  composer1 = new EffectComposer(
    renderer,
    new WebGLRenderTarget(rtWidth, rtHeight, rtParameters)
  );

  composer1.addPass(renderScene);
  composer1.addPass(gammaCorrection);
  composer1.addPass(effectFilmBW);
  composer1.addPass(effectVignette);

  //

  composer2 = new EffectComposer(
    renderer,
    new WebGLRenderTarget(rtWidth, rtHeight, rtParameters)
  );

  composer2.addPass(renderScene);
  composer2.addPass(gammaCorrection);
  composer2.addPass(effectDotScreen);
  composer2.addPass(renderMask);
  composer2.addPass(effectColorify1);
  composer2.addPass(clearMask);
  composer2.addPass(renderMaskInverse);
  composer2.addPass(effectColorify2);
  composer2.addPass(clearMask);
  composer2.addPass(effectVignette);

  //

  composer3 = new EffectComposer(
    renderer,
    new WebGLRenderTarget(rtWidth, rtHeight, rtParameters)
  );

  composer3.addPass(renderScene);
  composer3.addPass(gammaCorrection);
  composer3.addPass(effectSepia);
  composer3.addPass(effectFilm);
  composer3.addPass(effectVignette);

  //

  composer4 = new EffectComposer(
    renderer,
    new WebGLRenderTarget(rtWidth, rtHeight, rtParameters)
  );

  composer4.addPass(renderScene);
  composer4.addPass(gammaCorrection);
  composer4.addPass(effectBloom);
  composer4.addPass(effectFilm);
  composer4.addPass(effectBleach);
  composer4.addPass(effectVignette);

  renderScene.uniforms["tDiffuse"].value = composerScene.renderTarget2.texture;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  halfWidth = window.innerWidth / 2;
  halfHeight = window.innerHeight / 2;

  cameraPerspective.aspect = window.innerWidth / window.innerHeight;
  cameraPerspective.updateProjectionMatrix();

  cameraOrtho.left = -halfWidth;
  cameraOrtho.right = halfWidth;
  cameraOrtho.top = halfHeight;
  cameraOrtho.bottom = -halfHeight;

  cameraOrtho.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  composerScene.setSize(halfWidth * 2, halfHeight * 2);

  composer1.setSize(halfWidth, halfHeight);
  composer2.setSize(halfWidth, halfHeight);
  composer3.setSize(halfWidth, halfHeight);
  composer4.setSize(halfWidth, halfHeight);

  renderScene.uniforms["tDiffuse"].value = composerScene.renderTarget2.texture;

  quadBG.scale.set(window.innerWidth, window.innerHeight, 1);
  quadMask.scale.set(window.innerWidth / 2, window.innerHeight / 2, 1);
}

function createMesh(geometry, scene, scale) {
  const diffuseMap = new TextureLoader().load(
    "models/gltf/LeePerrySmith/Map-COL.jpg"
  );
  diffuseMap.colorSpace = SRGBColorSpace;

  const mat2 = new MeshPhongMaterial({
    color: 0xcbcbcb,
    specular: 0x080808,
    shininess: 20,
    map: diffuseMap,
    normalMap: new TextureLoader().load(
      "models/gltf/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg"
    ),
    normalScale: new Vector2(0.75, 0.75),
  });

  mesh = new Mesh(geometry, mat2);
  mesh.position.set(0, -50, 0);
  mesh.scale.set(scale, scale, scale);

  scene.add(mesh);
}

//

function animate() {
  stats.begin();
  render();
  stats.end();
}

function render() {
  const time = Date.now() * 0.0004;

  if (mesh) mesh.rotation.y = -time;

  renderer.setViewport(0, 0, halfWidth, halfHeight);
  composerScene.render(delta);

  renderer.setViewport(0, 0, halfWidth, halfHeight);
  composer1.render(delta);

  renderer.setViewport(halfWidth, 0, halfWidth, halfHeight);
  composer2.render(delta);

  renderer.setViewport(0, halfHeight, halfWidth, halfHeight);
  composer3.render(delta);

  renderer.setViewport(halfWidth, halfHeight, halfWidth, halfHeight);
  composer4.render(delta);
}
