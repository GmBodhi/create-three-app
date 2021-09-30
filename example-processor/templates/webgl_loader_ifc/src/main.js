//Shaders

undefined;

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
  Vector2,
  Raycaster,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { IFCLoader } from "three/examples/jsm/loaders/IFCLoader.js";

let scene, camera, renderer;

init();

function init() {
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
  const directionalLight1 = new DirectionalLight(0xffeeff, 0.8);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new DirectionalLight(0xffffff, 0.8);
  directionalLight2.position.set(-1, 0.5, -1);
  scene.add(directionalLight2);

  const ambientLight = new AmbientLight(0xffffee, 0.25);
  scene.add(ambientLight);

  //Setup IFC Loader
  const ifcLoader = new IFCLoader();
  ifcLoader.ifcManager.setWasmPath("jsm/loaders/ifc/");
  ifcLoader.load(
    "models/ifc/rac_advanced_sample_project.ifc",
    function (model) {
      scene.add(model.mesh);
      render();
    }
  );

  const highlightMaterial = new MeshPhongMaterial({
    color: 0xff00ff,
    depthTest: false,
    transparent: true,
    opacity: 0.3,
  });

  function selectObject(event) {
    if (event.button != 0) return;

    const mouse = new Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersected = raycaster.intersectObjects(scene.children);
    if (intersected.length) {
      const found = intersected[0];
      const faceIndex = found.faceIndex;
      const geometry = found.object.geometry;
      const id = ifcLoader.ifcManager.getExpressId(geometry, faceIndex);

      const modelID = found.object.modelID;
      ifcLoader.ifcManager.createSubset({
        modelID,
        ids: [id],
        scene,
        removePrevious: true,
        material: highlightMaterial,
      });
      const props = ifcLoader.ifcManager.getItemProperties(modelID, id, true);
      console.log(props);
      renderer.render(scene, camera);
    }
  }

  window.onpointerdown = selectObject;

  //Renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
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
