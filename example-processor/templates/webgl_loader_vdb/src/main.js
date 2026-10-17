import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  Color,
  PerspectiveCamera,
  Vector3,
  Mesh,
  BoxGeometry,
  Matrix4,
  Box3,
  RawShaderMaterial,
  GLSL3,
  BackSide,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { VDBLoader } from "three-vdb-loader";

let renderer, scene, camera, controls, material;

init();

async function init() {
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();
  scene.background = new Color(0x2b3a4a);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;

  const url =
    "https://media.githubusercontent.com/media/AcademySoftwareFoundation/openvdb-website/master/download/models/smoke.vdb";
  const grids = await new VDBLoader().setGridNames(["density"]).loadAsync(url);
  const grid = grids[0];

  const center = grid.bbox.getCenter(new Vector3());
  const size = grid.bbox.getSize(new Vector3()).addScalar(1);

  material = createMaterial(grid.texture);

  const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
  mesh.matrixAutoUpdate = false;
  mesh.matrix
    .copy(grid.transform)
    .multiply(new Matrix4().makeTranslation(center).scale(size));
  mesh.updateMatrixWorld(true);
  scene.add(mesh);

  const box = new Box3().setFromObject(mesh);
  const radius = box.getSize(new Vector3()).length() / 2;

  box.getCenter(controls.target);
  camera.position.copy(controls.target).add(new Vector3(0, 0, radius * 2));

  const parameters = { threshold: 0.1, range: 0.1, opacity: 0.03, steps: 100 };

  function update() {
    material.uniforms.threshold.value = parameters.threshold;
    material.uniforms.range.value = parameters.range;
    material.uniforms.opacity.value = parameters.opacity;
    material.uniforms.steps.value = parameters.steps;
  }

  update();

  const gui = new GUI();
  gui.add(parameters, "threshold", 0, 1, 0.01).onChange(update);
  gui.add(parameters, "range", 0, 1, 0.01).onChange(update);
  gui.add(parameters, "opacity", 0, 1, 0.01).onChange(update);
  gui.add(parameters, "steps", 0, 400, 1).onChange(update);

  window.addEventListener("resize", onWindowResize);
}

function createMaterial(texture) {
  const vertexShader = /* glsl */ `
					in vec3 position;

					uniform mat4 modelMatrix;
					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
					uniform vec3 cameraPos;

					out vec3 vOrigin;
					out vec3 vDirection;

					void main() {

						vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

						vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
						vDirection = position - vOrigin;

						gl_Position = projectionMatrix * mvPosition;

					}
				`;

  const fragmentShader = /* glsl */ `
					precision highp float;
					precision highp sampler3D;

					in vec3 vOrigin;
					in vec3 vDirection;

					out vec4 color;

					uniform vec3 base;
					uniform sampler3D map;

					uniform float threshold;
					uniform float range;
					uniform float opacity;
					uniform float steps;

					vec2 hitBox( vec3 orig, vec3 dir ) {

						vec3 invDir = 1.0 / dir;
						vec3 tminTmp = ( vec3( - 0.5 ) - orig ) * invDir;
						vec3 tmaxTmp = ( vec3( 0.5 ) - orig ) * invDir;
						vec3 tmin = min( tminTmp, tmaxTmp );
						vec3 tmax = max( tminTmp, tmaxTmp );
						return vec2( max( tmin.x, max( tmin.y, tmin.z ) ), min( tmax.x, min( tmax.y, tmax.z ) ) );

					}

					float density( vec3 p ) {

						return smoothstep( threshold - range, threshold + range, texture( map, p + 0.5 ).r );

					}

					void main() {

						vec3 rayDir = normalize( vDirection );
						vec2 bounds = hitBox( vOrigin, rayDir );

						if ( bounds.x > bounds.y ) discard;

						bounds.x = max( bounds.x, 0.0 );

						float stepSize = ( bounds.y - bounds.x ) / steps;
						float jitter = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
						vec3 p = vOrigin + ( bounds.x + jitter * stepSize ) * rayDir;

						vec4 ac = vec4( 0.0 );

						for ( float i = 0.0; i < steps; i += 1.0 ) {

							float d = density( p ) * opacity;

							ac.rgb += ( 1.0 - ac.a ) * d * base;
							ac.a += ( 1.0 - ac.a ) * d;

							if ( ac.a >= 0.95 ) break;

							p += rayDir * stepSize;

						}

						color = ac;

						if ( color.a == 0.0 ) discard;

					}
				`;

  return new RawShaderMaterial({
    glslVersion: GLSL3,
    uniforms: {
      base: { value: new Color(0xf0e0d0) },
      map: { value: texture },
      cameraPos: { value: new Vector3() },
      threshold: { value: 0 },
      range: { value: 0 },
      opacity: { value: 0 },
      steps: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: BackSide,
    transparent: true,
    premultipliedAlpha: true,
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  if (material) material.uniforms.cameraPos.value.copy(camera.position);

  renderer.render(scene, camera);
}
