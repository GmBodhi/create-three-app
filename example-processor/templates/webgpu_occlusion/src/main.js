import "./style.css"; // For webpack support

import {
  Node,
  NodeUpdateType,
  Color,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  DirectionalLight,
  PlaneGeometry,
  SphereGeometry,
  Mesh,
  MeshPhongNodeMaterial,
  DoubleSide,
  WebGPURenderer,
} from "three";
import { nodeObject, uniform } from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, controls;

class OcclusionNode extends Node {
  constructor(testObject, normalColor, occludedColor) {
    super("vec3");

    this.updateType = NodeUpdateType.OBJECT;

    this.uniformNode = uniform(new Color());

    this.testObject = testObject;
    this.normalColor = normalColor;
    this.occludedColor = occludedColor;
  }

  async update(frame) {
    const isOccluded = frame.renderer.isOccluded(this.testObject);

    this.uniformNode.value.copy(
      isOccluded ? this.occludedColor : this.normalColor
    );
  }

  setup(/* builder */) {
    return this.uniformNode;
  }
}

init();

async function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.z = 7;

  scene = new Scene();

  // lights

  const ambientLight = new AmbientLight(0xb0b0b0);

  const light = new DirectionalLight(0xffffff, 1.0);
  light.position.set(0.32, 0.39, 0.7);

  scene.add(ambientLight);
  scene.add(light);

  // models

  const planeGeometry = new PlaneGeometry(2, 2);
  const sphereGeometry = new SphereGeometry(0.5);

  const plane = new Mesh(
    planeGeometry,
    new MeshPhongNodeMaterial({ color: 0x00ff00, side: DoubleSide })
  );
  const sphere = new Mesh(
    sphereGeometry,
    new MeshPhongNodeMaterial({ color: 0xffff00 })
  );

  const instanceUniform = nodeObject(
    new OcclusionNode(sphere, new Color(0x0000ff), new Color(0x00ff00))
  );

  plane.material.colorNode = instanceUniform;

  sphere.position.z = -1;
  sphere.occlusionTest = true;

  scene.add(plane);
  scene.add(sphere);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 3;
  controls.maxDistance = 25;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderer.render(scene, camera);
}
