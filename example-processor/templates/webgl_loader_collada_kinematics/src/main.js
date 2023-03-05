import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  GridHelper,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  HemisphereLight,
  PointLight,
  WebGLRenderer,
  sRGBEncoding,
  MathUtils,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import TWEEN from "three/addons/libs/tween.module.js";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";

let container, stats;

let camera, scene, renderer;
let particleLight;
let dae;

let kinematics;
let kinematicsTween;
const tweenParameters = {};

const loader = new ColladaLoader();
loader.load(
  "three/examples/models/collada/abb_irb52_7_120.dae",
  function (collada) {
    dae = collada.scene;

    dae.traverse(function (child) {
      if (child.isMesh) {
        // model does not have normals
        child.material.flatShading = true;
      }
    });

    dae.scale.x = dae.scale.y = dae.scale.z = 10.0;
    dae.updateMatrix();

    kinematics = collada.kinematics;

    init();
    animate();
  }
);

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.set(2, 2, 3);

  scene = new Scene();

  // Grid

  const grid = new GridHelper(20, 20, 0x888888, 0x444444);
  scene.add(grid);

  // Add the COLLADA

  scene.add(dae);

  particleLight = new Mesh(
    new SphereGeometry(4, 8, 8),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(particleLight);

  // Lights

  const light = new HemisphereLight(0xffeeee, 0x111122);
  scene.add(light);

  const pointLight = new PointLight(0xffffff, 0.3);
  particleLight.add(pointLight);

  renderer = new WebGLRenderer();
  renderer.outputEncoding = sRGBEncoding;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  setupTween();

  //

  window.addEventListener("resize", onWindowResize);
}

function setupTween() {
  const duration = MathUtils.randInt(1000, 5000);

  const target = {};

  for (const prop in kinematics.joints) {
    if (kinematics.joints.hasOwnProperty(prop)) {
      if (!kinematics.joints[prop].static) {
        const joint = kinematics.joints[prop];

        const old = tweenParameters[prop];

        const position = old ? old : joint.zeroPosition;

        tweenParameters[prop] = position;

        target[prop] = MathUtils.randInt(joint.limits.min, joint.limits.max);
      }
    }
  }

  kinematicsTween = new TWEEN.Tween(tweenParameters)
    .to(target, duration)
    .easing(TWEEN.Easing.Quadratic.Out);

  kinematicsTween.onUpdate(function (object) {
    for (const prop in kinematics.joints) {
      if (kinematics.joints.hasOwnProperty(prop)) {
        if (!kinematics.joints[prop].static) {
          kinematics.setJointValue(prop, object[prop]);
        }
      }
    }
  });

  kinematicsTween.start();

  setTimeout(setupTween, duration);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
  TWEEN.update();
}

function render() {
  const timer = Date.now() * 0.0001;

  camera.position.x = Math.cos(timer) * 20;
  camera.position.y = 10;
  camera.position.z = Math.sin(timer) * 20;

  camera.lookAt(0, 5, 0);

  particleLight.position.x = Math.sin(timer * 4) * 3009;
  particleLight.position.y = Math.cos(timer * 5) * 4000;
  particleLight.position.z = Math.cos(timer * 4) * 3009;

  renderer.render(scene, camera);
}
