import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  CanvasTexture,
  RepeatWrapping,
  MeshBasicMaterial,
  Mesh,
  PlaneGeometry,
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  OneMinusSrcColorFactor,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  DstAlphaFactor,
  OneMinusDstAlphaFactor,
  DstColorFactor,
  OneMinusDstColorFactor,
  SrcAlphaSaturateFactor,
  CustomBlending,
  AddEquation,
  WebGLRenderer,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
} from "three";

let camera, scene, renderer;

let materialBg;
const materials = [];

const mapsPre = [];
const mapsNoPre = [];

let currentMaps = mapsNoPre;
let currentIndex = 4;

init();
animate();

function init() {
  // CAMERA

  camera = new PerspectiveCamera(
    80,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 700;

  // SCENE

  scene = new Scene();

  // TEXTURE LOADER

  const textureLoader = new TextureLoader();

  // BACKGROUND IMAGES

  const canvas1 = document.createElement("canvas");
  const ctx1 = canvas1.getContext("2d");
  canvas1.width = canvas1.height = 128;
  ctx1.fillStyle = "#eee";
  ctx1.fillRect(0, 0, 128, 128);
  ctx1.fillStyle = "#999";
  ctx1.fillRect(0, 0, 64, 64);
  ctx1.fillStyle = "#aaa";
  ctx1.fillRect(32, 32, 32, 32);
  ctx1.fillStyle = "#999";
  ctx1.fillRect(64, 64, 64, 64);
  ctx1.fillStyle = "#bbb";
  ctx1.fillRect(96, 96, 32, 32);

  document.getElementById("bg_1").appendChild(canvas1);

  const canvas2 = document.createElement("canvas");
  const ctx2 = canvas2.getContext("2d");
  canvas2.width = canvas2.height = 128;
  ctx2.fillStyle = "#444";
  ctx2.fillRect(0, 0, 128, 128);
  ctx2.fillStyle = "#000";
  ctx2.fillRect(0, 0, 64, 64);
  ctx2.fillStyle = "#111";
  ctx2.fillRect(32, 32, 32, 32);
  ctx2.fillStyle = "#000";
  ctx2.fillRect(64, 64, 64, 64);
  ctx2.fillStyle = "#222";
  ctx2.fillRect(96, 96, 32, 32);

  document.getElementById("bg_2").appendChild(canvas2);

  const mapBg0 = new CanvasTexture(canvas1);
  mapBg0.wrapS = mapBg0.wrapT = RepeatWrapping;
  mapBg0.repeat.set(128, 64);

  const mapBg1 = new CanvasTexture(canvas2);
  mapBg1.wrapS = mapBg1.wrapT = RepeatWrapping;
  mapBg1.repeat.set(128, 64);

  const mapBg2 = textureLoader.load("textures/disturb.jpg");
  mapBg2.wrapS = mapBg2.wrapT = RepeatWrapping;
  mapBg2.repeat.set(8, 4);

  const mapBg3 = textureLoader.load("textures/crate.gif");
  mapBg3.wrapS = mapBg3.wrapT = RepeatWrapping;
  mapBg3.repeat.set(32, 16);

  const mapBg4 = textureLoader.load("textures/lava/lavatile.jpg");
  mapBg4.wrapS = mapBg4.wrapT = RepeatWrapping;
  mapBg4.repeat.set(8, 4);

  const mapBg5 = textureLoader.load("textures/water.jpg");
  mapBg5.wrapS = mapBg5.wrapT = RepeatWrapping;
  mapBg5.repeat.set(8, 4);

  const mapBg6 = textureLoader.load("textures/lava/cloud.png");
  mapBg6.wrapS = mapBg6.wrapT = RepeatWrapping;
  mapBg6.repeat.set(2, 1);

  // BACKGROUND

  materialBg = new MeshBasicMaterial({ map: mapBg1 });

  const meshBg = new Mesh(new PlaneGeometry(4000, 2000), materialBg);
  meshBg.position.set(0, 0, -1);
  scene.add(meshBg);

  // FOREGROUND IMAGES

  const images = [
    "textures/disturb.jpg",
    "textures/sprite0.jpg",
    "textures/sprite0.png",
    "textures/lensflare/lensflare0.png",
    "textures/lensflare/lensflare0_alpha.png",
    "textures/sprites/ball.png",
    "textures/sprites/snowflake7_alpha.png",
  ];

  for (let i = 0; i < images.length; i++) {
    const map = textureLoader.load(images[i]);
    mapsNoPre.push(map);

    const mapPre = textureLoader.load(images[i]);
    mapPre.premultiplyAlpha = true;
    mapPre.needsUpdate = true;
    mapsPre.push(mapPre);
  }

  // FOREGROUND OBJECTS
  const src = [
    { name: "Zero", constant: ZeroFactor },
    { name: "One", constant: OneFactor },
    { name: "SrcColor", constant: SrcColorFactor },
    { name: "OneMinusSrcColor", constant: OneMinusSrcColorFactor },
    { name: "SrcAlpha", constant: SrcAlphaFactor },
    { name: "OneMinusSrcAlpha", constant: OneMinusSrcAlphaFactor },
    { name: "DstAlpha", constant: DstAlphaFactor },
    { name: "OneMinusDstAlpha", constant: OneMinusDstAlphaFactor },
    { name: "DstColor", constant: DstColorFactor },
    { name: "OneMinusDstColor", constant: OneMinusDstColorFactor },
    { name: "SrcAlphaSaturate", constant: SrcAlphaSaturateFactor },
  ];

  const dst = [
    { name: "Zero", constant: ZeroFactor },
    { name: "One", constant: OneFactor },
    { name: "SrcColor", constant: SrcColorFactor },
    { name: "OneMinusSrcColor", constant: OneMinusSrcColorFactor },
    { name: "SrcAlpha", constant: SrcAlphaFactor },
    { name: "OneMinusSrcAlpha", constant: OneMinusSrcAlphaFactor },
    { name: "DstAlpha", constant: DstAlphaFactor },
    { name: "OneMinusDstAlpha", constant: OneMinusDstAlphaFactor },
    { name: "DstColor", constant: DstColorFactor },
    { name: "OneMinusDstColor", constant: OneMinusDstColorFactor },
  ];

  const geo1 = new PlaneGeometry(100, 100);
  const geo2 = new PlaneGeometry(100, 25);

  for (let i = 0; i < dst.length; i++) {
    const blendDst = dst[i];

    for (let j = 0; j < src.length; j++) {
      const blendSrc = src[j];

      const material = new MeshBasicMaterial({
        map: currentMaps[currentIndex],
      });
      material.transparent = true;

      material.blending = CustomBlending;
      material.blendSrc = blendSrc.constant;
      material.blendDst = blendDst.constant;
      material.blendEquation = AddEquation;

      const x = (j - src.length / 2) * 110;
      const z = 0;
      const y = (i - dst.length / 2) * 110 + 50;

      const mesh = new Mesh(geo1, material);
      mesh.position.set(x, -y, z);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);

      materials.push(material);
    }
  }

  for (let j = 0; j < src.length; j++) {
    const blendSrc = src[j];

    const x = (j - src.length / 2) * 110;
    const z = 0;
    const y = (0 - dst.length / 2) * 110 + 50;

    const mesh = new Mesh(
      geo2,
      generateLabelMaterial(blendSrc.name, "rgba( 0, 150, 0, 1 )")
    );
    mesh.position.set(x, -(y - 70), z);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
  }

  for (let i = 0; i < dst.length; i++) {
    const blendDst = dst[i];

    const x = (0 - src.length / 2) * 110 - 125;
    const z = 0;
    const y = (i - dst.length / 2) * 110 + 165;

    const mesh = new Mesh(
      geo2,
      generateLabelMaterial(blendDst.name, "rgba( 150, 0, 0, 1 )")
    );
    mesh.position.set(x, -(y - 120), z);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
  }

  // RENDERER

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl", { alpha: false }); // TODO Remove workaround

  renderer = new WebGLRenderer({ canvas: canvas, context: context });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.left = "215px";

  document.body.appendChild(renderer.domElement);

  // EVENTS

  window.addEventListener("resize", onWindowResize);

  addImgHandler("img_0", 0);
  addImgHandler("img_1", 1);
  addImgHandler("img_2", 2);
  addImgHandler("img_3", 3);
  addImgHandler("img_4", 4);
  addImgHandler("img_5", 5);
  addImgHandler("img_6", 6);

  addBgHandler("bg_0", mapBg2);
  addBgHandler("bg_1", mapBg0);
  addBgHandler("bg_2", mapBg1);
  addBgHandler("bg_3", mapBg3);
  addBgHandler("bg_4", mapBg4);
  addBgHandler("bg_5", mapBg5);
  addBgHandler("bg_6", mapBg6);

  addEqHandler("btn_add", AddEquation);
  addEqHandler("btn_sub", SubtractEquation);
  addEqHandler("btn_rsub", ReverseSubtractEquation);
  addEqHandler("btn_min", MinEquation);
  addEqHandler("btn_max", MaxEquation);

  addPreHandler("btn_pre", mapsPre);
  addPreHandler("btn_nopre", mapsNoPre);
}

//

function addImgHandler(id, index) {
  const el = document.getElementById(id);

  el.addEventListener("click", function () {
    for (let i = 0; i < materials.length; i++) {
      materials[i].map = currentMaps[index];
    }

    currentIndex = index;
  });
}

function addEqHandler(id, eq) {
  const el = document.getElementById(id);

  el.addEventListener("click", function () {
    for (let i = 0; i < materials.length; i++) {
      materials[i].blendEquation = eq;
    }

    document.getElementById("btn_add").style.backgroundColor = "transparent";
    document.getElementById("btn_sub").style.backgroundColor = "transparent";
    document.getElementById("btn_rsub").style.backgroundColor = "transparent";
    document.getElementById("btn_min").style.backgroundColor = "transparent";
    document.getElementById("btn_max").style.backgroundColor = "transparent";

    el.style.backgroundColor = "darkorange";
  });
}

function addBgHandler(id, map) {
  const el = document.getElementById(id);
  el.addEventListener("click", function () {
    materialBg.map = map;
  });
}

function addPreHandler(id, marray) {
  const el = document.getElementById(id);
  el.addEventListener("click", function () {
    currentMaps = marray;

    for (let i = 0; i < materials.length; i++) {
      materials[i].map = currentMaps[currentIndex];
    }

    document.getElementById("btn_pre").style.backgroundColor = "transparent";
    document.getElementById("btn_nopre").style.backgroundColor = "transparent";

    el.style.backgroundColor = "darkorange";
  });
}

//

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

//

function generateLabelMaterial(text, bg) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 128;
  canvas.height = 32;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 32);

  ctx.fillStyle = "white";
  ctx.font = "12pt arial bold";
  ctx.fillText(text, 8, 22);

  const map = new CanvasTexture(canvas);

  const material = new MeshBasicMaterial({ map: map, transparent: true });
  return material;
}

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.00025;
  const ox = (time * -0.01 * materialBg.map.repeat.x) % 1;
  const oy = (time * -0.01 * materialBg.map.repeat.y) % 1;

  materialBg.map.offset.set(ox, oy);

  renderer.render(scene, camera);
}
