function findPath(start, end, gridSize) {
  const openSet = [];
  const closedSet = [];
  const startNode = { x: start[0], y: start[1], g: 0, h: heuristic(start, end), f: 0, parent: null };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  function heuristic(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }

  function getNeighbors(node) {
    const neighbors = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    dirs.forEach(dir => {
      const x = node.x + dir[0];
      const y = node.y + dir[1];
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        neighbors.push({ x, y });
      }
    });
    return neighbors;
  }

  while (openSet.length > 0) {
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    const current = openSet[lowestIndex];

    if (current.x === end[0] && current.y === end[1]) {
      const path = [];
      let temp = current;
      while (temp.parent) {
        path.push([temp.x, temp.y]);
        temp = temp.parent;
      }
      path.push([start[0], start[1]]);  // Include the start position
      return path.reverse();  // Ensure the path is from start to end
    }

    openSet.splice(lowestIndex, 1);
    closedSet.push(current);

    const neighbors = getNeighbors(current);
    neighbors.forEach(neighbor => {
      if (closedSet.find(node => node.x === neighbor.x && node.y === neighbor.y)) {
        return;
      }

      const gScore = current.g + 1;
      let neighborNode = openSet.find(node => node.x === neighbor.x && node.y === neighbor.y);
      if (!neighborNode) {
        neighborNode = { ...neighbor, g: gScore, h: heuristic(neighbor, end), f: gScore + heuristic(neighbor, end), parent: current };
        openSet.push(neighborNode);
      } else if (gScore < neighborNode.g) {
        neighborNode.g = gScore;
        neighborNode.f = neighborNode.g + neighborNode.h;
        neighborNode.parent = current;
      }
    });
  }

  return [];
}
