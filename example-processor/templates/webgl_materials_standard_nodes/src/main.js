import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  ReinhardToneMapping,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  MeshStandardMaterial,
  TextureLoader,
  RepeatWrapping,
  UnsignedByteType,
  PMREMGenerator,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import "three/examples/jsm/renderers/webgl/nodes/WebGLNodes.js";

import TextureNode from "three/examples/jsm/renderers/nodes/inputs/TextureNode.js";
import Vector3Node from "three/examples/jsm/renderers/nodes/inputs/Vector3Node.js";
import OperatorNode from "three/examples/jsm/renderers/nodes/math/OperatorNode.js";

let container, stats;

let camera, scene, renderer, controls;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ReinhardToneMapping;
  renderer.toneMappingExposure = 3;

  //

  scene = new Scene();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
  );
  camera.position.z = 2;

  controls = new TrackballControls(camera, renderer.domElement);

  //

  scene.add(new HemisphereLight(0x443333, 0x222233, 4));

  //

  const material = new MeshStandardMaterial();

  new OBJLoader()
    .setPath("models/obj/cerberus/")
    .load("Cerberus.obj", function (group) {
      const loader = new TextureLoader().setPath("models/obj/cerberus/");

      material.roughness = 1; // attenuates roughnessMap
      material.metalness = 1; // attenuates metalnessMap

      const diffuseMap = loader.load("Cerberus_A.jpg");
      diffuseMap.wrapS = RepeatWrapping;
      diffuseMap.encoding = sRGBEncoding;

      //material.map = diffuseMap;
      material.colorNode = new OperatorNode(
        "*",
        new TextureNode(diffuseMap),
        new Vector3Node(material.color)
      );

      // roughness is in G channel, metalness is in B channel
      material.metalnessMap = material.roughnessMap =
        loader.load("Cerberus_RM.jpg");
      material.normalMap = loader.load("Cerberus_N.jpg");

      material.roughnessMap.wrapS = RepeatWrapping;
      material.metalnessMap.wrapS = RepeatWrapping;
      material.normalMap.wrapS = RepeatWrapping;

      group.traverse(function (child) {
        if (child.isMesh) {
          child.material = material;
        }
      });

      group.position.x = -0.45;
      group.rotation.y = -Math.PI / 2;
      scene.add(group);
    });

  const environments = {
    "Venice Sunset": { filename: "venice_sunset_1k.hdr" },
    Overpass: { filename: "pedestrian_overpass_1k.hdr" },
  };

  function loadEnvironment(name) {
    if (environments[name].texture !== undefined) {
      scene.background = environments[name].texture;
      scene.environment = environments[name].texture;
      return;
    }

    const filename = environments[name].filename;
    new RGBELoader()
      .setDataType(UnsignedByteType)
      .setPath("textures/equirectangular/")
      .load(filename, function (hdrEquirect) {
        const hdrCubeRenderTarget =
          pmremGenerator.fromEquirectangular(hdrEquirect);
        hdrEquirect.dispose();

        scene.background = hdrCubeRenderTarget.texture;
        scene.environment = hdrCubeRenderTarget.texture;
        environments[name].texture = hdrCubeRenderTarget.texture;
      });
  }

  const params = {
    environment: Object.keys(environments)[0],
  };
  loadEnvironment(params.environment);

  const gui = new GUI();
  gui
    .add(params, "environment", Object.keys(environments))
    .onChange(function (value) {
      loadEnvironment(value);
    });
  gui.open();

  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

//

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

//

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);

  stats.update();
}
