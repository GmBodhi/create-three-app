import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  WebGLRenderer,
  MeshPhongMaterial,
  DoubleSide,
  Mesh,
  Matrix4,
  SRGBColorSpace,
  BufferGeometry,
  BufferAttribute,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

import { IfcAPI } from "web-ifc";

const WEB_IFC_VERSION = "0.0.77";
const WEB_IFC_WASM_PATH = `https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}/`;

let scene, camera, renderer;

init();

async function init() {
  scene = new Scene();
  scene.background = new Color(0x8cc7de);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(82.48, 22.09, -45.24);

  const directionalLight1 = new DirectionalLight(0xffeeff, 2.5);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new DirectionalLight(0xffffff, 2.5);
  directionalLight2.position.set(-1, 0.5, -1);
  scene.add(directionalLight2);

  const ambientLight = new AmbientLight(0xffffee, 0.75);
  scene.add(ambientLight);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(30.86, 7.73, 0.15);
  controls.update();
  controls.addEventListener("change", render);

  window.addEventListener("resize", onWindowResize);

  const ifcAPI = new IfcAPI();
  ifcAPI.SetWasmPath(WEB_IFC_WASM_PATH);
  await ifcAPI.Init();

  const response = await fetch("models/ifc/rac_advanced_sample_project.ifc");
  const data = new Uint8Array(await response.arrayBuffer());

  const modelID = ifcAPI.OpenModel(data, { COORDINATE_TO_ORIGIN: true });
  loadAllGeometry(ifcAPI, modelID);
  ifcAPI.CloseModel(modelID);

  render();
}

function loadAllGeometry(ifcAPI, modelID) {
  const opaqueGeometries = [];
  const transparentGeometries = [];
  const materialCache = {};

  ifcAPI.StreamAllMeshes(modelID, (flatMesh) => {
    const placedGeometries = flatMesh.geometries;

    for (let i = 0; i < placedGeometries.size(); i++) {
      const placedGeometry = placedGeometries.get(i);
      const mesh = getPlacedGeometry(
        ifcAPI,
        modelID,
        placedGeometry,
        materialCache
      );
      const geometry = mesh.geometry.applyMatrix4(mesh.matrix);

      if (placedGeometry.color.w !== 1) {
        transparentGeometries.push(geometry);
      } else {
        opaqueGeometries.push(geometry);
      }
    }
  });

  if (opaqueGeometries.length > 0) {
    const merged = BufferGeometryUtils.mergeGeometries(opaqueGeometries);
    const material = new MeshPhongMaterial({
      side: DoubleSide,
      vertexColors: true,
    });
    scene.add(new Mesh(merged, material));
  }

  if (transparentGeometries.length > 0) {
    const merged = BufferGeometryUtils.mergeGeometries(transparentGeometries);
    const material = new MeshPhongMaterial({
      side: DoubleSide,
      vertexColors: true,
      transparent: true,
    });
    scene.add(new Mesh(merged, material));
  }
}

function getPlacedGeometry(ifcAPI, modelID, placedGeometry, materialCache) {
  const geometry = getBufferGeometry(ifcAPI, modelID, placedGeometry);
  const material = getMeshMaterial(placedGeometry.color, materialCache);
  const mesh = new Mesh(geometry, material);
  mesh.matrix = new Matrix4().fromArray(placedGeometry.flatTransformation);
  mesh.matrixAutoUpdate = false;
  return mesh;
}

function getBufferGeometry(ifcAPI, modelID, placedGeometry) {
  const geometry = ifcAPI.GetGeometry(
    modelID,
    placedGeometry.geometryExpressID
  );
  const vertexData = ifcAPI.GetVertexArray(
    geometry.GetVertexData(),
    geometry.GetVertexDataSize()
  );
  const indexData = ifcAPI.GetIndexArray(
    geometry.GetIndexData(),
    geometry.GetIndexDataSize()
  );

  const bufferGeometry = ifcGeometryToBuffer(
    placedGeometry.color,
    vertexData,
    indexData
  );

  // Geometry is owned by the WASM heap and must be released.
  geometry.delete();
  return bufferGeometry;
}

function getMeshMaterial(color, materialCache) {
  const id = `${color.x}-${color.y}-${color.z}-${color.w}`;
  const cached = materialCache[id];
  if (cached) return cached;

  const material = new MeshPhongMaterial({
    color: new Color(color.x, color.y, color.z),
    side: DoubleSide,
  });

  if (color.w !== 1) {
    material.transparent = true;
    material.opacity = color.w;
  }

  materialCache[id] = material;
  return material;
}

const _tmpColor = new Color();

function ifcGeometryToBuffer(color, vertexData, indexData) {
  // web-ifc returns interleaved [px, py, pz, nx, ny, nz] per vertex.
  const vertexCount = vertexData.length / 6;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 4);

  // IFC stores colors in sRGB display space; convert to linear once per geometry.
  _tmpColor.setRGB(color.x, color.y, color.z, SRGBColorSpace);

  for (let v = 0; v < vertexCount; v++) {
    const src = v * 6;
    const dst3 = v * 3;
    const dst4 = v * 4;

    positions[dst3 + 0] = vertexData[src + 0];
    positions[dst3 + 1] = vertexData[src + 1];
    positions[dst3 + 2] = vertexData[src + 2];

    normals[dst3 + 0] = vertexData[src + 3];
    normals[dst3 + 1] = vertexData[src + 4];
    normals[dst3 + 2] = vertexData[src + 5];

    colors[dst4 + 0] = _tmpColor.r;
    colors[dst4 + 1] = _tmpColor.g;
    colors[dst4 + 2] = _tmpColor.b;
    colors[dst4 + 3] = color.w;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 4));
  geometry.setIndex(new BufferAttribute(indexData, 1));
  return geometry;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function render() {
  renderer.render(scene, camera);
}
