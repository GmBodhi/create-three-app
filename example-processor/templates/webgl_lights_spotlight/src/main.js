import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PCFSoftShadowMap,
  sRGBEncoding,
  ACESFilmicToneMapping,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  TextureLoader,
  LinearFilter,
  SpotLight,
  SpotLightHelper,
  PlaneGeometry,
  MeshLambertMaterial,
  Mesh,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let renderer, scene, camera;

let spotLight, lightHelper;

init();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(76, 50, 10);
  camera.rotation.set(-1.29, 1.15, 1.26);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 20;
  controls.maxDistance = 500;
  controls.target.set(0, 18, 0);
  controls.update();

  const ambient = new HemisphereLight(0xffffff, 0x444444, 0.05);
  scene.add(ambient);

  const loader = new TextureLoader().setPath("textures/");
  const filenames = ["disturb.jpg", "colors.png", "uv_grid_opengl.jpg"];

  const textures = { none: null };

  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i];

    const texture = loader.load(filename);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.encoding = sRGBEncoding;

    textures[filename] = texture;
  }

  spotLight = new SpotLight(0xffffff, 10);
  spotLight.position.set(25, 50, 25);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 2;
  spotLight.distance = 100;
  spotLight.map = textures["disturb.jpg"];

  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 10;
  spotLight.shadow.camera.far = 200;
  spotLight.shadow.focus = 1;
  scene.add(spotLight);

  lightHelper = new SpotLightHelper(spotLight);
  scene.add(lightHelper);

  //

  const geometry = new PlaneGeometry(1000, 1000);
  const material = new MeshLambertMaterial({ color: 0x808080 });

  const mesh = new Mesh(geometry, material);
  mesh.position.set(0, -1, 0);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  //

  new PLYLoader().load("models/ply/binary/Lucy100k.ply", function (geometry) {
    geometry.scale(0.024, 0.024, 0.024);
    geometry.computeVertexNormals();

    const material = new MeshLambertMaterial();

    const mesh = new Mesh(geometry, material);
    mesh.rotation.y = -Math.PI / 2;
    mesh.position.y = 18;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  window.addEventListener("resize", onWindowResize);

  // GUI

  const gui = new GUI();

  const params = {
    map: textures["disturb.jpg"],
    color: spotLight.color.getHex(),
    intensity: spotLight.intensity,
    distance: spotLight.distance,
    angle: spotLight.angle,
    penumbra: spotLight.penumbra,
    decay: spotLight.decay,
    focus: spotLight.shadow.focus,
    shadows: true,
  };

  gui.add(params, "map", textures).onChange(function (val) {
    spotLight.map = val;
  });

  gui.addColor(params, "color").onChange(function (val) {
    spotLight.color.setHex(val);
  });

  gui.add(params, "intensity", 0, 10).onChange(function (val) {
    spotLight.intensity = val;
  });

  gui.add(params, "distance", 50, 200).onChange(function (val) {
    spotLight.distance = val;
  });

  gui.add(params, "angle", 0, Math.PI / 3).onChange(function (val) {
    spotLight.angle = val;
  });

  gui.add(params, "penumbra", 0, 1).onChange(function (val) {
    spotLight.penumbra = val;
  });

  gui.add(params, "decay", 1, 2).onChange(function (val) {
    spotLight.decay = val;
  });

  gui.add(params, "focus", 0, 1).onChange(function (val) {
    spotLight.shadow.focus = val;
  });

  gui.add(params, "shadows").onChange(function (val) {
    renderer.shadowMap.enabled = val;

    scene.traverse(function (child) {
      if (child.material) {
        child.material.needsUpdate = true;
      }
    });
  });

  gui.open();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  const time = performance.now() / 3000;

  spotLight.position.x = Math.cos(time) * 25;
  spotLight.position.z = Math.sin(time) * 25;

  lightHelper.update();

  renderer.render(scene, camera);
}
