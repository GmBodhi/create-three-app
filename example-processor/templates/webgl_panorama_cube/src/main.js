import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  MeshBasicMaterial,
  Mesh,
  BoxGeometry,
  Texture,
  ImageLoader,
  SRGBColorSpace,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, controls;
let renderer;
let scene;

init();
animate();

function init() {
  const container = document.getElementById("container");

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 0.01;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.rotateSpeed = -0.25;

  const textures = getTexturesFromAtlasFile(
    "textures/cube/sun_temple_stripe.jpg",
    6
  );

  const materials = [];

  for (let i = 0; i < 6; i++) {
    materials.push(new MeshBasicMaterial({ map: textures[i] }));
  }

  const skyBox = new Mesh(new BoxGeometry(1, 1, 1), materials);
  skyBox.geometry.scale(1, 1, -1);
  scene.add(skyBox);

  window.addEventListener("resize", onWindowResize);
}

function getTexturesFromAtlasFile(atlasImgUrl, tilesNum) {
  const textures = [];

  for (let i = 0; i < tilesNum; i++) {
    textures[i] = new Texture();
  }

  new ImageLoader().load(atlasImgUrl, (image) => {
    let canvas, context;
    const tileWidth = image.height;

    for (let i = 0; i < textures.length; i++) {
      canvas = document.createElement("canvas");
      context = canvas.getContext("2d");
      canvas.height = tileWidth;
      canvas.width = tileWidth;
      context.drawImage(
        image,
        tileWidth * i,
        0,
        tileWidth,
        tileWidth,
        0,
        0,
        tileWidth,
        tileWidth
      );
      textures[i].colorSpace = SRGBColorSpace;
      textures[i].image = canvas;
      textures[i].needsUpdate = true;
    }
  });

  return textures;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update(); // required when damping is enabled

  renderer.render(scene, camera);
}
