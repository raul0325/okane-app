/* ========================================
   おかねの けいさん — アプリケーションロジック
   位取り表（ひゃく・じゅう・いち）バージョン
   位ごと入力 + 数字連結表示 + 先頭0スキップ
   ======================================== */

// --- レベル設定 ---
const LEVEL_PLACES = {
    1: [10, 1],
    2: [10, 1],
    3: [100, 10, 1],
    4: [100, 10, 1],
};

const COIN_IMAGES = {
    100: 'img/100yen.png',
    50: 'img/50yen.png',
    10: 'img/10yen.png',
    5: 'img/5yen.png',
    1: 'img/1yen.png',
};

const PLACE_HEADERS = {
    100: 'ひゃく',
    10: 'じゅう',
    1: 'いち',
};

const PLACE_COINS = {
    100: { half: null, base: 100 },
    10: { half: 50, base: 10 },
    1: { half: 5, base: 1 },
};

const TOTAL_QUESTIONS = 10;

// --- DOM要素 ---
const screenTop = document.getElementById('screen-top');
const screenGame = document.getElementById('screen-game');
const screenResult = document.getElementById('screen-result');
const btnStart = document.getElementById('btn-start');
const btnDelete = document.getElementById('btn-delete');
const btnSubmit = document.getElementById('btn-submit');
const btnRetry = document.getElementById('btn-retry');
const btnBack = document.getElementById('btn-back');
const btnGameBack = document.getElementById('btn-game-back');
const questionCounter = document.getElementById('question-counter');
const timerDisplay = document.getElementById('timer');
const placeValueTable = document.getElementById('place-value-table');
const answerDisplay = document.getElementById('answer-display');
const feedbackArea = document.getElementById('feedback-area');
const feedbackContent = document.getElementById('feedback-content');
const clearTimeDisplay = document.getElementById('clear-time');
const hanamaruImg = document.getElementById('hanamaru-img');

// --- ゲーム状態 ---
let currentLevel = null;
let currentQuestion = 0;
let correctDigits = {};
let coinCounts = {};
let activePlaces = [];
let activeColIndex = 0;
let colInputValues = {};
let timerInterval = null;
let startTime = 0;
let elapsedTime = 0;
let audioCtx = null;

// --- 初期化 ---
function init() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentLevel = parseInt(btn.dataset.level);
            btnStart.disabled = false;
        });
    });

    btnStart.addEventListener('click', () => {
        if (currentLevel) startGame();
    });

    document.querySelectorAll('.num-btn[data-num]').forEach(btn => {
        btn.addEventListener('click', () => addDigit(btn.dataset.num));
    });

    btnDelete.addEventListener('click', deleteDigit);
    btnSubmit.addEventListener('click', checkAnswer);
    btnRetry.addEventListener('click', () => startGame());
    btnBack.addEventListener('click', () => goToLevelSelect());
    btnGameBack.addEventListener('click', () => goToLevelSelect());
}

function goToLevelSelect() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    showScreen('top');
}

// --- 画面切り替え ---
function showScreen(name) {
    screenTop.classList.remove('active');
    screenGame.classList.remove('active');
    screenResult.classList.remove('active');
    if (name === 'top') screenTop.classList.add('active');
    if (name === 'game') screenGame.classList.add('active');
    if (name === 'result') screenResult.classList.add('active');
}

function startGame() {
    currentQuestion = 0;
    elapsedTime = 0;
    showScreen('game');
    startTimer();
    nextQuestion();
}

// --- タイマー ---
function startTimer() {
    startTime = Date.now();
    timerDisplay.textContent = '0.0 びょう';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedTime = (Date.now() - startTime) / 1000;
        timerDisplay.textContent = elapsedTime.toFixed(1) + ' びょう';
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    elapsedTime = (Date.now() - startTime) / 1000;
}

// --- 問題生成 ---
function nextQuestion() {
    currentQuestion++;
    updateQuestionCounter();
    generateQuestion();
}

function updateQuestionCounter() {
    questionCounter.textContent = currentQuestion + ' / ' + TOTAL_QUESTIONS + ' もんめ';
}

function generateQuestion() {
    coinCounts = {};
    correctDigits = {};
    colInputValues = {};
    activePlaces = [...LEVEL_PLACES[currentLevel]];

    activePlaces.forEach(place => {
        colInputValues[place] = '';
    });

    if (currentLevel === 1) {
        const tens = randomInt(0, 9);
        const ones = randomInt(0, 9);
        if (tens === 0 && ones === 0) {
            correctDigits[10] = randomInt(1, 9);
            correctDigits[1] = randomInt(0, 9);
        } else {
            correctDigits[10] = tens;
            correctDigits[1] = ones;
        }
        coinCounts[10] = correctDigits[10];
        coinCounts[1] = correctDigits[1];

    } else if (currentLevel === 2) {
        const tens = randomInt(0, 9);
        const ones = randomInt(0, 9);
        if (tens === 0 && ones === 0) {
            correctDigits[10] = randomInt(5, 9);
            correctDigits[1] = randomInt(0, 9);
        } else {
            correctDigits[10] = tens;
            correctDigits[1] = ones;
        }
        mapToCoins(10, correctDigits[10], true);
        mapToCoins(1, correctDigits[1], true);

    } else if (currentLevel === 3) {
        const hundreds = randomInt(0, 9);
        const tens = randomInt(0, 9);
        const ones = randomInt(0, 9);
        if (hundreds === 0 && tens === 0 && ones === 0) {
            correctDigits[100] = randomInt(1, 9);
            correctDigits[10] = randomInt(0, 9);
            correctDigits[1] = randomInt(0, 9);
        } else {
            correctDigits[100] = hundreds;
            correctDigits[10] = tens;
            correctDigits[1] = ones;
        }
        coinCounts[100] = correctDigits[100];
        coinCounts[10] = correctDigits[10];
        coinCounts[1] = correctDigits[1];

    } else if (currentLevel === 4) {
        const hundreds = randomInt(0, 9);
        const tens = randomInt(0, 9);
        const ones = randomInt(0, 9);
        if (hundreds === 0 && tens === 0 && ones === 0) {
            correctDigits[100] = randomInt(1, 9);
            correctDigits[10] = randomInt(0, 9);
            correctDigits[1] = randomInt(0, 9);
        } else {
            correctDigits[100] = hundreds;
            correctDigits[10] = tens;
            correctDigits[1] = ones;
        }
        coinCounts[100] = correctDigits[100];
        mapToCoins(10, correctDigits[10], false);
        mapToCoins(1, correctDigits[1], false);
    }

    activeColIndex = 0;
    feedbackContent.innerHTML = '';
    renderPlaceValueTable();
    updateAnswerDisplay();
    highlightActiveCell();
}

function mapToCoins(place, digit, alwaysHalf) {
    const half = PLACE_COINS[place].half;
    const base = PLACE_COINS[place].base;

    if (digit >= 5 && half) {
        if (alwaysHalf || Math.random() < 0.5) {
            coinCounts[half] = 1;
            coinCounts[base] = digit - 5;
        } else {
            coinCounts[half] = 0;
            coinCounts[base] = digit;
        }
    } else {
        if (half) coinCounts[half] = 0;
        coinCounts[base] = digit;
    }
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- 位取り表を描画 ---
function renderPlaceValueTable() {
    let html = '';

    html += '<tr>';
    activePlaces.forEach(place => {
        html += '<th class="pv-header">' + PLACE_HEADERS[place] + '</th>';
    });
    html += '</tr>';

    html += '<tr>';
    activePlaces.forEach(place => {
        html += '<td class="pv-coin-cell">';
        html += renderCoinCell(place);
        html += '</td>';
    });
    html += '</tr>';

    html += '<tr>';
    activePlaces.forEach(place => {
        html += '<td class="pv-input-cell" id="input-cell-' + place + '">';
        html += '<span class="input-value" id="input-val-' + place + '">　</span>';
        html += '</td>';
    });
    html += '</tr>';

    placeValueTable.innerHTML = html;

    activePlaces.forEach((place, idx) => {
        document.getElementById('input-cell-' + place).addEventListener('click', () => {
            activeColIndex = idx;
            highlightActiveCell();
        });
    });
}

function renderCoinCell(place) {
    const pc = PLACE_COINS[place];
    const halfCoin = pc.half;
    const baseCoin = pc.base;
    const halfCount = halfCoin ? (coinCounts[halfCoin] || 0) : 0;
    const baseCount = coinCounts[baseCoin] || 0;
    const total = halfCount + baseCount;

    if (total === 0) return '<div class="coin-cell-inner"></div>';

    let html = '<div class="coin-cell-inner">';

    if (halfCount > 0 && baseCount > 0) {
        html += '<div class="coin-col">';
        for (let i = 0; i < halfCount; i++) html += coinTag(halfCoin);
        html += '</div>';
        html += '<div class="coin-col">';
        for (let i = 0; i < baseCount; i++) html += coinTag(baseCoin);
        html += '</div>';
    } else if (halfCount > 0) {
        html += '<div class="coin-col">';
        for (let i = 0; i < halfCount; i++) html += coinTag(halfCoin);
        html += '</div>';
    } else {
        const rightCount = Math.min(baseCount, 5);
        const leftCount = Math.max(0, baseCount - 5);
        if (leftCount > 0) {
            html += '<div class="coin-col">';
            for (let i = 0; i < leftCount; i++) html += coinTag(baseCoin);
            html += '</div>';
        }
        html += '<div class="coin-col">';
        for (let i = 0; i < rightCount; i++) html += coinTag(baseCoin);
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function coinTag(coin) {
    return '<img src="' + COIN_IMAGES[coin] + '" alt="' + coin + '円" class="coin-img">';
}

// --- アクティブセル ---
function highlightActiveCell() {
    activePlaces.forEach((place, idx) => {
        const cell = document.getElementById('input-cell-' + place);
        cell.classList.toggle('active', idx === activeColIndex);
    });
}

// --- テンキー入力 ---
function addDigit(digit) {
    if (activeColIndex >= activePlaces.length) return;

    const place = activePlaces[activeColIndex];
    colInputValues[place] = digit;
    document.getElementById('input-val-' + place).textContent = digit;
    updateAnswerDisplay();

    if (activeColIndex < activePlaces.length - 1) {
        activeColIndex++;
        highlightActiveCell();
    }
}

function deleteDigit() {
    const place = activePlaces[activeColIndex];
    if (colInputValues[place] !== '') {
        colInputValues[place] = '';
        document.getElementById('input-val-' + place).textContent = '　';
        updateAnswerDisplay();
    } else if (activeColIndex > 0) {
        activeColIndex--;
        const prev = activePlaces[activeColIndex];
        colInputValues[prev] = '';
        document.getElementById('input-val-' + prev).textContent = '　';
        highlightActiveCell();
        updateAnswerDisplay();
    }
}

// --- 解答表示（数字を連結して表示） ---
function updateAnswerDisplay() {
    // 入力された数字を位の順に連結（先頭の空欄はスキップ）
    let display = '';
    let started = false;

    activePlaces.forEach(place => {
        const val = colInputValues[place];
        if (val !== '') {
            display += val;
            started = true;
        } else if (started) {
            // 入力が始まった後の空欄は _ で表示
            display += '_';
        }
    });

    answerDisplay.textContent = display || '　';
}

// --- こたえあわせ ---
function checkAnswer() {
    const hasAnyInput = activePlaces.some(p => colInputValues[p] !== '');
    if (!hasAnyInput) return;

    // 先頭の連続する0を特定
    let firstNonZeroIdx = activePlaces.length;
    for (let i = 0; i < activePlaces.length; i++) {
        if (correctDigits[activePlaces[i]] !== 0) {
            firstNonZeroIdx = i;
            break;
        }
    }

    const allCorrect = activePlaces.every((p, idx) => {
        const input = colInputValues[p];
        const correct = correctDigits[p];

        if (idx < firstNonZeroIdx) {
            // 先頭の0の位：空欄のみOK（0入力は不正解）
            return input === '';
        }

        // それ以外：必ず入力が必要
        if (input === '') return false;
        return parseInt(input, 10) === correct;
    });

    if (allCorrect) {
        showCorrectFeedback();
    } else {
        showWrongFeedback();
    }
}

function showCorrectFeedback() {
    playCorrectSound();
    feedbackContent.innerHTML = '<div class="feedback-correct"><span class="circle">⭕</span></div>';

    setTimeout(() => {
        feedbackContent.innerHTML = '';
        if (currentQuestion >= TOTAL_QUESTIONS) {
            stopTimer();
            showResult();
        } else {
            nextQuestion();
        }
    }, 1000);
}

function showWrongFeedback() {
    playWrongSound();
    feedbackContent.innerHTML = '<div class="feedback-wrong">もういちど<br>やってみよう！</div>';

    setTimeout(() => {
        feedbackContent.innerHTML = '';
        activePlaces.forEach(place => {
            colInputValues[place] = '';
            document.getElementById('input-val-' + place).textContent = '　';
        });
        activeColIndex = 0;
        highlightActiveCell();
        updateAnswerDisplay();
    }, 1200);
}

// --- 結果画面 ---
function showResult() {
    showScreen('result');
    clearTimeDisplay.textContent = elapsedTime.toFixed(1) + ' びょう';
    hanamaruImg.style.animation = 'none';
    void hanamaruImg.offsetHeight;
    hanamaruImg.style.animation = '';
    playCompleteSound();
}

// --- 音声 ---
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playCorrectSound() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) { }
}

function playWrongSound() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) { }
}

function playCompleteSound() {
    try {
        const ctx = getAudioContext();
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
    } catch (e) { }
}

// --- 起動 ---
init();
