let scene, camera, renderer, grid, playerObj, obstacles;
const tileSize = 50;
const gridSize = 10;

init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);

  // Camera
  const aspect = window.innerWidth / window.innerHeight;
  const d = 500;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
  const pos = 300;
  camera.position.set(pos, pos, pos);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // Enable shadow mapping
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Grid
  grid = [];
  obstacles = new Set();
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let y = 0; y < gridSize; y++) {
      const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
      const tile = new THREE.Mesh(geometry, material);
      tile.receiveShadow = true; // Allow tiles to receive shadows
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x * tileSize - (gridSize * tileSize / 2), 0, y * tileSize - (gridSize * tileSize / 2));
      scene.add(tile);
      grid[x][y] = tile;

      // Add click event
      tile.userData = { x, y };
      tile.callback = () => onTileClick(tile.userData);
    }
  }

  // Add obstacles with shadows
  addObstacle(2, 2);
  addObstacle(2, 3);
  addObstacle(2, 4);
  addObstacle(2, 5);
  addObstacle(4, 4);
  addObstacle(5, 2);
  addObstacle(5, 4);
  addObstacle(6, 6);
  addObstacle(7, 6);
  addObstacle(8, 6);
  addObstacle(9, 6, undefined, false);


  // Player
  const playerGeometry = new THREE.BoxGeometry(30, 30, 30);
  const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.castShadow = true; // Player object casts shadows
  const initialPosition = getGridPosition(0, 0);
  player.position.set(initialPosition.x, 15, initialPosition.z);
  scene.add(player);

  // Player properties
  playerObj = {
    mesh: player,
    gridX: 0,
    gridY: 0
  };

  // Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(100, 300, 200);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.far = 1000;
  directionalLight.shadow.camera.left = -500;
  directionalLight.shadow.camera.right = 500;
  directionalLight.shadow.camera.top = 500;
  directionalLight.shadow.camera.bottom = -500;
  scene.add(directionalLight);

  // Resize handling
  window.addEventListener('resize', onWindowResize, false);

  // Handle mouse clicks
  document.addEventListener('mousedown', onMouseDown, false);
}

function addObstacle(x, y, color = 0xff0000, castShadow = true) {
  const geometry = new THREE.BoxGeometry(tileSize, tileSize, tileSize);
  const material = new THREE.MeshStandardMaterial({ color: color });
  const obstacle = new THREE.Mesh(geometry, material);
  obstacle.castShadow = castShadow; // Obstacles cast shadows
  const position = getGridPosition(x, y);
  obstacle.position.set(position.x, tileSize / 2, position.z);
  scene.add(obstacle);
  obstacles.add(`${x},${y}`);
}

function movePlayerAlongPath(path) {
  TWEEN.removeAll();

  let prevTween = null;
  path.forEach((pos, index) => {
    const nextPosition = getGridPosition(pos[0], pos[1]);
    const tween = new TWEEN.Tween(playerObj.mesh.position).to(nextPosition, index === 0 ? 0 : 100).easing(TWEEN.Easing.Linear.None);

    if (prevTween) {
      prevTween.chain(tween);
    } else {
      tween.start();
    }

    prevTween = tween;
  });

  playerObj.gridX = path[path.length - 1][0];
  playerObj.gridY = path[path.length - 1][1];
}

function onTileClick(tilePosition) {
  const start = [playerObj.gridX, playerObj.gridY];
  const end = [tilePosition.x, tilePosition.y];
  const path = findPath(start, end, gridSize);
  if (path.length > 0) {
    movePlayerAlongPath(path);
  }
}

function getGridPosition(x, y) {
  return {
    x: x * tileSize - (gridSize * tileSize / 2),
    y: 15,
    z: y * tileSize - (gridSize * tileSize / 2)
  };
}

function onMouseDown(event) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length > 0) {
    intersects[0].object.callback();
  }
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const d = 500;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.top = d;
  camera.bottom = -d;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  renderer.render(scene, camera);
}

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
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && !obstacles.has(`${x},${y}`)) {
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
      path.push([start[0], start[1]]);
      return path.reverse();
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
