//Shaders

import vertexShader_ from "./shaders/vertexShader.glsl";
import fragmentShader_ from "./shaders/fragmentShader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  SphereGeometry,
  UniformsGroup,
  Color,
  Uniform,
  Vector4,
  RawShaderMaterial,
  GLSL3,
  Mesh,
  PlaneGeometry,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, clock, stats;

let lightingUniformsGroup, lightCenters;

const container = document.getElementById("container");

const pointLightsMax = 300;

const api = {
  count: 200,
};

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 50, 50);

  scene = new Scene();
  camera.lookAt(scene.position);

  clock = new Clock();

  // geometry

  const geometry = new SphereGeometry();

  // uniforms groups

  lightingUniformsGroup = new UniformsGroup();
  lightingUniformsGroup.setName("LightingData");

  const data = [];
  const dataColors = [];
  lightCenters = [];

  for (let i = 0; i < pointLightsMax; i++) {
    const col = new Color(0xffffff * Math.random()).toArray();
    const x = Math.random() * 50 - 25;
    const z = Math.random() * 50 - 25;

    data.push(new Uniform(new Vector4(x, 1, z, 0))); // light position
    dataColors.push(new Uniform(new Vector4(col[0], col[1], col[2], 0))); // light color

    // Store the center positions
    lightCenters.push({ x, z });
  }

  lightingUniformsGroup.add(data); // light position
  lightingUniformsGroup.add(dataColors); // light position
  lightingUniformsGroup.add(new Uniform(pointLightsMax)); // light position

  const cameraUniformsGroup = new UniformsGroup();
  cameraUniformsGroup.setName("ViewData");
  cameraUniformsGroup.add(new Uniform(camera.projectionMatrix)); // projection matrix
  cameraUniformsGroup.add(new Uniform(camera.matrixWorldInverse)); // view matrix

  const material = new RawShaderMaterial({
    uniforms: {
      modelMatrix: { value: null },
      normalMatrix: { value: null },
    },
    // uniformsGroups: [ cameraUniformsGroup, lightingUniformsGroup ],
    name: "Box",
    defines: {
      POINTLIGHTS_MAX: pointLightsMax,
    },
    vertexShader: vertexShader_,
    fragmentShader: fragmentShader_,
    glslVersion: GLSL3,
  });

  const plane = new Mesh(new PlaneGeometry(100, 100), material.clone());
  plane.material.uniformsGroups = [cameraUniformsGroup, lightingUniformsGroup];
  plane.material.uniforms.modelMatrix.value = plane.matrixWorld;
  plane.material.uniforms.normalMatrix.value = plane.normalMatrix;
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  scene.add(plane);

  // meshes
  const gridSize = { x: 10, y: 1, z: 10 };
  const spacing = 6;

  for (let i = 0; i < gridSize.x; i++) {
    for (let j = 0; j < gridSize.y; j++) {
      for (let k = 0; k < gridSize.z; k++) {
        const mesh = new Mesh(geometry, material.clone());
        mesh.name = "Sphere";
        mesh.material.uniformsGroups = [
          cameraUniformsGroup,
          lightingUniformsGroup,
        ];
        mesh.material.uniforms.modelMatrix.value = mesh.matrixWorld;
        mesh.material.uniforms.normalMatrix.value = mesh.normalMatrix;
        scene.add(mesh);

        mesh.position.x = i * spacing - (gridSize.x * spacing) / 2;
        mesh.position.y = 0;
        mesh.position.z = k * spacing - (gridSize.z * spacing) / 2;
      }
    }
  }

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize, false);

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;

  // stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // gui
  const gui = new GUI();
  gui
    .add(api, "count", 1, pointLightsMax)
    .step(1)
    .onChange(function () {
      lightingUniformsGroup.uniforms[2].value = api.count;
    });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  stats.update();

  const elapsedTime = clock.getElapsedTime();

  const lights = lightingUniformsGroup.uniforms[0];

  // Parameters for circular movement
  const radius = 5; // Smaller radius for individual circular movements
  const speed = 0.5; // Speed of rotation

  // Update each light's position
  for (let i = 0; i < lights.length; i++) {
    const light = lights[i];
    const center = lightCenters[i];

    // Calculate circular movement around the light's center
    const angle = speed * elapsedTime + i * 0.5; // Phase difference for each light
    const x = center.x + Math.sin(angle) * radius;
    const z = center.z + Math.cos(angle) * radius;

    // Update the light's position
    light.value.set(x, 1, z, 0);
  }

  renderer.render(scene, camera);
}
