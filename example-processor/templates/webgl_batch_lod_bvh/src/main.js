import "./style.css"; // For webpack support

import {
  Mesh,
  BatchedMesh,
  Color,
  Raycaster,
  Vector2,
  Vector3,
  Quaternion,
  Matrix4,
  PerspectiveCamera,
  Scene,
  Fog,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
  TorusKnotGeometry,
  MeshStandardMaterial,
  WebGLCoordinateSystem,
} from "three";
import Stats from "three/addons/libs/stats.module.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { acceleratedRaycast, computeBatchedBoundsTree } from "three-mesh-bvh";

import {
  createRadixSort,
  extendBatchedMeshPrototype,
  getBatchedMeshLODCount,
} from "@three.ez/batched-mesh-extensions";
import {
  performanceRangeLOD,
  simplifyGeometriesByErrorLOD,
} from "@three.ez/simplify-geometry";

// add and override BatchedMesh methods ( @three.ez/batched-mesh-extensions )
extendBatchedMeshPrototype();

// add the extension functions ( three-mesh-bvh )
Mesh.prototype.raycast = acceleratedRaycast;
BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;

let stats;
let camera, scene, renderer;

const instancesCount = 500000;
let batchedMesh;
let lastHoveredInstance = null;
const lastHoveredColor = new Color();
const yellow = new Color("yellow");

const raycaster = new Raycaster();
const mouse = new Vector2(1, 1);
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3(1, 1, 1);
const matrix = new Matrix4();
const color = new Color();

init();

async function init() {
  // environment
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );
  camera.position.set(0, 10, 50);

  scene = new Scene();
  scene.fog = new Fog(0x000000, 500, 600);

  const ambient = new AmbientLight();
  scene.add(camera, ambient);

  const dirLight = new DirectionalLight("white", 2);
  camera.add(dirLight, dirLight.target);

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  raycaster.firstHitOnly = true;

  stats = new Stats();
  document.body.appendChild(stats.dom);

  const controls = new MapControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2;

  const geometries = [
    new TorusKnotGeometry(1, 0.4, 256, 32, 1, 1),
    new TorusKnotGeometry(1, 0.4, 256, 32, 1, 2),
    new TorusKnotGeometry(1, 0.4, 256, 32, 1, 3),
    new TorusKnotGeometry(1, 0.4, 256, 32, 1, 4),
    new TorusKnotGeometry(1, 0.4, 256, 32, 1, 5),
    new TorusKnotGeometry(1, 0.4, 256, 32, 2, 1),
    new TorusKnotGeometry(1, 0.4, 256, 32, 2, 3),
    new TorusKnotGeometry(1, 0.4, 256, 32, 3, 1),
    new TorusKnotGeometry(1, 0.4, 256, 32, 4, 1),
    new TorusKnotGeometry(1, 0.4, 256, 32, 5, 3),
  ];

  // generate 4 LODs (levels of detail) for each geometry
  const geometriesLODArray = await simplifyGeometriesByErrorLOD(
    geometries,
    4,
    performanceRangeLOD
  );

  // create BatchedMesh
  const { vertexCount, indexCount, LODIndexCount } =
    getBatchedMeshLODCount(geometriesLODArray);
  batchedMesh = new BatchedMesh(
    instancesCount,
    vertexCount,
    indexCount,
    new MeshStandardMaterial({ metalness: 0.2, roughness: 0.2 })
  );

  // enable radix sort for better performance
  batchedMesh.customSort = createRadixSort(batchedMesh);

  // add geometries and their LODs to the batched mesh ( all LODs share the same position array )
  for (let i = 0; i < geometriesLODArray.length; i++) {
    const geometryLOD = geometriesLODArray[i];
    const geometryId = batchedMesh.addGeometry(
      geometryLOD[0],
      -1,
      LODIndexCount[i]
    );
    batchedMesh.addGeometryLOD(geometryId, geometryLOD[1], 15);
    batchedMesh.addGeometryLOD(geometryId, geometryLOD[2], 75);
    batchedMesh.addGeometryLOD(geometryId, geometryLOD[3], 125);
    batchedMesh.addGeometryLOD(geometryId, geometryLOD[4], 200);
  }

  // place instances in a 2D grid with randomized rotation and color
  const sqrtCount = Math.ceil(Math.sqrt(instancesCount));
  const size = 5.5;
  const start = (sqrtCount / -2) * size + size / 2;

  for (let i = 0; i < instancesCount; i++) {
    const r = Math.floor(i / sqrtCount);
    const c = i % sqrtCount;
    const id = batchedMesh.addInstance(
      Math.floor(Math.random() * geometriesLODArray.length)
    );
    position.set(c * size + start, 0, r * size + start);
    quaternion.random();
    batchedMesh.setMatrixAt(id, matrix.compose(position, quaternion, scale));
    batchedMesh.setColorAt(id, color.setHSL(Math.random(), 0.6, 0.5));
  }

  // compute blas (bottom-level acceleration structure) bvh ( three-mesh-bvh )
  batchedMesh.computeBoundsTree();

  // compute tlas (top-level acceleration structure) bvh ( @three.ez/batched-mesh-extensions )
  batchedMesh.computeBVH(WebGLCoordinateSystem);

  scene.add(batchedMesh);

  // set up gui
  const config = {
    freeze: false,
    useBVH: true,
    useLOD: true,
  };

  const bvh = batchedMesh.bvh;
  const lods = batchedMesh._geometryInfo.map((x) => x.LOD);
  const onBeforeRender = batchedMesh.onBeforeRender;

  const gui = new GUI();

  gui.add(batchedMesh, "instanceCount").disable();

  gui.add(config, "freeze").onChange((v) => {
    batchedMesh.onBeforeRender = v ? () => {} : onBeforeRender;
  });

  const frustumCullingFolder = gui.addFolder("Frustum culling & raycasting");
  frustumCullingFolder.add(config, "useBVH").onChange((v) => {
    batchedMesh.bvh = v ? bvh : null;
  });

  const geometriesFolder = gui.addFolder("Geometries");
  geometriesFolder.add(config, "useLOD").onChange((v) => {
    const geometryInfo = batchedMesh._geometryInfo;
    for (let i = 0; i < geometryInfo.length; i++) {
      geometryInfo[i].LOD = v ? lods[i] : null;
    }
  });

  document.addEventListener("pointermove", onPointerMove);
  window.addEventListener("resize", onWindowResize);
  onWindowResize();

  renderer.setAnimationLoop(animate);
}

function onPointerMove(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycast();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function raycast() {
  raycaster.setFromCamera(mouse, camera);
  const intersection = raycaster.intersectObject(batchedMesh);

  const batchId = intersection.length > 0 ? intersection[0].batchId : null;

  if (lastHoveredInstance === batchId) return;

  if (lastHoveredInstance) {
    batchedMesh.setColorAt(lastHoveredInstance, lastHoveredColor);
  }

  if (batchId) {
    batchedMesh.getColorAt(batchId, lastHoveredColor);
    batchedMesh.setColorAt(batchId, yellow);
  }

  lastHoveredInstance = batchId;
}

function animate() {
  stats.begin();

  renderer.render(scene, camera);

  stats.end();
}
