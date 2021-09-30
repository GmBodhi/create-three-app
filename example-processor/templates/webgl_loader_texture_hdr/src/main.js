//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  ReinhardToneMapping,
  sRGBEncoding,
  Scene,
  OrthographicCamera,
  UnsignedByteType,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
} from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const params = {
  exposure: 2.0,
};

let renderer, scene, camera;

init();

function init() {
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  renderer.toneMapping = ReinhardToneMapping;
  renderer.toneMappingExposure = params.exposure;

  renderer.outputEncoding = sRGBEncoding;

  scene = new Scene();

  const aspect = window.innerWidth / window.innerHeight;

  camera = new OrthographicCamera(-aspect, aspect, 1, -1, 0, 1);

  new RGBELoader()
    .setDataType(UnsignedByteType) // alt: FloatType, HalfFloatType
    .load("textures/memorial.hdr", function (texture, textureData) {
      //console.log( textureData );
      //console.log( texture );

      const material = new MeshBasicMaterial({ map: texture });

      const quad = new PlaneGeometry(
        (1.5 * textureData.width) / textureData.height,
        1.5
      );

      const mesh = new Mesh(quad, material);

      scene.add(mesh);

      render();
    });

  //

  const gui = new GUI();

  gui.add(params, "exposure", 0, 4, 0.01).onChange(render);
  gui.open();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;

  const frustumHeight = camera.top - camera.bottom;

  camera.left = (-frustumHeight * aspect) / 2;
  camera.right = (frustumHeight * aspect) / 2;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

//

function render() {
  renderer.toneMappingExposure = params.exposure;

  renderer.render(scene, camera);
}
