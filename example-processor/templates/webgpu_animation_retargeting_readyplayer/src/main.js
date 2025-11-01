import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  screenUV,
  color,
  vec2,
  vec4,
  reflector,
  positionWorld,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { Inspector } from "three/addons/inspector/Inspector.js";

import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const [sourceModel, targetModel] = await Promise.all([
  new Promise((resolve, reject) => {
    new FBXLoader().load(
      "three/examples/models/fbx/mixamo.fbx",
      resolve,
      undefined,
      reject
    );
  }),

  new Promise((resolve, reject) => {
    new GLTFLoader().load(
      "three/examples/models/gltf/readyplayer.me.glb",
      resolve,
      undefined,
      reject
    );
  }),
]);

//

const clock = new Clock();

// scene

const scene = new Scene();

// background

const horizontalEffect = screenUV.x.mix(color(0x13172b), color(0x311649));
const lightEffect = screenUV
  .distance(vec2(0.5, 1.0))
  .oneMinus()
  .mul(color(0x0c5d68));

scene.backgroundNode = horizontalEffect.add(lightEffect);

//

const light = new HemisphereLight(0x311649, 0x0c5d68, 10);
scene.add(light);

const backLight = new DirectionalLight(0xffffff, 10);
backLight.position.set(0, 5, -5);
scene.add(backLight);

const keyLight = new DirectionalLight(0xfff9ea, 4);
keyLight.position.set(3, 5, 3);
scene.add(keyLight);

const camera = new PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.25,
  50
);
camera.position.set(0, 3, 5);

// add models to scene
scene.add(sourceModel);
scene.add(targetModel.scene);

// reposition models
sourceModel.position.x -= 0.9;
targetModel.scene.position.x += 0.9;

// reajust model - mixamo use centimeters, readyplayer.me use meters (three.js scale is meters)
sourceModel.scale.setScalar(0.01);

// retarget
const source = getSource(sourceModel);
const mixer = retargetModel(source, targetModel);

// renderer
const renderer = new WebGPURenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.inspector = new Inspector();
renderer.toneMapping = NeutralToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 3;
controls.maxDistance = 12;
controls.target.set(0, 1, 0);
controls.maxPolarAngle = Math.PI / 2;

// floor
const reflection = reflector();
reflection.target.rotateX(-Math.PI / 2);
scene.add(reflection.target);

const reflectionMask = positionWorld.xz.distance(0).mul(0.1).clamp().oneMinus();

const floorMaterial = new NodeMaterial();
floorMaterial.colorNode = vec4(reflection.rgb, reflectionMask);
floorMaterial.opacity = 0.2;
floorMaterial.transparent = true;

const floor = new Mesh(new BoxGeometry(50, 0.001, 50), floorMaterial);
floor.receiveShadow = true;

floor.position.set(0, 0, 0);
scene.add(floor);

//

function getSource(sourceModel) {
  const clip = sourceModel.animations[0];

  const helper = new SkeletonHelper(sourceModel);
  const skeleton = new Skeleton(helper.bones);

  const mixer = new AnimationMixer(sourceModel);
  mixer.clipAction(sourceModel.animations[0]).play();

  return { clip, skeleton, mixer };
}

function retargetModel(sourceModel, targetModel) {
  const targetSkin = targetModel.scene.children[0].children[1];

  const retargetOptions = {
    // specify the name of the source's hip bone.
    hip: "mixamorigHips",

    // preserve the scale of the target model
    scale: 0.01,

    // use ( 0, 1, 0 ) to ignore xz hip movement.
    //hipInfluence: new Vector3( 0, 1, 0 ),

    // Map of target's bone names to source's bone names -> { targetBoneName: sourceBoneName }
    getBoneName: function (bone) {
      return "mixamorig" + bone.name;
    },
  };

  const retargetedClip = SkeletonUtils.retargetClip(
    targetSkin,
    sourceModel.skeleton,
    sourceModel.clip,
    retargetOptions
  );

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

  renderer.render(scene, camera);
}
