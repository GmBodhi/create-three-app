import "./style.css"; // For webpack support

import {
  AddEquation,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
  PerspectiveCamera,
  Scene,
  CanvasTexture,
  RepeatWrapping,
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
  PlaneGeometry,
  TextureLoader,
  MeshBasicMaterial,
  CustomBlending,
  Mesh,
  WebGLRenderer,
} from "three";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

let camera, scene, renderer;

let mapBg;
const materials = [];

const params = {
  blendEquation: AddEquation,
};

const equations = {
  Add: AddEquation,
  Subtract: SubtractEquation,
  ReverseSubtract: ReverseSubtractEquation,
  Min: MinEquation,
  Max: MaxEquation,
};

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

  // BACKGROUND

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.height = 128;
  ctx.fillStyle = "#ddd";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#555";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#999";
  ctx.fillRect(32, 32, 32, 32);
  ctx.fillStyle = "#555";
  ctx.fillRect(64, 64, 64, 64);
  ctx.fillStyle = "#777";
  ctx.fillRect(96, 96, 32, 32);

  mapBg = new CanvasTexture(canvas);
  mapBg.wrapS = mapBg.wrapT = RepeatWrapping;
  mapBg.repeat.set(64, 32);

  scene.background = mapBg;

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

  const texture = new TextureLoader().load(
    "textures/lensflare/lensflare0_alpha.png"
  );

  for (let i = 0; i < dst.length; i++) {
    const blendDst = dst[i];

    for (let j = 0; j < src.length; j++) {
      const blendSrc = src[j];

      const material = new MeshBasicMaterial({ map: texture });
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

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // EVENTS

  window.addEventListener("resize", onWindowResize);

  // GUI

  //
  const gui = new GUI({ width: 300 });

  gui.add(params, "blendEquation", equations).onChange(updateBlendEquation);
  gui.open();
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
  ctx.font = "bold 11pt arial";
  ctx.fillText(text, 8, 22);

  const map = new CanvasTexture(canvas);

  const material = new MeshBasicMaterial({ map: map, transparent: true });
  return material;
}

function updateBlendEquation(value) {
  for (const material of materials) {
    material.blendEquation = value;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.00025;
  const ox = (time * -0.01 * mapBg.repeat.x) % 1;
  const oy = (time * -0.01 * mapBg.repeat.y) % 1;

  mapBg.offset.set(ox, oy);

  renderer.render(scene, camera);
}
