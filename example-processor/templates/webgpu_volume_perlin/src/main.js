import "./style.css"; // For webpack support

import {
  WebGPURenderer,
  Scene,
  PerspectiveCamera,
  Vector3,
  Data3DTexture,
  RedFormat,
  LinearFilter,
  BoxGeometry,
  VolumeNodeMaterial,
  BackSide,
  Color,
  Mesh,
} from "three";
import { Break, If, vec3, materialReference, Fn } from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let renderer, scene, camera;
let mesh;

init();

function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 2);

  new OrbitControls(camera, renderer.domElement);

  // Texture

  const size = 128;
  const data = new Uint8Array(size * size * size);

  let i = 0;
  const perlin = new ImprovedNoise();
  const vector = new Vector3();

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        vector.set(x, y, z).divideScalar(size);

        const d = perlin.noise(vector.x * 6.5, vector.y * 6.5, vector.z * 6.5);

        data[i++] = d * 128 + 128;
      }
    }
  }

  const texture = new Data3DTexture(data, size, size, size);
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;

  // Material

  const geometry = new BoxGeometry(1, 1, 1);
  const material = new VolumeNodeMaterial({
    side: BackSide,
  });

  material.base = new Color(0x798aa0);
  material.map = texture;
  material.steps = 200;
  material.threshold = 0.6;

  const threshold = materialReference("threshold", "float");

  material.testNode = Fn(({ map, mapValue, probe, finalColor }) => {
    If(mapValue.greaterThan(threshold), () => {
      const p = vec3(probe).add(0.5);

      finalColor.rgb.assign(
        map.normal(p).mul(0.5).add(probe.mul(1.5).add(0.25))
      );
      finalColor.a.assign(1);
      Break();
    });
  });

  mesh = new Mesh(geometry, material);

  scene.add(mesh);

  //

  const parameters = { threshold: 0.6, steps: 200 };

  function update() {
    material.threshold = parameters.threshold;
    material.steps = parameters.steps;
  }

  const gui = new GUI();
  gui.add(parameters, "threshold", 0, 1, 0.01).onChange(update);
  gui.add(parameters, "steps", 0, 300, 1).onChange(update);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.render(scene, camera);
}
