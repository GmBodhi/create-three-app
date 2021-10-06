import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Group,
  SphereGeometry,
  TextureLoader,
  sRGBEncoding,
  RepeatWrapping,
  CanvasTexture,
  MeshPhysicalMaterial,
  Vector2,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRCubeTextureLoader } from "three/examples/jsm/loaders/HDRCubeTextureLoader.js";

import { FlakesTexture } from "three/examples/jsm/textures/FlakesTexture.js";

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
    1,
    10000
  );
  camera.position.z = 1000;

  scene = new Scene();

  group = new Group();
  scene.add(group);

  new HDRCubeTextureLoader()
    .setPath("textures/cube/pisaHDR/")
    .load(
      ["px.hdr", "nx.hdr", "py.hdr", "ny.hdr", "pz.hdr", "nz.hdr"],
      function (texture) {
        const geometry = new SphereGeometry(80, 64, 32);

        const textureLoader = new TextureLoader();

        const diffuse = textureLoader.load("textures/carbon/Carbon.png");
        diffuse.encoding = sRGBEncoding;
        diffuse.wrapS = RepeatWrapping;
        diffuse.wrapT = RepeatWrapping;
        diffuse.repeat.x = 10;
        diffuse.repeat.y = 10;

        const normalMap = textureLoader.load(
          "textures/carbon/Carbon_Normal.png"
        );
        normalMap.wrapS = RepeatWrapping;
        normalMap.wrapT = RepeatWrapping;

        const normalMap2 = textureLoader.load(
          "textures/water/Water_1_M_Normal.jpg"
        );

        const normalMap3 = new CanvasTexture(new FlakesTexture());
        normalMap3.wrapS = RepeatWrapping;
        normalMap3.wrapT = RepeatWrapping;
        normalMap3.repeat.x = 10;
        normalMap3.repeat.y = 6;
        normalMap3.anisotropy = 16;

        const normalMap4 = textureLoader.load("textures/golfball.jpg");

        const clearcoatNormaMap = textureLoader.load(
          "textures/pbr/Scratched_gold/Scratched_gold_01_1K_Normal.png"
        );

        // car paint

        let material = new MeshPhysicalMaterial({
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          metalness: 0.9,
          roughness: 0.5,
          color: 0x0000ff,
          normalMap: normalMap3,
          normalScale: new Vector2(0.15, 0.15),
        });

        let mesh = new Mesh(geometry, material);
        mesh.position.x = -100;
        mesh.position.y = 100;
        group.add(mesh);

        // fibers

        material = new MeshPhysicalMaterial({
          roughness: 0.5,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          map: diffuse,
          normalMap: normalMap,
        });
        mesh = new Mesh(geometry, material);
        mesh.position.x = 100;
        mesh.position.y = 100;
        group.add(mesh);

        // golf

        material = new MeshPhysicalMaterial({
          metalness: 0.0,
          roughness: 0.1,
          clearcoat: 1.0,
          normalMap: normalMap4,
          clearcoatNormalMap: clearcoatNormaMap,

          // y scale is negated to compensate for normal map handedness.
          clearcoatNormalScale: new Vector2(2.0, -2.0),
        });
        mesh = new Mesh(geometry, material);
        mesh.position.x = -100;
        mesh.position.y = -100;
        group.add(mesh);

        // clearcoat + normalmap

        material = new MeshPhysicalMaterial({
          clearcoat: 1.0,
          metalness: 1.0,
          color: 0xff0000,
          normalMap: normalMap2,
          normalScale: new Vector2(0.15, 0.15),
          clearcoatNormalMap: clearcoatNormaMap,

          // y scale is negated to compensate for normal map handedness.
          clearcoatNormalScale: new Vector2(2.0, -2.0),
        });
        mesh = new Mesh(geometry, material);
        mesh.position.x = 100;
        mesh.position.y = -100;
        group.add(mesh);

        //

        scene.background = texture;
        scene.environment = texture;
      }
    );

  // LIGHTS

  particleLight = new Mesh(
    new SphereGeometry(4, 8, 8),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(particleLight);

  particleLight.add(new PointLight(0xffffff, 1));

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  //

  renderer.outputEncoding = sRGBEncoding;

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

  render();

  stats.update();
}

function render() {
  const timer = Date.now() * 0.00025;

  particleLight.position.x = Math.sin(timer * 7) * 300;
  particleLight.position.y = Math.cos(timer * 5) * 400;
  particleLight.position.z = Math.cos(timer * 3) * 300;

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    child.rotation.y += 0.005;
  }

  renderer.render(scene, camera);
}
