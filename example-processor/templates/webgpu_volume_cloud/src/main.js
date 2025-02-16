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
  Color,
  NodeMaterial,
  BoxGeometry,
} from "three";
import {
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

  // Shader

  const transparentRaymarchingTexture = Fn(
    ({
      texture,
      range = float(0.1),
      threshold = float(0.25),
      opacity = float(0.25),
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
          .mul(3.0)
          .add(positionRay.x.add(positionRay.y).mul(0.25))
          .add(0.2);

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
  const threshold = uniform(0.25);
  const opacity = uniform(0.25);
  const steps = uniform(100);

  const cloud3d = transparentRaymarchingTexture({
    texture: texture3D(texture, null, 0),
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

  mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
  scene.add(mesh);

  //

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
  mesh.rotation.y = -performance.now() / 7500;

  renderer.render(scene, camera);
}
