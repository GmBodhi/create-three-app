import "./style.css"; // For webpack support

import {
  Clock,
  BoxGeometry,
  Vector3,
  IcosahedronGeometry,
  WebGLRenderer,
  TextureLoader,
  PerspectiveCamera,
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  MeshPhongMaterial,
  InstancedMesh,
  Object3D,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import TWEEN from "three/addons/libs/tween.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderTransitionPass } from "three/addons/postprocessing/RenderTransitionPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let stats;
let renderer, composer, renderTransitionPass;

const textures = [];
const clock = new Clock();

const params = {
  sceneAnimate: true,
  transitionAnimate: true,
  transition: 0,
  useTexture: true,
  texture: 5,
  cycle: true,
  threshold: 0.1,
};

const fxSceneA = new FXScene(
  new BoxGeometry(2, 2, 2),
  new Vector3(0, -0.4, 0),
  0xffffff
);
const fxSceneB = new FXScene(
  new IcosahedronGeometry(1, 1),
  new Vector3(0, 0.2, 0.1),
  0x000000
);

init();

function init() {
  initGUI();
  initTextures();

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  renderTransitionPass = new RenderTransitionPass(
    fxSceneA.scene,
    fxSceneA.camera,
    fxSceneB.scene,
    fxSceneB.camera
  );
  renderTransitionPass.setTexture(textures[0]);
  composer.addPass(renderTransitionPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  renderer.setAnimationLoop(animate);
}

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  fxSceneA.resize();
  fxSceneB.resize();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

new TWEEN.Tween(params)
  .to({ transition: 1 }, 1500)
  .onUpdate(function () {
    renderTransitionPass.setTransition(params.transition);

    // Change the current alpha texture after each transition
    if (params.cycle) {
      if (params.transition == 0 || params.transition == 1) {
        params.texture = (params.texture + 1) % textures.length;
        renderTransitionPass.setTexture(textures[params.texture]);
      }
    }
  })
  .repeat(Infinity)
  .delay(2000)
  .yoyo(true)
  .start();

function animate() {
  const delta = clock.getDelta();
  fxSceneA.render(delta);
  fxSceneB.render(delta);

  render();
  stats.update();

  // Transition animation
  if (params.transitionAnimate) TWEEN.update();
}

function initTextures() {
  const loader = new TextureLoader();

  for (let i = 0; i < 6; i++) {
    textures[i] = loader.load(
      "textures/transition/transition" + (i + 1) + ".png"
    );
  }
}

function initGUI() {
  const gui = new GUI();

  gui.add(params, "sceneAnimate").name("Animate scene");
  gui.add(params, "transitionAnimate").name("Animate transition");
  gui
    .add(params, "transition", 0, 1, 0.01)
    .onChange(function (value) {
      renderTransitionPass.setTransition(value);
    })
    .listen();

  gui.add(params, "useTexture").onChange(function (value) {
    renderTransitionPass.useTexture(value);
  });

  gui
    .add(params, "texture", {
      Perlin: 0,
      Squares: 1,
      Cells: 2,
      Distort: 3,
      Gradient: 4,
      Radial: 5,
    })
    .onChange(function (value) {
      renderTransitionPass.setTexture(textures[value]);
    })
    .listen();

  gui.add(params, "cycle");

  gui.add(params, "threshold", 0, 1, 0.01).onChange(function (value) {
    renderTransitionPass.setTextureThreshold(value);
  });
}

function render() {
  // Prevent render both scenes when it's not necessary
  if (params.transition === 0) {
    renderer.render(fxSceneB.scene, fxSceneB.camera);
  } else if (params.transition === 1) {
    renderer.render(fxSceneA.scene, fxSceneA.camera);
  } else {
    // When 0 < transition < 1 render transition between two scenes
    composer.render();
  }
}

function FXScene(geometry, rotationSpeed, backgroundColor) {
  const camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 20;

  // Setup scene
  const scene = new Scene();
  scene.background = new Color(backgroundColor);
  scene.add(new AmbientLight(0xaaaaaa, 3));

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 1, 4);
  scene.add(light);

  this.rotationSpeed = rotationSpeed;

  const color = geometry.type === "BoxGeometry" ? 0x0000ff : 0xff0000;
  const material = new MeshPhongMaterial({ color: color, flatShading: true });
  const mesh = generateInstancedMesh(geometry, material, 500);
  scene.add(mesh);

  this.scene = scene;
  this.camera = camera;
  this.mesh = mesh;

  this.render = function (delta) {
    if (params.sceneAnimate) {
      mesh.rotation.x += this.rotationSpeed.x * delta;
      mesh.rotation.y += this.rotationSpeed.y * delta;
      mesh.rotation.z += this.rotationSpeed.z * delta;
    }
  };

  this.resize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
}

function generateInstancedMesh(geometry, material, count) {
  const mesh = new InstancedMesh(geometry, material, count);

  const dummy = new Object3D();
  const color = new Color();

  for (let i = 0; i < count; i++) {
    dummy.position.x = Math.random() * 100 - 50;
    dummy.position.y = Math.random() * 60 - 30;
    dummy.position.z = Math.random() * 80 - 40;

    dummy.rotation.x = Math.random() * 2 * Math.PI;
    dummy.rotation.y = Math.random() * 2 * Math.PI;
    dummy.rotation.z = Math.random() * 2 * Math.PI;

    dummy.scale.x = Math.random() * 2 + 1;

    if (geometry.type === "BoxGeometry") {
      dummy.scale.y = Math.random() * 2 + 1;
      dummy.scale.z = Math.random() * 2 + 1;
    } else {
      dummy.scale.y = dummy.scale.x;
      dummy.scale.z = dummy.scale.x;
    }

    dummy.updateMatrix();

    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.setScalar(0.1 + 0.9 * Math.random()));
  }

  return mesh;
}
