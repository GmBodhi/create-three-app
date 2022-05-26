//Shaders

import gbufferVert_ from "./shaders/gbufferVert.glsl";
import gbufferFrag_ from "./shaders/gbufferFrag.glsl";
import renderVert_ from "./shaders/renderVert.glsl";
import renderFrag_ from "./shaders/renderFrag.glsl";

import "./style.css"; // For webpack support

import {
  Clock,
  WebGLRenderer,
  WebGLMultipleRenderTargets,
  NearestFilter,
  Scene,
  Fog,
  MeshBasicMaterial,
  Mesh,
  PlaneGeometry,
  Color,
  PerspectiveCamera,
  TextureLoader,
  RepeatWrapping,
  Group,
  TorusKnotGeometry,
  RawShaderMaterial,
  Vector2,
  GLSL3,
  OrthographicCamera,
} from "three";

import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

let camera, scene, renderer, controls, container, group;
let renderTarget;
let postScene, postCamera;
let stats;

const clock = new Clock();
// Create a multi render target with Float buffers
const gui = new GUI();

const effectController = {
  msaa: true,
};

init();
gui.add(effectController, "msaa", true).onChange(() => {
  renderTarget.samples = effectController.msaa ? 4 : 0;
  render();
});

function init() {
  container = document.getElementById("container");

  if (WebGL.isWebGL2Available() === false) {
    document.body.appendChild(WebGL.getWebGL2ErrorMessage());
    return;
  }

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild(stats.domElement);

  renderTarget = new WebGLMultipleRenderTargets(
    window.innerWidth,
    window.innerHeight,
    2,
    {
      samples: effectController.msaa ? 4 : 0,
      depthBuffer: true,
      stencilBuffer: true,
    }
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
  scene.fog = new Fog(0xa0a0a0, 500, 2000);

  const groundMat = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
  });
  groundMat.onBeforeCompile = function (shader) {
    shader.fragmentShader = `
						layout(location = 1) out vec4 gOther;
						${shader.fragmentShader}
					`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <fog_fragment>",
      `
						#include <fog_fragment>
						gOther = gl_FragColor;
						`
    );
  };

  const ground = new Mesh(new PlaneGeometry(10000, 10000), groundMat);
  ground.position.y = -100;
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.background = new Color(0xa0a0a0);

  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    container.offsetWidth / container.offsetHeight,
    1,
    2000
  );
  camera.position.z = 500;

  const diffuse = new TextureLoader().load("textures/brick_diffuse.jpg");

  diffuse.wrapS = diffuse.wrapT = RepeatWrapping;

  group = new Group();

  const geometry = new TorusKnotGeometry(10, 3.3, 12, 32);

  for (let i = 0; i < 10; i++) {
    const material = new RawShaderMaterial({
      vertexShader: gbufferVert_,
      fragmentShader: gbufferFrag_,
      uniforms: {
        tDiffuse: { value: diffuse },
        repeat: { value: new Vector2(5, 0.5) },
      },
      wireframe: i % 2 === 0,
      glslVersion: GLSL3,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.x = (i / 10) * 600 - 300;
    mesh.position.y = (i / 10) * 200 - 100;
    mesh.position.z = Math.random() * 600 - 300;
    mesh.rotation.x = Math.random();
    mesh.rotation.z = Math.random();
    mesh.scale.setScalar(Math.random() * 5 + 5);
    group.add(mesh);
  }

  scene.add(group);
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
  controls.enableZoom = false;
  controls.screenSpacePanning = true;

  window.addEventListener("resize", onWindowResize);

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderTarget.setSize(window.innerWidth, window.innerHeight);

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

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  group.rotation.y += clock.getDelta() * 0.1;

  stats.update();
  render();
}
