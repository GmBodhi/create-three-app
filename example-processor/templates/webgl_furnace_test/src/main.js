import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  Scene,
  PerspectiveCamera,
  SphereGeometry,
  MeshPhysicalMaterial,
  Mesh,
  Color,
  PMREMGenerator,
} from "three";

let scene, camera, renderer, radianceMap;

const COLOR = 0xcccccc;

function init() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  //renderer.outputEncoding = sRGBEncoding; // optional

  window.addEventListener("resize", onWindowResize);

  document.body.addEventListener("mouseover", function () {
    scene.traverse(function (child) {
      if (child.isMesh) child.material.color.setHex(0xffffff);
    });

    render();
  });

  document.body.addEventListener("mouseout", function () {
    scene.traverse(function (child) {
      if (child.isMesh) child.material.color.setHex(0xccccff); // tinted for visibility
    });

    render();
  });

  // scene

  scene = new Scene();

  // camera
  camera = new PerspectiveCamera(40, aspect, 1, 30);
  camera.position.set(0, 0, 18);
}

function createObjects() {
  const geometry = new SphereGeometry(0.4, 32, 16);

  for (let x = 0; x <= 10; x++) {
    for (let y = 0; y <= 10; y++) {
      const material = new MeshPhysicalMaterial({
        roughness: x / 10,
        metalness: y / 10,
        color: 0xffffff,
        envMap: radianceMap,
        envMapIntensity: 1,
        transmission: 0,
        ior: 1.5,
      });

      const mesh = new Mesh(geometry, material);
      mesh.position.x = x - 5;
      mesh.position.y = 5 - y;
      scene.add(mesh);
    }
  }
}

function createEnvironment() {
  return new Promise(function (resolve) {
    const envScene = new Scene();
    envScene.background = new Color(COLOR);
    if (renderer.outputEncoding === sRGBEncoding)
      envScene.background.convertSRGBToLinear();

    const pmremGenerator = new PMREMGenerator(renderer);
    radianceMap = pmremGenerator.fromScene(envScene).texture;
    pmremGenerator.dispose();

    scene.background = radianceMap;

    resolve();
  });
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  render();
}

function render() {
  renderer.render(scene, camera);
}

Promise.resolve()
  .then(init)
  .then(createEnvironment)
  .then(createObjects)
  .then(render);
