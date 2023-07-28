import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Clock,
  Scene,
  Color,
  Fog,
  HemisphereLight,
  DirectionalLight,
  CameraHelper,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  AnimationMixer,
  WebGLRenderer,
} from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

let camera, scene, renderer;
let clock;

const mixers = [];

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(2, 3, -6);
  camera.lookAt(0, 1, 0);

  clock = new Clock();

  scene = new Scene();
  scene.background = new Color(0xa0a0a0);
  scene.fog = new Fog(0xa0a0a0, 10, 50);

  const hemiLight = new HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.position.set(-3, 10, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 4;
  dirLight.shadow.camera.bottom = -4;
  dirLight.shadow.camera.left = -4;
  dirLight.shadow.camera.right = 4;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);

  // scene.add( new CameraHelper( dirLight.shadow.camera ) );

  // ground

  const mesh = new Mesh(
    new PlaneGeometry(200, 200),
    new MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const loader = new GLTFLoader();
  loader.load("models/gltf/Soldier.glb", function (gltf) {
    gltf.scene.traverse(function (object) {
      if (object.isMesh) object.castShadow = true;
    });

    const model1 = SkeletonUtils.clone(gltf.scene);
    const model2 = SkeletonUtils.clone(gltf.scene);
    const model3 = SkeletonUtils.clone(gltf.scene);

    const mixer1 = new AnimationMixer(model1);
    const mixer2 = new AnimationMixer(model2);
    const mixer3 = new AnimationMixer(model3);

    mixer1.clipAction(gltf.animations[0]).play(); // idle
    mixer2.clipAction(gltf.animations[1]).play(); // run
    mixer3.clipAction(gltf.animations[3]).play(); // walk

    model1.position.x = -2;
    model2.position.x = 0;
    model3.position.x = 2;

    scene.add(model1, model2, model3);
    mixers.push(mixer1, mixer2, mixer3);

    animate();
  });

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
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

  const delta = clock.getDelta();

  for (const mixer of mixers) mixer.update(delta);

  renderer.render(scene, camera);
}
