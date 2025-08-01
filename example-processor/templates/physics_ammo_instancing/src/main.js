import "./style.css"; // For webpack support

import {
  Vector3,
  PerspectiveCamera,
  Scene,
  Color,
  HemisphereLight,
  DirectionalLight,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  BoxGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Matrix4,
  InstancedMesh,
  DynamicDrawUsage,
  IcosahedronGeometry,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AmmoPhysics } from "three/addons/physics/AmmoPhysics.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, stats;
let physics, position;

let boxes, spheres;

init();

async function init() {
  physics = await AmmoPhysics();
  position = new Vector3();

  //

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(-1, 1.5, 2);
  camera.lookAt(0, 0.5, 0);

  scene = new Scene();
  scene.background = new Color(0x666666);

  const hemiLight = new HemisphereLight();
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.position.set(5, 5, 5);
  dirLight.castShadow = true;
  dirLight.shadow.camera.zoom = 2;
  scene.add(dirLight);

  const shadowPlane = new Mesh(
    new PlaneGeometry(10, 10),
    new ShadowMaterial({
      color: 0x444444,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const floorCollider = new Mesh(
    new BoxGeometry(10, 5, 10),
    new MeshBasicMaterial({ color: 0x666666 })
  );
  floorCollider.position.y = -2.5;
  floorCollider.userData.physics = { mass: 0 };
  floorCollider.visible = false;
  scene.add(floorCollider);

  //

  const material = new MeshLambertMaterial();

  const matrix = new Matrix4();
  const color = new Color();

  // Boxes

  const geometryBox = new BoxGeometry(0.075, 0.075, 0.075);
  boxes = new InstancedMesh(geometryBox, material, 400);
  boxes.instanceMatrix.setUsage(DynamicDrawUsage); // will be updated every frame
  boxes.castShadow = true;
  boxes.receiveShadow = true;
  boxes.userData.physics = { mass: 1 };
  scene.add(boxes);

  for (let i = 0; i < boxes.count; i++) {
    matrix.setPosition(
      Math.random() - 0.5,
      Math.random() * 2,
      Math.random() - 0.5
    );
    boxes.setMatrixAt(i, matrix);
    boxes.setColorAt(i, color.setHex(0xffffff * Math.random()));
  }

  // Spheres

  const geometrySphere = new IcosahedronGeometry(0.05, 4);
  spheres = new InstancedMesh(geometrySphere, material, 400);
  spheres.instanceMatrix.setUsage(DynamicDrawUsage); // will be updated every frame
  spheres.castShadow = true;
  spheres.receiveShadow = true;
  spheres.userData.physics = { mass: 1 };
  scene.add(spheres);

  for (let i = 0; i < spheres.count; i++) {
    matrix.setPosition(
      Math.random() - 0.5,
      Math.random() * 2,
      Math.random() - 0.5
    );
    spheres.setMatrixAt(i, matrix);
    spheres.setColorAt(i, color.setHex(0xffffff * Math.random()));
  }

  physics.addScene(scene);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.y = 0.5;
  controls.update();

  setInterval(() => {
    let index = Math.floor(Math.random() * boxes.count);

    position.set(0, Math.random() + 1, 0);
    physics.setMeshPosition(boxes, position, index);

    //

    index = Math.floor(Math.random() * spheres.count);

    position.set(0, Math.random() + 1, 0);
    physics.setMeshPosition(spheres, position, index);
  }, 1000 / 60);
}

function animate() {
  renderer.render(scene, camera);

  stats.update();
}
