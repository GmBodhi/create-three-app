import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { Inspector } from "three/addons/inspector/Inspector.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let controls, camera, scene, renderer;
let textureEquirec, textureCube;
let sphereMesh, sphereMaterial, params;

init();

function init() {
  // CAMERAS

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 2.5);

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

  const textureLoader = new TextureLoader();

  textureEquirec = textureLoader.load("textures/2294472375_24a3b8ef46_o.jpg");
  textureEquirec.mapping = EquirectangularReflectionMapping;
  textureEquirec.colorSpace = SRGBColorSpace;

  scene.background = textureCube;

  //

  const geometry = new IcosahedronGeometry(1, 15);
  sphereMaterial = new MeshBasicMaterial({ envMap: textureCube });
  sphereMesh = new Mesh(geometry, sphereMaterial);
  scene.add(sphereMesh);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1.5;
  controls.maxDistance = 6;

  //

  params = {
    Type: "Cube",
    Refraction: false,
    backgroundRotationX: false,
    backgroundRotationY: false,
    backgroundRotationZ: false,
    syncMaterial: false,
  };

  const gui = renderer.inspector.createParameters("Parameters");
  gui
    .add(params, "Type", ["Cube", "Equirectangular"])
    .onChange(function (value) {
      if (value === "Cube") {
        scene.background = textureCube;

        sphereMaterial.envMap = textureCube;
        sphereMaterial.needsUpdate = true;
      } else if (value === "Equirectangular") {
        scene.background = textureEquirec;

        sphereMaterial.envMap = textureEquirec;
        sphereMaterial.needsUpdate = true;
      }
    });
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
  gui.add(params, "backgroundRotationX");
  gui.add(params, "backgroundRotationY");
  gui.add(params, "backgroundRotationZ");
  gui.add(params, "syncMaterial");

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  if (params.backgroundRotationX) {
    scene.backgroundRotation.x += 0.001;
  }

  if (params.backgroundRotationY) {
    scene.backgroundRotation.y += 0.001;
  }

  if (params.backgroundRotationZ) {
    scene.backgroundRotation.z += 0.001;
  }

  if (params.syncMaterial) {
    sphereMesh.material.envMapRotation.copy(scene.backgroundRotation);
  }

  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}
