import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  PlaneGeometry,
  SRGBColorSpace,
  MeshBasicMaterial,
  Mesh,
} from "three";

import { TIFFLoader } from "three/addons/loaders/TIFFLoader.js";

let renderer, scene, camera;

init();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.set(0, 0, 4);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  const loader = new TIFFLoader();

  const geometry = new PlaneGeometry();

  // uncompressed

  loader.load("textures/tiff/crate_uncompressed.tif", function (texture) {
    texture.colorSpace = SRGBColorSpace;

    const material = new MeshBasicMaterial({ map: texture });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(-1.5, 0, 0);

    scene.add(mesh);

    render();
  });

  // LZW

  loader.load("textures/tiff/crate_lzw.tif", function (texture) {
    texture.colorSpace = SRGBColorSpace;

    const material = new MeshBasicMaterial({ map: texture });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(0, 0, 0);

    scene.add(mesh);

    render();
  });

  // JPEG

  loader.load("textures/tiff/crate_jpeg.tif", function (texture) {
    texture.colorSpace = SRGBColorSpace;

    const material = new MeshBasicMaterial({ map: texture });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(1.5, 0, 0);

    scene.add(mesh);

    render();
  });

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

//

function render() {
  renderer.render(scene, camera);
}
