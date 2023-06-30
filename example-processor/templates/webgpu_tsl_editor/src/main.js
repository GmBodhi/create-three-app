import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  LinearSRGBColorSpace,
  Mesh,
  PlaneGeometry,
  Texture,
  TextureLoader,
  SRGBColorSpace,
} from "three";
import * as Nodes from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";
import WGSLNodeBuilder from "three/addons/renderers/webgpu/nodes/WGSLNodeBuilder.js";
import GLSLNodeBuilder from "three/addons/renderers/webgl/nodes/GLSLNodeBuilder.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  // add the depedencies

  const width = 200;
  const height = 200;

  const camera = new PerspectiveCamera(70, width / height, 0.1, 10);
  camera.position.z = 0.72;
  camera.lookAt(0, 0, 0);

  const scene = new Scene();
  scene.background = new Color(0x222222);

  const rendererDOM = document.getElementById("renderer");

  const renderer = new WebGPURenderer();
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(200, 200);
  rendererDOM.appendChild(renderer.domElement);

  const material = new Nodes.NodeMaterial();
  material.outputNode = Nodes.vec4(0, 0, 0, 1);

  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(mesh);

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  // editor

  window.require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs" },
  });

  require(["vs/editor/editor.main"], () => {
    const options = {
      shader: "fragment",
      outputColorSpace: LinearSRGBColorSpace,
      output: "WGSL",
      preview: true,
    };

    let timeout = null;
    let nodeBuilder = null;

    const editorDOM = document.getElementById("source");
    const resultDOM = document.getElementById("result");

    const tslCode = `// Simple example

const { texture, uniform, vec4 } = TSL;

//const samplerTexture = new Texture();
const samplerTexture = new TextureLoader().load( 'three/examples/textures/uv_grid_opengl.jpg' );

// label is optional
const myMap = texture( samplerTexture ).rgb.label( 'myTexture' );
const myColor = uniform( new Color( 0x0066ff ) ).label( 'myColor' );
const opacity = .7;

const desaturatedMap = myMap.rgb.saturation( 0 ); // try add .temp( 'myVar' ) after saturation()

const finalColor = desaturatedMap.add( myColor );

output = vec4( finalColor, opacity );
`;

    const editor = window.monaco.editor.create(editorDOM, {
      value: tslCode,
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
    });

    const result = window.monaco.editor.create(resultDOM, {
      value: "",
      language: "wgsl",
      theme: "vs-dark",
      automaticLayout: true,
      readOnly: true,
    });

    const showCode = () => {
      result.setValue(nodeBuilder[options.shader + "Shader"]);
      result.revealLine(1);
    };

    const build = () => {
      try {
        const tslCode = `let output = null;\n${editor.getValue()}\nreturn { output };`;
        const nodes = new Function("THREE", "TSL", tslCode)(THREE, Nodes);

        mesh.material.outputNode = nodes.output;
        mesh.material.needsUpdate = true;

        const NodeBuilder =
          options.output === "WGSL" ? WGSLNodeBuilder : GLSLNodeBuilder;

        nodeBuilder = new NodeBuilder(mesh, renderer);
        nodeBuilder.build();

        showCode();

        // extra debug info

        /*const style = 'background-color: #333; color: white; font-style: italic; border: 2px solid #777; font-size: 22px;';

							console.log( '%c  [ WGSL ] Vertex Shader      ', style );
							console.log( nodeBuilder.vertexShader );
							console.log( '%c  [ WGSL ] Fragment Shader    ', style );
							console.log( nodeBuilder.fragmentShader );*/
      } catch (e) {
        result.setValue("Error: " + e.message);
      }
    };

    build();

    editor.getModel().onDidChangeContent(() => {
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(build, 1000);
    });

    // gui

    const gui = new GUI();

    gui.add(options, "output", ["GLSL", "WGSL"]).onChange(build);
    gui.add(options, "shader", ["vertex", "fragment"]).onChange(showCode);

    gui
      .add(options, "outputColorSpace", [LinearSRGBColorSpace, SRGBColorSpace])
      .onChange((value) => {
        renderer.outputColorSpace = value;

        build();
      });

    gui.add(options, "preview").onChange((value) => {
      rendererDOM.style.display = value ? "" : "none";
    });
  });
}
