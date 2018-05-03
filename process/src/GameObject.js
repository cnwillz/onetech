"use strict";

const Sprite = require('./Sprite');
const Depth = require('./Depth');
const Recipe = require('./Recipe');

class GameObject {
  constructor(dataText) {
    this.data = {};
    this.sprites = [];
    this.transitionsToward = [];
    this.transitionsAway = [];
    this.categories = [];
    this.parseData(dataText);
    this.depth = new Depth({});
    this.id = this.data.id;
  }

  parseData(dataText) {
    const lines = dataText.split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (i == 1) {
        this.parseName(lines[i]);
      } else if (lines[i].includes('spriteID')) {
        this.parseSprite(lines.slice(i, i+7));
        i += 7;
      } else {
        this.parseLine(lines[i]);
      }
    }
  }

  parseName(name) {
    if (name) this.name = name.replace('#', ' - ');
  }

  parseLine(line) {
    for (var value of line.split(',')) {
      const parts = line.split('=');
      if (parts.length < 2) {
        // console.log("Skipping line: " + line);
      } else if (parts[0] == "mapChance") {
        this.parseMapChance(parts[1]);
      } else {
        this.data[parts[0]] = parts[1];
      }
    }
  }

  parseMapChance(value) {
    const parts = value.split('#');
    this.data.mapChance = parts[0];
    if (parts[1].includes("_")) {
      this.data.biomes = parts[1].split('_')[1].split(',');
    }
  }

  parseSprite(lines) {
    this.sprites.push(new Sprite(lines));
  }

  jsonData() {
    const transitionsToward = this.transitionsToward;
    const transitionsAway = this.transitionsAway.filter(t => !t.decay);
    const transitionsTimed = this.transitionsAway.filter(t => t.decay);
    const result = {
      id: this.id,
      name: this.name,
      transitionsToward: transitionsToward.map(t => t.jsonData()),
      transitionsAway: transitionsAway.map(t => t.jsonData()),
      transitionsTimed: transitionsTimed.map(t => t.jsonData()),
    };

    if (this.version)
      result.version = this.version;

    if (this.data.foodValue > 0)
      result.foodValue = parseInt(this.data.foodValue);

    if (this.data.heatValue > 0)
      result.heatValue = parseInt(this.data.heatValue);

    if (this.numUses() > 1) {
      result.numUses = this.numUses();
      if (this.useChance())
        result.useChance = this.useChance();
    }

    if (this.depth.hasValue())
      result.depth = this.depth.value;

    if (this.depth.difficulty)
      result.difficulty = this.depth.difficulty.toFixed(2);

    if (this.data.clothing != "n") {
      result.clothing = this.data.clothing;
      result.insulation = this.insulation();
    }

    if (this.data.mapChance > 0) {
      result.mapChance = parseFloat(this.data.mapChance);
      result.biomes = this.data.biomes;
    }

    if (this.numSlots() > 0) {
      result.numSlots = this.numSlots();
      result.slotSize = parseFloat(this.data.slotSize);
    }

    if (this.data.containable == "1") {
      result.size = parseFloat(this.data.containSize.split(","));
    }

    let techTree = this.techTreeNodes(3);
    if (techTree)
      result.techTree = techTree;

    let recipe = new Recipe(this);
    recipe.generate();
    if (recipe.hasData())
      result.recipe = recipe.jsonData();

    return result;
  }

  hasSprite() {
    return this.sprites.length > 0;
  }

  sortWeight() {
    return -parseInt(this.id);
  }

  isTool() {
    for (var transition of this.transitionsAway) {
      if (transition.actor == this && transition.target && transition.tool) return true;
    }
    return false;
  }

  numUses() {
    return parseInt(this.data.numUses.split(',')[0]);
  }

  useChance() {
    if (this.data.numUses.includes(','))
      return parseFloat(this.data.numUses.split(',')[1]);
  }

  numSlots() {
    return parseInt(this.data.numSlots.split('#')[0]);
  }

  isCraftableContainer() {
    return this.numSlots() > 0 && !this.isGrave();
  }

  isGrave() {
    return this.name.includes("Grave");
  }

  isNatural() {
    return this.data.mapChance > 0;
  }

  isClothing() {
    return this.data.clothing != "n" && (this.data.rValue > 0 || this.data.foodValue == '0' && this.data.containable == '1');
  }

  isWaterSource() {
    // TODO: We need to fix water transitions to do this properly
    for (var transition of this.transitionsAway) {
      if (transition.actorID == '209' && transition.target == this && (transition.tool || transition.targetRemains)) return true;
    }
    return false;
  }

  techTreeNodes(depth) {
    const transition = this.transitionsToward[0];
    if (this.isNatural() || !transition)
      return null;
    if (depth == 0)
      return []; // Empty array means tree goes deeper
    var nodes = [];
    if (transition.decay)
      nodes.push({decay: transition.decay});
    if (transition.actor)
      nodes.push(transition.actor.techTreeNode(depth));
    if (transition.target)
      nodes.push(transition.target.techTreeNode(depth));
    return nodes;
  }

  techTreeNode(depth) {
    return {
      id: this.id,
      nodes: this.techTreeNodes(depth - 1)
    };
  }

  insulation() {
    const parts = {'h': 0.25, 't': 0.35, 'b': 0.2, 's': 0.1, 'p': 0.1};
    if (parts[this.data.clothing])
      return parts[this.data.clothing]*parseFloat(this.data.rValue);
  }
}

module.exports = GameObject;
