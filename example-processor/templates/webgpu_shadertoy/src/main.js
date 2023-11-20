//Shaders

import example1_ from "./shaders/example1.glsl";
import example2_ from "./shaders/example2.glsl";

import "./style.css"; // For webpack support

import {
  OrthographicCamera,
  Scene,
  PlaneGeometry,
  Mesh,
  LinearSRGBColorSpace,
} from "three";
import * as Nodes from "three/nodes";

import Transpiler from "three/examples/jsm/transpiler/Transpiler.js";
import ShaderToyDecoder from "three/examples/jsm/transpiler/ShaderToyDecoder.js";
import TSLEncoder from "three/examples/jsm/transpiler/TSLEncoder.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGL from "three/addons/capabilities/WebGL.js";

import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

class ShaderToyNode extends Nodes.Node {
  constructor() {
    super("vec4");

    this.mainImage = null;
  }

  transpile(glsl, iife = false) {
    const decoder = new ShaderToyDecoder();

    const encoder = new TSLEncoder();
    encoder.iife = iife;
    encoder.uniqueNames = true;

    const jsCode = new Transpiler(decoder, encoder).parse(glsl);

    return jsCode;
  }

  parse(glsl) {
    const jsCode = this.transpile(glsl, true);

    const { mainImage } = eval(jsCode)(Nodes);

    this.mainImage = mainImage;
  }

  async parseAsync(glsl) {
    const jsCode = this.transpile(glsl);

    const { mainImage } = await import(
      `data:text/javascript,${encodeURIComponent(jsCode)}`
    );

    this.mainImage = mainImage;
  }

  setup(builder) {
    if (this.mainImage === null) {
      throw new Error("ShaderToyNode: .parse() must be called first.");
    }

    return this.mainImage();
  }
}

let renderer, camera, scene;
const dpr = window.devicePixelRatio;

init();

function init() {
  if (WebGPU.isAvailable() === false && WebGL.isWebGL2Available() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU or WebGL2 support");
  }

  //

  const example1Code = example1_;
  const example2Code = example2_;

  const shaderToy1Node = new ShaderToyNode();
  shaderToy1Node.parse(example1Code);

  const shaderToy2Node = new ShaderToyNode();
  shaderToy2Node.parse(example2Code);

  //

  camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene = new Scene();

  const geometry = new PlaneGeometry(2, 2);

  const material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = Nodes.oscSine(Nodes.timerLocal(0.3)).mix(
    shaderToy1Node,
    shaderToy2Node
  );

  const quad = new Mesh(geometry, material);
  scene.add(quad);

  //

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.render(scene, camera);
}