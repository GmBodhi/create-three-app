import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  Group,
  Vector4,
  MathUtils,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  MeshLambertMaterial,
  DoubleSide,
  Mesh,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { NURBSCurve } from "three/addons/curves/NURBSCurve.js";
import { NURBSSurface } from "three/addons/curves/NURBSSurface.js";
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";

let container, stats;

let camera, scene, renderer;
let group;

let targetRotation = 0;
let targetRotationOnPointerDown = 0;

let pointerX = 0;
let pointerXOnPointerDown = 0;

let windowHalfX = window.innerWidth / 2;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.set(0, 150, 750);

  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  scene.add(new AmbientLight(0x808080));

  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  group = new Group();
  group.position.y = 50;
  scene.add(group);

  // NURBS curve

  const nurbsControlPoints = [];
  const nurbsKnots = [];
  const nurbsDegree = 3;

  for (let i = 0; i <= nurbsDegree; i++) {
    nurbsKnots.push(0);
  }

  for (let i = 0, j = 20; i < j; i++) {
    nurbsControlPoints.push(
      new Vector4(
        Math.random() * 400 - 200,
        Math.random() * 400,
        Math.random() * 400 - 200,
        1 // weight of control point: higher means stronger attraction
      )
    );

    const knot = (i + 1) / (j - nurbsDegree);
    nurbsKnots.push(MathUtils.clamp(knot, 0, 1));
  }

  const nurbsCurve = new NURBSCurve(
    nurbsDegree,
    nurbsKnots,
    nurbsControlPoints
  );

  const nurbsGeometry = new BufferGeometry();
  nurbsGeometry.setFromPoints(nurbsCurve.getPoints(200));

  const nurbsMaterial = new LineBasicMaterial({ color: 0x333333 });

  const nurbsLine = new Line(nurbsGeometry, nurbsMaterial);
  nurbsLine.position.set(200, -100, 0);
  group.add(nurbsLine);

  const nurbsControlPointsGeometry = new BufferGeometry();
  nurbsControlPointsGeometry.setFromPoints(nurbsCurve.controlPoints);

  const nurbsControlPointsMaterial = new LineBasicMaterial({
    color: 0x333333,
    opacity: 0.25,
    transparent: true,
  });

  const nurbsControlPointsLine = new Line(
    nurbsControlPointsGeometry,
    nurbsControlPointsMaterial
  );
  nurbsControlPointsLine.position.copy(nurbsLine.position);
  group.add(nurbsControlPointsLine);

  // NURBS surface

  const nsControlPoints = [
    [
      new Vector4(-200, -200, 100, 1),
      new Vector4(-200, -100, -200, 1),
      new Vector4(-200, 100, 250, 1),
      new Vector4(-200, 200, -100, 1),
    ],
    [
      new Vector4(0, -200, 0, 1),
      new Vector4(0, -100, -100, 5),
      new Vector4(0, 100, 150, 5),
      new Vector4(0, 200, 0, 1),
    ],
    [
      new Vector4(200, -200, -100, 1),
      new Vector4(200, -100, 200, 1),
      new Vector4(200, 100, -250, 1),
      new Vector4(200, 200, 100, 1),
    ],
  ];
  const degree1 = 2;
  const degree2 = 3;
  const knots1 = [0, 0, 0, 1, 1, 1];
  const knots2 = [0, 0, 0, 0, 1, 1, 1, 1];
  const nurbsSurface = new NURBSSurface(
    degree1,
    degree2,
    knots1,
    knots2,
    nsControlPoints
  );

  const map = new TextureLoader().load("textures/uv_grid_opengl.jpg");
  map.wrapS = map.wrapT = RepeatWrapping;
  map.anisotropy = 16;
  map.colorSpace = SRGBColorSpace;

  function getSurfacePoint(u, v, target) {
    return nurbsSurface.getPoint(u, v, target);
  }

  const geometry = new ParametricGeometry(getSurfacePoint, 20, 20);
  const material = new MeshLambertMaterial({ map: map, side: DoubleSide });
  const object = new Mesh(geometry, material);
  object.position.set(-200, 100, 0);
  object.scale.multiplyScalar(1);
  group.add(object);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  container.style.touchAction = "none";
  container.addEventListener("pointerdown", onPointerDown);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function onPointerDown(event) {
  if (event.isPrimary === false) return;

  pointerXOnPointerDown = event.clientX - windowHalfX;
  targetRotationOnPointerDown = targetRotation;

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  pointerX = event.clientX - windowHalfX;

  targetRotation =
    targetRotationOnPointerDown + (pointerX - pointerXOnPointerDown) * 0.02;
}

function onPointerUp() {
  if (event.isPrimary === false) return;

  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  group.rotation.y += (targetRotation - group.rotation.y) * 0.05;
  renderer.render(scene, camera);
}
