const COLS = 12;
const ROWS = 22;
const BLOCK_SIZE = 20;
const HALF_COLS = COLS / 2;
const ERA_PIECES = 15;
const AUGUST_COUP_REWIND_MS = 60000;

const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const multEl = document.getElementById("mult");
const piecesLeftEl = document.getElementById("pieces-left");
const storeCountEl = document.getElementById("store-count");
const clockEl = document.getElementById("clock-display");
const eraNameEl = document.getElementById("era-name");
const eraDescriptionEl = document.getElementById("era-description");
const eraGuideEl = document.getElementById("era-guide");
const eraArtTagEl = document.getElementById("era-art-tag");
const routeBonusEl = document.getElementById("route-bonus");
const statusTextEl = document.getElementById("status-text");
const quotaTextEl = document.getElementById("quota-text");
const phaseTextEl = document.getElementById("phase-text");
const timelineTextEl = document.getElementById("timeline-text");
const signalModeEl = document.getElementById("signal-mode");
const signalLeftEl = document.getElementById("signal-left");
const signalRightEl = document.getElementById("signal-right");
const deptEls = {
    industrial: document.getElementById("dept-industrial"),
    agricultural: document.getElementById("dept-agricultural"),
    scientific: document.getElementById("dept-scientific")
};
const needleEls = {
    industrial: document.getElementById("needle-industrial"),
    agricultural: document.getElementById("needle-agricultural"),
    scientific: document.getElementById("needle-scientific")
};
const boardOverlayEl = document.getElementById("board-overlay");
const overlayEl = document.getElementById("phase-overlay");
const overlayKickerEl = document.getElementById("overlay-kicker");
const overlayTitleEl = document.getElementById("overlay-title");
const overlayBodyEl = document.getElementById("overlay-body");
const overlayButtonEl = document.getElementById("overlay-button");
const overlayArtTagEl = document.getElementById("overlay-art-tag");

context.scale(BLOCK_SIZE, BLOCK_SIZE);

const PIECES = {
    T: [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    L: [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1]
    ],
    J: [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0]
    ],
    I: [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
};

const RESOURCE_META = {
    industrial: {
        base: "#b94536",
        highlight: "#eb7a61",
        shadow: "#5b1f1a",
        symbol: "П",
        accent: "#f3ad96"
    },
    agricultural: {
        base: "#647d48",
        highlight: "#94af71",
        shadow: "#2e3d1e",
        symbol: "А",
        accent: "#d5e2b4"
    },
    scientific: {
        base: "#3973a8",
        highlight: "#7cd3ff",
        shadow: "#153551",
        symbol: "Н",
        accent: "#d4f6ff"
    },
    black: {
        base: "#111216",
        highlight: "#4d4f57",
        shadow: "#050506",
        symbol: "Х",
        accent: "#9d9faa"
    },
    armor: {
        base: "#7f8087",
        highlight: "#bfc3cf",
        shadow: "#41454f",
        symbol: "Ж",
        accent: "#f1f4ff"
    }
};

const HISTORICAL_TIMELINE = [
    {
        id: "ideologicalSplit",
        name: "路线斗争",
        archiveTag: "SPLIT",
        description: "改革路径出现根本分歧，国家机器被切成互不兼容的两条生产线。",
        guide: "棋盘垂直分裂为左右两区，活动方块将在两侧交替落下，且只在所属半区内结算与消行。",
        overlayClass: "split",
        createRuntime: () => ({ nextSide: "left" })
    },
    {
        id: "collectivization",
        name: "集体主义大生产",
        archiveTag: "PLAN",
        description: "零星成绩不再被承认，只有成规模的集体成果才会被计入国家账本。",
        guide: "单行或双行消除仍会生效，但不会带来任何得分与部门点数，三消起算。",
        createRuntime: () => ({})
    },
    {
        id: "greatDebate",
        name: "真理大讨论",
        archiveTag: "DEBATE",
        description: "左与右的路线之争进入公开阶段，每次局部消行都被记录为一次历史表态。",
        guide: "棋盘中央被划出争论边界，本事件按左右半区独立消行。15 块结束后，比较两侧清行总数并授予永久路线加成。",
        overlayClass: "debate",
        createRuntime: () => ({ leftClears: 0, rightClears: 0 })
    },
    {
        id: "westernJamming",
        name: "信号干扰：西方之音",
        archiveTag: "JAM",
        description: "越过铁幕的无线电噪声扭曲了输入系统，统一指令开始周期性反转。",
        guide: "左右移动每 3 秒反相一次，请观察右侧电台指示灯判断当前方向映射。",
        createRuntime: () => ({ elapsedMs: 0, inverted: false })
    },
    {
        id: "blackMarket",
        name: "黑市倒卖",
        archiveTag: "SHADOW",
        description: "地下市场吞噬了官方结算渠道，普通成绩在黑账面前失去价值。",
        guide: "所有得分暂时冻结。连续完成两次四消后，当前事件内的得分结算才会恢复。",
        createRuntime: () => ({ tetrisChain: 0, unlocked: false })
    },
    {
        id: "bureaucraticRedTape",
        name: "官僚主义文书",
        archiveTag: "BUREAU",
        description: "简单动作必须层层审批，旋转命令在纸堆中被拖成迟滞的机械反馈。",
        guide: "旋转操作受到冷却限制，过于频繁的旋转会被直接驳回。",
        createRuntime: () => ({ rotateCooldownMs: 550 })
    },
    {
        id: "greatPurge",
        name: "大清洗",
        archiveTag: "PURGE",
        description: "怀疑与检举进入生产线，旧有积木会在新方块降临前随机蒸发。",
        guide: "接下来的 15 块中，每次生成新方块前，棋盘上已有方块会随机消失 1 格。",
        createRuntime: () => ({})
    },
    {
        id: "greatPatrioticWar",
        name: "卫国战争：钢铁洪流",
        archiveTag: "WAR",
        description: "工业体系转入战时节奏，钢铁装甲吞没了所有细碎区分。",
        guide: "方块下落速度提高到三倍，所有新方块都以统一装甲块形态生成，并按工业资源结算。",
        createRuntime: () => ({})
    },
    {
        id: "redSquareAftermath",
        name: "红场余波",
        archiveTag: "AFTERMATH",
        description: "猜忌切断了友谊，每第三批补给都混入一道无法结算的黑色阴影。",
        guide: "每第三个生成的方块会变成黑块。含有黑块的行仍会消除，但该行不提供任何得分。",
        createRuntime: () => ({ spawnCount: 0 })
    },
    {
        id: "fiveYearPlan",
        name: "五年计划",
        archiveTag: "FIVE",
        description: "国家把资源向工业部门倾斜，红色模块的产出被大幅提高。",
        guide: "工业格子的生成概率提升至 60%，工业部门点数额外乘以 3，农业与科技只按 0.5 结算。",
        createRuntime: () => ({})
    },
    {
        id: "augustCoup",
        name: "八一九事件",
        archiveTag: "819",
        description: "政变阴影下，历史开始回卷。失败并不一定意味着终局，但机会只给一次。",
        guide: "此事件激活时，每秒保存快照。若触发 Game Over，将自动回溯到 60 秒前的棋盘状态。",
        createRuntime: () => ({ used: false })
    }
];

const state = {
    phase: "boot",
    previousPhase: "playing",
    arena: createMatrix(COLS, ROWS),
    player: null,
    totalScore: 0,
    multiplier: 1.0,
    departments: {
        industrial: 0,
        agricultural: 0,
        scientific: 0
    },
    departmentWeights: {
        industrial: 1,
        agricultural: 1,
        scientific: 1
    },
    routeArchive: "尚未确立路线。",
    dropCounter: 0,
    lastTime: 0,
    elapsedMs: 0,
    historySnapshots: [],
    lastSnapshotSecond: -1,
    eventCount: 0,
    piecesRemainingInEra: ERA_PIECES,
    storeVisits: 0,
    activeEvent: null,
    pendingEvent: null,
    bag: [],
    eventBag: [],
    input: {
        lastRotateMs: -Infinity
    },
    gaugeMaxima: {
        industrial: 25,
        agricultural: 25,
        scientific: 25
    }
};

let overlayAction = null;

function createMatrix(width, height) {
    return Array.from({ length: height }, () => Array(width).fill(null));
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function refillBag() {
    state.bag = shuffle(Object.keys(PIECES));
}

function refillEventBag() {
    state.eventBag = shuffle([...HISTORICAL_TIMELINE]);
}

function nextPieceType() {
    if (state.bag.length === 0) {
        refillBag();
    }
    return state.bag.pop();
}

function nextEventDefinition() {
    if (state.eventBag.length === 0) {
        refillEventBag();
    }
    return state.eventBag.pop();
}

function eventIs(id) {
    return state.activeEvent && state.activeEvent.id === id;
}

function usesSplitClearRules() {
    return eventIs("ideologicalSplit") || eventIs("greatDebate");
}

function setStatus(text) {
    statusTextEl.innerText = text;
}

function setPhaseText(text) {
    phaseTextEl.innerText = text;
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function showOverlay({ kicker, title, body, buttonLabel, artTag, action }) {
    overlayKickerEl.innerText = kicker;
    overlayTitleEl.innerText = title;
    overlayBodyEl.innerText = body;
    overlayButtonEl.innerText = buttonLabel;
    overlayArtTagEl.innerText = artTag || "ERA";
    overlayAction = action;
    overlayEl.classList.remove("hidden");
}

function hideOverlay() {
    overlayEl.classList.add("hidden");
    overlayAction = null;
}

overlayButtonEl.addEventListener("click", () => {
    if (typeof overlayAction === "function") {
        overlayAction();
    }
});

function updateHud() {
    scoreEl.innerText = Math.round(state.totalScore);
    multEl.innerText = `${state.multiplier.toFixed(1)}x`;
    piecesLeftEl.innerText = String(state.piecesRemainingInEra);
    storeCountEl.innerText = String(state.storeVisits);
    clockEl.innerText = formatTime(state.elapsedMs);
    routeBonusEl.innerText = state.routeArchive;

    if (state.phase === "playing") {
        quotaTextEl.innerText = "事件阶段";
    } else if (state.phase === "store") {
        quotaTextEl.innerText = "国家商店";
    } else if (state.phase === "paused") {
        quotaTextEl.innerText = "已暂停";
    } else if (state.phase === "intro") {
        quotaTextEl.innerText = "事件开场";
    } else {
        quotaTextEl.innerText = "历史冻结";
    }

    timelineTextEl.innerText = `Random Era ${state.eventCount}`;

    for (const key of Object.keys(state.departments)) {
        deptEls[key].innerText = String(Math.round(state.departments[key]));
        state.gaugeMaxima[key] = Math.max(state.gaugeMaxima[key], state.departments[key], 25);
        const angle = -120 + (state.departments[key] / state.gaugeMaxima[key]) * 240;
        needleEls[key].style.transform = `rotate(${angle}deg)`;
    }
}

function updateSignalIndicator() {
    const inverted = eventIs("westernJamming") && state.activeEvent.runtime.inverted;
    signalModeEl.innerText = inverted ? "INVERTED" : "NORMAL";
    signalLeftEl.classList.toggle("active-left", !inverted);
    signalRightEl.classList.toggle("active-right", inverted);
}

function updateEraPanel() {
    if (!state.activeEvent) {
        return;
    }

    eraNameEl.innerText = state.activeEvent.name;
    eraDescriptionEl.innerText = state.activeEvent.description;
    eraGuideEl.innerText = state.activeEvent.guide;
    eraArtTagEl.innerText = state.activeEvent.archiveTag || "ARCHIVE";
    boardOverlayEl.className = state.activeEvent.overlayClass || "";
    updateSignalIndicator();
    updateHud();
}

function chooseDepartment() {
    if (eventIs("fiveYearPlan")) {
        const roll = Math.random();
        if (roll < 0.6) {
            return "industrial";
        }
        if (roll < 0.8) {
            return "agricultural";
        }
        return "scientific";
    }

    const pool = ["industrial", "agricultural", "scientific"];
    return pool[Math.floor(Math.random() * pool.length)];
}

function createCell(department, variant = department) {
    const meta = RESOURCE_META[variant];
    return {
        department,
        variant,
        symbol: meta.symbol
    };
}

function createPieceMatrix(type) {
    const template = PIECES[type];
    const matrix = [];
    const runtime = state.activeEvent.runtime;
    let renderVariant = null;

    if (eventIs("greatPatrioticWar")) {
        renderVariant = "armor";
    } else if (eventIs("redSquareAftermath")) {
        runtime.spawnCount += 1;
        if (runtime.spawnCount % 3 === 0) {
            renderVariant = "black";
        }
    }

    for (let y = 0; y < template.length; y += 1) {
        const row = [];
        for (let x = 0; x < template[y].length; x += 1) {
            if (!template[y][x]) {
                row.push(null);
                continue;
            }

            if (renderVariant === "armor") {
                row.push(createCell("industrial", "armor"));
            } else if (renderVariant === "black") {
                row.push(createCell(null, "black"));
            } else {
                const department = chooseDepartment();
                row.push(createCell(department, department));
            }
        }
        matrix.push(row);
    }
    return matrix;
}

function getPieceSideBounds(side) {
    if (side === "left") {
        return { min: 0, max: HALF_COLS - 1 };
    }
    if (side === "right") {
        return { min: HALF_COLS, max: COLS - 1 };
    }
    return { min: 0, max: COLS - 1 };
}

function removeRandomArenaCell() {
    const occupied = [];
    for (let y = 0; y < state.arena.length; y += 1) {
        for (let x = 0; x < state.arena[y].length; x += 1) {
            if (state.arena[y][x]) {
                occupied.push({ x, y });
            }
        }
    }

    if (occupied.length === 0) {
        return;
    }

    const pick = occupied[Math.floor(Math.random() * occupied.length)];
    state.arena[pick.y][pick.x] = null;
    setStatus("大清洗：旧档案被随机蒸发");
}

function collide(arena, player) {
    for (let y = 0; y < player.matrix.length; y += 1) {
        for (let x = 0; x < player.matrix[y].length; x += 1) {
            const cell = player.matrix[y][x];
            if (!cell) {
                continue;
            }

            const boardX = x + player.pos.x;
            const boardY = y + player.pos.y;
            const bounds = getPieceSideBounds(player.side);

            if (boardX < bounds.min || boardX > bounds.max || boardY >= ROWS) {
                return true;
            }

            if (boardY < 0 || arena[boardY][boardX]) {
                return true;
            }
        }
    }
    return false;
}

function spawnPlayer() {
    if (eventIs("greatPurge")) {
        removeRandomArenaCell();
    }

    const type = nextPieceType();
    const matrix = createPieceMatrix(type);
    let side = "full";
    const pos = { x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2), y: 0 };

    if (eventIs("ideologicalSplit")) {
        side = state.activeEvent.runtime.nextSide;
        state.activeEvent.runtime.nextSide = side === "left" ? "right" : "left";
        const bounds = getPieceSideBounds(side);
        pos.x = bounds.min + Math.floor((HALF_COLS - matrix[0].length) / 2);
    }

    state.player = { matrix, pos, type, side };

    if (collide(state.arena, state.player)) {
        triggerGameOver();
        return;
    }

    setStatus(`当前构件: ${type}`);
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                arena[y + player.pos.y][x + player.pos.x] = { ...cell };
            }
        });
    });
}

function rotateMatrix(matrix, direction) {
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

function clearHalf(startX, endX, side) {
    const results = [];

    for (let y = ROWS - 1; y >= 0; y -= 1) {
        let full = true;
        for (let x = startX; x <= endX; x += 1) {
            if (!state.arena[y][x]) {
                full = false;
                break;
            }
        }

        if (!full) {
            continue;
        }

        const cells = [];
        for (let x = startX; x <= endX; x += 1) {
            cells.push(state.arena[y][x]);
        }

        for (let row = y; row > 0; row -= 1) {
            for (let x = startX; x <= endX; x += 1) {
                state.arena[row][x] = state.arena[row - 1][x];
            }
        }

        for (let x = startX; x <= endX; x += 1) {
            state.arena[0][x] = null;
        }

        results.push({
            cells,
            side,
            containsBlack: cells.some((cell) => cell && cell.variant === "black")
        });
        y += 1;
    }

    return results;
}

function clearFullRows() {
    const results = [];

    outer: for (let y = ROWS - 1; y >= 0; y -= 1) {
        for (let x = 0; x < COLS; x += 1) {
            if (!state.arena[y][x]) {
                continue outer;
            }
        }

        const removed = state.arena.splice(y, 1)[0];
        state.arena.unshift(new Array(COLS).fill(null));
        results.push({
            cells: removed,
            side: "full",
            containsBlack: removed.some((cell) => cell && cell.variant === "black")
        });
        y += 1;
    }

    return results;
}

function clearRows() {
    return usesSplitClearRules()
        ? [
            ...clearHalf(0, HALF_COLS - 1, "left"),
            ...clearHalf(HALF_COLS, COLS - 1, "right")
        ]
        : clearFullRows();
}

function getBaseLineScore(lineCount) {
    return [0, 100, 300, 500, 800][lineCount] || lineCount * 300;
}

function getTemporaryDepartmentWeights() {
    if (eventIs("fiveYearPlan")) {
        return {
            industrial: 3,
            agricultural: 0.5,
            scientific: 0.5
        };
    }
    return {
        industrial: 1,
        agricultural: 1,
        scientific: 1
    };
}

function processScore(clearedRows) {
    if (clearedRows.length === 0) {
        return;
    }

    const runtime = state.activeEvent.runtime;
    if (eventIs("greatDebate")) {
        clearedRows.forEach((row) => {
            if (row.side === "left") {
                runtime.leftClears += 1;
            } else if (row.side === "right") {
                runtime.rightClears += 1;
            }
        });
    }

    let scoringAllowed = true;
    if (eventIs("collectivization") && clearedRows.length < 3) {
        scoringAllowed = false;
        setStatus("集体主义大生产：三消以下不计产值");
    }

    if (eventIs("blackMarket")) {
        if (clearedRows.length === 4) {
            runtime.tetrisChain += 1;
        } else {
            runtime.tetrisChain = 0;
        }

        if (!runtime.unlocked && runtime.tetrisChain >= 2) {
            runtime.unlocked = true;
            setStatus("黑市账本被突破：官方结算恢复");
        }

        if (!runtime.unlocked) {
            scoringAllowed = false;
        }
    }

    if (!scoringAllowed) {
        return;
    }

    const temporaryWeights = getTemporaryDepartmentWeights();
    const scorableRows = clearedRows.filter((row) => !row.containsBlack);

    if (scorableRows.length > 0) {
        state.totalScore += Math.round(getBaseLineScore(scorableRows.length) * state.multiplier);
    }

    for (const row of scorableRows) {
        const colorCounts = {
            industrial: 0,
            agricultural: 0,
            scientific: 0
        };

        row.cells.forEach((cell) => {
            if (cell && colorCounts[cell.department] !== undefined) {
                colorCounts[cell.department] += 1;
            }
        });

        for (const key of Object.keys(colorCounts)) {
            const weight = state.departmentWeights[key] * temporaryWeights[key];
            state.departments[key] += Math.round(colorCounts[key] * state.multiplier * weight);
        }
    }

    if (scorableRows.length < clearedRows.length) {
        setStatus("红场余波：含黑块的行已被清除，但不计入结算");
    } else if (eventIs("greatDebate")) {
        setStatus(`真理大讨论：左 ${runtime.leftClears} / 右 ${runtime.rightClears}`);
    } else {
        setStatus(`完成 ${clearedRows.length} 行清除`);
    }
}

function resolveEraEnd() {
    if (!eventIs("greatDebate")) {
        return;
    }

    const runtime = state.activeEvent.runtime;
    if (runtime.leftClears > runtime.rightClears) {
        state.departmentWeights.industrial += 0.35;
        state.multiplier += 0.1;
        state.routeArchive = "真理大讨论结果：左翼路线暂时占优，工业部门永久增益 +0.35，倍率 +0.1。";
        setStatus("历史选择：左翼路线占优");
    } else if (runtime.rightClears > runtime.leftClears) {
        state.departmentWeights.scientific += 0.35;
        state.multiplier += 0.1;
        state.routeArchive = "真理大讨论结果：右翼路线暂时占优，科技部门永久增益 +0.35，倍率 +0.1。";
        setStatus("历史选择：右翼路线占优");
    } else {
        state.departmentWeights.agricultural += 0.25;
        state.multiplier += 0.2;
        state.routeArchive = "真理大讨论暂未分出胜负，农业协调度 +0.25，倍率 +0.2。";
        setStatus("历史选择：暂时妥协");
    }
}

function lockPlayer() {
    merge(state.arena, state.player);
    const clearedRows = clearRows();
    processScore(clearedRows);

    state.piecesRemainingInEra -= 1;
    state.player = null;
    updateHud();

    if (state.piecesRemainingInEra <= 0) {
        resolveEraEnd();
        enterStorePhase();
        return;
    }

    spawnPlayer();
}

function playerDrop() {
    if (!state.player || state.phase !== "playing") {
        return;
    }

    state.player.pos.y += 1;
    if (collide(state.arena, state.player)) {
        state.player.pos.y -= 1;
        lockPlayer();
    }
    state.dropCounter = 0;
}

function playerHardDrop() {
    if (!state.player || state.phase !== "playing") {
        return;
    }

    do {
        state.player.pos.y += 1;
    } while (!collide(state.arena, state.player));

    state.player.pos.y -= 1;
    lockPlayer();
    state.dropCounter = 0;
}

function playerMove(direction) {
    if (!state.player || state.phase !== "playing") {
        return;
    }

    let mappedDirection = direction;
    if (eventIs("westernJamming") && state.activeEvent.runtime.inverted) {
        mappedDirection *= -1;
    }

    state.player.pos.x += mappedDirection;
    if (collide(state.arena, state.player)) {
        state.player.pos.x -= mappedDirection;
    }
}

function playerRotate(direction) {
    if (!state.player || state.phase !== "playing") {
        return;
    }

    if (eventIs("bureaucraticRedTape")) {
        const cooldown = state.activeEvent.runtime.rotateCooldownMs;
        if (state.elapsedMs - state.input.lastRotateMs < cooldown) {
            setStatus("官僚主义文书：旋转审批尚未完成");
            return;
        }
    }

    const startX = state.player.pos.x;
    let offset = 1;

    rotateMatrix(state.player.matrix, direction);
    while (collide(state.arena, state.player)) {
        state.player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (Math.abs(offset) > state.player.matrix[0].length + 1) {
            rotateMatrix(state.player.matrix, -direction);
            state.player.pos.x = startX;
            return;
        }
    }

    state.input.lastRotateMs = state.elapsedMs;
}

function getDropInterval() {
    let interval = 800;
    if (eventIs("greatPatrioticWar")) {
        interval /= 3;
    }
    return interval;
}

function updateEventRuntime(deltaTime) {
    if (eventIs("westernJamming")) {
        const runtime = state.activeEvent.runtime;
        runtime.elapsedMs += deltaTime;
        const shouldInvert = Math.floor(runtime.elapsedMs / 3000) % 2 === 1;
        if (shouldInvert !== runtime.inverted) {
            runtime.inverted = shouldInvert;
            setStatus(shouldInvert ? "西方之音：左右操作已反转" : "西方之音：指令恢复正常");
            updateSignalIndicator();
        }
    }
}

function drawGrid() {
    context.strokeStyle = "rgba(255, 99, 88, 0.08)";
    context.lineWidth = 0.03;

    for (let x = 0; x <= COLS; x += 1) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, ROWS);
        context.stroke();
    }

    for (let y = 0; y <= ROWS; y += 1) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(COLS, y);
        context.stroke();
    }
}

function drawCenterMarker() {
    if (!usesSplitClearRules()) {
        return;
    }

    context.save();
    context.strokeStyle = "rgba(242, 183, 92, 0.35)";
    context.setLineDash([0.2, 0.2]);
    context.beginPath();
    context.moveTo(HALF_COLS, 0);
    context.lineTo(HALF_COLS, ROWS);
    context.stroke();
    context.restore();
}

function drawWeathering(x, y, meta) {
    context.fillStyle = meta.shadow;
    context.fillRect(x + 0.08, y + 0.08, 0.84, 0.12);
    context.fillRect(x + 0.08, y + 0.8, 0.84, 0.08);
    context.fillRect(x + 0.08, y + 0.2, 0.08, 0.6);
    context.fillRect(x + 0.84, y + 0.2, 0.08, 0.6);

    context.fillStyle = meta.highlight;
    context.fillRect(x + 0.12, y + 0.12, 0.7, 0.08);
    context.fillRect(x + 0.12, y + 0.12, 0.08, 0.54);

    context.fillStyle = "rgba(0, 0, 0, 0.22)";
    context.fillRect(x + 0.25, y + 0.46, 0.34, 0.08);
    context.fillRect(x + 0.56, y + 0.32, 0.1, 0.06);
}

function drawRivets(x, y, meta) {
    const points = [
        [0.18, 0.18],
        [0.82, 0.18],
        [0.18, 0.82],
        [0.82, 0.82]
    ];
    points.forEach(([px, py]) => {
        context.beginPath();
        context.fillStyle = meta.highlight;
        context.arc(x + px, y + py, 0.06, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.fillStyle = meta.shadow;
        context.arc(x + px - 0.02, y + py - 0.02, 0.02, 0, Math.PI * 2);
        context.fill();
    });
}

function drawCell(cell, x, y) {
    const meta = RESOURCE_META[cell.variant];
    context.fillStyle = meta.base;
    context.fillRect(x, y, 1, 1);
    drawWeathering(x, y, meta);
    drawRivets(x, y, meta);

    if (cell.variant === "scientific") {
        context.save();
        context.shadowColor = "rgba(124, 211, 255, 0.8)";
        context.shadowBlur = 6;
        context.fillStyle = "rgba(124, 211, 255, 0.16)";
        context.fillRect(x + 0.2, y + 0.2, 0.6, 0.6);
        context.restore();
    }

    context.strokeStyle = "rgba(0, 0, 0, 0.35)";
    context.lineWidth = 0.05;
    context.strokeRect(x + 0.02, y + 0.02, 0.96, 0.96);

    context.fillStyle = meta.accent;
    context.font = "0.42px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(cell.symbol, x + 0.5, y + 0.54);
}

function drawMatrix(matrix, offset) {
    if (!matrix) {
        return;
    }

    matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                drawCell(cell, x + offset.x, y + offset.y);
            }
        });
    });
}

function draw() {
    context.fillStyle = "#050505";
    context.fillRect(0, 0, COLS, ROWS);
    drawGrid();
    drawCenterMarker();
    drawMatrix(state.arena, { x: 0, y: 0 });
    if (state.player) {
        drawMatrix(state.player.matrix, state.player.pos);
    }
}

function saveSnapshotIfNeeded() {
    if (!eventIs("augustCoup")) {
        return;
    }

    const wholeSeconds = Math.floor(state.elapsedMs / 1000);
    if (wholeSeconds <= state.lastSnapshotSecond) {
        return;
    }

    state.lastSnapshotSecond = wholeSeconds;
    state.historySnapshots.push({
        elapsedMs: state.elapsedMs,
        payload: JSON.stringify({
            arena: state.arena,
            player: state.player,
            totalScore: state.totalScore,
            multiplier: state.multiplier,
            departments: state.departments,
            departmentWeights: state.departmentWeights,
            routeArchive: state.routeArchive,
            elapsedMs: state.elapsedMs,
            eventCount: state.eventCount,
            piecesRemainingInEra: state.piecesRemainingInEra,
            storeVisits: state.storeVisits,
            activeEventId: state.activeEvent.id,
            activeEventRuntime: state.activeEvent.runtime,
            bag: state.bag,
            eventBag: state.eventBag,
            gaugeMaxima: state.gaugeMaxima
        })
    });

    if (state.historySnapshots.length > 90) {
        state.historySnapshots.shift();
    }
}

function restoreSnapshot() {
    if (state.historySnapshots.length === 0) {
        return false;
    }

    const targetTime = state.elapsedMs - AUGUST_COUP_REWIND_MS;
    let snapshot = null;

    for (let i = state.historySnapshots.length - 1; i >= 0; i -= 1) {
        if (state.historySnapshots[i].elapsedMs <= targetTime) {
            snapshot = state.historySnapshots[i];
            break;
        }
    }

    if (!snapshot) {
        snapshot = state.historySnapshots[0];
    }

    const restored = JSON.parse(snapshot.payload);
    const definition = HISTORICAL_TIMELINE.find((item) => item.id === restored.activeEventId);
    state.arena = restored.arena;
    state.player = restored.player;
    state.totalScore = restored.totalScore;
    state.multiplier = restored.multiplier;
    state.departments = restored.departments;
    state.departmentWeights = restored.departmentWeights;
    state.routeArchive = restored.routeArchive;
    state.elapsedMs = restored.elapsedMs;
    state.eventCount = restored.eventCount;
    state.piecesRemainingInEra = restored.piecesRemainingInEra;
    state.storeVisits = restored.storeVisits;
    state.bag = restored.bag;
    state.eventBag = restored.eventBag;
    state.gaugeMaxima = restored.gaugeMaxima;
    state.activeEvent = {
        id: definition.id,
        name: definition.name,
        archiveTag: definition.archiveTag,
        description: definition.description,
        guide: definition.guide,
        overlayClass: definition.overlayClass || "",
        runtime: restored.activeEventRuntime
    };
    if (state.activeEvent.id === "augustCoup") {
        state.activeEvent.runtime.used = true;
    }
    state.phase = "playing";
    state.lastSnapshotSecond = Math.floor(state.elapsedMs / 1000);
    state.dropCounter = 0;
    hideOverlay();
    setPhaseText("历史事件执行中");
    updateEraPanel();
    updateHud();
    return true;
}

function triggerGameOver() {
    if (eventIs("augustCoup") && !state.activeEvent.runtime.used && restoreSnapshot()) {
        setStatus("八一九事件：历史回滚 60 秒");
        return;
    }

    state.phase = "gameover";
    state.player = null;
    setPhaseText("历史冻结");
    showOverlay({
        kicker: "Game Over",
        title: "时空崩坏",
        body: "方块已触及顶部天花板。当前历史线无法维持稳定，需重新启动整个修正流程。",
        buttonLabel: "重启历史线",
        artTag: "FAIL",
        action: restartGame
    });
}

function getDropInterval() {
    let interval = 800;
    if (eventIs("greatPatrioticWar")) {
        interval /= 3;
    }
    return interval;
}

function activatePendingEvent() {
    const definition = state.pendingEvent || nextEventDefinition();
    state.pendingEvent = null;
    state.activeEvent = {
        id: definition.id,
        name: definition.name,
        archiveTag: definition.archiveTag,
        description: definition.description,
        guide: definition.guide,
        overlayClass: definition.overlayClass || "",
        runtime: definition.createRuntime()
    };
    state.eventCount += 1;
    state.piecesRemainingInEra = ERA_PIECES;
    state.input.lastRotateMs = -Infinity;
    state.phase = "playing";
    state.dropCounter = 0;
    state.lastSnapshotSecond = Math.floor(state.elapsedMs / 1000) - 1;
    setPhaseText("历史事件执行中");
    setStatus(`${definition.name} 已生效`);
    updateEraPanel();
    spawnPlayer();
    updateHud();
}

function beginEventIntro() {
    state.phase = "intro";
    state.pendingEvent = nextEventDefinition();
    updateHud();
    showOverlay({
        kicker: "Historical Briefing",
        title: state.pendingEvent.name,
        body: `${state.pendingEvent.description}\n\n${state.pendingEvent.guide}`,
        buttonLabel: "开始历史事件",
        artTag: state.pendingEvent.archiveTag,
        action: activatePendingEvent
    });
}

function enterStorePhase() {
    state.phase = "store";
    state.player = null;
    state.storeVisits += 1;
    setPhaseText("国家商店待机中");
    updateHud();
    showOverlay({
        kicker: "State Store",
        title: "国家商店",
        body: `本阶段已结束。当前可支配部门点数为 工业 ${Math.round(state.departments.industrial)} / 农业 ${Math.round(state.departments.agricultural)} / 科技 ${Math.round(state.departments.scientific)}。商店条目后续接入，现可直接进入下一随机历史事件。`,
        buttonLabel: "继续下一事件",
        artTag: "STORE",
        action: continueFromStore
    });
}

function continueFromStore() {
    hideOverlay();
    beginEventIntro();
}

function pauseGame() {
    if (state.phase !== "playing") {
        return;
    }

    state.previousPhase = "playing";
    state.phase = "paused";
    setPhaseText("运行已暂停");
    updateHud();
    showOverlay({
        kicker: "Pause",
        title: "系统暂停",
        body: "生产线已临时停机。按下 P 或点击按钮即可继续当前历史事件。",
        buttonLabel: "继续运行",
        artTag: "PAUSE",
        action: resumeGame
    });
}

function resumeGame() {
    if (state.phase !== "paused") {
        return;
    }

    hideOverlay();
    state.phase = "playing";
    state.lastTime = 0;
    setPhaseText("历史事件执行中");
    updateHud();
}

function togglePause() {
    if (state.phase === "playing") {
        pauseGame();
    } else if (state.phase === "paused") {
        resumeGame();
    }
}

function restartGame() {
    state.phase = "boot";
    state.previousPhase = "playing";
    state.arena = createMatrix(COLS, ROWS);
    state.player = null;
    state.totalScore = 0;
    state.multiplier = 1.0;
    state.departments = {
        industrial: 0,
        agricultural: 0,
        scientific: 0
    };
    state.departmentWeights = {
        industrial: 1,
        agricultural: 1,
        scientific: 1
    };
    state.routeArchive = "尚未确立路线。";
    state.dropCounter = 0;
    state.lastTime = 0;
    state.elapsedMs = 0;
    state.historySnapshots = [];
    state.lastSnapshotSecond = -1;
    state.eventCount = 0;
    state.piecesRemainingInEra = ERA_PIECES;
    state.storeVisits = 0;
    state.activeEvent = null;
    state.pendingEvent = null;
    state.gaugeMaxima = {
        industrial: 25,
        agricultural: 25,
        scientific: 25
    };
    refillBag();
    refillEventBag();
    hideOverlay();
    boardOverlayEl.className = "";
    eraNameEl.innerText = "待命";
    eraDescriptionEl.innerText = "历史事件即将随机抽取。";
    eraGuideEl.innerText = "等待首次简报。";
    eraArtTagEl.innerText = "ARCHIVE";
    signalModeEl.innerText = "NORMAL";
    updateHud();
    beginEventIntro();
}

function update(time = 0) {
    const deltaTime = state.lastTime ? time - state.lastTime : 0;
    state.lastTime = time;

    if (state.phase === "playing") {
        state.elapsedMs += deltaTime;
        state.dropCounter += deltaTime;
        updateEventRuntime(deltaTime);
        saveSnapshotIfNeeded();
        updateHud();

        if (state.dropCounter > getDropInterval()) {
            playerDrop();
        }
    }

    draw();
    requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "p") {
        togglePause();
        return;
    }

    if ((state.phase === "intro" || state.phase === "store" || state.phase === "gameover") && event.key === "Enter" && typeof overlayAction === "function") {
        overlayAction();
        return;
    }

    if (state.phase !== "playing") {
        return;
    }

    if (event.key === "ArrowLeft" || key === "a") {
        playerMove(-1);
    } else if (event.key === "ArrowRight" || key === "d") {
        playerMove(1);
    } else if (event.key === "ArrowDown" || key === "s") {
        playerDrop();
    } else if (event.key === "ArrowUp" || key === "w" || key === "x") {
        playerRotate(1);
    } else if (key === "z") {
        playerRotate(-1);
    } else if (event.code === "Space") {
        event.preventDefault();
        playerHardDrop();
    }
});

restartGame();
update();
