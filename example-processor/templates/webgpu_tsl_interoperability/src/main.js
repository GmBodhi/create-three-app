import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  varyingProperty,
  time,
  uniform,
  wgslFn,
  texture,
  sampler,
  uv,
  clamp,
  float,
  vec2,
  vec3,
  fract,
  floor,
  positionGeometry,
  sin,
} from "three/tsl";

import WebGPU from "three/addons/capabilities/WebGPU.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let renderer, camera, scene;
const dpr = window.devicePixelRatio;

const crtWidthUniform = uniform(1608);
const crtHeightUniform = uniform(1608);

const canvas = document.getElementById("c");

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.render(scene, camera);
}

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const vUv = varyingProperty("vec2", "vUv");

  // In WGSL, access varying properties from the varying struct
  const wgslVertexShader = wgslFn(
    `
					fn crtVertex(
	 					position: vec3f,
						uv: vec2f
					) -> vec3<f32> {
						varyings.vUv = uv;
						return position;
					}
				`,
    [vUv]
  );

  // Only wgsl vertex shaders take varyings arguments when defined.
  // For a wgsl fragment shader, pass the varyingProperty node to the
  // fragment shader's constructor to access the varying value computed
  // by the vertex shader.
  const wgslFragmentShader = wgslFn(`
					fn crtFragment(
						vUv: vec2f,
						tex: texture_2d<f32>,
						texSampler: sampler,
						crtWidth: f32,
						crtHeight: f32,
						cellOffset: f32,
						cellSize: f32,
						borderMask: f32,
						time: f32,
						speed: f32,
						pulseIntensity: f32,
						pulseWidth: f32,
						pulseRate: f32
					) -> vec3<f32> {
						// Convert uv into map of pixels
						var pixel = ( vUv * 0.5 + 0.5 ) * vec2<f32>(
							crtWidth,
							crtHeight
						);
						// Coordinate for each cell in the pixel map
						let coord = pixel / cellSize;
						// Three color values for each cell (r, g, b)
						let subcoord = coord * vec2f( 3.0, 1.0 );
						let offset = vec2<f32>( 0, fract( floor( coord.x ) * cellOffset ) );

						let maskCoord = floor( coord + offset ) * cellSize;

						var samplePoint = maskCoord / vec2<f32>(crtWidth, crtHeight);
						samplePoint.x += fract( time * speed / 20 );

						var color = textureSample(
							tex,
							texSampler,
							samplePoint
						).xyz;

						// Current implementation does not give an even amount of space to each r, g, b unit of a cell
						// Fix/hack this by multiplying subCoord.x by cellSize at cellSizes below 6
						let ind = floor( subcoord.x ) % 3;

						var maskColor = vec3<f32>(
							f32( ind == 0.0 ),
							f32( ind == 1.0 ),
							f32( ind == 2.0 )
						) * 3.0;

						let cellUV = fract( subcoord + offset ) * 2.0 - 1.0;
						var border: vec2<f32> = 1.0 - cellUV * cellUV * borderMask;

						maskColor *= vec3f( clamp( border.x, 0.0, 1.0 ) * clamp( border.y, 0.0, 1.0) );

						color *= maskColor;

						color.r *= 1.0 + pulseIntensity * sin( pixel.y / pulseWidth + time * pulseRate );
						color.b *= 1.0 + pulseIntensity * sin( pixel.y / pulseWidth + time * pulseRate );
						color.g *= 1.0 + pulseIntensity * sin( pixel.y / pulseWidth + time * pulseRate );

						return color;
					}
				`);

  const textureLoader = new TextureLoader();
  const planetTexture = textureLoader.load(
    "textures/planets/earth_lights_2048.png"
  );
  planetTexture.wrapS = RepeatWrapping;
  planetTexture.wrapT = RepeatWrapping;

  // Node Uniforms:
  // Passed to WGSL Functions.
  // Manipulated directly in TSL Functions.
  const cellOffsetUniform = uniform(0.5);
  const cellSizeUniform = uniform(6);
  const borderMaskUniform = uniform(1);
  const pulseIntensityUniform = uniform(0.06);
  const pulseWidthUniform = uniform(60);
  const pulseRateUniform = uniform(20);
  const wgslShaderSpeedUniform = uniform(1.0);
  const tslShaderSpeedUniform = uniform(1.0);

  //

  const wgslShaderMaterial = new MeshBasicNodeMaterial();

  // Accessed attributes correspond to a Mesh or BufferGeometry's setAttribute() calls.
  wgslShaderMaterial.positionNode = wgslVertexShader({
    position: attribute("position"),
    uv: attribute("uv"),
  });

  wgslShaderMaterial.fragmentNode = wgslFragmentShader({
    vUv: vUv,
    tex: texture(planetTexture),
    texSampler: sampler(planetTexture),
    crtWidth: crtWidthUniform,
    crtHeight: crtHeightUniform,
    cellOffset: cellOffsetUniform,
    cellSize: cellSizeUniform,
    borderMask: borderMaskUniform,
    time: time,
    speed: wgslShaderSpeedUniform,
    pulseIntensity: pulseIntensityUniform,
    pulseWidth: pulseWidthUniform,
    pulseRate: pulseRateUniform,
  });

  //

  const tslVertexShader = Fn(() => {
    vUv.assign(uv());
    return positionGeometry;
  });

  const tslFragmentShader = Fn(() => {
    const dimensions = vec2(crtWidthUniform, crtHeightUniform);
    const translatedUV = vUv.mul(0.5).add(0.5);
    const pixel = translatedUV.mul(dimensions);

    const coord = pixel.div(cellSizeUniform);
    const subCoord = coord.mul(vec2(3.0, 1.0));

    const cellOffset = vec2(0.0, fract(floor(coord.x).mul(cellOffsetUniform)));

    const maskCoord = floor(coord.add(cellOffset)).mul(cellSizeUniform);
    const samplePoint = maskCoord.div(dimensions);
    const scaledTime = time.mul(tslShaderSpeedUniform);
    samplePoint.x = samplePoint.x.add(fract(scaledTime.div(20)));
    samplePoint.y = samplePoint.y.sub(1.5);

    let color = texture(planetTexture, samplePoint);

    const ind = floor(subCoord.x).mod(3);

    let maskColor = vec3(ind.equal(0.0), ind.equal(1.0), ind.equal(2.0)).mul(
      3.0
    );

    const subCoordOffset = fract(subCoord.add(cellOffset));
    let cellUV = subCoordOffset.mul(2.0);
    cellUV = cellUV.sub(1.0);

    const border = float(1.0).sub(cellUV.mul(cellUV).mul(borderMaskUniform));

    const clampX = clamp(border.x, 0.0, 1.0);
    const clampY = clamp(border.y, 0.0, 1.0);
    const borderClamp = clampX.mul(clampY);
    maskColor = maskColor.mul(borderClamp);

    color = color.mul(maskColor);

    const pixelDampen = pixel.y.div(pulseWidthUniform);
    let pulse = sin(pixelDampen.add(time.mul(pulseRateUniform)));
    pulse = pulse.mul(pulseIntensityUniform);
    color = color.mul(float(1.0).add(pulse));

    return color;
  });

  const tslShaderMaterial = new MeshBasicNodeMaterial();
  tslShaderMaterial.positionNode = tslVertexShader();
  tslShaderMaterial.colorNode = tslFragmentShader();

  camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene = new Scene();

  const geometry = new PlaneGeometry(2, 1);

  const wgslQuad = new Mesh(geometry, wgslShaderMaterial);
  wgslQuad.position.y += 0.5;
  scene.add(wgslQuad);

  const tslQuad = new Mesh(geometry, tslShaderMaterial);
  tslQuad.position.y -= 0.5;
  scene.add(tslQuad);

  renderer = new WebGPURenderer({ antialias: true, canvas: canvas });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  gui.add(cellSizeUniform, "value", 6, 50, 1).name("Cell Size");
  gui.add(cellOffsetUniform, "value", 0, 1, 0.1).name("Cell Offset");
  gui.add(borderMaskUniform, "value", 0, 5, 0.1).name("Border Mask");
  gui.add(pulseIntensityUniform, "value", 0, 0.5, 0.01).name("Pulse Intensity");
  gui.add(pulseWidthUniform, "value", 10, 100, 5).name("Pulse Width");
  gui.add(wgslShaderSpeedUniform, "value", 1, 10).name("WGSL Shader Speed");
  gui.add(tslShaderSpeedUniform, "value", 1, 10).name("TSL Shader Speed");
}

init();
