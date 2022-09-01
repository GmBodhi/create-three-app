import "./style.css"; // For webpack support

import {
  Clock,
  Scene,
  Color,
  AmbientLight,
  PerspectiveCamera,
  SphereGeometry,
  MeshStandardMaterial,
  BackSide,
  Mesh,
  LoadingManager,
  TextureLoader,
  NearestFilter,
  WebGLRenderer,
} from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

let camera, scene, renderer, sphere, clock;

init();
animate();

function init() {
  const container = document.getElementById("container");

  clock = new Clock();

  scene = new Scene();
  scene.background = new Color(0x101010);

  const light = new AmbientLight(0xffffff, 1);
  scene.add(light);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  scene.add(camera);

  // Create the panoramic sphere geometery
  const panoSphereGeo = new SphereGeometry(6, 256, 256);

  // Create the panoramic sphere material
  const panoSphereMat = new MeshStandardMaterial({
    side: BackSide,
    displacementScale: -4.0,
  });

  // Create the panoramic sphere mesh
  sphere = new Mesh(panoSphereGeo, panoSphereMat);

  // Load and assign the texture and depth map
  const manager = new LoadingManager();
  const loader = new TextureLoader(manager);

  loader.load("three/examples/textures/kandao3.jpg", function (texture) {
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    sphere.material.map = texture;
  });

  loader.load("three/examples/textures/kandao3_depthmap.jpg", function (depth) {
    depth.minFilter = NearestFilter;
    depth.generateMipmaps = false;
    sphere.material.displacementMap = depth;
  });

  // On load complete add the panoramic sphere to the scene
  manager.onLoad = function () {
    scene.add(sphere);
  };

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // If we are not presenting move the camera a little so the effect is visible

  if (renderer.xr.isPresenting === false) {
    const time = clock.getElapsedTime();

    sphere.rotation.y += 0.001;
    sphere.position.x = Math.sin(time) * 0.2;
    sphere.position.z = Math.cos(time) * 0.2;
  }

  renderer.render(scene, camera);
}
