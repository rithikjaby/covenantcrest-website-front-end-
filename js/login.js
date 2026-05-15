'use strict';

/**
 * Login Logic
 */

function togglePw() {
    var p = document.getElementById('loginPwd');
    if (p) p.type = p.type === 'password' ? 'text' : 'password';
}

function doLogin(e) {
    if (e) e.preventDefault();
    var btn = document.getElementById('submitBtn');
    var label = document.getElementById('btnLabel');
    var spin = document.getElementById('btnSpinner');
    var err = document.getElementById('errBanner');
    var off = document.getElementById('offlineNotice');

    if (err) err.style.display = 'none';
    if (off) off.style.display = 'none';

    var email = document.getElementById('loginEmail').value.trim();
    var pwd = document.getElementById('loginPwd').value;
    var hp = document.getElementById('loginHoneypot').value;

    if (hp) return; // bot
    if (!email || !pwd) {
        if (err) {
            err.textContent = 'Please enter both email and password.';
            err.style.display = 'block';
        }
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (err) {
            err.textContent = 'Please enter a valid email address.';
            err.style.display = 'block';
        }
        return;
    }
    if (pwd.length < 8) {
        if (err) {
            err.textContent = 'Password must be at least 8 characters.';
            err.style.display = 'block';
        }
        return;
    }

    if (btn) btn.disabled = true;
    if (label) label.style.opacity = '0';
    if (spin) spin.style.display = 'inline-block';

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pwd })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.token) {
            sessionStorage.setItem('cc_jwt',   d.token);
            sessionStorage.setItem('cc_role',  d.role  || 'superadmin');
            sessionStorage.setItem('cc_email', d.email || '');
            window.location.href = '/admin.html';
        } else {
            throw new Error(d.error || d.message || 'Invalid credentials');
        }
    })
    .catch(function(errObj) {
        console.error('Login error:', errObj.message);
        if (err) {
            err.textContent = 'Invalid email or password. Please try again.';
            err.style.display = 'block';
        }
        if (off) off.style.display = 'block';
        if (btn) btn.disabled = false;
        if (label) label.style.opacity = '1';
        if (spin) spin.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', doLogin);
    }

    var pwToggle = document.querySelector('.pw-toggle');
    if (pwToggle) {
        pwToggle.addEventListener('click', togglePw);
    }
});

window.togglePw = togglePw;
window.doLogin = doLogin;
