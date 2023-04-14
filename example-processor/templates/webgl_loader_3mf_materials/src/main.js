import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  Fog,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  CameraHelper,
  LoadingManager,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  WebGLRenderer,
  PCFSoftShadowMap,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";

let camera, scene, renderer;

init();

function init() {
  scene = new Scene();
  scene.background = new Color(0xa0a0a0);
  scene.fog = new Fog(0xa0a0a0, 10, 500);

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    500
  );
  camera.position.set(-50, 40, 50);
  scene.add(camera);

  //

  const hemiLight = new HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 100, 0);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff);
  dirLight.position.set(-0, 40, 50);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -25;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  // scene.add( new CameraHelper( dirLight.shadow.camera ) );

  //

  const manager = new LoadingManager();

  const loader = new ThreeMFLoader(manager);
  loader.load("three/examples/models/3mf/truck.3mf", function (object) {
    object.rotation.set(-Math.PI / 2, 0, 0); // z-up conversion

    object.traverse(function (child) {
      child.castShadow = true;
    });

    scene.add(object);
  });

  //

  manager.onLoad = function () {
    render();
  };

  //

  const ground = new Mesh(
    new PlaneGeometry(1000, 1000),
    new MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 11;
  ground.receiveShadow = true;
  scene.add(ground);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 50;
  controls.maxDistance = 200;
  controls.enablePan = false;
  controls.target.set(0, 20, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  render();
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
