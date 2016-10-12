'use strict';

const clone = require('lodash/cloneDeep');
const uuid = require('uuid');

/*
 * Items are checked for expiry when retrieved. Garbage collection of expired items is
 * achieved using a singly-linked list. The HEAD of the linked list points to the eldest
 * item in the set, so garbage collection takes O(n) where n > 0 represents the number
 * of expired items. GC for no expired items is a O(1) operation.
 */
class ExpiringSet {
  constructor(options) {
    this.ttl = options.ttl;
    this.adds = {};
    this.removals = {};
    this.head = null;
    this.tail = null;
  }

  add(doc) {
    const meta = { id: uuid.v4(), ts: Date.now(), doc: clone(doc) };
    this.adds[meta.id] = meta;

    const current = {
      id: meta.id,
      ts: Date.now() + this.ttl,
      next: null
    };
    if (this.tail) {
      // add entry to end of list
      this.tail.next = current;
      this.tail = current;
    } else {
      // initialize list
      this.head = current;
      this.tail = current;
    }

    return meta;
  }

  get(id) {
    if (this.removals[id]) {
      return undefined;
    }

    const meta = this.adds[id];
    if (meta) {
      const delta = Date.now() - meta.ts;
      if (delta >= this.ttl) {
        delete this.adds[id];
        return undefined;
      }
      return meta;
    }
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

  gc() {
    const now = Date.now();
    while (this.head && now >= this.head.ts) {
      delete this.adds[this.head.id];
      this.head = this.head.next;
    }
    if (!this.head) {
      this.tail = null;
    }
  }
}

module.exports = ExpiringSet;
