import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  EquirectangularReflectionMapping,
  TextureLoader,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  MultiplyBlending,
  WebGLRenderer,
  ACESFilmicToneMapping,
  MathUtils,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GroundedSkybox } from "three/addons/objects/GroundedSkybox.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const params = {
  height: 15,
  radius: 100,
  enabled: true,
};

let camera, scene, renderer, skybox;

init().then(render);

async function init() {
  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(-20, 7, 20);
  camera.lookAt(0, 4, 0);

  scene = new Scene();

  const hdrLoader = new RGBELoader();
  const envMap = await hdrLoader.loadAsync(
    "textures/equirectangular/blouberg_sunrise_2_1k.hdr"
  );
  envMap.mapping = EquirectangularReflectionMapping;

  skybox = new GroundedSkybox(envMap, params.height, params.radius);
  skybox.position.y = params.height - 0.01;
  scene.add(skybox);

  scene.environment = envMap;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  const shadow = new TextureLoader().load("models/gltf/ferrari_ao.png");

  loader.load("models/gltf/ferrari.glb", function (gltf) {
    const bodyMaterial = new MeshPhysicalMaterial({
      color: 0x000000,
      metalness: 1.0,
      roughness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.2,
    });

    const detailsMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1.0,
      roughness: 0.5,
    });

    const glassMaterial = new MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.25,
      roughness: 0,
      transmission: 1.0,
    });

    const carModel = gltf.scene.children[0];
    carModel.scale.multiplyScalar(4);
    carModel.rotation.y = Math.PI;

    carModel.getObjectByName("body").material = bodyMaterial;

    carModel.getObjectByName("rim_fl").material = detailsMaterial;
    carModel.getObjectByName("rim_fr").material = detailsMaterial;
    carModel.getObjectByName("rim_rr").material = detailsMaterial;
    carModel.getObjectByName("rim_rl").material = detailsMaterial;
    carModel.getObjectByName("trim").material = detailsMaterial;

    carModel.getObjectByName("glass").material = glassMaterial;

    // shadow
    const mesh = new Mesh(
      new PlaneGeometry(0.655 * 4, 1.3 * 4),
      new MeshBasicMaterial({
        map: shadow,
        blending: MultiplyBlending,
        toneMapped: false,
        transparent: true,
        premultipliedAlpha: true,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    carModel.add(mesh);

    scene.add(carModel);

    render();
  });

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.target.set(0, 2, 0);
  controls.maxPolarAngle = MathUtils.degToRad(90);
  controls.maxDistance = 80;
  controls.minDistance = 20;
  controls.enablePan = false;
  controls.update();

  document.body.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  gui
    .add(params, "enabled")
    .name("Grounded")
    .onChange(function (value) {
      if (value) {
        scene.add(skybox);
        scene.background = null;
      } else {
        scene.remove(skybox);
        scene.background = scene.environment;
      }

      render();
    });

  gui.open();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}
