import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { pass, renderOutput } from "three/tsl";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const params = {
  enabled: true,
  animated: false,
};

let camera, scene, renderer, clock, group;
let postProcessing;

init();

async function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.z = 50;

  scene = new Scene();
  scene.background = new Color(0xffffff);

  clock = new Clock();

  //

  const hemiLight = new HemisphereLight(0xffffff, 0x8d8d8d);
  hemiLight.position.set(0, 1000, 0);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.position.set(-3000, 1000, -1000);
  scene.add(dirLight);

  //

  group = new Group();

  const geometry = new TetrahedronGeometry();
  const material = new MeshStandardMaterial({
    color: 0xf73232,
    flatShading: true,
  });

  for (let i = 0; i < 100; i++) {
    const mesh = new Mesh(geometry, material);

    mesh.position.x = Math.random() * 50 - 25;
    mesh.position.y = Math.random() * 50 - 25;
    mesh.position.z = Math.random() * 50 - 25;

    mesh.scale.setScalar(Math.random() * 2 + 1);

    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.rotation.z = Math.random() * Math.PI;

    group.add(mesh);
  }

  scene.add(group);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // post processing

  postProcessing = new PostProcessing(renderer);

  // ignore default output color transform ( toneMapping and outputColorSpace )
  // use renderOutput() for control the sequence

  postProcessing.outputColorTransform = false;

  // scene pass

  const scenePass = pass(scene, camera);
  const outputPass = renderOutput(scenePass);

  // FXAA must be computed in sRGB color space (so after tone mapping and color space conversion)

  const fxaaPass = fxaa(outputPass);
  postProcessing.outputNode = fxaaPass;

  //

  window.addEventListener("resize", onWindowResize);

  //

  const gui = new GUI();
  gui.title("FXAA settings");
  gui.add(params, "enabled").onChange((value) => {
    if (value === true) {
      postProcessing.outputNode = fxaaPass;
    } else {
      postProcessing.outputNode = outputPass;
    }

    postProcessing.needsUpdate = true;
  });
  gui.add(params, "animated");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  const delta = clock.getDelta();

  if (params.animated === true) {
    group.rotation.y += delta * 0.1;
  }

  postProcessing.render();
}
