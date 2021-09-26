import "./style.css"; // For webpack support

import {
  Vector3,
  Scene,
  Color,
  PerspectiveCamera,
  DirectionalLight,
  Group,
  WebGLRenderer,
  BoxGeometry,
  IcosahedronGeometry,
  MeshPhongMaterial,
  Mesh,
} from "three";

import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { PDBLoader } from "three/examples/jsm/loaders/PDBLoader.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

let camera, scene, renderer, labelRenderer;
let controls;

let root;

const MOLECULES = {
  Ethanol: "ethanol.pdb",
  Aspirin: "aspirin.pdb",
  Caffeine: "caffeine.pdb",
  Nicotine: "nicotine.pdb",
  LSD: "lsd.pdb",
  Cocaine: "cocaine.pdb",
  Cholesterol: "cholesterol.pdb",
  Lycopene: "lycopene.pdb",
  Glucose: "glucose.pdb",
  "Aluminium oxide": "Al2O3.pdb",
  Cubane: "cubane.pdb",
  Copper: "cu.pdb",
  Fluorite: "caf2.pdb",
  Salt: "nacl.pdb",
  "YBCO superconductor": "ybco.pdb",
  Buckyball: "buckyball.pdb",
  Graphite: "graphite.pdb",
};

const loader = new PDBLoader();
const offset = new Vector3();

const menu = document.getElementById("menu");

init();
animate();

function init() {
  scene = new Scene();
  scene.background = new Color(0x050505);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.z = 1000;
  scene.add(camera);

  const light1 = new DirectionalLight(0xffffff, 0.8);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new DirectionalLight(0xffffff, 0.5);
  light2.position.set(-1, -1, 1);
  scene.add(light2);

  root = new Group();
  scene.add(root);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0px";
  labelRenderer.domElement.style.pointerEvents = "none";
  document.getElementById("container").appendChild(labelRenderer.domElement);

  //

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 2000;

  //

  loadMolecule("models/pdb/caffeine.pdb");
  createMenu();

  //

  window.addEventListener("resize", onWindowResize);
}

//

function generateButtonCallback(url) {
  return function () {
    loadMolecule(url);
  };
}

function createMenu() {
  for (const m in MOLECULES) {
    const button = document.createElement("button");
    button.innerHTML = m;
    menu.appendChild(button);

    const url = "models/pdb/" + MOLECULES[m];

    button.addEventListener("click", generateButtonCallback(url));
  }
}

//

function loadMolecule(url) {
  while (root.children.length > 0) {
    const object = root.children[0];
    object.parent.remove(object);
  }

  loader.load(url, function (pdb) {
    const geometryAtoms = pdb.geometryAtoms;
    const geometryBonds = pdb.geometryBonds;
    const json = pdb.json;

    const boxGeometry = new BoxGeometry(1, 1, 1);
    const sphereGeometry = new IcosahedronGeometry(1, 3);

    geometryAtoms.computeBoundingBox();
    geometryAtoms.boundingBox.getCenter(offset).negate();

    geometryAtoms.translate(offset.x, offset.y, offset.z);
    geometryBonds.translate(offset.x, offset.y, offset.z);

    let positions = geometryAtoms.getAttribute("position");
    const colors = geometryAtoms.getAttribute("color");

    const position = new Vector3();
    const color = new Color();

    for (let i = 0; i < positions.count; i++) {
      position.x = positions.getX(i);
      position.y = positions.getY(i);
      position.z = positions.getZ(i);

      color.r = colors.getX(i);
      color.g = colors.getY(i);
      color.b = colors.getZ(i);

      const material = new MeshPhongMaterial({ color: color });

      const object = new Mesh(sphereGeometry, material);
      object.position.copy(position);
      object.position.multiplyScalar(75);
      object.scale.multiplyScalar(25);
      root.add(object);

      const atom = json.atoms[i];

      const text = document.createElement("div");
      text.className = "label";
      text.style.color =
        "rgb(" + atom[3][0] + "," + atom[3][1] + "," + atom[3][2] + ")";
      text.textContent = atom[4];

      const label = new CSS2DObject(text);
      label.position.copy(object.position);
      root.add(label);
    }

    positions = geometryBonds.getAttribute("position");

    const start = new Vector3();
    const end = new Vector3();

    for (let i = 0; i < positions.count; i += 2) {
      start.x = positions.getX(i);
      start.y = positions.getY(i);
      start.z = positions.getZ(i);

      end.x = positions.getX(i + 1);
      end.y = positions.getY(i + 1);
      end.z = positions.getZ(i + 1);

      start.multiplyScalar(75);
      end.multiplyScalar(75);

      const object = new Mesh(boxGeometry, new MeshPhongMaterial(0xffffff));
      object.position.copy(start);
      object.position.lerp(end, 0.5);
      object.scale.set(5, 5, start.distanceTo(end));
      object.lookAt(end);
      root.add(object);
    }

    render();
  });
}

//

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const time = Date.now() * 0.0004;

  root.rotation.x = time;
  root.rotation.y = time * 0.7;

  render();
}

function render() {
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
