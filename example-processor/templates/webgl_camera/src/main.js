import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  CameraHelper,
  OrthographicCamera,
  Group,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  BufferGeometry,
  MathUtils,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;
let aspect = SCREEN_WIDTH / SCREEN_HEIGHT;

let container, stats;
let camera, scene, renderer, mesh;
let cameraRig, activeCamera, activeHelper;
let cameraPerspective, cameraOrtho;
let cameraPerspectiveHelper, cameraOrthoHelper;
const frustumSize = 600;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();

  //

  camera = new PerspectiveCamera(50, 0.5 * aspect, 1, 10000);
  camera.position.z = 2500;

  cameraPerspective = new PerspectiveCamera(50, 0.5 * aspect, 150, 1000);

  cameraPerspectiveHelper = new CameraHelper(cameraPerspective);
  scene.add(cameraPerspectiveHelper);

  //
  cameraOrtho = new OrthographicCamera(
    (0.5 * frustumSize * aspect) / -2,
    (0.5 * frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    150,
    1000
  );

  cameraOrthoHelper = new CameraHelper(cameraOrtho);
  scene.add(cameraOrthoHelper);

  //

  activeCamera = cameraPerspective;
  activeHelper = cameraPerspectiveHelper;

  // counteract different front orientation of cameras vs rig

  cameraOrtho.rotation.y = Math.PI;
  cameraPerspective.rotation.y = Math.PI;

  cameraRig = new Group();

  cameraRig.add(cameraPerspective);
  cameraRig.add(cameraOrtho);

  scene.add(cameraRig);

  //

  mesh = new Mesh(
    new SphereGeometry(100, 16, 8),
    new MeshBasicMaterial({ color: 0xffffff, wireframe: true })
  );
  scene.add(mesh);

  const mesh2 = new Mesh(
    new SphereGeometry(50, 16, 8),
    new MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
  );
  mesh2.position.y = 150;
  mesh.add(mesh2);

  const mesh3 = new Mesh(
    new SphereGeometry(5, 16, 8),
    new MeshBasicMaterial({ color: 0x0000ff, wireframe: true })
  );
  mesh3.position.z = 150;
  cameraRig.add(mesh3);

  //

  const geometry = new BufferGeometry();
  const vertices = [];

  for (let i = 0; i < 10000; i++) {
    vertices.push(MathUtils.randFloatSpread(2000)); // x
    vertices.push(MathUtils.randFloatSpread(2000)); // y
    vertices.push(MathUtils.randFloatSpread(2000)); // z
  }

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));

  const particles = new Points(
    geometry,
    new PointsMaterial({ color: 0x888888 })
  );
  scene.add(particles);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  renderer.useLegacyLights = false;
  container.appendChild(renderer.domElement);

  renderer.autoClear = false;

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("keydown", onKeyDown);
}

//

function onKeyDown(event) {
  switch (event.keyCode) {
    case 79 /*O*/:
      activeCamera = cameraOrtho;
      activeHelper = cameraOrthoHelper;

      break;

    case 80 /*P*/:
      activeCamera = cameraPerspective;
      activeHelper = cameraPerspectiveHelper;

      break;
  }
}

//

function onWindowResize() {
  SCREEN_WIDTH = window.innerWidth;
  SCREEN_HEIGHT = window.innerHeight;
  aspect = SCREEN_WIDTH / SCREEN_HEIGHT;

  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

  camera.aspect = 0.5 * aspect;
  camera.updateProjectionMatrix();

  cameraPerspective.aspect = 0.5 * aspect;
  cameraPerspective.updateProjectionMatrix();

  cameraOrtho.left = (-0.5 * frustumSize * aspect) / 2;
  cameraOrtho.right = (0.5 * frustumSize * aspect) / 2;
  cameraOrtho.top = frustumSize / 2;
  cameraOrtho.bottom = -frustumSize / 2;
  cameraOrtho.updateProjectionMatrix();
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const r = Date.now() * 0.0005;

  mesh.position.x = 700 * Math.cos(r);
  mesh.position.z = 700 * Math.sin(r);
  mesh.position.y = 700 * Math.sin(r);

  mesh.children[0].position.x = 70 * Math.cos(2 * r);
  mesh.children[0].position.z = 70 * Math.sin(r);

  if (activeCamera === cameraPerspective) {
    cameraPerspective.fov = 35 + 30 * Math.sin(0.5 * r);
    cameraPerspective.far = mesh.position.length();
    cameraPerspective.updateProjectionMatrix();

    cameraPerspectiveHelper.update();
    cameraPerspectiveHelper.visible = true;

    cameraOrthoHelper.visible = false;
  } else {
    cameraOrtho.far = mesh.position.length();
    cameraOrtho.updateProjectionMatrix();

    cameraOrthoHelper.update();
    cameraOrthoHelper.visible = true;

    cameraPerspectiveHelper.visible = false;
  }

  cameraRig.lookAt(mesh.position);

  renderer.clear();

  activeHelper.visible = false;

  renderer.setViewport(0, 0, SCREEN_WIDTH / 2, SCREEN_HEIGHT);
  renderer.render(scene, activeCamera);

  activeHelper.visible = true;

  renderer.setViewport(SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2, SCREEN_HEIGHT);
  renderer.render(scene, camera);
}
