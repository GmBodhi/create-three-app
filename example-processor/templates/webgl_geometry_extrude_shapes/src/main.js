import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  Color,
  PerspectiveCamera,
  AmbientLight,
  PointLight,
  CatmullRomCurve3,
  Vector3,
  Vector2,
  Shape,
  ExtrudeGeometry,
  MeshLambertMaterial,
  Mesh,
  MathUtils,
} from "three";

import { TrackballControls } from "three/addons/controls/TrackballControls.js";

let camera, scene, renderer, controls;

init();
animate();

function init() {
  const info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "10px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.link = "#f80";
  info.innerHTML =
    '<a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> webgl - geometry extrude shapes';
  document.body.appendChild(info);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();
  scene.background = new Color(0x222222);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 500);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 200;
  controls.maxDistance = 500;

  scene.add(new AmbientLight(0x666666));

  const light = new PointLight(0xffffff, 3, 0, 0);
  light.position.copy(camera.position);
  scene.add(light);

  //

  const closedSpline = new CatmullRomCurve3([
    new Vector3(-60, -100, 60),
    new Vector3(-60, 20, 60),
    new Vector3(-60, 120, 60),
    new Vector3(60, 20, -60),
    new Vector3(60, -100, -60),
  ]);

  closedSpline.curveType = "catmullrom";
  closedSpline.closed = true;

  const extrudeSettings1 = {
    steps: 100,
    bevelEnabled: false,
    extrudePath: closedSpline,
  };

  const pts1 = [],
    count = 3;

  for (let i = 0; i < count; i++) {
    const l = 20;

    const a = ((2 * i) / count) * Math.PI;

    pts1.push(new Vector2(Math.cos(a) * l, Math.sin(a) * l));
  }

  const shape1 = new Shape(pts1);

  const geometry1 = new ExtrudeGeometry(shape1, extrudeSettings1);

  const material1 = new MeshLambertMaterial({
    color: 0xb00000,
    wireframe: false,
  });

  const mesh1 = new Mesh(geometry1, material1);

  scene.add(mesh1);

  //

  const randomPoints = [];

  for (let i = 0; i < 10; i++) {
    randomPoints.push(
      new Vector3(
        (i - 4.5) * 50,
        MathUtils.randFloat(-50, 50),
        MathUtils.randFloat(-50, 50)
      )
    );
  }

  const randomSpline = new CatmullRomCurve3(randomPoints);

  //

  const extrudeSettings2 = {
    steps: 200,
    bevelEnabled: false,
    extrudePath: randomSpline,
  };

  const pts2 = [],
    numPts = 5;

  for (let i = 0; i < numPts * 2; i++) {
    const l = i % 2 == 1 ? 10 : 20;

    const a = (i / numPts) * Math.PI;

    pts2.push(new Vector2(Math.cos(a) * l, Math.sin(a) * l));
  }

  const shape2 = new Shape(pts2);

  const geometry2 = new ExtrudeGeometry(shape2, extrudeSettings2);

  const material2 = new MeshLambertMaterial({
    color: 0xff8000,
    wireframe: false,
  });

  const mesh2 = new Mesh(geometry2, material2);

  scene.add(mesh2);

  //

  const materials = [material1, material2];

  const extrudeSettings3 = {
    depth: 20,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 4,
    bevelSegments: 1,
  };

  const geometry3 = new ExtrudeGeometry(shape2, extrudeSettings3);

  const mesh3 = new Mesh(geometry3, materials);

  mesh3.position.set(50, 100, 50);

  scene.add(mesh3);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}
