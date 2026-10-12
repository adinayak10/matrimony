// Legacy-compat shim (docs/plans/admin-base-ui.md C1.8). Loaded by the
// un-migrated public/*.html pages; deleted in C6 when the last one is replaced.
//
// All API calls are same-origin against the admin server's /api proxy
// (routes/proxy.js), which turns the httpOnly admin_session cookie into the
// Bearer header. The browser never sees a token: nothing here reads
// localStorage, sets Authorization, or logs request headers.
window.API_BASE_URL = '';
const API_BASE_URL = '';

// Kept for callers that still reference it; there is no browser-side token.
function getAuthToken() {
    return null;
}

function goToLogin() {
    const next = window.location.pathname + window.location.search;
    window.location.assign('/login?next=' + encodeURIComponent(next || '/dashboard'));
}

// API Request helper. Supports both call styles used by the legacy pages:
//   apiRequest(endpoint, 'POST', data)   and   apiRequest(endpoint, { method, body, headers })
async function apiRequest(endpoint, methodOrOptions = 'GET', data = null) {
    let options = {};
    if (typeof methodOrOptions === 'string') {
        options = {
            method: methodOrOptions,
            ...(data && { body: JSON.stringify(data) })
        };
    } else {
        options = methodOrOptions || {};
    }

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const defaultOptions = {
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'X-Requested-With': 'admin'
        },
        credentials: 'same-origin'
    };

    const config = {
        ...defaultOptions,
        ...options,
        credentials: 'same-origin',
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
            'X-Requested-With': 'admin'
        }
    };
    delete config.headers.Authorization;
    delete config.headers.authorization;

    const path = String(endpoint || '');
    const url = path.startsWith('/') ? path : '/' + path;

    try {
        const response = await fetch(url, config);

        // The proxy answers 401 when the session is missing or expired.
        if (response.status === 401) {
            goToLogin();
            throw new Error('Unauthorized');
        }

        let responseData = {};
        const text = await response.text();
        if (text) {
            try { responseData = JSON.parse(text); } catch (e) { responseData = {}; }
        }

        // Handle both 'status' and 'success' fields
        const isSuccess = responseData.status === true || responseData.success === true || response.ok;

        if (!response.ok && !isSuccess) {
            throw new Error(responseData.message || 'Request failed');
        }

        return responseData;
    } catch (error) {
        console.error('API error:', url, error && error.message);
        throw error;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.animation = 'slideIn 0.3s';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export functions
window.apiRequest = apiRequest;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getAuthToken = getAuthToken;
