/**
 * Convert json node to array
 * @param node - json node
 */
export function nodeToArray(node) {
  if (!node) {
    return [];
  }
  return node instanceof Array ? node : [node];
}

export function addNode(parent, type, node) {
  const list = nodeToArray(parent[type]);
  list.push(node);
  parent[type] = list.length === 1 ? list[0] : list;
  return parent;
}

export function cloneObject(object) {
  return JSON.parse(JSON.stringify(object || {}));
}

export function objectsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
