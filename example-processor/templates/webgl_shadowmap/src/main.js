import "./style.css"; // For webpack support

import {
  Clock,
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
  PCFShadowMap,
  PlaneGeometry,
  MeshPhongMaterial,
  Mesh,
  JS,
  BoxGeometry,
  AnimationMixer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { ShadowMapViewer } from "three/addons/utils/ShadowMapViewer.js";

const SHADOW_MAP_WIDTH = 2048,
  SHADOW_MAP_HEIGHT = 1024;

let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;
const FLOOR = -250;

let camera, controls, scene, renderer;
let container, stats;

const NEAR = 10,
  FAR = 3000;

let mixer;

const morphs = [];

let light;
let lightShadowMapViewer;

const clock = new Clock();

let showHUD = false;

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  // CAMERA

  camera = new PerspectiveCamera(23, SCREEN_WIDTH / SCREEN_HEIGHT, NEAR, FAR);
  camera.position.set(700, 50, 1900);

  // SCENE

  scene = new Scene();
  scene.background = new Color(0x59472b);
  scene.fog = new Fog(0x59472b, 1000, FAR);

  // LIGHTS

  const ambient = new AmbientLight(0xffffff);
  scene.add(ambient);

  light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 1500, 1000);
  light.castShadow = true;
  light.shadow.camera.top = 2000;
  light.shadow.camera.bottom = -2000;
  light.shadow.camera.left = -2000;
  light.shadow.camera.right = 2000;
  light.shadow.camera.near = 1200;
  light.shadow.camera.far = 2500;
  light.shadow.bias = 0.0001;

  light.shadow.mapSize.width = SHADOW_MAP_WIDTH;
  light.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

  scene.add(light);

  createHUD();
  createScene();

  // RENDERER

  renderer = new WebGLRenderer({ antialias: true, reversedDepthBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  renderer.autoClear = false;

  //

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  // CONTROLS

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minDistance = 200;
  controls.maxDistance = 2200;

  controls.target.set(0, -75, 25);
  controls.update();

  // STATS

  stats = new Stats();
  //container.appendChild( stats.dom );

  //

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", onKeyDown);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  switch (event.keyCode) {
    case 84 /*t*/:
      showHUD = !showHUD;
      break;
  }
}

function createHUD() {
  lightShadowMapViewer = new ShadowMapViewer(light);
  lightShadowMapViewer.position.x = 10;
  lightShadowMapViewer.position.y = SCREEN_HEIGHT - SHADOW_MAP_HEIGHT / 4 - 10;
  lightShadowMapViewer.size.width = SHADOW_MAP_WIDTH / 4;
  lightShadowMapViewer.size.height = SHADOW_MAP_HEIGHT / 4;
  lightShadowMapViewer.update();
}

function createScene() {
  // GROUND

  const geometry = new PlaneGeometry(100, 100);
  const planeMaterial = new MeshPhongMaterial({ color: 0xffdd99 });

  const ground = new Mesh(geometry, planeMaterial);

  ground.position.set(0, FLOOR, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.scale.set(100, 100, 100);

  ground.castShadow = false;
  ground.receiveShadow = true;

  scene.add(ground);

  // TEXT

  const loader = new FontLoader();
  loader.load("fonts/helvetiker_bold.typeface.json", function (font) {
    const textGeo = new TextGeometry("JS", {
      font: font,

      size: 200,
      depth: 50,
      curveSegments: 12,

      bevelThickness: 2,
      bevelSize: 5,
      bevelEnabled: true,
    });

    textGeo.computeBoundingBox();
    const centerOffset =
      -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);

    const textMaterial = new MeshPhongMaterial({
      color: 0xff0000,
      specular: 0xffffff,
    });

    const mesh = new Mesh(textGeo, textMaterial);
    mesh.position.x = centerOffset;
    mesh.position.y = FLOOR + 67;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
  });

  // CUBES

  const cubes1 = new Mesh(new BoxGeometry(1500, 220, 150), planeMaterial);

  cubes1.position.y = FLOOR - 50;
  cubes1.position.z = 20;

  cubes1.castShadow = true;
  cubes1.receiveShadow = true;

  scene.add(cubes1);

  const cubes2 = new Mesh(new BoxGeometry(1600, 170, 250), planeMaterial);

  cubes2.position.y = FLOOR - 50;
  cubes2.position.z = 20;

  cubes2.castShadow = true;
  cubes2.receiveShadow = true;

  scene.add(cubes2);

  // MORPHS

  mixer = new AnimationMixer(scene);

  function addMorph(mesh, clip, speed, duration, x, y, z, fudgeColor) {
    mesh = mesh.clone();
    mesh.material = mesh.material.clone();

    if (fudgeColor) {
      mesh.material.color.offsetHSL(
        0,
        Math.random() * 0.5 - 0.25,
        Math.random() * 0.5 - 0.25
      );
    }

    mesh.speed = speed;

    mixer
      .clipAction(clip, mesh)
      .setDuration(duration)
      // to shift the playback out of phase:
      .startAt(-duration * Math.random())
      .play();

    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.PI / 2;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);

    morphs.push(mesh);
  }

  const gltfloader = new GLTFLoader();

  gltfloader.load("models/gltf/Horse.glb", function (gltf) {
    const mesh = gltf.scene.children[0];

    const clip = gltf.animations[0];

    addMorph(mesh, clip, 550, 1, 100 - Math.random() * 1000, FLOOR, 300, true);
    addMorph(mesh, clip, 550, 1, 100 - Math.random() * 1000, FLOOR, 450, true);
    addMorph(mesh, clip, 550, 1, 100 - Math.random() * 1000, FLOOR, 600, true);

    addMorph(mesh, clip, 550, 1, 100 - Math.random() * 1000, FLOOR, -300, true);
    addMorph(mesh, clip, 550, 1, 100 - Math.random() * 1000, FLOOR, -450, true);
    addMorph(mesh, clip, 550, 1, 100 - Math.random() * 1000, FLOOR, -600, true);
  });

  gltfloader.load("models/gltf/Flamingo.glb", function (gltf) {
    const mesh = gltf.scene.children[0];
    const clip = gltf.animations[0];

    addMorph(mesh, clip, 500, 1, 500 - Math.random() * 500, FLOOR + 350, 40);
  });

  gltfloader.load("models/gltf/Stork.glb", function (gltf) {
    const mesh = gltf.scene.children[0];
    const clip = gltf.animations[0];

    addMorph(mesh, clip, 350, 1, 500 - Math.random() * 500, FLOOR + 350, 340);
  });

  gltfloader.load("models/gltf/Parrot.glb", function (gltf) {
    const mesh = gltf.scene.children[0];
    const clip = gltf.animations[0];

    addMorph(mesh, clip, 450, 0.5, 500 - Math.random() * 500, FLOOR + 300, 700);
  });
}

function animate() {
  render();
  stats.update();
}

function render() {
  const delta = clock.getDelta();

  mixer.update(delta);

  for (let i = 0; i < morphs.length; i++) {
    const morph = morphs[i];

    morph.position.x += morph.speed * delta;

    if (morph.position.x > 2000) {
      morph.position.x = -1000 - Math.random() * 500;
    }
  }

  controls.update(delta);

  renderer.clear();
  renderer.render(scene, camera);

  // Render debug HUD with shadow map

  if (showHUD) {
    lightShadowMapViewer.render(renderer);
  }
}
