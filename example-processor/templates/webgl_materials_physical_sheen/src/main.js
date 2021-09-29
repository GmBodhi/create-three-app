import "./style.css"; // For webpack support

import {
  Color,
  PerspectiveCamera,
  Scene,
  MeshPhysicalMaterial,
  DoubleSide,
  Mesh,
  SphereGeometry,
  WebGLRenderer,
  DirectionalLight,
  MeshBasicMaterial,
} from "three";

import * as Nodes from "three/examples/jsm/nodes/Nodes.js";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

// Graphics variables
let camera, controls, scene, renderer, stats;
let directionalLight;
let mesh, sphere, material, nodeMaterial;

const params = {
  nodeMaterial: true,
  color: new Color(255, 0, 127),
  sheenBRDF: true,
  sheen: new Color(10, 10, 10), // corresponds to .04 reflectance
  roughness: 0.9,
};

// model
new FBXLoader().load("models/fbx/cloth.fbx", function (loadedModel) {
  mesh = loadedModel.children[0];

  init();
});

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  );

  scene = new Scene();
  scene.background = new Color(0xbfd1e5);

  mesh.scale.multiplyScalar(0.5);
  scene.add(mesh);

  //

  material = new MeshPhysicalMaterial();
  material.side = DoubleSide;
  material.metalness = 0;

  //

  nodeMaterial = new Nodes.StandardNodeMaterial();
  nodeMaterial.side = DoubleSide;
  nodeMaterial.metalness = new Nodes.FloatNode(0);
  nodeMaterial.roughness = new Nodes.FloatNode();
  nodeMaterial.color = new Nodes.ColorNode(params.color.clone());

  //

  sphere = new Mesh(new SphereGeometry(1, 100, 100), material);
  scene.add(sphere);

  camera.position.set(-12, 7, 4);

  const container = document.getElementById("container");
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.update();

  directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 0);
  directionalLight.castShadow = true;
  directionalLight.add(
    new Mesh(
      new SphereGeometry(0.5),
      new MeshBasicMaterial({ color: 0xffffff })
    )
  );

  scene.add(directionalLight);

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  function onUpdate() {
    mesh.material = sphere.material = params.nodeMaterial
      ? nodeMaterial
      : material;

    material.sheen = params.sheenBRDF ? new Color() : null;

    material.needsUpdate = true;

    nodeMaterial.sheen = params.sheenBRDF
      ? new Nodes.ColorNode(material.sheen)
      : undefined;

    nodeMaterial.needsCompile = true;
  }

  gui.add(params, "nodeMaterial").onChange(onUpdate);
  gui.addColor(params, "color");
  gui.add(params, "sheenBRDF").onChange(onUpdate);
  gui.addColor(params, "sheen");
  gui.add(params, "roughness", 0, 1);
  gui.open();

  onUpdate();

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  //

  material.color.copy(params.color).multiplyScalar(1 / 255);
  material.roughness = params.roughness;

  //

  nodeMaterial.color.value.copy(material.color);
  nodeMaterial.roughness.value = params.roughness;

  //

  if (params.sheenBRDF) {
    material.sheen.copy(params.sheen).multiplyScalar(1 / 255);
  }

  //

  renderer.render(scene, camera);
}
