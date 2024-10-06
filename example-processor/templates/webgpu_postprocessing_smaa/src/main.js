import "./style.css"; // For webpack support

import {
  WebGPURenderer,
  PerspectiveCamera,
  Scene,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  TextureLoader,
  SRGBColorSpace,
  PostProcessing,
} from "three";
import { pass } from "three/tsl";
import { smaa } from "three/addons/tsl/display/SMAANode.js";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, postProcessing, stats;

const params = {
  enabled: true,
  autoRotate: true,
};

init();

function init() {
  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 300;

  scene = new Scene();

  const geometry = new BoxGeometry(120, 120, 120);
  const material1 = new MeshBasicMaterial({ color: 0xffffff, wireframe: true });

  const mesh1 = new Mesh(geometry, material1);
  mesh1.position.x = -100;
  scene.add(mesh1);

  const texture = new TextureLoader().load("textures/brick_diffuse.jpg");
  texture.colorSpace = SRGBColorSpace;

  const material2 = new MeshBasicMaterial({ map: texture });

  const mesh2 = new Mesh(geometry, material2);
  mesh2.position.x = 100;
  scene.add(mesh2);

  // post processing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  const smaaPass = smaa(scenePass);

  postProcessing.outputNode = smaaPass;

  //

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  const smaaFolder = gui.addFolder("SMAA");
  smaaFolder.add(params, "enabled").onChange((value) => {
    if (value === true) {
      postProcessing.outputNode = smaaPass;
    } else {
      postProcessing.outputNode = scenePass;
    }

    postProcessing.needsUpdate = true;
  });

  const sceneFolder = gui.addFolder("Scene");
  sceneFolder.add(params, "autoRotate");
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  stats.begin();

  if (params.autoRotate === true) {
    for (let i = 0; i < scene.children.length; i++) {
      const child = scene.children[i];

      child.rotation.x += 0.005;
      child.rotation.y += 0.01;
    }
  }

  postProcessing.render();

  stats.end();
}
