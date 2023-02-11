import "./style.css"; // For webpack support

import {
  Vector3,
  Scene,
  FogExp2,
  Color,
  PerspectiveCamera,
  AmbientLight,
  WebGLRenderer,
  sRGBEncoding,
  WebGLCubeRenderTarget,
  CubeCamera,
  MeshBasicMaterial,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import {
  CCDIKSolver,
  CCDIKHelper,
} from "three/examples/jsm/animation/CCDIKSolver.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let scene, camera, renderer, orbitControls, transformControls;
let mirrorSphereCamera;

const OOI = {};
let IKSolver;

let stats, gui, conf;
const v0 = new Vector3();

init().then(animate);

async function init() {
  conf = {
    followSphere: false,
    turnHead: true,
    ik_solver: true,
  };

  scene = new Scene();
  scene.fog = new FogExp2(0xffffff, 0.17);
  scene.background = new Color(0xdddddd);

  camera = new PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.001,
    5000
  );
  camera.position.set(
    0.9728517749133652,
    1.1044765132727201,
    0.7316689528482836
  );
  camera.lookAt(scene.position);

  const ambientLight = new AmbientLight(0xffffff, 8); // soft white light
  scene.add(ambientLight);

  renderer = new WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.minDistance = 0.2;
  orbitControls.maxDistance = 1.5;
  orbitControls.enableDamping = true;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/");
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  const gltf = await gltfLoader.loadAsync("models/gltf/kira.glb");
  gltf.scene.traverse((n) => {
    if (n.name === "head") OOI.head = n;
    if (n.name === "lowerarm_l") OOI.lowerarm_l = n;
    if (n.name === "Upperarm_l") OOI.Upperarm_l = n;
    if (n.name === "hand_l") OOI.hand_l = n;
    if (n.name === "target_hand_l") OOI.target_hand_l = n;

    if (n.name === "boule") OOI.sphere = n;
    if (n.name === "Kira_Shirt_left") OOI.kira = n;

    if (n.isMesh) n.frustumCulled = false;
  });
  scene.add(gltf.scene);

  orbitControls.target.copy(OOI.sphere.position); // orbit controls lookAt the sphere
  OOI.hand_l.attach(OOI.sphere);

  // mirror sphere cube-camera
  const cubeRenderTarget = new WebGLCubeRenderTarget(1024);
  mirrorSphereCamera = new CubeCamera(0.05, 50, cubeRenderTarget);
  scene.add(mirrorSphereCamera);
  const mirrorSphereMaterial = new MeshBasicMaterial({
    envMap: cubeRenderTarget.texture,
  });
  OOI.sphere.material = mirrorSphereMaterial;

  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.size = 0.75;
  transformControls.showX = false;
  transformControls.space = "world";
  transformControls.attach(OOI.target_hand_l);
  scene.add(transformControls);
  // disable orbitControls while using transformControls
  transformControls.addEventListener(
    "mouseDown",
    () => (orbitControls.enabled = false)
  );
  transformControls.addEventListener(
    "mouseUp",
    () => (orbitControls.enabled = true)
  );

  OOI.kira.add(OOI.kira.skeleton.bones[0]);
  const iks = [
    {
      target: 22, // "target_hand_l"
      effector: 6, // "hand_l"
      links: [
        {
          index: 5, // "lowerarm_l"
          rotationMin: new Vector3(1.2, -1.8, -0.4),
          rotationMax: new Vector3(1.7, -1.1, 0.3),
        },
        {
          index: 4, // "Upperarm_l"
          rotationMin: new Vector3(0.1, -0.7, -1.8),
          rotationMax: new Vector3(1.1, 0, -1.4),
        },
      ],
    },
  ];
  IKSolver = new CCDIKSolver(OOI.kira, iks);
  const ccdikhelper = new CCDIKHelper(OOI.kira, iks, 0.01);
  scene.add(ccdikhelper);

  gui = new GUI();
  gui.add(conf, "followSphere").name("follow sphere");
  gui.add(conf, "turnHead").name("turn head");
  gui.add(conf, "ik_solver").name("IK auto update");
  gui.add(IKSolver, "update").name("IK manual update()");
  gui.open();

  window.addEventListener("resize", onWindowResize, false);
}

function animate() {
  if (OOI.sphere && mirrorSphereCamera) {
    OOI.sphere.visible = false;
    OOI.sphere.getWorldPosition(mirrorSphereCamera.position);
    mirrorSphereCamera.update(renderer, scene);
    OOI.sphere.visible = true;
  }

  if (OOI.sphere && conf.followSphere) {
    // orbitControls follows the sphere
    OOI.sphere.getWorldPosition(v0);
    orbitControls.target.lerp(v0, 0.1);
  }

  if (OOI.head && OOI.sphere && conf.turnHead) {
    // turn head
    OOI.sphere.getWorldPosition(v0);
    OOI.head.lookAt(v0);
    OOI.head.rotation.set(
      OOI.head.rotation.x,
      OOI.head.rotation.y + Math.PI,
      OOI.head.rotation.z
    );
  }

  if (conf.ik_solver) {
    if (IKSolver) IKSolver.update();
  }

  orbitControls.update();
  renderer.render(scene, camera);

  stats.update(); // fps stats

  requestAnimationFrame(animate);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
