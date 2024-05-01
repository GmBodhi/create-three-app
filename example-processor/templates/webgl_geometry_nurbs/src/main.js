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
import { NURBSVolume } from "three/addons/curves/NURBSVolume.js";
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

  scene.add(new AmbientLight(0xffffff));

  const light = new DirectionalLight(0xffffff, 3);
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
  nurbsLine.position.set(0, -100, 0);
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
  {
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
    object.position.set(-400, 100, 0);
    object.scale.multiplyScalar(1);
    group.add(object);
  }

  // NURBS volume
  {
    const nsControlPoints = [
      [
        [new Vector4(-200, -200, -200, 1), new Vector4(-200, -200, 200, 1)],
        [new Vector4(-200, -100, -200, 1), new Vector4(-200, -100, 200, 1)],
        [new Vector4(-200, 100, -200, 1), new Vector4(-200, 100, 200, 1)],
        [new Vector4(-200, 200, -200, 1), new Vector4(-200, 200, 200, 1)],
      ],
      [
        [new Vector4(0, -200, -200, 1), new Vector4(0, -200, 200, 1)],
        [new Vector4(0, -100, -200, 1), new Vector4(0, -100, 200, 1)],
        [new Vector4(0, 100, -200, 1), new Vector4(0, 100, 200, 1)],
        [new Vector4(0, 200, -200, 1), new Vector4(0, 200, 200, 1)],
      ],
      [
        [new Vector4(200, -200, -200, 1), new Vector4(200, -200, 200, 1)],
        [new Vector4(200, -100, 0, 1), new Vector4(200, -100, 100, 1)],
        [new Vector4(200, 100, 0, 1), new Vector4(200, 100, 100, 1)],
        [new Vector4(200, 200, 0, 1), new Vector4(200, 200, 100, 1)],
      ],
    ];
    const degree1 = 2;
    const degree2 = 3;
    const degree3 = 1;
    const knots1 = [0, 0, 0, 1, 1, 1];
    const knots2 = [0, 0, 0, 0, 1, 1, 1, 1];
    const knots3 = [0, 0, 1, 1];
    const nurbsVolume = new NURBSVolume(
      degree1,
      degree2,
      degree3,
      knots1,
      knots2,
      knots3,
      nsControlPoints
    );

    const map = new TextureLoader().load("textures/uv_grid_opengl.jpg");
    map.wrapS = map.wrapT = RepeatWrapping;
    map.anisotropy = 16;
    map.colorSpace = SRGBColorSpace;

    // Since ParametricGeometry() only support bi-variate parametric geometries
    // we create evaluation functions for different surfaces with one of the three
    // parameter values (u, v, w) kept constant and create multiple Mesh
    // objects one for each surface
    function getSurfacePointFront(u, v, target) {
      return nurbsVolume.getPoint(u, v, 0, target);
    }

    function getSurfacePointMiddle(u, v, target) {
      return nurbsVolume.getPoint(u, v, 0.5, target);
    }

    function getSurfacePointBack(u, v, target) {
      return nurbsVolume.getPoint(u, v, 1, target);
    }

    function getSurfacePointTop(u, w, target) {
      return nurbsVolume.getPoint(u, 1, w, target);
    }

    function getSurfacePointSide(v, w, target) {
      return nurbsVolume.getPoint(0, v, w, target);
    }

    const geometryFront = new ParametricGeometry(getSurfacePointFront, 20, 20);
    const materialFront = new MeshLambertMaterial({
      map: map,
      side: DoubleSide,
    });
    const objectFront = new Mesh(geometryFront, materialFront);
    objectFront.position.set(400, 100, 0);
    objectFront.scale.multiplyScalar(0.5);
    group.add(objectFront);

    const geometryMiddle = new ParametricGeometry(
      getSurfacePointMiddle,
      20,
      20
    );
    const materialMiddle = new MeshLambertMaterial({
      map: map,
      side: DoubleSide,
    });
    const objectMiddle = new Mesh(geometryMiddle, materialMiddle);
    objectMiddle.position.set(400, 100, 0);
    objectMiddle.scale.multiplyScalar(0.5);
    group.add(objectMiddle);

    const geometryBack = new ParametricGeometry(getSurfacePointBack, 20, 20);
    const materialBack = new MeshLambertMaterial({
      map: map,
      side: DoubleSide,
    });
    const objectBack = new Mesh(geometryBack, materialBack);
    objectBack.position.set(400, 100, 0);
    objectBack.scale.multiplyScalar(0.5);
    group.add(objectBack);

    const geometryTop = new ParametricGeometry(getSurfacePointTop, 20, 20);
    const materialTop = new MeshLambertMaterial({ map: map, side: DoubleSide });
    const objectTop = new Mesh(geometryTop, materialTop);
    objectTop.position.set(400, 100, 0);
    objectTop.scale.multiplyScalar(0.5);
    group.add(objectTop);

    const geometrySide = new ParametricGeometry(getSurfacePointSide, 20, 20);
    const materialSide = new MeshLambertMaterial({
      map: map,
      side: DoubleSide,
    });
    const objectSide = new Mesh(geometrySide, materialSide);
    objectSide.position.set(400, 100, 0);
    objectSide.scale.multiplyScalar(0.5);
    group.add(objectSide);
  }

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
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
  render();
  stats.update();
}

function render() {
  group.rotation.y += (targetRotation - group.rotation.y) * 0.05;
  renderer.render(scene, camera);
}
