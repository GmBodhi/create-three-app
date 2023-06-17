import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  PerspectiveCamera,
  BoxGeometry,
  MeshPhongMaterial,
  Mesh,
  DirectionalLight,
  AmbientLight,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { IFCLoader } from "web-ifc-three";
import { IFCSPACE } from "web-ifc";

let scene, camera, renderer;

async function init() {
  //Scene
  scene = new Scene();
  scene.background = new Color(0x8cc7de);

  //Camera
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = -70;
  camera.position.y = 25;
  camera.position.x = 90;

  //Initial cube
  const geometry = new BoxGeometry();
  const material = new MeshPhongMaterial({ color: 0xffffff });
  const cube = new Mesh(geometry, material);
  scene.add(cube);

  //Lights
  const directionalLight1 = new DirectionalLight(0xffeeff, 2.5);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new DirectionalLight(0xffffff, 2.5);
  directionalLight2.position.set(-1, 0.5, -1);
  scene.add(directionalLight2);

  const ambientLight = new AmbientLight(0xffffee, 0.75);
  scene.add(ambientLight);

  //Setup IFC Loader
  const ifcLoader = new IFCLoader();
  await ifcLoader.ifcManager.setWasmPath(
    "https://unpkg.com/web-ifc@0.0.36/",
    true
  );

  await ifcLoader.ifcManager.parser.setupOptionalCategories({
    [IFCSPACE]: false,
  });

  await ifcLoader.ifcManager.applyWebIfcConfig({
    USE_FAST_BOOLS: true,
  });

  ifcLoader.load(
    "models/ifc/rac_advanced_sample_project.ifc",
    function (model) {
      scene.add(model.mesh);
      render();
    }
  );

  //Renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);

  //Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);

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

init();
