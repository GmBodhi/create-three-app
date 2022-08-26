import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  Line,
  LineDashedMaterial,
} from "three";

import { SVGRenderer } from "three/addons/renderers/SVGRenderer.js";

let camera, scene, renderer;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    33,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 10;

  scene = new Scene();
  scene.background = new Color(0, 0, 0);

  renderer = new SVGRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  const vertices = [];
  const divisions = 50;

  for (let i = 0; i <= divisions; i++) {
    const v = (i / divisions) * (Math.PI * 2);

    const x = Math.sin(v);
    const z = Math.cos(v);

    vertices.push(x, 0, z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));

  //

  for (let i = 1; i <= 3; i++) {
    const material = new LineBasicMaterial({
      color: Math.random() * 0xffffff,
      linewidth: 10,
    });
    const line = new Line(geometry, material);
    line.scale.setScalar(i / 3);
    scene.add(line);
  }

  const material = new LineDashedMaterial({
    color: "blue",
    linewidth: 1,
    dashSize: 10,
    gapSize: 10,
  });
  const line = new Line(geometry, material);
  line.scale.setScalar(2);
  scene.add(line);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  let count = 0;
  const time = performance.now() / 1000;

  scene.traverse(function (child) {
    child.rotation.x = count + time / 3;
    child.rotation.z = count + time / 4;

    count++;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
