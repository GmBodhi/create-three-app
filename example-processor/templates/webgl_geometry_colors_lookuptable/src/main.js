import "./style.css"; // For webpack support

import {
  Scene,
  Color,
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

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

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
