//Shaders

import vertexShader_ from "./shaders/vertexShader.glsl";
import fragmentShader_ from "./shaders/fragmentShader.glsl";

import "./style.css"; // For webpack support

import {
  Scene,
  Camera,
  AudioListener,
  Audio,
  AudioLoader,
  AudioAnalyser,
  DataTexture,
  RedFormat,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  WebGLRenderer,
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

  uniforms = {
    tAudioData: {
      value: new DataTexture(analyser.data, fftSize / 2, 1, RedFormat),
    },
  };

  const material = new ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader_,
    fragmentShader: fragmentShader_,
  });

  const geometry = new PlaneGeometry(1, 1);

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  analyser.getFrequencyData();

  uniforms.tAudioData.value.needsUpdate = true;

  renderer.render(scene, camera);
}
