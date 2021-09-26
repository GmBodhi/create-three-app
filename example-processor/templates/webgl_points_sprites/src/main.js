import "./style.css"; // For webpack support

import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

let camera, scene, renderer, stats, parameters;
let mouseX = 0,
  mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const materials = [];

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.z = 1000;

  scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.0008);

  const geometry = new BufferGeometry();
  const vertices = [];

  const textureLoader = new TextureLoader();

  const sprite1 = textureLoader.load("textures/sprites/snowflake1.png");
  const sprite2 = textureLoader.load("textures/sprites/snowflake2.png");
  const sprite3 = textureLoader.load("textures/sprites/snowflake3.png");
  const sprite4 = textureLoader.load("textures/sprites/snowflake4.png");
  const sprite5 = textureLoader.load("textures/sprites/snowflake5.png");

  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * 2000 - 1000;
    const y = Math.random() * 2000 - 1000;
    const z = Math.random() * 2000 - 1000;

    vertices.push(x, y, z);
  }

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));

  parameters = [
    [[1.0, 0.2, 0.5], sprite2, 20],
    [[0.95, 0.1, 0.5], sprite3, 15],
    [[0.9, 0.05, 0.5], sprite1, 10],
    [[0.85, 0, 0.5], sprite5, 8],
    [[0.8, 0, 0.5], sprite4, 5],
  ];

  for (let i = 0; i < parameters.length; i++) {
    const color = parameters[i][0];
    const sprite = parameters[i][1];
    const size = parameters[i][2];

    materials[i] = new PointsMaterial({
      size: size,
      map: sprite,
      blending: AdditiveBlending,
      depthTest: false,
      transparent: true,
    });
    materials[i].color.setHSL(color[0], color[1], color[2]);

    const particles = new Points(geometry, materials[i]);

    particles.rotation.x = Math.random() * 6;
    particles.rotation.y = Math.random() * 6;
    particles.rotation.z = Math.random() * 6;

    scene.add(particles);
  }

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  const gui = new GUI();

  const params = {
    texture: true,
  };

  gui.add(params, "texture").onChange(function (value) {
    for (let i = 0; i < materials.length; i++) {
      materials[i].map = value === true ? parameters[i][1] : null;
      materials[i].needsUpdate = true;
    }
  });

  gui.open();

  document.body.style.touchAction = "none";
  document.body.addEventListener("pointermove", onPointerMove);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = Date.now() * 0.00005;

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  for (let i = 0; i < scene.children.length; i++) {
    const object = scene.children[i];

    if (object instanceof Points) {
      object.rotation.y = time * (i < 4 ? i + 1 : -(i + 1));
    }
  }

  for (let i = 0; i < materials.length; i++) {
    const color = parameters[i][0];

    const h = ((360 * (color[0] + time)) % 360) / 360;
    materials[i].color.setHSL(h, color[1], color[2]);
  }

  renderer.render(scene, camera);
}
