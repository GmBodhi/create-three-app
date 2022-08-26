import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  DirectionalLight,
  SphereGeometry,
  BoxGeometry,
  ConeGeometry,
  TetrahedronGeometry,
  TorusKnotGeometry,
  Group,
  Color,
  MeshPhongMaterial,
  Mesh,
  Vector2,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { PixelShader } from "three/addons/shaders/PixelShader.js";

let camera, scene, renderer, gui, composer, controls;
let pixelPass, params;

let group;

init();
animate();

function updateGUI() {
  pixelPass.uniforms["pixelSize"].value = params.pixelSize;
}

function init() {
  const container = document.getElementById("container");
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, 0, 30);
  controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 2.0;
  controls.panSpeed = 0.8;
  controls.zoomSpeed = 1.5;

  scene = new Scene();

  const hemisphereLight = new HemisphereLight(0xfceafc, 0x000000, 0.8);
  scene.add(hemisphereLight);

  const dirLight = new DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(150, 75, 150);
  scene.add(dirLight);

  const dirLight2 = new DirectionalLight(0xffffff, 0.2);
  dirLight2.position.set(-150, 75, -150);
  scene.add(dirLight2);

  const dirLight3 = new DirectionalLight(0xffffff, 0.1);
  dirLight3.position.set(0, 125, 0);
  scene.add(dirLight3);

  const geometries = [
    new SphereGeometry(1, 64, 64),
    new BoxGeometry(1, 1, 1),
    new ConeGeometry(1, 1, 32),
    new TetrahedronGeometry(1),
    new TorusKnotGeometry(1, 0.4),
  ];

  group = new Group();

  for (let i = 0; i < 25; i++) {
    const geom = geometries[Math.floor(Math.random() * geometries.length)];

    const color = new Color();
    color.setHSL(
      Math.random(),
      0.7 + 0.2 * Math.random(),
      0.5 + 0.1 * Math.random()
    );

    const mat = new MeshPhongMaterial({ color: color, shininess: 200 });

    const mesh = new Mesh(geom, mat);

    const s = 4 + Math.random() * 10;
    mesh.scale.set(s, s, s);
    mesh.position
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize();
    mesh.position.multiplyScalar(Math.random() * 200);
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    group.add(mesh);
  }

  scene.add(group);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms["resolution"].value = new Vector2(
    window.innerWidth,
    window.innerHeight
  );
  pixelPass.uniforms["resolution"].value.multiplyScalar(
    window.devicePixelRatio
  );
  composer.addPass(pixelPass);

  window.addEventListener("resize", onWindowResize);

  params = {
    pixelSize: 16,
    postprocessing: true,
  };
  gui = new GUI();
  gui.add(params, "pixelSize").min(2).max(32).step(2);
  gui.add(params, "postprocessing");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  pixelPass.uniforms["resolution"].value
    .set(window.innerWidth, window.innerHeight)
    .multiplyScalar(window.devicePixelRatio);
}

function update() {
  controls.update();
  updateGUI();

  group.rotation.y += 0.0015;
  group.rotation.z += 0.001;
}

function animate() {
  update();

  if (params.postprocessing) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }

  window.requestAnimationFrame(animate);
}
