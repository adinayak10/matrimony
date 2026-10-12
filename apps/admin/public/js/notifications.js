// Notification System for Admin Panel

function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.admin-notification');
    existingNotifications.forEach(notif => notif.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification-${type}`;
    
    // Set icon based on type
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    else if (type === 'danger' || type === 'error') icon = 'fa-exclamation-circle';
    else if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fa ${icon}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fa fa-times"></i>
        </button>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .admin-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                max-width: 500px;
                padding: 15px 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .admin-notification-success {
                border-left: 4px solid #22c55e;
                color: #166534;
            }
            
            .admin-notification-success i:first-child {
                color: #22c55e;
            }
            
            .admin-notification-danger,
            .admin-notification-error {
                border-left: 4px solid #ef4444;
                color: #991b1b;
            }
            
            .admin-notification-danger i:first-child,
            .admin-notification-error i:first-child {
                color: #ef4444;
            }
            
            .admin-notification-warning {
                border-left: 4px solid #f59e0b;
                color: #92400e;
            }
            
            .admin-notification-warning i:first-child {
                color: #f59e0b;
            }
            
            .admin-notification-info {
                border-left: 4px solid #3b82f6;
                color: #1e40af;
            }
            
            .admin-notification-info i:first-child {
                color: #3b82f6;
            }
            
            .admin-notification i:first-child {
                font-size: 20px;
            }
            
            .admin-notification span {
                flex: 1;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                color: #666;
                transition: color 0.2s;
            }
            
            .notification-close:hover {
                color: #333;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Slideout animation
const slideOutStyle = document.createElement('style');
slideOutStyle.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(slideOutStyle);
