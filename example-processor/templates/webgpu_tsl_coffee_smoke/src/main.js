import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  PlaneGeometry,
  RepeatWrapping,
  MeshBasicNodeMaterial,
  DoubleSide,
  Mesh,
  WebGPURenderer,
} from "three";
import {
  mix,
  mul,
  positionLocal,
  smoothstep,
  texture,
  timerLocal,
  rotateUV,
  Fn,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let camera, scene, renderer, controls;

init();

function init() {
  camera = new PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(8, 10, 12);

  scene = new Scene();

  // Loaders

  const gltfLoader = new GLTFLoader();
  const textureLoader = new TextureLoader();

  // baked model

  gltfLoader.load("three/examples/models/gltf/coffeeMug.glb", (gltf) => {
    gltf.scene.getObjectByName("baked").material.map.anisotropy = 8;
    scene.add(gltf.scene);
  });

  // geometry

  const smokeGeometry = new PlaneGeometry(1, 1, 16, 64);
  smokeGeometry.translate(0, 0.5, 0);
  smokeGeometry.scale(1.5, 6, 1.5);

  // texture

  const noiseTexture = textureLoader.load(
    "three/examples/textures/noises/perlin/128x128.png"
  );
  noiseTexture.wrapS = RepeatWrapping;
  noiseTexture.wrapT = RepeatWrapping;

  // material

  const smokeMaterial = new MeshBasicNodeMaterial({
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
  });
  const time = timerLocal();

  // position

  smokeMaterial.positionNode = Fn(() => {
    // twist

    const twistNoiseUv = vec2(0.5, uv().y.mul(0.2).sub(time.mul(0.005)).mod(1));
    const twist = texture(noiseTexture, twistNoiseUv).r.mul(10);
    positionLocal.xz.assign(rotateUV(positionLocal.xz, twist, vec2(0)));

    // wind

    const windOffset = vec2(
      texture(noiseTexture, vec2(0.25, time.mul(0.01)).mod(1)).r.sub(0.5),
      texture(noiseTexture, vec2(0.75, time.mul(0.01)).mod(1)).r.sub(0.5)
    ).mul(uv().y.pow(2).mul(10));
    positionLocal.addAssign(windOffset);

    return positionLocal;
  })();

  // color

  smokeMaterial.colorNode = Fn(() => {
    // alpha

    const alphaNoiseUv = uv()
      .mul(vec2(0.5, 0.3))
      .add(vec2(0, time.mul(0.03).negate()));
    const alpha = mul(
      // pattern
      texture(noiseTexture, alphaNoiseUv).r.smoothstep(0.4, 1),

      // edges fade
      smoothstep(0, 0.1, uv().x),
      smoothstep(1, 0.9, uv().x),
      smoothstep(0, 0.1, uv().y),
      smoothstep(1, 0.9, uv().y)
    );

    // color

    const finalColor = mix(vec3(0.6, 0.3, 0.2), vec3(1, 1, 1), alpha.pow(3));

    return vec4(finalColor, alpha);
  })();

  // mesh

  const smoke = new Mesh(smokeGeometry, smokeMaterial);
  smoke.position.y = 1.83;
  scene.add(smoke);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;
  controls.target.y = 3;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  controls.update();

  renderer.render(scene, camera);
}
