import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { varying, uv, texture, Fn } from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let rendererAntialiasingEnabled;
let rendererAntialiasingDisabled;
let camera;
let scene;
let gui;

const effectController = {
  sampling: "normal",
};

const atlasCanvas = document.createElement("canvas");
atlasCanvas.width = 16;
atlasCanvas.height = 16;

const ctx = atlasCanvas.getContext("2d");
ctx.fillStyle = "red";
ctx.fillRect(0, 0, 8, 8);

const redUVs = [0, 1, 0.5, 1, 0.5, 0.5, 0, 0.5];
ctx.fillStyle = "green";
ctx.fillRect(8, 0, 8, 8);

const greenUVs = [1, 1, 0.5, 1, 0.5, 0.5, 1, 0.5];

ctx.fillStyle = "blue";
ctx.fillRect(0, 8, 8, 8);

const blueUVs = [0, 0, 0.5, 0, 0.5, 0.5, 0, 0.5];

ctx.fillStyle = "yellow";
ctx.fillRect(8, 8, 8, 8);

const yellowUVs = [1, 0, 0.5, 0, 0.5, 0.5, 1, 0.5];

const faces = [redUVs, greenUVs, blueUVs, yellowUVs];

const canvasTexture = new CanvasTexture(atlasCanvas);
canvasTexture.colorSpace = SRGBColorSpace;
canvasTexture.mapping = UVMapping;
canvasTexture.wrapS = RepeatWrapping;
canvasTexture.wrapT = RepeatWrapping;
canvasTexture.magFilter = NearestFilter;
canvasTexture.minFilter = NearestFilter;
canvasTexture.format = RGBAFormat;
canvasTexture.type = UnsignedByteType;

const forceWebGL = false;

init();

function init() {
  camera = new PerspectiveCamera();
  camera.fov = 60;
  camera.near = 1;
  camera.far = 2100;
  camera.position.z = 50;

  scene = new Scene();

  const makeFaceGeometry = (uvs) => {
    const geometry = new BufferGeometry();
    const positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );

    const indices = [0, 1, 2, 2, 3, 0];
    geometry.setIndex(indices);

    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));

    return geometry;
  };

  const material = new MeshBasicNodeMaterial();
  const testUV = varying(uv(), "testUV");

  const createShader = (type, sampling) => {
    return Fn(() => {
      testUV.setInterpolation(type, sampling);

      return texture(canvasTexture, testUV).rgb;
    });
  };

  const withFlatFirstShader = createShader(
    InterpolationSamplingType.FLAT,
    InterpolationSamplingMode.FIRST
  );
  const withFlatEitherShader = createShader(
    InterpolationSamplingType.FLAT,
    InterpolationSamplingMode.EITHER
  );

  const withSampleShader = Fn(() => {
    testUV.setInterpolation(
      InterpolationSamplingType.PERSPECTIVE,
      InterpolationSamplingMode.SAMPLE
    );

    return texture(canvasTexture, testUV).rgb;
  });

  const withInterpolationShader = Fn(() => {
    testUV.setInterpolation(
      InterpolationSamplingType.PERSPECTIVE,
      InterpolationSamplingMode.CENTROID
    );

    return texture(canvasTexture, testUV).rgb;
  });

  const withoutInterpolationShader = Fn(() => {
    return texture(canvasTexture, uv()).rgb;
  });

  material.colorNode = withoutInterpolationShader();

  const faceMeshes = [];

  for (let x = -5; x < 5; x++) {
    for (let y = -5; y < 5; y++) {
      const face = faces[Math.floor(Math.random() * faces.length)];
      const geometry = makeFaceGeometry(face);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x * 2, y * 2, 0);
      faceMeshes.push(mesh);
      scene.add(mesh);
    }
  }

  // Create Standard Renderer
  rendererAntialiasingDisabled = new WebGPURenderer({
    antialias: false,
    forceWebGL: forceWebGL,
  });

  rendererAntialiasingDisabled.setPixelRatio(window.devicePixelRatio);
  rendererAntialiasingDisabled.setSize(
    window.innerWidth / 2,
    window.innerHeight
  );
  rendererAntialiasingDisabled.setAnimationLoop(animateStandard);

  // Create antialiased renderer
  rendererAntialiasingEnabled = new WebGPURenderer({
    antialias: true,
    forceWebGL: forceWebGL,
  });

  document.body
    .querySelector("#antialiasing-enabled")
    .appendChild(rendererAntialiasingEnabled.domElement);
  rendererAntialiasingEnabled.setPixelRatio(window.devicePixelRatio);
  rendererAntialiasingEnabled.setSize(
    window.innerWidth / 2,
    window.innerHeight
  );
  rendererAntialiasingEnabled.setAnimationLoop(animateAliased);

  document.body
    .querySelector("#antialiasing-disabled")
    .appendChild(rendererAntialiasingDisabled.domElement);
  document.body
    .querySelector("#antialiasing-disabled")
    .appendChild(rendererAntialiasingDisabled.domElement);

  onWindowResize();

  window.addEventListener("resize", onWindowResize);

  gui = new GUI();
  gui
    .add(effectController, "sampling", [
      InterpolationSamplingMode.NORMAL,
      InterpolationSamplingMode.CENTROID,
      InterpolationSamplingMode.SAMPLE,
      "flat first",
      "flat either",
    ])
    .onChange(() => {
      const interpolationShaderLib = {
        [InterpolationSamplingMode.NORMAL]: withoutInterpolationShader,
        [InterpolationSamplingMode.CENTROID]: withInterpolationShader,
        [InterpolationSamplingMode.SAMPLE]: withSampleShader,
        ["flat first"]: withFlatFirstShader,
        ["flat either"]: withFlatEitherShader,
      };

      const shader = interpolationShaderLib[effectController.sampling];

      for (let i = 0; i < faceMeshes.length; i++) {
        faceMeshes[i].material.colorNode = shader();
        faceMeshes[i].material.needsUpdate = true;
      }
    });
}

function onWindowResize() {
  const halfWidth = window.innerWidth / 2;
  rendererAntialiasingDisabled.setSize(halfWidth, window.innerHeight);
  rendererAntialiasingEnabled.setSize(halfWidth, window.innerHeight);
  const aspect = halfWidth / window.innerHeight;

  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

function animateStandard() {
  rendererAntialiasingDisabled.render(scene, camera);
}

function animateAliased() {
  rendererAntialiasingEnabled.render(scene, camera);
}
