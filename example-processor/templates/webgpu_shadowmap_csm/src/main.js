import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { CSMShadowNode } from "three/addons/csm/CSMShadowNode.js";
import { CSMHelper } from "three/addons/csm/CSMHelper.js";

let renderer,
  scene,
  camera,
  orthoCamera,
  controls,
  csm,
  csmHelper,
  csmDirectionalLight;

const params = {
  orthographic: false,
  fade: false,
  shadows: true,
  maxFar: 1000,
  mode: "practical",
  lightX: -1,
  lightY: -1,
  lightZ: -1,
  margin: 100,
  shadowNear: 1,
  shadowFar: 2000,
  autoUpdateHelper: true,
  updateHelper: function () {
    csmHelper.update();
  },
};

init();

function updateOrthoCamera() {
  const size = controls.target.distanceTo(camera.position);
  const aspect = camera.aspect;

  orthoCamera.left = (size * aspect) / -2;
  orthoCamera.right = (size * aspect) / 2;

  orthoCamera.top = size / 2;
  orthoCamera.bottom = size / -2;
  orthoCamera.position.copy(camera.position);
  orthoCamera.rotation.copy(camera.rotation);
  orthoCamera.updateProjectionMatrix();
}

function init() {
  scene = new Scene();
  scene.background = new Color("#454e61");
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  orthoCamera = new OrthographicCamera();

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = params.shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2;
  camera.position.set(60, 60, 0);
  controls.target = new Vector3(-100, 10, 0);
  controls.update();

  const ambientLight = new AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const additionalDirectionalLight = new DirectionalLight(0x000020, 1.5);
  additionalDirectionalLight.position
    .set(params.lightX, params.lightY, params.lightZ)
    .normalize()
    .multiplyScalar(-200);
  scene.add(additionalDirectionalLight);

  csmDirectionalLight = new DirectionalLight(0xffffff, 3.0);

  csmDirectionalLight.castShadow = true;
  csmDirectionalLight.shadow.mapSize.width = 2048;
  csmDirectionalLight.shadow.mapSize.height = 2048;
  csmDirectionalLight.shadow.camera.near = params.shadowNear;
  csmDirectionalLight.shadow.camera.far = params.shadowFar;
  csmDirectionalLight.shadow.camera.top = 1000;
  csmDirectionalLight.shadow.camera.bottom = -1000;
  csmDirectionalLight.shadow.camera.left = -1000;
  csmDirectionalLight.shadow.camera.right = 1000;
  csmDirectionalLight.shadow.bias = -0.001;

  csm = new CSMShadowNode(csmDirectionalLight, {
    cascades: 4,
    maxFar: params.maxFar,
    mode: params.mode,
  });

  csmDirectionalLight.position
    .set(params.lightX, params.lightY, params.lightZ)
    .normalize()
    .multiplyScalar(-200);

  csmDirectionalLight.shadow.shadowNode = csm;

  scene.add(csmDirectionalLight);

  csmHelper = new CSMHelper(csm);
  csmHelper.visible = false;
  scene.add(csmHelper);

  const floorMaterial = new MeshPhongMaterial({ color: "#252a34" });

  const floor = new Mesh(new PlaneGeometry(10000, 10000, 8, 8), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = true;
  floor.receiveShadow = true;
  scene.add(floor);

  const material1 = new MeshPhongMaterial({ color: "#08d9d6" });

  const material2 = new MeshPhongMaterial({ color: "#ff2e63" });

  const geometry = new BoxGeometry(10, 10, 10);

  for (let i = 0; i < 40; i++) {
    const cube1 = new Mesh(geometry, i % 2 === 0 ? material1 : material2);
    cube1.castShadow = true;
    cube1.receiveShadow = true;
    scene.add(cube1);
    cube1.position.set(-i * 25, 20, 30);
    cube1.scale.y = Math.random() * 2 + 6;

    const cube2 = new Mesh(geometry, i % 2 === 0 ? material2 : material1);
    cube2.castShadow = true;
    cube2.receiveShadow = true;
    scene.add(cube2);
    cube2.position.set(-i * 25, 20, -30);
    cube2.scale.y = Math.random() * 2 + 6;
  }

  const gui = new GUI();

  gui.add(params, "orthographic").onChange(function (value) {
    csm.camera = value ? orthoCamera : camera;
    csm.updateFrustums();
  });

  // gui.add( params, 'fade' ).onChange( function ( value ) {

  // csm.fade = value;
  // csm.updateFrustums();
  // TODO: Changing "fade" requires toggling shadows right now

  // } );

  gui.add(params, "shadows").onChange(function (value) {
    csmDirectionalLight.castShadow = value;
  });

  gui
    .add(params, "maxFar", 1, 5000)
    .step(1)
    .name("max shadow far")
    .onChange(function (value) {
      csm.maxFar = value;
      csm.updateFrustums();
    });

  gui
    .add(params, "mode", ["uniform", "logarithmic", "practical"])
    .name("frustum split mode")
    .onChange(function (value) {
      csm.mode = value;
      csm.updateFrustums();
    });

  gui
    .add(params, "lightX", -1, 1)
    .name("light direction x")
    .onChange(function () {
      csmDirectionalLight.position
        .set(params.lightX, params.lightY, params.lightZ)
        .normalize()
        .multiplyScalar(-200);
    });

  gui
    .add(params, "lightY", -1, 1)
    .name("light direction y")
    .onChange(function () {
      csmDirectionalLight.position
        .set(params.lightX, params.lightY, params.lightZ)
        .normalize()
        .multiplyScalar(-200);
    });

  gui
    .add(params, "lightZ", -1, 1)
    .name("light direction z")
    .onChange(function () {
      csmDirectionalLight.position
        .set(params.lightX, params.lightY, params.lightZ)
        .normalize()
        .multiplyScalar(-200);
    });

  gui
    .add(params, "margin", 0, 200)
    .name("light margin")
    .onChange(function (value) {
      csm.lightMargin = value;
    });

  gui
    .add(params, "shadowNear", 1, 10000)
    .name("shadow near")
    .onChange(function (value) {
      for (let i = 0; i < csm.lights.length; i++) {
        csm.lights[i].shadow.camera.near = value;
        csm.lights[i].shadow.camera.updateProjectionMatrix();
      }
    });

  gui
    .add(params, "shadowFar", 1, 10000)
    .name("shadow far")
    .onChange(function (value) {
      for (let i = 0; i < csm.lights.length; i++) {
        csm.lights[i].shadow.camera.far = value;
        csm.lights[i].shadow.camera.updateProjectionMatrix();
      }
    });

  const helperFolder = gui.addFolder("helper");

  helperFolder.add(csmHelper, "visible");

  helperFolder.add(csmHelper, "displayFrustum").onChange(function () {
    csmHelper.updateVisibility();
  });

  helperFolder.add(csmHelper, "displayPlanes").onChange(function () {
    csmHelper.updateVisibility();
  });

  helperFolder.add(csmHelper, "displayShadowBounds").onChange(function () {
    csmHelper.updateVisibility();
  });

  helperFolder.add(params, "autoUpdateHelper").name("auto update");

  helperFolder.add(params, "updateHelper").name("update");

  helperFolder.open();

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    updateOrthoCamera();
    csm.updateFrustums();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  camera.updateMatrixWorld();
  controls.update();

  if (params.orthographic) {
    updateOrthoCamera();
    csm.updateFrustums();

    if (params.autoUpdateHelper) {
      csmHelper.update();
    }

    renderer.render(scene, orthoCamera);
  } else {
    if (params.autoUpdateHelper) {
      csmHelper.update();
    }

    renderer.render(scene, camera);
  }
}
