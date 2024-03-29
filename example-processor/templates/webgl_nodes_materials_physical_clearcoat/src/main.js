import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Group,
  SphereGeometry,
  TextureLoader,
  SRGBColorSpace,
  RepeatWrapping,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";
import {
  color,
  float,
  vec2,
  texture,
  normalMap,
  uv,
  MeshPhysicalNodeMaterial,
} from "three/nodes";

import { nodeFrame } from "three/addons/renderers/webgl-legacy/nodes/WebGLNodes.js";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRCubeTextureLoader } from "three/addons/loaders/HDRCubeTextureLoader.js";

import { FlakesTexture } from "three/addons/textures/FlakesTexture.js";

let container, stats;

let camera, scene, renderer;

let particleLight;
let group;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    0.25,
    50
  );
  camera.position.z = 10;

  scene = new Scene();

  group = new Group();
  scene.add(group);

  new HDRCubeTextureLoader()
    .setPath("textures/cube/pisaHDR/")
    .load(
      ["px.hdr", "nx.hdr", "py.hdr", "ny.hdr", "pz.hdr", "nz.hdr"],
      function (hdrTexture) {
        const geometry = new SphereGeometry(0.8, 64, 32);

        const textureLoader = new TextureLoader();

        const diffuse = textureLoader.load("textures/carbon/Carbon.png");
        diffuse.colorSpace = SRGBColorSpace;
        diffuse.wrapS = RepeatWrapping;
        diffuse.wrapT = RepeatWrapping;

        const normalMap1 = textureLoader.load(
          "textures/carbon/Carbon_Normal.png"
        );
        normalMap1.wrapS = RepeatWrapping;
        normalMap1.wrapT = RepeatWrapping;

        const normalMap2 = textureLoader.load(
          "textures/water/Water_1_M_Normal.jpg"
        );

        const normalMap3 = new CanvasTexture(new FlakesTexture());
        normalMap3.wrapS = RepeatWrapping;
        normalMap3.wrapT = RepeatWrapping;
        normalMap3.anisotropy = 16;

        const normalMap4 = textureLoader.load("textures/golfball.jpg");

        const clearcoatNormalMap = textureLoader.load(
          "textures/pbr/Scratched_gold/Scratched_gold_01_1K_Normal.png"
        );

        // car paint

        const carPaintUV = uv().mul(vec2(10, 6));
        const carPaintNormalScale = vec2(0.15);

        let material = new MeshPhysicalNodeMaterial();
        material.clearcoatNode = float(1);
        material.clearcoatRoughnessNode = float(0.1);
        material.metalnessNode = float(0.9);
        material.roughnessNode = float(0.5);
        material.colorNode = color(0x0000ff);
        material.normalNode = normalMap(
          texture(normalMap3, carPaintUV),
          carPaintNormalScale
        );

        let mesh = new Mesh(geometry, material);
        mesh.position.x = -1;
        mesh.position.y = 1;
        group.add(mesh);

        // fibers

        const fibersUV = uv().mul(10);

        material = new MeshPhysicalNodeMaterial();
        material.roughnessNode = float(0.5);
        material.clearcoatNode = float(1);
        material.clearcoatRoughnessNode = float(0.1);
        material.colorNode = texture(diffuse, fibersUV);
        material.normalNode = normalMap(texture(normalMap1, fibersUV));

        mesh = new Mesh(geometry, material);
        mesh.position.x = 1;
        mesh.position.y = 1;
        group.add(mesh);

        // golf

        material = new MeshPhysicalNodeMaterial();
        material.clearcoatNode = float(1);
        material.roughnessNode = float(0.1);
        material.metalnessNode = float(0);
        material.colorNode = color(0xffffff);
        material.normalNode = normalMap(texture(normalMap4));
        // y scale is negated to compensate for normal map handedness.
        material.clearcoatNormalNode = normalMap(
          texture(clearcoatNormalMap),
          vec2(2.0, -2.0)
        );

        mesh = new Mesh(geometry, material);
        mesh.position.x = -1;
        mesh.position.y = -1;
        group.add(mesh);

        // clearcoat + normalmap

        material = new MeshPhysicalNodeMaterial();
        material.clearcoatNode = float(1);
        material.roughnessNode = float(1);
        material.metalnessNode = float(1);
        material.colorNode = color(0xff0000);
        material.normalNode = normalMap(texture(normalMap2), vec2(0.15, 0.15));
        // y scale is negated to compensate for normal map handedness.
        material.clearcoatNormalNode = normalMap(
          texture(clearcoatNormalMap),
          vec2(2.0, -2.0)
        );

        mesh = new Mesh(geometry, material);
        mesh.position.x = 1;
        mesh.position.y = -1;
        group.add(mesh);

        //

        scene.background = hdrTexture;
        scene.environment = hdrTexture;
      }
    );

  // LIGHTS

  particleLight = new Mesh(
    new SphereGeometry(0.05, 8, 8),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(particleLight);

  particleLight.add(new PointLight(0xffffff, 30));

  renderer = new WebGLRenderer();
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
  requestAnimationFrame(animate);

  nodeFrame.update();

  render();

  stats.update();
}

function render() {
  const timer = Date.now() * 0.00025;

  particleLight.position.x = Math.sin(timer * 7) * 3;
  particleLight.position.y = Math.cos(timer * 5) * 4;
  particleLight.position.z = Math.cos(timer * 3) * 3;

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    child.rotation.y += 0.005;
  }

  renderer.render(scene, camera);
}
