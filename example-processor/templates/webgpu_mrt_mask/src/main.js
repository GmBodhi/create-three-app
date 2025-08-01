import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { color, screenUV, mrt, output, pass, vec4 } from "three/tsl";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer;
let postProcessing;
let spheres,
  rotate = true;
let mixer, clock;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.set(1, 2, 3);

  scene = new Scene();
  scene.backgroundNode = screenUV.y
    .mix(color(0x66bbff), color(0x4466ff))
    .mul(0.05);
  camera.lookAt(0, 1, 0);

  clock = new Clock();

  // lights

  const light = new SpotLight(0xffffff, 1);
  light.power = 2000;
  camera.add(light);
  scene.add(camera);

  const loader = new GLTFLoader();
  loader.load("models/gltf/Michelle.glb", function (gltf) {
    const object = gltf.scene;
    mixer = new AnimationMixer(object);

    const material = object.children[0].children[0].material;

    // add glow effect
    material.mrtNode = mrt({ mask: output.add(1) });

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    scene.add(object);
  });

  // spheres

  const geometry = new SphereGeometry(0.3, 32, 16);

  spheres = new Group();
  scene.add(spheres);

  function addSphere(color, mrtNode = null) {
    const distance = 1;
    const id = spheres.children.length;
    const rotation = MathUtils.degToRad(id * 90);

    const material = new MeshStandardNodeMaterial({ color });
    material.mrtNode = mrtNode;

    const mesh = new Mesh(geometry, material);
    mesh.position.set(
      Math.cos(rotation) * distance,
      1,
      Math.sin(rotation) * distance
    );

    spheres.add(mesh);
  }

  addSphere(0x0000ff, mrt({ mask: output }));
  addSphere(0x00ff00);
  addSphere(0xff0000);
  addSphere(0x00ffff);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.4;
  document.body.appendChild(renderer.domElement);

  // post processing

  const scenePass = pass(scene, camera);
  scenePass.setMRT(
    mrt({
      output: output.renderOutput(),
      mask: vec4(0), // empty as default, custom materials can set this
    })
  );

  const colorPass = scenePass.getTextureNode();
  const maskPass = scenePass.getTextureNode("mask");

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputColorTransform = false;
  postProcessing.outputNode = colorPass
    .add(gaussianBlur(maskPass, 1, 20).mul(0.3))
    .renderOutput();

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.addEventListener("start", () => (rotate = false));
  controls.addEventListener("end", () => (rotate = true));
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  if (rotate) spheres.rotation.y += delta * 0.5;

  postProcessing.render();
}
