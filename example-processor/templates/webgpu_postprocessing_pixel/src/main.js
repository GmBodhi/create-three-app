import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { uniform } from "three/tsl";
import { pixelationPass } from "three/addons/tsl/display/PixelationPassNode.js";

let camera, scene, renderer, postProcessing, crystalMesh, clock;
let gui, effectController;

init();

function init() {
  const aspectRatio = window.innerWidth / window.innerHeight;

  camera = new OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0.1, 10);
  camera.position.y = 2 * Math.tan(Math.PI / 6);
  camera.position.z = 2;

  scene = new Scene();
  scene.background = new Color(0x151729);

  clock = new Clock();

  // textures

  const loader = new TextureLoader();
  const texChecker = pixelTexture(loader.load("textures/checker.png"));
  const texChecker2 = pixelTexture(loader.load("textures/checker.png"));
  texChecker.repeat.set(3, 3);
  texChecker2.repeat.set(1.5, 1.5);

  // meshes

  const boxMaterial = new MeshPhongMaterial({ map: texChecker2 });

  function addBox(boxSideLength, x, z, rotation) {
    const mesh = new Mesh(
      new BoxGeometry(boxSideLength, boxSideLength, boxSideLength),
      boxMaterial
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = rotation;
    mesh.position.y = boxSideLength / 2;
    mesh.position.set(x, boxSideLength / 2 + 0.0001, z);
    scene.add(mesh);
    return mesh;
  }

  addBox(0.4, 0, 0, Math.PI / 4);
  addBox(0.5, -0.5, -0.5, Math.PI / 4);

  const planeSideLength = 2;
  const planeMesh = new Mesh(
    new PlaneGeometry(planeSideLength, planeSideLength),
    new MeshPhongMaterial({ map: texChecker })
  );
  planeMesh.receiveShadow = true;
  planeMesh.rotation.x = -Math.PI / 2;
  scene.add(planeMesh);

  const radius = 0.2;
  const geometry = new IcosahedronGeometry(radius);
  crystalMesh = new Mesh(
    geometry,
    new MeshPhongMaterial({
      color: 0x68b7e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff,
    })
  );
  crystalMesh.receiveShadow = true;
  crystalMesh.castShadow = true;
  scene.add(crystalMesh);

  // lights

  scene.add(new AmbientLight(0x757f8e, 3));

  const directionalLight = new DirectionalLight(0xfffecd, 1.5);
  directionalLight.position.set(100, 100, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.bias = -0.0001;
  scene.add(directionalLight);

  const spotLight = new SpotLight(0xffc100, 10, 10, Math.PI / 16, 0.02, 2);
  spotLight.position.set(2, 2, 0);
  const target = spotLight.target;
  scene.add(target);
  target.position.set(0, 0, 0);
  spotLight.castShadow = true;
  spotLight.shadow.bias = -0.001;
  scene.add(spotLight);

  renderer = new WebGPURenderer();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = BasicShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  effectController = {
    pixelSize: uniform(6),
    normalEdgeStrength: uniform(0.3),
    depthEdgeStrength: uniform(0.4),
    pixelAlignedPanning: true,
  };

  postProcessing = new PostProcessing(renderer);
  const scenePass = pixelationPass(
    scene,
    camera,
    effectController.pixelSize,
    effectController.normalEdgeStrength,
    effectController.depthEdgeStrength
  );
  postProcessing.outputNode = scenePass;

  window.addEventListener("resize", onWindowResize);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxZoom = 2;

  // gui

  gui = new GUI();
  gui.add(effectController.pixelSize, "value", 1, 16, 1).name("Pixel Size");
  gui
    .add(effectController.normalEdgeStrength, "value", 0, 2, 0.05)
    .name("Normal Edge Strength");
  gui
    .add(effectController.depthEdgeStrength, "value", 0, 1, 0.05)
    .name("Depth Edge Strength");
  gui.add(effectController, "pixelAlignedPanning");
}

function onWindowResize() {
  const aspectRatio = window.innerWidth / window.innerHeight;
  camera.left = -aspectRatio;
  camera.right = aspectRatio;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const t = clock.getElapsedTime();

  crystalMesh.material.emissiveIntensity = Math.sin(t * 3) * 0.5 + 0.5;
  crystalMesh.position.y = 0.7 + Math.sin(t * 2) * 0.05;
  crystalMesh.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI;

  const rendererSize = renderer.getSize(new Vector2());
  const aspectRatio = rendererSize.x / rendererSize.y;

  if (effectController.pixelAlignedPanning) {
    const pixelSize = effectController.pixelSize.value;

    pixelAlignFrustum(
      camera,
      aspectRatio,
      Math.floor(rendererSize.x / pixelSize),
      Math.floor(rendererSize.y / pixelSize)
    );
  } else if (camera.left != -aspectRatio || camera.top != 1.0) {
    // Reset the Camera Frustum if it has been modified
    camera.left = -aspectRatio;
    camera.right = aspectRatio;
    camera.top = 1.0;
    camera.bottom = -1.0;
    camera.updateProjectionMatrix();
  }

  postProcessing.render();
}

// Helper functions

function pixelTexture(texture) {
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function easeInOutCubic(x) {
  return x ** 2 * 3 - x ** 3 * 2;
}

function linearStep(x, edge0, edge1) {
  const w = edge1 - edge0;
  const m = 1 / w;
  const y0 = -m * edge0;
  return MathUtils.clamp(y0 + m * x, 0, 1);
}

function stopGoEased(x, downtime, period) {
  const cycle = (x / period) | 0;
  const tween = x - cycle * period;
  const linStep = easeInOutCubic(linearStep(tween, downtime, period));
  return cycle + linStep;
}

function pixelAlignFrustum(
  camera,
  aspectRatio,
  pixelsPerScreenWidth,
  pixelsPerScreenHeight
) {
  // 0. Get Pixel Grid Units
  const worldScreenWidth = (camera.right - camera.left) / camera.zoom;
  const worldScreenHeight = (camera.top - camera.bottom) / camera.zoom;
  const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
  const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

  // 1. Project the current camera position along its local rotation bases
  const camPos = new Vector3();
  camera.getWorldPosition(camPos);
  const camRot = new Quaternion();
  camera.getWorldQuaternion(camRot);
  const camRight = new Vector3(1.0, 0.0, 0.0).applyQuaternion(camRot);
  const camUp = new Vector3(0.0, 1.0, 0.0).applyQuaternion(camRot);
  const camPosRight = camPos.dot(camRight);
  const camPosUp = camPos.dot(camUp);

  // 2. Find how far along its position is along these bases in pixel units
  const camPosRightPx = camPosRight / pixelWidth;
  const camPosUpPx = camPosUp / pixelHeight;

  // 3. Find the fractional pixel units and convert to world units
  const fractX = camPosRightPx - Math.round(camPosRightPx);
  const fractY = camPosUpPx - Math.round(camPosUpPx);

  // 4. Add fractional world units to the left/right top/bottom to align with the pixel grid
  camera.left = -aspectRatio - fractX * pixelWidth;
  camera.right = aspectRatio - fractX * pixelWidth;
  camera.top = 1.0 - fractY * pixelHeight;
  camera.bottom = -1.0 - fractY * pixelHeight;
  camera.updateProjectionMatrix();
}
