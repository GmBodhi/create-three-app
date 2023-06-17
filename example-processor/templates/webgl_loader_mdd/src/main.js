import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  Clock,
  BoxGeometry,
  MeshNormalMaterial,
  Mesh,
  AnimationMixer,
  WebGLRenderer,
} from "three";

import { MDDLoader } from "three/addons/loaders/MDDLoader.js";

let camera, scene, renderer, mixer, clock;

init();

function init() {
  scene = new Scene();

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(8, 8, 8);
  camera.lookAt(scene.position);

  clock = new Clock();

  //

  const loader = new MDDLoader();
  loader.load("models/mdd/cube.mdd", function (result) {
    const morphTargets = result.morphTargets;
    const clip = result.clip;
    // clip.optimize(); // optional

    const geometry = new BoxGeometry();
    geometry.morphAttributes.position = morphTargets; // apply morph targets

    const material = new MeshNormalMaterial();

    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    mixer = new AnimationMixer(mesh);
    mixer.clipAction(clip).play(); // use clip

    animate();
  });

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
