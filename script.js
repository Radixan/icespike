import SmolWorld from "./src/smolworld.js";
import SmolRenderer from "./src/smolrenderer.js";

import IceSpike from "./src/icespike.js";
import * as Blocks from "./src/blocks.js";

import { computePosition, flip, size, autoUpdate } from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.5.1/+esm';

// Initilization and UI.

window.addEventListener("load", function() {
  const world = new SmolWorld();
  const renderer = new SmolRenderer(document.getElementById("renderer"));
  renderer.registerFullBlock(Blocks.STONE, 0xAAAAAA);
  renderer.registerFullBlock(Blocks.DIRT, 0x8C6545);
  renderer.registerFullBlock(Blocks.BEDROCK, 0x333333);
  renderer.registerFullBlock(Blocks.OBSIDIAN, 0x10101F);
  renderer.registerFullBlock(Blocks.EMERALD_BLOCK, 0x46DA70);
  renderer.registerFullBlock(Blocks.REDSTONE_BLOCK, 0xE11F08);
  renderer.registerFullBlock(Blocks.SNOW, 0xFCFCFC);
  renderer.registerFullBlock(Blocks.PACKED_ICE, 0xAAC8F3);
  renderer.registerGlassyBlock(Blocks.ICE, 0x74ABF7, 0.75);
  
  const handler = {
    listeners: {},
    set(target, prop, value) {
      const e = this.listeners[prop];
      for (let i = 0, l = e?.length; i < l; ++i) e[i](value);
      target[prop] = value;
      return true;
    },
    addListener(prop, fn) {
      (this.listeners[prop] ?? (this.listeners[prop] = [])).push(fn);
    }
  };
  const properties = new Proxy({
    surfaceType: 0, surfaceBottom: 0, surfaceHeight: 0,
    offsetX: 8, spikeY: 0, offsetZ: 8,
    offsetY: 0, height: 7, extraThick: 0, isTall: 0, extraHeight: 10
  }, handler);

  function fillLayers(y, h, block) {
    for (let i = 0, l = 1024 * h; i < l; ++i)
      world.setBlock(i & 0x1F, y + (i >> 10), (i >> 5) & 0x1F, block);
  }
  
  function rebuildWorld() {
    world.clear();
    const h = properties.surfaceHeight;
    if (h > 0) {
      switch(properties.surfaceType) {
      case 2:
        fillLayers(properties.surfaceBottom, h, Blocks.ICE); break;
      case 1:
        fillLayers(properties.surfaceBottom, h, Blocks.OBSIDIAN); break;
      case 0:
        fillLayers(    0,     1, Blocks.BEDROCK);
        fillLayers(    1, h - 4, Blocks.STONE);
        fillLayers(h - 3,     2, Blocks.DIRT);
        fillLayers(h - 1,     1, Blocks.SNOW);
        break;
      }
    }

    IceSpike.generate(
      world, properties.offsetX + 8, properties.spikeY, properties.offsetZ + 8,
      properties.offsetY, properties.height, properties.extraThick,
      properties.isTall, properties.extraHeight
    );
  }

  function generateRandomSpike() {
    properties.offsetX = (Math.random() * 16) >> 0;
    properties.offsetZ = (Math.random() * 16) >> 0;
    properties.offsetY = (Math.random() * 4) >> 0;
    properties.height = 7 + (Math.random() * 4) >> 0;
    properties.extraThick = (Math.random() * 2) >> 0;
    if (properties.isTall = Math.random() * 60 < 1)
      properties.extraHeight = 10 + (Math.random() * 30) >> 0;
    rebuildWorld();
    renderer.render(world);
  }

  function updateProperty(validator, except, event) {
    if (except && except(event)) return;
    const self = event.target;
    const value = validator(self);
    const prop = self.dataset.prop;
    if (value === +properties[prop]) return;
    properties[prop] = value;
    rebuildWorld();
    renderer.render(world);
  }
  const clampNumericField = self => self.value = Math.min(Math.max(+self.value | 0, +self.min), +self.max);
  const updateNumberField = updateProperty.bind(null, clampNumericField, e => e.type === "input" && e instanceof InputEvent);
  const updateRangeField = updateProperty.bind(null, clampNumericField, null);
  const updateCheckbox = updateProperty.bind(null, self => +self.checked, null);
  const updateSelect = updateProperty.bind(null, self => self.selectedIndex, null);

  function initField(input, prop, min, max) {
    const el = [];
    if (!Array.isArray(input)) input = [input];
    for (let i = 0, l = input.length; i < l; ++i) {
      const e = document.getElementById(input[i]);
      let name = "value";
      switch(e.type) {
      case "checkbox":
        name = "checked";
        e.addEventListener("change", updateCheckbox);
        break;
      case "select-one":
        name = "selectedIndex";
        e.addEventListener("change", updateSelect);
        break;
      case "number":
        e.min = min; e.max = max;
        e.addEventListener("input", updateNumberField);
        e.addEventListener("change", updateNumberField);
        break;
      case "range":
        e.min = min; e.max = max;
        e.addEventListener("input", updateRangeField);
        break;
      default:
        continue;
      }
      e.dataset.prop = prop;
      handler.addListener(prop, value => e[name] = value);
      el.push(e);
    }
    return el;
  }

  document.getElementById("sky_checkbox").addEventListener("change", function(e) {
    renderer.scene.background = this.checked ? SmolRenderer.SKYBOX_DAY : SmolRenderer.SKYBOX_NIGHT;
  });
  document.getElementById("setters_checkbox").addEventListener("change", function(e) {
    if (this.checked) IceSpike.lowerHeadBlock = Blocks.EMERALD_BLOCK, IceSpike.shaftBlock = Blocks.REDSTONE_BLOCK;
    else IceSpike.lowerHeadBlock = IceSpike.shaftBlock = Blocks.PACKED_ICE;
    rebuildWorld();
    renderer.render(world);
  });
  document.getElementById("grid_checkbox").addEventListener("change", function(e) {
    renderer.grid.visible = renderer.axis.visible = this.checked;
  });

  const surfaceBottomFieldset = document.getElementById("surface_bottom_fieldset");
  initField("surface_type", "surfaceType");
  handler.addListener("surfaceType", function(value) {
    const height = properties.surfaceHeight;
    if (height) renderer.setGridHeight(height + !(surfaceBottomFieldset.disabled = value === 0) * properties.surfaceBottom);
  });
  initField(["surface_bottom_number", "surface_bottom_slider"], "surfaceBottom", 0, 255);
  initField(["surface_height_number", "surface_height_slider"], "surfaceHeight", 0, 255);
  handler.addListener("surfaceBottom", function(value) {
    renderer.setGridHeight(properties.surfaceHeight + value * (properties.surfaceType !== 0));
  });
  handler.addListener("surfaceHeight", function(value) {
    if (value > 0)
      return renderer.setGridHeight(value + !(surfaceBottomFieldset.disabled = properties.surfaceType === 0) * properties.surfaceBottom);
    surfaceBottomFieldset.disabled = true;
    renderer.setGridHeight(0);
  });


  initField("position_x", "offsetX", 0, 16);
  initField("position_y", "spikeY", 0, 255);
  initField("position_z", "offsetZ", 0, 16);

  initField(["offset_y_number", "offset_y_slider"], "offsetY", 0, 3);
  initField(["height_number", "height_slider"], "height", 7, 11);
  
  initField("radius_checkbox", "extraThick");
  initField("tall_checkbox", "isTall");
  initField(["extra_height_number", "extra_height_slider"], "extraHeight", 10, 39);
  const extraHeightFieldset = document.getElementById("extra_height_fieldset");
  handler.addListener("isTall", value => extraHeightFieldset.disabled = !value);

  document.getElementById("randomize").addEventListener("click", generateRandomSpike);
  const sidebar = document.getElementById("sidebar");
  document.getElementById("toggle_sidebar").addEventListener("click", function(e) { sidebar.dataset.hidden ^= 1; });

  const tooltip = document.getElementById("tooltip");
  let stopTooltip = null;
  function showTooltip() {
    const info = this.querySelector("info");
    if (!info) return;
    tooltip.dataset.hidden = 0;
    tooltip.firstElementChild.innerHTML = info.innerHTML;
    stopTooltip = autoUpdate(this, tooltip, placeTooltip.bind(null, this, tooltip));
  }

  function hideTooltip(e) {
    if (tooltip.contains(e.relatedTarget)) return;
    tooltip.dataset.hidden = 1;
    if (!stopTooltip) return;
    stopTooltip();
    stopTooltip = null;
  }

  function placeTooltip(parent, tooltip) {
    computePosition(parent, tooltip, {
      placement: 'top-start',
      middleware: [
        flip({crossAxis: false}),
        size({
          apply({availableWidth, availableHeight}) {
            Object.assign(tooltip.style, {
              maxWidth: `${availableWidth}px`,
              maxHeight: `${availableHeight}px`
            });
          }
        })
      ]
    }).then(({x, y}) => {
      Object.assign(tooltip.style, {
        left: `${x}px`,
        top: `${y}px`
      });
    });
  }

  tooltip.addEventListener("mouseout", hideTooltip);
  for (const icon of document.getElementsByTagName("iconify-icon")) {
    icon.parentElement.addEventListener("mouseover", showTooltip);
    icon.parentElement.addEventListener("mouseout", hideTooltip);
  }
  
  
  properties.surfaceType = 0;
  properties.surfaceBottom = 0;
  properties.surfaceHeight = 64;
  properties.spikeY = 64;
  properties.extraHeight = properties.extraHeight;
  renderer.setGridHeight(properties.surfaceHeight);
  renderer.camera.position.set(256, 192, 256);
  renderer.controls.target.set(16.0, 85.0, 16.0);
  generateRandomSpike();
});
