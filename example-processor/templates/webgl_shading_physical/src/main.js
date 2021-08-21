import "./style.css"; // For webpack support

import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let stats;

let camera, scene, renderer;

let mesh;

let controls;

let cubeCamera;

let sunLight, pointLight, ambientLight;

let mixer;

const clock = new THREE.Clock();

let gui, shadowCameraHelper;

const shadowConfig = {
  shadowCameraVisible: false,
  shadowCameraNear: 750,
  shadowCameraFar: 4000,
  shadowBias: -0.0002,
};

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  // CAMERA

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    2,
    10000
  );
  camera.position.set(500, 400, 1200);

  // SCENE

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0, 1000, 10000);

  // CUBE CAMERA

  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    encoding: THREE.sRGBEncoding,
  });
  cubeCamera = new THREE.CubeCamera(1, 10000, cubeRenderTarget);

  // TEXTURES
  const textureLoader = new THREE.TextureLoader();

  const textureSquares = textureLoader.load(
    "textures/patterns/bright_squares256.png"
  );
  textureSquares.repeat.set(50, 50);
  textureSquares.wrapS = textureSquares.wrapT = THREE.RepeatWrapping;
  textureSquares.magFilter = THREE.NearestFilter;
  textureSquares.encoding = THREE.sRGBEncoding;

  const textureNoiseColor = textureLoader.load("textures/disturb.jpg");
  textureNoiseColor.repeat.set(1, 1);
  textureNoiseColor.wrapS = textureNoiseColor.wrapT = THREE.RepeatWrapping;
  textureNoiseColor.encoding = THREE.sRGBEncoding;

  const textureLava = textureLoader.load("textures/lava/lavatile.jpg");
  textureLava.repeat.set(6, 2);
  textureLava.wrapS = textureLava.wrapT = THREE.RepeatWrapping;
  textureLava.encoding = THREE.sRGBEncoding;

  // GROUND

  const groundMaterial = new THREE.MeshPhongMaterial({
    shininess: 80,
    color: 0xffffff,
    specular: 0xffffff,
    map: textureSquares,
  });

  const planeGeometry = new THREE.PlaneGeometry(100, 100);

  const ground = new THREE.Mesh(planeGeometry, groundMaterial);
  ground.position.set(0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.scale.set(1000, 1000, 1000);
  ground.receiveShadow = true;
  scene.add(ground);

  // MATERIALS

  const materialLambert = new THREE.MeshPhongMaterial({
    shininess: 50,
    color: 0xffffff,
    map: textureNoiseColor,
  });
  const materialPhong = new THREE.MeshPhongMaterial({
    shininess: 50,
    color: 0xffffff,
    specular: 0x999999,
    map: textureLava,
  });
  const materialPhongCube = new THREE.MeshPhongMaterial({
    shininess: 50,
    color: 0xffffff,
    specular: 0x999999,
    envMap: cubeRenderTarget.texture,
  });

  // OBJECTS

  const sphereGeometry = new THREE.SphereGeometry(100, 64, 32);
  const torusGeometry = new THREE.TorusGeometry(240, 60, 32, 64);
  const cubeGeometry = new THREE.BoxGeometry(150, 150, 150);

  addObject(torusGeometry, materialPhong, 0, 100, 0, 0);
  addObject(cubeGeometry, materialLambert, 350, 75, 300, 0);

  mesh = addObject(sphereGeometry, materialPhongCube, 350, 100, -350, 0);
  mesh.add(cubeCamera);

  function addObjectColor(geometry, color, x, y, z, ry) {
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff });

    return addObject(geometry, material, x, y, z, ry);
  }

  function addObject(geometry, material, x, y, z, ry) {
    const tmpMesh = new THREE.Mesh(geometry, material);

    tmpMesh.material.color.offsetHSL(0.1, -0.1, 0);

    tmpMesh.position.set(x, y, z);

    tmpMesh.rotation.y = ry;

    tmpMesh.castShadow = true;
    tmpMesh.receiveShadow = true;

    scene.add(tmpMesh);

    return tmpMesh;
  }

  const bigCube = new THREE.BoxGeometry(50, 500, 50);
  const midCube = new THREE.BoxGeometry(50, 200, 50);
  const smallCube = new THREE.BoxGeometry(100, 100, 100);

  addObjectColor(bigCube, 0xff0000, -500, 250, 0, 0);
  addObjectColor(smallCube, 0xff0000, -500, 50, -150, 0);

  addObjectColor(midCube, 0x00ff00, 500, 100, 0, 0);
  addObjectColor(smallCube, 0x00ff00, 500, 50, -150, 0);

  addObjectColor(midCube, 0x0000ff, 0, 100, -500, 0);
  addObjectColor(smallCube, 0x0000ff, -150, 50, -500, 0);

  addObjectColor(midCube, 0xff00ff, 0, 100, 500, 0);
  addObjectColor(smallCube, 0xff00ff, -150, 50, 500, 0);

  addObjectColor(
    new THREE.BoxGeometry(500, 10, 10),
    0xffff00,
    0,
    600,
    0,
    Math.PI / 4
  );
  addObjectColor(new THREE.BoxGeometry(250, 10, 10), 0xffff00, 0, 600, 0, 0);

  addObjectColor(
    new THREE.SphereGeometry(100, 32, 26),
    0xffffff,
    -300,
    100,
    300,
    0
  );

  // MORPHS

  const loader = new GLTFLoader();

  loader.load("models/gltf/SittingBox.glb", function (gltf) {
    const mesh = gltf.scene.children[0];

    mixer = new THREE.AnimationMixer(mesh);

    mixer.clipAction(gltf.animations[0]).setDuration(10).play();

    const s = 200;
    mesh.scale.set(s, s, s);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
  });

  // LIGHTS

  ambientLight = new THREE.AmbientLight(0x3f2806);
  scene.add(ambientLight);

  pointLight = new THREE.PointLight(0xffaa00, 1, 5000);
  scene.add(pointLight);

  sunLight = new THREE.DirectionalLight(0xffffff, 0.3);
  sunLight.position.set(1000, 2000, 1000);
  sunLight.castShadow = true;
  sunLight.shadow.camera.top = 750;
  sunLight.shadow.camera.bottom = -750;
  sunLight.shadow.camera.left = -750;
  sunLight.shadow.camera.right = 750;
  sunLight.shadow.camera.near = shadowConfig.shadowCameraNear;
  sunLight.shadow.camera.far = shadowConfig.shadowCameraFar;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.bias = shadowConfig.shadowBias;

  scene.add(sunLight);

  // SHADOW CAMERA HELPER

  shadowCameraHelper = new THREE.CameraHelper(sunLight.shadow.camera);
  shadowCameraHelper.visible = shadowConfig.shadowCameraVisible;
  scene.add(shadowCameraHelper);

  // RENDERER

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  //

  controls = new TrackballControls(camera, renderer.domElement);
  controls.target.set(0, 120, 0);

  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;

  controls.staticMoving = true;

  controls.keys = ["KeyA", "KeyS", "KeyD"];

  // STATS

  stats = new Stats();
  container.appendChild(stats.dom);

  // EVENTS

  window.addEventListener("resize", onWindowResize);

  // GUI

  gui = new GUI({ width: 400 });

  // SHADOW

  const shadowGUI = gui.addFolder("Shadow");

  shadowGUI.add(shadowConfig, "shadowCameraVisible").onChange(function () {
    shadowCameraHelper.visible = shadowConfig.shadowCameraVisible;
  });

  shadowGUI
    .add(shadowConfig, "shadowCameraNear", 1, 1500)
    .onChange(function () {
      sunLight.shadow.camera.near = shadowConfig.shadowCameraNear;
      sunLight.shadow.camera.updateProjectionMatrix();
      shadowCameraHelper.update();
    });

  shadowGUI
    .add(shadowConfig, "shadowCameraFar", 1501, 5000)
    .onChange(function () {
      sunLight.shadow.camera.far = shadowConfig.shadowCameraFar;
      sunLight.shadow.camera.updateProjectionMatrix();
      shadowCameraHelper.update();
    });

  shadowGUI.add(shadowConfig, "shadowBias", -0.01, 0.01).onChange(function () {
    sunLight.shadow.bias = shadowConfig.shadowBias;
  });

  shadowGUI.open();
}

//

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  controls.handleResize();
}

//

function animate() {
  requestAnimationFrame(animate);

  stats.begin();
  render();
  stats.end();
}

function render() {
  // update

  const delta = clock.getDelta();

  controls.update();

  if (mixer) {
    mixer.update(delta);
  }

  // render cube map

  mesh.visible = false;
  cubeCamera.update(renderer, scene);
  mesh.visible = true;

  // render scene

  renderer.render(scene, camera);
}
