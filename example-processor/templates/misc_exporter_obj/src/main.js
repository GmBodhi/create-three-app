import "./style.css"; // For webpack support

import {
  MeshLambertMaterial,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  DirectionalLight,
} from "three";

import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";

let camera, scene, light, renderer;
let exportButton, floatingDiv;
let mouseX = 0,
  mouseY = 0;

function exportToObj() {
  const exporter = new OBJExporter();
  const result = exporter.parse(scene);
  floatingDiv.style.display = "block";
  floatingDiv.innerHTML = result.split("\n").join("<br />");
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
    const colors = [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0];

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    const material = new PointsMaterial({ size: 10, vertexColors: true });

    const pointCloud = new Points(geometry, material);
    pointCloud.name = "point cloud";
    scene.add(pointCloud);
  }
}

function init() {
  renderer = new WebGLRenderer();
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

  light = new DirectionalLight(0xffffff);
  scene.add(light);

  addGeometry(1);

  window.addEventListener("click", onWindowClick);
  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove);
  document.addEventListener("mouseover", onDocumentMouseMove);

  document.getElementById("triangle").addEventListener("click", function () {
    addGeometry(1);
  });
  document.getElementById("cube").addEventListener("click", function () {
    addGeometry(2);
  });
  document.getElementById("cylinder").addEventListener("click", function () {
    addGeometry(3);
  });
  document.getElementById("multiple").addEventListener("click", function () {
    addGeometry(4);
  });
  document.getElementById("transformed").addEventListener("click", function () {
    addGeometry(5);
  });
  document.getElementById("points").addEventListener("click", function () {
    addGeometry(6);
  });

  exportButton = document.getElementById("export");
  exportButton.addEventListener("click", function () {
    exportToObj();
  });

  floatingDiv = document.createElement("div");
  floatingDiv.className = "floating";
  document.body.appendChild(floatingDiv);
}

function onWindowClick(event) {
  let needToClose = true;
  let target = event.target;

  while (target !== null) {
    if (target === floatingDiv || target === exportButton) {
      needToClose = false;
      break;
    }

    target = target.parentElement;
  }

  if (needToClose) {
    floatingDiv.style.display = "none";
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;
  mouseX = (event.clientX - windowHalfX) / 2;
  mouseY = (event.clientY - windowHalfY) / 2;
}

function animate() {
  requestAnimationFrame(animate);

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;
  camera.lookAt(scene.position);

  light.position
    .set(camera.position.x, camera.position.y, camera.position.z)
    .normalize();
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

init();
animate();
