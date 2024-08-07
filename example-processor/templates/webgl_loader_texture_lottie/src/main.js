import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  TextureLoader,
  SRGBColorSpace,
  MeshStandardMaterial,
  Mesh,
  WebGLRenderer,
  PMREMGenerator,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LottieLoader } from "three/addons/loaders/LottieLoader.js";

let renderer, scene, camera;
let mesh;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.z = 2.5;

  scene = new Scene();
  scene.background = new Color(0x111111);

  const loader = new LottieLoader();
  loader.setQuality(2);
  loader.load(
    "textures/lottie/24017-lottie-logo-animation.json",
    function (texture) {
      setupControls(texture.animation);

      // texture = new TextureLoader().load( 'textures/uv_grid_directx.jpg' );
      // texture.colorSpace = SRGBColorSpace;

      const geometry = new RoundedBoxGeometry(1, 1, 1, 7, 0.2);
      const material = new MeshStandardMaterial({
        roughness: 0.1,
        map: texture,
      });
      mesh = new Mesh(geometry, material);
      scene.add(mesh);
    }
  );

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  const environment = new RoomEnvironment();
  const pmremGenerator = new PMREMGenerator(renderer);

  scene.environment = pmremGenerator.fromScene(environment).texture;

  //

  window.addEventListener("resize", onWindowResize);
}

function setupControls(animation) {
  // Lottie animation API
  // https://airbnb.io/lottie/#/web

  // There are a few undocumented properties:
  // console.log( animation );

  const scrubber = document.getElementById("scrubber");
  scrubber.max = animation.totalFrames;

  scrubber.addEventListener("pointerdown", function () {
    animation.pause();
  });

  scrubber.addEventListener("pointerup", function () {
    animation.play();
  });

  scrubber.addEventListener("input", function () {
    animation.goToAndStop(parseFloat(scrubber.value), true);
  });

  animation.addEventListener("enterFrame", function () {
    scrubber.value = animation.currentFrame;
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  if (mesh) {
    mesh.rotation.y -= 0.001;
  }

  renderer.render(scene, camera);
}
