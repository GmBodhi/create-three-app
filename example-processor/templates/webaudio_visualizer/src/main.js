//Shaders

import vertexShader_ from "./shaders/vertexShader.glsl";
import fragmentShader_ from "./shaders/fragmentShader.glsl";

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  Camera,
  AudioListener,
  Audio,
  AudioLoader,
  AudioAnalyser,
  RedFormat,
  LuminanceFormat,
  DataTexture,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
} from "three";

let scene, camera, renderer, analyser, uniforms;

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

function init() {
  const fftSize = 128;

  //

  const overlay = document.getElementById("overlay");
  overlay.remove();

  //

  const container = document.getElementById("container");

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new Camera();

  //

  const listener = new AudioListener();

  const audio = new Audio(listener);
  const file = "three/examples/sounds/376737_Skullbeatz___Bad_Cat_Maste.mp3";

  if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
    const loader = new AudioLoader();
    loader.load(file, function (buffer) {
      audio.setBuffer(buffer);
      audio.play();
    });
  } else {
    const mediaElement = new Audio(file);
    mediaElement.play();

    audio.setMediaElementSource(mediaElement);
  }

  analyser = new AudioAnalyser(audio, fftSize);

  //

  const format = renderer.capabilities.isWebGL2 ? RedFormat : LuminanceFormat;

  uniforms = {
    tAudioData: {
      value: new DataTexture(analyser.data, fftSize / 2, 1, format),
    },
  };

  const material = new ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShader").textContent,
  });

  const geometry = new PlaneGeometry(1, 1);

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  window.addEventListener("resize", onWindowResize);

  animate();
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  analyser.getFrequencyData();

  uniforms.tAudioData.value.needsUpdate = true;

  renderer.render(scene, camera);
}
