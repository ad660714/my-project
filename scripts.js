let db;
const DB_NAME = 'FitnessAppDB';
const USER_STORE = 'users';
const PROGRESS_STORE = 'progress';
const WEIGHT_STORE = 'weight';
let currentUser = null;
let weightChart, bodyWeightChart;

function initDB() {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = event => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(USER_STORE)) db.createObjectStore(USER_STORE, { keyPath: 'username' });
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) db.createObjectStore(PROGRESS_STORE, { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains(WEIGHT_STORE)) db.createObjectStore(WEIGHT_STORE, { keyPath: 'id', autoIncrement: true });
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

    if (!username || !password || isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
        alert('请正确填写所有字段！');
        return;
    }

    const newUser = { username, password, weight, height, weights: [] };
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
        { day: '周一', exercises: [
            { name: '杠铃卧推 (Barbell Bench Press)', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7' }, // 杠铃卧推
            { name: '哑铃上斜推 (Incline Dumbbell Press)', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pF' }, // 哑铃上斜推
            { name: '蝴蝶机夹胸 (Pec Deck Fly)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pG' }, // 蝴蝶机夹胸
            { name: '杠铃三头下压 (Tricep Pushdown with Cable)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pH' } // 杠铃三头下压
        ]},
        { day: '周二', exercises: [
            { name: '杠铃划船 (Barbell Row)', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h8' }, // 杠铃划船
            { name: '引体向上 (Pull-Ups)', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pI' }, // 引体向上
            { name: '坐姿划船机 (Seated Cable Row)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pJ' }, // 坐姿划船机
            { name: '哑铃二头弯举 (Dumbbell Bicep Curl)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pK' } // 哑铃二头弯举
        ]},
        { day: '周三', exercises: [
            { name: '杠铃深蹲 (Barbell Squat)', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h9' }, // 杠铃深蹲
            { name: '腿举机 (Leg Press)', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pL' }, // 腿举机
            { name: '腿部伸展机 (Leg Extension)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pM' }, // 腿部伸展机
            { name: '腿部弯曲机 (Leg Curl)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pN' } // 腿部弯曲机
        ]},
        { day: '周四', exercises: [
            { name: '杠铃推举 (Overhead Barbell Press)', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7hA' }, // 杠铃推举
            { name: '哑铃侧平举 (Lateral Raise)', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pO' }, // 哑铃侧平举
            { name: '哑铃前平举 (Front Raise)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pP' }, // 哑铃前平举
            { name: '仰卧臂屈伸 (Lying Tricep Extension)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pQ' } // 仰卧臂屈伸
        ]},
        { day: '周五', exercises: [
            { name: '哑铃单臂划船 (Dumbbell Single-Arm Row)', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7hB' }, // 哑铃单臂划船
            { name: '俯卧撑 (Push-Ups, 可加负重)', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pR' }, // 俯卧撑
            { name: '哑铃锤式弯举 (Hammer Curl)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pS' }, // 哑铃锤式弯举
            { name: '耸肩 (Shrugs with Dumbbells)', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pT' } // 耸肩
        ]},
        { day: '周六', rest: true },
        { day: '周日', rest: true }
    ];

    const table = document.getElementById('training-table');
    table.innerHTML = '<thead><tr><th>星期</th><th>训练内容</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');

    days.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td${d.rest ? ' class="rest-day"' : ''}>${d.day}</td><td${d.rest ? ' class="rest-day"' : ''}></td>`;
        const td = tr.querySelector('td:last-child');

        if (d.rest) {
            td.innerHTML = '<p>休息日 - 建议进行轻度活动或完全休息。</p>';
        } else {
            d.exercises.forEach((exercise, i) => {
                const id = `${d.day}_exercise_${i}`;
                let videoButton = exercise.video ? `<button class="exercise" onclick="toggleVideo('${id}')">查看示范</button>` : '';
                td.innerHTML += `
                    <button class="exercise" onclick="toggleDetails('${id}')">${exercise.name}</button>
                    <div id="${id}" class="details">
                        <p>组数：3-4 组 x 8-12 次，休息 60-90 秒</p>
                        <p>调整重量以确保最后一两重复有挑战性但仍能保持正确姿势</p>
                        ${videoButton}
                        <div id="video_${id}" class="video-container" style="display: none;">
                            ${exercise.video ? `<iframe width="560" height="315" src="${exercise.video}" scrolling="no" border="0" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        tbody.appendChild(tr);
    });
}

function toggleVideo(id) {
    const videoDiv = document.getElementById(`video_${id}`);
    if (videoDiv) {
        const currentDisplay = videoDiv.style.display;
        videoDiv.style.display = currentDisplay === 'none' ? 'block' : 'none';
        if (currentDisplay === 'none') {
            const iframe = videoDiv.querySelector('iframe');
            if (iframe) {
                iframe.src = iframe.src; // 重新加载 iframe 以确保播放
            }
        }
    } else {
        console.error(`Video container for ${id} not found`);
    }
}

function toggleDetails(id) {
    const details = document.getElementById(id);
    if (details) {
        const isHidden = details.getAttribute('aria-hidden') === 'true';
        details.setAttribute('aria-hidden', !isHidden);
    }
}

function saveWeight(event) {
    event.preventDefault();
    if (!currentUser) return;

    const form = event.target;
    const formData = new FormData(form);
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
        form.reset();
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

// 主题切换
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

window.addEventListener('load', () => {
    initDB();
    checkLoginStatus();
    if (document.getElementById('training-table')) renderTrainingPlan();
});