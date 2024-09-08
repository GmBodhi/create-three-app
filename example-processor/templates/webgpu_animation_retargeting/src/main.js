import "./style.css"; // For webpack support

import {
  Clock,
  Scene,
  Group,
  HemisphereLight,
  DirectionalLight,
  PerspectiveCamera,
  NodeMaterial,
  Mesh,
  BoxGeometry,
  WebGPURenderer,
  NeutralToneMapping,
  SkeletonHelper,
  Skeleton,
  AnimationMixer,
  Matrix4,
  MathUtils,
  Euler,
} from "three";
import { color, screenUV, hue, timerLocal, reflector } from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const [sourceModel, targetModel] = await Promise.all([
  new Promise((resolve, reject) => {
    new GLTFLoader().load(
      "three/examples/models/gltf/Michelle.glb",
      resolve,
      undefined,
      reject
    );
  }),

  new Promise((resolve, reject) => {
    new GLTFLoader().load(
      "three/examples/models/gltf/Soldier.glb",
      resolve,
      undefined,
      reject
    );
  }),
]);

//

const clock = new Clock();

const stats = new Stats();
document.body.appendChild(stats.dom);

// scene
const scene = new Scene();
scene.backgroundNode = screenUV
  .distance(0.5)
  .mix(
    hue(color(0x0175ad), timerLocal(0.1)),
    hue(color(0x02274f), timerLocal(0.5))
  );

const helpers = new Group();
helpers.visible = false;
scene.add(helpers);

const light = new HemisphereLight(0xe9c0a5, 0x0175ad, 5);
scene.add(light);

const dirLight = new DirectionalLight(0xfff9ea, 4);
dirLight.position.set(2, 5, 2);
scene.add(dirLight);

const camera = new PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.25,
  50
);
camera.position.set(-2, 2, 4);

// add models to scene
scene.add(sourceModel.scene);
scene.add(targetModel.scene);

// reposition models
sourceModel.scene.position.x -= 1;
targetModel.scene.position.x += 1;

// reajust model
targetModel.scene.scale.setScalar(0.01);

// retarget
const source = getSource(sourceModel);
const mixer = retargetModel(source, targetModel);

// floor
const reflection = reflector();
reflection.target.rotateX(-Math.PI / 2);
scene.add(reflection.target);

const floorMaterial = new NodeMaterial();
floorMaterial.colorNode = reflection;
floorMaterial.opacity = 0.2;
floorMaterial.transparent = true;

const floor = new Mesh(new BoxGeometry(50, 0.001, 50), floorMaterial);
floor.receiveShadow = true;

floor.position.set(0, 0, 0);
scene.add(floor);

// renderer
const renderer = new WebGPURenderer({ antialias: true });
renderer.toneMapping = NeutralToneMapping;
renderer.setAnimationLoop(animate);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 3;
controls.maxDistance = 12;
controls.target.set(0, 1, 0);
controls.maxPolarAngle = Math.PI / 2;

const gui = new GUI();
gui.add(helpers, "visible").name("helpers");

//

function getSource(sourceModel) {
  const clip = sourceModel.animations[0];

  const helper = new SkeletonHelper(sourceModel.scene);
  helpers.add(helper);

  const skeleton = new Skeleton(helper.bones);

  const mixer = new AnimationMixer(sourceModel.scene);
  mixer.clipAction(sourceModel.animations[0]).play();

  return { clip, skeleton, mixer };
}

function retargetModel(sourceModel, targetModel) {
  const targetSkin = targetModel.scene.children[0].children[0];

  const targetSkelHelper = new SkeletonHelper(targetModel.scene);
  helpers.add(targetSkelHelper);

  const rotateCW45 = new Matrix4().makeRotationY(MathUtils.degToRad(45));
  const rotateCCW180 = new Matrix4().makeRotationY(MathUtils.degToRad(-180));
  const rotateCW180 = new Matrix4().makeRotationY(MathUtils.degToRad(180));
  const rotateFoot = new Matrix4().makeRotationFromEuler(
    new Euler(
      MathUtils.degToRad(45),
      MathUtils.degToRad(180),
      MathUtils.degToRad(0)
    )
  );

  const retargetOptions = {
    preserveHipPosition: false, // lock XZ position of the hip bone to the origin

    // specify the name of the source's hip bone.
    hip: "mixamorigHips",

    // preserve the scale of the target model
    scale: 1 / targetModel.scene.scale.y,

    // offset target bones -> { targetBoneName: offsetMatrix }
    localOffsets: {
      mixamorigLeftShoulder: rotateCW45,
      mixamorigRightShoulder: rotateCCW180,
      mixamorigLeftArm: rotateCW45,
      mixamorigRightArm: rotateCCW180,
      mixamorigLeftForeArm: rotateCW45,
      mixamorigRightForeArm: rotateCCW180,
      mixamorigLeftHand: rotateCW45,
      mixamorigRightHand: rotateCCW180,

      mixamorigLeftUpLeg: rotateCW180,
      mixamorigRightUpLeg: rotateCW180,
      mixamorigLeftLeg: rotateCW180,
      mixamorigRightLeg: rotateCW180,
      mixamorigLeftFoot: rotateFoot,
      mixamorigRightFoot: rotateFoot,
      mixamorigLeftToeBase: rotateCW180,
      mixamorigRightToeBase: rotateCW180,
    },

    // Map of target's bone names to source's bone names -> { targetBoneName: sourceBoneName }
    names: {
      mixamorigHips: "mixamorigHips",

      mixamorigSpine: "mixamorigSpine",
      mixamorigSpine2: "mixamorigSpine2",
      mixamorigHead: "mixamorigHead",

      mixamorigLeftShoulder: "mixamorigLeftShoulder",
      mixamorigRightShoulder: "mixamorigRightShoulder",
      mixamorigLeftArm: "mixamorigLeftArm",
      mixamorigRightArm: "mixamorigRightArm",
      mixamorigLeftForeArm: "mixamorigLeftForeArm",
      mixamorigRightForeArm: "mixamorigRightForeArm",
      mixamorigLeftHand: "mixamorigLeftHand",
      mixamorigRightHand: "mixamorigRightHand",

      mixamorigLeftUpLeg: "mixamorigLeftUpLeg",
      mixamorigRightUpLeg: "mixamorigRightUpLeg",
      mixamorigLeftLeg: "mixamorigLeftLeg",
      mixamorigRightLeg: "mixamorigRightLeg",
      mixamorigLeftFoot: "mixamorigLeftFoot",
      mixamorigRightFoot: "mixamorigRightFoot",
      mixamorigLeftToeBase: "mixamorigLeftToeBase",
      mixamorigRightToeBase: "mixamorigRightToeBase",
    },
  };

  const retargetedClip = SkeletonUtils.retargetClip(
    targetSkin,
    sourceModel.skeleton,
    sourceModel.clip,
    retargetOptions
  );

  // Apply the mixer directly to the SkinnedMesh, not any
  // ancestor node, because that's what
  // SkeletonUtils.retargetClip outputs the clip to be
  // compatible with.
  const mixer = new AnimationMixer(targetSkin);
  mixer.clipAction(retargetedClip).play();

  return mixer;
}

window.onresize = function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

function animate() {
  const delta = clock.getDelta();

  source.mixer.update(delta);
  mixer.update(delta);

  controls.update();

  stats.update();

  renderer.render(scene, camera);
}
