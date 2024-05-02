import "./style.css"; // For webpack support

import {
  CubeTextureLoader,
  LinearFilter,
  LinearMipMapLinearFilter,
  HalfFloatType,
  RGBAFormat,
  LinearSRGBColorSpace,
  WebGLCubeRenderTarget,
  CubeReflectionMapping,
  BoxGeometry,
  ShaderMaterial,
  UniformsUtils,
  BackSide,
  NoBlending,
  Mesh,
  CubeCamera,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  SphereGeometry,
  MeshBasicMaterial,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let container;
let camera, scene, renderer;

const CubemapFilterShader = {
  name: "CubemapFilterShader",

  uniforms: {
    cubeTexture: { value: null },
    mipIndex: { value: 0 },
  },

  vertexShader: /* glsl */ `

					varying vec3 vWorldDirection;

					#include <common>

					void main() {
						vWorldDirection = transformDirection(position, modelMatrix);
						#include <begin_vertex>
						#include <project_vertex>
						gl_Position.z = gl_Position.w; // set z to camera.far
					}

					`,

  fragmentShader: /* glsl */ `

					uniform samplerCube cubeTexture;
					varying vec3 vWorldDirection;

					uniform float mipIndex;

					#include <common>

					void main() {
						vec3 cubeCoordinates = normalize(vWorldDirection);

						// Colorize mip levels
						vec4 color = vec4(1.0, 0.0, 0.0, 1.0);
						if (mipIndex == 0.0) color.rgb = vec3(1.0, 1.0, 1.0);
						else if (mipIndex == 1.0) color.rgb = vec3(0.0, 0.0, 1.0);
						else if (mipIndex == 2.0) color.rgb = vec3(0.0, 1.0, 1.0);
						else if (mipIndex == 3.0) color.rgb = vec3(0.0, 1.0, 0.0);
						else if (mipIndex == 4.0) color.rgb = vec3(1.0, 1.0, 0.0);

						gl_FragColor = textureCube(cubeTexture, cubeCoordinates, 0.0) * color;
					}

					`,
};

init();

async function loadCubeTexture(urls) {
  return new Promise(function (resolve) {
    new CubeTextureLoader().load(urls, function (cubeTexture) {
      resolve(cubeTexture);
    });
  });
}

function allocateCubemapRenderTarget(cubeMapSize) {
  const params = {
    magFilter: LinearFilter,
    minFilter: LinearMipMapLinearFilter,
    generateMipmaps: false,
    type: HalfFloatType,
    format: RGBAFormat,
    colorSpace: LinearSRGBColorSpace,
    depthBuffer: false,
  };

  const rt = new WebGLCubeRenderTarget(cubeMapSize, params);

  const mipLevels = Math.log(cubeMapSize) * Math.LOG2E + 1.0;
  for (let i = 0; i < mipLevels; i++) rt.texture.mipmaps.push({});

  rt.texture.mapping = CubeReflectionMapping;
  return rt;
}

function renderToCubeTexture(cubeMapRenderTarget, sourceCubeTexture) {
  const geometry = new BoxGeometry(5, 5, 5);

  const material = new ShaderMaterial({
    name: CubemapFilterShader.name,
    uniforms: UniformsUtils.clone(CubemapFilterShader.uniforms),
    vertexShader: CubemapFilterShader.vertexShader,
    fragmentShader: CubemapFilterShader.fragmentShader,
    side: BackSide,
    blending: NoBlending,
  });

  material.uniforms.cubeTexture.value = sourceCubeTexture;

  const mesh = new Mesh(geometry, material);
  const cubeCamera = new CubeCamera(1, 10, cubeMapRenderTarget);
  const mipmapCount = Math.floor(
    Math.log2(Math.max(cubeMapRenderTarget.width, cubeMapRenderTarget.height))
  );

  for (let mipmap = 0; mipmap < mipmapCount; mipmap++) {
    material.uniforms.mipIndex.value = mipmap;
    material.needsUpdate = true;

    cubeMapRenderTarget.viewport.set(
      0,
      0,
      cubeMapRenderTarget.width >> mipmap,
      cubeMapRenderTarget.height >> mipmap
    );

    cubeCamera.activeMipmapLevel = mipmap;
    cubeCamera.update(renderer, mesh);
  }

  mesh.geometry.dispose();
  mesh.material.dispose();
}

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  // Create renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 500;

  // Create controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 1.5;

  window.addEventListener("resize", onWindowResize);

  // Load a cube texture
  const r = "textures/cube/Park3Med/";
  const urls = [
    r + "px.jpg",
    r + "nx.jpg",
    r + "py.jpg",
    r + "ny.jpg",
    r + "pz.jpg",
    r + "nz.jpg",
  ];

  loadCubeTexture(urls).then((cubeTexture) => {
    // Allocate a cube map render target
    const cubeMapRenderTarget = allocateCubemapRenderTarget(512);

    // Render to all the mip levels of cubeMapRenderTarget
    renderToCubeTexture(cubeMapRenderTarget, cubeTexture);

    // Create geometry
    const sphere = new SphereGeometry(100, 128, 128);
    let material = new MeshBasicMaterial({
      color: 0xffffff,
      envMap: cubeTexture,
    });

    let mesh = new Mesh(sphere, material);
    mesh.position.set(-100, 0, 0);
    scene.add(mesh);

    material = material.clone();
    material.envMap = cubeMapRenderTarget.texture;

    mesh = new Mesh(sphere, material);
    mesh.position.set(100, 0, 0);
    scene.add(mesh);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.render(scene, camera);
}
