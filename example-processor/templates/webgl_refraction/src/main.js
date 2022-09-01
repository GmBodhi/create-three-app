import "./style.css"; // For webpack support

import {
  Clock,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  PlaneGeometry,
  TextureLoader,
  RepeatWrapping,
  IcosahedronGeometry,
  MeshPhongMaterial,
  Mesh,
  PointLight,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Refractor } from "three/addons/objects/Refractor.js";
import { WaterRefractionShader } from "three/addons/shaders/WaterRefractionShader.js";

let camera, scene, renderer, clock;

let refractor, smallSphere;

init();

function init() {
  const container = document.getElementById("container");

  clock = new Clock();

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // scene
  scene = new Scene();

  // camera
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    500
  );
  camera.position.set(0, 75, 160);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 40, 0);
  controls.maxDistance = 400;
  controls.minDistance = 10;
  controls.update();

  // refractor

  const refractorGeometry = new PlaneGeometry(90, 90);

  refractor = new Refractor(refractorGeometry, {
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: WaterRefractionShader,
  });

  refractor.position.set(0, 50, 0);

  scene.add(refractor);

  // load dudv map for distortion effect

  const dudvMap = new TextureLoader().load(
    "textures/waterdudv.jpg",
    function () {
      animate();
    }
  );

  dudvMap.wrapS = dudvMap.wrapT = RepeatWrapping;
  refractor.material.uniforms.tDudv.value = dudvMap;

  //

  const geometry = new IcosahedronGeometry(5, 0);
  const material = new MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x333333,
    flatShading: true,
  });
  smallSphere = new Mesh(geometry, material);
  scene.add(smallSphere);

  // walls
  const planeGeo = new PlaneGeometry(100.1, 100.1);

  const planeTop = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0xffffff })
  );
  planeTop.position.y = 100;
  planeTop.rotateX(Math.PI / 2);
  scene.add(planeTop);

  const planeBottom = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0xffffff })
  );
  planeBottom.rotateX(-Math.PI / 2);
  scene.add(planeBottom);

  const planeBack = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0x7f7fff })
  );
  planeBack.position.z = -50;
  planeBack.position.y = 50;
  scene.add(planeBack);

  const planeRight = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0x00ff00 })
  );
  planeRight.position.x = 50;
  planeRight.position.y = 50;
  planeRight.rotateY(-Math.PI / 2);
  scene.add(planeRight);

  const planeLeft = new Mesh(
    planeGeo,
    new MeshPhongMaterial({ color: 0xff0000 })
  );
  planeLeft.position.x = -50;
  planeLeft.position.y = 50;
  planeLeft.rotateY(Math.PI / 2);
  scene.add(planeLeft);

  // lights
  const mainLight = new PointLight(0xcccccc, 1.5, 250);
  mainLight.position.y = 60;
  scene.add(mainLight);

  const greenLight = new PointLight(0x00ff00, 0.25, 1000);
  greenLight.position.set(550, 50, 0);
  scene.add(greenLight);

  const redLight = new PointLight(0xff0000, 0.25, 1000);
  redLight.position.set(-550, 50, 0);
  scene.add(redLight);

  const blueLight = new PointLight(0x7f7fff, 0.25, 1000);
  blueLight.position.set(0, 50, 550);
  scene.add(blueLight);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  refractor.material.uniforms.time.value = time;

  smallSphere.position.set(
    Math.cos(time) * 30,
    Math.abs(Math.cos(time * 2)) * 20 + 5,
    Math.sin(time) * 30
  );
  smallSphere.rotation.y = Math.PI / 2 - time;
  smallSphere.rotation.z = time * 8;

  renderer.render(scene, camera);
}
