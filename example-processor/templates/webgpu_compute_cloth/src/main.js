import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import {
  Fn,
  If,
  Return,
  instancedArray,
  instanceIndex,
  uniform,
  select,
  attribute,
  uint,
  Loop,
  float,
  transformNormalToView,
  cross,
  triNoise3D,
  time,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let renderer, scene, camera, controls;

const clothWidth = 1;
const clothHeight = 1;
const clothNumSegmentsX = 30;
const clothNumSegmentsY = 30;
const sphereRadius = 0.15;

let vertexPositionBuffer, vertexForceBuffer, vertexParamsBuffer;
let springVertexIdBuffer, springRestLengthBuffer, springForceBuffer;
let springListBuffer;
let computeSpringForces, computeVertexForces;
let dampeningUniform,
  spherePositionUniform,
  stiffnessUniform,
  sphereUniform,
  windUniform;
let vertexWireframeObject, springWireframeObject;
let clothMesh, clothMaterial, sphere;
let timeSinceLastStep = 0;
let timestamp = 0;
const verletVertices = [];
const verletSprings = [];
const verletVertexColumns = [];

const clock = new Clock();

const params = {
  wireframe: false,
  sphere: true,
  wind: 1.0,
};

const API = {
  color: 0x204080, // sRGB
  sheenColor: 0xffffff, // sRGB
};

init();

async function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.set(-1.6, -0.1, -1.6);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 3;
  controls.target.set(0, -0.1, 0);
  controls.update();

  const rgbeLoader = new RGBELoader().setPath("textures/equirectangular/");

  const hdrTexture = await rgbeLoader.loadAsync("royal_esplanade_1k.hdr");
  hdrTexture.mapping = EquirectangularReflectionMapping;
  scene.background = hdrTexture;
  scene.backgroundBlurriness = 0.5;
  scene.environment = hdrTexture;

  setupCloth();

  const gui = new GUI();
  gui.add(stiffnessUniform, "value", 0.1, 0.5, 0.01).name("stiffness");
  gui.add(params, "wireframe");
  gui.add(params, "sphere");
  gui.add(params, "wind", 0, 5, 0.1);

  const materialFolder = gui.addFolder("material");
  materialFolder.addColor(API, "color").onChange(function (color) {
    clothMaterial.color.setHex(color);
  });
  materialFolder.add(clothMaterial, "roughness", 0.0, 1, 0.01);
  materialFolder.add(clothMaterial, "sheen", 0.0, 1, 0.01);
  materialFolder.add(clothMaterial, "sheenRoughness", 0.0, 1, 0.01);
  materialFolder.addColor(API, "sheenColor").onChange(function (color) {
    clothMaterial.sheenColor.setHex(color);
  });

  window.addEventListener("resize", onWindowResize);

  renderer.setAnimationLoop(render);
}

function setupVerletGeometry() {
  // this function sets up the geometry of the verlet system, a grid of vertices connected by springs

  const addVerletVertex = (x, y, z, isFixed) => {
    const id = verletVertices.length;
    const vertex = {
      id,
      position: new Vector3(x, y, z),
      isFixed,
      springIds: [],
    };
    verletVertices.push(vertex);
    return vertex;
  };

  const addVerletSpring = (vertex0, vertex1) => {
    const id = verletSprings.length;
    const spring = {
      id,
      vertex0,
      vertex1,
    };
    vertex0.springIds.push(id);
    vertex1.springIds.push(id);
    verletSprings.push(spring);
    return spring;
  };

  // create the cloth's verlet vertices
  for (let x = 0; x <= clothNumSegmentsX; x++) {
    const column = [];
    for (let y = 0; y <= clothNumSegmentsY; y++) {
      const posX = x * (clothWidth / clothNumSegmentsX) - clothWidth * 0.5;
      const posZ = y * (clothHeight / clothNumSegmentsY);
      const isFixed = y === 0 && x % 5 === 0; // make some of the top vertices' positions fixed
      const vertex = addVerletVertex(posX, clothHeight * 0.5, posZ, isFixed);
      column.push(vertex);
    }

    verletVertexColumns.push(column);
  }

  // create the cloth's verlet springs
  for (let x = 0; x <= clothNumSegmentsX; x++) {
    for (let y = 0; y <= clothNumSegmentsY; y++) {
      const vertex0 = verletVertexColumns[x][y];
      if (x > 0) addVerletSpring(vertex0, verletVertexColumns[x - 1][y]);
      if (y > 0) addVerletSpring(vertex0, verletVertexColumns[x][y - 1]);
      if (x > 0 && y > 0)
        addVerletSpring(vertex0, verletVertexColumns[x - 1][y - 1]);
      if (x > 0 && y < clothNumSegmentsY)
        addVerletSpring(vertex0, verletVertexColumns[x - 1][y + 1]);

      // You can make the cloth more rigid by adding more springs between further apart vertices
      //if (x > 1) addVerletSpring(vertex0, verletVertexColumns[x - 2][y]);
      //if (y > 1) addVerletSpring(vertex0, verletVertexColumns[x][y - 2]);
    }
  }
}

function setupVerletVertexBuffers() {
  // setup the buffers holding the vertex data for the compute shaders

  const vertexCount = verletVertices.length;

  const springListArray = [];
  // this springListArray will hold a list of spring ids, ordered by the id of the vertex affected by that spring.
  // this is so the compute shader that accumulates the spring forces for each vertex can efficiently iterate over all springs affecting that vertex

  const vertexPositionArray = new Float32Array(vertexCount * 3);
  const vertexParamsArray = new Uint32Array(vertexCount * 3);
  // the params Array holds three values for each verlet vertex:
  // x: isFixed, y: springCount, z: springPointer
  // isFixed is 1 if the verlet is marked as immovable, 0 if not
  // springCount is the number of springs connected to that vertex
  // springPointer is the index of the first spring in the springListArray that is connected to that vertex

  for (let i = 0; i < vertexCount; i++) {
    const vertex = verletVertices[i];
    vertexPositionArray[i * 3] = vertex.position.x;
    vertexPositionArray[i * 3 + 1] = vertex.position.y;
    vertexPositionArray[i * 3 + 2] = vertex.position.z;
    vertexParamsArray[i * 3] = vertex.isFixed ? 1 : 0;
    if (!vertex.isFixed) {
      vertexParamsArray[i * 3 + 1] = vertex.springIds.length;
      vertexParamsArray[i * 3 + 2] = springListArray.length;
      springListArray.push(...vertex.springIds);
    }
  }

  vertexPositionBuffer = instancedArray(vertexPositionArray, "vec3").setPBO(
    true
  ); // setPBO(true) is only important for the WebGL Fallback
  vertexForceBuffer = instancedArray(vertexCount, "vec3");
  vertexParamsBuffer = instancedArray(vertexParamsArray, "uvec3");

  springListBuffer = instancedArray(
    new Uint32Array(springListArray),
    "uint"
  ).setPBO(true);
}

function setupVerletSpringBuffers() {
  // setup the buffers holding the spring data for the compute shaders

  const springCount = verletSprings.length;

  const springVertexIdArray = new Uint32Array(springCount * 2);
  const springRestLengthArray = new Float32Array(springCount);

  for (let i = 0; i < springCount; i++) {
    const spring = verletSprings[i];
    springVertexIdArray[i * 2] = spring.vertex0.id;
    springVertexIdArray[i * 2 + 1] = spring.vertex1.id;
    springRestLengthArray[i] = spring.vertex0.position.distanceTo(
      spring.vertex1.position
    );
  }

  springVertexIdBuffer = instancedArray(springVertexIdArray, "uvec2").setPBO(
    true
  );
  springRestLengthBuffer = instancedArray(springRestLengthArray, "float");
  springForceBuffer = instancedArray(springCount * 3, "vec3").setPBO(true);
}

function setupUniforms() {
  dampeningUniform = uniform(0.99);
  spherePositionUniform = uniform(new Vector3(0, 0, 0));
  sphereUniform = uniform(1.0);
  windUniform = uniform(1.0);
  stiffnessUniform = uniform(0.2);
}

function setupComputeShaders() {
  // This function sets up the compute shaders for the verlet simulation
  // There are two shaders that are executed for each simulation step

  const vertexCount = verletVertices.length;
  const springCount = verletSprings.length;

  // 1. computeSpringForces:
  // This shader computes a force for each spring, depending on the distance between the two vertices connected by that spring and the targeted rest length
  computeSpringForces = Fn(() => {
    If(instanceIndex.greaterThanEqual(uint(springCount)), () => {
      // compute Shaders are executed in groups of 64, so instanceIndex might be bigger than the amount of springs.
      // in that case, return.
      Return();
    });

    const vertexIds = springVertexIdBuffer.element(instanceIndex);
    const restLength = springRestLengthBuffer.element(instanceIndex);

    const vertex0Position = vertexPositionBuffer.element(vertexIds.x);
    const vertex1Position = vertexPositionBuffer.element(vertexIds.y);

    const delta = vertex1Position.sub(vertex0Position).toVar();
    const dist = delta.length().max(0.000001).toVar();
    const force = dist
      .sub(restLength)
      .mul(stiffnessUniform)
      .mul(delta)
      .mul(0.5)
      .div(dist);
    springForceBuffer.element(instanceIndex).assign(force);
  })().compute(springCount);

  // 2. computeVertexForces:
  // This shader accumulates the force for each vertex.
  // First it iterates over all springs connected to this vertex and accumulates their forces.
  // Then it adds a gravital force, wind force, and the collision with the sphere.
  // In the end it adds the force to the vertex' position.
  computeVertexForces = Fn(() => {
    If(instanceIndex.greaterThanEqual(uint(vertexCount)), () => {
      // compute Shaders are executed in groups of 64, so instanceIndex might be bigger than the amount of vertices.
      // in that case, return.
      Return();
    });

    const params = vertexParamsBuffer.element(instanceIndex).toVar();
    const isFixed = params.x;
    const springCount = params.y;
    const springPointer = params.z;

    If(isFixed, () => {
      // don't need to calculate vertex forces if the vertex is set as immovable
      Return();
    });

    const position = vertexPositionBuffer
      .element(instanceIndex)
      .toVar("vertexPosition");
    const force = vertexForceBuffer.element(instanceIndex).toVar("vertexForce");

    force.mulAssign(dampeningUniform);

    const ptrStart = springPointer.toVar("ptrStart");
    const ptrEnd = ptrStart.add(springCount).toVar("ptrEnd");

    Loop(
      { start: ptrStart, end: ptrEnd, type: "uint", condition: "<" },
      ({ i }) => {
        const springId = springListBuffer.element(i).toVar("springId");
        const springForce = springForceBuffer.element(springId);
        const springVertexIds = springVertexIdBuffer.element(springId);
        const factor = select(
          springVertexIds.x.equal(instanceIndex),
          1.0,
          -1.0
        );
        force.addAssign(springForce.mul(factor));
      }
    );

    // gravity
    force.y.subAssign(0.00005);

    // wind
    const noise = triNoise3D(position, 1, time).sub(0.2).mul(0.0001);
    const windForce = noise.mul(windUniform);
    force.z.subAssign(windForce);

    // collision with sphere
    const deltaSphere = position.add(force).sub(spherePositionUniform);
    const dist = deltaSphere.length();
    const sphereForce = float(sphereRadius)
      .sub(dist)
      .max(0)
      .mul(deltaSphere)
      .div(dist)
      .mul(sphereUniform);
    force.addAssign(sphereForce);

    vertexForceBuffer.element(instanceIndex).assign(force);
    vertexPositionBuffer.element(instanceIndex).addAssign(force);
  })().compute(vertexCount);
}

function setupWireframe() {
  // adds helpers to visualize the verlet system

  // verlet vertex visualizer
  const vertexWireframeMaterial = new SpriteNodeMaterial();
  vertexWireframeMaterial.positionNode =
    vertexPositionBuffer.element(instanceIndex);
  vertexWireframeObject = new Mesh(
    new PlaneGeometry(0.01, 0.01),
    vertexWireframeMaterial
  );
  vertexWireframeObject.frustumCulled = false;
  vertexWireframeObject.count = verletVertices.length;
  scene.add(vertexWireframeObject);

  // verlet spring visualizer
  const springWireframePositionBuffer = new BufferAttribute(
    new Float32Array(6),
    3,
    false
  );
  const springWireframeIndexBuffer = new BufferAttribute(
    new Uint32Array([0, 1]),
    1,
    false
  );
  const springWireframeMaterial = new LineBasicNodeMaterial();
  springWireframeMaterial.positionNode = Fn(() => {
    const vertexIds = springVertexIdBuffer.element(instanceIndex);
    const vertexId = select(
      attribute("vertexIndex").equal(0),
      vertexIds.x,
      vertexIds.y
    );
    return vertexPositionBuffer.element(vertexId);
  })();

  const springWireframeGeometry = new InstancedBufferGeometry();
  springWireframeGeometry.setAttribute(
    "position",
    springWireframePositionBuffer
  );
  springWireframeGeometry.setAttribute(
    "vertexIndex",
    springWireframeIndexBuffer
  );
  springWireframeGeometry.instanceCount = verletSprings.length;

  springWireframeObject = new Line(
    springWireframeGeometry,
    springWireframeMaterial
  );
  springWireframeObject.frustumCulled = false;
  springWireframeObject.count = verletSprings.length;
  scene.add(springWireframeObject);
}

function setupSphere() {
  const geometry = new IcosahedronGeometry(sphereRadius * 0.95, 4);
  const material = new MeshStandardNodeMaterial();
  sphere = new Mesh(geometry, material);
  scene.add(sphere);
}

function setupClothMesh() {
  // This function generates a three Geometry and Mesh to render the cloth based on the verlet systems position data.
  // Therefore it creates a plane mesh, in which each vertex will be centered in the center of 4 verlet vertices.

  const vertexCount = clothNumSegmentsX * clothNumSegmentsY;
  const geometry = new BufferGeometry();

  // verletVertexIdArray will hold the 4 verlet vertex ids that contribute to each geometry vertex's position
  const verletVertexIdArray = new Uint32Array(vertexCount * 4);
  const indices = [];

  const getIndex = (x, y) => {
    return y * clothNumSegmentsX + x;
  };

  for (let x = 0; x < clothNumSegmentsX; x++) {
    for (let y = 0; y < clothNumSegmentsX; y++) {
      const index = getIndex(x, y);
      verletVertexIdArray[index * 4] = verletVertexColumns[x][y].id;
      verletVertexIdArray[index * 4 + 1] = verletVertexColumns[x + 1][y].id;
      verletVertexIdArray[index * 4 + 2] = verletVertexColumns[x][y + 1].id;
      verletVertexIdArray[index * 4 + 3] = verletVertexColumns[x + 1][y + 1].id;

      if (x > 0 && y > 0) {
        indices.push(
          getIndex(x, y),
          getIndex(x - 1, y),
          getIndex(x - 1, y - 1)
        );
        indices.push(
          getIndex(x, y),
          getIndex(x - 1, y - 1),
          getIndex(x, y - 1)
        );
      }
    }
  }

  const verletVertexIdBuffer = new BufferAttribute(
    verletVertexIdArray,
    4,
    false
  );
  const positionBuffer = new BufferAttribute(
    new Float32Array(vertexCount * 3),
    3,
    false
  );
  geometry.setAttribute("position", positionBuffer);
  geometry.setAttribute("vertexIds", verletVertexIdBuffer);
  geometry.setIndex(indices);

  clothMaterial = new MeshPhysicalNodeMaterial({
    color: new Color().setHex(API.color),
    side: DoubleSide,
    transparent: true,
    opacity: 0.85,
    sheen: 1.0,
    sheenRoughness: 0.5,
    sheenColor: new Color().setHex(API.sheenColor),
  });

  clothMaterial.positionNode = Fn(({ material }) => {
    // gather the position of the 4 verlet vertices and calculate the center position and normal from that
    const vertexIds = attribute("vertexIds");
    const v0 = vertexPositionBuffer.element(vertexIds.x).toVar();
    const v1 = vertexPositionBuffer.element(vertexIds.y).toVar();
    const v2 = vertexPositionBuffer.element(vertexIds.z).toVar();
    const v3 = vertexPositionBuffer.element(vertexIds.w).toVar();

    const top = v0.add(v1);
    const right = v1.add(v3);
    const bottom = v2.add(v3);
    const left = v0.add(v2);

    const tangent = right.sub(left).normalize();
    const bitangent = bottom.sub(top).normalize();

    const normal = cross(tangent, bitangent);

    // send the normalView from the vertex shader to the fragment shader
    material.normalNode = transformNormalToView(normal).toVarying();

    return v0.add(v1).add(v2).add(v3).mul(0.25);
  })();

  clothMesh = new Mesh(geometry, clothMaterial);
  clothMesh.frustumCulled = false;
  scene.add(clothMesh);
}

function setupCloth() {
  setupVerletGeometry();
  setupVerletVertexBuffers();
  setupVerletSpringBuffers();
  setupUniforms();
  setupComputeShaders();
  setupWireframe();
  setupSphere();
  setupClothMesh();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateSphere() {
  sphere.position.set(
    Math.sin(timestamp * 2.1) * 0.1,
    0,
    Math.sin(timestamp * 0.8)
  );
  spherePositionUniform.value.copy(sphere.position);
}

async function render() {
  sphere.visible = params.sphere;
  sphereUniform.value = params.sphere ? 1 : 0;
  windUniform.value = params.wind;
  clothMesh.visible = !params.wireframe;
  vertexWireframeObject.visible = params.wireframe;
  springWireframeObject.visible = params.wireframe;

  const deltaTime = Math.min(clock.getDelta(), 1 / 60); // don't advance the time too far, for example when the window is out of focus
  const stepsPerSecond = 360; // ensure the same amount of simulation steps per second on all systems, independent of refresh rate
  const timePerStep = 1 / stepsPerSecond;

  timeSinceLastStep += deltaTime;

  while (timeSinceLastStep >= timePerStep) {
    // run a verlet system simulation step
    timestamp += timePerStep;
    timeSinceLastStep -= timePerStep;
    updateSphere();
    await renderer.computeAsync(computeSpringForces);
    await renderer.computeAsync(computeVertexForces);
  }

  await renderer.renderAsync(scene, camera);
}
