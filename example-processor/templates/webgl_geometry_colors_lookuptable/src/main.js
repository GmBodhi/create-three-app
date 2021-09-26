import "./style.css"; // For webpack support

import {
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
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
  MeshLambertMaterial,
  Mesh,
  RepeatWrapping,
  sRGBEncoding,
  MeshLambertMaterial,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshLambertMaterial,
  Mesh,
  Mesh,
  Mesh,
  BoxGeometry,
  BoxGeometry,
  Mesh,
  Mesh,
  WebGLRenderer,
  sRGBEncoding,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  Plane,
  Vector3,
  Plane,
  Vector3,
  MeshPhongMaterial,
  DoubleSide,
  TorusKnotGeometry,
  Mesh,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  WebGLRenderer,
  Plane,
  Plane,
  Vector3,
  Vector3,
  Vector3,
  Matrix4,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  MeshPhongMaterial,
  DoubleSide,
  Group,
  BoxGeometry,
  Mesh,
  PlaneGeometry,
  Color,
  Group,
  MeshBasicMaterial,
  DoubleSide,
  Mesh,
  Mesh,
  MeshPhongMaterial,
  WebGLRenderer,
  Matrix4,
  Matrix4,
  Plane,
  Vector3,
  Plane,
  Vector3,
  Plane,
  Vector3,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  CameraHelper,
  Group,
  SphereGeometry,
  MeshLambertMaterial,
  Color,
  DoubleSide,
  Mesh,
  Group,
  PlaneHelper,
  PlaneHelper,
  PlaneHelper,
  Group,
  MeshBasicMaterial,
  AlwaysStencilFunc,
  BackSide,
  IncrementWrapStencilOp,
  IncrementWrapStencilOp,
  IncrementWrapStencilOp,
  Mesh,
  FrontSide,
  DecrementWrapStencilOp,
  DecrementWrapStencilOp,
  DecrementWrapStencilOp,
  Mesh,
  Clock,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  Plane,
  Vector3,
  Plane,
  Vector3,
  Plane,
  Vector3,
  PlaneHelper,
  TorusKnotGeometry,
  Group,
  PlaneGeometry,
  Group,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ReplaceStencilOp,
  ReplaceStencilOp,
  Mesh,
  MeshStandardMaterial,
  DoubleSide,
  Mesh,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  DoubleSide,
  WebGLRenderer,
  Vector3,
  Vector3,
  Vector2,
  TextureLoader,
  MeshPhongMaterial,
  Vector2,
  Vector3,
  Euler,
  Vector3,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  DirectionalLight,
  BufferGeometry,
  Vector3,
  Vector3,
  Line,
  LineBasicMaterial,
  Raycaster,
  Mesh,
  BoxGeometry,
  MeshNormalMaterial,
  MeshPhongMaterial,
  Mesh,
  DepthFormat,
  UnsignedShortType,
  DepthFormat,
  DepthStencilFormat,
  UnsignedShortType,
  UnsignedIntType,
  UnsignedInt248Type,
  WebGLRenderer,
  PerspectiveCamera,
  WebGLRenderTarget,
  RGBFormat,
  NearestFilter,
  NearestFilter,
  DepthStencilFormat,
  DepthTexture,
  OrthographicCamera,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  Scene,
  Scene,
  TorusKnotGeometry,
  MeshBasicMaterial,
  Mesh,
  Vector2,
  Color,
  PerspectiveCamera,
  OrthographicCamera,
  Scene,
  Scene,
  BufferGeometry,
  Float32BufferAttribute,
  BufferAttribute,
  DynamicDrawUsage,
  LineBasicMaterial,
  Line,
  DataTexture,
  RGBFormat,
  NearestFilter,
  NearestFilter,
  SpriteMaterial,
  Sprite,
  WebGLRenderer,
  Scene,
  Color,
  Scene,
  PerspectiveCamera,
  OrthographicCamera,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  Mesh,
  MeshLambertMaterial,
  DoubleSide,
  PointLight,
  WebGLRenderer,
  BufferGeometryLoader,
  Float32BufferAttribute,
} from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Lut } from "three/examples/jsm/math/Lut.js";

let container;

let perpCamera, orthoCamera, renderer, lut;

let mesh, sprite;
let scene, uiScene;

let params;

init();

function init() {
  container = document.getElementById("container");

  scene = new Scene();
  scene.background = new Color(0xffffff);

  uiScene = new Scene();

  lut = new Lut();

  const width = window.innerWidth;
  const height = window.innerHeight;

  perpCamera = new PerspectiveCamera(60, width / height, 1, 100);
  perpCamera.position.set(0, 0, 10);
  scene.add(perpCamera);

  orthoCamera = new OrthographicCamera(-1, 1, 1, -1, 1, 2);
  orthoCamera.position.set(0.5, 0, 1);

  sprite = new Sprite(
    new SpriteMaterial({
      map: new CanvasTexture(lut.createCanvas()),
    })
  );
  sprite.scale.x = 0.125;
  uiScene.add(sprite);

  mesh = new Mesh(
    undefined,
    new MeshLambertMaterial({
      side: DoubleSide,
      color: 0xf5f5f5,
      vertexColors: true,
    })
  );
  scene.add(mesh);

  params = {
    colorMap: "rainbow",
  };
  loadModel();

  const pointLight = new PointLight(0xffffff, 1);
  perpCamera.add(pointLight);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.autoClear = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  const controls = new OrbitControls(perpCamera, renderer.domElement);
  controls.addEventListener("change", render);

  const gui = new GUI();

  gui
    .add(params, "colorMap", [
      "rainbow",
      "cooltowarm",
      "blackbody",
      "grayscale",
    ])
    .onChange(function () {
      updateColors();
      render();
    });
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  perpCamera.aspect = width / height;
  perpCamera.updateProjectionMatrix();

  renderer.setSize(width, height);
  render();
}

function render() {
  renderer.clear();
  renderer.render(scene, perpCamera);
  renderer.render(uiScene, orthoCamera);
}

function loadModel() {
  const loader = new BufferGeometryLoader();
  loader.load("models/json/pressure.json", function (geometry) {
    geometry.center();
    geometry.computeVertexNormals();

    // default color attribute
    const colors = [];

    for (let i = 0, n = geometry.attributes.position.count; i < n; ++i) {
      colors.push(1, 1, 1);
    }

    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    mesh.geometry = geometry;
    updateColors();

    render();
  });
}

function updateColors() {
  lut.setColorMap(params.colorMap);

  lut.setMax(2000);
  lut.setMin(0);

  const geometry = mesh.geometry;
  const pressures = geometry.attributes.pressure;
  const colors = geometry.attributes.color;

  for (let i = 0; i < pressures.array.length; i++) {
    const colorValue = pressures.array[i];

    const color = lut.getColor(colorValue);

    if (color === undefined) {
      console.log("Unable to determine color for value:", colorValue);
    } else {
      colors.setXYZ(i, color.r, color.g, color.b);
    }
  }

  colors.needsUpdate = true;

  const map = sprite.material.map;
  lut.updateCanvas(map.image);
  map.needsUpdate = true;
}
