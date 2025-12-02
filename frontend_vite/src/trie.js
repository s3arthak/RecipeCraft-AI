export default class Trie {
  constructor() {
    this.root = {};
    this.end = "*";
  }

  insert(word) {
    if (!word) return;
    let node = this.root;
    const s = String(word).toLowerCase();
    for (const ch of s) {
      if (!node[ch]) node[ch] = {};
      node = node[ch];
    }
    node[this.end] = true;
  }

  _getNode(prefix) {
    let node = this.root;
    const p = String(prefix || '').toLowerCase();
    for (const ch of p) {
      if (!node[ch]) return null;
      node = node[ch];
    }
    return node;
  }

  _dfs(node, prefix, out, limit) {
    if (out.length >= limit) return;
    if (node[this.end]) out.push(prefix);
    for (const ch of Object.keys(node)) {
      if (ch === this.end) continue;
      this._dfs(node[ch], prefix + ch, out, limit);
      if (out.length >= limit) break;
    }
  }

  suggest(prefix, limit = 8) {
    const node = this._getNode(prefix);
    if (!node) return [];
    const out = [];
    this._dfs(node, String(prefix).toLowerCase(), out, limit);
    return out;
  }

  buildFromList(list) {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const name = (typeof item === 'string') ? item : item?.title ?? item?.name;
      if (name) this.insert(name);
    }
  }
}
