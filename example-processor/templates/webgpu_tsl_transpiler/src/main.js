import "./style.css"; // For webpack support

import Transpiler from "three/examples/jsm/transpiler/Transpiler.js";
import GLSLDecoder from "three/examples/jsm/transpiler/GLSLDecoder.js";
import TSLEncoder from "three/examples/jsm/transpiler/TSLEncoder.js";

init();

function init() {
  // editor

  window.require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs" },
  });

  require(["vs/editor/editor.main"], () => {
    let timeout = null;

    const editorDOM = document.getElementById("source");
    const resultDOM = document.getElementById("result");

    const glslCode = `// Put here your GLSL code to transpile to TSL:

float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {

	float a2 = pow2( alpha );

	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );

	return 0.5 / max( gv + gl, EPSILON );

}
`;

    const editor = window.monaco.editor.create(editorDOM, {
      value: glslCode,
      language: "glsl",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
    });

    const result = window.monaco.editor.create(resultDOM, {
      value: "",
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      readOnly: true,
      minimap: { enabled: false },
    });

    const showCode = (code) => {
      result.setValue(code);
      result.revealLine(1);
    };

    const build = () => {
      try {
        const glsl = editor.getValue();

        const decoder = new GLSLDecoder();
        const encoder = new TSLEncoder();

        const transpiler = new Transpiler(decoder, encoder);
        const tsl = transpiler.parse(glsl);

        showCode(tsl);
      } catch (e) {
        result.setValue("Error: " + e.message);
      }
    };

    build();

    editor.getModel().onDidChangeContent(() => {
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(build, 1000);
    });
  });
}
