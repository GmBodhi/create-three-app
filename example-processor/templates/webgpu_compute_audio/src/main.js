import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  Fn,
  uniform,
  instanceIndex,
  instancedArray,
  float,
  texture,
  screenUV,
  color,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;
let computeNode;
let waveBuffer, sampleRate;
let waveArray;
let currentAudio, currentAnalyser;
const analyserBuffer = new Uint8Array(1024);
let analyserTexture;

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

async function playAudioBuffer() {
  if (currentAudio) currentAudio.stop();

  // compute audio

  await renderer.computeAsync(computeNode);

  const wave = new Float32Array(
    await renderer.getArrayBufferAsync(waveArray.value)
  );

  // play result

  const audioOutputContext = new AudioContext({ sampleRate });
  const audioOutputBuffer = audioOutputContext.createBuffer(
    1,
    wave.length,
    sampleRate
  );

  audioOutputBuffer.copyToChannel(wave, 0);

  const source = audioOutputContext.createBufferSource();
  source.connect(audioOutputContext.destination);
  source.buffer = audioOutputBuffer;
  source.start();

  currentAudio = source;

  // visual feedback

  currentAnalyser = audioOutputContext.createAnalyser();
  currentAnalyser.fftSize = 2048;

  source.connect(currentAnalyser);
}

async function init() {
  const overlay = document.getElementById("overlay");
  overlay.remove();

  // audio buffer

  const soundBuffer = await fetch("sounds/webgpu-audio-processing.mp3").then(
    (res) => res.arrayBuffer()
  );
  const audioContext = new AudioContext();

  const audioBuffer = await audioContext.decodeAudioData(soundBuffer);

  waveBuffer = audioBuffer.getChannelData(0);

  // adding extra silence to delay and pitch
  waveBuffer = new Float32Array([...waveBuffer, ...new Float32Array(200000)]);

  sampleRate = audioBuffer.sampleRate / audioBuffer.numberOfChannels;

  // create webgpu buffers

  waveArray = instancedArray(waveBuffer);

  // read-only buffer

  const originalWave = instancedArray(waveBuffer).toReadOnly();

  // The Pixel Buffer Object (PBO) is required to get the GPU computed data to the CPU in the WebGL2 fallback.
  // As used in `renderer.getArrayBufferAsync( waveArray.value )`.

  originalWave.setPBO(true);
  waveArray.setPBO(true);

  // params

  const pitch = uniform(1.5);
  const delayVolume = uniform(0.2);
  const delayOffset = uniform(0.55);

  // compute (shader-node)

  const computeShaderFn = Fn(() => {
    const index = float(instanceIndex);

    // pitch

    const time = index.mul(pitch);

    let wave = originalWave.element(time);

    // delay

    for (let i = 1; i < 7; i++) {
      const waveOffset = originalWave.element(
        index.sub(delayOffset.mul(sampleRate).mul(i)).mul(pitch)
      );
      const waveOffsetVolume = waveOffset.mul(delayVolume.div(i * i));

      wave = wave.add(waveOffsetVolume);
    }

    // store

    const waveStorageElementNode = waveArray.element(instanceIndex);

    waveStorageElementNode.assign(wave);
  });

  // compute

  computeNode = computeShaderFn().compute(waveBuffer.length);

  // gui

  const gui = new GUI();

  gui.add(pitch, "value", 0.5, 2, 0.01).name("pitch");
  gui.add(delayVolume, "value", 0, 1, 0.01).name("delayVolume");
  gui.add(delayOffset, "value", 0.1, 1, 0.01).name("delayOffset");

  // renderer

  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    30
  );

  // nodes

  analyserTexture = new DataTexture(
    analyserBuffer,
    analyserBuffer.length,
    1,
    RedFormat
  );

  const spectrum = texture(analyserTexture, screenUV.x).x.mul(screenUV.y);
  const backgroundNode = color(0x0000ff).mul(spectrum);

  // scene

  scene = new Scene();
  scene.backgroundNode = backgroundNode;

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("click", playAudioBuffer);

  playAudioBuffer();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  if (currentAnalyser) {
    currentAnalyser.getByteFrequencyData(analyserBuffer);

    analyserTexture.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
