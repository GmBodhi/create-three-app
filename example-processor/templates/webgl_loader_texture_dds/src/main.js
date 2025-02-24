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

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.position.y = -2;
  camera.position.z = 16;

  scene = new Scene();

  const geometry = new BoxGeometry(2, 2, 2);

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

  const map7 = loader.load(
    "textures/compressed/disturb_dx10_bc6h_signed_nomip.dds"
  );
  map7.anisotropy = 4;

  const map8 = loader.load(
    "textures/compressed/disturb_dx10_bc6h_signed_mip.dds"
  );
  map8.anisotropy = 4;

  const map9 = loader.load(
    "textures/compressed/disturb_dx10_bc6h_unsigned_nomip.dds"
  );
  map9.anisotropy = 4;

  const map10 = loader.load(
    "textures/compressed/disturb_dx10_bc6h_unsigned_mip.dds"
  );
  map10.anisotropy = 4;

  const map11 = loader.load("textures/wave_normals_24bit_uncompressed.dds");
  map11.anisotropy = 4;

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
  const material9 = new MeshBasicMaterial({ map: map7 });
  const material10 = new MeshBasicMaterial({ map: map8 });
  const material11 = new MeshBasicMaterial({ map: map9 });
  const material12 = new MeshBasicMaterial({ map: map10 });
  const material13 = new MeshBasicMaterial({ map: map11, transparent: true });

  let mesh = new Mesh(new TorusGeometry(), material1);
  mesh.position.x = -10;
  mesh.position.y = -2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material2);
  mesh.position.x = -6;
  mesh.position.y = -2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material3);
  mesh.position.x = -6;
  mesh.position.y = 2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material4);
  mesh.position.x = -10;
  mesh.position.y = 2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material5);
  mesh.position.x = -2;
  mesh.position.y = 2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material6);
  mesh.position.x = -2;
  mesh.position.y = -2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material7);
  mesh.position.x = 2;
  mesh.position.y = -2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material8);
  mesh.position.x = 2;
  mesh.position.y = 2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material9);
  mesh.position.x = 6;
  mesh.position.y = -2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material10);
  mesh.position.x = 6;
  mesh.position.y = 2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material11);
  mesh.position.x = 10;
  mesh.position.y = -2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material12);
  mesh.position.x = 10;
  mesh.position.y = 2;
  scene.add(mesh);
  meshes.push(mesh);

  mesh = new Mesh(geometry, material13);
  mesh.position.x = -10;
  mesh.position.y = -6;
  scene.add(mesh);
  meshes.push(mesh);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const time = Date.now() * 0.001;

  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    mesh.rotation.x = time;
    mesh.rotation.y = time;
  }

  renderer.render(scene, camera);
}
