import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  BoxGeometry,
  LinearFilter,
  SRGBColorSpace,
  CubeReflectionMapping,
  MeshBasicMaterial,
  DoubleSide,
  AdditiveBlending,
  Mesh,
  TorusGeometry,
  WebGLRenderer,
} from "three";

import { DDSLoader } from "three/addons/loaders/DDSLoader.js";

let camera, scene, renderer;
const meshes = [];

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.z = 1000;

  scene = new Scene();

  const geometry = new BoxGeometry(200, 200, 200);

  /*
				This is how compressed textures are supposed to be used:

				DXT1 - RGB - opaque textures
				DXT3 - RGBA - transparent textures with sharp alpha transitions
				DXT5 - RGBA - transparent textures with full alpha range
				*/

  const loader = new DDSLoader();

  const map1 = loader.load("textures/compressed/disturb_dxt1_nomip.dds");
  map1.minFilter = map1.magFilter = LinearFilter;
  map1.anisotropy = 4;
  map1.colorSpace = SRGBColorSpace;

  const map2 = loader.load("textures/compressed/disturb_dxt1_mip.dds");
  map2.anisotropy = 4;
  map2.colorSpace = SRGBColorSpace;

  const map3 = loader.load("textures/compressed/hepatica_dxt3_mip.dds");
  map3.anisotropy = 4;
  map3.colorSpace = SRGBColorSpace;

  const map4 = loader.load("textures/compressed/explosion_dxt5_mip.dds");
  map4.anisotropy = 4;
  map4.colorSpace = SRGBColorSpace;

  const map5 = loader.load("textures/compressed/disturb_argb_nomip.dds");
  map5.minFilter = map5.magFilter = LinearFilter;
  map5.anisotropy = 4;
  map5.colorSpace = SRGBColorSpace;

  const map6 = loader.load("textures/compressed/disturb_argb_mip.dds");
  map6.anisotropy = 4;
  map6.colorSpace = SRGBColorSpace;

  const cubemap1 = loader.load(
    "textures/compressed/Mountains.dds",
    function (texture) {
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearFilter;
      texture.mapping = CubeReflectionMapping;
      texture.colorSpace = SRGBColorSpace;
      material1.needsUpdate = true;
    }
  );

  const cubemap2 = loader.load(
    "textures/compressed/Mountains_argb_mip.dds",
    function (texture) {
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearFilter;
      texture.mapping = CubeReflectionMapping;
      texture.colorSpace = SRGBColorSpace;
      material5.needsUpdate = true;
    }
  );

  const cubemap3 = loader.load(
    "textures/compressed/Mountains_argb_nomip.dds",
    function (texture) {
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearFilter;
      texture.mapping = CubeReflectionMapping;
      texture.colorSpace = SRGBColorSpace;
      material6.needsUpdate = true;
    }
  );

  const material1 = new MeshBasicMaterial({ map: map1, envMap: cubemap1 });
  const material2 = new MeshBasicMaterial({ map: map2 });
  const material3 = new MeshBasicMaterial({
    map: map3,
    alphaTest: 0.5,
    side: DoubleSide,
  });
  const material4 = new MeshBasicMaterial({
    map: map4,
    side: DoubleSide,
    blending: AdditiveBlending,
    depthTest: false,
    transparent: true,
  });
  const material5 = new MeshBasicMaterial({ envMap: cubemap2 });
  const material6 = new MeshBasicMaterial({ envMap: cubemap3 });
  const material7 = new MeshBasicMaterial({ map: map5 });
  const material8 = new MeshBasicMaterial({ map: map6 });

  let mesh = new Mesh(new TorusGeometry(100, 50, 32, 16), material1);
  mesh.position.x = -600;
  mesh.position.y = -200;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material2);
  mesh.position.x = -200;
  mesh.position.y = -200;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material3);
  mesh.position.x = -200;
  mesh.position.y = 200;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material4);
  mesh.position.x = -600;
  mesh.position.y = 200;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material5);
  mesh.position.x = 200;
  mesh.position.y = 200;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material6);
  mesh.position.x = 200;
  mesh.position.y = -200;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material7);
  mesh.position.x = 600;
  mesh.position.y = -200;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material8);
  mesh.position.x = 600;
  mesh.position.y = 200;
  scene.add(mesh);
  meshes.push(mesh);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.001;

  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    mesh.rotation.x = time;
    mesh.rotation.y = time;
  }

  renderer.render(scene, camera);
}
