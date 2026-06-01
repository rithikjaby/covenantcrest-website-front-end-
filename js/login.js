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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pwd })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        // Server now sets an httpOnly cookie — no token in response body
        if (d.role) {
            window.location.href = '/admin';
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

    // Check for SSO error in URL parameters
    var urlParams = new URLSearchParams(window.location.search);
    var errParam = urlParams.get('error');
    if (errParam) {
        var ssoErrDiv = document.getElementById('ssoError');
        if (ssoErrDiv) {
            var errMsg = 'An unexpected error occurred during Microsoft SSO login.';
            if (errParam === 'microsoft_cancelled') {
                errMsg = 'Microsoft Sign-in was cancelled.';
            } else if (errParam === 'microsoft_unauthorised') {
                errMsg = 'Unauthorised login attempt. Your Microsoft email does not match the SUPER_ADMIN_EMAIL set on Render.';
            } else if (errParam === 'microsoft_token_failed') {
                errMsg = 'Failed to retrieve access token from Microsoft.';
            } else if (errParam === 'microsoft_error') {
                errMsg = 'OAuth callback processing failed. Please check your credentials and try again.';
            }
            ssoErrDiv.textContent = '❌ ' + errMsg;
            ssoErrDiv.style.display = 'block';
        }
    }
});

window.togglePw = togglePw;
window.doLogin = doLogin;
