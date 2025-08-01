import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  FileLoader,
  CanvasTexture,
  NearestFilter,
  SRGBColorSpace,
  TextureLoader,
  MeshStandardMaterial,
  Mesh,
  WebGLRenderer,
  PMREMGenerator,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import lottie from "https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/+esm";

let renderer, scene, camera, controls;
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

  // lottie

  const loader = new FileLoader();
  loader.setResponseType("json");
  loader.load(
    "textures/lottie/24017-lottie-logo-animation.json",
    function (data) {
      const container = document.createElement("div");
      const dpr = window.devicePixelRatio;
      container.style.width = data.w * dpr + "px";
      container.style.height = data.h * dpr + "px";
      document.body.appendChild(container);

      const animation = lottie.loadAnimation({
        container: container,
        animType: "canvas",
        loop: true,
        autoplay: true,
        animationData: data,
        rendererSettings: { dpr: dpr },
      });

      const texture = new CanvasTexture(animation.container);
      texture.minFilter = NearestFilter;
      texture.generateMipmaps = false;
      texture.colorSpace = SRGBColorSpace;

      animation.addEventListener("enterFrame", function () {
        texture.needsUpdate = true;
      });

      container.style.display = "none"; // must be done after loadAnimation() otherwise canvas has 0 dimensions

      setupControls(animation);

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

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;

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
  controls.update();

  renderer.render(scene, camera);
}
