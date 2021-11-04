import "./style.css"; // For webpack support

import {
  Vector2,
  Raycaster,
  Vector3,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  ShaderMaterial,
  CubeTextureLoader,
  PlaneGeometry,
  MeshPhongMaterial,
  DoubleSide,
  Mesh,
  BufferGeometryLoader,
  SphereGeometry,
  AmbientLight,
  DirectionalLight,
  OrthographicCamera,
  LinearFilter,
  RGBFormat,
  WebGLRenderTarget,
  UniformsUtils,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import {
  BokehShader,
  BokehDepthShader,
} from "three/examples/jsm/shaders/BokehShader2.js";

let container, stats;
let camera, scene, renderer, materialDepth;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let distance = 100;
let effectController;

const postprocessing = { enabled: true };

const shaderSettings = {
  rings: 3,
  samples: 4,
};

const mouse = new Vector2();
const raycaster = new Raycaster();
const target = new Vector3(0, 20, -50);
const planes = [];
const leaves = 100;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );

  camera.position.y = 150;
  camera.position.z = 450;

  scene = new Scene();
  scene.add(camera);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);

  const depthShader = BokehDepthShader;

  materialDepth = new ShaderMaterial({
    uniforms: depthShader.uniforms,
    vertexShader: depthShader.vertexShader,
    fragmentShader: depthShader.fragmentShader,
  });

  materialDepth.uniforms["mNear"].value = camera.near;
  materialDepth.uniforms["mFar"].value = camera.far;

  // skybox

  const r = "textures/cube/Bridge2/";
  const urls = [
    r + "posx.jpg",
    r + "negx.jpg",
    r + "posy.jpg",
    r + "negy.jpg",
    r + "posz.jpg",
    r + "negz.jpg",
  ];

  const textureCube = new CubeTextureLoader().load(urls);

  scene.background = textureCube;

  // plane particles

  const planePiece = new PlaneGeometry(10, 10, 1, 1);

  const planeMat = new MeshPhongMaterial({
    color: 0xffffff * 0.4,
    shininess: 0.5,
    specular: 0xffffff,
    envMap: textureCube,
    side: DoubleSide,
  });

  const rand = Math.random;

  for (let i = 0; i < leaves; i++) {
    const plane = new Mesh(planePiece, planeMat);
    plane.rotation.set(rand(), rand(), rand());
    plane.rotation.dx = rand() * 0.1;
    plane.rotation.dy = rand() * 0.1;
    plane.rotation.dz = rand() * 0.1;

    plane.position.set(rand() * 150, 0 + rand() * 300, rand() * 150);
    plane.position.dx = rand() - 0.5;
    plane.position.dz = rand() - 0.5;
    scene.add(plane);
    planes.push(plane);
  }

  // adding Monkeys

  const loader2 = new BufferGeometryLoader();
  loader2.load("models/json/suzanne_buffergeometry.json", function (geometry) {
    geometry.computeVertexNormals();

    const material = new MeshPhongMaterial({
      specular: 0xffffff,
      envMap: textureCube,
      shininess: 50,
      reflectivity: 1.0,
      flatShading: true,
    });

    const monkeys = 20;

    for (let i = 0; i < monkeys; i++) {
      const mesh = new Mesh(geometry, material);

      mesh.position.z = Math.cos((i / monkeys) * Math.PI * 2) * 200;
      mesh.position.y = Math.sin((i / monkeys) * Math.PI * 3) * 20;
      mesh.position.x = Math.sin((i / monkeys) * Math.PI * 2) * 200;

      mesh.rotation.y = (i / monkeys) * Math.PI * 2;

      mesh.scale.setScalar(30);

      scene.add(mesh);
    }
  });

  // add balls

  const geometry = new SphereGeometry(1, 20, 20);

  for (let i = 0; i < 20; i++) {
    const ballmaterial = new MeshPhongMaterial({
      color: 0xffffff * Math.random(),
      shininess: 0.5,
      specular: 0xffffff,
      envMap: textureCube,
    });

    const mesh = new Mesh(geometry, ballmaterial);

    mesh.position.x = (Math.random() - 0.5) * 200;
    mesh.position.y = Math.random() * 50;
    mesh.position.z = (Math.random() - 0.5) * 200;
    mesh.scale.multiplyScalar(10);
    scene.add(mesh);
  }

  // lights

  scene.add(new AmbientLight(0x222222));

  const directionalLight1 = new DirectionalLight(0xffffff, 2);
  directionalLight1.position.set(2, 1.2, 10).normalize();
  scene.add(directionalLight1);

  const directionalLight2 = new DirectionalLight(0xffffff, 1);
  directionalLight2.position.set(-2, 1.2, -10).normalize();
  scene.add(directionalLight2);

  initPostprocessing();

  stats = new Stats();
  container.appendChild(stats.dom);

  container.style.touchAction = "none";
  container.addEventListener("pointermove", onPointerMove);

  effectController = {
    enabled: true,
    jsDepthCalculation: true,
    shaderFocus: false,

    fstop: 2.2,
    maxblur: 1.0,

    showFocus: false,
    focalDepth: 2.8,
    manualdof: false,
    vignetting: false,
    depthblur: false,

    threshold: 0.5,
    gain: 2.0,
    bias: 0.5,
    fringe: 0.7,

    focalLength: 35,
    noise: true,
    pentagon: false,

    dithering: 0.0001,
  };

  const matChanger = function () {
    for (const e in effectController) {
      if (e in postprocessing.bokeh_uniforms) {
        postprocessing.bokeh_uniforms[e].value = effectController[e];
      }
    }

    postprocessing.enabled = effectController.enabled;
    postprocessing.bokeh_uniforms["znear"].value = camera.near;
    postprocessing.bokeh_uniforms["zfar"].value = camera.far;
    camera.setFocalLength(effectController.focalLength);
  };

  const gui = new GUI();

  gui.add(effectController, "enabled").onChange(matChanger);
  gui.add(effectController, "jsDepthCalculation").onChange(matChanger);
  gui.add(effectController, "shaderFocus").onChange(matChanger);
  gui
    .add(effectController, "focalDepth", 0.0, 200.0)
    .listen()
    .onChange(matChanger);

  gui.add(effectController, "fstop", 0.1, 22, 0.001).onChange(matChanger);
  gui.add(effectController, "maxblur", 0.0, 5.0, 0.025).onChange(matChanger);

  gui.add(effectController, "showFocus").onChange(matChanger);
  gui.add(effectController, "manualdof").onChange(matChanger);
  gui.add(effectController, "vignetting").onChange(matChanger);

  gui.add(effectController, "depthblur").onChange(matChanger);

  gui.add(effectController, "threshold", 0, 1, 0.001).onChange(matChanger);
  gui.add(effectController, "gain", 0, 100, 0.001).onChange(matChanger);
  gui.add(effectController, "bias", 0, 3, 0.001).onChange(matChanger);
  gui.add(effectController, "fringe", 0, 5, 0.001).onChange(matChanger);

  gui.add(effectController, "focalLength", 16, 80, 0.001).onChange(matChanger);

  gui.add(effectController, "noise").onChange(matChanger);

  gui.add(effectController, "dithering", 0, 0.001, 0.0001).onChange(matChanger);

  gui.add(effectController, "pentagon").onChange(matChanger);

  gui.add(shaderSettings, "rings", 1, 8).step(1).onChange(shaderUpdate);
  gui.add(shaderSettings, "samples", 1, 13).step(1).onChange(shaderUpdate);

  matChanger();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  postprocessing.rtTextureDepth.setSize(window.innerWidth, window.innerHeight);
  postprocessing.rtTextureColor.setSize(window.innerWidth, window.innerHeight);

  postprocessing.bokeh_uniforms["textureWidth"].value = window.innerWidth;
  postprocessing.bokeh_uniforms["textureHeight"].value = window.innerHeight;

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  mouse.x = (event.clientX - windowHalfX) / windowHalfX;
  mouse.y = -(event.clientY - windowHalfY) / windowHalfY;

  postprocessing.bokeh_uniforms["focusCoords"].value.set(
    event.clientX / window.innerWidth,
    1 - event.clientY / window.innerHeight
  );
}

function initPostprocessing() {
  postprocessing.scene = new Scene();

  postprocessing.camera = new OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    -10000,
    10000
  );
  postprocessing.camera.position.z = 100;

  postprocessing.scene.add(postprocessing.camera);

  const pars = {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBFormat,
  };
  postprocessing.rtTextureDepth = new WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    pars
  );
  postprocessing.rtTextureColor = new WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    pars
  );

  const bokeh_shader = BokehShader;

  postprocessing.bokeh_uniforms = UniformsUtils.clone(bokeh_shader.uniforms);

  postprocessing.bokeh_uniforms["tColor"].value =
    postprocessing.rtTextureColor.texture;
  postprocessing.bokeh_uniforms["tDepth"].value =
    postprocessing.rtTextureDepth.texture;
  postprocessing.bokeh_uniforms["textureWidth"].value = window.innerWidth;
  postprocessing.bokeh_uniforms["textureHeight"].value = window.innerHeight;

  postprocessing.materialBokeh = new ShaderMaterial({
    uniforms: postprocessing.bokeh_uniforms,
    vertexShader: bokeh_shader.vertexShader,
    fragmentShader: bokeh_shader.fragmentShader,
    defines: {
      RINGS: shaderSettings.rings,
      SAMPLES: shaderSettings.samples,
    },
  });

  postprocessing.quad = new Mesh(
    new PlaneGeometry(window.innerWidth, window.innerHeight),
    postprocessing.materialBokeh
  );
  postprocessing.quad.position.z = -500;
  postprocessing.scene.add(postprocessing.quad);
}

function shaderUpdate() {
  postprocessing.materialBokeh.defines.RINGS = shaderSettings.rings;
  postprocessing.materialBokeh.defines.SAMPLES = shaderSettings.samples;
  postprocessing.materialBokeh.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate, renderer.domElement);

  render();
  stats.update();
}

function linearize(depth) {
  const zfar = camera.far;
  const znear = camera.near;
  return (-zfar * znear) / (depth * (zfar - znear) - zfar);
}

function smoothstep(near, far, depth) {
  const x = saturate((depth - near) / (far - near));
  return x * x * (3 - 2 * x);
}

function saturate(x) {
  return Math.max(0, Math.min(1, x));
}

function render() {
  const time = Date.now() * 0.00015;

  camera.position.x = Math.cos(time) * 400;
  camera.position.z = Math.sin(time) * 500;
  camera.position.y = Math.sin(time / 1.4) * 100;

  camera.lookAt(target);

  camera.updateMatrixWorld();

  if (effectController.jsDepthCalculation) {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    const targetDistance =
      intersects.length > 0 ? intersects[0].distance : 1000;

    distance += (targetDistance - distance) * 0.03;

    const sdistance = smoothstep(camera.near, camera.far, distance);

    const ldistance = linearize(1 - sdistance);

    postprocessing.bokeh_uniforms["focalDepth"].value = ldistance;

    effectController["focalDepth"] = ldistance;
  }

  for (let i = 0; i < leaves; i++) {
    const plane = planes[i];
    plane.rotation.x += plane.rotation.dx;
    plane.rotation.y += plane.rotation.dy;
    plane.rotation.z += plane.rotation.dz;
    plane.position.y -= 2;
    plane.position.x += plane.position.dx;
    plane.position.z += plane.position.dz;

    if (plane.position.y < 0) plane.position.y += 300;
  }

  if (postprocessing.enabled) {
    renderer.clear();

    // render scene into texture

    renderer.setRenderTarget(postprocessing.rtTextureColor);
    renderer.clear();
    renderer.render(scene, camera);

    // render depth into texture

    scene.overrideMaterial = materialDepth;
    renderer.setRenderTarget(postprocessing.rtTextureDepth);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;

    // render bokeh composite

    renderer.setRenderTarget(null);
    renderer.render(postprocessing.scene, postprocessing.camera);
  } else {
    scene.overrideMaterial = null;

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
  }
}
