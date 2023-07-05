import "./style.css"; // For webpack support

import {
  Clock,
  PerspectiveCamera,
  AudioListener,
  Scene,
  FogExp2,
  DirectionalLight,
  SphereGeometry,
  MeshPhongMaterial,
  Mesh,
  PositionalAudio,
  AudioAnalyser,
  Audio,
  GridHelper,
  WebGLRenderer,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";

let camera, controls, scene, renderer, light;

let material1, material2, material3;

let analyser1, analyser2, analyser3;

const clock = new Clock();

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

function init() {
  const overlay = document.getElementById("overlay");
  overlay.remove();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, 25, 0);

  const listener = new AudioListener();
  camera.add(listener);

  scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.0025);

  light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 0.5, 1).normalize();
  scene.add(light);

  const sphere = new SphereGeometry(20, 32, 16);

  material1 = new MeshPhongMaterial({
    color: 0xffaa00,
    flatShading: true,
    shininess: 0,
  });
  material2 = new MeshPhongMaterial({
    color: 0xff2200,
    flatShading: true,
    shininess: 0,
  });
  material3 = new MeshPhongMaterial({
    color: 0x6622aa,
    flatShading: true,
    shininess: 0,
  });

  // sound spheres

  const mesh1 = new Mesh(sphere, material1);
  mesh1.position.set(-250, 30, 0);
  scene.add(mesh1);

  const sound1 = new PositionalAudio(listener);
  const songElement = document.getElementById("song");
  sound1.setMediaElementSource(songElement);
  sound1.setRefDistance(20);
  songElement.play();
  mesh1.add(sound1);

  //

  const mesh2 = new Mesh(sphere, material2);
  mesh2.position.set(250, 30, 0);
  scene.add(mesh2);

  const sound2 = new PositionalAudio(listener);
  const skullbeatzElement = document.getElementById("skullbeatz");
  sound2.setMediaElementSource(skullbeatzElement);
  sound2.setRefDistance(20);
  skullbeatzElement.play();
  mesh2.add(sound2);

  //

  const mesh3 = new Mesh(sphere, material3);
  mesh3.position.set(0, 30, -250);
  scene.add(mesh3);

  const sound3 = new PositionalAudio(listener);
  const oscillator = listener.context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(144, sound3.context.currentTime);
  oscillator.start(0);
  sound3.setNodeSource(oscillator);
  sound3.setRefDistance(20);
  sound3.setVolume(0.5);
  mesh3.add(sound3);

  // analysers

  analyser1 = new AudioAnalyser(sound1, 32);
  analyser2 = new AudioAnalyser(sound2, 32);
  analyser3 = new AudioAnalyser(sound3, 32);

  // global ambient audio

  const sound4 = new Audio(listener);
  const utopiaElement = document.getElementById("utopia");
  sound4.setMediaElementSource(utopiaElement);
  sound4.setVolume(0.5);
  utopiaElement.play();

  // ground

  const helper = new GridHelper(1000, 10, 0x444444, 0x444444);
  helper.position.y = 0.1;
  scene.add(helper);

  //

  const SoundControls = function () {
    this.master = listener.getMasterVolume();
    this.firstSphere = sound1.getVolume();
    this.secondSphere = sound2.getVolume();
    this.thirdSphere = sound3.getVolume();
    this.Ambient = sound4.getVolume();
  };

  const GeneratorControls = function () {
    this.frequency = oscillator.frequency.value;
    this.wavetype = oscillator.type;
  };

  const gui = new GUI();
  const soundControls = new SoundControls();
  const generatorControls = new GeneratorControls();
  const volumeFolder = gui.addFolder("sound volume");
  const generatorFolder = gui.addFolder("sound generator");

  volumeFolder
    .add(soundControls, "master")
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange(function () {
      listener.setMasterVolume(soundControls.master);
    });
  volumeFolder
    .add(soundControls, "firstSphere")
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange(function () {
      sound1.setVolume(soundControls.firstSphere);
    });
  volumeFolder
    .add(soundControls, "secondSphere")
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange(function () {
      sound2.setVolume(soundControls.secondSphere);
    });

  volumeFolder
    .add(soundControls, "thirdSphere")
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange(function () {
      sound3.setVolume(soundControls.thirdSphere);
    });
  volumeFolder
    .add(soundControls, "Ambient")
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange(function () {
      sound4.setVolume(soundControls.Ambient);
    });
  volumeFolder.open();
  generatorFolder
    .add(generatorControls, "frequency")
    .min(50.0)
    .max(5000.0)
    .step(1.0)
    .onChange(function () {
      oscillator.frequency.setValueAtTime(
        generatorControls.frequency,
        listener.context.currentTime
      );
    });
  generatorFolder
    .add(generatorControls, "wavetype", [
      "sine",
      "square",
      "sawtooth",
      "triangle",
    ])
    .onChange(function () {
      oscillator.type = generatorControls.wavetype;
    });

  generatorFolder.open();

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);

  //

  controls = new FirstPersonControls(camera, renderer.domElement);

  controls.movementSpeed = 70;
  controls.lookSpeed = 0.05;
  controls.lookVertical = false;

  //

  window.addEventListener("resize", onWindowResize);

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  controls.handleResize();
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  const delta = clock.getDelta();

  controls.update(delta);

  material1.emissive.b = analyser1.getAverageFrequency() / 256;
  material2.emissive.b = analyser2.getAverageFrequency() / 256;
  material3.emissive.b = analyser3.getAverageFrequency() / 256;

  renderer.render(scene, camera);
}
