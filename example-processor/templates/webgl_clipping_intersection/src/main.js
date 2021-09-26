import "./style.css"; // For webpack support

import {
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Scene,
  Color,
  Fog,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  TextureLoader,
  MeshLambertMaterial,
  DoubleSide,
  ParametricBufferGeometry,
  Mesh,
  SphereGeometry,
  MeshLambertMaterial,
  Mesh,
  RepeatWrapping,
  sRGBEncoding,
  MeshLambertMaterial,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshLambertMaterial,
  Mesh,
  Mesh,
  Mesh,
  BoxGeometry,
  BoxGeometry,
  Mesh,
  Mesh,
  WebGLRenderer,
  sRGBEncoding,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  Plane,
  Vector3,
  Plane,
  Vector3,
  MeshPhongMaterial,
  DoubleSide,
  TorusKnotGeometry,
  Mesh,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  WebGLRenderer,
  Plane,
  Plane,
  Vector3,
  Vector3,
  Vector3,
  Matrix4,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  DirectionalLight,
  MeshPhongMaterial,
  DoubleSide,
  Group,
  BoxGeometry,
  Mesh,
  PlaneGeometry,
  Color,
  Group,
  MeshBasicMaterial,
  DoubleSide,
  Mesh,
  Mesh,
  MeshPhongMaterial,
  WebGLRenderer,
  Matrix4,
  Matrix4,
  Plane,
  Vector3,
  Plane,
  Vector3,
  Plane,
  Vector3,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  CameraHelper,
  Group,
  SphereGeometry,
  MeshLambertMaterial,
  Color,
  DoubleSide,
  Mesh,
  Group,
  PlaneHelper,
  PlaneHelper,
  PlaneHelper,
} from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;

const params = {
  clipIntersection: true,
  planeConstant: 0,
  showHelpers: false,
};

const clipPlanes = [
  new Plane(new Vector3(1, 0, 0), 0),
  new Plane(new Vector3(0, -1, 0), 0),
  new Plane(new Vector3(0, 0, -1), 0),
];

init();
render();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    200
  );

  camera.position.set(-1.5, 2.5, 3.0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use only if there is no animation loop
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.enablePan = false;

  const light = new HemisphereLight(0xffffff, 0x080808, 1.5);
  light.position.set(-1.25, 1, 1.25);
  scene.add(light);

  // const helper = new CameraHelper( light.shadow.camera );
  // scene.add( helper );

  //

  const group = new Group();

  for (let i = 1; i <= 30; i += 2) {
    const geometry = new SphereGeometry(i / 30, 48, 24);

    const material = new MeshLambertMaterial({
      color: new Color().setHSL(Math.random(), 0.5, 0.5),
      side: DoubleSide,
      clippingPlanes: clipPlanes,
      clipIntersection: params.clipIntersection,
    });

    group.add(new Mesh(geometry, material));
  }

  scene.add(group);

  // helpers

  const helpers = new Group();
  helpers.add(new PlaneHelper(clipPlanes[0], 2, 0xff0000));
  helpers.add(new PlaneHelper(clipPlanes[1], 2, 0x00ff00));
  helpers.add(new PlaneHelper(clipPlanes[2], 2, 0x0000ff));
  helpers.visible = false;
  scene.add(helpers);

  // gui

  const gui = new GUI();

  gui
    .add(params, "clipIntersection")
    .name("clip intersection")
    .onChange(function (value) {
      const children = group.children;

      for (let i = 0; i < children.length; i++) {
        children[i].material.clipIntersection = value;
      }

      render();
    });

  gui
    .add(params, "planeConstant", -1, 1)
    .step(0.01)
    .name("plane constant")
    .onChange(function (value) {
      for (let j = 0; j < clipPlanes.length; j++) {
        clipPlanes[j].constant = value;
      }

      render();
    });

  gui
    .add(params, "showHelpers")
    .name("show helpers")
    .onChange(function (value) {
      helpers.visible = value;

      render();
    });

  //

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
