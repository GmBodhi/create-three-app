import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  CubeTextureLoader,
  sRGBEncoding,
  TextureLoader,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  MultiplyBlending,
  WebGLRenderer,
  PCFSoftShadowMap,
  MathUtils,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GroundProjectedEnv } from "three/examples/jsm/objects/GroundProjectedEnv.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const params = {
  height: 34,
  radius: 440,
  toneMappingExposure: 1,
};

let camera, scene, renderer, stats, env;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(-16, 4, 16);

  scene = new Scene();

  const cubeLoader = new CubeTextureLoader();
  cubeLoader.setPath("textures/cube/lake/");

  const textureCube = cubeLoader.load([
    "px.png",
    "nx.png",
    "py.png",
    "ny.png",
    "pz.png",
    "nz.png",
  ]);
  textureCube.encoding = sRGBEncoding;

  env = new GroundProjectedEnv(textureCube);
  env.scale.setScalar(100);
  scene.add(env);

  scene.environment = textureCube;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("js/libs/draco/gltf/");

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  const shadow = new TextureLoader().load("models/gltf/ferrari_ao.png");

  loader.load("models/gltf/ferrari.glb", function (gltf) {
    const bodyMaterial = new MeshPhysicalMaterial({
      color: 0xff0000,
      metalness: 1.0,
      roughness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      sheen: 0.5,
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
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 2;
    carModel.add(mesh);

    scene.add(carModel);
  });

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputEncoding = sRGBEncoding;

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = MathUtils.degToRad(80);
  controls.maxDistance = 100;
  controls.minDistance = 30;
  controls.enablePan = false;
  controls.update();

  stats = new Stats();
  document.body.appendChild(stats.dom);

  const gui = new GUI();
  gui.add(params, "height", 20, 50, 0.1);
  gui.add(params, "radius", 200, 600, 0.1);

  //

  document.body.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();

  stats.update();
}

function render() {
  renderer.render(scene, camera);

  env.radius = params.radius;
  env.height = params.height;
}
