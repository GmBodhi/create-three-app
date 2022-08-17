import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  CubeTextureLoader,
  sRGBEncoding,
  TextureLoader,
  EquirectangularReflectionMapping,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Mesh,
  WebGLRenderer,
  EquirectangularRefractionMapping,
  CubeRefractionMapping,
  CubeReflectionMapping,
} from "three";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let controls, camera, scene, renderer;
let textureEquirec, textureCube;
let sphereMesh, sphereMaterial;

init();
animate();

function init() {
  // CAMERAS

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );
  camera.position.set(0, 0, 1000);

  // SCENE

  scene = new Scene();

  // Textures

  const loader = new CubeTextureLoader();
  loader.setPath("textures/cube/Bridge2/");

  textureCube = loader.load([
    "posx.jpg",
    "negx.jpg",
    "posy.jpg",
    "negy.jpg",
    "posz.jpg",
    "negz.jpg",
  ]);
  textureCube.encoding = sRGBEncoding;

  const textureLoader = new TextureLoader();

  textureEquirec = textureLoader.load("textures/2294472375_24a3b8ef46_o.jpg");
  textureEquirec.mapping = EquirectangularReflectionMapping;
  textureEquirec.encoding = sRGBEncoding;

  scene.background = textureCube;

  //

  const geometry = new IcosahedronGeometry(400, 15);
  sphereMaterial = new MeshBasicMaterial({ envMap: textureCube });
  sphereMesh = new Mesh(geometry, sphereMaterial);
  scene.add(sphereMesh);

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 2500;

  //

  const params = {
    Cube: function () {
      scene.background = textureCube;

      sphereMaterial.envMap = textureCube;
      sphereMaterial.needsUpdate = true;
    },
    Equirectangular: function () {
      scene.background = textureEquirec;

      sphereMaterial.envMap = textureEquirec;
      sphereMaterial.needsUpdate = true;
    },
    Refraction: false,
  };

  const gui = new GUI();
  gui.add(params, "Cube");
  gui.add(params, "Equirectangular");
  gui.add(params, "Refraction").onChange(function (value) {
    if (value) {
      textureEquirec.mapping = EquirectangularRefractionMapping;
      textureCube.mapping = CubeRefractionMapping;
    } else {
      textureEquirec.mapping = EquirectangularReflectionMapping;
      textureCube.mapping = CubeReflectionMapping;
    }

    sphereMaterial.needsUpdate = true;
  });
  gui.open();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}
