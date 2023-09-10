import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// A SmolRenderer for a SmolWorld. Most of it is generic.
// Very rudimentary.

const MATERIALS = [];
const BLOCK_RENDERERS = {};
function generateCube(x1, y1, z1, x2, y2, z2) {
  return [
    (v, x, y, z) => v.push(x + x1, y + y1, z + z1, x + x2, y + y1, z + z2, x + x1, y + y1, z + z2, x + x1, y + y1, z + z1, x + x2, y + y1, z + z1, x + x2, y + y1, z + z2),
    (v, x, y, z) => v.push(x + x1, y + y2, z + z1, x + x1, y + y2, z + z2, x + x2, y + y2, z + z2, x + x1, y + y2, z + z1, x + x2, y + y2, z + z2, x + x2, y + y2, z + z1),
    (v, x, y, z) => v.push(x + x1, y + y1, z + z1, x + x1, y + y2, z + z2, x + x1, y + y2, z + z1, x + x1, y + y1, z + z1, x + x1, y + y1, z + z2, x + x1, y + y2, z + z2),
    (v, x, y, z) => v.push(x + x2, y + y1, z + z1, x + x2, y + y2, z + z1, x + x2, y + y2, z + z2, x + x2, y + y1, z + z1, x + x2, y + y2, z + z2, x + x2, y + y1, z + z2),
    (v, x, y, z) => v.push(x + x1, y + y1, z + z1, x + x1, y + y2, z + z1, x + x2, y + y2, z + z1, x + x1, y + y1, z + z1, x + x2, y + y2, z + z1, x + x2, y + y1, z + z1),
    (v, x, y, z) => v.push(x + x1, y + y1, z + z2, x + x2, y + y2, z + z2, x + x1, y + y2, z + z2, x + x1, y + y1, z + z2, x + x2, y + y1, z + z2, x + x2, y + y2, z + z2)
  ];
}

const fullBlock = generateCube(0, 0, 0, 1, 1, 1);
function appliesCulling(id) {
  const renderer = BLOCK_RENDERERS[id];
  return renderer && renderer.opaque && renderer.geometry === fullBlock;
}

function baseRenderer(world, x, y, z) {
  const positions = [];
  const groups = [];

  for (let face = 0; face < 6; ++face) {
    const axis = face >>> 1;
    const offset = ((face & 1) << 1) - 1;
    const block = world.getBlock(x + offset * (axis === 1), y + offset * (axis === 0), z + offset * (axis === 2));
    if (appliesCulling(block)) continue;

    const start = positions.length / 3;
    const end = this.geometry[face](positions, x, y, z) / 3;
    groups.push({start: start, count: end - start, materialIndex: this.material(face)});
  }
  return [positions, groups];
};

function transparentRenderer(world, x, y, z) {
  const positions = [];
  const groups = [];
  const self = world.getBlock(x, y, z);
  
  for (let face = 0; face < 6; ++face) {
    const axis = face >>> 1;
    const offset = ((face & 1) << 1) - 1;
    const block = world.getBlock(x + offset * (axis === 1), y + offset * (axis === 0), z + offset * (axis === 2));
    if (block === self || appliesCulling(block)) continue;

    const start = positions.length / 3;
    const end = this.geometry[face](positions, x, y, z) / 3;
    groups.push({start: start, count: end - start, materialIndex: this.material(face)});
  }

  return [positions, groups];
}

export default class SmolRenderer {
  static SKYBOX_DAY = new THREE.Color(0xB0C9FF);
  static SKYBOX_NIGHT = new THREE.Color(0x030712);

  constructor(parent) {
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    
    this.scene = new THREE.Scene();
    this.scene.background = SmolRenderer.SKYBOX_DAY;

    this.camera = new THREE.PerspectiveCamera(15, w / h, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true });
    this.renderer.setSize(w, h);
    const domElement = this.renderer.domElement;
    domElement.style.userSelect="none";
    parent.appendChild(domElement);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.update();
    //this.controls.maxPolarAngle = Math.PI / 2;

    this.observer = new ResizeObserver(entries => this.onResize(entries));
    this.observer.observe(parent);

    const ambientLight = new THREE.AmbientLight(0x555555);
    const lightN = new THREE.DirectionalLight(0xCCCCCC);
    lightN.position.set(1, 2, 0.5);
    const lightS = new THREE.DirectionalLight(0xCCCCCC);
    lightS.position.set(-1, 2, -0.5);
		this.scene.add(lightN, lightS, ambientLight);
    
    this.axis = new THREE.AxesHelper(5);
    this.grid = new THREE.GridHelper(32, 32, 0xFF0000, 0x888888);
    this.scene.add(this.grid, this.axis);
    
    this.running = true;
    const renderLoop = () => {
      if (!this.running) return;
      window.requestAnimationFrame(renderLoop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
    renderLoop();
  }

  setGridHeight(height) {
    this.axis.position.set(0, height + 0.04, 0);
    this.grid.position.set(16, height + 0.04, 16);
  }

  registerFullBlock(id, color, opacity = 1) {
    const opaque = opacity > 0;
    const index = MATERIALS.push(new THREE.MeshStandardMaterial({color, transparent: !opaque, opacity})) - 1;
    this.registerBaseRenderer(id, fullBlock, () => index, opaque);
  }

  registerGlassyBlock(id, color, opacity) {
    const index = MATERIALS.push(new THREE.MeshStandardMaterial({color, transparent: true, opacity})) - 1;
    this.registerRenderer(id, {render: transparentRenderer, geometry: fullBlock, material: () => index, opaque: false});
  }
  
  registerBaseRenderer(id, geometry, material, opaque) {
    this.registerRenderer(id, {render: baseRenderer, geometry, material, opaque});
  }
  
  registerRenderer(id, renderer) {
    BLOCK_RENDERERS[id] = renderer;
  }
  
  render(world) {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
    }
    const geometry = new THREE.BufferGeometry();
    const positions = [], groups = [];
    
    for (let xz = 0; xz < 1024; ++xz) {
      const h = world.heightMap[xz];
      for (let y = 0; y <= h; ++y) {
        const ptr = xz + (y << 10);
        const id = world.blocks[ptr];
        if (!id) continue;
        const renderer = BLOCK_RENDERERS[id];
        if (!renderer) continue;
        const x = xz & 0x1F;
        const z = xz >> 5;
        const [pos, grs] = renderer.render(world, x, y, z);
        const start = positions.length / 3;
        positions.push(...pos);
        for (let i = 0, l = grs.length; i < l; ++i) {
          const g = grs[i];
          g.start += start;
          groups.push(g);
        }
      }
    }

    geometry.groups = groups;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    this.mesh = new THREE.Mesh(geometry, MATERIALS);
    this.scene.add(this.mesh);
  }

  onResize(entries) {
    const rect = entries[0].contentRect;
    const w = rect.width;
    const h = rect.height;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  }

  stop() {
    this.running = false;
    this.controls = this.renderer = this.camera = this.scene = null;
  }
}
