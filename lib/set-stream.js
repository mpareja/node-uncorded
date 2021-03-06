'use strict';
const assert = require('assert');
const Duplex = require('stream').Duplex;

/*
 * A set which merges in states read from other sets
 * and emits its own state after performing operations locally.
 */
class SetStream extends Duplex {
  constructor(set) {
    assert(set, 'a set is required');
    super({ objectMode: true });

    this._set = set;

    // We stream states, so there is no point in buffering
    // old states prior to a client reading from the stream.
    this.resume();
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
    this.push(this.state());
  }

  state() {
    return this._set.state();
  }

  _read() {}
  _write(chunk, encoding, callback) {
    this._set.merge(chunk);
    callback(null);
  }
}

module.exports = SetStream;
