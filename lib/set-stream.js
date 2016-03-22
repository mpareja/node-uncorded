'use strict';
const Duplex = require('stream').Duplex;
const Set = require('./set');

/*
 * A set which merges in states read from other sets
 * and emits its own state after performing operations locally.
 */
class SetStream extends Duplex {
  constructor() {
    super({ objectMode: true });

    this._set = new Set();
  }

  add(doc) {
    const meta = this._set.add(doc);
    this.replicate();
    return meta;
  }

  get(id) {
    return this._set.get(id);
  }

  remove(id) {
    const meta = this._set.remove(id);
    this.replicate();
    return meta;
  }

  replicate() {
    this.push({ adds: this._set.adds, removals: this._set.removals });
  }

  _read() {}
  _write(chunk, encoding, callback) {
    this._set.merge(chunk);
    callback(null);
  }
}

module.exports = SetStream;
