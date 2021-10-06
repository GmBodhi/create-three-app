import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  AmbientLight,
  PointLight,
  LoadingManager,
  WebGLRenderer,
} from "three";

import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

let camera, scene, renderer;

let mouseX = 0,
  mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.z = 250;

  // scene

  scene = new Scene();

  const ambientLight = new AmbientLight(0xcccccc, 0.4);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xffffff, 0.8);
  camera.add(pointLight);
  scene.add(camera);

  // model

  const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      console.log(Math.round(percentComplete, 2) + "% downloaded");
    }
  };

  const onError = function () {};

  const manager = new LoadingManager();
  manager.addHandler(/\.dds$/i, new DDSLoader());

  // comment in the following line and import TGALoader if your asset uses TGA textures
  // manager.addHandler( /\.tga$/i, new TGALoader() );

  new MTLLoader(manager)
    .setPath("models/obj/male02/")
    .load("male02_dds.mtl", function (materials) {
      materials.preload();

      new OBJLoader(manager)
        .setMaterials(materials)
        .setPath("models/obj/male02/")
        .load(
          "male02.obj",
          function (object) {
            object.position.y = -95;
            scene.add(object);
          },
          onProgress,
          onError
        );
    });

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  document.addEventListener("mousemove", onDocumentMouseMove);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) / 2;
  mouseY = (event.clientY - windowHalfY) / 2;
}

//

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}
