import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let renderer, scene, camera;

let spotLight, lightHelper;

init();

function init() {
  // Renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(7, 4, 1);

  // Controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, 1, 0);
  controls.update();

  // Textures

  const loader = new TextureLoader().setPath("textures/");
  const filenames = ["disturb.jpg", "colors.png", "uv_grid_opengl.jpg"];

  const textures = { none: null };

  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i];

    const texture = loader.load(filename);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;

    textures[filename] = texture;
  }

  // Lights

  const ambient = new HemisphereLight(0xffffff, 0x8d8d8d, 0.15);
  scene.add(ambient);

  spotLight = new SpotLight(0xffffff, 100);
  spotLight.map = textures["disturb.jpg"];
  spotLight.position.set(2.5, 5, 2.5);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 2;
  spotLight.distance = 0;

  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 10;
  spotLight.shadow.focus = 1;
  spotLight.shadow.bias = -0.003;
  scene.add(spotLight);

  lightHelper = new SpotLightHelper(spotLight);
  scene.add(lightHelper);

  //

  const geometry = new PlaneGeometry(200, 200);
  const material = new MeshLambertMaterial({ color: 0xbcbcbc });

  const mesh = new Mesh(geometry, material);
  mesh.position.set(0, -1, 0);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Models

  new PLYLoader().load("models/ply/binary/Lucy100k.ply", function (geometry) {
    geometry.scale(0.0024, 0.0024, 0.0024);
    geometry.computeVertexNormals();

    const material = new MeshLambertMaterial();

    const mesh = new Mesh(geometry, material);
    mesh.rotation.y = -Math.PI / 2;
    mesh.position.y = 0.8;
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
    customAttenuation: false,
  };

  gui.add(params, "map", textures).onChange(function (val) {
    spotLight.map = val;
  });

  gui.addColor(params, "color").onChange(function (val) {
    spotLight.color.setHex(val);
  });

  gui.add(params, "intensity", 0, 500).onChange(function (val) {
    spotLight.intensity = val;
  });

  gui.add(params, "distance", 0, 20).onChange(function (val) {
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

function animate() {
  const time = performance.now() / 3000;

  spotLight.position.x = Math.cos(time) * 2.5;
  spotLight.position.z = Math.sin(time) * 2.5;

  lightHelper.update();

  renderer.render(scene, camera);
}
