import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  SRGBColorSpace,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  DirectionalLight,
  MeshLambertMaterial,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;

const params = {
  addTriangle: addTriangle,
  addCube: addCube,
  addCylinder: addCylinder,
  addMultiple: addMultiple,
  addTransformed: addTransformed,
  addPoints: addPoints,
  exportToObj: exportToObj,
};

init();
animate();

function init() {
  renderer = new WebGLRenderer();
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 400);

  scene = new Scene();

  const ambientLight = new AmbientLight(0xcccccc, 0.4);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  const gui = new GUI();

  let h = gui.addFolder("Geometry Selection");
  h.add(params, "addTriangle").name("Triangle");
  h.add(params, "addCube").name("Cube");
  h.add(params, "addCylinder").name("Cylinder");
  h.add(params, "addMultiple").name("Multiple objects");
  h.add(params, "addTransformed").name("Transformed objects");
  h.add(params, "addPoints").name("Point Cloud");

  h = gui.addFolder("Export");
  h.add(params, "exportToObj").name("Export OBJ");

  gui.open();

  addGeometry(1);

  window.addEventListener("resize", onWindowResize);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
}

function exportToObj() {
  const exporter = new OBJExporter();
  const result = exporter.parse(scene);
  saveString(result, "object.obj");
}

function addGeometry(type) {
  for (let i = 0; i < scene.children.length; i++) {
    const child = scene.children[i];

    if (child.isMesh || child.isPoints) {
      child.geometry.dispose();
      scene.remove(child);
      i--;
    }
  }

  if (type === 1) {
    const material = new MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = generateTriangleGeometry();

    scene.add(new Mesh(geometry, material));
  } else if (type === 2) {
    const material = new MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = new BoxGeometry(100, 100, 100);
    scene.add(new Mesh(geometry, material));
  } else if (type === 3) {
    const material = new MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = new CylinderGeometry(50, 50, 100, 30, 1);
    scene.add(new Mesh(geometry, material));
  } else if (type === 4 || type === 5) {
    const material = new MeshLambertMaterial({ color: 0x00cc00 });
    const geometry = generateTriangleGeometry();

    const mesh = new Mesh(geometry, material);
    mesh.position.x = -200;
    scene.add(mesh);

    const geometry2 = new BoxGeometry(100, 100, 100);
    const mesh2 = new Mesh(geometry2, material);
    scene.add(mesh2);

    const geometry3 = new CylinderGeometry(50, 50, 100, 30, 1);
    const mesh3 = new Mesh(geometry3, material);
    mesh3.position.x = 200;
    scene.add(mesh3);

    if (type === 5) {
      mesh.rotation.y = Math.PI / 4.0;
      mesh2.rotation.y = Math.PI / 4.0;
      mesh3.rotation.y = Math.PI / 4.0;
    }
  } else if (type === 6) {
    const points = [0, 0, 0, 100, 0, 0, 100, 100, 0, 0, 100, 0];
    const colors = [0.5, 0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0.5, 0];

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    const material = new PointsMaterial({ size: 10, vertexColors: true });

    const pointCloud = new Points(geometry, material);
    pointCloud.name = "point cloud";
    scene.add(pointCloud);
  }
}

function addTriangle() {
  addGeometry(1);
}

function addCube() {
  addGeometry(2);
}

function addCylinder() {
  addGeometry(3);
}

function addMultiple() {
  addGeometry(4);
}

function addTransformed() {
  addGeometry(5);
}

function addPoints() {
  addGeometry(6);
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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

function generateTriangleGeometry() {
  const geometry = new BufferGeometry();
  const vertices = [];

  vertices.push(-50, -50, 0);
  vertices.push(50, -50, 0);
  vertices.push(50, 50, 0);

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
}
