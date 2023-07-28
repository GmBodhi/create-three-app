import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  OrthographicCamera,
  Scene,
  GridHelper,
  AmbientLight,
  DirectionalLight,
  TextureLoader,
  SRGBColorSpace,
  BoxGeometry,
  MeshLambertMaterial,
  Mesh,
  MathUtils,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, control, orbit;

init();
render();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const aspect = window.innerWidth / window.innerHeight;

  cameraPersp = new PerspectiveCamera(50, aspect, 0.01, 30000);
  cameraOrtho = new OrthographicCamera(
    -600 * aspect,
    600 * aspect,
    600,
    -600,
    0.01,
    30000
  );
  currentCamera = cameraPersp;

  currentCamera.position.set(5, 2.5, 5);

  scene = new Scene();
  scene.add(new GridHelper(5, 10, 0x888888, 0x444444));

  const ambientLight = new AmbientLight(0xffffff);
  scene.add(ambientLight);

  const light = new DirectionalLight(0xffffff, 4);
  light.position.set(1, 1, 1);
  scene.add(light);

  const texture = new TextureLoader().load("textures/crate.gif", render);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const geometry = new BoxGeometry();
  const material = new MeshLambertMaterial({ map: texture });

  orbit = new OrbitControls(currentCamera, renderer.domElement);
  orbit.update();
  orbit.addEventListener("change", render);

  control = new TransformControls(currentCamera, renderer.domElement);
  control.addEventListener("change", render);

  control.addEventListener("dragging-changed", function (event) {
    orbit.enabled = !event.value;
  });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  control.attach(mesh);
  scene.add(control);

  window.addEventListener("resize", onWindowResize);

  window.addEventListener("keydown", function (event) {
    switch (event.keyCode) {
      case 81: // Q
        control.setSpace(control.space === "local" ? "world" : "local");
        break;

      case 16: // Shift
        control.setTranslationSnap(100);
        control.setRotationSnap(MathUtils.degToRad(15));
        control.setScaleSnap(0.25);
        break;

      case 87: // W
        control.setMode("translate");
        break;

      case 69: // E
        control.setMode("rotate");
        break;

      case 82: // R
        control.setMode("scale");
        break;

      case 67: // C
        const position = currentCamera.position.clone();

        currentCamera = currentCamera.isPerspectiveCamera
          ? cameraOrtho
          : cameraPersp;
        currentCamera.position.copy(position);

        orbit.object = currentCamera;
        control.camera = currentCamera;

        currentCamera.lookAt(orbit.target.x, orbit.target.y, orbit.target.z);
        onWindowResize();
        break;

      case 86: // V
        const randomFoV = Math.random() + 0.1;
        const randomZoom = Math.random() + 0.1;

        cameraPersp.fov = randomFoV * 160;
        cameraOrtho.bottom = -randomFoV * 500;
        cameraOrtho.top = randomFoV * 500;

        cameraPersp.zoom = randomZoom * 5;
        cameraOrtho.zoom = randomZoom * 5;
        onWindowResize();
        break;

      case 187:
      case 107: // +, =, num+
        control.setSize(control.size + 0.1);
        break;

      case 189:
      case 109: // -, _, num-
        control.setSize(Math.max(control.size - 0.1, 0.1));
        break;

      case 88: // X
        control.showX = !control.showX;
        break;

      case 89: // Y
        control.showY = !control.showY;
        break;

      case 90: // Z
        control.showZ = !control.showZ;
        break;

      case 32: // Spacebar
        control.enabled = !control.enabled;
        break;

      case 27: // Esc
        control.reset();
        break;
    }
  });

  window.addEventListener("keyup", function (event) {
    switch (event.keyCode) {
      case 16: // Shift
        control.setTranslationSnap(null);
        control.setRotationSnap(null);
        control.setScaleSnap(null);
        break;
    }
  });
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;

  cameraPersp.aspect = aspect;
  cameraPersp.updateProjectionMatrix();

  cameraOrtho.left = cameraOrtho.bottom * aspect;
  cameraOrtho.right = cameraOrtho.top * aspect;
  cameraOrtho.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, currentCamera);
}
