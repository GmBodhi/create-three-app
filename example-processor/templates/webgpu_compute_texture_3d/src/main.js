import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  time,
  mx_noise_vec3,
  instanceIndex,
  textureStore,
  float,
  vec3,
  vec4,
  If,
  Break,
  Fn,
  smoothstep,
  texture3D,
  uniform,
} from "three/tsl";

import { RaymarchingBox } from "three/addons/tsl/utils/Raymarching.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let renderer, scene, camera;
let mesh;
let computeNode;

init();

async function init() {
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
  camera.position.set(0, 1, 1.5);

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

  const size = 200;

  const computeCloud = Fn(({ storageTexture }) => {
    const scale = float(0.05);
    const id = instanceIndex;

    const x = id.mod(size);
    const y = id.div(size).mod(size);
    const z = id.div(size * size);

    const coord3d = vec3(x, y, z);
    const centered = coord3d.sub(size / 2).div(size);
    const d = float(1.0).sub(centered.length());

    const noiseCoord = coord3d.mul(scale.div(1.5)).add(time);

    const noise = mx_noise_vec3(noiseCoord).toConst("noise");

    const data = noise.mul(d).mul(d).toConst("data");

    textureStore(storageTexture, vec3(x, y, z), vec4(vec3(data.x), 1.0));
  });

  const storageTexture = new Storage3DTexture(size, size, size);
  storageTexture.generateMipmaps = false;
  storageTexture.name = "cloud";

  computeNode = computeCloud({ storageTexture })
    .compute(size * size * size)
    .setName("computeCloud");

  // Shader

  const transparentRaymarchingTexture = Fn(
    ({
      texture,
      range = float(0.14),
      threshold = float(0.08),
      opacity = float(0.18),
      steps = float(100),
    }) => {
      const finalColor = vec4(0).toVar();

      RaymarchingBox(steps, ({ positionRay }) => {
        const mapValue = float(texture.sample(positionRay.add(0.5)).r).toVar();

        mapValue.assign(
          smoothstep(threshold.sub(range), threshold.add(range), mapValue).mul(
            opacity
          )
        );

        const shading = texture
          .sample(positionRay.add(vec3(-0.01)))
          .r.sub(texture.sample(positionRay.add(vec3(0.01))).r);

        const col = shading
          .mul(4.0)
          .add(positionRay.x.add(positionRay.y).mul(0.5))
          .add(0.3);

        finalColor.rgb.addAssign(
          finalColor.a.oneMinus().mul(mapValue).mul(col)
        );

        finalColor.a.addAssign(finalColor.a.oneMinus().mul(mapValue));

        If(finalColor.a.greaterThanEqual(0.95), () => {
          Break();
        });
      });

      return finalColor;
    }
  );

  // Material

  const baseColor = uniform(new Color(0x798aa0));
  const range = uniform(0.1);
  const threshold = uniform(0.08);
  const opacity = uniform(0.08);
  const steps = uniform(100);

  const cloud3d = transparentRaymarchingTexture({
    texture: texture3D(storageTexture, null, 0),
    range,
    threshold,
    opacity,
    steps,
  });

  const finalCloud = cloud3d.setRGB(cloud3d.rgb.add(baseColor));

  const material = new NodeMaterial();
  material.colorNode = finalCloud;
  material.side = BackSide;
  material.transparent = true;
  material.name = "transparentRaymarchingMaterial";

  mesh = new Mesh(new BoxGeometry(10, 10, 10), material);
  scene.add(mesh);

  mesh.rotation.y = Math.PI / 2;

  //

  await renderer.init();
  await renderer.computeAsync(computeNode);

  const gui = new GUI();
  gui.add(threshold, "value", 0, 1, 0.01).name("threshold");
  gui.add(opacity, "value", 0, 1, 0.01).name("opacity");
  gui.add(range, "value", 0, 1, 0.01).name("range");
  gui.add(steps, "value", 0, 200, 1).name("steps");

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.computeAsync(computeNode);
  renderer.render(scene, camera);
}
