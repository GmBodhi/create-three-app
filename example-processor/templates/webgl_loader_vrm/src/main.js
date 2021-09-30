//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  MeshBasicMaterial,
  Material,
  WebGLRenderer,
  sRGBEncoding,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRMLoader } from "three/examples/jsm/loaders/VRMLoader.js";

let container, stats, controls;
let camera, scene, renderer, light;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(0, 1.6, -2.2);

  scene = new Scene();

  light = new HemisphereLight(0xbbbbff, 0x444422);
  light.position.set(0, 1, 0);
  scene.add(light);

  // model
  const loader = new VRMLoader();
  loader.load("models/vrm/Alicia/AliciaSolid.vrm", function (vrm) {
    // VRMLoader doesn't support VRM Unlit extension yet so
    // converting all materials to MeshBasicMaterial here as workaround so far.
    vrm.scene.traverse(function (object) {
      if (object.material) {
        if (Array.isArray(object.material)) {
          for (let i = 0, il = object.material.length; i < il; i++) {
            const material = new MeshBasicMaterial();
            Material.prototype.copy.call(material, object.material[i]);
            material.color.copy(object.material[i].color);
            material.map = object.material[i].map;
            object.material[i] = material;
          }
        } else {
          const material = new MeshBasicMaterial();
          Material.prototype.copy.call(material, object.material);
          material.color.copy(object.material.color);
          material.map = object.material.map;
          object.material = material;
        }
      }
    });

    scene.add(vrm.scene);
  });

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 5;
  controls.enableDamping = true;
  controls.target.set(0, 0.9, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  // stats
  stats = new Stats();
  container.appendChild(stats.dom);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  controls.update(); // to support damping

  renderer.render(scene, camera);

  stats.update();
}
