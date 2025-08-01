import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  pass,
  texture,
  uniform,
  output,
  mrt,
  mix,
  velocity,
  uv,
  screenUV,
} from "three/tsl";
import { motionBlur } from "three/addons/tsl/display/MotionBlur.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer;
let boxLeft, boxRight, model, mixer, clock;
let postProcessing;
let controls;
let stats;

const params = {
  speed: 1.0,
};

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.25,
    30
  );
  camera.position.set(0, 1.5, 4.5);

  scene = new Scene();
  scene.fog = new Fog(0x0487e2, 7, 25);

  const sunLight = new DirectionalLight(0xffe499, 5);
  sunLight.castShadow = true;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 10;
  sunLight.shadow.camera.right = 2;
  sunLight.shadow.camera.left = -2;
  sunLight.shadow.camera.top = 2;
  sunLight.shadow.camera.bottom = -2;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.bias = -0.001;
  sunLight.position.set(4, 4, 2);

  const waterAmbientLight = new HemisphereLight(0x333366, 0x74ccf4, 5);
  const skyAmbientLight = new HemisphereLight(0x74ccf4, 0, 1);

  scene.add(sunLight);
  scene.add(skyAmbientLight);
  scene.add(waterAmbientLight);

  clock = new Clock();

  // animated model

  const loader = new GLTFLoader();
  loader.load("models/gltf/Xbot.glb", function (gltf) {
    model = gltf.scene;

    model.rotation.y = Math.PI / 2;

    model.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    mixer = new AnimationMixer(model);

    const action = mixer.clipAction(gltf.animations[3]);
    action.play();

    scene.add(model);
  });

  // textures

  const textureLoader = new TextureLoader();

  const floorColor = textureLoader.load(
    "textures/floors/FloorsCheckerboard_S_Diffuse.jpg"
  );
  floorColor.wrapS = RepeatWrapping;
  floorColor.wrapT = RepeatWrapping;
  floorColor.colorSpace = SRGBColorSpace;

  const floorNormal = textureLoader.load(
    "textures/floors/FloorsCheckerboard_S_Normal.jpg"
  );
  floorNormal.wrapS = RepeatWrapping;
  floorNormal.wrapT = RepeatWrapping;

  // floor

  const floorUV = uv().mul(5);

  const floorMaterial = new MeshPhongNodeMaterial();
  floorMaterial.colorNode = texture(floorColor, floorUV);

  const floor = new Mesh(new BoxGeometry(15, 0.001, 15), floorMaterial);
  floor.receiveShadow = true;

  floor.position.set(0, 0, 0);
  scene.add(floor);

  const walls = new Mesh(
    new BoxGeometry(15, 15, 15),
    new MeshPhongNodeMaterial({
      colorNode: floorMaterial.colorNode,
      side: BackSide,
    })
  );
  scene.add(walls);

  const map = new TextureLoader().load("textures/uv_grid_opengl.jpg");
  map.colorSpace = SRGBColorSpace;

  const geometry = new TorusGeometry(0.8);
  const material = new MeshBasicMaterial({ map });

  boxRight = new Mesh(geometry, material);
  boxRight.position.set(3.5, 1.5, -4);
  scene.add(boxRight);

  boxLeft = new Mesh(geometry, material);
  boxLeft.position.set(-3.5, 1.5, -4);
  scene.add(boxLeft);

  // renderer

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1;
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.update();

  // post-processing

  const blurAmount = uniform(1);
  const showVelocity = uniform(0);

  const scenePass = pass(scene, camera);

  scenePass.setMRT(
    mrt({
      output,
      velocity,
    })
  );

  const beauty = scenePass.getTextureNode();
  const vel = scenePass.getTextureNode("velocity").mul(blurAmount);

  const mBlur = motionBlur(beauty, vel);

  const vignette = screenUV
    .distance(0.5)
    .remap(0.6, 1)
    .mul(2)
    .clamp()
    .oneMinus();

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputNode = mix(mBlur, vel, showVelocity).mul(vignette);

  //

  const gui = new GUI();
  gui.title("Motion Blur Settings");
  gui.add(controls, "autoRotate");
  gui.add(blurAmount, "value", 0, 3).name("blur amount");
  gui.add(params, "speed", 0, 2);
  gui.add(showVelocity, "value", 0, 1).name("show velocity");

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  stats.update();

  controls.update();

  const delta = clock.getDelta();
  const speed = params.speed;

  boxRight.rotation.y += delta * 4 * speed;
  boxLeft.scale.setScalar(1 + Math.sin(clock.elapsedTime * 10 * speed) * 0.2);

  if (model) {
    mixer.update(delta * speed);
  }

  postProcessing.render();
}
