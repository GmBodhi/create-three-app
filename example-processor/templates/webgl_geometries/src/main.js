import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  AmbientLight,
  PointLight,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  MeshPhongMaterial,
  DoubleSide,
  Mesh,
  SphereGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  PlaneGeometry,
  BoxGeometry,
  CircleGeometry,
  RingGeometry,
  CylinderGeometry,
  Vector2,
  LatheGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, stats;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.y = 400;

  scene = new Scene();

  let object;

  const ambientLight = new AmbientLight(0xcccccc, 0.4);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xffffff, 0.8);
  camera.add(pointLight);
  scene.add(camera);

  const map = new TextureLoader().load("textures/uv_grid_opengl.jpg");
  map.wrapS = map.wrapT = RepeatWrapping;
  map.anisotropy = 16;
  map.colorSpace = SRGBColorSpace;

  const material = new MeshPhongMaterial({ map: map, side: DoubleSide });

  //

  object = new Mesh(new SphereGeometry(75, 20, 10), material);
  object.position.set(-300, 0, 200);
  scene.add(object);

  object = new Mesh(new IcosahedronGeometry(75, 1), material);
  object.position.set(-100, 0, 200);
  scene.add(object);

  object = new Mesh(new OctahedronGeometry(75, 2), material);
  object.position.set(100, 0, 200);
  scene.add(object);

  object = new Mesh(new TetrahedronGeometry(75, 0), material);
  object.position.set(300, 0, 200);
  scene.add(object);

  //

  object = new Mesh(new PlaneGeometry(100, 100, 4, 4), material);
  object.position.set(-300, 0, 0);
  scene.add(object);

  object = new Mesh(new BoxGeometry(100, 100, 100, 4, 4, 4), material);
  object.position.set(-100, 0, 0);
  scene.add(object);

  object = new Mesh(new CircleGeometry(50, 20, 0, Math.PI * 2), material);
  object.position.set(100, 0, 0);
  scene.add(object);

  object = new Mesh(new RingGeometry(10, 50, 20, 5, 0, Math.PI * 2), material);
  object.position.set(300, 0, 0);
  scene.add(object);

  //

  object = new Mesh(new CylinderGeometry(25, 75, 100, 40, 5), material);
  object.position.set(-300, 0, -200);
  scene.add(object);

  const points = [];

  for (let i = 0; i < 50; i++) {
    points.push(
      new Vector2(Math.sin(i * 0.2) * Math.sin(i * 0.1) * 15 + 50, (i - 5) * 2)
    );
  }

  object = new Mesh(new LatheGeometry(points, 20), material);
  object.position.set(-100, 0, -200);
  scene.add(object);

  object = new Mesh(new TorusGeometry(50, 20, 20, 20), material);
  object.position.set(100, 0, -200);
  scene.add(object);

  object = new Mesh(new TorusKnotGeometry(50, 10, 50, 20), material);
  object.position.set(300, 0, -200);
  scene.add(object);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const timer = Date.now() * 0.0001;

  camera.position.x = Math.cos(timer) * 800;
  camera.position.z = Math.sin(timer) * 800;

  camera.lookAt(scene.position);

  scene.traverse(function (object) {
    if (object.isMesh === true) {
      object.rotation.x = timer * 5;
      object.rotation.y = timer * 2.5;
    }
  });

  renderer.render(scene, camera);
}
