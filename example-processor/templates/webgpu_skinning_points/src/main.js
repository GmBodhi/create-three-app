import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  color,
  computeSkinning,
  objectWorldMatrix,
  instancedArray,
  instanceIndex,
  Fn,
  shapeCircle,
} from "three/tsl";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let camera, scene, renderer;
let mixer, clock;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 300, -85);

  scene = new Scene();
  scene.background = new Color(0x111111);
  camera.lookAt(0, 0, -85);

  scene.add(new AmbientLight(0xffffff, 10));

  clock = new Clock();

  const loader = new GLTFLoader();
  loader.load("models/gltf/Michelle.glb", function (gltf) {
    const object = gltf.scene;
    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    object.traverse(function (child) {
      if (child.isMesh) {
        child.visible = false;

        const countOfPoints = child.geometry.getAttribute("position").count;

        const pointPositionArray = instancedArray(countOfPoints, "vec3").setPBO(
          true
        );
        const pointSpeedArray = instancedArray(countOfPoints, "vec3").setPBO(
          true
        );

        const pointSpeedAttribute = pointSpeedArray.toAttribute();
        const skinningPosition = computeSkinning(child);

        const materialPoints = new PointsNodeMaterial();
        materialPoints.colorNode = pointSpeedAttribute
          .mul(0.6)
          .mix(color(0x0066ff), color(0xff9000));
        materialPoints.opacityNode = shapeCircle();
        materialPoints.sizeNode = pointSpeedAttribute
          .length()
          .exp()
          .min(5)
          .mul(5)
          .add(1);
        materialPoints.sizeAttenuation = false;

        const updateSkinningPoints = Fn(() => {
          const pointPosition = pointPositionArray.element(instanceIndex);
          const pointSpeed = pointSpeedArray.element(instanceIndex);

          const skinningWorldPosition =
            objectWorldMatrix(child).mul(skinningPosition);

          const skinningSpeed = skinningWorldPosition.sub(pointPosition);

          pointSpeed.assign(skinningSpeed);
          pointPosition.assign(skinningWorldPosition);
        }, "void");

        materialPoints.positionNode = Fn(() => {
          updateSkinningPoints();

          return pointPositionArray.toAttribute();
        })()
          .compute(countOfPoints)
          .onInit(() => {
            // initialize point positions and speeds

            renderer.compute(updateSkinningPoints().compute(countOfPoints));
          });

        const pointCloud = new Sprite(materialPoints);
        pointCloud.count = countOfPoints;
        scene.add(pointCloud);
      }
    });

    object.scale.set(100, 100, 100);
    object.rotation.x = -Math.PI / 2;

    scene.add(object);
  });

  //renderer

  renderer = new WebGPURenderer({ antialias: true });
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
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
