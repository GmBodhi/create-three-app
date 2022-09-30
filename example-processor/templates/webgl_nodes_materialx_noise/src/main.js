import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Group,
  SphereGeometry,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  WebGLRenderer,
  ACESFilmicToneMapping,
  sRGBEncoding,
} from "three";
import {
  MeshPhysicalNodeMaterial,
  add,
  mul,
  normalWorld,
  timerLocal,
  mx_noise_vec3,
  mx_worley_noise_vec3,
  mx_cell_noise_float,
  mx_fractal_noise_vec3,
} from "three/nodes";

import { nodeFrame } from "three/addons/renderers/webgl/nodes/WebGLNodes.js";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRCubeTextureLoader } from "three/addons/loaders/HDRCubeTextureLoader.js";

let container, stats;

let camera, scene, renderer;

let particleLight;
let group;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 1000;

  scene = new Scene();

  group = new Group();
  scene.add(group);

  new HDRCubeTextureLoader()
    .setPath("textures/cube/pisaHDR/")
    .load(
      ["px.hdr", "nx.hdr", "py.hdr", "ny.hdr", "pz.hdr", "nz.hdr"],
      function (hdrTexture) {
        const geometry = new SphereGeometry(80, 64, 32);

        const offsetNode = timerLocal();
        const customUV = add(mul(normalWorld, 10), offsetNode);

        // left top

        let material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_noise_vec3(customUV);

        let mesh = new Mesh(geometry, material);
        mesh.position.x = -100;
        mesh.position.y = 100;
        group.add(mesh);

        // right top

        material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_cell_noise_float(customUV);

        mesh = new Mesh(geometry, material);
        mesh.position.x = 100;
        mesh.position.y = 100;
        group.add(mesh);

        // left bottom

        material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_worley_noise_vec3(customUV);

        mesh = new Mesh(geometry, material);
        mesh.position.x = -100;
        mesh.position.y = -100;
        group.add(mesh);

        // right bottom

        material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_fractal_noise_vec3(mul(customUV, 0.2));

        mesh = new Mesh(geometry, material);
        mesh.position.x = 100;
        mesh.position.y = -100;
        group.add(mesh);

        //

        scene.background = hdrTexture;
        scene.environment = hdrTexture;
      }
    );

  // LIGHTS

  particleLight = new Mesh(
    new SphereGeometry(4, 8, 8),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(particleLight);

  particleLight.add(new PointLight(0xffffff, 1));

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  //

  renderer.outputEncoding = sRGBEncoding;

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // EVENTS

  new OrbitControls(camera, renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

//

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

//

function animate() {
  requestAnimationFrame(animate);

  nodeFrame.update();

  render();

  stats.update();
}

function render() {
  const timer = Date.now() * 0.00025;

  particleLight.position.x = Math.sin(timer * 7) * 300;
  particleLight.position.y = Math.cos(timer * 5) * 400;
  particleLight.position.z = Math.cos(timer * 3) * 300;

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    child.rotation.y += 0.005;
  }

  renderer.render(scene, camera);
}
