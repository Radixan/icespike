import { AIR, DIRT, ICE, SNOW, PACKED_ICE } from "./blocks.js";

function replaceIfValid(world, x, y, z, block) {
  if (canReplace(world.getBlock(x, y, z))) world.setBlock(x, y, z, block);
}

function canReplace(block) {
  return block === AIR || block === DIRT || block === SNOW || block === ICE;
}

export default class IceSpike {
  static upperHeadBlock = PACKED_ICE;
  static lowerHeadBlock = PACKED_ICE;
  static shaftBlock = PACKED_ICE;

  static generate(world, x, y, z, offsetY, height, extraThick, isTall, extraHeight) {
    /*// Omitted for visualization purposes.
    let y = world.topBlockAt(x, z);
    if (world.getBlock(x, y, z) !== SNOW) return;
    //*/
    const maxRadius = (height >> 2) + extraThick;
    y += offsetY + (maxRadius > 1 && isTall) * extraHeight;
    
    for (let k = 0; k < height; ++k) {
      const radius = (1.0 - k / height) * maxRadius;
      const apothem = Math.ceil(radius);
      const sqr_r = radius * radius;
      
      for (let i = -apothem; i <= apothem; ++i) {
        const abs_i = Math.abs(i);
        const dx = abs_i - 0.25;
        const sqr_dx = dx * dx;
        const border_x = abs_i === apothem;

        for (let j = -apothem; j <= apothem; ++j) {
          if (i || j) {
            const abs_j = Math.abs(j);
            const dz = abs_j - 0.25;
            // Check inside circle
            if (sqr_dx + (dz * dz) > sqr_r) continue;
            // Randomize border blocks
            if ((border_x || abs_j === apothem) && Math.random() < 0.25) continue;
          }

          const px = x + i, pz = z + j;
          replaceIfValid(world, px, y + k, pz, IceSpike.upperHeadBlock);
          if (k === 0 || apothem < 2) continue;
          replaceIfValid(world, px, y - k, pz, IceSpike.lowerHeadBlock);
        }
      }
    }

    const w = +(maxRadius > 1);
    --y;
    // Shaft
    for (let j = -w; j <= w; ++j) {
      const px = x + j;
      for (let i = -w; i <= w; ++i) {
        const pz = z + i;
        // taxicab distance <= 1
        let iceAmount = (i && j) ? (Math.random() * 5) >> 0 : 50;
        
        for (let py = y; py > 50; --py) {
          const block = world.getBlock(px, py, pz);
          if (!canReplace(block) && block !== IceSpike.upperHeadBlock && block !== IceSpike.lowerHeadBlock) // PACKED_ICE
            break;
          world.setBlock(px, py, pz, IceSpike.shaftBlock);
          if (--iceAmount > 0) continue;
          py -= 1 + ((Math.random() * 5) >> 0);
          iceAmount = (Math.random() * 5) >> 0;
        }
      }
    }
  }
}