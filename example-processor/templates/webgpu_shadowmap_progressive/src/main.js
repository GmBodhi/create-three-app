import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { ProgressiveLightMap } from "three/addons/misc/ProgressiveLightMapGPU.js";

// ShadowMap + LightMap Res and Number of Directional Lights
const shadowMapRes = 1024,
  lightMapRes = 1024,
  lightCount = 4;
let camera,
  scene,
  renderer,
  controls,
  control,
  control2,
  object = new Mesh(),
  lightOrigin = null,
  progressiveSurfacemap;
const dirLights = [],
  lightmapObjects = [];
const params = {
  Enable: true,
  "Blur Edges": true,
  "Blend Window": 200,
  "Light Radius": 50,
  "Ambient Weight": 0.5,
  "Debug Lightmap": false,
};
init();
createGUI();

function init() {
  // renderer
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // camera
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 100, 200);
  camera.name = "Camera";

  // scene
  scene = new Scene();
  scene.background = new Color(0x949494);
  scene.fog = new Fog(0x949494, 1000, 3000);

  // progressive lightmap
  progressiveSurfacemap = new ProgressiveLightMap(renderer, lightMapRes);

  // directional lighting "origin"
  lightOrigin = new Group();
  lightOrigin.position.set(60, 150, 100);
  scene.add(lightOrigin);

  // transform gizmo
  control = new TransformControls(camera, renderer.domElement);
  control.addEventListener("dragging-changed", (event) => {
    controls.enabled = !event.value;
  });
  control.attach(lightOrigin);
  scene.add(control.getHelper());

  // create 8 directional lights to speed up the convergence
  for (let l = 0; l < lightCount; l++) {
    const dirLight = new DirectionalLight(0xffffff, Math.PI / lightCount);
    dirLight.name = "Dir. Light " + l;
    dirLight.position.set(200, 200, 200);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 100;
    dirLight.shadow.camera.far = 5000;
    dirLight.shadow.camera.right = 150;
    dirLight.shadow.camera.left = -150;
    dirLight.shadow.camera.top = 150;
    dirLight.shadow.camera.bottom = -150;
    dirLight.shadow.mapSize.width = shadowMapRes;
    dirLight.shadow.mapSize.height = shadowMapRes;
    dirLight.shadow.bias = -0.001;
    lightmapObjects.push(dirLight);
    dirLights.push(dirLight);
  }

  // ground
  const groundMesh = new Mesh(
    new PlaneGeometry(600, 600),
    new MeshPhongMaterial({ color: 0xffffff, depthWrite: true })
  );
  groundMesh.position.y = -0.1;
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.name = "Ground Mesh";
  lightmapObjects.push(groundMesh);
  scene.add(groundMesh);

  // model
  function loadModel() {
    object.traverse(function (child) {
      if (child.isMesh) {
        child.name = "Loaded Mesh";
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new MeshPhongMaterial();

        // This adds the model to the lightmap
        lightmapObjects.push(child);
        progressiveSurfacemap.addObjectsToLightMap(lightmapObjects);
      } else {
        child.layers.disableAll(); // Disable Rendering for this
      }
    });
    scene.add(object);
    object.scale.set(2, 2, 2);
    object.position.set(0, -16, 0);
    control2 = new TransformControls(camera, renderer.domElement);
    control2.addEventListener("dragging-changed", (event) => {
      controls.enabled = !event.value;
    });
    control2.attach(object);
    scene.add(control2.getHelper());
    const lightTarget = new Group();
    lightTarget.position.set(0, 20, 0);
    for (let l = 0; l < dirLights.length; l++) {
      dirLights[l].target = lightTarget;
    }

    object.add(lightTarget);
  }

  const manager = new LoadingManager(loadModel);
  const loader = new GLTFLoader(manager);
  loader.load("models/gltf/ShadowmappableMesh.glb", function (obj) {
    object = obj.scene.children[0];
  });

  // controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = 100;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 1.5;
  controls.target.set(0, 100, 0);

  window.addEventListener("resize", onWindowResize);
}

function createGUI() {
  const gui = new GUI({ title: "Accumulation Settings" });
  gui.add(params, "Enable");
  gui.add(params, "Blur Edges");
  gui.add(params, "Blend Window", 1, 500).step(1);
  gui.add(params, "Light Radius", 0, 200).step(10);
  gui.add(params, "Ambient Weight", 0, 1).step(0.1);
  gui
    .add(params, "Debug Lightmap")
    .onChange((value) => progressiveSurfacemap.showDebugLightmap(value));
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // Update the inertia on the orbit controls
  controls.update();

  // Accumulate Surface Maps
  if (params["Enable"]) {
    progressiveSurfacemap.update(
      camera,
      params["Blend Window"],
      params["Blur Edges"]
    );
  }

  // Manually Update the Directional Lights
  for (let l = 0; l < dirLights.length; l++) {
    // Sometimes they will be sampled from the target direction
    // Sometimes they will be uniformly sampled from the upper hemisphere
    if (Math.random() > params["Ambient Weight"]) {
      dirLights[l].position.set(
        lightOrigin.position.x + Math.random() * params["Light Radius"],
        lightOrigin.position.y + Math.random() * params["Light Radius"],
        lightOrigin.position.z + Math.random() * params["Light Radius"]
      );
    } else {
      // Uniform Hemispherical Surface Distribution for Ambient Occlusion
      const lambda = Math.acos(2 * Math.random() - 1) - 3.14159 / 2.0;
      const phi = 2 * 3.14159 * Math.random();
      dirLights[l].position.set(
        Math.cos(lambda) * Math.cos(phi) * 300 + object.position.x,
        Math.abs(Math.cos(lambda) * Math.sin(phi) * 300) +
          object.position.y +
          20,
        Math.sin(lambda) * 300 + object.position.z
      );
    }
  }

  // Render Scene
  renderer.render(scene, camera);
}
