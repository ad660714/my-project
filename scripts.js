let db;
const DB_NAME = 'FitnessAppDB';
const USER_STORE = 'users';
const PROGRESS_STORE = 'progress';
const WEIGHT_STORE = 'weight';
let currentUser = null;
let weightChart, bodyWeightChart;
let timerInterval;

const ACHIEVEMENTS = {
    'squat10': { name: '深蹲大师', desc: '完成10次深蹲', unlocked: false },
    '30days': { name: '铁人30天', desc: '坚持训练30天', unlocked: false }
};

function initDB() {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = event => {
        db = event.target.result;
        const stores = ['users', 'progress', 'weight'];
        stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                if (storeName === 'users') db.createObjectStore(storeName, { keyPath: 'username' });
                else db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            }
        });
    };
    request.onsuccess = event => {
        db = event.target.result;
        checkLoginStatus();
    };
    request.onerror = event => console.error('IndexedDB 初始化失败:', event.target.error);
}

function checkLoginStatus() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateUserInterface();
    } else {
        currentUser = null;
        if (window.location.pathname.includes('training.html') || window.location.pathname.includes('weight.html')) {
            window.location.href = 'index.html';
        }
    }
}

function updateUserInterface() {
    const nameSpan = document.getElementById('user-name');
    const weightSpan = document.getElementById('user-weight');
    const heightSpan = document.getElementById('user-height');
    if (nameSpan && weightSpan && heightSpan && currentUser) {
        nameSpan.textContent = currentUser.username;
        weightSpan.textContent = currentUser.weight || '未记录';
        heightSpan.textContent = currentUser.height || '未记录';
        calculateBMI();
    }
}

function calculateBMI() {
    if (currentUser && currentUser.weight && currentUser.height) {
        const bmi = (currentUser.weight / ((currentUser.height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi').textContent = `BMI: ${bmi}`;
    } else {
        document.getElementById('bmi').textContent = 'BMI: 未记录';
    }
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const transaction = db.transaction([USER_STORE], 'readonly');
    const store = transaction.objectStore(USER_STORE);
    const request = store.get(username);

    request.onsuccess = () => {
        const user = request.result;
        if (user && user.password === password) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            alert('登录成功！');
            window.location.href = 'training.html';
        } else {
            alert('用户名或密码错误！');
        }
    };
}

function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const weight = parseFloat(document.getElementById('register-weight').value);
    const height = parseFloat(document.getElementById('register-height').value);
    const fitnessLevel = document.getElementById('fitness-level').value;
    const goal = document.getElementById('goal').value;

    if (!username || !password || isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
        alert('请正确填写所有字段！');
        return;
    }

    const newUser = { username, password, weight, height, fitnessLevel, goal, weights: [] };
    const transaction = db.transaction([USER_STORE], 'readwrite');
    const store = transaction.objectStore(USER_STORE);
    const request = store.get(username);

    request.onsuccess = () => {
        if (request.result) {
            alert('用户名已存在！');
            return;
        }
        store.add(newUser);
        transaction.oncomplete = () => {
            alert('注册成功！请登录。');
            showLogin();
        };
    };
}

function showRegister() {
    document.querySelector('.login-form').classList.remove('active');
    document.querySelector('.register-form').classList.add('active');
}

function showLogin() {
    document.querySelector('.register-form').classList.remove('active');
    document.querySelector('.login-form').classList.add('active');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function renderTrainingPlan() {
    const days = [
        { day: '周一', focus: '胸部', exercises: [
            { name: '杠铃卧推', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7' },
            { name: '哑铃上斜推', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pF' },
            { name: '蝴蝶机夹胸', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pG' }
        ]},
        { day: '周二', focus: '背部', exercises: [
            { name: '杠铃划船', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h8' },
            { name: '引体向上', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pI' },
            { name: '坐姿划船机', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pJ' }
        ]},
        { day: '周三', focus: '腿部', exercises: [
            { name: '杠铃深蹲', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h9' },
            { name: '腿举机', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pL' },
            { name: '腿部伸展机', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pM' }
        ]},
        { day: '周四', focus: '肩部', exercises: [
            { name: '杠铃推举', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7hA' },
            { name: '哑铃侧平举', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pO' },
            { name: '哑铃前平举', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pP' }
        ]},
        { day: '周五', focus: '手臂', exercises: [
            { name: '哑铃二头弯举', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pK' },
            { name: '杠铃三头下压', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pH' },
            { name: '仰卧臂屈伸', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pQ' }
        ]},
        { day: '周六', rest: true },
        { day: '周日', rest: true }
    ];

    const today = new Date().toLocaleDateString('zh-CN', { weekday: 'long' }).replace('星期', '周');
    const todayPlan = days.find(d => d.day === today) || { day: today, rest: true };

    document.getElementById('today-training').innerHTML = `
        <h3>今日训练 (${today})</h3>
        <p>${todayPlan.rest ? '休息日 - 建议进行轻度活动或完全休息。' : `${todayPlan.focus}: ${todayPlan.exercises.map(e => e.name).join(', ')}`}</p>
    `;
}

function toggleVideo(id) {
    const videoDiv = document.getElementById(`video_${id}`);
    if (videoDiv) {
        const currentDisplay = videoDiv.style.display;
        videoDiv.style.display = currentDisplay === 'none' ? 'block' : 'none';
        if (currentDisplay === 'none') {
            const iframe = videoDiv.querySelector('iframe');
            if (iframe) iframe.src = iframe.src;
        }
    }
}

function toggleDetails(id) {
    const details = document.getElementById(id);
    if (details) {
        const isHidden = details.getAttribute('aria-hidden') === 'true';
        details.setAttribute('aria-hidden', !isHidden);
        if (!isHidden && currentUser) {
            const restTime = { beginner: 120, intermediate: 90, advanced: 60 }[currentUser.fitnessLevel || 'intermediate'];
            startTimer(restTime, details.querySelector('button').textContent);
        } else {
            clearInterval(timerInterval);
        }
    }
}

function saveProgress(event, exerciseName) {
    event.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(event.target);
    const weight = parseFloat(formData.get('weight'));
    const reps = parseInt(formData.get('reps'));
    const date = new Date().toISOString().split('T')[0];

    if (!weight || isNaN(weight) || !reps || isNaN(reps) || weight <= 0 || reps <= 0) {
        alert('请正确填写重量和次数！');
        return;
    }

    const progressRecord = { exercise: exerciseName, weight, reps, date, user: currentUser.username };
    const transaction = db.transaction([PROGRESS_STORE], 'readwrite');
    const store = transaction.objectStore(PROGRESS_STORE);
    store.add(progressRecord);

    transaction.oncomplete = () => {
        alert('训练记录已保存！');
        event.target.reset();
        renderProgressCharts();
        checkAchievements();
        displayTrainingRecords();
    };
}

function saveWeight(event) {
    event.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(event.target);
    const weight = parseFloat(formData.get('weight'));
    const date = formData.get('date');

    if (!weight || isNaN(weight) || weight <= 0 || !date) {
        alert('请正确填写体重和日期！');
        return;
    }

    const weightRecord = { weight, date, user: currentUser.username };
    const transaction = db.transaction([WEIGHT_STORE], 'readwrite');
    const store = transaction.objectStore(WEIGHT_STORE);
    store.add(weightRecord);

    transaction.oncomplete = () => {
        alert('体重已保存！');
        event.target.reset();
        updateUserWeight(weightRecord);
    };
}

function updateUserWeight(weightRecord) {
    const transaction = db.transaction([USER_STORE], 'readwrite');
    const store = transaction.objectStore(USER_STORE);
    const request = store.get(currentUser.username);

    request.onsuccess = () => {
        const user = request.result;
        if (user) {
            user.weights = user.weights || [];
            user.weights.push(weightRecord);
            user.weight = weightRecord.weight;
            store.put(user);
            localStorage.setItem('currentUser', JSON.stringify(user));
            currentUser = user;
            updateUserInterface();
            renderProgressCharts();
            calculateBMI();
        }
    };
}

function clearProgress() {
    if (confirm('确定清除所有记录吗？')) {
        const transaction = db.transaction([WEIGHT_STORE, PROGRESS_STORE], 'readwrite');
        transaction.objectStore(WEIGHT_STORE).clear();
        transaction.objectStore(PROGRESS_STORE).clear();
        transaction.oncomplete = () => {
            alert('记录已清除！');
            location.reload();
        };
    }
}

function renderProgressCharts() {
    if (!currentUser) return;

    const weightTx = db.transaction([WEIGHT_STORE], 'readonly');
    const weightStore = weightTx.objectStore(WEIGHT_STORE);
    const weightRequest = weightStore.index('user').getAll(currentUser.username);

    weightRequest.onsuccess = () => {
        const weightData = weightRequest.result.map(w => ({ x: w.date, y: w.weight }));
        if (bodyWeightChart) bodyWeightChart.destroy();
        bodyWeightChart = new Chart(document.getElementById('bodyWeightChart'), {
            type: 'line',
            data: { datasets: [{ label: '体重 (kg)', data: weightData }] },
            options: { scales: { x: { type: 'time' } } }
        });
    };
}

function displayTrainingRecords() {
    if (!currentUser) return;

    const progressTx = db.transaction([PROGRESS_STORE], 'readonly');
    const store = progressTx.objectStore(PROGRESS_STORE);
    const request = store.index('user').getAll(currentUser.username);

    request.onsuccess = () => {
        const records = request.result;
        const recordsDiv = document.getElementById('training-records');
        if (recordsDiv) {
            recordsDiv.innerHTML = '<h3>训练记录</h3>' + (records.length ? records.map(r => `
                <p>${r.date}: ${r.exercise} - 重量: ${r.weight}kg, 次数: ${r.reps}</p>
            `).join('') : '<p>暂无训练记录</p>');
        }
    };
}

function checkAchievements() {
    const progressTx = db.transaction([PROGRESS_STORE], 'readonly');
    const store = progressTx.objectStore(PROGRESS_STORE);
    const request = store.index('user').getAll(currentUser.username);

    request.onsuccess = () => {
        const records = request.result;
        if (records.some(r => r.exercise === '杠铃深蹲' && r.reps >= 10)) ACHIEVEMENTS.squat10.unlocked = true;
        const daysTrained = new Set(records.map(r => r.date)).size;
        if (daysTrained >= 30) ACHIEVEMENTS['30days'].unlocked = true;

        displayAchievements();
    };
}

function displayAchievements() {
    const achDiv = document.getElementById('achievements') || document.createElement('div');
    achDiv.id = 'achievements';
    achDiv.innerHTML = '<h3>成就</h3>' + Object.values(ACHIEVEMENTS)
        .map(a => `<p>${a.name}: ${a.unlocked ? '✅ ' + a.desc : '🔒 ' + a.desc}</p>`)
        .join('');
    document.querySelector('.container').appendChild(achDiv);
}

function startTimer(duration, exerciseName) {
    let timeLeft = duration;
    const timerDisplay = document.getElementById('timer') || document.createElement('div');
    timerDisplay.id = 'timer';
    document.querySelector('.container').appendChild(timerDisplay);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerDisplay.textContent = `休息时间：${timeLeft} 秒`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.remove();
        }
        timeLeft--;
    }, 1000);
}

function analyzeTrainingProgress() {
    if (!currentUser || !currentUser.weights || currentUser.weights.length < 2) return;

    const weights = currentUser.weights.map(w => w.weight);
    const trend = (weights[weights.length - 1] - weights[0]) / (weights.length - 1);
    let suggestion = '';

    if (trend > 0.5) {
        suggestion = '恭喜！你的体重增加，建议增加训练重量或蛋白质摄入。';
    } else if (trend < -0.5) {
        suggestion = '体重下降，可能是训练不足或热量不足，建议调整饮食或增加休息。';
    } else {
        suggestion = '体重稳定，保持当前计划，继续努力！';
    }

    document.getElementById('training-suggestion').innerHTML = `<p>${suggestion}</p>`;
    document.getElementById('training-suggestion').setAttribute('aria-hidden', 'false');
}

function calculateNutrition(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const activityLevel = parseFloat(formData.get('activity-level'));
    const weight = currentUser.weight;
    const bmr = 10 * weight + 6.25 * currentUser.height - 5 * 25 + 5;
    const tdee = bmr * activityLevel;
    const fatLossCalories = tdee - 500; // 减脂热量：每日减少500千卡

    document.getElementById('nutrition-result').innerHTML = `
        <p>减脂建议每日热量摄入: ${Math.round(fatLossCalories)} 千卡</p>
        <p>建议蛋白质摄入: ${Math.round(weight * 1.6)} 克</p>
    `;
}

function calculateWeight(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const weight = parseFloat(formData.get('weight'));
    const date = formData.get('date');

    if (!weight || isNaN(weight) || weight <= 0 || !date) {
        alert('请正确填写体重和日期！');
        return;
    }

    const weightRecord = { weight, date, user: currentUser.username };
    const transaction = db.transaction([WEIGHT_STORE], 'readwrite');
    const store = transaction.objectStore(WEIGHT_STORE);
    store.add(weightRecord);

    transaction.oncomplete = () => {
        alert('体重已保存！');
        event.target.reset();
        updateUserWeight(weightRecord);
    };
}

// 主题切换
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// 离线支持注册
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(() => {
        console.log('Service Worker 注册成功');
    });
}

window.addEventListener('load', () => {
    initDB();
    checkLoginStatus();
    if (document.getElementById('training-table')) renderTrainingPlan();
    renderProgressCharts();
    displayTrainingRecords();
});