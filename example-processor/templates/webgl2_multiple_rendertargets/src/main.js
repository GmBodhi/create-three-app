//Shaders

import gbufferVert from "./shaders/gbufferVert.glsl";
import gbufferFrag from "./shaders/gbufferFrag.glsl";
import renderVert from "./shaders/renderVert.glsl";
import renderFrag from "./shaders/renderFrag.glsl";

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  WebGLMultipleRenderTargets,
  NearestFilter,
  FloatType,
  Scene,
  PerspectiveCamera,
  TextureLoader,
  RepeatWrapping,
  Mesh,
  TorusKnotGeometry,
  RawShaderMaterial,
  Vector2,
  GLSL3,
  OrthographicCamera,
  PlaneGeometry,
} from "three";

import { WEBGL } from "three/examples/jsm/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer, controls;
let renderTarget;
let postScene, postCamera;

init();

function init() {
  if (WEBGL.isWebGL2Available() === false) {
    document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
    return;
  }

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create a multi render target with Float buffers

  renderTarget = new WebGLMultipleRenderTargets(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio,
    2
  );

  for (let i = 0, il = renderTarget.texture.length; i < il; i++) {
    renderTarget.texture[i].minFilter = NearestFilter;
    renderTarget.texture[i].magFilter = NearestFilter;
    renderTarget.texture[i].type = FloatType;
  }

  // Name our G-Buffer attachments for debugging

  renderTarget.texture[0].name = "diffuse";
  renderTarget.texture[1].name = "normal";

  // Scene setup

  scene = new Scene();

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    10
  );
  camera.position.z = 4;

  const diffuse = new TextureLoader().load(
    "textures/brick_diffuse.jpg",

    function () {
      // ready to render
      render();
    }
  );

  diffuse.wrapS = diffuse.wrapT = RepeatWrapping;

  scene.add(
    new Mesh(
      new TorusKnotGeometry(1, 0.3, 128, 64),
      new RawShaderMaterial({
        vertexShader: document
          .querySelector("#gbuffer-vert")
          .textContent.trim(),
        fragmentShader: document
          .querySelector("#gbuffer-frag")
          .textContent.trim(),
        uniforms: {
          tDiffuse: { value: diffuse },
          repeat: { value: new Vector2(5, 0.5) },
        },
        glslVersion: GLSL3,
      })
    )
  );

  // PostProcessing setup

  postScene = new Scene();
  postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  postScene.add(
    new Mesh(
      new PlaneGeometry(2, 2),
      new RawShaderMaterial({
        vertexShader: document.querySelector("#render-vert").textContent.trim(),
        fragmentShader: document
          .querySelector("#render-frag")
          .textContent.trim(),
        uniforms: {
          tDiffuse: { value: renderTarget.texture[0] },
          tNormal: { value: renderTarget.texture[1] },
        },
        glslVersion: GLSL3,
      })
    )
  );

  // Controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.enableZoom = false;
  controls.screenSpacePanning = true;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  const dpr = renderer.getPixelRatio();
  renderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);

  render();
}

function render() {
  // render scene into target
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  // render post FX
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}
