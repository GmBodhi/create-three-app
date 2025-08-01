import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { vec4 } from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

init();

function init() {
  // add the dependencies

  const width = 200;
  const height = 200;

  const camera = new PerspectiveCamera(70, width / height, 0.1, 10);
  camera.position.z = 0.72;
  camera.lookAt(0, 0, 0);

  const scene = new Scene();
  scene.background = new Color(0x222222);

  const rendererDOM = document.getElementById("renderer");

  const renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(200, 200);
  rendererDOM.appendChild(renderer.domElement);

  const material = new NodeMaterial();
  material.fragmentNode = vec4(0, 0, 0, 1);

  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(mesh);

  //

  let compiling = false;

  renderer.setAnimationLoop(() => {
    if (compiling) return;

    renderer.render(scene, camera);
  });

  // editor

  window.require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" },
  });

  require(["vs/editor/editor.main"], () => {
    const options = {
      shader: "fragment",
      outputColorSpace: SRGBColorSpace,
      output: "WGSL",
      preview: true,
    };

    let timeout = null;
    let rawShader = null;

    const editorDOM = document.getElementById("source");
    const resultDOM = document.getElementById("result");

    const tslCode = `// Simple uv.x animation

const { texture, uniform, vec2, vec4, uv, oscSine, time, grayscale } = await import( 'three/tsl' );

const samplerTexture = new TextureLoader().load( 'three/examples/textures/uv_grid_opengl.jpg' );
samplerTexture.wrapS = RepeatWrapping;
samplerTexture.colorSpace = SRGBColorSpace;

const scaledTime = time.mul( .5 ); // .5 is speed
const uv0 = uv();
const animateUv = vec2( uv0.x.add( oscSine( scaledTime ) ), uv0.y );

// label is optional
const myMap = texture( samplerTexture, animateUv ).rgb.setName( 'myTexture' );
const myColor = uniform( new Color( 0x0066ff ) ).setName( 'myColor' );
const opacity = .7;

const desaturatedMap = grayscale( myMap.rgb );

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
      result.setValue(rawShader[options.shader + "Shader"]);
      result.revealLine(1);
    };

    const webGLRenderer = new WebGPURenderer({ forceWebGL: true });

    const build = async () => {
      try {
        const AsyncFunction = async function () {}.constructor;

        const tslCode = `let output = null;\n${editor.getValue()}\nreturn { output };`;
        const nodes = await new AsyncFunction("three/webgpu", tslCode)(THREE);

        mesh.material.fragmentNode = nodes.output;
        mesh.material.needsUpdate = true;

        compiling = true;

        if (options.output === "WGSL") {
          rawShader = await renderer.debug.getShaderAsync(scene, camera, mesh);
        } else if (options.output === "GLSL ES 3.0") {
          rawShader = await webGLRenderer.debug.getShaderAsync(
            scene,
            camera,
            mesh
          );
        }

        compiling = false;

        showCode();

        // extra debug info

        /*const style = 'background-color: #333; color: white; font-style: italic; border: 2px solid #777; font-size: 22px;';

							console.log( '%c  [ WGSL ] Vertex Shader      ', style );
							console.log( rawShader.vertexShader );
							console.log( '%c  [ WGSL ] Fragment Shader    ', style );
							console.log( rawShader.fragmentShader );/**/
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
