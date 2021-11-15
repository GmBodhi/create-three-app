import "./style.css"; // For webpack support

import {
  LineBasicMaterial,
  MeshPhongMaterial,
  TextureLoader,
  RepeatWrapping,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  PointLight,
  AxesHelper,
  Mesh,
  LineSegments,
  WireframeGeometry,
  IcosahedronGeometry,
  CylinderGeometry,
  TorusKnotGeometry,
  Vector3,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as GeometryCompressionUtils from "three/examples/jsm/utils/GeometryCompressionUtils.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

const statsEnabled = true;

let container, stats, gui;

let camera, scene, renderer, controls;

const lights = [];

// options
const data = {
  model: "Icosahedron",
  wireframe: false,
  texture: false,
  detail: 4,
  rotationSpeed: 0.1,

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
  emissive: 0x111111,
});

// texture
const texture = new TextureLoader().load("textures/uv_grid_opengl.jpg");
texture.wrapS = RepeatWrapping;
texture.wrapT = RepeatWrapping;

//
init();
animate();

function init() {
  //
  container = document.createElement("div");
  document.body.appendChild(container);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  scene = new Scene();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    10000000
  );
  camera.position.x = 2 * radius;
  camera.position.y = 2 * radius;
  camera.position.z = 2 * radius;

  controls = new OrbitControls(camera, renderer.domElement);

  //

  lights[0] = new PointLight(0xffffff, 1, 0);
  lights[1] = new PointLight(0xffffff, 1, 0);
  lights[2] = new PointLight(0xffffff, 1, 0);

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
  const lineSegments = new LineSegments(
    new WireframeGeometry(geom),
    lineMaterial
  );
  lineSegments.visible = data.wireframe;

  scene.add(mesh);
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
          radius,
          radius,
          radius * 2,
          data.detail * 6
        );
      case "Teapot":
        return new TeapotGeometry(
          radius,
          data.detail * 3,
          true,
          true,
          true,
          true,
          true
        );
      case "TorusKnot":
        return new TorusKnotGeometry(
          radius,
          10,
          data.detail * 20,
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

  // updateLineSegments
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
  folder.add(data, "rotationSpeed", 0, 0.5, 0.1);
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

  if (statsEnabled) {
    stats = new Stats();
    container.appendChild(stats.dom);
  }

  window.addEventListener("resize", onWindowResize);
}

//

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

//
function updateLightsPossition() {
  lights.forEach((light) => {
    const direction = light.position.clone();
    direction.applyAxisAngle(
      new Vector3(1, 1, 0),
      (data.rotationSpeed / 180) * Math.PI
    );
    light.position.add(direction.sub(light.position));
  });
}

//

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  updateLightsPossition();

  renderer.render(scene, camera);

  if (statsEnabled) stats.update();
}

//

function updateGroupGeometry(mesh, lineSegments, geometry, data) {
  // dispose first
  lineSegments.geometry.dispose();
  mesh.geometry.dispose();

  lineSegments.geometry = new WireframeGeometry(geometry);
  mesh.geometry = geometry;
  mesh.material = new MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x111111,
  });
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
