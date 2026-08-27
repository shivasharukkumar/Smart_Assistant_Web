/**
 * Notification Manager - Custom Text Notifications & Emotion Triggers
 */

class NotificationManager {
    init() {
        const sendBtn = document.getElementById('btnSendNotif');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                // IDs match index.html: notifTitleInput, notifMsgInput, notifDurInput
                const title = document.getElementById('notifTitleInput')?.value.trim() || 'ALERT';
                const message = document.getElementById('notifMsgInput')?.value.trim() || '';
                const duration = parseInt(document.getElementById('notifDurInput')?.value || '3500');

                this.dispatchNotification(title, message, duration);
            });
        }

        // Quick Preset Buttons (data-title / data-msg attributes)
        document.querySelectorAll('.preset-notif-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const title = btn.getAttribute('data-title') || 'ALERT';
                const msg = btn.getAttribute('data-msg') || '';
                this.dispatchNotification(title, msg, 3500);
            });
        });
    }

    dispatchNotification(title, message, duration = 3500) {
        Connection.sendWs({
            type: 'notification',
            title: title,
            message: message,
            duration: duration
        });

        Connection.post('/api/notification', {
            title: title,
            message: message,
            duration: duration
        });

        App.showToast(`Notification Sent: "${title}"`);
    }
}

window.NotificationManagerInstance = new NotificationManager();
