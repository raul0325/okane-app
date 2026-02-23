document.addEventListener('DOMContentLoaded', function () {

    // =============================================
    // レベル設定（5段階スモールステップ）
    // =============================================
    var LEVELS = [
        { name: 'レベル1', coins: [1, 5, 10], gridSize: 3 },
        { name: 'レベル2', coins: [1, 5, 10], gridSize: 4 },
        { name: 'レベル3', coins: [1, 5, 10, 100], gridSize: 5 },
        { name: 'レベル4', coins: [1, 5, 10, 50, 100], gridSize: 5 },
        { name: 'レベル5', coins: [1, 5, 10, 50, 100], gridSize: 7 }
    ];

    // 画像パス定数（後で差し替え可能）
    // 画像ファイルが配置されたら USE_IMAGES を true にして
    // COIN_IMAGES のパスを設定してください
    var USE_IMAGES = true;
    var COIN_IMAGES = {
        1: 'img/1yen.png',
        5: 'img/5yen.png',
        10: 'img/10yen.png',
        50: 'img/50yen.png',
        100: 'img/100yen.png'
    };

    // =============================================
    // 状態管理
    // =============================================
    var currentLevel = 0;
    var selectedCell = null;
    var gridData = [];
    var cellElements = [];
    var cellValues = [];
    var cellCorrect = [];
    var rowHeaders = [];
    var colHeaders = [];
    var timerInterval = null;
    var timerSeconds = 0;
    var timerRunning = false;
    var gameStarted = false;
    var totalCells = 0;
    var correctCount = 0;

    // =============================================
    // DOM要素
    // =============================================
    var calcGrid = document.getElementById('calc-grid');
    var gridWrapper = document.getElementById('grid-wrapper');
    var timerDisplay = document.getElementById('timer-display');
    var startBtn = document.getElementById('start-btn');
    var successOverlay = document.getElementById('success-overlay');
    var clearTimeEl = document.getElementById('clear-time');
    var retryButton = document.getElementById('retry-button');
    var confettiContainer = document.getElementById('confetti-container');
    var bestTimeBar = document.getElementById('best-time-bar');
    var bestTimeResult = document.getElementById('best-time-result');
    var levelSelect = document.getElementById('level-select');
    var levelButtons = levelSelect.querySelectorAll('.level-btn');
    var tenkeyButtons = document.querySelectorAll('.tenkey-btn');

    // =============================================
    // レベル選択
    // =============================================
    levelButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var idx = parseInt(btn.dataset.level, 10);
            if (idx === currentLevel && gameStarted) return;
            currentLevel = idx;
            updateLevelButtons();
            resetGame();
        });
    });

    function updateLevelButtons() {
        levelButtons.forEach(function (btn, i) {
            btn.classList.toggle('active', i === currentLevel);
        });
        showBestTime();
    }

    // =============================================
    // ベストタイム記録 (localStorage)
    // =============================================
    function getBestTimeKey() {
        return 'masucalc_best_lv' + currentLevel;
    }

    function getBestTime() {
        var val = localStorage.getItem(getBestTimeKey());
        return val ? parseInt(val, 10) : null;
    }

    function saveBestTime(seconds) {
        var current = getBestTime();
        if (current === null || seconds < current) {
            localStorage.setItem(getBestTimeKey(), seconds);
            return true; // 新記録
        }
        return false;
    }

    function showBestTime() {
        var best = getBestTime();
        if (best !== null) {
            bestTimeBar.innerHTML = 'ベストタイム: <span class="best-label">' + formatTime(best) + '</span>';
        } else {
            bestTimeBar.textContent = '';
        }
    }

    // =============================================
    // ユーティリティ
    // =============================================
    // 全金種が必ず1回は出るようにし、残りはランダム（隣接重複回避）
    function pickRandomCoins(coins, count) {
        // まず全金種をシャッフルして先頭に配置
        var base = shuffle(coins.slice());
        // gridSize < coins.length の場合は先頭から切り取り
        if (count <= base.length) {
            return shuffle(base.slice(0, count));
        }
        var result = base.slice();
        // 残りのスロットをランダムで埋める（隣接重複回避）
        while (result.length < count) {
            var prev = result[result.length - 1];
            var candidates = coins.filter(function (c) { return c !== prev; });
            if (candidates.length === 0) candidates = coins;
            result.push(candidates[Math.floor(Math.random() * candidates.length)]);
        }
        return result;
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    function createCoinHTML(value, size) {
        var coinClass = 'coin-' + value;
        var circleSize = size || 38;
        var fontSize = circleSize * 0.38;
        if (value >= 100) fontSize = circleSize * 0.3;

        if (USE_IMAGES && COIN_IMAGES[value]) {
            return '<div class="coin-placeholder">' +
                '<img src="' + COIN_IMAGES[value] + '" alt="' + value + '円" ' +
                'style="width:' + circleSize + 'px;height:' + circleSize + 'px;border-radius:50%;object-fit:cover;">' +
                '</div>';
        }

        return '<div class="coin-placeholder">' +
            '<div class="coin-circle ' + coinClass + '" style="width:' + circleSize + 'px;height:' + circleSize + 'px;font-size:' + fontSize + 'px;">' +
            value + '</div>' +
            '<span class="coin-label">' + value + '円</span>' +
            '</div>';
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    // セルサイズを画面に合わせて計算
    function calcCellSize(gridSize) {
        var wrapperWidth = gridWrapper.clientWidth - 8;
        var wrapperHeight = gridWrapper.clientHeight - 8;
        var cellW = Math.floor(wrapperWidth / (gridSize + 1));
        var cellH = Math.floor(wrapperHeight / (gridSize + 1));
        var cellSize = Math.min(cellW, cellH, 90);
        return Math.max(cellSize, 50);
    }

    // =============================================
    // グリッド生成
    // =============================================
    function buildGrid() {
        var level = LEVELS[currentLevel];
        var size = level.gridSize;
        var cellSize = calcCellSize(size);
        var coinSize = Math.max(Math.floor(cellSize * 0.5), 24);

        colHeaders = pickRandomCoins(level.coins, size);
        rowHeaders = pickRandomCoins(level.coins, size);

        gridData = [];
        cellElements = [];
        cellValues = [];
        cellCorrect = [];
        totalCells = size * size;
        correctCount = 0;
        selectedCell = null;

        for (var r = 0; r < size; r++) {
            gridData[r] = [];
            cellElements[r] = [];
            cellValues[r] = [];
            cellCorrect[r] = [];
            for (var c = 0; c < size; c++) {
                gridData[r][c] = rowHeaders[r] + colHeaders[c];
                cellValues[r][c] = '';
                cellCorrect[r][c] = false;
            }
        }

        calcGrid.innerHTML = '';

        var sizeStyle = 'width:' + cellSize + 'px;height:' + cellSize + 'px;';
        var markSize = Math.floor(cellSize * 0.65);

        // ヘッダー行
        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        var cornerTh = document.createElement('th');
        cornerTh.className = 'corner-cell';
        cornerTh.style.cssText = sizeStyle;
        cornerTh.textContent = '＋';
        headerRow.appendChild(cornerTh);

        for (var c = 0; c < size; c++) {
            var th = document.createElement('th');
            th.className = 'header-cell';
            th.style.cssText = sizeStyle;
            th.innerHTML = createCoinHTML(colHeaders[c], coinSize);
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        calcGrid.appendChild(thead);

        // ボディ行
        var tbody = document.createElement('tbody');
        for (var r = 0; r < size; r++) {
            var tr = document.createElement('tr');
            var rowTh = document.createElement('th');
            rowTh.className = 'header-cell';
            rowTh.style.cssText = sizeStyle;
            rowTh.innerHTML = createCoinHTML(rowHeaders[r], coinSize);
            tr.appendChild(rowTh);

            for (var c2 = 0; c2 < size; c2++) {
                var td = document.createElement('td');
                td.className = 'input-cell';
                td.style.cssText = sizeStyle + 'font-size:' + Math.floor(cellSize * 0.3) + 'px;';
                td.dataset.row = r;
                td.dataset.col = c2;
                td.dataset.markSize = markSize;
                td.addEventListener('click', onCellClick);
                cellElements[r][c2] = td;
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        calcGrid.appendChild(tbody);
    }

    // =============================================
    // セル選択
    // =============================================
    function onCellClick() {
        if (!gameStarted) return;
        var r = parseInt(this.dataset.row, 10);
        var c = parseInt(this.dataset.col, 10);
        if (cellCorrect[r][c]) return;
        selectCell(r, c);
    }

    function selectCell(r, c) {
        if (selectedCell) {
            selectedCell.element.classList.remove('selected');
            renderCellContent(selectedCell.row, selectedCell.col, false);
        }
        selectedCell = { row: r, col: c, element: cellElements[r][c] };
        selectedCell.element.classList.add('selected');
        renderCellContent(r, c, true);
    }

    function renderCellContent(r, c, showCursor) {
        var cell = cellElements[r][c];
        if (cellCorrect[r][c]) return;
        var val = cellValues[r][c];
        if (showCursor) {
            cell.innerHTML = '<span class="cell-input-text">' + val + '</span><span class="cell-cursor"></span>';
        } else {
            cell.innerHTML = '<span class="cell-input-text">' + val + '</span>';
        }
    }

    function moveToNextCell() {
        var size = LEVELS[currentLevel].gridSize;
        var startR = selectedCell ? selectedCell.row : 0;
        var startC = selectedCell ? selectedCell.col + 1 : 0;

        // 現在行の残りのセル → 次行以降
        for (var r = startR; r < size; r++) {
            for (var c = (r === startR ? startC : 0); c < size; c++) {
                if (!cellCorrect[r][c]) { selectCell(r, c); return; }
            }
        }
        // 先頭に戻って探す
        for (var r2 = 0; r2 <= startR; r2++) {
            var endC = (r2 === startR) ? (selectedCell ? selectedCell.col : size) : size;
            for (var c2 = 0; c2 < endC; c2++) {
                if (!cellCorrect[r2][c2]) { selectCell(r2, c2); return; }
            }
        }
    }

    // =============================================
    // テンキー入力
    // =============================================
    tenkeyButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (!gameStarted || !selectedCell) return;
            var key = btn.dataset.key;
            handleKeyInput(key);
        });
    });

    document.addEventListener('keydown', function (e) {
        if (!gameStarted || !selectedCell) return;
        if (e.key >= '0' && e.key <= '9') {
            handleKeyInput(e.key);
        } else if (e.key === 'Backspace') {
            handleKeyInput('delete');
        } else if (e.key === 'Enter') {
            handleKeyInput('enter');
        }
    });

    function handleKeyInput(key) {
        if (!selectedCell) return;
        var r = selectedCell.row;
        var c = selectedCell.col;
        if (cellCorrect[r][c]) return;

        if (key === 'delete') {
            if (cellValues[r][c].length > 0) {
                cellValues[r][c] = cellValues[r][c].slice(0, -1);
                renderCellContent(r, c, true);
            }
        } else if (key === 'enter') {
            checkCell(r, c);
        } else {
            // 数字（最大4桁）
            if (cellValues[r][c].length < 4) {
                cellValues[r][c] += key;
                renderCellContent(r, c, true);
            }
        }
    }

    // =============================================
    // 正誤判定
    // =============================================
    function checkCell(r, c) {
        var input = parseInt(cellValues[r][c], 10);
        var answer = gridData[r][c];
        if (isNaN(input)) return;

        if (input === answer) {
            // 正解
            cellCorrect[r][c] = true;
            correctCount++;
            var cell = cellElements[r][c];
            var markSize = parseInt(cell.dataset.markSize, 10) || 44;
            cell.classList.add('correct');
            cell.classList.remove('selected');
            cell.innerHTML = '<span class="cell-input-text">' + answer + '</span>' +
                '<div class="correct-mark" style="width:' + markSize + 'px;height:' + markSize + 'px;"></div>';

            if (correctCount >= totalCells) {
                onAllCorrect();
            } else {
                moveToNextCell();
            }
        } else {
            // 不正解
            var cell2 = cellElements[r][c];
            cell2.classList.add('incorrect');
            setTimeout(function () {
                cell2.classList.remove('incorrect');
            }, 400);
            cellValues[r][c] = '';
            renderCellContent(r, c, true);
        }
    }

    // =============================================
    // 全問正解
    // =============================================
    function onAllCorrect() {
        stopTimer();
        gameStarted = false;
        clearTimeEl.textContent = 'タイム: ' + formatTime(timerSeconds);

        // ベストタイム判定
        var isNewRecord = saveBestTime(timerSeconds);
        if (isNewRecord) {
            bestTimeResult.innerHTML = '<span class="new-record">★ しんきろく！</span>';
        } else {
            var best = getBestTime();
            bestTimeResult.textContent = 'ベスト: ' + formatTime(best);
        }
        showBestTime();

        if (selectedCell) {
            selectedCell.element.classList.remove('selected');
            selectedCell = null;
        }

        setTimeout(function () {
            successOverlay.classList.remove('hidden');
            spawnConfetti();
        }, 400);
    }

    function spawnConfetti() {
        confettiContainer.innerHTML = '';
        var colors = ['#ff6b6b', '#fcc419', '#51cf66', '#339af0', '#cc5de8',
            '#ff922b', '#20c997', '#f783ac', '#845ef7', '#ffd43b'];
        for (var i = 0; i < 40; i++) {
            var piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = (Math.random() * 100) + '%';
            piece.style.background = colors[i % colors.length];
            piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
            piece.style.animationDelay = (Math.random() * 0.8) + 's';
            piece.style.width = (8 + Math.random() * 8) + 'px';
            piece.style.height = piece.style.width;
            confettiContainer.appendChild(piece);
        }
    }

    // =============================================
    // タイマー
    // =============================================
    function startTimer() {
        if (timerRunning) return;
        timerRunning = true;
        timerSeconds = 0;
        timerDisplay.textContent = '00:00';
        timerInterval = setInterval(function () {
            timerSeconds++;
            timerDisplay.textContent = formatTime(timerSeconds);
        }, 1000);
    }

    function stopTimer() {
        timerRunning = false;
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    }

    // =============================================
    // スタートボタン
    // =============================================
    startBtn.addEventListener('click', function () {
        if (gameStarted) return;
        gameStarted = true;
        startBtn.disabled = true;
        startBtn.textContent = 'けいそくちゅう…';
        startTimer();
        selectCell(0, 0);
    });

    // =============================================
    // もういちど / リセット
    // =============================================
    retryButton.addEventListener('click', function () {
        successOverlay.classList.add('hidden');
        confettiContainer.innerHTML = '';
        resetGame();
    });

    function resetGame() {
        stopTimer();
        gameStarted = false;
        selectedCell = null;
        correctCount = 0;
        timerSeconds = 0;
        timerDisplay.textContent = '00:00';
        startBtn.disabled = false;
        startBtn.textContent = 'スタート';
        successOverlay.classList.add('hidden');
        confettiContainer.innerHTML = '';
        buildGrid();
    }

    // =============================================
    // 初期化
    // =============================================
    buildGrid();
    showBestTime();

    // ウィンドウリサイズ時にグリッドを再構築
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (!gameStarted) buildGrid();
        }, 200);
    });
});
