import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { texture, uv, pass, normalMap, uniform } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { TiledLighting } from "three/addons/lighting/TiledLighting.js";

import { Inspector } from "three/addons/inspector/Inspector.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";

let camera,
  scene,
  renderer,
  lights,
  lightDummy,
  controls,
  compose,
  tileInfluence,
  lighting,
  count,
  postProcessing;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );
  camera.position.z = 200;
  camera.position.y = 30;

  scene = new Scene();
  scene.fog = new Fog(0x111111, 300, 500);
  scene.background = new Color(0x111111);

  count = 1000;

  const material = new MeshBasicMaterial();

  lightDummy = new InstancedMesh(
    new SphereGeometry(0.1, 16, 8),
    material,
    count
  );
  lightDummy.instanceMatrix.setUsage(DynamicDrawUsage);
  scene.add(lightDummy);

  // lights

  lights = new Group();
  scene.add(lights);

  const addLight = (hexColor, power = 10, distance = 3) => {
    const light = new PointLight(hexColor, 1, distance);
    light.position.set(Math.random() * 300 - 150, 1, Math.random() * 300 - 150);
    light.power = power;
    light.userData.fixedPosition = light.position.clone();
    lights.add(light);

    return light;
  };

  const color = new Color();

  for (let i = 0; i < count; i++) {
    const hex = Math.random() * 0xffffff + 0x666666;

    lightDummy.setColorAt(i, color.setHex(hex));

    addLight(hex);
  }

  //

  const lightAmbient = new AmbientLight(0xffffff, 0.1);
  scene.add(lightAmbient);

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

  const uvTile = uv().mul(50);

  const planeGeometry = new PlaneGeometry(1000, 1000);
  const planeMaterial = new MeshPhongNodeMaterial({
    colorNode: texture(floorColor, uvTile),
    normalNode: normalMap(texture(floorNormal, uvTile)),
  });

  const ground = new Mesh(planeGeometry, planeMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.castShadow = true;
  ground.receiveShadow = true;
  scene.add(ground);

  // renderer

  lighting = new TiledLighting(); // ( maxLights = 1024, tileSize = 32 )

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.lighting = lighting; // set lighting system
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 5;
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxDistance = 400;

  // events

  window.addEventListener("resize", onWindowResize);

  // post processing

  const scenePass = pass(scene, camera);
  const bloomPass = bloom(scenePass, 3, 0.9, 0.2);

  // compose

  compose = scenePass.add(bloomPass);
  tileInfluence = uniform(0);

  postProcessing = new PostProcessing(renderer);

  updatePostProcessing();

  // gui

  const gui = renderer.inspector.createParameters("Settings");
  gui.add(tileInfluence, "value", 0, 1).name("tile indexes debug");
}

function updatePostProcessing() {
  // tile indexes debug, needs to be updated every time the renderer size changes

  const debugBlockIndexes = lighting
    .getNode(scene, camera)
    .setSize(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )
    .getBlock()
    .toColor()
    .div(count * 2);

  postProcessing.outputNode = compose.add(debugBlockIndexes.mul(tileInfluence));
  postProcessing.needsUpdate = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  updatePostProcessing();
}

function animate() {
  const time = performance.now() / 1000;

  for (let i = 0; i < lights.children.length; i++) {
    const light = lights.children[i];
    const lightTime = time * 0.5 + light.id;

    light.position.copy(light.userData.fixedPosition);
    light.position.x += Math.sin(lightTime * 0.7) * 3;
    light.position.y += Math.cos(lightTime * 0.5) * 0.5;
    light.position.z += Math.cos(lightTime * 0.3) * 3;

    lightDummy.setMatrixAt(i, light.matrixWorld);
  }

  postProcessing.render();
}
