import "./style.css"; // For webpack support

import {
  Raycaster,
  Vector2,
  Object3D,
  Group,
  WebGPURenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  SphereGeometry,
  MeshLambertMaterial,
  DoubleSide,
  PlaneGeometry,
  TorusGeometry,
  PostProcessing,
} from "three";
import { pass } from "three/tsl";
import { outline } from "three/addons/tsl/display/OutlineNode.js";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

let container, stats;
let camera, scene, renderer, controls;
let postProcessing, outlinePass;

let selectedObjects = [];

const raycaster = new Raycaster();
const mouse = new Vector2();

const obj3d = new Object3D();
const group = new Group();

const params = {
  edgeStrength: 3.0,
  edgeGlow: 0.0,
  edgeThickness: 1.0,
  pulsePeriod: 0,
};

// Init gui

const gui = new GUI({ width: 280 });

gui.add(params, "edgeStrength", 0.01, 10).onChange(function (value) {
  outlinePass.edgeStrength = Number(value);
});

gui.add(params, "edgeGlow", 0.0, 1).onChange(function (value) {
  outlinePass.edgeGlow = Number(value);
});

gui.add(params, "edgeThickness", 1, 4).onChange(function (value) {
  outlinePass.edgeThickness = Number(value);
});

gui.add(params, "pulsePeriod", 0.0, 5).onChange(function (value) {
  outlinePass.pulsePeriod = Number(value);
});

function Configuration() {
  this.visibleEdgeColor = "#ffffff";
  this.hiddenEdgeColor = "#190a05";
}

const conf = new Configuration();

gui.addColor(conf, "visibleEdgeColor").onChange(function (value) {
  outlinePass.visibleEdgeColor.set(value);
});

gui.addColor(conf, "hiddenEdgeColor").onChange(function (value) {
  outlinePass.hiddenEdgeColor.set(value);
});

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer = new WebGPURenderer();
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 8);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 20;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  //

  scene.add(new AmbientLight(0xaaaaaa, 0.6));

  const light = new DirectionalLight(0xddffdd, 2);
  light.position.set(5, 5, 5);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.bias = -0.005;

  const d = 10;

  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.camera.far = 25;

  scene.add(light);

  // model

  const loader = new OBJLoader();
  loader.load("models/obj/tree.obj", function (object) {
    let scale = 1.0;

    object.traverse(function (child) {
      if (child instanceof Mesh) {
        child.geometry.center();
        child.geometry.computeBoundingSphere();
        scale = 0.2 * child.geometry.boundingSphere.radius;

        const phongMaterial = new MeshPhongMaterial({
          color: 0xffffff,
          specular: 0x111111,
          shininess: 5,
        });
        child.material = phongMaterial;
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });

    object.position.y = 1;
    object.scale.divideScalar(scale);
    obj3d.add(object);
  });

  scene.add(group);

  group.add(obj3d);

  //

  const geometry = new SphereGeometry(3, 48, 24);

  for (let i = 0; i < 20; i++) {
    const material = new MeshLambertMaterial();
    material.color.setHSL(Math.random(), 1.0, 0.3);

    const mesh = new Mesh(geometry, material);
    mesh.position.x = Math.random() * 4 - 2;
    mesh.position.y = Math.random() * 4 - 2;
    mesh.position.z = Math.random() * 4 - 2;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.scale.multiplyScalar(Math.random() * 0.3 + 0.1);
    group.add(mesh);
  }

  const floorMaterial = new MeshLambertMaterial({ side: DoubleSide });

  const floorGeometry = new PlaneGeometry(12, 12);
  const floorMesh = new Mesh(floorGeometry, floorMaterial);
  floorMesh.rotation.x -= Math.PI * 0.5;
  floorMesh.position.y -= 1.5;
  group.add(floorMesh);
  floorMesh.receiveShadow = true;

  const torusGeometry = new TorusGeometry(1, 0.3, 16, 100);
  const torusMaterial = new MeshPhongMaterial({ color: 0xffaaff });
  const torus = new Mesh(torusGeometry, torusMaterial);
  torus.position.z = -4;
  group.add(torus);
  torus.receiveShadow = true;
  torus.castShadow = true;

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // postprocessing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode("output");
  outlinePass = outline(scene, camera, scene);

  postProcessing.outputNode = outlinePass.getTextureNode().add(scenePassColor);

  window.addEventListener("resize", onWindowResize);

  renderer.domElement.style.touchAction = "none";
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    if (event.isPrimary === false) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    checkIntersection();
  }

  function addSelectedObject(object) {
    selectedObjects = [];
    selectedObjects.push(object);
  }

  function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(scene, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      addSelectedObject(selectedObject);
      outlinePass.selectedObjects = selectedObjects;
    } else {
      // outlinePass.selectedObjects = [];
    }
  }
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  stats.begin();

  controls.update();

  postProcessing.render();

  stats.end();
}
