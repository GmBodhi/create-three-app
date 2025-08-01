import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, startTime, object, stats;

init();

function init() {
  camera = new PerspectiveCamera(
    36,
    window.innerWidth / window.innerHeight,
    0.25,
    16
  );

  camera.position.set(0, 1.3, 3);

  scene = new Scene();

  // Lights

  scene.add(new AmbientLight(0xcccccc));

  const spotLight = new SpotLight(0xffffff, 60);
  spotLight.angle = Math.PI / 5;
  spotLight.penumbra = 0.2;
  spotLight.position.set(2, 3, 3);
  spotLight.castShadow = true;
  spotLight.shadow.camera.near = 3;
  spotLight.shadow.camera.far = 10;
  spotLight.shadow.mapSize.width = 2048;
  spotLight.shadow.mapSize.height = 2048;
  spotLight.shadow.bias = -0.002;
  spotLight.shadow.radius = 4;
  scene.add(spotLight);

  const dirLight = new DirectionalLight(0x55505a, 3);
  dirLight.position.set(0, 3, 0);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 10;

  dirLight.shadow.camera.right = 1;
  dirLight.shadow.camera.left = -1;
  dirLight.shadow.camera.top = 1;
  dirLight.shadow.camera.bottom = -1;

  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // Clipping planes

  const globalPlane = new Plane(new Vector3(-1, 0, 0), 0.1);
  const localPlane1 = new Plane(new Vector3(0, -1, 0), 0.8);
  const localPlane2 = new Plane(new Vector3(0, 0, -1), 0.1);

  // Clipping Groups

  const globalClippingGroup = new ClippingGroup();
  globalClippingGroup.clippingPlanes = [globalPlane];

  const knotClippingGroup = new ClippingGroup();
  knotClippingGroup.clippingPlanes = [localPlane1, localPlane2];
  knotClippingGroup.clipIntersection = true;

  scene.add(globalClippingGroup);
  globalClippingGroup.add(knotClippingGroup);

  // Geometry

  const material = new MeshPhongNodeMaterial({
    color: 0x80ee10,
    shininess: 0,
    side: DoubleSide,

    // ***** Clipping setup (material): *****
    alphaToCoverage: true,
  });

  const geometry = new TorusKnotGeometry(0.4, 0.08, 95, 20);

  object = new Mesh(geometry, material);
  object.castShadow = true;
  knotClippingGroup.add(object);

  const ground = new Mesh(
    new PlaneGeometry(9, 9, 1, 1),
    new MeshPhongNodeMaterial({
      color: 0xa0adaf,
      shininess: 150,
      alphaToCoverage: true,
    })
  );

  ground.rotation.x = -Math.PI / 2; // rotates X/Y to X/Z
  ground.receiveShadow = true;
  globalClippingGroup.add(ground);

  // Stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // Renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  window.addEventListener("resize", onWindowResize);
  document.body.appendChild(renderer.domElement);

  // Controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  // GUI

  const gui = new GUI(),
    props = {
      alphaToCoverage: true,
    },
    folderKnot = gui.addFolder("Knot Clipping Group"),
    propsKnot = {
      get Enabled() {
        return knotClippingGroup.enabled;
      },
      set Enabled(v) {
        knotClippingGroup.enabled = v;
      },

      get Shadows() {
        return knotClippingGroup.clipShadows;
      },
      set Shadows(v) {
        knotClippingGroup.clipShadows = v;
      },

      get Intersection() {
        return knotClippingGroup.clipIntersection;
      },

      set Intersection(v) {
        knotClippingGroup.clipIntersection = v;
      },

      get Plane() {
        return localPlane1.constant;
      },
      set Plane(v) {
        localPlane1.constant = v;
      },
    },
    folderGlobal = gui.addFolder("Global Clipping Group"),
    propsGlobal = {
      get Enabled() {
        return globalClippingGroup.enabled;
      },
      set Enabled(v) {
        globalClippingGroup.enabled = v;
      },

      get Plane() {
        return globalPlane.constant;
      },
      set Plane(v) {
        globalPlane.constant = v;
      },
    };

  gui.add(props, "alphaToCoverage").onChange(function (value) {
    ground.material.alphaToCoverage = value;
    ground.material.needsUpdate = true;

    material.alphaToCoverage = value;
    material.needsUpdate = true;
  });

  folderKnot.add(propsKnot, "Enabled");
  folderKnot.add(propsKnot, "Shadows");
  folderKnot.add(propsKnot, "Intersection");
  folderKnot.add(propsKnot, "Plane", 0.3, 1.25);

  folderGlobal.add(propsGlobal, "Enabled");
  folderGlobal.add(propsGlobal, "Plane", -0.4, 3);

  // Start

  startTime = Date.now();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(currentTime) {
  const time = (currentTime - startTime) / 1000;

  object.position.y = 0.8;
  object.rotation.x = time * 0.5;
  object.rotation.y = time * 0.2;
  object.scale.setScalar(Math.cos(time) * 0.125 + 0.875);

  stats.begin();
  renderer.render(scene, camera);
  stats.end();
}
