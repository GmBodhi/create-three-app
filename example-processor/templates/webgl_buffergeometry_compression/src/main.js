import "./style.css"; // For webpack support

import {
  LineBasicMaterial,
  MeshPhongMaterial,
  DoubleSide,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  AxesHelper,
  Mesh,
  LineSegments,
  WireframeGeometry,
  IcosahedronGeometry,
  CylinderGeometry,
  TorusKnotGeometry,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as GeometryCompressionUtils from "three/addons/utils/GeometryCompressionUtils.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let container, stats, gui;

let camera, scene, renderer, controls;

const lights = [];

// options
const data = {
  model: "Icosahedron",
  wireframe: false,
  texture: false,
  detail: 4,

  QuantizePosEncoding: false,
  NormEncodingMethods: "None", // for normal encodings
  DefaultUVEncoding: false,

  totalGPUMemory: "0 bytes",
};
let memoryDisplay;

// geometry params
const radius = 100;

// materials
const lineMaterial = new LineBasicMaterial({
  color: 0xaaaaaa,
  transparent: true,
  opacity: 0.8,
});
const meshMaterial = new MeshPhongMaterial({
  color: 0xffffff,
  side: DoubleSide,
});

// texture
const texture = new TextureLoader().load("textures/uv_grid_opengl.jpg");
texture.wrapS = RepeatWrapping;
texture.wrapT = RepeatWrapping;
texture.colorSpace = SRGBColorSpace;

//
init();

function init() {
  //

  container = document.createElement("div");
  document.body.appendChild(container);

  //

  scene = new Scene();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.setScalar(2 * radius);

  //

  scene.add(new AmbientLight(0xffffff, 0.3));

  lights[0] = new DirectionalLight(0xffffff, 2.5);
  lights[1] = new DirectionalLight(0xffffff, 2.5);
  lights[2] = new DirectionalLight(0xffffff, 2.5);

  lights[0].position.set(0, 2 * radius, 0);
  lights[1].position.set(2 * radius, -2 * radius, 2 * radius);
  lights[2].position.set(-2 * radius, -2 * radius, -2 * radius);

  scene.add(lights[0]);
  scene.add(lights[1]);
  scene.add(lights[2]);

  //

  scene.add(new AxesHelper(radius * 5));

  //

  let geom = newGeometry(data);

  const mesh = new Mesh(geom, meshMaterial);
  scene.add(mesh);

  const lineSegments = new LineSegments(
    new WireframeGeometry(geom),
    lineMaterial
  );
  lineSegments.visible = data.wireframe;

  scene.add(lineSegments);

  //

  gui = new GUI();
  gui.width = 350;

  function newGeometry(data) {
    switch (data.model) {
      case "Icosahedron":
        return new IcosahedronGeometry(radius, data.detail);
      case "Cylinder":
        return new CylinderGeometry(
          radius / 1.5,
          radius / 1.5,
          radius,
          data.detail * 6
        );
      case "Teapot":
        return new TeapotGeometry(
          radius / 1.5,
          data.detail * 3,
          true,
          true,
          true,
          true,
          true
        );
      case "TorusKnot":
        return new TorusKnotGeometry(
          radius / 2,
          10,
          data.detail * 30,
          data.detail * 6,
          3,
          4
        );
    }
  }

  function generateGeometry() {
    geom = newGeometry(data);

    updateGroupGeometry(mesh, lineSegments, geom, data);
  }

  function updateLineSegments() {
    lineSegments.visible = data.wireframe;
  }

  let folder = gui.addFolder("Scene");
  folder
    .add(data, "model", ["Icosahedron", "Cylinder", "TorusKnot", "Teapot"])
    .onChange(generateGeometry);
  folder.add(data, "wireframe", false).onChange(updateLineSegments);
  folder.add(data, "texture", false).onChange(generateGeometry);
  folder.add(data, "detail", 1, 8, 1).onChange(generateGeometry);
  folder.open();

  folder = gui.addFolder("Position Compression");
  folder.add(data, "QuantizePosEncoding", false).onChange(generateGeometry);
  folder.open();

  folder = gui.addFolder("Normal Compression");
  folder
    .add(data, "NormEncodingMethods", [
      "None",
      "DEFAULT",
      "OCT1Byte",
      "OCT2Byte",
      "ANGLES",
    ])
    .onChange(generateGeometry);
  folder.open();

  folder = gui.addFolder("UV Compression");
  folder.add(data, "DefaultUVEncoding", false).onChange(generateGeometry);
  folder.open();

  folder = gui.addFolder("Memory Info");
  folder.open();
  memoryDisplay = folder.add(data, "totalGPUMemory", "0 bytes");
  computeGPUMemory(mesh);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

//

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();
}

//

function animate() {
  renderer.render(scene, camera);

  stats.update();
}

//

function updateGroupGeometry(mesh, lineSegments, geometry, data) {
  // dispose first

  lineSegments.geometry.dispose();
  mesh.geometry.dispose();
  mesh.material.dispose();
  if (mesh.material.map) mesh.material.map.dispose();

  lineSegments.geometry = new WireframeGeometry(geometry);
  mesh.geometry = geometry;
  mesh.material = new MeshPhongMaterial({ color: 0xffffff, side: DoubleSide });
  mesh.material.map = data.texture ? texture : null;

  if (data["QuantizePosEncoding"]) {
    GeometryCompressionUtils.compressPositions(mesh);
  }

  if (data["NormEncodingMethods"] !== "None") {
    GeometryCompressionUtils.compressNormals(mesh, data["NormEncodingMethods"]);
  }

  if (data["DefaultUVEncoding"]) {
    GeometryCompressionUtils.compressUvs(mesh);
  }

  computeGPUMemory(mesh);
}

function computeGPUMemory(mesh) {
  // Use BufferGeometryUtils to do memory calculation

  memoryDisplay.setValue(
    BufferGeometryUtils.estimateBytesUsed(mesh.geometry) + " bytes"
  );
}
