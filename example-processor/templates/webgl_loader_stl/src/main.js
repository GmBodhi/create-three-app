import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Vector3,
  Scene,
  Color,
  Fog,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  HemisphereLight,
  WebGLRenderer,
  DirectionalLight,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { STLLoader } from "three/addons/loaders/STLLoader.js";

let container, stats;

let camera, cameraTarget, scene, renderer;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    15
  );
  camera.position.set(3, 0.15, 3);

  cameraTarget = new Vector3(0, -0.25, 0);

  scene = new Scene();
  scene.background = new Color(0x72645b);
  scene.fog = new Fog(0x72645b, 2, 15);

  // Ground

  const plane = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshPhongMaterial({ color: 0xcbcbcb, specular: 0x474747 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.5;
  scene.add(plane);

  plane.receiveShadow = true;

  // ASCII file

  const loader = new STLLoader();
  loader.load(
    "three/examples/models/stl/ascii/slotted_disk.stl",
    function (geometry) {
      const material = new MeshPhongMaterial({
        color: 0xff9c7c,
        specular: 0x494949,
        shininess: 200,
      });
      const mesh = new Mesh(geometry, material);

      mesh.position.set(0, -0.25, 0.6);
      mesh.rotation.set(0, -Math.PI / 2, 0);
      mesh.scale.set(0.5, 0.5, 0.5);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
    }
  );

  // Binary files

  const material = new MeshPhongMaterial({
    color: 0xd5d5d5,
    specular: 0x494949,
    shininess: 200,
  });

  loader.load(
    "three/examples/models/stl/binary/pr2_head_pan.stl",
    function (geometry) {
      const mesh = new Mesh(geometry, material);

      mesh.position.set(0, -0.37, -0.6);
      mesh.rotation.set(-Math.PI / 2, 0, 0);
      mesh.scale.set(2, 2, 2);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
    }
  );

  loader.load(
    "three/examples/models/stl/binary/pr2_head_tilt.stl",
    function (geometry) {
      const mesh = new Mesh(geometry, material);

      mesh.position.set(0.136, -0.37, -0.6);
      mesh.rotation.set(-Math.PI / 2, 0.3, 0);
      mesh.scale.set(2, 2, 2);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
    }
  );

  // Colored binary STL
  loader.load(
    "three/examples/models/stl/binary/colored.stl",
    function (geometry) {
      let meshMaterial = material;

      if (geometry.hasColors) {
        meshMaterial = new MeshPhongMaterial({
          opacity: geometry.alpha,
          vertexColors: true,
        });
      }

      const mesh = new Mesh(geometry, meshMaterial);

      mesh.position.set(0.5, 0.2, 0);
      mesh.rotation.set(-Math.PI / 2, Math.PI / 2, 0);
      mesh.scale.set(0.3, 0.3, 0.3);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
    }
  );

  // Lights

  scene.add(new HemisphereLight(0x8d7c7c, 0x494966));

  addShadowedLight(1, 1, 1, 0xffffff, 1.35);
  addShadowedLight(0.5, 1, -1, 0xffd500, 1);
  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = true;

  container.appendChild(renderer.domElement);

  // stats

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function addShadowedLight(x, y, z, color, intensity) {
  const directionalLight = new DirectionalLight(color, intensity);
  directionalLight.position.set(x, y, z);
  scene.add(directionalLight);

  directionalLight.castShadow = true;

  const d = 1;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;

  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 4;

  directionalLight.shadow.bias = -0.002;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const timer = Date.now() * 0.0005;

  camera.position.x = Math.cos(timer) * 3;
  camera.position.z = Math.sin(timer) * 3;

  camera.lookAt(cameraTarget);

  renderer.render(scene, camera);
}
