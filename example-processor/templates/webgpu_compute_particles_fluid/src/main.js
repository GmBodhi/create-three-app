import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import {
  Fn,
  If,
  Return,
  instancedArray,
  instanceIndex,
  uniform,
  attribute,
  uint,
  float,
  clamp,
  struct,
  atomicStore,
  int,
  ivec3,
  array,
  vec3,
  atomicAdd,
  Loop,
  atomicLoad,
  max,
  pow,
  mat3,
  vec4,
  cross,
  step,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import WebGPU from "three/addons/capabilities/WebGPU.js";

let renderer, scene, camera, controls;

const clock = new Clock();

const maxParticles = 8192 * 16;
const gridSize1d = 64;
const gridSize = new Vector3(gridSize1d, gridSize1d, gridSize1d);
const fixedPointMultiplier = 1e7;

let particleCountUniform,
  stiffnessUniform,
  restDensityUniform,
  dynamicViscosityUniform,
  dtUniform,
  gravityUniform,
  gridSizeUniform;
let particleBuffer, cellBuffer, cellBufferFloat;
let clearGridKernel, p2g1Kernel, p2g2Kernel, updateGridKernel, g2pKernel;
let particleMesh;
const mouseCoord = new Vector3();
const prevMouseCoord = new Vector3();
let mouseRayOriginUniform, mouseRayDirectionUniform, mouseForceUniform;

if (WebGPU.isAvailable() === false) {
  document.body.appendChild(WebGPU.getErrorMessage());
  throw new Error("No WebGPU support");
}

const gui = new GUI();

const params = {
  particleCount: 8192 * 4,
};

init();

async function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.set(-1.3, 1.3, -1.3);

  controls = new OrbitControls(camera, renderer.domElement);

  controls.minDistance = 1;
  controls.maxDistance = 3;
  controls.maxPolarAngle = Math.PI * 0.35;
  controls.touches = { TWO: TOUCH.DOLLY_ROTATE };

  const rgbeLoader = new RGBELoader().setPath("textures/equirectangular/");

  const hdrTexture = await rgbeLoader.loadAsync("royal_esplanade_1k.hdr");
  hdrTexture.mapping = EquirectangularReflectionMapping;
  scene.background = hdrTexture;
  scene.backgroundBlurriness = 0.5;
  scene.environment = hdrTexture;

  setupParticles();

  gui
    .add(params, "particleCount", 4096, maxParticles, 4096)
    .onChange((value) => {
      p2g1Kernel.count = value;
      p2g2Kernel.count = value;
      g2pKernel.count = value;
      p2g1Kernel.updateDispatchCount();
      p2g2Kernel.updateDispatchCount();
      g2pKernel.updateDispatchCount();
      particleMesh.count = value;
      particleCountUniform.value = value;
    });

  window.addEventListener("resize", onWindowResize);
  controls.update();
  renderer.setAnimationLoop(render);
}

function setupBuffers() {
  const particleStruct = struct({
    position: { type: "vec3" },
    velocity: { type: "vec3" },
    C: { type: "mat3" },
  });
  const particleStructSize = 20; // each vec3 occupies 4 floats and mat3 occupies 12 floats in memory because of webgpu memory alignment
  const particleArray = new Float32Array(maxParticles * particleStructSize);

  for (let i = 0; i < maxParticles; i++) {
    particleArray[i * particleStructSize] = Math.random() * 0.8 + 0.1;
    particleArray[i * particleStructSize + 1] = Math.random() * 0.8 + 0.1;
    particleArray[i * particleStructSize + 2] = Math.random() * 0.8 + 0.1;
  }

  particleBuffer = instancedArray(particleArray, particleStruct);

  const cellCount = gridSize.x * gridSize.y * gridSize.z;

  const cellStruct = struct({
    x: { type: "int", atomic: true },
    y: { type: "int", atomic: true },
    z: { type: "int", atomic: true },
    mass: { type: "int", atomic: true },
  });

  cellBuffer = instancedArray(cellCount, cellStruct);
  cellBufferFloat = instancedArray(cellCount, "vec4");
}

function setupUniforms() {
  gridSizeUniform = uniform(gridSize);
  particleCountUniform = uniform(params.particleCount, "uint");
  stiffnessUniform = uniform(50);
  restDensityUniform = uniform(1.5);
  dynamicViscosityUniform = uniform(0.1);
  dtUniform = uniform(1 / 60);
  gravityUniform = uniform(new Vector3(0, -(9.81 * 9.81), 0));
  mouseRayOriginUniform = uniform(new Vector3(0, 0, 0));
  mouseRayDirectionUniform = uniform(new Vector3(0, 0, 0));
  mouseForceUniform = uniform(new Vector3(0, 0, 0));

  // gui.add(restDensityUniform, "value", 1.0, 3, 0.1).name("restDensity");
  // it's interesting to adjust the restDensity but it might cause the simulation to become unstable
}

function setupComputeShaders() {
  // the MLS-MPM system uses five compute shaders:
  // 1. clearGridKernel: this clears the grid before each pass
  // 2. p2g1Kernel & 3. p2g2Kernel: These particle2grid kernels transfer the particles' energy to the grid
  // 4. updateGridKernel: updates the grid
  // 5. g2pKernel: grid2particle kernel, transfers the grid energy back to the particles
  // the implementation closely follows https://github.com/matsuoka-601/WebGPU-Ocean

  // because webgpu only supports int atomics, we use fixed point floats by multiplying/dividing the float values with a high integer constant
  const encodeFixedPoint = (f32) => {
    return int(f32.mul(fixedPointMultiplier));
  };

  const decodeFixedPoint = (i32) => {
    return float(i32).div(fixedPointMultiplier);
  };

  const cellCount = gridSize.x * gridSize.y * gridSize.z;
  clearGridKernel = Fn(() => {
    If(instanceIndex.greaterThanEqual(uint(cellCount)), () => {
      Return();
    });

    atomicStore(cellBuffer.element(instanceIndex).get("x"), 0);
    atomicStore(cellBuffer.element(instanceIndex).get("y"), 0);
    atomicStore(cellBuffer.element(instanceIndex).get("z"), 0);
    atomicStore(cellBuffer.element(instanceIndex).get("mass"), 0);
  })().compute(cellCount);

  p2g1Kernel = Fn(() => {
    If(instanceIndex.greaterThanEqual(particleCountUniform), () => {
      Return();
    });
    const particlePosition = particleBuffer
      .element(instanceIndex)
      .get("position")
      .toConst("particlePosition");
    const particleVelocity = particleBuffer
      .element(instanceIndex)
      .get("velocity")
      .toConst("particleVelocity");
    const C = particleBuffer.element(instanceIndex).get("C").toConst("C");

    const gridPosition = particlePosition.mul(gridSizeUniform).toVar();
    const cellIndex = ivec3(gridPosition).sub(1).toConst("cellIndex");
    const cellDiff = gridPosition.fract().sub(0.5).toConst("cellDiff");
    const w0 = float(0.5)
      .mul(float(0.5).sub(cellDiff))
      .mul(float(0.5).sub(cellDiff));
    const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
    const w2 = float(0.5)
      .mul(float(0.5).add(cellDiff))
      .mul(float(0.5).add(cellDiff));
    const weights = array([w0, w1, w2]).toConst("weights");

    Loop(
      { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
      ({ gx }) => {
        Loop(
          { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
          ({ gy }) => {
            Loop(
              { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
              ({ gz }) => {
                const weight = weights
                  .element(gx)
                  .x.mul(weights.element(gy).y)
                  .mul(weights.element(gz).z);
                const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
                const cellDist = vec3(cellX)
                  .add(0.5)
                  .sub(gridPosition)
                  .toConst("cellDist");
                const Q = C.mul(cellDist);

                const massContrib = weight; // assuming particle mass = 1.0
                const velContrib = massContrib
                  .mul(particleVelocity.add(Q))
                  .toConst("velContrib");
                const cellPtr = cellX.x
                  .mul(int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();
                const cell = cellBuffer.element(cellPtr);

                atomicAdd(cell.get("x"), encodeFixedPoint(velContrib.x));
                atomicAdd(cell.get("y"), encodeFixedPoint(velContrib.y));
                atomicAdd(cell.get("z"), encodeFixedPoint(velContrib.z));
                atomicAdd(cell.get("mass"), encodeFixedPoint(massContrib));
              }
            );
          }
        );
      }
    );
  })().compute(params.particleCount);

  p2g2Kernel = Fn(() => {
    If(instanceIndex.greaterThanEqual(particleCountUniform), () => {
      Return();
    });
    const particlePosition = particleBuffer
      .element(instanceIndex)
      .get("position")
      .toConst("particlePosition");
    const gridPosition = particlePosition.mul(gridSizeUniform).toVar();

    const cellIndex = ivec3(gridPosition).sub(1).toConst("cellIndex");
    const cellDiff = gridPosition.fract().sub(0.5).toConst("cellDiff");
    const w0 = float(0.5)
      .mul(float(0.5).sub(cellDiff))
      .mul(float(0.5).sub(cellDiff));
    const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
    const w2 = float(0.5)
      .mul(float(0.5).add(cellDiff))
      .mul(float(0.5).add(cellDiff));
    const weights = array([w0, w1, w2]).toConst("weights");

    const density = float(0).toVar("density");
    Loop(
      { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
      ({ gx }) => {
        Loop(
          { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
          ({ gy }) => {
            Loop(
              { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
              ({ gz }) => {
                const weight = weights
                  .element(gx)
                  .x.mul(weights.element(gy).y)
                  .mul(weights.element(gz).z);
                const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
                const cellPtr = cellX.x
                  .mul(int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();
                const cell = cellBuffer.element(cellPtr);
                const mass = decodeFixedPoint(atomicLoad(cell.get("mass")));
                density.addAssign(mass.mul(weight));
              }
            );
          }
        );
      }
    );

    const volume = float(1).div(density);
    const pressure = max(
      0.0,
      pow(density.div(restDensityUniform), 5.0).sub(1).mul(stiffnessUniform)
    ).toConst("pressure");
    const stress = mat3(
      pressure.negate(),
      0,
      0,
      0,
      pressure.negate(),
      0,
      0,
      0,
      pressure.negate()
    ).toVar("stress");
    const dudv = particleBuffer.element(instanceIndex).get("C").toConst("C");

    const strain = dudv.add(dudv.transpose());
    stress.addAssign(strain.mul(dynamicViscosityUniform));
    const eq16Term0 = volume.mul(-4).mul(stress).mul(dtUniform);

    Loop(
      { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
      ({ gx }) => {
        Loop(
          { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
          ({ gy }) => {
            Loop(
              { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
              ({ gz }) => {
                const weight = weights
                  .element(gx)
                  .x.mul(weights.element(gy).y)
                  .mul(weights.element(gz).z);
                const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
                const cellDist = vec3(cellX)
                  .add(0.5)
                  .sub(gridPosition)
                  .toConst("cellDist");
                const momentum = eq16Term0
                  .mul(weight)
                  .mul(cellDist)
                  .toConst("momentum");

                const cellPtr = cellX.x
                  .mul(int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();
                const cell = cellBuffer.element(cellPtr);
                atomicAdd(cell.get("x"), encodeFixedPoint(momentum.x));
                atomicAdd(cell.get("y"), encodeFixedPoint(momentum.y));
                atomicAdd(cell.get("z"), encodeFixedPoint(momentum.z));
              }
            );
          }
        );
      }
    );
  })().compute(params.particleCount);

  updateGridKernel = Fn(() => {
    If(instanceIndex.greaterThanEqual(uint(cellCount)), () => {
      Return();
    });
    const cell = cellBuffer.element(instanceIndex);
    const mass = decodeFixedPoint(atomicLoad(cell.get("mass"))).toConst();
    If(mass.lessThanEqual(0), () => {
      Return();
    });

    const vx = decodeFixedPoint(atomicLoad(cell.get("x")))
      .div(mass)
      .toVar();
    const vy = decodeFixedPoint(atomicLoad(cell.get("y")))
      .div(mass)
      .toVar();
    const vz = decodeFixedPoint(atomicLoad(cell.get("z")))
      .div(mass)
      .toVar();

    const x = int(instanceIndex).div(int(gridSize.z * gridSize.y));
    const y = int(instanceIndex).div(int(gridSize.z)).mod(int(gridSize.y));
    const z = int(instanceIndex).mod(int(gridSize.z));
    If(
      x.lessThan(int(1)).or(x.greaterThan(int(gridSize.x).sub(int(2)))),
      () => {
        vx.assign(0);
      }
    );
    If(
      y.lessThan(int(1)).or(y.greaterThan(int(gridSize.y).sub(int(2)))),
      () => {
        vy.assign(0);
      }
    );
    If(
      z.lessThan(int(1)).or(z.greaterThan(int(gridSize.z).sub(int(2)))),
      () => {
        vz.assign(0);
      }
    );

    cellBufferFloat.element(instanceIndex).assign(vec4(vx, vy, vz, mass));
  })().compute(cellCount);

  const clampToRoundedBox = (pos, box, radius) => {
    const result = pos.sub(0.5).toVar();
    const pp = step(box, result.abs()).mul(
      result.add(box.negate().mul(result.sign()))
    );
    const ppLen = pp.length().toVar();
    const dist = ppLen.sub(radius);
    If(dist.greaterThan(0.0), () => {
      result.subAssign(pp.normalize().mul(dist).mul(1.3));
    });
    result.addAssign(0.5);
    return result;
  };

  g2pKernel = Fn(() => {
    If(instanceIndex.greaterThanEqual(particleCountUniform), () => {
      Return();
    });
    const particlePosition = particleBuffer
      .element(instanceIndex)
      .get("position")
      .toVar("particlePosition");
    const gridPosition = particlePosition.mul(gridSizeUniform).toVar();
    const particleVelocity = vec3(0).toVar();

    const cellIndex = ivec3(gridPosition).sub(1).toConst("cellIndex");
    const cellDiff = gridPosition.fract().sub(0.5).toConst("cellDiff");

    const w0 = float(0.5)
      .mul(float(0.5).sub(cellDiff))
      .mul(float(0.5).sub(cellDiff));
    const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
    const w2 = float(0.5)
      .mul(float(0.5).add(cellDiff))
      .mul(float(0.5).add(cellDiff));
    const weights = array([w0, w1, w2]).toConst("weights");

    const B = mat3(0).toVar("B");
    Loop(
      { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
      ({ gx }) => {
        Loop(
          { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
          ({ gy }) => {
            Loop(
              { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
              ({ gz }) => {
                const weight = weights
                  .element(gx)
                  .x.mul(weights.element(gy).y)
                  .mul(weights.element(gz).z);
                const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
                const cellDist = vec3(cellX)
                  .add(0.5)
                  .sub(gridPosition)
                  .toConst("cellDist");
                const cellPtr = cellX.x
                  .mul(int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();

                const weightedVelocity = cellBufferFloat
                  .element(cellPtr)
                  .xyz.mul(weight)
                  .toConst("weightedVelocity");
                const term = mat3(
                  weightedVelocity.mul(cellDist.x),
                  weightedVelocity.mul(cellDist.y),
                  weightedVelocity.mul(cellDist.z)
                );
                B.addAssign(term);
                particleVelocity.addAssign(weightedVelocity);
              }
            );
          }
        );
      }
    );

    particleBuffer.element(instanceIndex).get("C").assign(B.mul(4));

    // gravity
    particleVelocity.addAssign(gravityUniform.mul(dtUniform));

    // scale from (gridSize.x, gridSize.y, gridSize.z) to (1, 1, 1)
    particleVelocity.divAssign(gridSizeUniform);

    // mouseInteraction
    const dist = cross(
      mouseRayDirectionUniform,
      particlePosition.sub(mouseRayOriginUniform)
    ).length();
    const force = dist.mul(3.0).oneMinus().max(0.0).pow(2);
    particleVelocity.addAssign(mouseForceUniform.mul(force));

    // add velocity to position
    particlePosition.addAssign(particleVelocity.mul(dtUniform));

    // clamp position so outermost gridCells are not reached
    particlePosition.assign(
      clamp(
        particlePosition,
        vec3(1).div(gridSizeUniform),
        vec3(gridSize).sub(1).div(gridSizeUniform)
      )
    );

    // add force for particles to stay within rounded box
    const innerBox = gridSizeUniform
      .mul(0.5)
      .sub(9.0)
      .div(gridSizeUniform)
      .toVar();
    const innerRadius = float(6.0).div(gridSizeUniform.x);
    const posNext = particlePosition
      .add(particleVelocity.mul(dtUniform).mul(2.0))
      .toConst("posNext");
    const posNextClamped = clampToRoundedBox(posNext, innerBox, innerRadius);
    particleVelocity.addAssign(posNextClamped.sub(posNext));

    /*
					const wallStiffness = 1.0;
					const xN = particlePosition.add( particleVelocity.mul( dtUniform ).mul( 2.0 ) ).toConst( 'xN' );
					const wallMin = vec3( 3 ).div(gridSizeUniform).toConst( 'wallMin' );
					const wallMax = vec3( gridSize ).sub( 3 ).div(gridSizeUniform).toConst( 'wallMax' );
					particleVelocity.addAssign( wallMin.sub( xN ).max( 0.0 ).mul( wallStiffness ) );
					particleVelocity.addAssign( wallMax.sub( xN ).min( 0.0 ).mul( wallStiffness ) );
					*/

    // scale from (1, 1, 1) back to (gridSize.x, gridSize.y, gridSize.z) to
    particleVelocity.mulAssign(gridSizeUniform);

    particleBuffer
      .element(instanceIndex)
      .get("position")
      .assign(particlePosition);
    particleBuffer
      .element(instanceIndex)
      .get("velocity")
      .assign(particleVelocity);
  })().compute(params.particleCount);
}

function setupMesh() {
  // mergeVertices to reduce the number of vertexShaderCalls
  const geometry = BufferGeometryUtils.mergeVertices(
    new IcosahedronGeometry(0.008, 1).deleteAttribute("uv")
  );

  const material = new MeshStandardNodeMaterial({
    color: "#0066FF",
  });

  material.positionNode = Fn(() => {
    const particlePosition = particleBuffer
      .element(instanceIndex)
      .get("position");
    return attribute("position").add(particlePosition);
  })();
  particleMesh = new Mesh(geometry, material);
  particleMesh.count = params.particleCount;
  particleMesh.position.set(-0.5, 0, -0.5);
  particleMesh.frustumCulled = false;
  scene.add(particleMesh);
}

function setupMouse() {
  const raycaster = new Raycaster();
  const raycastPlane = new Plane(new Vector3(0, 1, 0));

  const onMove = (event) => {
    const pointer = new Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.origin.x += 0.5;
    raycaster.ray.origin.z += 0.5;
    mouseRayOriginUniform.value.copy(raycaster.ray.origin);
    mouseRayDirectionUniform.value.copy(raycaster.ray.direction);

    raycaster.ray.intersectPlane(raycastPlane, mouseCoord);
  };

  renderer.domElement.addEventListener("pointermove", onMove);
}

function setupParticles() {
  setupBuffers();
  setupUniforms();
  setupComputeShaders();
  setupMesh();
  setupMouse();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function render() {
  const deltaTime = MathUtils.clamp(clock.getDelta(), 0.00001, 1 / 60); // don't advance the time too far, for example when the window is out of focus
  dtUniform.value = deltaTime;

  mouseForceUniform.value
    .copy(mouseCoord)
    .sub(prevMouseCoord)
    .multiplyScalar(2);
  const mouseForceLength = mouseForceUniform.value.length();
  if (mouseForceLength > 0.3) {
    mouseForceUniform.value.multiplyScalar(0.3 / mouseForceLength);
  }

  prevMouseCoord.copy(mouseCoord);

  await renderer.computeAsync([
    clearGridKernel,
    p2g1Kernel,
    p2g2Kernel,
    updateGridKernel,
    g2pKernel,
  ]);

  await renderer.renderAsync(scene, camera);
}
