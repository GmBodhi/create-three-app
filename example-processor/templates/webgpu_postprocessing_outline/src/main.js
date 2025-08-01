import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { pass, uniform, time, oscSine } from "three/tsl";
import { outline } from "three/addons/tsl/display/OutlineNode.js";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

let container, stats;
let camera, scene, renderer, controls;
let postProcessing, outlinePass;

let selectedObjects = [];

const raycaster = new Raycaster();
const mouse = new Vector2();

const obj3d = new Object3D();
const group = new Group();

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer = new WebGPURenderer();
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 8);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 20;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  //

  scene.add(new AmbientLight(0xaaaaaa, 0.6));

  const light = new DirectionalLight(0xddffdd, 2);
  light.position.set(5, 5, 5);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.bias = -0.005;

  const d = 10;

  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.camera.far = 25;

  scene.add(light);

  // model

  const loader = new OBJLoader();
  loader.load("models/obj/tree.obj", function (object) {
    let scale = 1.0;

    object.traverse(function (child) {
      if (child instanceof Mesh) {
        child.geometry.center();
        child.geometry.computeBoundingSphere();
        scale = 0.2 * child.geometry.boundingSphere.radius;

        const phongMaterial = new MeshPhongMaterial({
          color: 0xffffff,
          specular: 0x111111,
          shininess: 5,
        });
        child.material = phongMaterial;
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });

    object.position.y = 1;
    object.scale.divideScalar(scale);
    obj3d.add(object);
  });

  scene.add(group);

  group.add(obj3d);

  //

  const geometry = new SphereGeometry(3, 48, 24);

  for (let i = 0; i < 20; i++) {
    const material = new MeshLambertMaterial();
    material.color.setHSL(Math.random(), 1.0, 0.3);

    const mesh = new Mesh(geometry, material);
    mesh.position.x = Math.random() * 4 - 2;
    mesh.position.y = Math.random() * 4 - 2;
    mesh.position.z = Math.random() * 4 - 2;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.scale.multiplyScalar(Math.random() * 0.3 + 0.1);
    group.add(mesh);
  }

  const floorMaterial = new MeshLambertMaterial({ side: DoubleSide });

  const floorGeometry = new PlaneGeometry(12, 12);
  const floorMesh = new Mesh(floorGeometry, floorMaterial);
  floorMesh.rotation.x -= Math.PI * 0.5;
  floorMesh.position.y -= 1.5;
  group.add(floorMesh);
  floorMesh.receiveShadow = true;

  const torusGeometry = new TorusGeometry(1, 0.3, 16, 100);
  const torusMaterial = new MeshPhongMaterial({ color: 0xffaaff });
  const torus = new Mesh(torusGeometry, torusMaterial);
  torus.position.z = -4;
  group.add(torus);
  torus.receiveShadow = true;
  torus.castShadow = true;

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // outline pass

  const edgeStrength = uniform(3.0);
  const edgeGlow = uniform(0.0);
  const edgeThickness = uniform(1.0);
  const pulsePeriod = uniform(0);
  const visibleEdgeColor = uniform(new Color(0xffffff));
  const hiddenEdgeColor = uniform(new Color(0x4e3636));

  outlinePass = outline(scene, camera, {
    selectedObjects,
    edgeGlow,
    edgeThickness,
  });

  const { visibleEdge, hiddenEdge } = outlinePass;

  const period = time.div(pulsePeriod).mul(2);
  const osc = oscSine(period).mul(0.5).add(0.5); // osc [ 0.5, 1.0 ]

  const outlineColor = visibleEdge
    .mul(visibleEdgeColor)
    .add(hiddenEdge.mul(hiddenEdgeColor))
    .mul(edgeStrength);
  const outlinePulse = pulsePeriod
    .greaterThan(0)
    .select(outlineColor.mul(osc), outlineColor);

  // postprocessing

  const scenePass = pass(scene, camera);

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputNode = outlinePulse.add(scenePass);

  // gui

  const gui = new GUI({ width: 280 });
  gui.add(edgeStrength, "value", 0.01, 10).name("edgeStrength");
  gui.add(edgeGlow, "value", 0.0, 1).name("edgeGlow");
  gui.add(edgeThickness, "value", 1, 4).name("edgeThickness");
  gui.add(pulsePeriod, "value", 0.0, 5).name("pulsePeriod");
  gui
    .addColor({ color: visibleEdgeColor.value.getHex(SRGBColorSpace) }, "color")
    .onChange((value) => {
      visibleEdgeColor.value.set(value);
    })
    .name("visibleEdgeColor");
  gui
    .addColor({ color: hiddenEdgeColor.value.getHex(SRGBColorSpace) }, "color")
    .onChange((value) => {
      hiddenEdgeColor.value.set(value);
    })
    .name("hiddenEdgeColor");

  //

  window.addEventListener("resize", onWindowResize);

  renderer.domElement.style.touchAction = "none";
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    if (event.isPrimary === false) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    checkIntersection();
  }

  function addSelectedObject(object) {
    selectedObjects = [];
    selectedObjects.push(object);
  }

  function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(scene, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      addSelectedObject(selectedObject);
      outlinePass.selectedObjects = selectedObjects;
    } else {
      // outlinePass.selectedObjects = [];
    }
  }
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  stats.begin();

  controls.update();

  postProcessing.render();

  stats.end();
}
