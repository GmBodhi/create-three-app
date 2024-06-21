//Shaders

import vs_ from "./shaders/vs.glsl";
import fs_ from "./shaders/fs.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  TextureUtils,
  CompressedArrayTexture,
  ShaderMaterial,
  Vector2,
  GLSL3,
  InstancedBufferGeometry,
  PlaneGeometry,
  InstancedBufferAttribute,
  IntType,
  InstancedMesh,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

let camera, scene, mesh, renderer;

const planeWidth = 20;
const planeHeight = 10;

init();

async function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.z = 70;

  scene = new Scene();

  // Configure the renderer.

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Configure the KTX2 loader.

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath("jsm/libs/basis/");
  ktx2Loader.detectSupport(renderer);

  // Load several KTX2 textures which will later be used to modify
  // specific texture array layers.

  const spiritedaway = await ktx2Loader.loadAsync("textures/spiritedaway.ktx2");

  // Create a texture array for rendering.

  const layerByteLength = TextureUtils.getByteLength(
    spiritedaway.image.width,
    spiritedaway.image.height,
    spiritedaway.format,
    spiritedaway.type
  );

  const textureArray = new CompressedArrayTexture(
    [
      {
        data: new Uint8Array(layerByteLength * 3),
        width: spiritedaway.image.width,
        height: spiritedaway.image.height,
      },
    ],
    spiritedaway.image.width,
    spiritedaway.image.height,
    3,
    spiritedaway.format,
    spiritedaway.type
  );

  // Setup the GUI

  const formData = {
    srcLayer: 0,
    destLayer: 0,
    transfer() {
      const layerElementLength =
        layerByteLength / spiritedaway.mipmaps[0].data.BYTES_PER_ELEMENT;
      textureArray.mipmaps[0].data.set(
        spiritedaway.mipmaps[0].data.subarray(
          layerElementLength * (formData.srcLayer % spiritedaway.image.depth),
          layerElementLength *
            ((formData.srcLayer % spiritedaway.image.depth) + 1)
        ),
        layerByteLength * formData.destLayer
      );
      textureArray.addLayerUpdate(formData.destLayer);
      textureArray.needsUpdate = true;

      renderer.render(scene, camera);
    },
  };

  const gui = new GUI();
  gui.add(formData, "srcLayer", 0, spiritedaway.image.depth - 1, 1);
  gui.add(formData, "destLayer", 0, textureArray.image.depth - 1, 1);
  gui.add(formData, "transfer");

  /// Setup the scene.

  const material = new ShaderMaterial({
    uniforms: {
      diffuse: { value: textureArray },
      size: { value: new Vector2(planeWidth, planeHeight) },
    },
    vertexShader: vs_,
    fragmentShader: fs_,
    glslVersion: GLSL3,
  });

  const geometry = new InstancedBufferGeometry();
  geometry.copy(new PlaneGeometry(planeWidth, planeHeight));
  geometry.instanceCount = 3;

  const instancedIndexAttribute = new InstancedBufferAttribute(
    new Uint16Array([0, 1, 2]),
    1,
    false,
    1
  );
  instancedIndexAttribute.gpuType = IntType;
  geometry.setAttribute("instancedIndex", instancedIndexAttribute);

  mesh = new InstancedMesh(geometry, material, 3);

  scene.add(mesh);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}
