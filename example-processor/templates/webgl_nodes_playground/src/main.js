import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  PointLight,
  WebGLRenderer,
  sRGBEncoding,
  LinearToneMapping,
  Mesh,
  SphereGeometry,
  BoxGeometry,
  Points,
  TorusKnotGeometry,
} from "three";
import * as Nodes from "three/nodes";

import { nodeFrame } from "three/addons/renderers/webgl/nodes/WebGLNodes.js";

import { NodeEditor } from "three/addons/node-editor/NodeEditor.js";
import { MeshEditor } from "three/addons/node-editor/scene/MeshEditor.js";
import { StandardMaterialEditor } from "three/addons/node-editor/materials/StandardMaterialEditor.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

let camera, scene, renderer;
let model;
let nodeEditor;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(0.0, 300, 400 * 3);

  scene = new Scene();
  scene.background = new Color(0x333333);

  // Lights

  const topLight = new PointLight(0xf4f6f0, 1);
  topLight.position.set(0, 1000, 1000);
  scene.add(topLight);

  const backLight = new PointLight(0x0c1445, 1);
  backLight.position.set(-100, 20, -260);
  scene.add(backLight);

  renderer = new WebGLRenderer({ antialias: true });
  document.body.appendChild(renderer.domElement);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = LinearToneMapping;
  renderer.toneMappingExposure = 4000;
  renderer.physicallyCorrectLights = true;

  renderer.domElement.className = "renderer";

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 3000;

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
    const defaultMaterial = new Nodes.MeshBasicNodeMaterial();
    defaultMaterial.colorNode = new Nodes.UniformNode(0);

    const sphere = new Mesh(new SphereGeometry(200, 32, 16), defaultMaterial);
    sphere.name = "Sphere";
    sphere.position.set(500, 0, -500);
    scene.add(sphere);

    const box = new Mesh(new BoxGeometry(200, 200, 200), defaultMaterial);
    box.name = "Box";
    box.position.set(-500, 0, -500);
    scene.add(box);

    const defaultPointsMaterial = new Nodes.PointsNodeMaterial();
    defaultPointsMaterial.colorNode = new Nodes.UniformNode(0);

    const torusKnot = new Points(
      new TorusKnotGeometry(100, 30, 100, 16),
      defaultPointsMaterial
    );
    torusKnot.name = "Torus Knot ( Points )";
    torusKnot.position.set(0, 0, -500);
    scene.add(torusKnot);

    model = object.children[0];
    model.position.set(0, 0, 10);
    model.scale.setScalar(1);
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

function animate() {
  requestAnimationFrame(animate);

  nodeFrame.update();

  render();
}

function render() {
  //if ( model ) model.rotation.y = performance.now() / 5000;

  renderer.render(scene, camera);
}
