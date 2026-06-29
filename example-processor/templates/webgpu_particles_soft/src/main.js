import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  float,
  range,
  texture,
  mix,
  uv,
  color,
  rotateUV,
  positionLocal,
  time,
  uniform,
} from "three/tsl";
import { softParticles } from "three/addons/tsl/utils/SoftParticles.js";

import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Inspector } from "three/addons/inspector/Inspector.js";

let camera, scene, renderer;
let controls;

init();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(6, 8, 8);

  scene = new Scene();
  scene.background = new Color(0x000000);
  scene.fog = new FogExp2(0x000000, 0.025);

  // lights

  scene.add(new AmbientLight(0xffffff, 0.25));

  const spotLight = new SpotLight(0xffffff, 800);
  spotLight.position.set(10, 15, 8);
  spotLight.target.position.set(0, 4, 0);
  spotLight.angle = 0.5;
  spotLight.penumbra = 0.7;
  spotLight.distance = 0;

  scene.add(spotLight);

  //

  const loader = new PLYLoader();
  loader.load(
    "three/examples/models/ply/binary/Lucy100k.ply",
    function (geometry) {
      geometry.computeVertexNormals();

      const material = new MeshStandardMaterial();
      const mesh = new Mesh(geometry, material);

      mesh.position.y = 4;
      mesh.rotation.y = Math.PI;
      mesh.scale.multiplyScalar(0.005);

      scene.add(mesh);
    }
  );

  const groundMaterial = new MeshStandardNodeMaterial({
    color: 0x444444,
    roughness: 1,
  });
  const ground = new Mesh(new PlaneGeometry(100, 100), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // smoke texture

  const textureLoader = new TextureLoader();
  const map = textureLoader.load("textures/opengameart/smoke1.png");
  map.colorSpace = SRGBColorSpace;

  // simple smoke particle system

  const lifeRange = range(0.1, 1);
  const offsetRange = range(new Vector3(-2, 0, -2), new Vector3(2, 7, 2));

  const speed = float(0.2);
  const scaledTime = time.add(20).mul(speed);

  const lifeTime = scaledTime.mul(lifeRange).mod(1);
  const scaleRange = range(6, 8);
  const rotateRange = range(0.1, 2);

  const life = lifeTime.div(lifeRange);

  const textureNode = texture(map, rotateUV(uv(), scaledTime.mul(rotateRange)));

  const fade = life.smoothstep(0, 0.3).mul(life.smoothstep(1, 0.7));

  // soft particles

  const softEnabled = uniform(1); // 0 = hard particles, 1 = soft particles
  const softDistance = uniform(1); // world-space fade distance
  const softContrast = uniform(2);

  const baseOpacity = textureNode.a.mul(fade);

  const smokeOpacity = mix(
    baseOpacity,
    softParticles({
      opacity: baseOpacity,
      distance: softDistance,
      contrast: softContrast,
    }),
    softEnabled
  );

  const smokeColor = mix(
    color(0x6f6f6f),
    color(0x303030),
    positionLocal.y.mul(0.1).clamp()
  );

  // instanced sprites

  const smokeMaterial = new SpriteNodeMaterial();
  smokeMaterial.colorNode = smokeColor;
  smokeMaterial.opacityNode = smokeOpacity;
  smokeMaterial.positionNode = offsetRange.mul(lifeTime);
  smokeMaterial.scaleNode = scaleRange.mul(lifeTime.max(0.3));
  smokeMaterial.depthWrite = false;

  const smoke = new Sprite(smokeMaterial);
  smoke.count = 50;
  smoke.frustumCulled = false;
  scene.add(smoke);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 6;
  controls.maxDistance = 20;
  controls.target.set(0, 4, 0);
  controls.enableDamping = true;
  controls.update();

  window.addEventListener("resize", onWindowResize);

  // gui

  const gui = renderer.inspector.createParameters("Settings");
  gui.add(softEnabled, "value", { hard: 0, soft: 1 }).name("mode");
  gui.add(softDistance, "value", 0.1, 2, 0.01).name("soft distance");
  gui.add(softContrast, "value", 1, 6, 0.01).name("soft contrast");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  controls.update();

  renderer.render(scene, camera);
}
