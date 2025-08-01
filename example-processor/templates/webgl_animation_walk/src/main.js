import "./style.css"; // For webpack support

import {
  Vector3,
  Quaternion,
  PerspectiveCamera,
  Clock,
  Scene,
  Color,
  Fog,
  Group,
  DirectionalLight,
  CameraHelper,
  WebGLRenderer,
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  EquirectangularReflectionMapping,
  TextureLoader,
  SRGBColorSpace,
  RepeatWrapping,
  MeshStandardMaterial,
  Vector2,
  PlaneGeometry,
  Mesh,
  SphereGeometry,
  PointLight,
  SkeletonHelper,
  AnimationMixer,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let scene, renderer, camera, floor, orbitControls;
let group, followGroup, model, skeleton, mixer, clock;

let actions;

const settings = {
  show_skeleton: false,
  fixe_transition: true,
};

const PI = Math.PI;
const PI90 = Math.PI / 2;

const controls = {
  key: [0, 0],
  ease: new Vector3(),
  position: new Vector3(),
  up: new Vector3(0, 1, 0),
  rotate: new Quaternion(),
  current: "Idle",
  fadeDuration: 0.5,
  runVelocity: 5,
  walkVelocity: 1.8,
  rotateSpeed: 0.05,
  floorDecale: 0,
};

init();

function init() {
  const container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 2, -5);

  clock = new Clock();

  scene = new Scene();
  scene.background = new Color(0x5e5d5d);
  scene.fog = new Fog(0x5e5d5d, 2, 20);

  group = new Group();
  scene.add(group);

  followGroup = new Group();
  scene.add(followGroup);

  const dirLight = new DirectionalLight(0xffffff, 5);
  dirLight.position.set(-2, 5, -3);
  dirLight.castShadow = true;
  const cam = dirLight.shadow.camera;
  cam.top = cam.right = 2;
  cam.bottom = cam.left = -2;
  cam.near = 3;
  cam.far = 8;
  dirLight.shadow.mapSize.set(1024, 1024);
  followGroup.add(dirLight);
  followGroup.add(dirLight.target);

  //scene.add( new CameraHelper( cam ) );

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(0, 1, 0);
  orbitControls.enableDamping = true;
  orbitControls.enablePan = false;
  orbitControls.maxPolarAngle = PI90 - 0.05;
  orbitControls.update();

  // EVENTS

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // DEMO

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("lobe.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 1.5;

      loadModel();
      addFloor();
    });
}

function addFloor() {
  const size = 50;
  const repeat = 16;

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const floorT = new TextureLoader().load(
    "textures/floors/FloorsCheckerboard_S_Diffuse.jpg"
  );
  floorT.colorSpace = SRGBColorSpace;
  floorT.repeat.set(repeat, repeat);
  floorT.wrapS = floorT.wrapT = RepeatWrapping;
  floorT.anisotropy = maxAnisotropy;

  const floorN = new TextureLoader().load(
    "textures/floors/FloorsCheckerboard_S_Normal.jpg"
  );
  floorN.repeat.set(repeat, repeat);
  floorN.wrapS = floorN.wrapT = RepeatWrapping;
  floorN.anisotropy = maxAnisotropy;

  const mat = new MeshStandardMaterial({
    map: floorT,
    normalMap: floorN,
    normalScale: new Vector2(0.5, 0.5),
    color: 0x404040,
    depthWrite: false,
    roughness: 0.85,
  });

  const g = new PlaneGeometry(size, size, 50, 50);
  g.rotateX(-PI90);

  floor = new Mesh(g, mat);
  floor.receiveShadow = true;
  scene.add(floor);

  controls.floorDecale = (size / repeat) * 4;

  const bulbGeometry = new SphereGeometry(0.05, 16, 8);
  const bulbLight = new PointLight(0xffee88, 2, 500, 2);

  const bulbMat = new MeshStandardMaterial({
    emissive: 0xffffee,
    emissiveIntensity: 1,
    color: 0x000000,
  });
  bulbLight.add(new Mesh(bulbGeometry, bulbMat));
  bulbLight.position.set(1, 0.1, -3);
  bulbLight.castShadow = true;
  floor.add(bulbLight);
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load("models/gltf/Soldier.glb", function (gltf) {
    model = gltf.scene;
    group.add(model);
    model.rotation.y = PI;
    group.rotation.y = PI;

    model.traverse(function (object) {
      if (object.isMesh) {
        if (object.name == "vanguard_Mesh") {
          object.castShadow = true;
          object.receiveShadow = true;
          //object.material.envMapIntensity = 0.5;
          object.material.metalness = 1.0;
          object.material.roughness = 0.2;
          object.material.color.set(1, 1, 1);
          object.material.metalnessMap = object.material.map;
        } else {
          object.material.metalness = 1;
          object.material.roughness = 0;
          object.material.transparent = true;
          object.material.opacity = 0.8;
          object.material.color.set(1, 1, 1);
        }
      }
    });

    //

    skeleton = new SkeletonHelper(model);
    skeleton.setColors(new Color(0xe000ff), new Color(0x00e0ff));
    skeleton.visible = false;
    scene.add(skeleton);

    //

    createPanel();

    //

    const animations = gltf.animations;

    mixer = new AnimationMixer(model);

    actions = {
      Idle: mixer.clipAction(animations[0]),
      Walk: mixer.clipAction(animations[3]),
      Run: mixer.clipAction(animations[1]),
    };

    for (const m in actions) {
      actions[m].enabled = true;
      actions[m].setEffectiveTimeScale(1);
      if (m !== "Idle") actions[m].setEffectiveWeight(0);
    }

    actions.Idle.play();

    animate();
  });
}

function updateCharacter(delta) {
  const fade = controls.fadeDuration;
  const key = controls.key;
  const up = controls.up;
  const ease = controls.ease;
  const rotate = controls.rotate;
  const position = controls.position;
  const azimuth = orbitControls.getAzimuthalAngle();

  const active = key[0] === 0 && key[1] === 0 ? false : true;
  const play = active ? (key[2] ? "Run" : "Walk") : "Idle";

  // change animation

  if (controls.current != play) {
    const current = actions[play];
    const old = actions[controls.current];
    controls.current = play;

    if (settings.fixe_transition) {
      current.reset();
      current.weight = 1.0;
      current.stopFading();
      old.stopFading();
      // synchro if not idle
      if (play !== "Idle")
        current.time =
          old.time * (current.getClip().duration / old.getClip().duration);
      old._scheduleFading(fade, old.getEffectiveWeight(), 0);
      current._scheduleFading(fade, current.getEffectiveWeight(), 1);
      current.play();
    } else {
      setWeight(current, 1.0);
      old.fadeOut(fade);
      current.reset().fadeIn(fade).play();
    }
  }

  // move object

  if (controls.current !== "Idle") {
    // run/walk velocity
    const velocity =
      controls.current == "Run" ? controls.runVelocity : controls.walkVelocity;

    // direction with key
    ease.set(key[1], 0, key[0]).multiplyScalar(velocity * delta);

    // calculate camera direction
    const angle = unwrapRad(Math.atan2(ease.x, ease.z) + azimuth);
    rotate.setFromAxisAngle(up, angle);

    // apply camera angle on ease
    controls.ease.applyAxisAngle(up, azimuth);

    position.add(ease);
    camera.position.add(ease);

    group.position.copy(position);
    group.quaternion.rotateTowards(rotate, controls.rotateSpeed);

    orbitControls.target.copy(position).add({ x: 0, y: 1, z: 0 });
    followGroup.position.copy(position);

    // Move the floor without any limit
    const dx = position.x - floor.position.x;
    const dz = position.z - floor.position.z;
    if (Math.abs(dx) > controls.floorDecale) floor.position.x += dx;
    if (Math.abs(dz) > controls.floorDecale) floor.position.z += dz;
  }

  if (mixer) mixer.update(delta);

  orbitControls.update();
}

function unwrapRad(r) {
  return Math.atan2(Math.sin(r), Math.cos(r));
}

function createPanel() {
  const panel = new GUI({ width: 310 });

  panel.add(settings, "show_skeleton").onChange((b) => {
    skeleton.visible = b;
  });

  panel.add(settings, "fixe_transition");
}

function setWeight(action, weight) {
  action.enabled = true;
  action.setEffectiveTimeScale(1);
  action.setEffectiveWeight(weight);
}

function onKeyDown(event) {
  const key = controls.key;
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
    case "KeyZ":
      key[0] = -1;
      break;
    case "ArrowDown":
    case "KeyS":
      key[0] = 1;
      break;
    case "ArrowLeft":
    case "KeyA":
    case "KeyQ":
      key[1] = -1;
      break;
    case "ArrowRight":
    case "KeyD":
      key[1] = 1;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      key[2] = 1;
      break;
  }
}

function onKeyUp(event) {
  const key = controls.key;
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
    case "KeyZ":
      key[0] = key[0] < 0 ? 0 : key[0];
      break;
    case "ArrowDown":
    case "KeyS":
      key[0] = key[0] > 0 ? 0 : key[0];
      break;
    case "ArrowLeft":
    case "KeyA":
    case "KeyQ":
      key[1] = key[1] < 0 ? 0 : key[1];
      break;
    case "ArrowRight":
    case "KeyD":
      key[1] = key[1] > 0 ? 0 : key[1];
      break;
    case "ShiftLeft":
    case "ShiftRight":
      key[2] = 0;
      break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // Render loop

  const delta = clock.getDelta();

  updateCharacter(delta);

  renderer.render(scene, camera);
}
