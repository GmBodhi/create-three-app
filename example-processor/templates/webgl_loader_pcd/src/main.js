import "./style.css"; // For webpack support

import { WebGLRenderer, Scene, PerspectiveCamera, AxesHelper } from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PCDLoader } from "three/addons/loaders/PCDLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;

init();
render();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    0.01,
    40
  );
  camera.position.set(0, 0, 1);
  scene.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use if there is no animation loop
  controls.minDistance = 0.5;
  controls.maxDistance = 10;

  //scene.add( new AxesHelper( 1 ) );

  const loader = new PCDLoader();

  const loadPointCloud = function (file) {
    loader.load("three/examples/models/pcd/" + file, function (points) {
      points.geometry.center();
      points.geometry.rotateX(Math.PI);
      points.name = file;
      scene.add(points);

      const gui = new GUI();

      gui.add(points.material, "size", 0.001, 0.01).onChange(render);
      gui.addColor(points.material, "color").onChange(render);
      gui
        .add(points, "name", [
          "ascii/simple.pcd",
          "binary/Zaghetto.pcd",
          "binary/Zaghetto_8bit.pcd",
          "binary_compressed/pcl_logo.pcd",
        ])
        .name("type")
        .onChange((e) => {
          gui.destroy();
          scene.remove(points);
          loadPointCloud(e);
        });
      gui.open();

      render();
    });
  };

  loadPointCloud("binary/Zaghetto.pcd");

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}
