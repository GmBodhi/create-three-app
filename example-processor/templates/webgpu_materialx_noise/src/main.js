import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Group,
  SphereGeometry,
  MeshPhysicalNodeMaterial,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  WebGPURenderer,
  ACESFilmicToneMapping,
} from "three";
import {
  normalWorld,
  time,
  mx_noise_vec3,
  mx_worley_noise_vec3,
  mx_cell_noise_float,
  mx_fractal_noise_vec3,
} from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRCubeTextureLoader } from "three/addons/loaders/HDRCubeTextureLoader.js";

let container, stats;

let camera, scene, renderer;

let particleLight;
let group;

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 100;

  scene = new Scene();

  group = new Group();
  scene.add(group);

  new HDRCubeTextureLoader()
    .setPath("textures/cube/pisaHDR/")
    .load(
      ["px.hdr", "nx.hdr", "py.hdr", "ny.hdr", "pz.hdr", "nz.hdr"],
      function (hdrTexture) {
        const geometry = new SphereGeometry(8, 64, 32);

        const customUV = normalWorld.mul(10).add(time);

        // left top

        let material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_noise_vec3(customUV);

        let mesh = new Mesh(geometry, material);
        mesh.position.x = -10;
        mesh.position.y = 10;
        group.add(mesh);

        // right top

        material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_cell_noise_float(customUV);

        mesh = new Mesh(geometry, material);
        mesh.position.x = 10;
        mesh.position.y = 10;
        group.add(mesh);

        // left bottom

        material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_worley_noise_vec3(customUV);

        mesh = new Mesh(geometry, material);
        mesh.position.x = -10;
        mesh.position.y = -10;
        group.add(mesh);

        // right bottom

        material = new MeshPhysicalNodeMaterial();
        material.colorNode = mx_fractal_noise_vec3(customUV.mul(0.2));

        mesh = new Mesh(geometry, material);
        mesh.position.x = 10;
        mesh.position.y = -10;
        group.add(mesh);

        //

        scene.background = hdrTexture;
        scene.environment = hdrTexture;
      }
    );

  // LIGHTS

  particleLight = new Mesh(
    new SphereGeometry(0.4, 8, 8),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(particleLight);

  particleLight.add(new PointLight(0xffffff, 1000));

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setAnimationLoop(animate);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  //

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
  render();

  stats.update();
}

function render() {
  const timer = Date.now() * 0.00025;

  particleLight.position.x = Math.sin(timer * 7) * 30;
  particleLight.position.y = Math.cos(timer * 5) * 40;
  particleLight.position.z = Math.cos(timer * 3) * 30;

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    child.rotation.y += 0.005;
  }

  renderer.render(scene, camera);
}
