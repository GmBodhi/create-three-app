//Shaders

import gbufferVert_ from "./shaders/gbufferVert.glsl";
import gbufferFrag_ from "./shaders/gbufferFrag.glsl";
import renderVert_ from "./shaders/renderVert.glsl";
import renderFrag_ from "./shaders/renderFrag.glsl";

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  WebGLMultipleRenderTargets,
  NearestFilter,
  Scene,
  Color,
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

import WebGL from "three/addons/capabilities/WebGL.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, controls;
let renderTarget;
let postScene, postCamera;

const parameters = {
  samples: 4,
  wireframe: false,
};

const gui = new GUI();
gui.add(parameters, "samples", 0, 4).step(1);
gui.add(parameters, "wireframe");
gui.onChange(render);

init();

function init() {
  if (WebGL.isWebGL2Available() === false) {
    document.body.appendChild(WebGL.getWebGL2ErrorMessage());
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
  }

  // Name our G-Buffer attachments for debugging

  renderTarget.texture[0].name = "diffuse";
  renderTarget.texture[1].name = "normal";

  // Scene setup

  scene = new Scene();
  scene.background = new Color(0x222222);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.z = 4;

  const loader = new TextureLoader();

  const diffuse = loader.load("textures/hardwood2_diffuse.jpg", render);
  diffuse.wrapS = RepeatWrapping;
  diffuse.wrapT = RepeatWrapping;

  scene.add(
    new Mesh(
      new TorusKnotGeometry(1, 0.3, 128, 32),
      new RawShaderMaterial({
        vertexShader: gbufferVert_,
        fragmentShader: gbufferFrag_,
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
        vertexShader: renderVert_,
        fragmentShader: renderFrag_,
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
  //controls.enableZoom = false;

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
  renderTarget.samples = parameters.samples;

  scene.traverse(function (child) {
    if (child.material !== undefined) {
      child.material.wireframe = parameters.wireframe;
    }
  });

  // render scene into target
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  // render post FX
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}
