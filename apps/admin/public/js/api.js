// API Configuration
if (!window.API_BASE_URL) {
    window.API_BASE_URL = 'https://api.banjaramatch.com';
}
const API_BASE_URL = window.API_BASE_URL;

// Get auth token
function getAuthToken() {
    return localStorage.getItem('admin_token') || localStorage.getItem('token');
}

// API Request helper with better error handling
async function apiRequest(endpoint, methodOrOptions = 'GET', data = null) {
    const token = getAuthToken();
    
    // Handle both old signature (endpoint, method, data) and new signature (endpoint, options)
    let options = {};
    if (typeof methodOrOptions === 'string') {
        // Old signature: (endpoint, method, data)
        options = {
            method: methodOrOptions,
            ...(data && { body: JSON.stringify(data) })
        };
    } else {
        // New signature: (endpoint, options)
        options = methodOrOptions || {};
    }
    
    console.log('🌐 API Request:', options.method || 'GET', endpoint);
    console.log('📦 Request Data:', data);
    console.log('⚙️ Request Options:', options);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 
                'Authorization': `Bearer ${token}`
            })
        },
        credentials: 'include'
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        console.log('📤 Sending fetch to:', `${API_BASE_URL}${endpoint}`);
        console.log('📤 Fetch config:', config);
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        console.log('📡 Response status:', response.status, response.statusText);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
            console.log('❌ Unauthorized, redirecting to login');
            localStorage.clear();
            window.location.href = '/';
            throw new Error('Unauthorized');
        }
        
        const responseData = await response.json();
        console.log('📦 Response data:', responseData);
        
        // Handle both 'status' and 'success' fields
        const isSuccess = responseData.status === true || responseData.success === true || response.ok;
        
        if (!response.ok && !isSuccess) {
            console.error('❌ API Error:', responseData);
            throw new Error(responseData.message || 'Request failed');
        }
        
        console.log('✅ API Success:', endpoint);
        return responseData;
    } catch (error) {
        console.error('❌ API Error:', endpoint, error);
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

// Confirm dialog (removed - conflicts with window.confirm)

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
