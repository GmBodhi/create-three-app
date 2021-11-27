import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  DirectionalLight,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  BoxHelper,
  MeshLambertMaterial,
  DoubleSide,
  WebGLRenderer,
  AxesHelper,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { NRRDLoader } from "three/examples/jsm/loaders/NRRDLoader.js";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader.js";

let container,
  stats,
  camera,
  controls,
  scene,
  renderer,
  container2,
  renderer2,
  camera2,
  axes2,
  scene2;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    1e10
  );
  camera.position.z = 300;

  scene = new Scene();

  scene.add(camera);

  // light

  const hemiLight = new HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(200, 200, 200);
  scene.add(dirLight);

  const loader = new NRRDLoader();
  loader.load("models/nrrd/I.nrrd", function (volume) {
    //box helper to see the extend of the volume
    const geometry = new BoxGeometry(
      volume.xLength,
      volume.yLength,
      volume.zLength
    );
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new Mesh(geometry, material);
    cube.visible = false;
    const box = new BoxHelper(cube);
    scene.add(box);
    box.applyMatrix4(volume.matrix);
    scene.add(cube);

    //z plane
    const sliceZ = volume.extractSlice(
      "z",
      Math.floor(volume.RASDimensions[2] / 4)
    );
    scene.add(sliceZ.mesh);

    //y plane
    const sliceY = volume.extractSlice(
      "y",
      Math.floor(volume.RASDimensions[1] / 2)
    );
    scene.add(sliceY.mesh);

    //x plane
    const sliceX = volume.extractSlice(
      "x",
      Math.floor(volume.RASDimensions[0] / 2)
    );
    scene.add(sliceX.mesh);

    gui
      .add(sliceX, "index", 0, volume.RASDimensions[0], 1)
      .name("indexX")
      .onChange(function () {
        sliceX.repaint.call(sliceX);
      });
    gui
      .add(sliceY, "index", 0, volume.RASDimensions[1], 1)
      .name("indexY")
      .onChange(function () {
        sliceY.repaint.call(sliceY);
      });
    gui
      .add(sliceZ, "index", 0, volume.RASDimensions[2], 1)
      .name("indexZ")
      .onChange(function () {
        sliceZ.repaint.call(sliceZ);
      });

    gui
      .add(volume, "lowerThreshold", volume.min, volume.max, 1)
      .name("Lower Threshold")
      .onChange(function () {
        volume.repaintAllSlices();
      });
    gui
      .add(volume, "upperThreshold", volume.min, volume.max, 1)
      .name("Upper Threshold")
      .onChange(function () {
        volume.repaintAllSlices();
      });
    gui
      .add(volume, "windowLow", volume.min, volume.max, 1)
      .name("Window Low")
      .onChange(function () {
        volume.repaintAllSlices();
      });
    gui
      .add(volume, "windowHigh", volume.min, volume.max, 1)
      .name("Window High")
      .onChange(function () {
        volume.repaintAllSlices();
      });
  });

  const vtkmaterial = new MeshLambertMaterial({
    wireframe: false,
    side: DoubleSide,
    color: 0xff0000,
  });

  const vtkloader = new VTKLoader();
  vtkloader.load("models/vtk/liver.vtk", function (geometry) {
    geometry.computeVertexNormals();

    const mesh = new Mesh(geometry, vtkmaterial);
    scene.add(mesh);
    const visibilityControl = {
      visible: true,
    };
    gui
      .add(visibilityControl, "visible")
      .name("Model Visible")
      .onChange(function () {
        mesh.visible = visibilityControl.visible;
        renderer.render(scene, camera);
      });
  });
  // renderer

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 100;
  controls.maxDistance = 500;
  controls.rotateSpeed = 5.0;
  controls.zoomSpeed = 5;
  controls.panSpeed = 2;

  stats = new Stats();
  container.appendChild(stats.dom);

  const gui = new GUI();

  setupInset();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  controls.handleResize();
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  //copy position of the camera into inset
  camera2.position.copy(camera.position);
  camera2.position.sub(controls.target);
  camera2.position.setLength(300);
  camera2.lookAt(scene2.position);

  renderer.render(scene, camera);
  renderer2.render(scene2, camera2);

  stats.update();
}

function setupInset() {
  const insetWidth = 150,
    insetHeight = 150;
  container2 = document.getElementById("inset");
  container2.width = insetWidth;
  container2.height = insetHeight;

  // renderer
  renderer2 = new WebGLRenderer({ alpha: true });
  renderer2.setClearColor(0x000000, 0);
  renderer2.setSize(insetWidth, insetHeight);
  container2.appendChild(renderer2.domElement);

  // scene
  scene2 = new Scene();

  // camera
  camera2 = new PerspectiveCamera(50, insetWidth / insetHeight, 1, 1000);
  camera2.up = camera.up; // important!

  // axes
  axes2 = new AxesHelper(100);
  scene2.add(axes2);
}
