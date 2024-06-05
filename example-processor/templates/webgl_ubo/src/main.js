//Shaders

import vertexShader1_ from "./shaders/vertexShader1.glsl";
import fragmentShader1_ from "./shaders/fragmentShader1.glsl";
import vertexShader2_ from "./shaders/vertexShader2.glsl";
import fragmentShader2_ from "./shaders/fragmentShader2.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  TetrahedronGeometry,
  BoxGeometry,
  TextureLoader,
  SRGBColorSpace,
  UniformsGroup,
  Uniform,
  Vector3,
  Color,
  RawShaderMaterial,
  GLSL3,
  Mesh,
  WebGLRenderer,
} from "three";

let camera, scene, renderer, clock;

init();

function init() {
  const container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 25);

  scene = new Scene();
  camera.lookAt(scene.position);

  clock = new Clock();

  // geometry

  const geometry1 = new TetrahedronGeometry();
  const geometry2 = new BoxGeometry();

  // texture

  const texture = new TextureLoader().load("textures/crate.gif");
  texture.colorSpace = SRGBColorSpace;

  // uniforms groups

  // Camera and lighting related data are perfect examples of using UBOs since you have to store these
  // data just once. They can be shared across all shader programs.

  const cameraUniformsGroup = new UniformsGroup();
  cameraUniformsGroup.setName("ViewData");
  cameraUniformsGroup.add(new Uniform(camera.projectionMatrix)); // projection matrix
  cameraUniformsGroup.add(new Uniform(camera.matrixWorldInverse)); // view matrix

  const lightingUniformsGroup = new UniformsGroup();
  lightingUniformsGroup.setName("LightingData");
  lightingUniformsGroup.add(new Uniform(new Vector3(0, 0, 10))); // light position
  lightingUniformsGroup.add(new Uniform(new Color(0x7c7c7c))); // ambient color
  lightingUniformsGroup.add(new Uniform(new Color(0xd5d5d5))); // diffuse color
  lightingUniformsGroup.add(new Uniform(new Color(0xe7e7e7))); // specular color
  lightingUniformsGroup.add(new Uniform(64)); // shininess

  // materials

  const material1 = new RawShaderMaterial({
    uniforms: {
      modelMatrix: { value: null },
      normalMatrix: { value: null },
      color: { value: null },
    },
    vertexShader: vertexShader1_,
    fragmentShader: fragmentShader1_,
    glslVersion: GLSL3,
  });

  const material2 = new RawShaderMaterial({
    uniforms: {
      modelMatrix: { value: null },
      diffuseMap: { value: null },
    },
    vertexShader: vertexShader2_,
    fragmentShader: fragmentShader2_,
    glslVersion: GLSL3,
  });

  // meshes

  for (let i = 0; i < 200; i++) {
    let mesh;

    if (i % 2 === 0) {
      mesh = new Mesh(geometry1, material1.clone());

      mesh.material.uniformsGroups = [
        cameraUniformsGroup,
        lightingUniformsGroup,
      ];
      mesh.material.uniforms.modelMatrix.value = mesh.matrixWorld;
      mesh.material.uniforms.normalMatrix.value = mesh.normalMatrix;
      mesh.material.uniforms.color.value = new Color(0xffffff * Math.random());
    } else {
      mesh = new Mesh(geometry2, material2.clone());

      mesh.material.uniformsGroups = [
        cameraUniformsGroup,
        lightingUniformsGroup,
      ];
      mesh.material.uniforms.modelMatrix.value = mesh.matrixWorld;
      mesh.material.uniforms.diffuseMap.value = texture;
    }

    scene.add(mesh);

    const s = 1 + Math.random() * 0.5;

    mesh.scale.x = s;
    mesh.scale.y = s;
    mesh.scale.z = s;

    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.rotation.z = Math.random() * Math.PI;

    mesh.position.x = Math.random() * 40 - 20;
    mesh.position.y = Math.random() * 40 - 20;
    mesh.position.z = Math.random() * 20 - 10;
  }

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  const delta = clock.getDelta();

  scene.traverse(function (child) {
    if (child.isMesh) {
      child.rotation.x += delta * 0.5;
      child.rotation.y += delta * 0.3;
    }
  });

  renderer.render(scene, camera);
}
