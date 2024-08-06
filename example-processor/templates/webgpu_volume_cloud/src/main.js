import "./style.css"; // For webpack support

import {
  WebGPURenderer,
  Scene,
  PerspectiveCamera,
  CanvasTexture,
  SRGBColorSpace,
  Mesh,
  SphereGeometry,
  MeshBasicNodeMaterial,
  BackSide,
  Vector3,
  Data3DTexture,
  RedFormat,
  LinearFilter,
  BoxGeometry,
  VolumeNodeMaterial,
  Color,
} from "three";
import { vec3, materialReference, smoothstep, If, Break, Fn } from "three/tsl";

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
  camera.position.set(0, 0, 1.5);

  new OrbitControls(camera, renderer.domElement);

  // Sky

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 32;

  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 32);
  gradient.addColorStop(0.0, "#014a84");
  gradient.addColorStop(0.5, "#0561a0");
  gradient.addColorStop(1.0, "#437ab6");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1, 32);

  const skyMap = new CanvasTexture(canvas);
  skyMap.colorSpace = SRGBColorSpace;

  const sky = new Mesh(
    new SphereGeometry(10),
    new MeshBasicNodeMaterial({ map: skyMap, side: BackSide })
  );
  scene.add(sky);

  // Texture

  const size = 128;
  const data = new Uint8Array(size * size * size);

  let i = 0;
  const scale = 0.05;
  const perlin = new ImprovedNoise();
  const vector = new Vector3();

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d =
          1.0 -
          vector
            .set(x, y, z)
            .subScalar(size / 2)
            .divideScalar(size)
            .length();
        data[i] =
          (128 +
            128 *
              perlin.noise((x * scale) / 1.5, y * scale, (z * scale) / 1.5)) *
          d *
          d;
        i++;
      }
    }
  }

  const texture = new Data3DTexture(data, size, size, size);
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;

  const geometry = new BoxGeometry(1, 1, 1);

  const material = new VolumeNodeMaterial({
    side: BackSide,
    transparent: true,
  });

  material.map = texture;
  material.base = new Color(0x798aa0);
  material.steps = 100;
  material.range = 0.1;
  material.threshold = 0.25;
  material.opacity = 0.25;

  const range = materialReference("range", "float");
  const threshold = materialReference("threshold", "float");
  const opacity = materialReference("opacity", "float");

  material.testNode = Fn(({ map, mapValue, probe, finalColor }) => {
    mapValue.assign(
      smoothstep(threshold.sub(range), threshold.add(range), mapValue).mul(
        opacity
      )
    );

    const shading = map
      .uv(probe.add(vec3(-0.01)))
      .r.sub(map.uv(probe.add(vec3(0.01))).r);

    const col = shading.mul(3.0).add(probe.x.add(probe.y).mul(0.25)).add(0.2);

    finalColor.rgb.addAssign(finalColor.a.oneMinus().mul(mapValue).mul(col));

    finalColor.a.addAssign(finalColor.a.oneMinus().mul(mapValue));

    If(finalColor.a.greaterThanEqual(0.95), () => {
      Break();
    });
  });

  mesh = new Mesh(geometry, material);

  scene.add(mesh);

  //

  const parameters = {
    threshold: 0.25,
    opacity: 0.25,
    range: 0.1,
    steps: 100,
  };

  function update() {
    material.threshold = parameters.threshold;
    material.opacity = parameters.opacity;
    material.range = parameters.range;
    material.steps = parameters.steps;
  }

  const gui = new GUI();
  gui.add(parameters, "threshold", 0, 1, 0.01).onChange(update);
  gui.add(parameters, "opacity", 0, 1, 0.01).onChange(update);
  gui.add(parameters, "range", 0, 1, 0.01).onChange(update);
  gui.add(parameters, "steps", 0, 200, 1).onChange(update);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  mesh.rotation.y = -performance.now() / 7500;

  renderer.render(scene, camera);
}
