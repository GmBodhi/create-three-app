import "./style.css"; // For webpack support

import * as THREE from "three";

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

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create a multi render target with Float buffers

  renderTarget = new THREE.WebGLMultipleRenderTargets(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio,
    2
  );

  for (let i = 0, il = renderTarget.texture.length; i < il; i++) {
    renderTarget.texture[i].minFilter = THREE.NearestFilter;
    renderTarget.texture[i].magFilter = THREE.NearestFilter;
    renderTarget.texture[i].type = THREE.FloatType;
  }

  // Name our G-Buffer attachments for debugging

  renderTarget.texture[0].name = "diffuse";
  renderTarget.texture[1].name = "normal";

  // Scene setup

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    10
  );
  camera.position.z = 4;

  const diffuse = new THREE.TextureLoader().load(
    "textures/brick_diffuse.jpg",

    function () {
      // ready to render
      render();
    }
  );

  diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;

  scene.add(
    new THREE.Mesh(
      new THREE.TorusKnotGeometry(1, 0.3, 128, 64),
      new THREE.RawShaderMaterial({
        vertexShader: document
          .querySelector("#gbuffer-vert")
          .textContent.trim(),
        fragmentShader: document
          .querySelector("#gbuffer-frag")
          .textContent.trim(),
        uniforms: {
          tDiffuse: { value: diffuse },
          repeat: { value: new THREE.Vector2(5, 0.5) },
        },
        glslVersion: THREE.GLSL3,
      })
    )
  );

  // PostProcessing setup

  postScene = new THREE.Scene();
  postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  postScene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial({
        vertexShader: document.querySelector("#render-vert").textContent.trim(),
        fragmentShader: document
          .querySelector("#render-frag")
          .textContent.trim(),
        uniforms: {
          tDiffuse: { value: renderTarget.texture[0] },
          tNormal: { value: renderTarget.texture[1] },
        },
        glslVersion: THREE.GLSL3,
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
