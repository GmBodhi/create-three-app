import "./style.css"; // For webpack support

import {
  Object3D,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
  PerspectiveCamera,
  Scene,
  DirectionalLight,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Rhino3dmLoader } from "three/examples/jsm/loaders/3DMLoader.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

let camera, scene, renderer;
let controls, gui;

init();
animate();

function init() {
  Object3D.DefaultUp = new Vector3(0, 0, 1);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(26, -40, 5);

  scene = new Scene();

  const directionalLight = new DirectionalLight(0xffffff, 2);
  directionalLight.position.set(0, 0, 2);
  scene.add(directionalLight);

  const loader = new Rhino3dmLoader();
  loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");
  loader.load("models/3dm/Rhino_Logo.3dm", function (object) {
    scene.add(object);
    initGUI(object.userData.layers);

    // hide spinner
    document.getElementById("loader").style.display = "none";
  });

  controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener("resize", resize);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

function initGUI(layers) {
  gui = new GUI({ width: 300 });

  const layersControl = gui.addFolder("layers");
  layersControl.open();

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    layersControl
      .add(layer, "visible")
      .name(layer.name)
      .onChange(function (val) {
        const name = this.object.name;

        scene.traverse(function (child) {
          if (child.userData.hasOwnProperty("attributes")) {
            if ("layerIndex" in child.userData.attributes) {
              const layerName =
                layers[child.userData.attributes.layerIndex].name;

              if (layerName === name) {
                child.visible = val;
                layer.visible = val;
              }
            }
          }
        });
      });
  }
}
