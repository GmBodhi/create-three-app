import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import {
  uniform,
  refract,
  div,
  positionViewDirection,
  positionLocal,
  normalView,
  texture,
  Fn,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, controls;
let stats;
let gltf;

init();

async function init() {
  camera = new PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.025,
    5
  );
  camera.position.set(-0.5, 0.35, 0.2);

  scene = new Scene();

  // light

  const spotLight = new SpotLight(0xffffff, 1);
  spotLight.position.set(0.2, 0.3, 0.2);
  spotLight.castShadow = true;
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 1;
  spotLight.decay = 2;
  spotLight.distance = 0;
  spotLight.shadow.mapType = HalfFloatType; // For HDR Caustics
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 1;
  spotLight.shadow.bias = -0.003;
  spotLight.shadow.intensity = 0.95;
  scene.add(spotLight);

  // model / textures

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/");
  dracoLoader.setDecoderConfig({ type: "js" });

  gltf = (
    await new GLTFLoader()
      .setDRACOLoader(dracoLoader)
      .loadAsync("three/examples/models/gltf/duck.glb")
  ).scene;
  gltf.scale.setScalar(0.5);
  scene.add(gltf);

  const causticMap = new TextureLoader().load(
    "three/examples/textures/opengameart/Caustic_Free.jpg"
  );
  causticMap.wrapS = causticMap.wrapT = RepeatWrapping;
  causticMap.colorSpace = SRGBColorSpace;

  // objects / material

  const duck = gltf.children[0];
  duck.material = new MeshPhysicalNodeMaterial();
  duck.material.side = DoubleSide;
  duck.material.transparent = true;
  duck.material.color = new Color(0xffd700);
  duck.material.transmission = 1;
  duck.material.thickness = 0.25;
  duck.material.ior = 1.5;
  duck.material.metalness = 0;
  duck.material.roughness = 0.1;
  duck.castShadow = true;

  // tsl shader

  const causticOcclusion = uniform(20);

  duck.material.castShadowPositionNode = Fn(() => {
    // optional: add some distortion to the geometry shadow position if needed

    return positionLocal;
  })();

  duck.material.castShadowNode = Fn(() => {
    const refractionVector = refract(
      positionViewDirection.negate(),
      normalView,
      div(1.0, duck.material.ior)
    ).normalize();
    const viewZ = normalView.z.pow(causticOcclusion);

    const textureUV = refractionVector.xy.mul(0.6);

    const causticColor = uniform(duck.material.color);
    const chromaticAberrationOffset = normalView.z.pow(-0.9).mul(0.004);

    const causticProjection = vec3(
      texture(
        causticMap,
        textureUV.add(vec2(chromaticAberrationOffset.x.negate(), 0))
      ).r,
      texture(
        causticMap,
        textureUV.add(vec2(0, chromaticAberrationOffset.y.negate()))
      ).g,
      texture(
        causticMap,
        textureUV.add(
          vec2(chromaticAberrationOffset.x, chromaticAberrationOffset.y)
        )
      ).b
    );

    return causticProjection.mul(viewZ.mul(25)).add(viewZ).mul(causticColor);
  })();

  //

  const textureLoader = new TextureLoader();

  // glass

  const colorMap = textureLoader.load("textures/colors.png");
  colorMap.wrapS = colorMap.wrapT = RepeatWrapping;
  colorMap.colorSpace = SRGBColorSpace;

  const glassMaterial = new MeshPhysicalNodeMaterial();
  glassMaterial.map = colorMap;
  glassMaterial.side = DoubleSide;
  glassMaterial.transparent = true;
  glassMaterial.color = new Color(0xffffff);
  glassMaterial.transmission = 1;
  glassMaterial.ior = 1.5;
  glassMaterial.metalness = 0;
  glassMaterial.roughness = 0.1;
  glassMaterial.castShadowNode = vec4(texture(colorMap).rgb, 0.8);

  const glass = new Mesh(new PlaneGeometry(0.2, 0.2), glassMaterial);
  glass.position.y = 0.1;
  glass.castShadow = true;
  glass.visible = false;
  scene.add(glass);

  // gui

  const gui = new GUI();
  gui.add(causticOcclusion, "value", 0, 20).name("caustic occlusion");
  gui.addColor(duck.material, "color").name("material color");
  gui.add({ model: "duck" }, "model", ["duck", "glass"]).onChange((model) => {
    duck.visible = glass.visible = false;

    if (model === "duck") {
      duck.visible = true;
    } else if (model === "glass") {
      glass.visible = true;
    }
  });

  // ground

  const map = textureLoader.load("textures/hardwood2_diffuse.jpg");
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(10, 10);

  const geometry = new PlaneGeometry(2, 2);
  const material = new MeshStandardMaterial({ color: 0x999999, map });

  const ground = new Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxDistance = 3;
  controls.maxPolarAngle = Math.PI / 2;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  stats.update();

  for (const mesh of gltf.children) {
    mesh.rotation.y -= 0.01;
  }

  controls.update();

  renderer.render(scene, camera);
}
