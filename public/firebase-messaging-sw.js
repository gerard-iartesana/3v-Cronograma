importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAXsmTrSdeIRqOLCemyITFSjvU4CEXqsT4",
    authDomain: "bsc-cronograma.firebaseapp.com",
    projectId: "bsc-cronograma",
    storageBucket: "bsc-cronograma.firebasestorage.app",
    messagingSenderId: "831432050912",
    appId: "1:831432050912:web:3a55c576db6c2fe7672885"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pwa-icon.jpg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
