// src/utils/recipeCache.js
class Node {
  constructor(key, value, expiresAt) {
    this.key = key;
    this.value = value;
    this.expiresAt = expiresAt;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    if (maxSize <= 0) throw new Error("maxSize should be > 0");
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.map = new Map();
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  _addToHead(node) {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.size++;
  }

  _removeNode(node) {
    const p = node.prev;
    const n = node.next;
    if (p) p.next = n;
    else this.head = n;

    if (n) n.prev = p;
    else this.tail = p;

    node.prev = node.next = null;
    this.size--;
  }

  _moveToHead(node) {
    if (this.head === node) return;
    this._removeNode(node);
    this._addToHead(node);
  }

  _removeTail() {
    if (!this.tail) return null;
    const oldTail = this.tail;
    this._removeNode(oldTail);
    return oldTail.key;
  }

  _isExpired(node) {
    return typeof node.expiresAt === "number" && node.expiresAt < Date.now();
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return null;

    if (this._isExpired(node)) {
      this.map.delete(key);
      this._removeNode(node);
      return null;
    }
    this._moveToHead(node);
    return node.value;
  }

  set(key, value) {
    const now = Date.now();
    const expiresAt = this.ttlMs ? now + this.ttlMs : Infinity;

    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this._moveToHead(existing);
      return;
    }

    const node = new Node(key, value, expiresAt);
    this.map.set(key, node);
    this._addToHead(node);

    if (this.size > this.maxSize) {
      const oldest = this._removeTail();
      if (oldest != null) this.map.delete(oldest);
    }
  }
}

const recipeCache = new LRUCache(1, 5 * 60 * 1000);  

export default recipeCache;
