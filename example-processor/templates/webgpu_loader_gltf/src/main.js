import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  LinearMipmapLinearFilter,
  PointLight,
  WebGLRenderer,
  LinearToneMapping,
  SRGBColorSpace,
} from "three";
import { cubeTexture, texture, normalMap, toneMapping } from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { RGBMLoader } from "three/addons/loaders/RGBMLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let camera, scene, renderer;

init();
render();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(-1.8, 0.6, 2.7);

  scene = new Scene();

  const rgbmUrls = ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"];

  const cubeMap = new RGBMLoader()
    .setMaxRange(16)
    .setPath("three/examples/textures/cube/pisaRGBM16/")
    .loadCubemap(rgbmUrls);

  cubeMap.generateMipmaps = true;
  cubeMap.minFilter = LinearMipmapLinearFilter;

  scene.environmentNode = cubeTexture(cubeMap);
  scene.backgroundNode = scene.environmentNode;

  const loader = new GLTFLoader().setPath("models/gltf/DamagedHelmet/glTF/");
  loader.load("DamagedHelmet.gltf", function (gltf) {
    //const light = new PointLight( 0xffffff );
    //camera.add( light );

    const mesh = gltf.scene.children[0];
    const material = mesh.material;

    const oldNormalMap = material.normalMap;
    material.normalNode = normalMap(texture(oldNormalMap));
    material.normalMap = null; // ignore non-node normalMap material

    // optional: use tangent to compute normalMap
    mesh.geometry.computeTangents();

    scene.add(gltf.scene);

    render();
  });

  renderer = new WebGPURenderer();

  /*// WebGLRenderer comparation test
				renderer = new WebGLRenderer( { antialias: false } );
				renderer.toneMapping = LinearToneMapping;
				renderer.toneMappingExposure = 1;
				scene.environment = cubeTexture;
				document.getElementById( 'info' ).innerText = 'WebGL';
				/**/

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.toneMappingNode = toneMapping(LinearToneMapping, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function render() {
  renderer.render(scene, camera);
}
