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
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYExporter } from "three/examples/jsm/exporters/PLYExporter.js";

let scene, camera, renderer, exporter, mesh;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(200, 100, 200);

  scene = new Scene();
  scene.background = new Color(0xa0a0a0);
  scene.fog = new Fog(0xa0a0a0, 200, 1000);

  exporter = new PLYExporter();

  //

  const hemiLight = new HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const directionalLight = new DirectionalLight(0xffffff);
  directionalLight.position.set(0, 200, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.top = 180;
  directionalLight.shadow.camera.bottom = -100;
  directionalLight.shadow.camera.left = -120;
  directionalLight.shadow.camera.right = 120;
  scene.add(directionalLight);

  // ground

  const ground = new Mesh(
    new PlaneGeometry(2000, 2000),
    new MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new GridHelper(2000, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  // export mesh

  const geometry = new BoxGeometry(50, 50, 50);
  const material = new MeshPhongMaterial({ color: 0x00ff00 });

  mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.y = 25;
  scene.add(mesh);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 25, 0);
  controls.update();

  //

  window.addEventListener("resize", onWindowResize);

  const buttonExportASCII = document.getElementById("exportASCII");
  buttonExportASCII.addEventListener("click", exportASCII);

  const buttonExportBinaryBE = document.getElementById("exportBinaryBigEndian");
  buttonExportBinaryBE.addEventListener("click", exportBinaryBigEndian);

  const buttonExportBinaryLE = document.getElementById(
    "exportBinaryLittleEndian"
  );
  buttonExportBinaryLE.addEventListener("click", exportBinaryLittleEndian);
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
