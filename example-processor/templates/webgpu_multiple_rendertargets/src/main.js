import "./style.css"; // For webpack support

import {
  LinearSRGBColorSpace,
  WebGLMultipleRenderTargets,
  NearestFilter,
  Scene,
  Color,
  PerspectiveCamera,
  TextureLoader,
  RepeatWrapping,
  Mesh,
  TorusKnotGeometry,
  OrthographicCamera,
  PlaneGeometry,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
//import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import {
  NodeMaterial,
  MeshBasicNodeMaterial,
  mix,
  modelNormalMatrix,
  normalGeometry,
  normalize,
  outputStruct,
  step,
  texture,
  uniform,
  uv,
  varying,
  vec2,
  vec4,
} from "three/nodes";
import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer, torus;
let renderTarget;
let postScene, postCamera;

/*

			const parameters = {
				samples: 4,
				wireframe: false
			};

			const gui = new GUI();
			gui.add( parameters, 'samples', 0, 4 ).step( 1 );
			gui.add( parameters, 'wireframe' );
			gui.onChange( render );

			*/

class WriteGBufferMaterial extends MeshBasicNodeMaterial {
  constructor(diffuseTexture) {
    super();

    this.lights = false;
    this.diffuseTexture = diffuseTexture;

    const vUv = varying(uv());

    const transformedNormal = modelNormalMatrix.mul(normalGeometry);
    const vNormal = varying(normalize(transformedNormal));

    const repeat = uniform(vec2(5, 0.5));

    const gColor = texture(this.diffuseTexture, vUv.mul(repeat));
    const gNormal = vec4(normalize(vNormal), 1.0);

    this.outputNode = outputStruct(gColor, gNormal);
  }
}

class ReadGBufferMaterial extends NodeMaterial {
  constructor(tDiffuse, tNormal) {
    super();

    const vUv = varying(uv());

    const diffuse = texture(tDiffuse, vUv);
    const normal = texture(tNormal, vUv);

    this.colorNode = mix(diffuse, normal, step(0.5, vUv.x));
    this.lights = false;
  }
}

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // Create a multi render target with Float buffers

  renderTarget = new WebGLMultipleRenderTargets(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio,
    2,
    {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      colorSpace: LinearSRGBColorSpace,
    }
  );

  // Name our G-Buffer attachments for debugging

  renderTarget.texture[0].name = "diffuse";
  renderTarget.texture[1].name = "normal";

  // Scene setup

  scene = new Scene();
  scene.background = new Color(0x222222);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.z = 4;

  const loader = new TextureLoader();

  const diffuse = loader.load("textures/hardwood2_diffuse.jpg", render);
  diffuse.wrapS = RepeatWrapping;
  diffuse.wrapT = RepeatWrapping;

  torus = new Mesh(
    new TorusKnotGeometry(1, 0.3, 128, 32),
    new WriteGBufferMaterial(diffuse)
  );

  scene.add(torus);

  // PostProcessing setup

  postScene = new Scene();
  postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  postScene.add(
    new Mesh(
      new PlaneGeometry(2, 2),
      new ReadGBufferMaterial(renderTarget.texture[0], renderTarget.texture[1])
    )
  );

  // Controls

  new OrbitControls(camera, renderer.domElement);

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

function render(time) {
  /*

				// Feature not yet working

				renderTarget.samples = parameters.samples;

				scene.traverse( function ( child ) {

					if ( child.material !== undefined ) {

						child.material.wireframe = parameters.wireframe;

					}

				} );

				*/

  torus.rotation.y = (time / 1000) * 0.4;

  // render scene into target
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  // render post FX
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}
