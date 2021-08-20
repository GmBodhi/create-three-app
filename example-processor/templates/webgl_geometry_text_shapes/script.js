import "./style.css"; // For webpack support

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, -400, 600);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const loader = new THREE.FontLoader();
  loader.load("fonts/helvetiker_regular.typeface.json", function (font) {
    const color = 0x006699;

    const matDark = new THREE.LineBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
    });

    const matLite = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    const message = "   Three.js\nSimple text.";

    const shapes = font.generateShapes(message, 100);

    const geometry = new THREE.ShapeGeometry(shapes);

    geometry.computeBoundingBox();

    const xMid =
      -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(xMid, 0, 0);

    // make shape ( N.B. edge view not visible )

    const text = new THREE.Mesh(geometry, matLite);
    text.position.z = -150;
    scene.add(text);

    // make line shape ( N.B. edge view remains visible )

    const holeShapes = [];

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];

      if (shape.holes && shape.holes.length > 0) {
        for (let j = 0; j < shape.holes.length; j++) {
          const hole = shape.holes[j];
          holeShapes.push(hole);
        }
      }
    }

    shapes.push.apply(shapes, holeShapes);

    const lineText = new THREE.Object3D();

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];

      const points = shape.getPoints();
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      geometry.translate(xMid, 0, 0);

      const lineMesh = new THREE.Line(geometry, matDark);
      lineText.add(lineMesh);
    }

    scene.add(lineText);
  }); //end load function

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);
} // end init

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  renderer.render(scene, camera);
}
