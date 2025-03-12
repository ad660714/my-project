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

function showLogin() { document.querySelector('.login-form').classList.add('active'); document.querySelector('.register-form').classList.remove('active'); }
function showRegister() { document.querySelector('.register-form').classList.add('active'); document.querySelector('.login-form').classList.remove('active'); }

function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const weight = document.getElementById('register-weight').value;
    const height = document.getElementById('register-height').value;

    if (!username || !password || !weight || !height) {
        alert('请填写所有字段！');
        return;
    }

    const transaction = db.transaction([USER_STORE], 'readwrite');
    const store = transaction.objectStore(USER_STORE);
    const request = store.get(username);

    request.onsuccess = () => {
        if (request.result) {
            alert('用户名已存在！');
        } else {
            const user = { username, password, weight, height, progress: [], weights: [] };
            store.add(user);
            transaction.oncomplete = () => {
                alert('注册成功！请登录。');
                showLogin();
                document.querySelector('.register-form').reset();
            };
        }
    };
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
            window.location.href = 'training.html';
        } else {
            alert('用户名或密码错误！');
        }
    };
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function checkLoginStatus() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        if (document.getElementById('user-name')) {
            document.getElementById('user-name').textContent = currentUser.username;
            document.getElementById('user-weight').textContent = currentUser.weight;
            document.getElementById('user-height').textContent = currentUser.height;
            document.getElementById('user-welcome').style.display = 'block';
        }
    } else if (window.location.pathname !== '/index.html') {
        window.location.href = 'index.html';
    }
}

function saveProgress(event, day) {
    event.preventDefault();
    if (!currentUser) return;

    const form = event.target;
    const formData = new FormData(form);
    const weight = formData.get(`${day}_weight`);
    const sets = formData.get(`${day}_sets`);
    const notes = formData.get('notes');

    if (!weight || isNaN(weight) || weight <= 0 || !sets.match(/^\d+x\d+$/)) {
        alert('请正确填写重量和组数/次数！');
        return;
    }

    const progress = { day, weight, sets, notes, date: new Date().toLocaleString(), user: currentUser.username };
    const transaction = db.transaction([PROGRESS_STORE], 'readwrite');
    const store = transaction.objectStore(PROGRESS_STORE);
    store.add(progress);

    transaction.oncomplete = () => {
        alert('进度已保存！');
        form.reset();
        displayProgress();
        renderCharts();
    };
}

function saveWeight(event) {
    event.preventDefault();
    if (!currentUser) return;

    const form = event.target;
    const formData = new FormData(form);
    const weight = formData.get('weight');
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
        user.weights.push(weightRecord);
        user.weight = weightRecord.weight;
        store.put(user);
        document.getElementById('user-weight').textContent = user.weight;
        localStorage.setItem('currentUser', JSON.stringify(user));
        currentUser = user;
    };
}

function displayProgress() {
    if (!currentUser || !document.getElementById('progress_data')) return;

    const transaction = db.transaction([PROGRESS_STORE], 'readonly');
    const store = transaction.objectStore(PROGRESS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
        const progressData = request.result.filter(p => p.user === currentUser.username);
        const progressDiv = document.getElementById('progress_data');
        progressDiv.innerHTML = '';

        const groupedData = {};
        progressData.forEach(entry => {
            if (!groupedData[entry.day]) groupedData[entry.day] = [];
            groupedData[entry.day].push(entry);
        });

        for (const day in groupedData) {
            progressDiv.innerHTML += `<h3>${day}</h3>`;
            groupedData[day].forEach((entry, index) => {
                progressDiv.innerHTML += `
                    <p>记录 ${index + 1} (${entry.date}):</p>
                    <p>重量: ${entry.weight} kg</p>
                    <p>组数/次数: ${entry.sets}</p>
                    <p>感受: ${entry.notes || '无'}</p>
                    <hr>
                `;
            });
        }
    };
}

function clearProgress() {
    if (confirm('确定要清除所有训练进度吗？')) {
        const transaction = db.transaction([PROGRESS_STORE], 'readwrite');
        const store = transaction.objectStore(PROGRESS_STORE);
        store.clear();
        transaction.oncomplete = () => {
            displayProgress();
            renderCharts();
            alert('所有记录已清除！');
        };
    }
}

function renderCharts() {
    if (!currentUser || !document.getElementById('weightChart')) return;

    const progressTransaction = db.transaction([PROGRESS_STORE], 'readonly');
    const progressStore = progressTransaction.objectStore(PROGRESS_STORE);
    const progressRequest = progressStore.getAll();

    const weightTransaction = db.transaction([WEIGHT_STORE], 'readonly');
    const weightStore = weightTransaction.objectStore(WEIGHT_STORE);
    const weightRequest = weightStore.getAll();

    progressRequest.onsuccess = () => {
        const progressData = progressRequest.result.filter(p => p.user === currentUser.username)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const weightLabels = progressData.map(p => p.date);
        const weightValues = progressData.map(p => parseFloat(p.weight));

        if (weightChart) weightChart.destroy();
        weightChart = new Chart(document.getElementById('weightChart'), {
            type: 'line',
            data: {
                labels: weightLabels,
                datasets: [{ label: '训练重量 (kg)', data: weightValues, borderColor: 'rgba(75, 192, 192, 1)', fill: false }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'top' } } }
        });
    };

    weightRequest.onsuccess = () => {
        const weightData = weightRequest.result.filter(w => w.user === currentUser.username)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const weightLabels = weightData.map(w => w.date);
        const bodyWeightValues = weightData.map(w => parseFloat(w.weight));

        if (bodyWeightChart) bodyWeightChart.destroy();
        bodyWeightChart = new Chart(document.getElementById('bodyWeightChart'), {
            type: 'line',
            data: {
                labels: weightLabels,
                datasets: [{ label: '体重 (kg)', data: bodyWeightValues, borderColor: 'rgba(255, 99, 132, 1)', fill: false }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: false } }, plugins: { legend: { position: 'top' } } }
        });
    };
}

function renderTrainingPlan() {
    const days = [
        { day: '周一', exercises: ['杠铃卧推', '杠铃肩推', '三头肌下压', '平板支撑'] },
        { day: '周二', exercises: ['硬拉', '引体向上', '哑铃弯举', '仰卧卷腹'] },
        { day: '周三', exercises: ['深蹲', '腿部推蹬机', '小腿提踵', '仰卧抬腿'] },
        { day: '周四', exercises: ['上斜杠铃卧推', '哑铃肩推', '仰卧臂屈伸', '俄罗斯扭转'] },
        { day: '周五', exercises: ['杠铃划船', '高位下拉', '锤式弯举', '侧平板支撑'] },
        { day: '周六', rest: true },
        { day: '周日', rest: true }
    ];

    const table = document.getElementById('training-table');
    table.innerHTML = '<thead><tr><th>星期</th><th>训练内容</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');

    days.forEach((d, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td${d.rest ? ' class="rest-day"' : ''}>${d.day}</td><td${d.rest ? ' class="rest-day"' : ''}></td>`;
        const td = tr.querySelector('td:last-child');

        if (d.rest) {
            td.innerHTML = '<p>休息日 - 建议进行轻度活动或完全休息。</p>';
        } else {
            d.exercises.forEach((exercise, i) => {
                const id = `${d.day}_exercise_${i}`;
                td.innerHTML += `
                    <button class="exercise" aria-expanded="false" aria-controls="${id}" onclick="toggleDetails('${id}')">${exercise}</button>
                    <div id="${id}" class="details" aria-hidden="true">
                        <p>组数：${i === 0 ? '4 组 x 8-12 次' : '3 组 x 10-15 次'}，休息 ${i === 0 ? '90' : '60'} 秒</p>
                    </div>
                `;
            });
            td.innerHTML += `
                <button class="exercise" aria-expanded="false" aria-controls="${d.day}_progress" onclick="toggleDetails('${d.day}_progress')">记录训练进度</button>
                <div id="${d.day}_progress" class="details" aria-hidden="true">
                    <form class="progress-form" onsubmit="saveProgress(event, '${d.day}')">
                        <label>${d.exercises[0]} - 重量 (kg):</label>
                        <input type="number" name="${d.day}_weight" placeholder="输入重量" required>
                        <label>${d.exercises[0]} - 组数/次数:</label>
                        <input type="text" name="${d.day}_sets" placeholder="例如 4x10" required>
                        <label>训练感受:</label>
                        <textarea name="notes" placeholder="记录你的感受" rows="3"></textarea>
                        <button type="submit">保存</button>
                    </form>
                </div>
            `;
        }
        tbody.appendChild(tr);
    });
}

function toggleDetails(id) {
    const details = document.getElementById(id);
    const button = document.querySelector(`[aria-controls="${id}"]`);
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', !isExpanded);
    details.setAttribute('aria-hidden', isExpanded);
}

window.addEventListener('load', () => {
    initDB();
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        document.getElementById('theme-toggle').textContent = isDarkMode ? '切换浅色模式' : '切换深色模式';
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').textContent = '切换浅色模式';
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker 注册成功:', reg))
            .catch(err => console.log('Service Worker 注册失败:', err));
    }
});