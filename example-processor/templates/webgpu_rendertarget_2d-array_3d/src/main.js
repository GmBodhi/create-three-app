import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  vec2,
  uniform,
  screenUV,
  color,
  texture,
  diffuseColor,
  attribute,
  vec3,
  vec4,
} from "three/tsl";
import Stats from "three/addons/libs/stats.module.js";
import { TextureHelper } from "three/addons/helpers/TextureHelperGPU.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { unzipSync } from "three/addons/libs/fflate.module.js";

let renderer, stats;
let views = [];

class View {
  constructor(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;

    const aspect = (window.innerWidth * width) / (window.innerHeight * height);

    // Set up perspective camera
    this.camera = new PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(-7, 0, 10);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this.scene = new Scene();

    const normalizedUV = screenUV.mul(vec2(1, -1)).add(vec2(0, 1)); // Flip Y and offset

    // Calculate viewport center in normalized coordinates
    const viewportCenter = vec2(
      this.left + this.width * 0.5,
      this.top + this.height * 0.5 // Invert Y coordinate for proper alignment
    );

    const distanceEffect = normalizedUV
      .distance(viewportCenter)
      .smoothstep(0, 0.2);

    const backgroundEffect = color(this.top > 0 ? 0x212121 : 0x616161).sub(
      distanceEffect.pow(0.3).mul(0.1)
    );

    this.scene.backgroundNode = backgroundEffect;
  }

  // Method to handle viewport resize
  updateSize(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;

    const aspect = (window.innerWidth * width) / (window.innerHeight * height);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

async function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  await renderer.init();

  // Create views after renderer initialization
  views = [
    new View(0.0, 0.0, 0.5, 0.5),
    new View(0.5, 0.0, 0.5, 0.5),
    new View(0.0, 0.5, 0.5, 0.5),
    new View(0.5, 0.5, 0.5, 0.5),
  ];

  // Add OrbitControls after views and renderer are created
  views.forEach((view) => {
    view.controls = new OrbitControls(view.camera, renderer.domElement);
    view.controls.minDistance = 1;
    view.controls.maxDistance = 20;
    view.controls.minAzimuthAngle = -Math.PI / 3;
    view.controls.maxAzimuthAngle = Math.PI / 3;
    view.controls.minPolarAngle = Math.PI / 4;
    view.controls.maxPolarAngle = Math.PI / 1.25;
    view.controls.enableDamping = true;
  });

  const size = {
    width: 256,
    height: 256,
    depth: 109,
  };

  new FileLoader()
    .setResponseType("arraybuffer")
    .load("textures/3d/head256x256x109.zip", function (data) {
      const zip = unzipSync(new Uint8Array(data));
      const array = new Uint8Array(zip["head256x256x109"].buffer);

      const map3D = new Data3DTexture(
        array,
        size.width,
        size.height,
        size.depth
      );
      map3D.name = "Data3DTexture";
      map3D.format = RedFormat;
      map3D.minFilter = LinearFilter;
      map3D.magFilter = LinearFilter;
      map3D.unpackAlignment = 1;
      map3D.needsUpdate = true;

      const depth = size.depth / 20;

      // 3D
      const helper3D = new TextureHelper(map3D, 10, 10, depth);
      helper3D.material.outputNode = vec4(
        vec3(diffuseColor.r.mul(attribute("uvw").z.mul(diffuseColor.r))),
        diffuseColor.r.mul(diffuseColor.a)
      );
      views[1].scene.add(helper3D);

      const fbo3D = new RenderTarget3D(size.width, size.height, size.depth, {
        depthBuffer: false,
      });
      fbo3D.texture.name = "RenderTarget3D";

      const fbo3DHelper = new TextureHelper(fbo3D.texture, 10, 10, depth);
      fbo3DHelper.material.outputNode = vec4(
        vec3(diffuseColor.r),
        diffuseColor.r
      );
      views[3].scene.add(fbo3DHelper);

      // 2D Array

      const mapArray = new DataArrayTexture(
        array,
        size.width,
        size.height,
        size.depth
      );
      mapArray.name = "DataArrayTexture";
      mapArray.format = RedFormat;
      mapArray.minFilter = LinearFilter;
      mapArray.magFilter = LinearFilter;
      mapArray.unpackAlignment = 1;
      mapArray.needsUpdate = true;

      const helperArray = new TextureHelper(mapArray, 10, 10, depth);
      helperArray.material.outputNode = vec4(
        vec3(
          diffuseColor.r.mul(
            attribute("uvw").z.div(size.depth).mul(diffuseColor.r)
          )
        ),
        diffuseColor.r.mul(diffuseColor.a)
      );
      views[0].scene.add(helperArray);

      // Setup render targets
      const materialQuad = new NodeMaterial();
      const uZCoord = uniform(0);
      materialQuad.depthTest = false;
      materialQuad.outputNode = vec4(texture(mapArray).depth(uZCoord).rgb, 1);

      const fboArray = new RenderTarget(size.width, size.height, {
        depthBuffer: false,
        depth: size.depth,
      });
      fboArray.texture.name = "RenderTargetArray";

      const fboArrayHelper = new TextureHelper(fboArray.texture, 10, 10, depth);
      fboArrayHelper.material.outputNode = vec4(
        vec3(diffuseColor.r),
        diffuseColor.r
      );
      views[2].scene.add(fboArrayHelper);

      const quadMesh = new QuadMesh(materialQuad);

      // In WebGPU we need to clear all the layers of the 3D render target before rendering to it (WebGPU limitation?)
      if (renderer.backend.isWebGPUBackend) {
        const materialClear = new NodeMaterial();
        materialClear.outputNode = vec4(0);
        const clearQuadMesh = new QuadMesh(materialClear);
        for (let i = 0; i < size.depth; i++) {
          renderer.setRenderTarget(fbo3D, i);
          clearQuadMesh.render(renderer);
        }
      }

      let j = 0;

      const loop = () => {
        if (j === size.depth) {
          clearInterval(interval);
          return;
        }

        // Disable viewport and scissor for FBO rendering
        renderer.setViewport(0, 0, size.width, size.height);
        renderer.setScissor(0, 0, size.width, size.height);
        renderer.setScissorTest(false);

        uZCoord.value = j;

        renderer.setRenderTarget(fboArray, j);
        renderer.clear();
        quadMesh.render(renderer);

        renderer.setRenderTarget(fbo3D, j);
        renderer.clear();
        quadMesh.render(renderer);

        renderer.setRenderTarget(null);

        j = (j + 1) % size.depth;
      };

      const interval = setInterval(loop, 50);

      loop();
    });

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);

  views.forEach((view) => {
    view.updateSize(view.left, view.top, view.width, view.height);
  });
}

function animate() {
  views.forEach((view) => {
    view.controls.update();

    const left = Math.floor(view.left * window.innerWidth);
    const bottom = Math.floor(
      (1 - view.top - view.height) * window.innerHeight
    );
    const width = Math.floor(view.width * window.innerWidth);
    const height = Math.floor(view.height * window.innerHeight);

    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);
    renderer.setScissorTest(true);

    renderer.clear();
    renderer.render(view.scene, view.camera);
  });

  stats.update();
}

init();
