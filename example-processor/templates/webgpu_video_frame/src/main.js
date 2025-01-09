import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  PlaneGeometry,
  VideoFrameTexture,
  SRGBColorSpace,
  MeshBasicMaterial,
  Mesh,
  WebGPURenderer,
} from "three";

import { MP4Demuxer } from "three/addons/libs/demuxer_mp4.js";

let camera, scene, renderer;

init();

function init() {
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.25,
    10
  );
  camera.position.set(0, 0, 1);

  scene = new Scene();

  const geometry = new PlaneGeometry();

  const videoTexture = new VideoFrameTexture();
  videoTexture.colorSpace = SRGBColorSpace;

  // eslint-disable-next-line compat/compat
  const decoder = new VideoDecoder({
    output(frame) {
      videoTexture.setFrame(frame);
    },
    error(e) {
      console.error("VideoDecoder:", e);
    },
  });

  new MP4Demuxer("three/examples/textures/sintel.mp4", {
    onConfig(config) {
      decoder.configure(config);
    },
    onChunk(chunk) {
      decoder.decode(chunk);
    },
    setStatus(s) {
      console.info("MP4Demuxer:", s);
    },
  });

  const material = new MeshBasicMaterial({ map: videoTexture });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.render(scene, camera);
}
