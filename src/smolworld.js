import { AIR } from "./blocks.js";

// It is actually a "chunk" of 32x32 blocks intended to demonstrate population processes.

export default class SmolWorld {
  constructor() {
    this.blocks = [];
    this.heightMap = new Array(32 * 32).fill(0);
  }

  clear() {
    this.blocks = [];
    this.heightMap.fill(0);
  }

  isOoB(x, y, z) {
    return y < 0 || y > 255 || x < 0 || x > 31 || z < 0 || z > 31;
  }
  
  getBlock(x, y, z) {
    return this.isOoB(x, y, z) ? AIR : this.blocks[x + (y << 10) + (z << 5)] || AIR;
  }
  
  setBlock(x, y, z, id) {
    if (this.isOoB(x, y, z)) return;
    const ptr = x + (y << 10) + (z << 5);
    const block = this.blocks[ptr];
    if (id === AIR) {
      if (!block) return;
      delete this.blocks[ptr];
    }
    else if (block === id) return;
    else this.blocks[ptr] = id;
    this.updateHeight(x, y, z, id);
  }

  topBlockAt(x, z) {
    return this.heightMap[x + (z << 5)];
  }

  updateHeight(x, y, z, block) {
    const pos = x + (z << 5);
    const h = this.heightMap[pos];
    if (h > y) return;
    if (block === AIR) {
      if (h < y) return;
      while (--y > 0 && !this.getBlock(x, y, z));
    }
    this.heightMap[pos] = y;
  }
}
