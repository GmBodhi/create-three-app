import "./style.css"; // For webpack support

import {
  Vector3,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  HemisphereLight,
  DoubleSide,
} from "three";
import { TubePainter } from "three/addons/misc/TubePainter.js";
import { ARButton } from "three/addons/webxr/ARButton.js";

let container;
let camera, scene, renderer;
let controller, painter;

const cursor = new Vector3();

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  //

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  //

  document.body.appendChild(ARButton.createButton(renderer));

  // model

  const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0, 1, 0);
  scene.add(light);

  //

  painter = new TubePainter();
  painter.setSize(0.4);
  painter.mesh.material.side = DoubleSide;
  scene.add(painter.mesh);

  //

  function onSelectStart() {
    this.userData.isSelecting = true;
    this.userData.skipFrames = 2;
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;
  }

  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onSelectStart);
  controller.addEventListener("selectend", onSelectEnd);
  controller.userData.skipFrames = 0;
  scene.add(controller);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function handleController(controller) {
  const userData = controller.userData;

  cursor.set(0, 0, -0.2).applyMatrix4(controller.matrixWorld);

  if (userData.isSelecting === true) {
    if (userData.skipFrames >= 0) {
      // TODO(mrdoob) Revisit this

      userData.skipFrames--;

      painter.moveTo(cursor);
    } else {
      painter.lineTo(cursor);
      painter.update();
    }
  }
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  handleController(controller);

  renderer.render(scene, camera);
}
