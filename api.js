/**
 * api.js — Covenant Crest Group Ltd
 * ====================================
 * Lightweight frontend API client.
 * Include this script on any page that needs to talk to the backend:
 *
 *   <script src="/api.js"></script>
 *
 * All /api/* calls are proxied by Netlify → your Render.com backend.
 * No API URL configuration needed — it just works.
 *
 * USAGE EXAMPLES
 * ──────────────
 * // Load active jobs (public — no login needed)
 * CCA.jobs.list({ sector: 'care' }).then(jobs => console.log(jobs));
 *
 * // Submit a contact form
 * CCA.contacts.submit({ name, email, phone, type, message });
 *
 * // Submit a candidate application
 * CCA.applications.submit({ first_name, last_name, email, phone, sector, notes });
 *
 * // Admin — log in and get a token
 * CCA.auth.login(email, password).then(({ token, role }) => { ... });
 *
 * // Admin — load all enquiries (requires prior login)
 * CCA.contacts.all().then(list => { ... });
 */

(function (global) {
  'use strict';

  var BASE = '/api';

  // ── Token helpers ────────────────────────────────────────────────
  function getToken() {
    return sessionStorage.getItem('cc_jwt') || '';
  }

  function authHeaders() {
    var token = getToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  // ── Core fetch wrapper ───────────────────────────────────────────
  function request(method, path, body, isPublic) {
    var opts = {
      method : method,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        isPublic ? {} : authHeaders()
      ),
    };
    if (body !== undefined && body !== null) {
      opts.body = JSON.stringify(body);
    }
    return fetch(BASE + path, opts).then(function (r) {
      // Auto-logout on 401
      if (r.status === 401 && !isPublic) {
        sessionStorage.removeItem('cc_jwt');
        sessionStorage.removeItem('cc_role');
        sessionStorage.removeItem('cc_email');
        if (window.location.pathname.includes('admin')) {
          window.location.href = '/login.html';
        }
      }
      return r.json().then(function (data) {
        return { status: r.status, ok: r.ok, data: data };
      });
    });
  }

  function get(path, isPublic)        { return request('GET',    path, null,  isPublic); }
  function post(path, body, isPublic) { return request('POST',   path, body,  isPublic); }
  function put(path, body)            { return request('PUT',    path, body,  false);    }
  function del(path)                  { return request('DELETE', path, null,  false);    }

  // ── Helper: unwrap data or throw error ───────────────────────────
  function unwrap(promise) {
    return promise.then(function (res) {
      if (!res.ok) throw new Error((res.data && res.data.error) || ('HTTP ' + res.status));
      return res.data;
    });
  }

  // ================================================================
  // PUBLIC API NAMESPACE  →  window.CCA
  // ================================================================
  var CCA = {

    // ── Auth ────────────────────────────────────────────────────────
    auth: {
      /**
       * Log in. On success stores token/role/email in sessionStorage.
       * Returns: { token, role, email }
       */
      login: function (email, password) {
        return unwrap(post('/auth/login', { email: email, password: password }, true))
          .then(function (data) {
            sessionStorage.setItem('cc_jwt',   data.token);
            sessionStorage.setItem('cc_role',  data.role);
            sessionStorage.setItem('cc_email', data.email);
            return data;
          });
      },

      /** Returns { email, role } from current JWT. */
      me: function () {
        return unwrap(get('/auth/me', false));
      },

      /** Clears session and redirects to login. */
      logout: function () {
        sessionStorage.removeItem('cc_jwt');
        sessionStorage.removeItem('cc_role');
        sessionStorage.removeItem('cc_email');
        window.location.href = '/login.html';
      },

      /** True if a session token is present. */
      isLoggedIn: function () {
        return !!getToken();
      },

      role: function () {
        return sessionStorage.getItem('cc_role') || '';
      },

      email: function () {
        return sessionStorage.getItem('cc_email') || '';
      },
    },

    // ── Jobs ────────────────────────────────────────────────────────
    jobs: {
      /**
       * Public — fetch active jobs.
       * Options: { sector, type, location }
       */
      list: function (opts) {
        opts = opts || {};
        var qs = [];
        if (opts.sector)   qs.push('sector='   + encodeURIComponent(opts.sector));
        if (opts.type)     qs.push('type='     + encodeURIComponent(opts.type));
        if (opts.location) qs.push('location=' + encodeURIComponent(opts.location));
        var path = '/jobs' + (qs.length ? '?' + qs.join('&') : '');
        return unwrap(get(path, true));
      },

      /** Auth — all jobs including inactive. */
      all: function () {
        return unwrap(get('/jobs/all', false));
      },

      /** Auth — create job. body: { title, pay, sector, type, location, desc, req, status, imageBase64 } */
      create: function (body) {
        return unwrap(post('/jobs', body, false));
      },

      /** Auth — update job. */
      update: function (id, body) {
        return unwrap(put('/jobs/' + id, body));
      },

      /** Auth — delete job. */
      remove: function (id) {
        return unwrap(del('/jobs/' + id));
      },
    },

    // ── Contacts / Enquiries ────────────────────────────────────────
    contacts: {
      /**
       * Public — submit a contact/enquiry form.
       * body: { name, email, phone, type, message }
       */
      submit: function (body) {
        return unwrap(post('/contacts', body, true));
      },

      /** Auth — list all enquiries. */
      all: function () {
        return unwrap(get('/contacts', false));
      },

      /** Auth — update status (e.g. mark read). */
      update: function (id, body) {
        return unwrap(put('/contacts/' + id, body));
      },

      /** Super Admin — delete an enquiry. */
      remove: function (id) {
        return unwrap(del('/contacts/' + id));
      },
    },

    // ── Candidate Applications ──────────────────────────────────────
    applications: {
      /**
       * Public — submit a candidate application.
       * body: { first_name, last_name, email, phone, sector, job_id, job_title,
       *         availability, notes, cvBase64 }
       */
      submit: function (body) {
        return unwrap(post('/applications', body, true));
      },

      /** Auth — list all applications. */
      all: function () {
        return unwrap(get('/applications', false));
      },

      /** Auth — update application status. */
      update: function (id, body) {
        return unwrap(put('/applications/' + id, body));
      },
    },

    // ── File / Image Upload ─────────────────────────────────────────
    upload: {
      /**
       * Auth — upload a base64 image/file to Cloudinary.
       * fileOrBase64: a File object or a raw base64 string.
       * folder: optional Cloudinary folder path.
       * Returns: { url, publicId }
       */
      file: function (fileOrBase64, folder) {
        var doUpload = function (b64) {
          return unwrap(post('/upload', {
            base64  : b64,
            folder  : folder || 'covenantcrest/general',
          }, false));
        };

        if (typeof fileOrBase64 === 'string') {
          // Already base64
          var raw = fileOrBase64.includes(',') ? fileOrBase64.split(',')[1] : fileOrBase64;
          return doUpload(raw);
        }

        // File object — read as base64 first
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var b64 = e.target.result.split(',')[1];
            doUpload(b64).then(resolve).catch(reject);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBase64);
        });
      },
    },

    // ── User Management (Super Admin) ───────────────────────────────
    users: {
      /** Super Admin — list all accounts. */
      all: function () {
        return unwrap(get('/users', false));
      },

      /** Super Admin — create employee account. */
      create: function (email, password) {
        return unwrap(post('/users', { email: email, password: password }, false));
      },

      /** Super Admin — delete employee account. */
      remove: function (id) {
        return unwrap(del('/users/' + id));
      },
    },

    // ── Zoho Mail ───────────────────────────────────────────────────
    zoho: {
      /** Super Admin — get Zoho connection status. */
      status: function () {
        return unwrap(get('/zoho/status', false));
      },

      /** Super Admin — open Zoho OAuth authorisation page. */
      authorise: function () {
        window.location.href = BASE + '/zoho/authorise';
      },

      /** Super Admin — send test email. */
      test: function () {
        return unwrap(post('/zoho/test', {}, false));
      },
    },

    // ── Health check ────────────────────────────────────────────────
    health: function () {
      return fetch(BASE + '/health').then(function (r) { return r.json(); });
    },
  };

  // Expose globally
  global.CCA = CCA;

}(window));
