//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  FontLoader,
  LineBasicMaterial,
  DoubleSide,
  MeshBasicMaterial,
  ShapeGeometry,
  Mesh,
  Object3D,
  BufferGeometry,
  Line,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, -400, 600);

  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  const loader = new FontLoader();
  loader.load("fonts/helvetiker_regular.typeface.json", function (font) {
    const color = 0x006699;

    const matDark = new LineBasicMaterial({
      color: color,
      side: DoubleSide,
    });

    const matLite = new MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide,
    });

    const message = "   Three.js\nSimple text.";

    const shapes = font.generateShapes(message, 100);

    const geometry = new ShapeGeometry(shapes);

    geometry.computeBoundingBox();

    const xMid =
      -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(xMid, 0, 0);

    // make shape ( N.B. edge view not visible )

    const text = new Mesh(geometry, matLite);
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

    const lineText = new Object3D();

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];

      const points = shape.getPoints();
      const geometry = new BufferGeometry().setFromPoints(points);

      geometry.translate(xMid, 0, 0);

      const lineMesh = new Line(geometry, matDark);
      lineText.add(lineMesh);
    }

    scene.add(lineText);
  }); //end load function

  renderer = new WebGLRenderer({ antialias: true });
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
