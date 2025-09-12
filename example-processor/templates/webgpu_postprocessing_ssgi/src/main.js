import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  pass,
  mrt,
  output,
  normalView,
  diffuseColor,
  velocity,
  add,
  vec3,
  vec4,
  directionToColor,
  colorToDirection,
  sample,
} from "three/tsl";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, postProcessing, controls, stats;

init();

async function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.set(2.8, 1.8, 5);

  scene = new Scene();
  scene.background = new Color(0xffffff);

  renderer = new WebGPURenderer();
  //renderer.setPixelRatio( window.devicePixelRatio ); // probably too costly for most hardware
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.5;
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enablePan = true;
  controls.minDistance = 1;
  controls.maxDistance = 6;
  controls.update();

  //

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  scenePass.setMRT(
    mrt({
      output: output,
      diffuseColor: diffuseColor,
      normal: directionToColor(normalView),
      velocity: velocity,
    })
  );

  const scenePassColor = scenePass.getTextureNode("output");
  const scenePassDiffuse = scenePass.getTextureNode("diffuseColor");
  const scenePassDepth = scenePass.getTextureNode("depth");
  const scenePassNormal = scenePass.getTextureNode("normal");
  const scenePassVelocity = scenePass.getTextureNode("velocity");

  // bandwidth optimization

  const diffuseTexture = scenePass.getTexture("diffuseColor");
  diffuseTexture.type = UnsignedByteType;

  const normalTexture = scenePass.getTexture("normal");
  normalTexture.type = UnsignedByteType;

  const sceneNormal = sample((uv) => {
    return colorToDirection(scenePassNormal.sample(uv));
  });

  // gi

  const giPass = ssgi(scenePassColor, scenePassDepth, sceneNormal, camera);
  giPass.sliceCount.value = 2;
  giPass.stepCount.value = 8;

  // composite

  const gi = giPass.rgb;
  const ao = giPass.a;

  const compositePass = vec4(
    add(scenePassColor.rgb.mul(ao), scenePassDiffuse.rgb.mul(gi)),
    scenePassColor.a
  );

  // traa

  const traaPass = traa(
    compositePass,
    scenePassDepth,
    scenePassVelocity,
    camera
  );
  postProcessing.outputNode = traaPass;

  //

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/");
  dracoLoader.setDecoderConfig({ type: "js" });
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setPath("models/gltf/");

  const gltf = await loader.loadAsync("mirrors_edge.glb");

  const model = gltf.scene;
  scene.add(model);

  window.addEventListener("resize", onWindowResize);

  //

  const params = {
    output: 0,
  };

  const types = { Default: 0, AO: 1, GI: 2, Beauty: 3 };

  const gui = new GUI();
  gui.title("SSGI settings");
  gui.add(params, "output", types).onChange(updatePostprocessing);
  gui.add(giPass.sliceCount, "value", 1, 4).step(1).name("slice count");
  gui.add(giPass.stepCount, "value", 1, 32).step(1).name("step count");
  gui.add(giPass.radius, "value", 1, 25).name("radius");
  gui.add(giPass.expFactor, "value", 1, 3).name("exp factor");
  gui.add(giPass.thickness, "value", 0.01, 10).name("thickness");
  gui.add(giPass.backfaceLighting, "value", 0, 1).name("backface lighting");
  gui.add(giPass.aoIntensity, "value", 0, 4).name("AO intenstiy");
  gui.add(giPass.giIntensity, "value", 0, 100).name("GI intenstiy");
  gui.add(giPass.useLinearThickness, "value").name("use linear thickness");
  gui.add(giPass.useScreenSpaceSampling, "value").name("screen-space sampling");
  gui
    .add(giPass, "useTemporalFiltering")
    .name("temporal filtering")
    .onChange(updatePostprocessing);

  function updatePostprocessing(value) {
    if (value === 1) {
      postProcessing.outputNode = vec4(vec3(ao), 1);
    } else if (value === 2) {
      postProcessing.outputNode = vec4(gi, 1);
    } else if (value === 3) {
      postProcessing.outputNode = scenePassColor;
    } else {
      postProcessing.outputNode = giPass.useTemporalFiltering
        ? traaPass
        : compositePass;
    }

    postProcessing.needsUpdate = true;
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
  controls.update();

  stats.update();

  postProcessing.render();
}
