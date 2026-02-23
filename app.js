document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // ステージ設定
    // 各ステージ: 金額範囲と使えるコインを定義
    // 問題はランダム生成し、連続で同じ金額にならないようにする
    // =============================================
    const QUESTIONS_PER_STAGE = 7;

    const stages = [
        {
            name: 'ステージ 1',
            description: '10円〜50円',
            coinTypes: [1, 5, 10],
            // 出題可能な金額の一覧
            amounts: [10, 20, 30, 40, 50],
            // お財布に入れるコイン
            walletCoins: [10, 10, 10, 10, 10, 50]
        },
        {
            name: 'ステージ 2',
            description: '50円〜150円',
            coinTypes: [10, 50, 100],
            amounts: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
            walletCoins: [10, 10, 10, 10, 10, 50, 100, 100]
        },
        {
            name: 'ステージ 3',
            description: '100円〜300円',
            coinTypes: [10, 50, 100],
            amounts: [100, 110, 120, 130, 150, 160, 170, 180, 200, 210, 250, 260, 300],
            walletCoins: [10, 10, 10, 10, 10, 50, 50, 100, 100, 100]
        },
        {
            name: 'ステージ 4',
            description: 'こまかいおかね',
            coinTypes: [1, 5, 10, 50, 100],
            amounts: [13, 27, 35, 42, 58, 63, 76, 84, 99,
                103, 115, 127, 134, 148, 156, 167, 178, 189,
                205, 213, 236, 247, 258, 312, 341, 378, 405, 467],
            walletCoins: [1, 1, 1, 1, 1, 1, 1, 1, 1,
                5, 5, 10, 10, 10, 10, 10,
                50, 50, 100, 100, 100, 100, 100]
        },
    ];

    // =============================================
    // 状態管理
    // =============================================
    let currentStageIndex = 0;
    let currentQuestionIndex = 0;
    let currentTotal = 0;
    let currentTargetAmount = 0;
    let waitingForNext = false;
    let lastAmount = -1; // 連続で同じ金額を避けるため

    // =============================================
    // DOM要素
    // =============================================
    const questionText = document.getElementById('question-text');
    const currentTotalSpan = document.getElementById('current-total');
    const dropTray = document.getElementById('drop-tray');
    const walletContainer = document.querySelector('.coin-container');
    const successOverlay = document.getElementById('success-overlay');
    const nextButton = document.getElementById('next-button');
    const resetButton = document.getElementById('reset-button');
    const payButton = document.getElementById('pay-button');
    const levelIndicator = document.getElementById('level-indicator');
    const stageSidebar = document.getElementById('stage-sidebar');
    const stageButtons = stageSidebar.querySelectorAll('.stage-btn');
    let coins = document.querySelectorAll('.coin');

    // =============================================
    // サイドバー
    // =============================================
    function updateSidebarActive() {
        stageButtons.forEach(function (btn, i) {
            if (i === currentStageIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    stageButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var idx = parseInt(btn.dataset.stage, 10);
            if (idx === currentStageIndex) return;
            currentStageIndex = idx;
            currentQuestionIndex = 0;
            lastAmount = -1;
            updateSidebarActive();
            initQuestion();
        });
    });

    // =============================================
    // ランダム金額の生成（連続同額を回避）
    // =============================================
    function pickRandomAmount(stage) {
        var pool = stage.amounts;
        // 連続を避ける: 前回と同じ金額を除外
        var filtered = pool.filter(function (a) { return a !== lastAmount; });
        if (filtered.length === 0) filtered = pool; // フォールバック
        var idx = Math.floor(Math.random() * filtered.length);
        var amount = filtered[idx];
        lastAmount = amount;
        return amount;
    }

    // =============================================
    // お財布のコインを動的に生成
    // お財布の合計 >= 出題金額を保証
    // =============================================
    function buildWallet(stage, targetAmount) {
        walletContainer.innerHTML = '';
        dropTray.innerHTML = '';

        var walletCoins = stage.walletCoins.slice();

        // お財布の合計が足りるか確認
        var walletTotal = walletCoins.reduce(function (s, c) { return s + c; }, 0);
        if (walletTotal < targetAmount) {
            var smallest = Math.min.apply(null, stage.coinTypes);
            while (walletTotal < targetAmount) {
                walletCoins.push(smallest);
                walletTotal += smallest;
            }
        }

        // 金額ごとにグループ化 (降順: 大きいコインが先)
        var counts = {};
        walletCoins.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
        var denominations = Object.keys(counts).map(Number).sort(function (a, b) { return b - a; });

        denominations.forEach(function (value) {
            var count = counts[value];
            // 3枚以下なら個別表示、4枚以上ならグループ（束）表示
            if (count <= 3) {
                for (var i = 0; i < count; i++) {
                    walletContainer.appendChild(createCoinElement(value));
                }
            } else {
                // グループ表示: 全コインを重ねて見せ、バッジで枚数表示
                var group = document.createElement('div');
                group.classList.add('coin-group');
                for (var i = 0; i < count; i++) {
                    group.appendChild(createCoinElement(value));
                }
                walletContainer.appendChild(group);
            }
        });
    }

    // コイン要素を1つ作る
    function createCoinElement(value) {
        var div = document.createElement('div');
        div.classList.add('coin');
        div.setAttribute('draggable', 'true');
        div.dataset.value = value;

        if (value === 1) {
            div.classList.add('coin-1');
            div.textContent = '1';
        } else if (value === 5) {
            div.classList.add('coin-5');
            var span = document.createElement('span');
            span.textContent = '5';
            div.appendChild(span);
        } else if (value === 10) {
            div.classList.add('coin-10');
            div.textContent = '10';
        } else if (value === 50) {
            div.classList.add('coin-50');
            var span = document.createElement('span');
            span.textContent = '50';
            div.appendChild(span);
        } else if (value === 100) {
            div.classList.add('coin-100');
            div.textContent = '100';
        } else if (value === 500) {
            div.classList.add('coin-500');
            div.textContent = '500';
        }

        return div;
    }

    // =============================================
    // 初期化
    // =============================================
    function initQuestion() {
        waitingForNext = false;
        var stage = stages[currentStageIndex];

        // ランダムに金額を選ぶ
        currentTargetAmount = pickRandomAmount(stage);

        questionText.textContent = currentTargetAmount + '円 はらってください';
        levelIndicator.textContent =
            stage.name + '（' + stage.description + '）　' +
            (currentQuestionIndex + 1) + 'もん／' + QUESTIONS_PER_STAGE + 'もん';

        // お財布を再構成
        buildWallet(stage, currentTargetAmount);

        // リセット
        currentTotal = 0;
        updateTotalDisplay();

        successOverlay.classList.add('hidden');
        payButton.disabled = false;
        payButton.textContent = 'はらう 💴';

        updateSidebarActive();
        setupDragAndDrop();
    }

    function updateTotalDisplay() {
        currentTotalSpan.textContent = currentTotal;
    }

    // =============================================
    // 「はらう」ボタン → 答え確認
    // =============================================
    function checkAnswer() {
        if (waitingForNext) return;

        if (currentTotal === currentTargetAmount) {
            // 正解！
            waitingForNext = true;
            payButton.disabled = true;
            setTimeout(function () {
                successOverlay.classList.remove('hidden');
            }, 200);
        } else if (currentTotal === 0) {
            shakePayButton('コインを いれてね！');
        } else if (currentTotal > currentTargetAmount) {
            shakePayButton('おおすぎるよ！ コインを もどしてね');
        } else {
            shakePayButton('もう すこし！ あと ' + (currentTargetAmount - currentTotal) + '円');
        }
    }

    function shakePayButton(msg) {
        payButton.textContent = msg;
        payButton.classList.add('shake');
        setTimeout(function () {
            payButton.classList.remove('shake');
            payButton.textContent = 'はらう 💴';
        }, 1200);
    }

    payButton.addEventListener('click', checkAnswer);

    // =============================================
    // つぎへ / ステージクリア
    // =============================================
    function advanceQuestion() {
        currentQuestionIndex++;

        if (currentQuestionIndex >= QUESTIONS_PER_STAGE) {
            currentQuestionIndex = 0;
            currentStageIndex++;

            if (currentStageIndex >= stages.length) {
                currentStageIndex = 0;
                lastAmount = -1;
                showStageClear('すべての ステージを クリア！\nほんとうに すごい！！ 🌟');
                return;
            }
            lastAmount = -1;
            showStageClear(stages[currentStageIndex - 1].name + ' クリア！ 🎉\nつぎは ' + stages[currentStageIndex].name + ' だよ！');
            return;
        }
        initQuestion();
    }

    nextButton.addEventListener('click', advanceQuestion);

    function showStageClear(message) {
        successOverlay.classList.remove('hidden');
        var h2 = successOverlay.querySelector('h2');
        var origText = h2.textContent;
        h2.textContent = message;
        h2.style.whiteSpace = 'pre-line';

        nextButton.textContent = 'よし！ つぎへ！ 🚀';

        var resumeHandler = function () {
            h2.textContent = origText;
            h2.style.whiteSpace = '';
            nextButton.textContent = 'つぎの もんだいへ';
            nextButton.removeEventListener('click', resumeHandler);
            nextButton.addEventListener('click', advanceQuestion);
            initQuestion();
        };

        nextButton.removeEventListener('click', advanceQuestion);
        nextButton.addEventListener('click', resumeHandler);
    }

    resetButton.addEventListener('click', initQuestion);

    // =============================================
    // ドラッグ＆ドロップ
    // =============================================
    function setupDragAndDrop() {
        coins = document.querySelectorAll('.coin');
        coins.forEach(function (coin) {
            coin.addEventListener('dragstart', handleDragStart);
            coin.addEventListener('dragend', handleDragEnd);
            coin.addEventListener('touchstart', handleTouchStart, { passive: false });
            coin.addEventListener('touchmove', handleTouchMove, { passive: false });
            coin.addEventListener('touchend', handleTouchEnd);
        });
    }

    var draggedItem = null;

    function handleDragStart(e) {
        draggedItem = this;
        setTimeout(function () { draggedItem && draggedItem.classList.add('dragging'); }, 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.value);
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        draggedItem = null;
        dropTray.classList.remove('drag-over');
    }

    dropTray.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dropTray.classList.add('drag-over');
    });
    dropTray.addEventListener('dragleave', function () { dropTray.classList.remove('drag-over'); });
    dropTray.addEventListener('drop', function (e) {
        e.preventDefault();
        dropTray.classList.remove('drag-over');
        if (draggedItem && draggedItem.parentElement !== dropTray) {
            dropTray.appendChild(draggedItem);
            currentTotal += parseInt(draggedItem.dataset.value, 10);
            updateTotalDisplay();
        }
    });

    walletContainer.addEventListener('dragover', function (e) { e.preventDefault(); });
    walletContainer.addEventListener('drop', function (e) {
        e.preventDefault();
        if (draggedItem && draggedItem.parentElement === dropTray) {
            walletContainer.appendChild(draggedItem);
            currentTotal -= parseInt(draggedItem.dataset.value, 10);
            updateTotalDisplay();
        }
    });

    // タッチ対応
    var touchOffsetX = 0, touchOffsetY = 0;

    function handleTouchStart(e) {
        draggedItem = this;
        document.body.style.overflow = 'hidden';
        var touch = e.touches[0];
        var rect = this.getBoundingClientRect();
        touchOffsetX = touch.clientX - rect.left;
        touchOffsetY = touch.clientY - rect.top;
        this.classList.add('dragging');
        this.style.position = 'fixed';
        this.style.zIndex = 1000;
        this.style.left = touch.clientX - touchOffsetX + 'px';
        this.style.top = touch.clientY - touchOffsetY + 'px';
    }

    function handleTouchMove(e) {
        if (!draggedItem) return;
        e.preventDefault();
        var touch = e.touches[0];
        draggedItem.style.left = touch.clientX - touchOffsetX + 'px';
        draggedItem.style.top = touch.clientY - touchOffsetY + 'px';
    }

    function handleTouchEnd(e) {
        if (!draggedItem) return;
        document.body.style.overflow = '';
        draggedItem.classList.remove('dragging');
        draggedItem.style.position = '';
        draggedItem.style.zIndex = '';
        draggedItem.style.left = '';
        draggedItem.style.top = '';

        var touch = e.changedTouches[0];
        var els = document.elementsFromPoint(touch.clientX, touch.clientY);
        var onTray = false, onWallet = false;
        for (var i = 0; i < els.length; i++) {
            if (els[i] === dropTray || els[i].classList.contains('tray-area')) onTray = true;
            if (els[i] === walletContainer || els[i].classList.contains('wallet-area')) onWallet = true;
        }

        if (onTray && draggedItem.parentElement !== dropTray) {
            dropTray.appendChild(draggedItem);
            currentTotal += parseInt(draggedItem.dataset.value, 10);
            updateTotalDisplay();
        } else if (onWallet && draggedItem.parentElement === dropTray) {
            walletContainer.appendChild(draggedItem);
            currentTotal -= parseInt(draggedItem.dataset.value, 10);
            updateTotalDisplay();
        } else {
            draggedItem.parentElement.appendChild(draggedItem);
        }

        draggedItem = null;
        dropTray.classList.remove('drag-over');
    }

    // =============================================
    // スタート
    // =============================================
    initQuestion();
});
