//Shaders

import vertexShader_ from "./shaders/vertexShader.glsl";
import fragmentShader_ from "./shaders/fragmentShader.glsl";

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometryLoader,
  MeshBasicMaterial,
  Mesh,
  ShaderMaterial,
  DoubleSide,
  Vector3,
  BufferAttribute,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

const API = {
  thickness: 1,
};

let renderer, scene, camera, mesh2;

init();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    500
  );
  camera.position.z = 200;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;

  new BufferGeometryLoader().load(
    "models/json/WaltHeadLo_buffergeometry.json",
    function (geometry) {
      geometry.deleteAttribute("normal");
      geometry.deleteAttribute("uv");

      setupAttributes(geometry);

      // left

      const material1 = new MeshBasicMaterial({
        color: 0xe0e0ff,
        wireframe: true,
      });

      const mesh1 = new Mesh(geometry, material1);
      mesh1.position.set(-40, 0, 0);

      scene.add(mesh1);

      // right

      const material2 = new ShaderMaterial({
        uniforms: { thickness: { value: API.thickness } },
        vertexShader: vertexShader_,
        fragmentShader: fragmentShader_,
        side: DoubleSide,
        alphaToCoverage: true, // only works when WebGLRenderer's "antialias" is set to "true"
      });
      material2.extensions.derivatives = true;

      mesh2 = new Mesh(geometry, material2);
      mesh2.position.set(40, 0, 0);

      scene.add(mesh2);

      //

      animate();
    }
  );

  //

  const gui = new GUI();

  gui.add(API, "thickness", 0, 4).onChange(function () {
    mesh2.material.uniforms.thickness.value = API.thickness;
  });

  gui.open();

  //

  window.addEventListener("resize", onWindowResize);
}

function setupAttributes(geometry) {
  const vectors = [
    new Vector3(1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(0, 0, 1),
  ];

  const position = geometry.attributes.position;
  const centers = new Float32Array(position.count * 3);

  for (let i = 0, l = position.count; i < l; i++) {
    vectors[i % 3].toArray(centers, i * 3);
  }

  geometry.setAttribute("center", new BufferAttribute(centers, 3));
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}
