import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { Fn, color, mx_worley_noise_float, time } from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let renderer, scene, camera;

let projectorLight, lightHelper;

let stats;

init();

function init() {
  // Stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

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

  // Lights

  const causticEffect = Fn(([projectorUV]) => {
    const waterLayer0 = mx_worley_noise_float(projectorUV.mul(10).add(time));

    const caustic = waterLayer0.mul(color(0x5abcd8)).mul(2);

    return caustic;
  });

  const ambient = new HemisphereLight(0xffffff, 0x8d8d8d, 0.15);
  scene.add(ambient);

  projectorLight = new ProjectorLight(0xffffff, 100);
  projectorLight.colorNode = causticEffect;
  projectorLight.position.set(2.5, 5, 2.5);
  projectorLight.angle = Math.PI / 6;
  projectorLight.penumbra = 1;
  projectorLight.decay = 2;
  projectorLight.distance = 0;

  projectorLight.castShadow = true;
  projectorLight.shadow.mapSize.width = 1024;
  projectorLight.shadow.mapSize.height = 1024;
  projectorLight.shadow.camera.near = 1;
  projectorLight.shadow.camera.far = 10;
  projectorLight.shadow.focus = 1;
  projectorLight.shadow.bias = -0.003;
  scene.add(projectorLight);

  lightHelper = new SpotLightHelper(projectorLight);
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
    type: "procedural",
    color: projectorLight.color.getHex(),
    intensity: projectorLight.intensity,
    distance: projectorLight.distance,
    angle: projectorLight.angle,
    penumbra: projectorLight.penumbra,
    decay: projectorLight.decay,
    focus: projectorLight.shadow.focus,
    shadows: true,
  };

  let videoTexture, mapTexture;

  gui
    .add(params, "type", ["procedural", "video", "texture"])
    .onChange(function (val) {
      projectorLight.colorNode = null;
      projectorLight.map = null;

      if (val === "procedural") {
        projectorLight.colorNode = causticEffect;

        focus.setValue(1);
      } else if (val === "video") {
        if (videoTexture === undefined) {
          const video = document.getElementById("video");
          video.play();

          videoTexture = new VideoTexture(video);
          videoTexture.colorSpace = SRGBColorSpace;
        }

        projectorLight.map = videoTexture;

        focus.setValue(0.46);
      } else if (val === "texture") {
        mapTexture = loader.load("colors.png");
        mapTexture.minFilter = LinearFilter;
        mapTexture.magFilter = LinearFilter;
        mapTexture.generateMipmaps = false;
        mapTexture.colorSpace = SRGBColorSpace;

        projectorLight.map = mapTexture;

        focus.setValue(1);
      }
    });

  gui.addColor(params, "color").onChange(function (val) {
    projectorLight.color.setHex(val);
  });

  gui.add(params, "intensity", 0, 500).onChange(function (val) {
    projectorLight.intensity = val;
  });

  gui.add(params, "distance", 0, 20).onChange(function (val) {
    projectorLight.distance = val;
  });

  gui.add(params, "angle", 0, Math.PI / 3).onChange(function (val) {
    projectorLight.angle = val;
  });

  gui.add(params, "penumbra", 0, 1).onChange(function (val) {
    projectorLight.penumbra = val;
  });

  gui.add(params, "decay", 1, 2).onChange(function (val) {
    projectorLight.decay = val;
  });

  const focus = gui.add(params, "focus", 0, 1).onChange(function (val) {
    projectorLight.shadow.focus = val;
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

  stats.update();

  projectorLight.position.x = Math.cos(time) * 2.5;
  projectorLight.position.z = Math.sin(time) * 2.5;

  lightHelper.update();

  renderer.render(scene, camera);
}
