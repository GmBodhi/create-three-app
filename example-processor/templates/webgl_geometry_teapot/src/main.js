import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
  SRGBColorSpace,
  TextureLoader,
  RepeatWrapping,
  CubeTextureLoader,
  MeshBasicMaterial,
  MeshPhongMaterial,
  DoubleSide,
  MeshLambertMaterial,
  Scene,
  Color,
  Mesh,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

let camera, scene, renderer;
let cameraControls;
let effectController;
const teapotSize = 300;
let ambientLight, light;

let tess = -1; // force initialization
let bBottom;
let bLid;
let bBody;
let bFitLid;
let bNonBlinn;
let shading;

let teapot, textureCube;
const materials = {};

init();
render();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;

  // CAMERA
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    80000
  );
  camera.position.set(-600, 550, 1300);

  // LIGHTS
  ambientLight = new AmbientLight(0x333333);

  light = new DirectionalLight(0xffffff, 1.0);
  light.position.set(0.32, 0.39, 0.7);

  // RENDERER
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasWidth, canvasHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // EVENTS
  window.addEventListener("resize", onWindowResize);

  // CONTROLS
  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.addEventListener("change", render);

  // TEXTURE MAP
  const textureMap = new TextureLoader().load("textures/uv_grid_opengl.jpg");
  textureMap.wrapS = textureMap.wrapT = RepeatWrapping;
  textureMap.anisotropy = 16;
  textureMap.colorSpace = SRGBColorSpace;

  // REFLECTION MAP
  const path = "textures/cube/pisa/";
  const urls = ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"];

  textureCube = new CubeTextureLoader().setPath(path).load(urls);
  textureCube.colorSpace = SRGBColorSpace;

  materials["wireframe"] = new MeshBasicMaterial({ wireframe: true });
  materials["flat"] = new MeshPhongMaterial({
    specular: 0x000000,
    flatShading: true,
    side: DoubleSide,
  });
  materials["smooth"] = new MeshLambertMaterial({ side: DoubleSide });
  materials["glossy"] = new MeshPhongMaterial({ side: DoubleSide });
  materials["textured"] = new MeshPhongMaterial({
    map: textureMap,
    side: DoubleSide,
  });
  materials["reflective"] = new MeshPhongMaterial({
    envMap: textureCube,
    side: DoubleSide,
  });

  // scene itself
  scene = new Scene();
  scene.background = new Color(0xaaaaaa);

  scene.add(ambientLight);
  scene.add(light);

  // GUI
  setupGui();
}

// EVENT HANDLERS

function onWindowResize() {
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;

  renderer.setSize(canvasWidth, canvasHeight);

  camera.aspect = canvasWidth / canvasHeight;
  camera.updateProjectionMatrix();

  render();
}

function setupGui() {
  effectController = {
    newTess: 15,
    bottom: true,
    lid: true,
    body: true,
    fitLid: false,
    nonblinn: false,
    newShading: "glossy",
  };

  const gui = new GUI();
  gui
    .add(
      effectController,
      "newTess",
      [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50]
    )
    .name("Tessellation Level")
    .onChange(render);
  gui.add(effectController, "lid").name("display lid").onChange(render);
  gui.add(effectController, "body").name("display body").onChange(render);
  gui.add(effectController, "bottom").name("display bottom").onChange(render);
  gui.add(effectController, "fitLid").name("snug lid").onChange(render);
  gui.add(effectController, "nonblinn").name("original scale").onChange(render);
  gui
    .add(effectController, "newShading", [
      "wireframe",
      "flat",
      "smooth",
      "glossy",
      "textured",
      "reflective",
    ])
    .name("Shading")
    .onChange(render);
}

//

function render() {
  if (
    effectController.newTess !== tess ||
    effectController.bottom !== bBottom ||
    effectController.lid !== bLid ||
    effectController.body !== bBody ||
    effectController.fitLid !== bFitLid ||
    effectController.nonblinn !== bNonBlinn ||
    effectController.newShading !== shading
  ) {
    tess = effectController.newTess;
    bBottom = effectController.bottom;
    bLid = effectController.lid;
    bBody = effectController.body;
    bFitLid = effectController.fitLid;
    bNonBlinn = effectController.nonblinn;
    shading = effectController.newShading;

    createNewTeapot();
  }

  // skybox is rendered separately, so that it is always behind the teapot.
  if (shading === "reflective") {
    scene.background = textureCube;
  } else {
    scene.background = null;
  }

  renderer.render(scene, camera);
}

// Whenever the teapot changes, the scene is rebuilt from scratch (not much to it).
function createNewTeapot() {
  if (teapot !== undefined) {
    teapot.geometry.dispose();
    scene.remove(teapot);
  }

  const geometry = new TeapotGeometry(
    teapotSize,
    tess,
    effectController.bottom,
    effectController.lid,
    effectController.body,
    effectController.fitLid,
    !effectController.nonblinn
  );

  teapot = new Mesh(geometry, materials[shading]);

  scene.add(teapot);
}
