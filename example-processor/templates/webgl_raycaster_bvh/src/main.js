import "./style.css"; // For webpack support

import {
  BufferGeometry,
  Mesh,
  Raycaster,
  Vector3,
  Quaternion,
  Matrix4,
  PerspectiveCamera,
  Scene,
  Color,
  HemisphereLight,
  WebGLRenderer,
  BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  InstancedMesh,
  SphereGeometry,
  MeshBasicMaterial,
  DynamicDrawUsage,
} from "three";
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
  MeshBVHVisualizer,
} from "three-mesh-bvh";
import Stats from "three/addons/libs/stats.module.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

// Add the extension functions
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
Mesh.prototype.raycast = acceleratedRaycast;

let stats;
let camera, scene, renderer;
let mesh, helper, bvh;
let sphereInstance, lineSegments;

// reusable variables
const _raycaster = new Raycaster();
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3(1, 1, 1);
const _matrix = new Matrix4();
const _axis = new Vector3();
const MAX_RAYS = 3000;
const RAY_COLOR = 0x444444;

const params = {
  count: 150,
  firstHitOnly: true,
  useBVH: true,

  displayHelper: false,
  helperDepth: 10,
};

init();
animate();

function init() {
  // environment
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.position.z = 10;

  scene = new Scene();
  scene.background = new Color(0xeeeeee);

  const ambient = new HemisphereLight(0xffffff, 0x999999);
  scene.add(ambient);

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // raycast visualizations
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(MAX_RAYS * 2 * 3), 3)
  );
  lineSegments = new LineSegments(
    lineGeometry,
    new LineBasicMaterial({
      color: RAY_COLOR,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    })
  );

  sphereInstance = new InstancedMesh(
    new SphereGeometry(),
    new MeshBasicMaterial({ color: RAY_COLOR }),
    2 * MAX_RAYS
  );
  sphereInstance.instanceMatrix.setUsage(DynamicDrawUsage);
  sphereInstance.count = 0;

  scene.add(sphereInstance, lineSegments);

  // load the bunny
  const loader = new FBXLoader();
  loader.load("models/fbx/stanford-bunny.fbx", (object) => {
    mesh = object.children[0];

    const geometry = mesh.geometry;
    geometry.translate(0, 0.5 / 0.0075, 0);
    geometry.computeBoundsTree();
    bvh = geometry.boundsTree;

    if (!params.useBVH) {
      geometry.boundsTree = null;
    }

    scene.add(mesh);
    mesh.scale.setScalar(0.0075);

    helper = new MeshBVHVisualizer(mesh);
    helper.color.set(0xe91e63);
    scene.add(helper);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 75;

  // set up gui
  const gui = new GUI();
  const rayFolder = gui.addFolder("Raycasting");
  rayFolder.add(params, "count", 1, MAX_RAYS, 1);
  rayFolder.add(params, "firstHitOnly");
  rayFolder.add(params, "useBVH").onChange((v) => {
    mesh.geometry.boundsTree = v ? bvh : null;
  });

  const helperFolder = gui.addFolder("BVH Helper");
  helperFolder.add(params, "displayHelper");
  helperFolder.add(params, "helperDepth", 1, 20, 1).onChange((v) => {
    helper.depth = v;
    helper.update();
  });

  window.addEventListener("resize", onWindowResize);
  onWindowResize();

  initRays();
}

function initRays() {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  const matrix = new Matrix4();

  for (let i = 0; i < MAX_RAYS * 2; i++) {
    position.randomDirection().multiplyScalar(3.75);
    matrix.compose(position, quaternion, scale);
    sphereInstance.setMatrixAt(i, matrix);
  }
}

function updateRays() {
  if (!mesh) return;

  _raycaster.firstHitOnly = params.firstHitOnly;
  const rayCount = params.count;

  let lineNum = 0;
  for (let i = 0; i < rayCount; i++) {
    // get the current ray origin
    sphereInstance.getMatrixAt(i * 2, _matrix);
    _matrix.decompose(_position, _quaternion, _scale);

    // rotate it about the origin
    const offset = 1e-4 * window.performance.now();
    _axis
      .set(
        Math.sin(i * 100 + offset),
        Math.cos(-i * 10 + offset),
        Math.sin(i * 1 + offset)
      )
      .normalize();
    _position.applyAxisAngle(_axis, 0.001);

    // update the position
    _scale.setScalar(0.02);
    _matrix.compose(_position, _quaternion, _scale);
    sphereInstance.setMatrixAt(i * 2, _matrix);

    // raycast
    _raycaster.ray.origin.copy(_position);
    _raycaster.ray.direction.copy(_position).multiplyScalar(-1).normalize();

    // update hits points and lines
    const hits = _raycaster.intersectObject(mesh);
    if (hits.length !== 0) {
      const hit = hits[0];
      const point = hit.point;
      _scale.setScalar(0.01);
      _matrix.compose(point, _quaternion, _scale);
      sphereInstance.setMatrixAt(i * 2 + 1, _matrix);

      lineSegments.geometry.attributes.position.setXYZ(
        lineNum++,
        _position.x,
        _position.y,
        _position.z
      );
      lineSegments.geometry.attributes.position.setXYZ(
        lineNum++,
        point.x,
        point.y,
        point.z
      );
    } else {
      sphereInstance.setMatrixAt(i * 2 + 1, _matrix);
      lineSegments.geometry.attributes.position.setXYZ(
        lineNum++,
        _position.x,
        _position.y,
        _position.z
      );
      lineSegments.geometry.attributes.position.setXYZ(lineNum++, 0, 0, 0);
    }
  }

  sphereInstance.count = rayCount * 2;
  sphereInstance.instanceMatrix.needsUpdate = true;

  lineSegments.geometry.setDrawRange(0, lineNum);
  lineSegments.geometry.attributes.position.needsUpdate = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  if (helper) {
    helper.visible = params.displayHelper;
  }

  if (mesh) {
    mesh.rotation.y += 0.002;
    mesh.updateMatrixWorld();
  }

  updateRays();

  renderer.render(scene, camera);
}
