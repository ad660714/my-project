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
        if (user && user.password === password) { // 注意：实际应用中应使用哈希密码
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
        { day: '周一', exercises: [{ name: '杠铃卧推', video: 'https://www.youtube.com/embed/YQ4-2ZJ41P8' }, { name: '杠铃肩推' }, { name: '三头肌下压' }, { name: '平板支撑' }] },
        { day: '周二', exercises: [{ name: '硬拉', video: 'https://www.youtube.com/embed/5u1Ck3ZAv3M' }, { name: '引体向上' }, { name: '哑铃弯举' }, { name: '仰卧卷腹' }] },
        { day: '周三', exercises: [{ name: '深蹲', video: 'https://www.youtube.com/embed/AaU57t8nJHw' }, { name: '腿部推蹬机' }, { name: '小腿提踵' }, { name: '仰卧抬腿' }] },
        { day: '周四', exercises: [{ name: '上斜杠铃卧推' }, { name: '哑铃肩推' }, { name: '仰卧臂屈伸' }, { name: '俄罗斯扭转' }] },
        { day: '周五', exercises: [{ name: '杠铃划船' }, { name: '高位下拉' }, { name: '锤式弯举' }, { name: '侧平板支撑' }] },
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
                        <p>组数：${i === 0 ? '4 组 x 8-12 次' : '3 组 x 10-15 次'}，休息 ${i === 0 ? '90' : '60'} 秒</p>
                        ${videoButton}
                        <div id="video_${id}" class="video-container" style="display: none;">
                            ${exercise.video ? `<iframe width="560" height="315" src="${exercise.video}" frameborder="0" allowfullscreen></iframe>` : ''}
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
    videoDiv.style.display = videoDiv.style.display === 'none' ? 'block' : 'none';
}

function toggleDetails(id) {
    const details = document.getElementById(id);
    const isHidden = details.getAttribute('aria-hidden') === 'true';
    details.setAttribute('aria-hidden', !isHidden);
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