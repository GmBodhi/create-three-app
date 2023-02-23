import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  PointLight,
  sRGBEncoding,
  LinearToneMapping,
  Mesh,
  SphereGeometry,
  BoxGeometry,
  Points,
  TorusKnotGeometry,
} from "three";
import {
  toneMapping,
  uniform,
  MeshBasicNodeMaterial,
  PointsNodeMaterial,
} from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { NodeEditor } from "three/addons/node-editor/NodeEditor.js";
import { MeshEditor } from "three/addons/node-editor/scene/MeshEditor.js";
import { StandardMaterialEditor } from "three/addons/node-editor/materials/StandardMaterialEditor.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

// Use PreviewEditor in WebGL for now
import { nodeFrame } from "three/addons/renderers/webgl/nodes/WebGLNodes.js";

let camera, scene, renderer;
let model;
let nodeEditor;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.set(0.0, 3, 4 * 3);

  scene = new Scene();
  scene.background = new Color(0x333333);

  // Lights

  const topLight = new PointLight(0xf4f6f0, 1, 100);
  topLight.power = 4500;
  topLight.position.set(0, 10, 10);
  scene.add(topLight);

  const backLight = new PointLight(0x0c1445, 1, 100);
  backLight.power = 1000;
  backLight.position.set(-1, 0.2, -2.6);
  scene.add(backLight);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMappingNode = toneMapping(LinearToneMapping, 1);
  document.body.appendChild(renderer.domElement);

  renderer.domElement.className = "renderer";

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 30;

  window.addEventListener("resize", onWindowResize);

  initEditor();

  onWindowResize();
}

function initEditor() {
  nodeEditor = new NodeEditor(scene);

  const reset = () => {
    const meshEditor = new MeshEditor(model);
    const materialEditor = new StandardMaterialEditor();

    nodeEditor.add(meshEditor);
    nodeEditor.add(materialEditor);
    nodeEditor.centralizeNode(meshEditor);

    const { x, y } = meshEditor.getPosition();

    meshEditor.setPosition(x + 250, y);
    materialEditor.setPosition(x - 250, y);

    meshEditor.material.connect(materialEditor);
  };

  nodeEditor.addEventListener("new", reset);

  document.body.appendChild(nodeEditor.domElement);

  const loaderFBX = new FBXLoader();
  loaderFBX.load("models/fbx/stanford-bunny.fbx", (object) => {
    const defaultMaterial = new MeshBasicNodeMaterial();
    defaultMaterial.colorNode = uniform(0);

    const sphere = new Mesh(new SphereGeometry(2, 32, 16), defaultMaterial);
    sphere.name = "Sphere";
    sphere.position.set(5, 0, -5);
    scene.add(sphere);

    const box = new Mesh(new BoxGeometry(2, 2, 2), defaultMaterial);
    box.name = "Box";
    box.position.set(-5, 0, -5);
    scene.add(box);

    const defaultPointsMaterial = new PointsNodeMaterial();
    defaultPointsMaterial.colorNode = uniform(0);

    const torusKnot = new Points(
      new TorusKnotGeometry(1, 0.3, 100, 16),
      defaultPointsMaterial
    );
    torusKnot.name = "Torus Knot ( Points )";
    torusKnot.position.set(0, 0, -5);
    scene.add(torusKnot);

    model = object.children[0];
    model.position.set(0, 0, 0.1);
    model.scale.setScalar(0.01);
    model.material = defaultMaterial;
    scene.add(model);

    reset();
  });
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  nodeEditor.setSize(width, height);
}

//

function render() {
  //if ( model ) model.rotation.y = performance.now() / 5000;

  nodeFrame.update();

  renderer.render(scene, camera);
}
