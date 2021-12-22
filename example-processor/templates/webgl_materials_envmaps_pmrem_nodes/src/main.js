import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  WebGLRenderer,
  TorusKnotGeometry,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  LinearFilter,
  PMREMGenerator,
  ACESFilmicToneMapping,
  sRGBEncoding,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRCubeTextureLoader } from "three/examples/jsm/loaders/HDRCubeTextureLoader.js";

import {
  StandardNodeMaterial,
  FloatNode,
  OperatorNode,
  TextureNode,
  TextureCubeNode,
} from "three/examples/jsm/nodes/Nodes.js";

const params = {
  roughness: 0.0,
  metalness: 0.0,
  exposure: 1.0,
  intensity: 1.0,
  animate: true,
  debug: false,
};

let container, stats;
let camera, scene, renderer, controls;
let nodeMaterial, nodeTexture, nodeTextureIntensity, torusMesh, planeMesh;
let hdrCubeRenderTarget;
let hdrCubeMap;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 120);

  scene = new Scene();
  scene.background = new Color(0x000000);

  renderer = new WebGLRenderer();

  //

  const geometry = new TorusKnotGeometry(18, 8, 150, 20);

  nodeMaterial = new StandardNodeMaterial();
  nodeMaterial.color.value = new Color(0xffffff);
  nodeMaterial.roughness.value = params.metalness;
  nodeMaterial.metalness.value = params.roguhness;
  nodeMaterial.visible = false;

  nodeTexture = new TextureNode();
  nodeTextureIntensity = new FloatNode(1);

  nodeMaterial.environment = new OperatorNode(
    new TextureCubeNode(nodeTexture),
    nodeTextureIntensity,
    OperatorNode.MUL
  );

  torusMesh = new Mesh(geometry, nodeMaterial);
  scene.add(torusMesh);

  planeMesh = new Mesh(new PlaneGeometry(200, 200), new MeshBasicMaterial());
  planeMesh.position.y = -50;
  planeMesh.rotation.x = -Math.PI * 0.5;
  scene.add(planeMesh);

  const hdrUrls = ["px.hdr", "nx.hdr", "py.hdr", "ny.hdr", "pz.hdr", "nz.hdr"];
  hdrCubeMap = new HDRCubeTextureLoader()
    .setPath("three/examples/textures/cube/pisaHDR/")
    .load(hdrUrls, function () {
      hdrCubeRenderTarget = pmremGenerator.fromCubemap(hdrCubeMap);
      pmremGenerator.dispose();

      nodeTexture.value = hdrCubeRenderTarget.texture;

      hdrCubeMap.magFilter = LinearFilter;
      hdrCubeMap.needsUpdate = true;

      planeMesh.material.map = hdrCubeRenderTarget.texture;
      planeMesh.material.needsUpdate = true;

      nodeMaterial.visible = true;
    });

  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputEncoding = sRGBEncoding;

  stats = new Stats();
  container.appendChild(stats.dom);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 50;
  controls.maxDistance = 300;

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  gui.add(params, "roughness", 0, 1, 0.01);
  gui.add(params, "metalness", 0, 1, 0.01);
  gui.add(params, "exposure", 0, 2, 0.01);
  gui.add(params, "intensity", 0, 2, 0.01);
  gui.add(params, "animate", true);
  gui.add(params, "debug", false);
  gui.open();
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  stats.begin();
  render();
  stats.end();
}

function render() {
  torusMesh.material.roughness.value = params.roughness;
  torusMesh.material.metalness.value = params.metalness;

  nodeTextureIntensity.value = params.intensity;

  if (params.animate) {
    torusMesh.rotation.y += 0.005;
  }

  planeMesh.visible = params.debug;

  scene.background = hdrCubeMap;
  renderer.toneMappingExposure = params.exposure;

  renderer.render(scene, camera);
}
