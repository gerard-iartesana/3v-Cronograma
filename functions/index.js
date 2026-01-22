const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { DateTime } = require('luxon');

admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

/**
 * Shared logic to check and send notifications.
 * Can be called by onWrite (reactive) or onSchedule (proactive).
 */
async function checkAndSendNotifications() {
    const db = admin.firestore();
    const stateRef = db.collection('marketing_hub').doc('global_state');
    const doc = await stateRef.get();

    if (!doc.exists) {
        console.log("Error: Document marketing_hub/global_state does not exist");
        return;
    }
    const data = doc.data();
    console.log(`Data loaded. Events: ${data.events?.length || 0}, Token present: ${!!data.fcmToken}`);

    if (!data.events || !data.fcmToken) {
        console.log(`Aborting: missing events or token. Keys: ${Object.keys(data)}`);
        return;
    }

    const events = data.events;
    const token = data.fcmToken;
    const sentNotifications = data.sentNotifications || {};

    // Server time (UTC)
    const nowUtc = DateTime.now().toUTC();
    console.log(`Checking notifications at ${nowUtc.toISO()}. Total events: ${events.length}. Token prefix: ${token.substring(0, 10)}...`);
    let updates = {};
    let notificationSent = false;

    for (const item of events) {
        if (!item.notifications || item.notifications.length === 0) continue;

        const eventTime = DateTime.fromISO(item.date, { zone: 'Europe/Madrid' });

        for (const notif of item.notifications) {
            let offsetMinutes = 0;
            if (notif.unit === 'minutes') offsetMinutes = notif.timeBefore;
            else if (notif.unit === 'hours') offsetMinutes = notif.timeBefore * 60;
            else if (notif.unit === 'days') offsetMinutes = notif.timeBefore * 24 * 60;

            const notifyTime = eventTime.minus({ minutes: offsetMinutes });
            // Sync instanceKey format with frontend: {id}_{notifId}_{date}
            const instanceKey = `${item.id}_${notif.id}_${item.date}`;
            const diff = nowUtc.diff(notifyTime.toUTC(), 'minutes').minutes;

            console.log(`Checking: ${item.title} | Event: ${eventTime.toFormat('HH:mm')} | Offset: -${offsetMinutes}m | Notify: ${notifyTime.toFormat('HH:mm')} | Now: ${nowUtc.setZone('Europe/Madrid').toFormat('HH:mm')} | Diff: ${diff.toFixed(1)}m | Sent: ${!!sentNotifications[instanceKey]}`);

            if (diff >= 0 && diff < 15 && !sentNotifications[instanceKey]) {
                const message = {
                    notification: {
                        title: item.title,
                        body: `Recordatorio: Empieza en ${notif.timeBefore} ${notif.unit}`,
                    },
                    token: token,
                };

                try {
                    await admin.messaging().send(message);
                    console.log(`Notification sent for ${item.title} (${instanceKey})`);
                    updates[instanceKey] = true;
                    notificationSent = true;
                } catch (error) {
                    console.error('Error sending message:', error);
                }
            }
        }
    }

    // Update sentNotifications in DB if anything was sent
    if (notificationSent) {
        await stateRef.update({
            sentNotifications: { ...sentNotifications, ...updates }
        });
    }
}

/**
 * Triggered on global_state update (Reactive)
 * Useful for immediate feedback if user edits an event starting "now".
 */
exports.notifHandlerV1 = functions
    .runWith({ serviceAccount: '705766551714-compute@developer.gserviceaccount.com' })
    .firestore
    .document('marketing_hub/global_state')
    .onWrite(async (change, context) => {
        await checkAndSendNotifications();
    });

/**
 * Scheduled Trigger (Proactive) - CRITICAL FOR ALERTS
 * Checks every minute.
 * Requires Firebase Blaze plan.
 */
exports.scheduledNotifCheck = functions
    .runWith({ serviceAccount: '705766551714-compute@developer.gserviceaccount.com' })
    .pubsub
    .schedule('every 1 minutes')
    .timeZone('Europe/Madrid')
    .onRun(async (context) => {
        await checkAndSendNotifications();
    });

