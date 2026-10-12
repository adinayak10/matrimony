// Check if user is authenticated
async function checkAuth() {
    const API_BASE_URL = window.API_BASE_URL || 'https://api.banjaramatch.com';
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    
    console.log('🔐 [checkAuth] Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
        console.log('❌ [checkAuth] No token, redirecting to login');
        redirectToLogin();
        return false;
    }

    try {
        console.log('📡 [checkAuth] Calling /api/admin/auth/me...');
        const response = await fetch(`${API_BASE_URL}/api/admin/auth/me`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Cookie': `token=${token}`
            },
            credentials: 'include'
        });
        
        console.log('📡 [checkAuth] Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 [checkAuth] Response data:', data);
        
        if (!response.ok || !data.status) {
            console.log('❌ [checkAuth] Response not OK, redirecting to login');
            redirectToLogin();
            return false;
        }
        
        if (!data.data) {
            console.log('❌ [checkAuth] No user in response, redirecting to login');
            redirectToLogin();
            return false;
        }
        
        console.log('👤 [checkAuth] User role:', data.data.role);
        
        if (data.data.role !== 'admin') {
            console.log('❌ [checkAuth] User is not admin, redirecting to login');
            redirectToLogin();
            return false;
        }
        
        // Store admin data for later use
        localStorage.setItem('adminData', JSON.stringify(data.data));
        
        console.log('✅ [checkAuth] Authentication successful');
        return true;
    } catch (error) {
        console.error('❌ [checkAuth] Error:', error);
        redirectToLogin();
        return false;
    }
}

function redirectToLogin() {
    if (!window.location.pathname.includes('login.html') && window.location.pathname !== '/') {
        console.log('🔄 [redirectToLogin] Clearing storage and redirecting...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    }
}

// Get current admin info from localStorage
function getCurrentAdmin() {
    const adminData = localStorage.getItem('adminData');
    if (adminData) {
        try {
            return JSON.parse(adminData);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Logout function
async function logout() {
    const API_BASE_URL = window.API_BASE_URL || 'https://api.banjaramatch.com';
    const getAuthToken = window.getAuthToken || (() => localStorage.getItem('admin_token') || localStorage.getItem('token'));
    
    try {
        const token = getAuthToken();
        if (token) {
            await fetch(`${API_BASE_URL}/api/admin/auth/logout`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `token=${token}`
                },
                credentials: 'include'
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
}

window.checkAuth = checkAuth;
window.logout = logout;
window.getCurrentAdmin = getCurrentAdmin;
