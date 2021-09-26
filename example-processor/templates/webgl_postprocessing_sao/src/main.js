import "./style.css"; // For webpack support

import {
  Vector3,
  Scene,
  Color,
  Fog,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  TextureLoader,
  MeshLambertMaterial,
  DoubleSide,
  ParametricBufferGeometry,
  Mesh,
  SphereGeometry,
  RepeatWrapping,
  sRGBEncoding,
  PlaneGeometry,
  BoxGeometry,
  WebGLRenderer,
  SpotLight,
  Plane,
  MeshPhongMaterial,
  TorusKnotGeometry,
  Matrix4,
  Group,
  MeshBasicMaterial,
  HemisphereLight,
  CameraHelper,
  PlaneHelper,
  AlwaysStencilFunc,
  BackSide,
  IncrementWrapStencilOp,
  FrontSide,
  DecrementWrapStencilOp,
  Clock,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ShadowMaterial,
  Vector2,
  Euler,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Raycaster,
  MeshNormalMaterial,
  DepthFormat,
  UnsignedShortType,
  DepthStencilFormat,
  UnsignedIntType,
  UnsignedInt248Type,
  WebGLRenderTarget,
  RGBFormat,
  NearestFilter,
  DepthTexture,
  OrthographicCamera,
  ShaderMaterial,
  Float32BufferAttribute,
  BufferAttribute,
  DynamicDrawUsage,
  DataTexture,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  PointLight,
  BufferGeometryLoader,
  Vector4,
  MathUtils,
  GridHelper,
  CatmullRomCurve3,
  FogExp2,
  ClampToEdgeWrapping,
  Cache,
  FontLoader,
  TextGeometry,
  ShapeGeometry,
  Object3D,
  PointLightHelper,
  PolarGridHelper,
  BoxHelper,
  WireframeGeometry,
  LineSegments,
  EdgesGeometry,
  Quaternion,
  InstancedMesh,
  Points,
  PointsMaterial,
  HemisphereLightHelper,
  DirectionalLightHelper,
  AnimationMixer,
  LineDashedMaterial,
  Font,
  IcosahedronGeometry,
  ACESFilmicToneMapping,
  PMREMGenerator,
  Box3,
  LOD,
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  OneMinusSrcColorFactor,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  DstAlphaFactor,
  OneMinusDstAlphaFactor,
  DstColorFactor,
  OneMinusDstColorFactor,
  SrcAlphaSaturateFactor,
  CustomBlending,
  AddEquation,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
  MeshDepthMaterial,
  BasicDepthPacking,
  RGBADepthPacking,
  CubeTextureLoader,
  LinearMipMapLinearFilter,
  LinearFilter,
  DefaultLoadingManager,
  UnsignedByteType,
  RGBM16Encoding,
  ObjectLoader,
  MeshPhysicalMaterial,
  EquirectangularReflectionMapping,
  ReinhardToneMapping,
  Texture,
  UVMapping,
  NearestMipmapNearestFilter,
  UniformsUtils,
  Spherical,
  ConeGeometry,
  CircleGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  ImageLoader,
  RGBAFormat,
  FloatType,
  TorusGeometry,
  UniformsLib,
  ShaderChunk,
  WebGLCubeRenderTarget,
  LinearMipmapLinearFilter,
  CubeCamera,
  PCFSoftShadowMap,
  BasicShadowMap,
  NoToneMapping,
  LinearToneMapping,
  CineonToneMapping,
  CustomToneMapping,
  TetrahedronGeometry,
  PlaneBufferGeometry,
  LoadingManager,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SAOPass } from "three/examples/jsm/postprocessing/SAOPass.js";

let container, stats;
let camera, scene, renderer;
let composer, renderPass, saoPass;
let group;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  const devicePixelRatio = window.devicePixelRatio || 1;

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(65, width / height, 3, 10);
  camera.position.z = 7;

  scene = new Scene();

  group = new Object3D();
  scene.add(group);

  const light = new PointLight(0xddffdd, 0.8);
  light.position.z = 70;
  light.position.y = -70;
  light.position.x = -70;
  scene.add(light);

  const light2 = new PointLight(0xffdddd, 0.8);
  light2.position.z = 70;
  light2.position.x = -70;
  light2.position.y = 70;
  scene.add(light2);

  const light3 = new PointLight(0xddddff, 0.8);
  light3.position.z = 70;
  light3.position.x = 70;
  light3.position.y = -70;
  scene.add(light3);

  const light4 = new AmbientLight(0xffffff, 0.05);
  scene.add(light4);

  const geometry = new SphereGeometry(3, 48, 24);

  for (let i = 0; i < 120; i++) {
    const material = new MeshStandardMaterial();
    material.roughness = 0.5 * Math.random() + 0.25;
    material.metalness = 0;
    material.color.setHSL(Math.random(), 1.0, 0.3);

    const mesh = new Mesh(geometry, material);
    mesh.position.x = Math.random() * 4 - 2;
    mesh.position.y = Math.random() * 4 - 2;
    mesh.position.z = Math.random() * 4 - 2;
    mesh.rotation.x = Math.random();
    mesh.rotation.y = Math.random();
    mesh.rotation.z = Math.random();

    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 0.2 + 0.05;
    group.add(mesh);
  }

  stats = new Stats();
  container.appendChild(stats.dom);

  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  saoPass = new SAOPass(scene, camera, false, true);
  composer.addPass(saoPass);

  // Init gui
  const gui = new GUI();
  gui
    .add(saoPass.params, "output", {
      Beauty: SAOPass.OUTPUT.Beauty,
      "Beauty+SAO": SAOPass.OUTPUT.Default,
      SAO: SAOPass.OUTPUT.SAO,
      Depth: SAOPass.OUTPUT.Depth,
      Normal: SAOPass.OUTPUT.Normal,
    })
    .onChange(function (value) {
      saoPass.params.output = parseInt(value);
    });
  gui.add(saoPass.params, "saoBias", -1, 1);
  gui.add(saoPass.params, "saoIntensity", 0, 1);
  gui.add(saoPass.params, "saoScale", 0, 10);
  gui.add(saoPass.params, "saoKernelRadius", 1, 100);
  gui.add(saoPass.params, "saoMinResolution", 0, 1);
  gui.add(saoPass.params, "saoBlur");
  gui.add(saoPass.params, "saoBlurRadius", 0, 200);
  gui.add(saoPass.params, "saoBlurStdDev", 0.5, 150);
  gui.add(saoPass.params, "saoBlurDepthCutoff", 0.0, 0.1);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  composer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  stats.begin();
  render();
  stats.end();
}

function render() {
  const timer = performance.now();
  group.rotation.x = timer * 0.0002;
  group.rotation.y = timer * 0.0001;

  composer.render();
}
