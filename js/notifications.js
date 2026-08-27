/**
 * Notification Manager - Custom Text Notifications & Emotion Triggers
 */

class NotificationManager {
    init() {
        const sendBtn = document.getElementById('btnSendNotif');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                const title = document.getElementById('notifTitle')?.value || 'ALERT';
                const message = document.getElementById('notifMessage')?.value || '';
                const face = document.getElementById('notifFace')?.value || 'happy';
                const duration = parseInt(document.getElementById('notifDuration')?.value || '3000');

                this.dispatchNotification(title, message, face, duration);
            });
        }

        // Quick Preset Buttons
        document.querySelectorAll('.preset-notif-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const title = btn.getAttribute('data-title') || 'ALERT';
                const msg = btn.getAttribute('data-msg') || '';
                const face = btn.getAttribute('data-face') || 'happy';
                this.dispatchNotification(title, msg, face, 3500);
            });
        });
    }

    dispatchNotification(title, message, face, duration = 3000) {
        Connection.sendWs({
            type: 'notification',
            title: title,
            message: message,
            face: face,
            duration: duration
        });

        Connection.apiPost('/api/notification', {
            title: title,
            message: message,
            face: face,
            duration: duration
        });

        App.showToast(`Notification Sent: "${title}" 📢`);
    }
}

window.NotificationManagerInstance = new NotificationManager();
