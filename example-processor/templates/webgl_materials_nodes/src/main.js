import "./style.css"; // For webpack support

import {
  Clock,
  sRGBEncoding,
  LinearEncoding,
  TextureLoader,
  RepeatWrapping,
  PMREMGenerator,
  CubeTextureLoader,
  WebGLRenderer,
  MathUtils,
  Scene,
  PerspectiveCamera,
  Group,
  AmbientLight,
  DirectionalLight,
  Mesh,
  DoubleSide,
  MeshStandardMaterial,
  Vector2,
  FrontSide,
  BackSide,
  AdditiveBlending,
  NormalBlending,
  WebGLRenderTarget,
  LinearFilter,
  NearestFilter,
  RGBFormat,
} from "three";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";

import {
  NodeMaterialLoader,
  NodeMaterialLoaderUtils,
} from "three/examples/jsm/loaders/NodeMaterialLoader.js";

import * as Nodes from "three/examples/jsm/nodes/Nodes.js";

const container = document.getElementById("container");

let renderer, scene, lightGroup, camera;
const clock = new Clock(),
  fov = 50;
const frame = new Nodes.NodeFrame();
let teapot, mesh;
let controls;
let move = false;
let rtTexture, rtMaterial;
let gui;
const library = {};
let serialized = false;
const textures = {
  brick: { url: "textures/brick_diffuse.jpg", encoding: sRGBEncoding },
  grass: { url: "textures/terrain/grasslight-big.jpg", encoding: sRGBEncoding },
  grassNormal: {
    url: "textures/terrain/grasslight-big-nm.jpg",
    encoding: LinearEncoding,
  },
  decalDiffuse: {
    url: "textures/decal/decal-diffuse.png",
    encoding: sRGBEncoding,
  },
  decalNormal: {
    url: "textures/decal/decal-normal.jpg",
    encoding: LinearEncoding,
  },
  cloud: { url: "textures/lava/cloud.png", encoding: sRGBEncoding },
  spherical: { url: "textures/envmap.png", encoding: sRGBEncoding },
};

const param = {
  example:
    new URL(window.location.href).searchParams.get("e") || "mesh-standard",
};

function getTexture(name) {
  let texture = textures[name].texture;

  if (!texture) {
    texture = textures[name].texture = new TextureLoader().load(
      textures[name].url
    );
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.encoding = textures[name].encoding;

    library[texture.uuid] = texture;
  }

  return texture;
}

let premTexture, pmremCube;

function updatePREM(textureCube) {
  pmremCube = pmremCube || textureCube;

  if (!pmremCube || !renderer) return;

  const minFilter = pmremCube.minFilter;
  const magFilter = pmremCube.magFilter;
  const generateMipmaps = pmremCube.generateMipmaps;

  const pmremGenerator = new PMREMGenerator(renderer);
  premTexture = pmremGenerator.fromCubemap(pmremCube).texture;
  pmremGenerator.dispose();

  pmremCube.minFilter = minFilter;
  pmremCube.magFilter = magFilter;
  pmremCube.generateMipmaps = generateMipmaps;
  pmremCube.needsUpdate = true;

  library[premTexture.uuid] = premTexture;
}

const cubemap = (function () {
  const path = "textures/cube/Park2/";
  const format = ".jpg";
  const urls = [
    path + "posx" + format,
    path + "negx" + format,
    path + "posy" + format,
    path + "negy" + format,
    path + "posz" + format,
    path + "negz" + format,
  ];

  const textureCube = new CubeTextureLoader().load(urls, updatePREM);

  library[textureCube.uuid] = textureCube;

  return textureCube;
})();

window.addEventListener("load", init);

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.uuid = MathUtils.generateUUID(); // generate to library
  renderer.outputEncoding = sRGBEncoding;
  container.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.x = 50;
  camera.position.z = -50;
  camera.position.y = 30;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 50;
  controls.maxDistance = 200;

  lightGroup = new Group();
  scene.add(lightGroup);

  let light;

  lightGroup.add(new AmbientLight(0x464646));

  light = new DirectionalLight(0xffddcc, 1);
  light.position.set(1, 0.75, 0.5);
  lightGroup.add(light);

  light = new DirectionalLight(0xccccff, 1);
  light.position.set(-1, 0.75, -0.5);
  lightGroup.add(light);

  teapot = new TeapotGeometry(15, 18);

  mesh = new Mesh(teapot);
  scene.add(mesh);

  library[renderer.uuid] = renderer;
  library[camera.uuid] = camera;
  library[mesh.uuid] = mesh;

  updatePREM();

  window.addEventListener("resize", onWindowResize);

  updateMaterial();

  onWindowResize();
  animate();
}

function clearGui() {
  if (gui) gui.destroy();

  gui = new GUI();

  gui
    .add(param, "example", {
      "basic / blur": "blur",
      "basic / bump": "bump",
      "basic / color-adjustment": "color-adjustment",
      "basic / layers": "layers",
      "basic / mesh-standard": "mesh-standard",
      "basic / phong": "phong",
      "basic / physical": "physical",
      "basic / prem": "prem",
      "basic / rim": "rim",
      "basic / spherical-reflection": "spherical-reflection",
      "basic / standard": "standard",
      "basic / uv-transform": "uv-transform",

      "adv / bias": "bias",
      "adv / camera-depth": "camera-depth",
      "adv / caustic": "caustic",
      "adv / conditional": "conditional",
      "adv / displace": "displace",
      "adv / dissolve": "dissolve",
      "adv / dissolve-fire": "dissolve-fire",
      "adv / expression": "expression",
      "adv / fresnel": "fresnel",
      "adv / plush": "plush",
      "adv / render-to-texture": "rtt",
      "adv / saturation": "saturation",
      "adv / skin": "skin",
      "adv / skin-phong": "skin-phong",
      "adv / soft-body": "soft-body",
      "adv / sss": "sss",
      "adv / temporal-blur": "temporal-blur",
      "adv / toon": "toon",
      "adv / top-bottom": "top-bottom",
      "adv / translucent": "translucent",
      "adv / triangle-blur": "triangle-blur",
      "adv / triplanar-mapping": "triplanar-mapping",
      "adv / wave": "wave",

      "node / normal": "node-normal",
      "node / position": "node-position",
      "node / reflect": "node-reflect",

      "misc / basic-material": "basic-material",
      "misc / custom-attribute": "custom-attribute",
      "misc / firefly": "firefly",
      "misc / label": "label",
      "misc / readonly": "readonly",
      "misc / reserved-keywords": "reserved-keywords",
      "misc / smoke": "smoke",
      "misc / sub-slot": "sub-slot",
      "misc / varying": "varying",
      "misc / void-function": "void-function",
    })
    .onFinishChange(function () {
      updateMaterial();
    });

  gui.open();
}

function addGui(name, value, callback, isColor, min, max) {
  let node;

  param[name] = value;

  if (isColor) {
    node = gui.addColor(param, name).onChange(function () {
      callback(param[name]);
    });
  } else if (typeof value === "object") {
    param[name] = value[Object.keys(value)[0]];

    node = gui.add(param, name, value).onChange(function () {
      callback(param[name]);
    });
  } else {
    node = gui.add(param, name, min, max).onChange(function () {
      callback(param[name]);
    });
  }

  return node;
}

function updateMaterial() {
  move = false;

  lightGroup.visible = true;

  if (mesh.material) mesh.material.dispose();

  if (rtTexture) {
    delete library[rtTexture.texture.uuid];

    rtTexture.dispose();
    rtTexture = null;
  }

  if (rtMaterial) {
    rtMaterial.dispose();
    rtMaterial = null;
  }

  var name = param.example,
    defaultSide = DoubleSide,
    mtl;

  clearGui();

  switch (name) {
    case "phong":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      //mtl.color = // albedo (vec3)
      //mtl.alpha = // opacity (float)
      //mtl.specular = // specular color (vec3)
      //mtl.shininess = // shininess (float)
      //mtl.normal = // normal (vec3)
      //mtl.emissive = // emissive color (vec3)
      //mtl.ambient = // ambient color (vec3)
      //mtl.shadow = // shadowmap (vec3)
      //mtl.light = // custom-light (vec3)
      //mtl.ao = // ambient occlusion (float)
      //mtl.light = // input/output light (vec3)
      //mtl.environment = // reflection/refraction (vec3)
      //mtl.environmentAlpha = // environment alpha (float)
      //mtl.position = // vertex local position (vec3)

      var mask = new Nodes.SwitchNode(
        new Nodes.TextureNode(getTexture("decalDiffuse")),
        "w"
      );

      mtl.color = new Nodes.TextureNode(getTexture("grass"));
      mtl.specular = new Nodes.FloatNode(0.5);
      mtl.shininess = new Nodes.FloatNode(15);
      mtl.environment = new Nodes.CubeTextureNode(cubemap);
      mtl.environmentAlpha = mask;
      mtl.normal = new Nodes.NormalMapNode(
        new Nodes.TextureNode(getTexture("grassNormal"))
      );
      mtl.normal.scale = new Nodes.MathNode(mask, Nodes.MathNode.INVERT);

      break;

    case "standard":
      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      //mtl.color = // albedo (vec3)
      //mtl.alpha = // opacity (float)
      //mtl.roughness = // roughness (float)
      //mtl.metalness = // metalness (float)
      //mtl.normal = // normal (vec3)
      //mtl.emissive = // emissive color (vec3)
      //mtl.ambient = // ambient color (vec3)
      //mtl.shadow = // shadowmap (vec3)
      //mtl.light = // custom-light (vec3)
      //mtl.ao = // ambient occlusion (float)
      //mtl.environment = // reflection/refraction (vec3)
      //mtl.position = // vertex local position (vec3)

      var mask = new Nodes.SwitchNode(
        new Nodes.TextureNode(getTexture("decalDiffuse")),
        "w"
      );

      var normalScale = new Nodes.FloatNode(0.3);

      var roughnessA = new Nodes.FloatNode(0.5);
      var metalnessA = new Nodes.FloatNode(0.5);

      var roughnessB = new Nodes.FloatNode(0);
      var metalnessB = new Nodes.FloatNode(1);

      var roughness = new Nodes.MathNode(
        roughnessA,
        roughnessB,
        mask,
        Nodes.MathNode.MIX
      );

      var metalness = new Nodes.MathNode(
        metalnessA,
        metalnessB,
        mask,
        Nodes.MathNode.MIX
      );

      var normalMask = new Nodes.OperatorNode(
        new Nodes.MathNode(mask, Nodes.MathNode.INVERT),
        normalScale,
        Nodes.OperatorNode.MUL
      );

      mtl.color = new Nodes.ColorNode(0xeeeeee);
      mtl.roughness = roughness;
      mtl.metalness = metalness;
      mtl.environment = new Nodes.CubeTextureNode(cubemap);
      mtl.normal = new Nodes.NormalMapNode(
        new Nodes.TextureNode(getTexture("grassNormal"))
      );
      mtl.normal.scale = normalMask;

      // GUI

      addGui(
        "color",
        mtl.color.value.getHex(),
        function (val) {
          mtl.color.value.setHex(val);
        },
        true
      );

      addGui(
        "roughnessA",
        roughnessA.value,
        function (val) {
          roughnessA.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalnessA",
        metalnessA.value,
        function (val) {
          metalnessA.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "roughnessB",
        roughnessB.value,
        function (val) {
          roughnessB.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalnessB",
        metalnessB.value,
        function (val) {
          metalnessB.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "normalScale",
        normalScale.value,
        function (val) {
          normalScale.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "prem":
      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      //mtl.color = // albedo (vec3)
      //mtl.alpha = // opacity (float)
      //mtl.roughness = // roughness (float)
      //mtl.metalness = // metalness (float)
      //mtl.normal = // normal (vec3)
      //mtl.emissive = // emissive color (vec3)
      //mtl.ambient = // ambient color (vec3)
      //mtl.shadow = // shadowmap (vec3)
      //mtl.light = // custom-light (vec3)
      //mtl.ao = // ambient occlusion (float)
      //mtl.environment = // reflection/refraction (vec3)
      //mtl.position = // vertex local position (vec3)

      var mask = new Nodes.SwitchNode(
        new Nodes.TextureNode(getTexture("decalDiffuse")),
        "w"
      );

      var intensity = new Nodes.FloatNode(1);

      var normalScale = new Nodes.FloatNode(0.3);

      var roughnessA = new Nodes.FloatNode(0.5);
      var metalnessA = new Nodes.FloatNode(0.5);

      var roughnessB = new Nodes.FloatNode(0);
      var metalnessB = new Nodes.FloatNode(1);

      var roughness = new Nodes.MathNode(
        roughnessA,
        roughnessB,
        mask,
        Nodes.MathNode.MIX
      );

      var metalness = new Nodes.MathNode(
        metalnessA,
        metalnessB,
        mask,
        Nodes.MathNode.MIX
      );

      var normalMask = new Nodes.OperatorNode(
        new Nodes.MathNode(mask, Nodes.MathNode.INVERT),
        normalScale,
        Nodes.OperatorNode.MUL
      );

      mtl.color = new Nodes.ColorNode(0xeeeeee);
      mtl.roughness = roughness;
      mtl.metalness = metalness;
      mtl.normal = new Nodes.NormalMapNode(
        new Nodes.TextureNode(getTexture("grassNormal"))
      );
      mtl.normal.scale = normalMask;

      var envNode = new Nodes.TextureCubeNode(
        new Nodes.TextureNode(premTexture)
      );
      mtl.environment = new Nodes.OperatorNode(
        envNode,
        intensity,
        Nodes.OperatorNode.MUL
      );

      // GUI

      addGui(
        "color",
        mtl.color.value.getHex(),
        function (val) {
          mtl.color.value.setHex(val);
        },
        true
      );

      addGui(
        "intensity",
        intensity.value,
        function (val) {
          intensity.value = val;
        },
        false,
        0,
        2
      );

      addGui(
        "roughnessA",
        roughnessA.value,
        function (val) {
          roughnessA.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalnessA",
        metalnessA.value,
        function (val) {
          metalnessA.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "roughnessB",
        roughnessB.value,
        function (val) {
          roughnessB.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalnessB",
        metalnessB.value,
        function (val) {
          metalnessB.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "normalScale",
        normalScale.value,
        function (val) {
          normalScale.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "sub-slot":
      // disable dynamic light

      lightGroup.visible = false;

      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      // NODES

      var normalScale = new Nodes.FloatNode(0.3);

      var radiance = new Nodes.FloatNode(1);
      var irradiance = new Nodes.FloatNode(1);

      var roughness = new Nodes.FloatNode(0.5);
      var metalness = new Nodes.FloatNode(0.5);

      mtl.color = new Nodes.ColorNode(0xeeeeee);
      mtl.roughness = roughness;
      mtl.metalness = metalness;
      mtl.normal = new Nodes.NormalMapNode(
        new Nodes.TextureNode(getTexture("grassNormal"))
      );
      mtl.normal.scale = normalScale;

      var envNode = new Nodes.TextureCubeNode(
        new Nodes.TextureNode(premTexture)
      );

      var subSlotNode = new Nodes.SubSlotNode();
      subSlotNode.slots["radiance"] = new Nodes.OperatorNode(
        radiance,
        envNode,
        Nodes.OperatorNode.MUL
      );
      subSlotNode.slots["irradiance"] = new Nodes.OperatorNode(
        irradiance,
        envNode,
        Nodes.OperatorNode.MUL
      );

      mtl.environment = subSlotNode;

      // GUI

      addGui(
        "radiance",
        radiance.value,
        function (val) {
          radiance.value = val;
        },
        false,
        0,
        2
      );

      addGui(
        "irradiance",
        irradiance.value,
        function (val) {
          irradiance.value = val;
        },
        false,
        0,
        2
      );

      addGui(
        "roughness",
        roughness.value,
        function (val) {
          roughness.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalness",
        metalness.value,
        function (val) {
          metalness.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "normalScale",
        normalScale.value,
        function (val) {
          normalScale.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "mesh-standard":
      // MATERIAL

      var sataturation = new Nodes.FloatNode(1),
        useNodeMaterial = true,
        useMap = true,
        useNormals = true;

      function updateMaterial() {
        var oldMaterial = mtl;

        if (oldMaterial) oldMaterial.dispose();

        mtl = useNodeMaterial
          ? new Nodes.MeshStandardNodeMaterial()
          : new MeshStandardMaterial();

        // default syntax ( backward-compatible )

        mtl.map = useMap ? getTexture("brick") : undefined;

        mtl.normalMap = useNormals ? getTexture("decalNormal") : undefined;
        mtl.normalScale = oldMaterial
          ? oldMaterial.normalScale
          : new Vector2(0.5, 0.5);

        mtl.envMap = cubemap;

        mtl.roughness = oldMaterial ? oldMaterial.roughness : 0.5;
        mtl.metalness = oldMaterial ? oldMaterial.metalness : 0.5;

        // extended syntax ( only for NodeMaterial )

        if (useNodeMaterial && useMap) {
          mtl.map = new Nodes.ColorAdjustmentNode(
            new Nodes.TextureNode(mtl.map),
            sataturation,
            Nodes.ColorAdjustmentNode.SATURATION
          );
        }

        // apply material

        mtl.side = defaultSide;
        mtl.needsUpdate = true;

        mesh.material = mtl;
      }

      updateMaterial();

      // GUI

      addGui("use node material", useNodeMaterial, function (val) {
        useNodeMaterial = val;

        updateMaterial();
      });

      addGui(
        "roughness",
        mtl.roughness,
        function (val) {
          mtl.roughness = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalness",
        mtl.roughness,
        function (val) {
          mtl.metalness = val;
        },
        false,
        0,
        1
      );

      addGui(
        "normalX",
        mtl.normalScale.x,
        function (val) {
          mtl.normalScale.x = val;
        },
        false,
        -1,
        1
      );

      addGui(
        "normalY",
        mtl.normalScale.y,
        function (val) {
          mtl.normalScale.y = val;
        },
        false,
        -1,
        1
      );

      addGui(
        "sat. (node)",
        sataturation.value,
        function (val) {
          sataturation.value = val;
        },
        false,
        0,
        2
      );

      addGui(
        "colors",
        useMap,
        function (val) {
          useMap = val;

          updateMaterial();
        },
        false
      );

      addGui(
        "normals",
        useNormals,
        function (val) {
          useNormals = val;

          updateMaterial();
        },
        false
      );

      addGui(
        "side",
        {
          DoubleSided: DoubleSide,
          FrontSided: FrontSide,
          BackSided: BackSide,
        },
        function (val) {
          defaultSide = Number(val);

          updateMaterial();
        }
      );

      break;

    case "physical":
      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      //mtl.color = // albedo (vec3)
      //mtl.alpha = // opacity (float)
      //mtl.roughness = // roughness (float)
      //mtl.metalness = // metalness (float)
      //mtl.reflectivity = // reflectivity (float)
      //mtl.clearcoat = // clearcoat (float)
      //mtl.clearcoatRoughness = // clearcoatRoughness (float)
      //mtl.clearcoatNormal = // clearcoatNormal (vec3)
      //mtl.normal = // normal (vec3)
      //mtl.emissive = // emissive color (vec3)
      //mtl.ambient = // ambient color (vec3)
      //mtl.shadow = // shadowmap (vec3)
      //mtl.light = // custom-light (vec3)
      //mtl.ao = // ambient occlusion (float)
      //mtl.environment = // reflection/refraction (vec3)
      //mtl.position = // vertex local position (vec3)

      var mask = new Nodes.SwitchNode(
        new Nodes.TextureNode(getTexture("decalDiffuse")),
        "w"
      );

      var normalScale = new Nodes.FloatNode(0.3);
      var clearcoatNormalScale = new Nodes.FloatNode(0.1);

      var roughnessA = new Nodes.FloatNode(0.5);
      var metalnessA = new Nodes.FloatNode(0.5);

      var roughnessB = new Nodes.FloatNode(0);
      var metalnessB = new Nodes.FloatNode(1);

      var reflectivity = new Nodes.FloatNode(0);
      var clearcoat = new Nodes.FloatNode(1);
      var clearcoatRoughness = new Nodes.FloatNode(1);

      var roughness = new Nodes.MathNode(
        roughnessA,
        roughnessB,
        mask,
        Nodes.MathNode.MIX
      );

      var metalness = new Nodes.MathNode(
        metalnessA,
        metalnessB,
        mask,
        Nodes.MathNode.MIX
      );

      var normalMask = new Nodes.OperatorNode(
        new Nodes.MathNode(mask, Nodes.MathNode.INVERT),
        normalScale,
        Nodes.OperatorNode.MUL
      );

      var clearcoatNormalMask = new Nodes.OperatorNode(
        mask,
        clearcoatNormalScale,
        Nodes.OperatorNode.MUL
      );

      mtl.color = new Nodes.ColorNode(0xeeeeee);
      mtl.roughness = roughness;
      mtl.metalness = metalness;
      mtl.reflectivity = reflectivity;
      mtl.clearcoat = clearcoat;
      mtl.clearcoatRoughness = clearcoatRoughness;
      mtl.clearcoatNormal = new Nodes.NormalMapNode(
        new Nodes.TextureNode(getTexture("grassNormal"))
      );
      mtl.clearcoatNormal.scale = clearcoatNormalMask;
      mtl.environment = new Nodes.CubeTextureNode(cubemap);
      mtl.normal = new Nodes.NormalMapNode(
        new Nodes.TextureNode(getTexture("grassNormal"))
      );
      mtl.normal.scale = normalMask;

      // GUI

      addGui(
        "color",
        mtl.color.value.getHex(),
        function (val) {
          mtl.color.value.setHex(val);
        },
        true
      );

      addGui(
        "reflectivity",
        reflectivity.value,
        function (val) {
          reflectivity.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "clearcoat",
        clearcoat.value,
        function (val) {
          clearcoat.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "clearcoatRoughness",
        clearcoatRoughness.value,
        function (val) {
          clearcoatRoughness.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "clearcoatNormalScale",
        clearcoatNormalScale.value,
        function (val) {
          clearcoatNormalScale.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "roughnessA",
        roughnessA.value,
        function (val) {
          roughnessA.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalnessA",
        metalnessA.value,
        function (val) {
          metalnessA.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "roughnessB",
        roughnessB.value,
        function (val) {
          roughnessB.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "metalnessB",
        metalnessB.value,
        function (val) {
          metalnessB.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "normalScale",
        normalScale.value,
        function (val) {
          normalScale.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "wave":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var time = new Nodes.TimerNode();
      var speed = new Nodes.FloatNode(5);
      var scale = new Nodes.FloatNode(1);
      var worldScale = new Nodes.FloatNode(0.4);
      var colorA = new Nodes.ColorNode(0xffffff);
      var colorB = new Nodes.ColorNode(0x0054df);

      // used for serialization only
      time.name = "time";
      speed.name = "speed";

      var timeScale = new Nodes.OperatorNode(
        time,
        speed,
        Nodes.OperatorNode.MUL
      );

      var worldScl = new Nodes.OperatorNode(
        new Nodes.PositionNode(),
        worldScale,
        Nodes.OperatorNode.MUL
      );

      var posContinuous = new Nodes.OperatorNode(
        worldScl,
        timeScale,
        Nodes.OperatorNode.ADD
      );

      var wave = new Nodes.MathNode(posContinuous, Nodes.MathNode.SIN);
      wave = new Nodes.SwitchNode(wave, "x");

      var waveScale = new Nodes.OperatorNode(
        wave,
        scale,
        Nodes.OperatorNode.MUL
      );

      var displaceY = new Nodes.JoinNode(
        new Nodes.FloatNode(),
        waveScale,
        new Nodes.FloatNode()
      );

      var displace = new Nodes.OperatorNode(
        new Nodes.NormalNode(),
        displaceY,
        Nodes.OperatorNode.MUL
      );

      var blend = new Nodes.OperatorNode(
        new Nodes.PositionNode(),
        displaceY,
        Nodes.OperatorNode.ADD
      );

      var color = new Nodes.MathNode(colorB, colorA, wave, Nodes.MathNode.MIX);

      mtl.color = color;
      mtl.position = blend;

      // GUI

      addGui(
        "speed",
        speed.value,
        function (val) {
          speed.value = val;
        },
        false,
        0,
        10
      );

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        0,
        3
      );

      addGui(
        "worldScale",
        worldScale.value,
        function (val) {
          worldScale.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "colorA",
        colorA.value.getHex(),
        function (val) {
          colorA.value.setHex(val);
        },
        true
      );

      addGui(
        "colorB",
        colorB.value.getHex(),
        function (val) {
          colorB.value.setHex(val);
        },
        true
      );

      addGui("useNormals", false, function (val) {
        blend.b = val ? displace : displaceY;

        mtl.needsUpdate = true;
      });

      break;

    case "rim":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      defaultSide = FrontSide;

      var intensity = 1.3;
      var power = new Nodes.FloatNode(3);
      var color = new Nodes.ColorNode(0xffffff);

      var viewZ = new Nodes.MathNode(
        new Nodes.NormalNode(),
        new Nodes.Vector3Node(0, 0, -intensity),
        Nodes.MathNode.DOT
      );

      var rim = new Nodes.OperatorNode(
        viewZ,
        new Nodes.FloatNode(intensity),
        Nodes.OperatorNode.ADD
      );

      var rimPower = new Nodes.MathNode(rim, power, Nodes.MathNode.POW);

      var rimColor = new Nodes.OperatorNode(
        rimPower,
        color,
        Nodes.OperatorNode.MUL
      );

      mtl.color = new Nodes.ColorNode(0x111111);
      mtl.emissive = rimColor;

      // GUI

      addGui(
        "color",
        color.value.getHex(),
        function (val) {
          color.value.setHex(val);
        },
        true
      );

      addGui(
        "intensity",
        intensity,
        function (val) {
          intensity = val;

          viewZ.b.z = -intensity;
          rim.b.value = intensity;
        },
        false,
        0,
        3
      );

      addGui(
        "power",
        power.value,
        function (val) {
          power.value = val;
        },
        false,
        0,
        6
      );

      addGui("xray", false, function (val) {
        if (val) {
          mtl.emissive = color;
          mtl.alpha = rimPower;
          mtl.blending = AdditiveBlending;
          mtl.depthWrite = false;
        } else {
          mtl.emissive = rimColor;
          mtl.alpha = null;
          mtl.blending = NormalBlending;
          mtl.depthWrite = true;
        }

        mtl.needsUpdate = true;
      });

      break;

    case "color-adjustment":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var texture = new Nodes.TextureNode(getTexture("brick"));

      var hue = new Nodes.FloatNode();
      var sataturation = new Nodes.FloatNode(1);
      var vibrance = new Nodes.FloatNode();
      var brightness = new Nodes.FloatNode(0);
      var contrast = new Nodes.FloatNode(1);

      var hueNode = new Nodes.ColorAdjustmentNode(
        texture,
        hue,
        Nodes.ColorAdjustmentNode.HUE
      );
      var satNode = new Nodes.ColorAdjustmentNode(
        hueNode,
        sataturation,
        Nodes.ColorAdjustmentNode.SATURATION
      );
      var vibranceNode = new Nodes.ColorAdjustmentNode(
        satNode,
        vibrance,
        Nodes.ColorAdjustmentNode.VIBRANCE
      );
      var brightnessNode = new Nodes.ColorAdjustmentNode(
        vibranceNode,
        brightness,
        Nodes.ColorAdjustmentNode.BRIGHTNESS
      );
      var contrastNode = new Nodes.ColorAdjustmentNode(
        brightnessNode,
        contrast,
        Nodes.ColorAdjustmentNode.CONTRAST
      );

      mtl.color = contrastNode;

      // GUI

      addGui(
        "hue",
        hue.value,
        function (val) {
          hue.value = val;
        },
        false,
        0,
        Math.PI * 2
      );

      addGui(
        "saturation",
        sataturation.value,
        function (val) {
          sataturation.value = val;
        },
        false,
        0,
        2
      );

      addGui(
        "vibrance",
        vibrance.value,
        function (val) {
          vibrance.value = val;
        },
        false,
        -1,
        1
      );

      addGui(
        "brightness",
        brightness.value,
        function (val) {
          brightness.value = val;
        },
        false,
        0,
        0.5
      );

      addGui(
        "contrast",
        contrast.value,
        function (val) {
          contrast.value = val;
        },
        false,
        0,
        2
      );

      break;

    case "uv-transform":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var translate = new Vector2();
      var rotate = 0;
      var scale = new Vector2(1, 1);

      var texture = new Nodes.TextureNode(getTexture("brick"));
      texture.uv = new Nodes.UVTransformNode();
      //texture.uv.uv = new Nodes.UVNode( 1 ); // uv2 for example

      mtl.color = texture;

      // GUI

      function updateUVTransform() {
        texture.uv.setUvTransform(
          translate.x,
          translate.y,
          scale.x,
          scale.y,
          MathUtils.degToRad(rotate)
        );
      }

      addGui(
        "translateX",
        translate.x,
        function (val) {
          translate.x = val;

          updateUVTransform();
        },
        false,
        0,
        10
      );

      addGui(
        "translateY",
        translate.y,
        function (val) {
          translate.y = val;

          updateUVTransform();
        },
        false,
        0,
        10
      );

      addGui(
        "scaleX",
        scale.x,
        function (val) {
          scale.x = val;

          updateUVTransform();
        },
        false,
        0.1,
        5
      );

      addGui(
        "scaleY",
        scale.y,
        function (val) {
          scale.y = val;

          updateUVTransform();
        },
        false,
        0.1,
        5
      );

      addGui(
        "rotate",
        rotate,
        function (val) {
          rotate = val;

          updateUVTransform();
        },
        false,
        0,
        360
      );

      break;

    case "bump":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var diffuse = new Nodes.TextureNode(getTexture("brick"));

      var bumpMap = new Nodes.BumpMapNode(
        new Nodes.TextureNode(getTexture("brick"))
      );
      bumpMap.scale = new Nodes.FloatNode(0.5);

      mtl.color = diffuse;
      mtl.normal = bumpMap;

      // convert BumpMap to NormalMap
      //bumpMap.toNormalMap = true;
      //mtl.normal = new Nodes.NormalMapNode( bumpMap );

      // GUI

      addGui(
        "scale",
        bumpMap.scale.value,
        function (val) {
          bumpMap.scale.value = val;
        },
        false,
        -2,
        2
      );

      addGui("color", true, function (val) {
        mtl.color = val ? diffuse : new Nodes.ColorNode(0xeeeeee);

        mtl.needsUpdate = true;
      });

      break;

    case "blur":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var diffuse = new Nodes.TextureNode(getTexture("brick"));

      var blur = new Nodes.BlurNode(new Nodes.TextureNode(getTexture("brick")));

      mtl.color = blur;

      // GUI

      addGui(
        "radiusX",
        blur.radius.x,
        function (val) {
          blur.radius.x = val;
        },
        false,
        0,
        15
      );

      addGui(
        "radiusY",
        blur.radius.y,
        function (val) {
          blur.radius.y = val;
        },
        false,
        0,
        15
      );

      break;

    case "spherical-reflection":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      mtl.environment = new Nodes.TextureNode(
        getTexture("spherical"),
        new Nodes.ReflectNode(Nodes.ReflectNode.SPHERE)
      );

      break;

    case "fresnel":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var reflectance = new Nodes.FloatNode(1.3);
      var power = new Nodes.FloatNode(1);
      var color = new Nodes.CubeTextureNode(cubemap);

      var viewZ = new Nodes.MathNode(
        new Nodes.NormalNode(),
        new Nodes.Vector3Node(0, 0, -1),
        Nodes.MathNode.DOT
      );

      var theta = new Nodes.OperatorNode(
        viewZ,
        new Nodes.FloatNode(1),
        Nodes.OperatorNode.ADD
      );

      var thetaPower = new Nodes.MathNode(theta, power, Nodes.MathNode.POW);

      var fresnel = new Nodes.OperatorNode(
        reflectance,
        thetaPower,
        Nodes.OperatorNode.MUL
      );

      mtl.color = new Nodes.ColorNode(0x3399ff);
      mtl.environment = color;
      mtl.environmentAlpha = new Nodes.MathNode(
        fresnel,
        Nodes.MathNode.SATURATE
      );

      // GUI

      addGui(
        "reflectance",
        reflectance.value,
        function (val) {
          reflectance.value = val;
        },
        false,
        0,
        3
      );

      addGui(
        "power",
        power.value,
        function (val) {
          power.value = val;
        },
        false,
        0,
        5
      );

      break;

    case "layers":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var tex1 = new Nodes.TextureNode(getTexture("grass"));
      var tex2 = new Nodes.TextureNode(getTexture("brick"));

      var offset = new Nodes.FloatNode(0);
      var scale = new Nodes.FloatNode(1);
      var uv = new Nodes.UVNode();

      var uvOffset = new Nodes.OperatorNode(offset, uv, Nodes.OperatorNode.ADD);

      var uvScale = new Nodes.OperatorNode(
        uvOffset,
        scale,
        Nodes.OperatorNode.MUL
      );

      var mask = new Nodes.TextureNode(getTexture("decalDiffuse"), uvScale);
      var maskAlphaChannel = new Nodes.SwitchNode(mask, "w");

      var blend = new Nodes.MathNode(
        tex1,
        tex2,
        maskAlphaChannel,
        Nodes.MathNode.MIX
      );

      mtl.color = blend;

      // GUI

      addGui(
        "offset",
        offset.value,
        function (val) {
          offset.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        0,
        10
      );

      break;

    case "saturation":
      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      var tex = new Nodes.TextureNode(getTexture("brick"));
      var sat = new Nodes.FloatNode(0);

      var satrgb = new Nodes.FunctionNode(
        [
          "vec3 satrgb( vec3 rgb, float adjustment ) {",
          // include luminance function from LuminanceNode
          "	vec3 intensity = vec3( luminance( rgb ) );",
          "	return mix( intensity, rgb, adjustment );",
          "}",
        ].join("\n"),
        [Nodes.LuminanceNode.Nodes.luminance]
      );

      var saturation = new Nodes.FunctionCallNode(satrgb);
      saturation.inputs.rgb = tex;
      saturation.inputs.adjustment = sat;

      // or try

      //saturation.inputs[0] = tex;
      //saturation.inputs[1] = sat;

      mtl.color = saturation;

      // GUI

      addGui(
        "saturation",
        sat.value,
        function (val) {
          sat.value = val;
        },
        false,
        0,
        2
      );

      break;

    case "top-bottom":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var top = new Nodes.TextureNode(getTexture("grass"));
      var bottom = new Nodes.TextureNode(getTexture("brick"));

      var normal = new Nodes.NormalNode(Nodes.NormalNode.WORLD);
      var normalY = new Nodes.SwitchNode(normal, "y");

      var hard = new Nodes.FloatNode(9);
      var offset = new Nodes.FloatNode(-2.5);

      var hardClamp = new Nodes.OperatorNode(
        normalY,
        hard,
        Nodes.OperatorNode.MUL
      );

      var offsetClamp = new Nodes.OperatorNode(
        hardClamp,
        offset,
        Nodes.OperatorNode.ADD
      );

      var clamp0at1 = new Nodes.MathNode(offsetClamp, Nodes.MathNode.SATURATE);

      var blend = new Nodes.MathNode(
        top,
        bottom,
        clamp0at1,
        Nodes.MathNode.MIX
      );

      mtl.color = blend;

      // GUI

      addGui(
        "hard",
        hard.value,
        function (val) {
          hard.value = val;
        },
        false,
        0,
        20
      );

      addGui(
        "offset",
        offset.value,
        function (val) {
          offset.value = val;
        },
        false,
        -10,
        10
      );

      break;

    case "displace":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var time = new Nodes.TimerNode();
      var scale = new Nodes.FloatNode(2);
      var speed = new Nodes.FloatNode(0.2);
      var colorA = new Nodes.ColorNode(0xffffff);
      var colorB = new Nodes.ColorNode(0x0054df);

      // used for serialization only
      time.name = "time";
      speed.name = "speed";

      var uv = new Nodes.UVNode();

      var timeScl = new Nodes.OperatorNode(time, speed, Nodes.OperatorNode.MUL);

      var displaceOffset = new Nodes.OperatorNode(
        timeScl,
        uv,
        Nodes.OperatorNode.ADD
      );

      var tex = new Nodes.TextureNode(getTexture("cloud"), displaceOffset);
      var texArea = new Nodes.SwitchNode(tex, "w");

      var displace = new Nodes.OperatorNode(
        new Nodes.NormalNode(),
        texArea,
        Nodes.OperatorNode.MUL
      );

      var displaceScale = new Nodes.OperatorNode(
        displace,
        scale,
        Nodes.OperatorNode.MUL
      );

      var blend = new Nodes.OperatorNode(
        new Nodes.PositionNode(),
        displaceScale,
        Nodes.OperatorNode.ADD
      );

      var color = new Nodes.MathNode(
        colorB,
        colorA,
        texArea,
        Nodes.MathNode.MIX
      );

      mtl.color = mtl.specular = new Nodes.ColorNode(0);
      mtl.emissive = color;
      mtl.position = blend;

      // GUI

      addGui(
        "speed",
        speed.value,
        function (val) {
          speed.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        0,
        10
      );

      addGui(
        "colorA",
        colorA.value.getHex(),
        function (val) {
          colorA.value.setHex(val);
        },
        true
      );

      addGui(
        "colorB",
        colorB.value.getHex(),
        function (val) {
          colorB.value.setHex(val);
        },
        true
      );

      break;

    case "dissolve":
      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      var color = new Nodes.ColorNode(0xeeeeee);
      var borderColor = new Nodes.ColorNode(0x0054df);
      var threshold = new Nodes.FloatNode(0.1);
      var borderSize = new Nodes.FloatNode(0.2);

      var tex = new Nodes.TextureNode(getTexture("cloud"));
      var texArea = new Nodes.SwitchNode(tex, "w");

      var thresholdBorder = new Nodes.MathNode(
        new Nodes.OperatorNode(threshold, borderSize, Nodes.OperatorNode.ADD),
        threshold,
        texArea,
        Nodes.MathNode.SMOOTHSTEP
      );

      var thresholdEmissive = new Nodes.OperatorNode(
        borderColor,
        thresholdBorder,
        Nodes.OperatorNode.MUL
      );

      // APPLY

      mtl.color = color;
      mtl.emissive = thresholdEmissive;
      mtl.mask = new Nodes.CondNode(
        texArea, // a: value
        threshold, // b: value
        Nodes.CondNode.GREATER // condition
      );

      // GUI

      addGui(
        "threshold",
        threshold.value,
        function (val) {
          threshold.value = val;
        },
        false,
        -0.3,
        1.3
      );

      addGui(
        "borderSize",
        borderSize.value,
        function (val) {
          borderSize.value = val;
        },
        false,
        0,
        0.5
      );

      addGui(
        "color",
        color.value.getHex(),
        function (val) {
          color.value.setHex(val);
        },
        true
      );

      addGui(
        "borderColor",
        borderColor.value.getHex(),
        function (val) {
          borderColor.value.setHex(val);
        },
        true
      );

      break;

    case "dissolve-fire":
      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      var color = new Nodes.ColorNode(0xeeeeee);
      var fireStartColor = new Nodes.ColorNode(0xf7ca78);
      var fireEndColor = new Nodes.ColorNode(0xff0000);
      var burnedColor = new Nodes.ColorNode(0x000000);
      var threshold = new Nodes.FloatNode(0.1);
      var fireSize = new Nodes.FloatNode(0.16);
      var burnedSize = new Nodes.FloatNode(0.5);
      var timer = new Nodes.TimerNode(0.8);

      var sinCycleInSecs = new Nodes.OperatorNode(
        timer,
        new Nodes.ConstNode(Nodes.ConstNode.PI2),
        Nodes.OperatorNode.MUL
      );

      var cycle = new Nodes.MathNode(sinCycleInSecs, Nodes.MathNode.SIN);

      // round sin to 0 at 1
      cycle = new Nodes.OperatorNode(
        cycle,
        new Nodes.FloatNode(1),
        Nodes.OperatorNode.ADD
      );
      cycle = new Nodes.OperatorNode(
        cycle,
        new Nodes.FloatNode(2),
        Nodes.OperatorNode.DIV
      );

      // offset to +.9
      cycle = new Nodes.OperatorNode(
        cycle,
        new Nodes.FloatNode(0.9),
        Nodes.OperatorNode.ADD
      );

      var tex = new Nodes.TextureNode(getTexture("cloud"));
      var texArea = new Nodes.SwitchNode(tex, "w");

      var thresholdBorder = new Nodes.MathNode(
        new Nodes.OperatorNode(threshold, fireSize, Nodes.OperatorNode.ADD),
        threshold,
        texArea,
        Nodes.MathNode.SMOOTHSTEP
      );

      var fireStartAnimatedColor = new Nodes.ColorAdjustmentNode(
        fireStartColor,
        cycle,
        Nodes.ColorAdjustmentNode.SATURATION
      );

      var fireEndAnimatedColor = new Nodes.ColorAdjustmentNode(
        fireEndColor,
        cycle,
        Nodes.ColorAdjustmentNode.SATURATION
      );

      var fireColor = new Nodes.MathNode(
        fireEndAnimatedColor,
        fireStartAnimatedColor,
        thresholdBorder,
        Nodes.MathNode.MIX
      );

      var thresholdBurnedBorder = new Nodes.MathNode(
        new Nodes.OperatorNode(threshold, burnedSize, Nodes.OperatorNode.ADD),
        threshold,
        texArea,
        Nodes.MathNode.SMOOTHSTEP
      );

      var fireEmissive = new Nodes.OperatorNode(
        fireColor,
        thresholdBorder,
        Nodes.OperatorNode.MUL
      );

      var burnedResultColor = new Nodes.MathNode(
        color,
        burnedColor,
        thresholdBurnedBorder,
        Nodes.MathNode.MIX
      );

      // APPLY

      mtl.color = burnedResultColor;
      mtl.emissive = fireEmissive;
      mtl.mask = new Nodes.CondNode(
        texArea, // a: value
        threshold, // b: value
        Nodes.CondNode.GREATER // condition
      );

      // GUI

      addGui(
        "threshold",
        threshold.value,
        function (val) {
          threshold.value = val;
        },
        false,
        -0.5,
        1.5
      );

      addGui(
        "fireSize",
        fireSize.value,
        function (val) {
          fireSize.value = val;
        },
        false,
        0,
        0.5
      );

      addGui(
        "burnedSize",
        burnedSize.value,
        function (val) {
          burnedSize.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "color",
        color.value.getHex(),
        function (val) {
          color.value.setHex(val);
        },
        true
      );

      addGui(
        "fireStartColor",
        fireStartColor.value.getHex(),
        function (val) {
          fireStartColor.value.setHex(val);
        },
        true
      );

      addGui(
        "fireEndColor",
        fireEndColor.value.getHex(),
        function (val) {
          fireEndColor.value.setHex(val);
        },
        true
      );

      addGui(
        "burnedColor",
        burnedColor.value.getHex(),
        function (val) {
          burnedColor.value.setHex(val);
        },
        true
      );

      addGui(
        "timeScale",
        timer.scale,
        function (val) {
          timer.scale = val;
        },
        false,
        0,
        2
      );

      break;

    case "smoke":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      defaultSide = FrontSide;

      var time = new Nodes.TimerNode();
      var uv = new Nodes.UVNode();

      var timeSpeedA = new Nodes.OperatorNode(
        time,
        new Nodes.Vector2Node(0.3, 0.1),
        Nodes.OperatorNode.MUL
      );

      var timeSpeedB = new Nodes.OperatorNode(
        time,
        new Nodes.Vector2Node(0.15, 0.4),
        Nodes.OperatorNode.MUL
      );

      var uvOffsetA = new Nodes.OperatorNode(
        timeSpeedA,
        uv,
        Nodes.OperatorNode.ADD
      );

      var uvOffsetB = new Nodes.OperatorNode(
        timeSpeedB,
        uv,
        Nodes.OperatorNode.ADD
      );

      var cloudA = new Nodes.TextureNode(getTexture("cloud"), uvOffsetA);
      var cloudB = new Nodes.TextureNode(getTexture("cloud"), uvOffsetB);

      var clouds = new Nodes.OperatorNode(
        cloudA,
        cloudB,
        Nodes.OperatorNode.ADD
      );

      mtl.environment = new Nodes.ColorNode(0xffffff);
      mtl.alpha = clouds;

      // GUI

      addGui(
        "color",
        mtl.environment.value.getHex(),
        function (val) {
          mtl.environment.value.setHex(val);
        },
        true
      );

      break;

    case "camera-depth":
      // MATERIAL

      var colorA = new Nodes.ColorNode(0xffffff);
      var colorB = new Nodes.ColorNode(0x0054df);

      var depth = new Nodes.CameraNode(Nodes.CameraNode.DEPTH);
      depth.near.value = 1;
      depth.far.value = 200;

      var colors = new Nodes.MathNode(
        colorB,
        colorA,
        depth,
        Nodes.MathNode.MIX
      );

      mtl = new Nodes.PhongNodeMaterial();
      mtl.color = colors;

      // GUI

      addGui(
        "near",
        depth.near.value,
        function (val) {
          depth.near.value = val;
        },
        false,
        1,
        1200
      );

      addGui(
        "far",
        depth.far.value,
        function (val) {
          depth.far.value = val;
        },
        false,
        1,
        1200
      );

      addGui(
        "nearColor",
        colorA.value.getHex(),
        function (val) {
          colorA.value.setHex(val);
        },
        true
      );

      addGui(
        "farColor",
        colorB.value.getHex(),
        function (val) {
          colorB.value.setHex(val);
        },
        true
      );

      break;

    case "caustic":
      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      var hash2 = new Nodes.FunctionNode(
        [
          "vec2 hash2(vec2 p) {",
          "	return fract(sin(vec2(dot(p, vec2(123.4, 748.6)), dot(p, vec2(547.3, 659.3))))*5232.85324);",
          "}",
        ].join("\n")
      );

      // Based off of iq's described here: https://www.iquilezles.org/www/articles/voronoilines/voronoilines.htm
      var voronoi = new Nodes.FunctionNode(
        [
          "float voronoi(vec2 p, in float time) {",
          "	vec2 n = floor(p);",
          "	vec2 f = fract(p);",
          "	float md = 5.0;",
          "	vec2 m = vec2(0.0);",
          "	for (int i = -1; i <= 1; i++) {",
          "		for (int j = -1; j <= 1; j++) {",
          "			vec2 g = vec2(i, j);",
          "			vec2 o = hash2(n + g);",
          "			o = 0.5 + 0.5 * sin(time + 5.038 * o);",
          "			vec2 r = g + o - f;",
          "			float d = dot(r, r);",
          "			if (d < md) {",
          "				md = d;",
          "				m = n+g+o;",
          "			}",
          "		}",
          "	}",
          "	return md;",
          "}",
        ].join("\n"),
        [hash2]
      ); // define hash2 as dependencies

      var voronoiLayers = new Nodes.FunctionNode(
        [
          // based on https://www.shadertoy.com/view/4tXSDf
          "float voronoiLayers(vec2 p, in float time) {",
          "	float v = 0.0;",
          "	float a = 0.4;",
          "	for (int i = 0; i < 3; i++) {",
          "		v += voronoi(p, time) * a;",
          "		p *= 2.0;",
          "		a *= 0.5;",
          "	}",
          "	return v;",
          "}",
        ].join("\n"),
        [voronoi]
      ); // define voronoi as dependencies

      var time = new Nodes.TimerNode();
      var timeScale = new Nodes.FloatNode(2);

      // used for serialization only
      time.name = "time";
      timeScale.name = "speed";

      var alpha = new Nodes.FloatNode(1);
      var scale = new Nodes.FloatNode(0.1);
      var intensity = new Nodes.FloatNode(1.5);

      var color = new Nodes.ColorNode(0xffffff);
      var colorA = new Nodes.ColorNode(0xffffff);
      var colorB = new Nodes.ColorNode(0x0054df);

      var worldPos = new Nodes.PositionNode(Nodes.PositionNode.WORLD);
      var worldPosTop = new Nodes.SwitchNode(worldPos, "xz");

      var worldNormal = new Nodes.NormalNode(Nodes.NormalNode.WORLD);

      var mask = new Nodes.SwitchNode(worldNormal, "y");

      // clamp0at1
      mask = new Nodes.MathNode(mask, Nodes.MathNode.SATURATE);

      var timeOffset = new Nodes.OperatorNode(
        time,
        timeScale,
        Nodes.OperatorNode.MUL
      );

      var uvPos = new Nodes.OperatorNode(
        worldPosTop,
        scale,
        Nodes.OperatorNode.MUL
      );

      var voronoi = new Nodes.FunctionCallNode(voronoiLayers);
      voronoi.inputs.p = uvPos;
      voronoi.inputs.time = timeOffset;

      var maskCaustic = new Nodes.OperatorNode(
        alpha,
        mask,
        Nodes.OperatorNode.MUL
      );

      var voronoiIntensity = new Nodes.OperatorNode(
        voronoi,
        intensity,
        Nodes.OperatorNode.MUL
      );

      var voronoiColors = new Nodes.MathNode(
        colorB,
        colorA,
        new Nodes.MathNode(voronoiIntensity, Nodes.MathNode.SATURATE), // mix needs clamp
        Nodes.MathNode.MIX
      );

      var caustic = new Nodes.MathNode(
        color,
        voronoiColors,
        maskCaustic,
        Nodes.MathNode.MIX
      );

      var causticLights = new Nodes.OperatorNode(
        voronoiIntensity,
        maskCaustic,
        Nodes.OperatorNode.MUL
      );

      mtl.color = caustic;
      mtl.ambient = causticLights;

      // GUI

      addGui(
        "timeScale",
        timeScale.value,
        function (val) {
          timeScale.value = val;
        },
        false,
        0,
        5
      );

      addGui(
        "intensity",
        intensity.value,
        function (val) {
          intensity.value = val;
        },
        false,
        0,
        3
      );

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "alpha",
        alpha.value,
        function (val) {
          alpha.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "color",
        color.value.getHex(),
        function (val) {
          color.value.setHex(val);
        },
        true
      );

      addGui(
        "colorA",
        colorA.value.getHex(),
        function (val) {
          colorA.value.setHex(val);
        },
        true
      );

      addGui(
        "colorB",
        colorB.value.getHex(),
        function (val) {
          colorB.value.setHex(val);
        },
        true
      );

      break;

    case "soft-body":
      // MATERIAL

      move = true;

      mtl = new Nodes.StandardNodeMaterial();

      var scale = new Nodes.FloatNode(2);
      var colorA = new Nodes.ColorNode(0xff6633);
      var colorB = new Nodes.ColorNode(0x3366ff);

      var pos = new Nodes.PositionNode();
      var posNorm = new Nodes.MathNode(pos, Nodes.MathNode.NORMALIZE);

      var mask = new Nodes.SwitchNode(posNorm, "y");

      var velocity = new Nodes.VelocityNode(mesh, {
        type: "elastic",
        spring: 0.95,
        damping: 0.95,
      });

      var velocityArea = new Nodes.OperatorNode(
        mask,
        scale,
        Nodes.OperatorNode.MUL
      );

      var softVelocity = new Nodes.OperatorNode(
        velocity,
        velocityArea,
        Nodes.OperatorNode.MUL
      );

      var softPosition = new Nodes.OperatorNode(
        new Nodes.PositionNode(),
        softVelocity,
        Nodes.OperatorNode.ADD
      );

      var colors = new Nodes.MathNode(colorB, colorA, mask, Nodes.MathNode.MIX);

      mtl.color = colors;
      mtl.position = softPosition;

      // GUI

      addGui(
        "spring",
        velocity.params.spring,
        function (val) {
          velocity.params.spring = val;
        },
        false,
        0,
        0.95
      );

      addGui(
        "damping",
        velocity.params.damping,
        function (val) {
          velocity.params.damping = val;
        },
        false,
        0,
        0.95
      );

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        0,
        3
      );

      addGui(
        "softBody",
        colorA.value.getHex(),
        function (val) {
          colorA.value.setHex(val);
        },
        true
      );

      addGui(
        "rigidBody",
        colorB.value.getHex(),
        function (val) {
          colorB.value.setHex(val);
        },
        true
      );

      break;

    case "plush":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var color = new Nodes.ColorNode(0x8d8677);
      var mildness = new Nodes.FloatNode(1.6);
      var fur = new Nodes.FloatNode(0.5);

      var posDirection = new Nodes.MathNode(
        new Nodes.PositionNode(Nodes.PositionNode.VIEW),
        Nodes.MathNode.NORMALIZE
      );
      var norDirection = new Nodes.MathNode(
        new Nodes.NormalNode(),
        Nodes.MathNode.NORMALIZE
      );

      var viewZ = new Nodes.MathNode(
        posDirection,
        norDirection,
        Nodes.MathNode.DOT
      );

      // without luma correction for now
      var mildnessColor = new Nodes.OperatorNode(
        color,
        mildness,
        Nodes.OperatorNode.MUL
      );

      var furScale = new Nodes.OperatorNode(viewZ, fur, Nodes.OperatorNode.MUL);

      mtl.color = color;
      mtl.normal = new Nodes.NormalMapNode(
        new Nodes.TextureNode(getTexture("grassNormal"))
      );
      mtl.normal.scale = furScale;
      mtl.environment = mildnessColor;
      mtl.environmentAlpha = new Nodes.MathNode(viewZ, Nodes.MathNode.INVERT);
      mtl.shininess = new Nodes.FloatNode(0);

      // GUI

      addGui(
        "color",
        color.value.getHex(),
        function (val) {
          color.value.setHex(val);
        },
        true
      );

      addGui(
        "mildness",
        mildness.value,
        function (val) {
          mildness.value = val;
        },
        false,
        1,
        2
      );

      addGui(
        "fur",
        fur.value,
        function (val) {
          fur.value = val;
        },
        false,
        0,
        2
      );

      break;

    case "skin":
    case "skin-phong":
      // MATERIAL

      mtl =
        name == "skin"
          ? new Nodes.StandardNodeMaterial()
          : new Nodes.PhongNodeMaterial();

      var skinColor = new Nodes.ColorNode(0xffc495);
      var bloodColor = new Nodes.ColorNode(0x6b0602);
      var wrapLight = new Nodes.FloatNode(1.5);
      var wrapShadow = new Nodes.FloatNode(0);

      var directLight = new Nodes.LightNode();

      var lightLuminance = new Nodes.LuminanceNode(directLight);

      var lightWrap = new Nodes.MathNode(
        wrapShadow,
        wrapLight,
        lightLuminance,
        Nodes.MathNode.SMOOTHSTEP
      );

      var lightTransition = new Nodes.OperatorNode(
        lightWrap,
        new Nodes.ConstNode(Nodes.ConstNode.PI2),
        Nodes.OperatorNode.MUL
      );

      var wrappedLight = new Nodes.MathNode(
        lightTransition,
        Nodes.MathNode.SIN
      );

      var wrappedLightColor = new Nodes.OperatorNode(
        wrappedLight,
        bloodColor,
        Nodes.OperatorNode.MUL
      );

      var bloodArea = new Nodes.MathNode(
        wrappedLightColor,
        Nodes.MathNode.SATURATE
      );

      var totalLight = new Nodes.OperatorNode(
        directLight,
        bloodArea,
        Nodes.OperatorNode.ADD
      );

      mtl.color = skinColor;
      mtl.light = totalLight;

      if (name == "skin") {
        // StandardNodeMaterial

        mtl.metalness = new Nodes.FloatNode(0);
        mtl.roughness = new Nodes.FloatNode(1);
        mtl.reflectivity = new Nodes.FloatNode(0);
        mtl.clearcoat = new Nodes.FloatNode(0.2);
        mtl.clearcoatRoughness = new Nodes.FloatNode(0.3);
        mtl.environment = new Nodes.CubeTextureNode(cubemap);
      } else {
        // PhongNodeMaterial

        mtl.specular = new Nodes.ColorNode(0x2f2e2d);
        mtl.shininess = new Nodes.FloatNode(15);
      }

      // GUI

      addGui(
        "skinColor",
        skinColor.value.getHex(),
        function (val) {
          skinColor.value.setHex(val);
        },
        true
      );

      addGui(
        "bloodColor",
        bloodColor.value.getHex(),
        function (val) {
          bloodColor.value.setHex(val);
        },
        true
      );

      addGui(
        "wrapLight",
        wrapLight.value,
        function (val) {
          wrapLight.value = val;
        },
        false,
        0,
        3
      );

      addGui(
        "wrapShadow",
        wrapShadow.value,
        function (val) {
          wrapShadow.value = val;
        },
        false,
        -1,
        0
      );

      break;

    case "toon":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var count = new Nodes.FloatNode(3.43);
      var sceneDirectLight = new Nodes.LightNode();
      var color = new Nodes.ColorNode(0xaabbff);

      var lineColor = new Nodes.ColorNode(0xff0000);
      var lineSize = new Nodes.FloatNode(0.23);
      var lineInner = new Nodes.FloatNode(0);

      // CEL

      var lightLuminance = new Nodes.LuminanceNode(sceneDirectLight);

      var preCelLight = new Nodes.OperatorNode(
        lightLuminance,
        count,
        Nodes.OperatorNode.MUL
      );

      var celLight = new Nodes.MathNode(preCelLight, Nodes.MathNode.CEIL);

      var posCelLight = new Nodes.OperatorNode(
        celLight,
        count,
        Nodes.OperatorNode.DIV
      );

      // LINE

      var posDirection = new Nodes.MathNode(
        new Nodes.PositionNode(Nodes.PositionNode.VIEW),
        Nodes.MathNode.NORMALIZE
      );
      var norDirection = new Nodes.MathNode(
        new Nodes.NormalNode(),
        Nodes.MathNode.NORMALIZE
      );

      var viewZ = new Nodes.MathNode(
        posDirection,
        norDirection,
        Nodes.MathNode.DOT
      );

      var lineOutside = new Nodes.MathNode(viewZ, Nodes.MathNode.ABS);

      var line = new Nodes.OperatorNode(
        lineOutside,
        new Nodes.FloatNode(1),
        Nodes.OperatorNode.DIV
      );

      var lineScaled = new Nodes.MathNode(
        line,
        lineSize,
        lineInner,
        Nodes.MathNode.SMOOTHSTEP
      );

      var innerContour = new Nodes.MathNode(
        new Nodes.MathNode(lineScaled, Nodes.MathNode.SATURATE),
        Nodes.MathNode.INVERT
      );

      // APPLY

      mtl.color = color;
      mtl.light = posCelLight;
      mtl.shininess = new Nodes.FloatNode(0);

      mtl.environment = lineColor;
      mtl.environmentAlpha = innerContour;

      // GUI

      addGui(
        "color",
        color.value.getHex(),
        function (val) {
          color.value.setHex(val);
        },
        true
      );

      addGui(
        "lineColor",
        lineColor.value.getHex(),
        function (val) {
          lineColor.value.setHex(val);
        },
        true
      );

      addGui(
        "count",
        count.value,
        function (val) {
          count.value = val;
        },
        false,
        1,
        8
      );

      addGui(
        "lineSize",
        lineSize.value,
        function (val) {
          lineSize.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "lineInner",
        lineInner.value,
        function (val) {
          lineInner.value = val;
        },
        false,
        0,
        1
      );

      addGui("ignoreIndirectLight", false, function (val) {
        mtl.ao = val ? new Nodes.FloatNode() : undefined;

        mtl.dispose();
      });

      break;

    case "custom-attribute":
      // GEOMETRY

      // add "position" buffer to "custom" attribute
      teapot.attributes["custom"] = teapot.attributes["position"];

      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      mtl.color = new Nodes.AttributeNode("custom", 3);

      // or

      //mtl.color = new Nodes.AttributeNode( "custom", "vec3" );

      break;

    case "expression":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var speed = new Nodes.FloatNode(0.5);

      var myspeed = new Nodes.ExpressionNode("speed * time", "float");
      myspeed.keywords["speed"] = speed;

      mtl.color = new Nodes.ExpressionNode(
        "myCustomUv + (sin(myspeed)*.5) + (position * .05)",
        "vec3"
      );
      mtl.color.keywords["myspeed"] = myspeed;

      mtl.position = new Nodes.ExpressionNode(
        "mod(myspeed,1.0) < 0.5 ? position + (worldNormal*(1.0+sin(myspeed*1.0))*3.0) : position + sin( position.x * sin(myspeed*2.0))",
        "vec3"
      );
      mtl.position.keywords["myspeed"] = myspeed;

      // add global keyword ( variable or const )
      Nodes.NodeLib.addKeyword("myCustomUv", function () {
        return new Nodes.ReflectNode();
      });

      // GUI

      addGui(
        "speed",
        speed.value,
        function (val) {
          speed.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "reserved-keywords":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var keywordsexample = new Nodes.FunctionNode(
        [
          // use "uv" reserved keyword
          "vec4 keywordsexample( sampler2D tex ) {",
          "	return texture2D( tex, myUV ) + vec4( position * myAlpha, 0.0 );",
          "}",
        ].join("\n")
      );

      // add local keyword ( const only )
      keywordsexample.keywords["myAlpha"] = new Nodes.ConstNode(
        "float myAlpha .05"
      );

      // add global keyword ( const only )
      Nodes.NodeLib.addKeyword("myUV", function () {
        return new Nodes.UVNode();
      });

      // add global const or function
      //Nodes.NodeLib.add( new Nodes.ConstNode("float MY_CONST .05") )

      // reserved keywords

      // console.log( Nodes.NodeLib.keywords );

      // keywords conflit? use this to disable:
      //blurtexture.useKeywords = false; // ( true is default )

      mtl.color = new Nodes.FunctionCallNode(keywordsexample, [
        new Nodes.TextureNode(getTexture("brick")),
      ]);

      break;

    case "bias":
      // MATERIAL

      var bias = new Nodes.FloatNode(0.5);
      var maxMIPLevel = new Nodes.MaxMIPLevelNode(
        new Nodes.TextureNode(cubemap)
      );
      var mipsBias = new Nodes.OperatorNode(
        bias,
        maxMIPLevel,
        Nodes.OperatorNode.MUL
      );

      mtl = new Nodes.PhongNodeMaterial();
      mtl.color.value.setHex(0xffffff);

      function biasMode(val) {
        switch (val) {
          case "prem":
            mtl.color = new Nodes.TextureCubeNode(
              new Nodes.TextureNode(premTexture),
              undefined,
              bias
            );

            break;

          case "lod":
            var textureCubeFunction = new Nodes.FunctionNode(
              "vec4 textureCubeLodEXT( samplerCube texture, vec3 uv, float bias );",
              undefined,
              { shaderTextureLOD: true }
            );

            mtl.color = new Nodes.FunctionCallNode(textureCubeFunction, [
              new Nodes.CubeTextureNode(cubemap),
              new Nodes.ReflectNode(),
              mipsBias,
            ]);

            break;

          case "basic":
            var textureCubeFunction = new Nodes.FunctionNode(
              "vec4 textureCube( samplerCube texture, vec3 uv, float bias );"
            );

            mtl.color = new Nodes.FunctionCallNode(textureCubeFunction, [
              new Nodes.CubeTextureNode(cubemap),
              new Nodes.ReflectNode(),
              mipsBias,
            ]);

            break;
        }

        mtl.needsUpdate = true;
      }

      biasMode("prem");

      // GUI

      addGui(
        "scope",
        {
          PREM: "prem",
          LOD: "lod",
          BASIC: "basic",
        },
        biasMode
      );

      addGui(
        "bias",
        bias.value,
        function (val) {
          bias.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "node-position":
      // MATERIAL

      var node = new Nodes.PositionNode();

      mtl = new Nodes.PhongNodeMaterial();
      mtl.color = node;

      // GUI

      addGui(
        "scope",
        {
          local: Nodes.PositionNode.LOCAL,
          world: Nodes.PositionNode.WORLD,
          view: Nodes.PositionNode.VIEW,
        },
        function (val) {
          node.scope = val;

          mtl.needsUpdate = true;
        }
      );

      break;

    case "node-normal":
      // MATERIAL

      var node = new Nodes.NormalNode();

      mtl = new Nodes.PhongNodeMaterial();
      mtl.color = node;

      // GUI

      addGui(
        "scope",
        {
          view: Nodes.NormalNode.VIEW,
          local: Nodes.NormalNode.LOCAL,
          world: Nodes.NormalNode.WORLD,
        },
        function (val) {
          node.scope = val;

          mtl.needsUpdate = true;
        }
      );

      break;

    case "node-reflect":
      // MATERIAL

      var node = new Nodes.ReflectNode();

      var nodeMaterial = new Nodes.StandardNodeMaterial();
      nodeMaterial.environment = new Nodes.CubeTextureNode(cubemap, node);
      nodeMaterial.roughness.value = 0.5;
      nodeMaterial.metalness.value = 1;

      var standardMaterial = new MeshStandardMaterial({
        color: nodeMaterial.color.value,
        side: defaultSide,
        envMap: cubemap,
        roughness: nodeMaterial.roughness.value,
        metalness: 1,
      });

      mtl = nodeMaterial;

      // GUI

      addGui("node", true, function (val) {
        mtl = val ? nodeMaterial : standardMaterial;
        mesh.material = mtl;
      });

      addGui(
        "roughness",
        nodeMaterial.roughness.value,
        function (val) {
          nodeMaterial.roughness.value = val;
          standardMaterial.roughness = val;
        },
        false,
        0,
        1
      );

      break;

    case "varying":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var varying = new Nodes.VarNode("vec3");
      varying.value = new Nodes.NormalNode(Nodes.NormalNode.VIEW);

      // using BypassNode the NormalNode not apply the value in .position slot
      // but set the NormalNode value in VarNode
      // it can be useful to send values between vertex to fragment shader
      // without affect vertex shader
      mtl.position = new Nodes.BypassNode(varying);
      mtl.color = varying;

      // you can also set a independent value in .position slot using BypassNode
      // such this expression using ExpressionNode
      mtl.position.value = new Nodes.ExpressionNode(
        "position * ( .1 + abs( sin( time ) ) )",
        "vec3"
      );

      break;

    case "void-function":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var varying = new Nodes.VarNode("vec3");

      // VERTEX

      var setMyVar = new Nodes.FunctionNode(
        [
          "void setMyVar( vec3 pos ) {",
          // set "myVar" in vertex shader in this example,
          // can be used in fragment shader too or in rest of the current shader
          "	myVar = pos;",

          "}",
        ].join("\n")
      );

      // add keyword
      setMyVar.keywords["myVar"] = varying;

      var position = new Nodes.ExpressionNode(
        "setMyVar( position * .1 )",
        "vec3"
      );
      position.includes = [setMyVar];
      position.keywords["tex"] = new Nodes.TextureNode(getTexture("brick"));

      // use BypassNode to "void" functions
      mtl.position = new Nodes.BypassNode(position);

      // FRAGMENT

      var clipFromPos = new Nodes.FunctionNode(
        [
          "void clipFromPos( vec3 pos ) {",

          "	if ( pos.y < .0 ) discard;",

          "}",
        ].join("\n")
      );

      var clipFromPosCall = new Nodes.FunctionCallNode(clipFromPos, {
        pos: varying,
      });

      mtl.color = new Nodes.BypassNode(clipFromPosCall, varying);

      break;

    case "basic-material":
      // MATERIAL

      mtl = new Nodes.BasicNodeMaterial();

      var positionNode = new Nodes.PositionNode();

      var a = new Nodes.OperatorNode(
        new Nodes.SwitchNode(positionNode, "x"),
        new Nodes.SwitchNode(positionNode, "y"),
        Nodes.OperatorNode.ADD
      );
      var b = new Nodes.FloatNode(0);
      var ifNode = new Nodes.FloatNode(1);
      var elseNode = new Nodes.FloatNode(0);

      mtl.mask = new Nodes.CondNode(
        a,
        b,
        Nodes.CondNode.GREATER,
        ifNode,
        elseNode
      );

      var sin = new Nodes.MathNode(new Nodes.TimerNode(), Nodes.MathNode.SIN);

      mtl.position = new Nodes.OperatorNode(
        positionNode,
        sin,
        Nodes.OperatorNode.ADD
      );

      mtl.color = new Nodes.ColorNode("green");

      break;

    case "conditional":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var a = new Nodes.FloatNode(0),
        b = new Nodes.FloatNode(0),
        ifNode = new Nodes.ColorNode(0x0000ff),
        elseNode = new Nodes.ColorNode(0xff0000);

      var cond = new Nodes.CondNode(
        a,
        b,
        Nodes.CondNode.EQUAL,
        ifNode,
        elseNode
      );

      mtl.color = cond;

      // GUI

      addGui(
        "a",
        a.value,
        function (val) {
          a.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "b",
        b.value,
        function (val) {
          b.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "a condition b",
        {
          EQUAL: Nodes.CondNode.EQUAL,
          NOT_EQUAL: Nodes.CondNode.NOT_EQUAL,
          GREATER: Nodes.CondNode.GREATER,
          GREATER_EQUAL: Nodes.CondNode.GREATER_EQUAL,
          LESS: Nodes.CondNode.LESS,
          LESS_EQUAL: Nodes.CondNode.LESS_EQUAL,
        },
        function (val) {
          cond.op = val;

          mtl.needsUpdate = true;
        }
      );

      addGui(
        "if color",
        ifNode.value.getHex(),
        function (val) {
          ifNode.value.setHex(val);
        },
        true
      );

      addGui(
        "else color",
        elseNode.value.getHex(),
        function (val) {
          elseNode.value.setHex(val);
        },
        true
      );

      break;

    case "rtt":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var uvTransform = new Nodes.UVTransformNode(),
        checker = new Nodes.CheckerNode(uvTransform);

      uvTransform.setUvTransform(0, 0, 2, 2, 0);

      var rtt = new Nodes.RTTNode(512, 512, checker),
        bumpMap = new Nodes.BumpMapNode(rtt);

      bumpMap.scale.value = 0.1;

      mtl.color = checker;
      mtl.normal = bumpMap;

      // GUI

      addGui(
        "bump",
        bumpMap.scale.value,
        function (val) {
          bumpMap.scale.value = val;
        },
        false,
        -0.5,
        0.5
      );

      addGui(
        "scale",
        2,
        function (val) {
          uvTransform.setUvTransform(0, 0, val, val, 0);
        },
        false,
        0,
        8
      );

      addGui("ignoreColor", false, function (val) {
        mtl.color = val ? new Nodes.ColorNode(0xffffff) : checker;

        mtl.needsUpdate = true;
      });

      break;

    case "temporal-blur":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var texture = new Nodes.TextureNode(getTexture("brick"));

      var rttStore = new Nodes.RTTNode(512, 512, texture);
      var blur = new Nodes.BlurNode(rttStore);

      var timer = new Nodes.TimerNode(0.01, Nodes.TimerNode.LOCAL);

      var color = new Nodes.MathNode(
        rttStore,
        blur,
        new Nodes.FloatNode(0.6),
        Nodes.MathNode.MIX
      );

      blur.horizontal = blur.vertical = timer;

      var rttSave = new Nodes.RTTNode(512, 512, color);
      rttSave.saveTo = rttStore;

      mtl.color = rttSave;

      // GUI

      addGui("click to reset", false, function () {
        // render a single time

        rttStore.render = true;

        // reset time blur

        timer.value = 0;
      });

      break;

    case "readonly":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      // not use "uniform" input ( for optimization )
      // instead use explicit declaration, for example:
      // vec3( 1.0, 1.0, 1.0 ) instead "uniform vec3"
      // if readonly is true not allow change the value after build the shader material

      mtl.color = new Nodes.ColorNode(0xffffff).setReadonly(true);
      mtl.specular = new Nodes.FloatNode(0.5).setReadonly(true);
      mtl.shininess = new Nodes.FloatNode(15).setReadonly(true);

      break;

    case "label":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      // label can be useful for finding the nodes as variables in debug level
      // but this always force the creation of a variable
      // same as the code can be writed in the same line (inline)
      // for optimization this is not recommended

      var colorInput = new Nodes.ColorNode(0xffffff).setLabel("colorInput");
      var specularInput = new Nodes.FloatNode(0.5).setLabel("specularInput");

      var colorMix = new Nodes.OperatorNode(
        colorInput,
        new Nodes.ColorNode(0x6495ed).setReadonly(true),
        Nodes.OperatorNode.MUL
      ).setLabel("colorMix");

      mtl.color = colorMix;
      mtl.specular = specularInput;

      // default: without use label
      // this is optimized writed the code in a single line (inline)
      // for the reason that this node is used only once in this shader program
      mtl.shininess = new Nodes.OperatorNode(
        new Nodes.FloatNode(10).setReadonly(true),
        new Nodes.FloatNode(5).setReadonly(true),
        Nodes.OperatorNode.ADD
      );

      mtl.build();

      // show names glsl fragment shader
      // open console e find using CTRL+F "colorMix" for example

      // console.log( mtl.fragmentShader );

      break;

    case "triangle-blur":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var delta = new Nodes.Vector2Node(0.5, 0.25);
      var alpha = new Nodes.FloatNode(1);

      var blurtexture = new Nodes.FunctionNode(
        [
          // Reference: TriangleBlurShader.js
          "vec4 blurtexture(sampler2D map, vec2 uv, vec2 delta) {",
          "	vec4 color = vec4( 0.0 );",
          "	float total = 0.0;",
          // randomize the lookup values to hide the fixed number of samples
          "	float offset = rand( uv );",
          "	for ( float t = -BLUR_ITERATIONS; t <= BLUR_ITERATIONS; t ++ ) {",
          "		float percent = ( t + offset - 0.5 ) / BLUR_ITERATIONS;",
          "		float weight = 1.0 - abs( percent );",
          "		color += texture2D( map, uv + delta * percent ) * weight;",
          "		total += weight;",
          "	}",
          "	return color / total;",
          "}",
        ].join("\n"),
        [new Nodes.ConstNode("float BLUR_ITERATIONS 10.0")]
      );

      var blurredTexture = new Nodes.FunctionCallNode(blurtexture, {
        map: new Nodes.TextureNode(getTexture("brick")),
        delta: delta,
        uv: new Nodes.UVNode(),
      });

      var color = new Nodes.MathNode(
        new Nodes.TextureNode(getTexture("brick")),
        blurredTexture,
        alpha,
        Nodes.MathNode.MIX
      );

      mtl.color = color;

      // GUI

      addGui(
        "alpha",
        alpha.value,
        function (val) {
          alpha.value = val;
        },
        false,
        0,
        1
      );

      addGui(
        "deltaX",
        delta.x,
        function (val) {
          delta.x = val;
        },
        false,
        0,
        1
      );

      addGui(
        "deltaY",
        delta.x,
        function (val) {
          delta.y = val;
        },
        false,
        0,
        1
      );

      break;

    case "triplanar-mapping":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var scale = new Nodes.FloatNode(0.02);

      var triplanarMapping = new Nodes.FunctionNode(
        [
          // Reference: https://github.com/keijiro/StandardTriplanar
          "vec4 triplanar_mapping( sampler2D map, vec3 normal, vec3 position, float scale ) {",

          // Blending factor of triplanar mapping
          "	vec3 bf = normalize( abs( normal ) );",
          "	bf /= dot( bf, vec3( 1.0 ) );",

          // Triplanar mapping
          "	vec2 tx = position.yz * scale;",
          "	vec2 ty = position.zx * scale;",
          "	vec2 tz = position.xy * scale;",

          // Base color
          "	vec4 cx = texture2D(map, tx) * bf.x;",
          "	vec4 cy = texture2D(map, ty) * bf.y;",
          "	vec4 cz = texture2D(map, tz) * bf.z;",

          "	return cx + cy + cz;",

          "}",
        ].join("\n")
      );

      var triplanarMappingTexture = new Nodes.FunctionCallNode(
        triplanarMapping,
        {
          map: new Nodes.TextureNode(getTexture("brick")),
          normal: new Nodes.NormalNode(Nodes.NormalNode.WORLD),
          position: new Nodes.PositionNode(Nodes.PositionNode.WORLD),
          scale: scale,
        }
      );

      mtl.color = triplanarMappingTexture;

      // GUI

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        0.001,
        0.1
      );

      break;

    case "firefly":
      // MATERIAL

      mtl = new Nodes.PhongNodeMaterial();

      var time = new Nodes.TimerNode();
      var speed = new Nodes.FloatNode(0.5);

      var color = new Nodes.ColorNode(0x98ff00);

      var timeSpeed = new Nodes.OperatorNode(
        time,
        speed,
        Nodes.OperatorNode.MUL
      );

      var sinCycleInSecs = new Nodes.OperatorNode(
        timeSpeed,
        new Nodes.ConstNode(Nodes.ConstNode.PI2),
        Nodes.OperatorNode.MUL
      );

      var cycle = new Nodes.MathNode(sinCycleInSecs, Nodes.MathNode.SIN);

      var cycleColor = new Nodes.OperatorNode(
        cycle,
        color,
        Nodes.OperatorNode.MUL
      );

      var cos = new Nodes.MathNode(cycleColor, Nodes.MathNode.SIN);

      mtl.color = new Nodes.ColorNode(0);
      mtl.emissive = cos;

      // GUI

      addGui(
        "speed",
        speed.value,
        function (val) {
          speed.value = val;
        },
        false,
        0,
        3
      );

      break;

    case "sss":
    case "translucent":
      // DISTANCE FORMULA

      var modelPos = new Nodes.Vector3Node();

      var viewPos = new Nodes.PositionNode(Nodes.PositionNode.VIEW);
      var cameraPosition = new Nodes.CameraNode(Nodes.CameraNode.POSITION);

      var cameraDistance = new Nodes.MathNode(
        modelPos,
        cameraPosition,
        Nodes.MathNode.DISTANCE
      );

      var viewPosZ = new Nodes.SwitchNode(viewPos, "z");

      var distance = new Nodes.OperatorNode(
        cameraDistance,
        viewPosZ,
        Nodes.OperatorNode.SUB
      );

      var distanceRadius = new Nodes.OperatorNode(
        distance,
        new Nodes.FloatNode(70),
        Nodes.OperatorNode.ADD
      );

      var objectDepth = new Nodes.MathNode(
        distanceRadius,
        new Nodes.FloatNode(0),
        new Nodes.FloatNode(50),
        Nodes.MathNode.SMOOTHSTEP
      );

      // RTT ( get back distance )

      rtTexture = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: LinearFilter,
        magFilter: NearestFilter,
        format: RGBFormat,
      });

      library[rtTexture.texture.uuid] = rtTexture.texture;

      var distanceMtl = new Nodes.PhongNodeMaterial();
      distanceMtl.environment = objectDepth;
      distanceMtl.side = BackSide;

      rtMaterial = distanceMtl;

      // MATERIAL

      mtl = new Nodes.StandardNodeMaterial();

      var backSideDepth = new Nodes.TextureNode(
        rtTexture.texture,
        new Nodes.ScreenUVNode()
      );

      var difference = new Nodes.OperatorNode(
        objectDepth,
        backSideDepth,
        Nodes.OperatorNode.SUB
      );

      var sss = new Nodes.MathNode(
        new Nodes.FloatNode(-0.1),
        new Nodes.FloatNode(0.5),
        difference,
        Nodes.MathNode.SMOOTHSTEP
      );

      var sssAlpha = new Nodes.MathNode(sss, Nodes.MathNode.SATURATE);

      var frontColor, backColor;

      if (name == "sss") {
        var sssOut = new Nodes.MathNode(
          objectDepth,
          sssAlpha,
          Nodes.MathNode.MIN
        );

        frontColor = new Nodes.ColorNode(0xd4cfbb);
        backColor = new Nodes.ColorNode(0xd04327);

        var color = new Nodes.MathNode(
          backColor,
          frontColor,
          sssOut,
          Nodes.MathNode.MIX
        );

        var light = new Nodes.OperatorNode(
          new Nodes.LightNode(),
          color,
          Nodes.OperatorNode.ADD
        );

        mtl.color = frontColor;
        mtl.roughness = new Nodes.FloatNode(0.1);
        mtl.metalness = new Nodes.FloatNode(0.5);

        mtl.light = light;
        mtl.environment = color;
      } else {
        frontColor = new Nodes.ColorNode(0xd04327);
        backColor = new Nodes.ColorNode(0x1a0e14);

        var color = new Nodes.MathNode(
          frontColor,
          backColor,
          sssAlpha,
          Nodes.MathNode.MIX
        );

        var light = new Nodes.OperatorNode(
          new Nodes.LightNode(),
          color,
          Nodes.OperatorNode.ADD
        );

        mtl.color = new Nodes.ColorNode(0xffffff);
        mtl.roughness = new Nodes.FloatNode(0.1);
        mtl.metalness = new Nodes.FloatNode(0.5);

        mtl.light = light;
        mtl.environment = color;
      }

      // GUI

      addGui(
        "frontColor",
        frontColor.value.getHex(),
        function (val) {
          frontColor.value.setHex(val);
        },
        true
      );

      addGui(
        "backColor",
        backColor.value.getHex(),
        function (val) {
          backColor.value.setHex(val);
        },
        true
      );

      addGui(
        "area",
        sss.b.value,
        function (val) {
          sss.b.value = val;
        },
        false,
        0,
        1
      );

      break;
  }

  // set material

  mtl.side = defaultSide;

  mesh.material = mtl;
}

function onWindowResize() {
  const width = window.innerWidth,
    height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  if (rtTexture) rtTexture.setSize(width, height);
}

document.getElementById("serialize").addEventListener("click", function () {
  if (serialized) reset();
  else serialize();

  serialized = !serialized;
});

function reset() {
  updateMaterial();

  // gui

  const div = document.getElementById("serialize");
  div.textContent = "Serialize and apply";
}

function serialize() {
  const json = mesh.material.toJSON();

  // replace uuid to url (facilitates the load of textures using url otherside uuid) e.g:

  const cloud = getTexture("cloud");

  NodeMaterialLoaderUtils.replaceUUID(json, cloud, "cloud");

  library["cloud"] = cloud;

  // --

  const jsonStr = JSON.stringify(json);

  // console.log( jsonStr );

  var loader = new NodeMaterialLoader(null, library),
    material = loader.parse(json);

  mesh.material.dispose();

  mesh.material = material;

  // gui

  const div = document.getElementById("serialize");
  div.textContent =
    "Click to reset - JSON Generate: " +
    (jsonStr.length / 1024).toFixed(3) +
    "kB";

  if (gui) gui.destroy();

  gui = null;
}

function animate() {
  const delta = clock.getDelta();

  if (move) {
    var time = Date.now() * 0.005;

    mesh.position.z = Math.cos(time) * 10;
    mesh.position.y = Math.sin(time) * 10;
  } else {
    mesh.position.z = mesh.position.y = 0;
  }

  //mesh.rotation.z += .01;

  // update material animation and/or gpu calcs (pre-renderer)

  frame.setRenderer(renderer).update(delta);

  if (mesh.material instanceof Nodes.NodeMaterial) {
    frame.updateNode(mesh.material);
  }

  // render to texture for sss/translucent material only

  if (rtTexture) {
    scene.overrideMaterial = rtMaterial;

    renderer.setRenderTarget(rtTexture);
    renderer.clear();
    renderer.render(scene, camera);

    scene.overrideMaterial = null;
  }

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}
