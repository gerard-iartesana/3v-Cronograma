importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBPbqGLzR9uyVmvVKR7jiLWyKbaHW9ngww",
    authDomain: "villas-cronograma.firebaseapp.com",
    projectId: "villas-cronograma",
    storageBucket: "villas-cronograma.firebasestorage.app",
    messagingSenderId: "22451577171",
    appId: "1:22451577171:web:4a0a0fe8fad335355941a6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-mobile.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
