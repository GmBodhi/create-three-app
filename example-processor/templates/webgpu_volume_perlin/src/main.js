import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { Break, If, vec3, vec4, texture3D, uniform, Fn } from "three/tsl";

import { RaymarchingBox } from "three/addons/tsl/utils/Raymarching.js";

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

  // Shader

  const opaqueRaymarchingTexture = Fn(({ texture, steps, threshold }) => {
    const finalColor = vec4(0).toVar();

    RaymarchingBox(steps, ({ positionRay }) => {
      const mapValue = texture.sample(positionRay.add(0.5)).r.toVar();

      If(mapValue.greaterThan(threshold), () => {
        const p = vec3(positionRay).add(0.5);

        finalColor.rgb.assign(
          texture.normal(p).mul(0.5).add(positionRay.mul(1.5).add(0.25))
        );
        finalColor.a.assign(1);
        Break();
      });
    });

    return finalColor;
  });

  //

  const threshold = uniform(0.6);
  const steps = uniform(200);

  const material = new NodeMaterial();
  material.colorNode = opaqueRaymarchingTexture({
    texture: texture3D(texture, null, 0),
    steps,
    threshold,
  });
  material.side = BackSide;
  material.transparent = true;

  mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
  scene.add(mesh);

  //

  const gui = new GUI();
  gui.add(threshold, "value", 0, 1, 0.01).name("threshold");
  gui.add(steps, "value", 0, 300, 1).name("steps");

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
