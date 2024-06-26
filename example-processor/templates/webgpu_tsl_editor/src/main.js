import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  LinearSRGBColorSpace,
  NodeMaterial,
  vec4,
  Mesh,
  PlaneGeometry,
  Texture,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

import WebGPURenderer from ".three/examples/src/renderers/webgpu/WebGPURenderer.js";
import WGSLNodeBuilder from ".three/examples/src/renderers/webgpu/nodes/WGSLNodeBuilder.js";
import GLSLNodeBuilder from ".three/examples/src/renderers/webgl-fallback/nodes/GLSLNodeBuilder.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

init();

function init() {
  // add the depedencies

  const width = 200;
  const height = 200;

  const camera = new PerspectiveCamera(70, width / height, 0.1, 10);
  camera.position.z = 0.72;
  camera.lookAt(0, 0, 0);

  const scene = new Scene();
  scene.background = new Color(0x222222);

  const rendererDOM = document.getElementById("renderer");

  const renderer = new WebGPURenderer({ antialias: true });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(200, 200);
  rendererDOM.appendChild(renderer.domElement);

  const material = new NodeMaterial();
  material.fragmentNode = vec4(0, 0, 0, 1);

  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(mesh);

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  // editor

  window.require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.48.0/min/vs" },
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

    const tslCode = `// Simple uv.x animation

const { texture, uniform, vec2, vec4, uv, oscSine, timerLocal } = THREE;

//const samplerTexture = new Texture();
const samplerTexture = new TextureLoader().load( 'three/examples/textures/uv_grid_opengl.jpg' );
samplerTexture.wrapS = RepeatWrapping;
//samplerTexture.wrapT = RepeatWrapping;
//samplerTexture.colorSpace = SRGBColorSpace;

const timer = timerLocal( .5 ); // .5 is speed
const uv0 = uv();
const animateUv = vec2( uv0.x.add( oscSine( timer ) ), uv0.y );

// label is optional
const myMap = texture( samplerTexture, animateUv ).rgb.label( 'myTexture' );
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
      minimap: { enabled: false },
    });

    const result = window.monaco.editor.create(resultDOM, {
      value: "",
      language: "wgsl",
      theme: "vs-dark",
      automaticLayout: true,
      readOnly: true,
      minimap: { enabled: false },
    });

    const showCode = () => {
      result.setValue(nodeBuilder[options.shader + "Shader"]);
      result.revealLine(1);
    };

    const build = () => {
      try {
        const tslCode = `let output = null;\n${editor.getValue()}\nreturn { output };`;
        const nodes = new Function("THREE", tslCode)(THREE);

        mesh.material.fragmentNode = nodes.output;
        mesh.material.needsUpdate = true;

        let NodeBuilder;

        if (options.output === "WGSL") {
          NodeBuilder = WGSLNodeBuilder;
        } else if (options.output === "GLSL ES 3.0") {
          NodeBuilder = GLSLNodeBuilder;
        }

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

    gui.add(options, "output", ["WGSL", "GLSL ES 3.0"]).onChange(build);
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
