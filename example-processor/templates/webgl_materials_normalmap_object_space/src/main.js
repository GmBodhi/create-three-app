import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  PointLight,
  ObjectSpaceNormalMap,
  DoubleSide,
  Box3,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let renderer, scene, camera;

init();

function init() {
  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // scene
  scene = new Scene();

  // camera
  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(-10, 0, 23);
  scene.add(camera);

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.enablePan = false;

  // ambient
  scene.add(new AmbientLight(0xffffff, 0.6));

  // light
  const light = new PointLight(0xffffff, 4.5, 0, 0);
  camera.add(light);

  // model
  new GLTFLoader().load("models/gltf/Nefertiti/Nefertiti.glb", function (gltf) {
    gltf.scene.traverse(function (child) {
      if (child.isMesh) {
        // glTF currently supports only tangent-space normal maps.
        // this model has been modified to demonstrate the use of an object-space normal map.

        child.material.normalMapType = ObjectSpaceNormalMap;

        // attribute normals are not required with an object-space normal map. remove them.

        child.geometry.deleteAttribute("normal");

        //

        child.material.side = DoubleSide;

        child.scale.multiplyScalar(0.5);

        // recenter

        new Box3()
          .setFromObject(child)
          .getCenter(child.position)
          .multiplyScalar(-1);

        scene.add(child);
      }
    });

    render();
  });

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  render();
}

function render() {
  renderer.render(scene, camera);
}
