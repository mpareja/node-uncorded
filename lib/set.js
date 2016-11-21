'use strict';

const clone = require('lodash/cloneDeep');
const uuid = require('uuid');

class Set {
  constructor(opts) {
    const options = opts || {};
    this.createId = options.createId || uuid.v4;
    this.adds = {};
    this.removals = {};
  }

  add(doc) {
    const meta = { id: this.createId(), doc: clone(doc) };
    this.adds[meta.id] = meta;
    return meta;
  }

  get(id) {
    if (this.removals[id]) {
      return undefined;
    }
    return this.adds[id];
  }

  merge(state) {
    Object.assign(this.adds, state.adds);
    Object.assign(this.removals, state.removals);
  }

  remove(id) {
    const meta = this.get(id);
    if (meta) {
      this.removals[id] = id;
    }
    return meta;
  }

  state() {
    return { adds: this.adds, removals: this.removals };
  }
}

module.exports = Set;
