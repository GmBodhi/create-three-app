import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  HemisphereLight,
  DirectionalLight,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  GridHelper,
  BoxGeometry,
  BufferAttribute,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PLYExporter } from "three/addons/exporters/PLYExporter.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let scene, camera, renderer, exporter, mesh;

const params = {
  exportASCII: exportASCII,
  exportBinaryBigEndian: exportBinaryBigEndian,
  exportBinaryLittleEndian: exportBinaryLittleEndian,
};

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(4, 2, 4);

  scene = new Scene();
  scene.background = new Color(0xa0a0a0);
  scene.fog = new Fog(0xa0a0a0, 4, 20);

  exporter = new PLYExporter();

  //

  const hemiLight = new HemisphereLight(0xffffff, 0x444444, 3);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const directionalLight = new DirectionalLight(0xffffff, 3);
  directionalLight.position.set(0, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.top = 2;
  directionalLight.shadow.camera.bottom = -2;
  directionalLight.shadow.camera.left = -2;
  directionalLight.shadow.camera.right = 2;
  scene.add(directionalLight);

  // ground

  const ground = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new GridHelper(40, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  // export mesh

  const geometry = new BoxGeometry();
  const material = new MeshPhongMaterial({ vertexColors: true });

  // color vertices based on vertex positions
  const colors = geometry.getAttribute("position").array.slice();
  for (let i = 0, l = colors.length; i < l; i++) {
    if (colors[i] > 0) colors[i] = 0.5;
    else colors[i] = 0;
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3, false));

  mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.y = 0.5;
  scene.add(mesh);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = false;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.update();

  //

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  gui.add(params, "exportASCII").name("Export PLY (ASCII)");
  gui.add(params, "exportBinaryBigEndian").name("Export PLY (Binary BE)");
  gui.add(params, "exportBinaryLittleEndian").name("Export PLY (Binary LE)");
  gui.open();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function exportASCII() {
  exporter.parse(mesh, function (result) {
    saveString(result, "box.ply");
  });
}

function exportBinaryBigEndian() {
  exporter.parse(
    mesh,
    function (result) {
      saveArrayBuffer(result, "box.ply");
    },
    { binary: true }
  );
}

function exportBinaryLittleEndian() {
  exporter.parse(
    mesh,
    function (result) {
      saveArrayBuffer(result, "box.ply");
    },
    { binary: true, littleEndian: true }
  );
}

const link = document.createElement("a");
link.style.display = "none";
document.body.appendChild(link);

function save(blob, filename) {
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function saveString(text, filename) {
  save(new Blob([text], { type: "text/plain" }), filename);
}

function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], { type: "application/octet-stream" }), filename);
}
