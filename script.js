let currentUser = null;
let html5QrCode = null;
let allMembersCache = [];

function showSection(sectionId) {
    document.querySelectorAll('.screen').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    if(sectionId === 'dashboard-section') {
        loadDashboardStats();
        loadTodayAttendance();
        stopScanner();
    }
}

async function login() {
    const pin = document.getElementById('pin-input').value;
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
    });
    const data = await response.json();

    if (data.success) {
        currentUser = data;
        document.getElementById('welcome-msg').innerText = data.name;
        if (data.role === 'admin') {
            document.getElementById('excel-btn').style.display = 'block';
        }
        showSection('dashboard-section');
    } else {
        document.getElementById('login-error').innerText = 'ACCESS DENIED: Invalid PIN';
    }
}

function logout() {
    currentUser = null;
    document.getElementById('pin-input').value = '';
    document.getElementById('login-error').innerText = '';
    showSection('login-section');
}

async function loadDashboardStats() {
    const response = await fetch('/api/stats');
    const data = await response.json();
    document.getElementById('stat-total').innerText = data.total_members || 0;
    document.getElementById('stat-today').innerText = data.today_attendance || 0;
    document.getElementById('stat-revenue').innerText = `${data.total_revenue || 0} L.E`;
    document.getElementById('stat-pending').innerText = `${data.total_pending || 0} L.E`;
}

async function registerTrainee() {
    const payload = {
        name: document.getElementById('t-name').value,
        phone: document.getElementById('t-phone').value,
        weight: document.getElementById('t-weight').value,
        height: document.getElementById('t-height').value,
        total_fee: document.getElementById('t-total-fee').value,
        paid_fee: document.getElementById('t-paid-fee').value,
        start_date: document.getElementById('t-start-date').value,
        end_date: document.getElementById('t-end-date').value
    };

    if (!payload.name || !payload.total_fee || !payload.end_date) {
        return alert("Name, Total Fee, and Expiry Date are required fields.");
    }

    const response = await fetch('/api/trainees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (data.qr_image) {
        document.getElementById('qr-result').innerHTML = `
            <p style="color: #33FF55; font-weight: bold;">TRAINEE REGISTERED</p>
            <img src="${data.qr_image}" alt="QR Code">
            <p style="font-size: 11px; color: #888; font-family: monospace; margin-top:8px;">ID: ${data.qr_hash}</p>
        `;
        document.querySelectorAll('#register-section input').forEach(i => i.value = '');
    }
}

async function showMembersScreen() {
    showSection('members-section');
    const response = await fetch('/api/trainees');
    allMembersCache = await response.json();
    renderMembersTable(allMembersCache);
}

function renderMembersTable(members) {
    const tbody = document.getElementById('members-table-body');
    if(members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666;">No members registered yet.</td></tr>`;
        return;
    }

    let html = '';
    members.forEach(member => {
        html += `
            <tr>
                <td style="font-weight:700;">${member.name}</td>
                <td>${member.phone || 'N/A'}</td>
                <td>${member.paid_fee || 0} L.E</td>
                <td style="color: ${member.remaining_fee > 0 ? '#ff3333' : '#33ff55'}">${member.remaining_fee || 0} L.E</td>
                <td>${member.end_date || 'N/A'}</td>
                <td>
                    <button class="btn-delete" onclick="deleteMember(${member.id}, '${member.name}')">DELETE</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function filterMembers() {
    const query = document.getElementById('member-search').value.toLowerCase();
    const filtered = allMembersCache.filter(m => 
        m.name.toLowerCase().includes(query) || (m.phone && m.phone.includes(query))
    );
    renderMembersTable(filtered);
}

async function deleteMember(id, name) {
    if (confirm(`Are you sure you want to delete member: ${name}?`)) {
        const response = await fetch(`/api/trainees/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if(data.success) {
            showMembersScreen();
        }
    }
}

function showReportsScreen() {
    showSection('reports-section');
    loadCustomReports();
}

async function loadCustomReports() {
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    let url = '/api/reports';
    if(start && end) {
        url += `?start_date=${start}&end_date=${end}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    const tbody = document.getElementById('reports-table-body');

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No attendance records found for this period.</td></tr>`;
        return;
    }

    let html = '';
    data.forEach(row => {
        html += `
            <tr>
                <td style="font-weight:700;">${row.name}</td>
                <td>${row.phone || 'N/A'}</td>
                <td>${row.date}</td>
                <td style="color: #33FF55; font-family: monospace;">${row.time_in}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function startScannerScreen() {
    showSection('attendance-section');
    document.getElementById('profile-card').style.display = 'none';
    document.getElementById('attendance-error').innerText = '';

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
            await processAttendanceScan(decodedText);
        },
        (errorMessage) => {}
    ).catch(err => {
        document.getElementById('attendance-error').innerText = "Camera Permission Denied or Not Available.";
    });
}

// Process Scan and handle Expiry status (Feature 1 & 4)
async function processAttendanceScan(qr_hash) {
    const errorEl = document.getElementById('attendance-error');
    const profileCard = document.getElementById('profile-card');
    
    const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_hash })
    });
    const data = await response.json();

    if (data.expired) {
        profileCard.className = 'profile-card expired';
        document.getElementById('p-status-dot').style.background = '#FF3333';
        document.getElementById('p-status-title').innerText = 'ACCESS DENIED: SUBSCRIPTION EXPIRED';
        document.getElementById('p-name').innerText = data.trainee.name;
        document.getElementById('p-time').innerText = 'EXPIRED ON ' + data.trainee.end_date;
        document.getElementById('p-expiry').innerText = data.trainee.end_date;
        document.getElementById('p-dues').innerText = `${data.trainee.remaining_fee} L.E`;
        document.getElementById('p-phone').innerText = data.trainee.phone || 'N/A';
        profileCard.style.display = 'block';
        return;
    }

    if (data.success) {
        profileCard.className = 'profile-card';
        document.getElementById('p-status-dot').style.background = '#33FF55';
        document.getElementById('p-status-title').innerText = 'ACCESS GRANTED';
        document.getElementById('p-name').innerText = data.trainee.name;
        document.getElementById('p-time').innerText = data.time_in;
        document.getElementById('p-expiry').innerText = data.trainee.end_date || 'N/A';
        document.getElementById('p-dues').innerText = `${data.trainee.remaining_fee || 0} L.E`;
        document.getElementById('p-phone').innerText = data.trainee.phone || 'N/A';

        profileCard.style.display = 'block';
    } else {
        errorEl.innerText = 'SYSTEM ERROR: TRAINEE RECORD NOT FOUND.';
    }
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().catch(err => console.log(err));
    }
}

function stopScannerAndBack() {
    stopScanner();
    showSection('dashboard-section');
}

async function loadTodayAttendance() {
    const response = await fetch('/api/today-attendance');
    const data = await response.json();
    
    const listContainer = document.getElementById('today-list');
    if(data.length === 0) {
        listContainer.innerHTML = `<p style="color: #666; font-size: 12px;">No attendees recorded yet today.</p>`;
        return;
    }

    let html = '';
    data.forEach(item => {
        html += `
            <div class="today-item">
                <span class="t-name">${item.name}</span>
                <span class="t-time">${item.time_in}</span>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

function exportExcel() {
    window.location.href = '/api/export';
}