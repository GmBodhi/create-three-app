import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  OrthographicCamera,
  Scene,
  Color,
  FogExp2,
  ConeGeometry,
  MeshPhongMaterial,
  InstancedMesh,
  Object3D,
  DirectionalLight,
  AmbientLight,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { TrackballControls } from "three/addons/controls/TrackballControls.js";

let perspectiveCamera, orthographicCamera, controls, scene, renderer, stats;

const params = {
  orthographicCamera: false,
};

const frustumSize = 400;

init();

function init() {
  const aspect = window.innerWidth / window.innerHeight;

  perspectiveCamera = new PerspectiveCamera(60, aspect, 1, 1000);
  perspectiveCamera.position.z = 500;

  orthographicCamera = new OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000
  );
  orthographicCamera.position.z = 500;

  // world

  scene = new Scene();
  scene.background = new Color(0xcccccc);
  scene.fog = new FogExp2(0xcccccc, 0.002);

  const geometry = new ConeGeometry(10, 30, 4, 1);
  const material = new MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
  });

  const mesh = new InstancedMesh(geometry, material, 500);
  const dummy = new Object3D();

  for (let i = 0; i < 500; i++) {
    dummy.position.x = (Math.random() - 0.5) * 1000;
    dummy.position.y = (Math.random() - 0.5) * 1000;
    dummy.position.z = (Math.random() - 0.5) * 1000;

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  scene.add(mesh);

  // lights

  const dirLight1 = new DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new DirectionalLight(0x002288, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new AmbientLight(0x555555);
  scene.add(ambientLight);

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  const gui = new GUI();
  gui
    .add(params, "orthographicCamera")
    .name("use orthographic")
    .onChange(function (value) {
      controls.dispose();

      createControls(value ? orthographicCamera : perspectiveCamera);
    });

  //

  window.addEventListener("resize", onWindowResize);

  createControls(perspectiveCamera);
}

function createControls(camera) {
  controls = new TrackballControls(camera, renderer.domElement);

  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;

  controls.keys = ["KeyA", "KeyS", "KeyD"];
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;

  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();

  orthographicCamera.left = (-frustumSize * aspect) / 2;
  orthographicCamera.right = (frustumSize * aspect) / 2;
  orthographicCamera.top = frustumSize / 2;
  orthographicCamera.bottom = -frustumSize / 2;
  orthographicCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  controls.handleResize();
}

function animate() {
  controls.update();

  render();

  stats.update();
}

function render() {
  const camera = params.orthographicCamera
    ? orthographicCamera
    : perspectiveCamera;

  renderer.render(scene, camera);
}
