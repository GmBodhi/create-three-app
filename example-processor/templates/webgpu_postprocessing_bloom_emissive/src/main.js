import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { pass, mrt, output, emissive } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;
let postProcessing;

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  //

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(-1.8, 0.6, 2.7);

  scene = new Scene();

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("moonless_golf_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;

      // model

      const loader = new GLTFLoader().setPath(
        "models/gltf/DamagedHelmet/glTF/"
      );
      loader.load("DamagedHelmet.gltf", function (gltf) {
        scene.add(gltf.scene);
      });
    });

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.toneMapping = ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  //

  const scenePass = pass(scene, camera);
  scenePass.setMRT(
    mrt({
      output,
      emissive,
    })
  );

  const outputPass = scenePass.getTextureNode();
  const emissivePass = scenePass.getTextureNode("emissive");

  const bloomPass = bloom(emissivePass, 2.5, 0.5);

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputNode = outputPass.add(bloomPass);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);

  window.addEventListener("resize", onWindowResize);

  //

  const gui = new GUI();

  const bloomFolder = gui.addFolder("bloom");
  bloomFolder.add(bloomPass.strength, "value", 0.0, 5.0).name("strength");
  bloomFolder.add(bloomPass.radius, "value", 0.0, 1.0).name("radius");

  const toneMappingFolder = gui.addFolder("tone mapping");
  toneMappingFolder
    .add(renderer, "toneMappingExposure", 0.1, 2)
    .name("exposure");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function render() {
  postProcessing.render();
}
