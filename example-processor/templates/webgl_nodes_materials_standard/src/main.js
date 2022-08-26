import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  ReinhardToneMapping,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  LoadingManager,
  TextureLoader,
  RepeatWrapping,
  PMREMGenerator,
} from "three";
import * as Nodes from "three/nodes";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { nodeFrame } from "three/addons/renderers/webgl/nodes/WebGLNodes.js";

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

  const material = new Nodes.MeshStandardNodeMaterial();

  new OBJLoader()
    .setPath("models/obj/cerberus/")
    .load("Cerberus.obj", function (group) {
      const loaderManager = new LoadingManager();

      const loader = new TextureLoader(loaderManager).setPath(
        "models/obj/cerberus/"
      );

      const diffuseMap = loader.load("Cerberus_A.jpg");
      diffuseMap.wrapS = RepeatWrapping;
      diffuseMap.encoding = sRGBEncoding;

      const rmMap = loader.load("Cerberus_RM.jpg");
      rmMap.wrapS = RepeatWrapping;

      const normalMap = loader.load("Cerberus_N.jpg");
      normalMap.wrapS = RepeatWrapping;

      const mpMapNode = new Nodes.TextureNode(rmMap);

      material.colorNode = new Nodes.OperatorNode(
        "*",
        new Nodes.TextureNode(diffuseMap),
        new Nodes.UniformNode(material.color)
      );

      // roughness is in G channel, metalness is in B channel
      material.roughnessNode = new Nodes.SplitNode(mpMapNode, "g");
      material.metalnessNode = new Nodes.SplitNode(mpMapNode, "b");

      material.normalNode = new Nodes.NormalMapNode(
        new Nodes.TextureNode(normalMap)
      );

      group.traverse(function (child) {
        if (child.isMesh) {
          child.material = material;
        }
      });

      group.position.x = -0.45;
      group.rotation.y = -Math.PI / 2;
      //scene.add( group );

      // TODO: Serialization test

      loaderManager.onLoad = () => {
        const groupJSON = JSON.stringify(group.toJSON());

        const objectLoader = new Nodes.NodeObjectLoader();
        objectLoader.parse(JSON.parse(groupJSON), (newGroup) => {
          //scene.remove( group );

          newGroup.position.copy(group.position);
          newGroup.rotation.copy(group.rotation);

          scene.add(newGroup);

          console.log("Serialized!");
        });
      };
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

  nodeFrame.update();

  controls.update();
  renderer.render(scene, camera);

  stats.update();
}
