const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const multEl = document.getElementById("mult");
const medalSlotsEl = document.getElementById("medal-slots");
const statusTextEl = document.getElementById("status-text");

context.scale(20, 20);

// --- 1. 数据架构 (SovietState) ---
const state = {
    score: 0,
    multiplier: 1.0,
    medals: window.rogueRegistry ? window.rogueRegistry.medals : []
};

// --- 2. 肉鸽钩子 (Roguelike Hooks) ---
// 每当消行时，这个函数会被调用。以后我们在这里写倍率翻倍的逻辑。
function applyRoguelikeEffects(linesCleared) {
    if (linesCleared <= 0) {
        return;
    }

    console.log(`消除了 ${linesCleared} 行，准备触发肉鸽逻辑...`);

    for (const medal of state.medals) {
        if (typeof medal.onLinesCleared === "function") {
            medal.onLinesCleared({
                linesCleared,
                state,
                arena,
                player
            });
        }
    }

    const baseScore = [0, 100, 300, 500, 800][linesCleared] ?? linesCleared * 300;
    state.score += Math.round(baseScore * state.multiplier);

    updateHud();
    renderMedalSlots();
}

function updateHud() {
    scoreEl.innerText = state.score;
    multEl.innerText = state.multiplier.toFixed(1);
}

function renderMedalSlots() {
    medalSlotsEl.innerHTML = "";

    if (state.medals.length === 0) {
        for (let i = 0; i < 4; i += 1) {
            const slot = document.createElement("div");
            slot.className = "empty-slot";
            slot.innerText = "等待指令...";
            medalSlotsEl.appendChild(slot);
        }
        return;
    }

    state.medals.forEach((medal) => {
        const slot = document.createElement("div");
        slot.className = "medal-slot";
        slot.innerText = medal.name || "未命名勋章";
        medalSlotsEl.appendChild(slot);
    });
}

function setStatus(text) {
    statusTextEl.innerText = text;
}

// --- 3. 基础俄罗斯方块引擎 (简化版) ---
// Implement the standard Tetris engine with grid array, pieces, and draw function. Call applyRoguelikeEffects when lines are cleared.
const colors = [
    null,
    "#d73030",
    "#d89c28",
    "#e6d15c",
    "#2cb978",
    "#3f8ed8",
    "#8d5fd3",
    "#cc5f9e"
];

const arena = createMatrix(12, 20);

const player = {
    pos: { x: 0, y: 0 },
    matrix: null
};

let dropCounter = 0;
let dropInterval = 800;
let lastTime = 0;

function createMatrix(width, height) {
    const matrix = [];

    while (height > 0) {
        matrix.push(new Array(width).fill(0));
        height -= 1;
    }

    return matrix;
}

function createPiece(type) {
    switch (type) {
        case "T":
            return [
                [0, 0, 0],
                [1, 1, 1],
                [0, 1, 0]
            ];
        case "O":
            return [
                [2, 2],
                [2, 2]
            ];
        case "L":
            return [
                [0, 3, 0],
                [0, 3, 0],
                [0, 3, 3]
            ];
        case "J":
            return [
                [0, 4, 0],
                [0, 4, 0],
                [4, 4, 0]
            ];
        case "I":
            return [
                [0, 5, 0, 0],
                [0, 5, 0, 0],
                [0, 5, 0, 0],
                [0, 5, 0, 0]
            ];
        case "S":
            return [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0]
            ];
        case "Z":
            return [
                [7, 7, 0],
                [0, 7, 7],
                [0, 0, 0]
            ];
        default:
            return [[1]];
    }
}

function collide(arenaMatrix, playerState) {
    const [matrix, offset] = [playerState.matrix, playerState.pos];

    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            if (
                matrix[y][x] !== 0 &&
                (arenaMatrix[y + offset.y] && arenaMatrix[y + offset.y][x + offset.x]) !== 0
            ) {
                return true;
            }
        }
    }

    return false;
}

function merge(arenaMatrix, playerState) {
    playerState.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arenaMatrix[y + playerState.pos.y][x + playerState.pos.x] = value;
            }
        });
    });
}

function arenaSweep() {
    let linesCleared = 0;

    outer: for (let y = arena.length - 1; y >= 0; y -= 1) {
        for (let x = 0; x < arena[y].length; x += 1) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        linesCleared += 1;
        y += 1;
    }

    if (linesCleared > 0) {
        setStatus(`完成 ${linesCleared} 行清除`);
        applyRoguelikeEffects(linesCleared);
    }
}

function playerDrop() {
    player.pos.y += 1;

    if (collide(arena, player)) {
        player.pos.y -= 1;
        merge(arena, player);
        arenaSweep();
        playerReset();
    }

    dropCounter = 0;
}

function playerHardDrop() {
    do {
        player.pos.y += 1;
    } while (!collide(arena, player));

    player.pos.y -= 1;
    merge(arena, player);
    arenaSweep();
    playerReset();
    dropCounter = 0;
}

function playerMove(direction) {
    player.pos.x += direction;

    if (collide(arena, player)) {
        player.pos.x -= direction;
    }
}

function playerReset() {
    const pieces = "TJLOSZI";
    const randomPiece = pieces[(pieces.length * Math.random()) | 0];
    player.matrix = createPiece(randomPiece);
    player.pos.y = 0;
    player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

    if (collide(arena, player)) {
        arena.forEach((row) => row.fill(0));
        state.score = 0;
        state.multiplier = 1.0;
        updateHud();
        setStatus("生产线崩溃，已重启");
    } else {
        setStatus(`当前构件: ${randomPiece}`);
    }
}

function rotate(matrix, direction) {
    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < y; x += 1) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }

    if (direction > 0) {
        matrix.forEach((row) => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerRotate(direction) {
    const startX = player.pos.x;
    let offset = 1;

    rotate(player.matrix, direction);

    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));

        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -direction);
            player.pos.x = startX;
            return;
        }
    }
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                context.strokeStyle = "rgba(0, 0, 0, 0.45)";
                context.lineWidth = 0.06;
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function drawGrid() {
    context.strokeStyle = "rgba(255, 77, 77, 0.08)";
    context.lineWidth = 0.02;

    for (let x = 0; x <= arena[0].length; x += 1) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, arena.length);
        context.stroke();
    }

    for (let y = 0; y <= arena.length; y += 1) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(arena[0].length, y);
        context.stroke();
    }
}

function draw() {
    context.fillStyle = "#050505";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
        playerMove(-1);
    } else if (event.key === "ArrowRight") {
        playerMove(1);
    } else if (event.key === "ArrowDown") {
        playerDrop();
    } else if (event.key === "ArrowUp" || event.key.toLowerCase() === "x") {
        playerRotate(1);
    } else if (event.key.toLowerCase() === "z") {
        playerRotate(-1);
    } else if (event.code === "Space") {
        event.preventDefault();
        playerHardDrop();
    }
});

renderMedalSlots();
updateHud();
playerReset();
update();
