import "./style.css"; // For webpack support

import {
  LoadingManager,
  Clock,
  PerspectiveCamera,
  Scene,
  Color,
  Fog,
  HemisphereLight,
  DirectionalLight,
  CameraHelper,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  GridHelper,
  WebGLRenderer,
  AnimationMixer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const manager = new LoadingManager();

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
let mixer;

const clock = new Clock();

const params = {
  asset: "Samba Dancing",
};

const assets = ["Samba Dancing", "morph_test"];

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.set(100, 200, 300);

  scene = new Scene();
  scene.background = new Color(0xa0a0a0);
  scene.fog = new Fog(0xa0a0a0, 200, 1000);

  const hemiLight = new HemisphereLight(0xffffff, 0x444444, 5);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 5);
  dirLight.position.set(0, 200, 100);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 180;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  scene.add(dirLight);

  // scene.add( new CameraHelper( dirLight.shadow.camera ) );

  // ground
  const mesh = new Mesh(
    new PlaneGeometry(2000, 2000),
    new MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const grid = new GridHelper(2000, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  loader = new FBXLoader(manager);
  loadAsset(params.asset);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 100, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  // stats
  stats = new Stats();
  container.appendChild(stats.dom);

  const gui = new GUI();
  gui.add(params, "asset", assets).onChange(function (value) {
    loadAsset(value);
  });

  guiMorphsFolder = gui.addFolder("Morphs").hide();
}

function loadAsset(asset) {
  loader.load("models/fbx/" + asset + ".fbx", function (group) {
    if (object) {
      object.traverse(function (child) {
        if (child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }

        if (child.geometry) child.geometry.dispose();
      });

      scene.remove(object);
    }

    //

    object = group;

    if (object.animations && object.animations.length) {
      mixer = new AnimationMixer(object);

      const action = mixer.clipAction(object.animations[0]);
      action.play();
    } else {
      mixer = null;
    }

    guiMorphsFolder.children.forEach((child) => child.destroy());
    guiMorphsFolder.hide();

    object.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.morphTargetDictionary) {
          guiMorphsFolder.show();
          const meshFolder = guiMorphsFolder.addFolder(
            child.name || child.uuid
          );
          Object.keys(child.morphTargetDictionary).forEach((key) => {
            meshFolder.add(
              child.morphTargetInfluences,
              child.morphTargetDictionary[key],
              0,
              1,
              0.01
            );
          });
        }
      }
    });

    scene.add(object);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);

  stats.update();
}
