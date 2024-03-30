import "./style.css"; // For webpack support

import {
  Clock,
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  InstancedMesh,
  AnimationMixer,
} from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import Stats from "three/addons/libs/stats.module.js";

import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";
import { MeshStandardNodeMaterial } from "three/nodes";

let camera, scene, renderer, stats, mesh, mixer, dummy;

const offset = 5000;

const timeOffsets = new Float32Array(1024);

for (let i = 0; i < 1024; i++) {
  timeOffsets[i] = Math.random() * 3;
}

const clock = new Clock(true);

init();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    100,
    10000
  );

  scene = new Scene();

  scene.background = new Color(0x99ddff);

  scene.fog = new Fog(0x99ddff, 5000, 10000);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  const light = new DirectionalLight(0xffffff, 1);

  light.position.set(200, 1000, 50);

  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.castShadow = true;

  light.shadow.camera.left = -5000;
  light.shadow.camera.right = 5000;
  light.shadow.camera.top = 5000;
  light.shadow.camera.bottom = -5000;
  light.shadow.camera.far = 2000;

  light.shadow.bias = -0.01;

  light.shadow.camera.updateProjectionMatrix();

  scene.add(light);

  const hemi = new HemisphereLight(0x99ddff, 0x669933, 1 / 3);

  scene.add(hemi);

  const ground = new Mesh(
    new PlaneGeometry(1000000, 1000000),
    new MeshStandardMaterial({ color: 0x669933 })
  );

  ground.rotation.x = -Math.PI / 2;

  ground.receiveShadow = true;

  scene.add(ground);

  const loader = new GLTFLoader();

  loader.load("models/gltf/Horse.glb", function (glb) {
    dummy = glb.scene.children[0];

    mesh = new InstancedMesh(
      dummy.geometry,
      new MeshStandardNodeMaterial({
        flatShading: true,
      }),
      1024
    );

    mesh.castShadow = true;

    for (let x = 0, i = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
        dummy.position.set(
          offset - 300 * x + 200 * Math.random(),
          0,
          offset - 300 * y
        );

        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);

        mesh.setColorAt(i, new Color(`hsl(${Math.random() * 360}, 50%, 66%)`));

        i++;
      }
    }

    scene.add(mesh);

    mixer = new AnimationMixer(glb.scene);

    const action = mixer.clipAction(glb.animations[0]);

    action.play();
  });

  // renderer

  renderer = new WebGPURenderer({ antialias: true });

  renderer.setAnimationLoop(animate);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  const time = clock.getElapsedTime();

  const r = 3000;
  camera.position.set(
    Math.sin(time / 10) * r,
    1500 + 1000 * Math.cos(time / 5),
    Math.cos(time / 10) * r
  );
  camera.lookAt(0, 0, 0);

  if (mesh) {
    for (let i = 0; i < 1024; i++) {
      mixer.setTime(time + timeOffsets[i]);

      mesh.setMorphAt(i, dummy);
    }

    mesh.morphTexture.needsUpdate = true;
  }

  renderer.render(scene, camera);

  stats.update();
}
