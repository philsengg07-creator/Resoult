// This file needs to be in the public directory.

// Import and initialize the Firebase SDK
// This is a special entry point for service workers
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCs6YdyKhNdnXbbhmmEjq54obYSCnlV_ec",
  authDomain: "studio-288338678-646a3.firebaseapp.com",
  projectId: "studio-288338678-646a3",
  storageBucket: "studio-288338678-646a3.firebasestorage.app",
  messagingSenderId: "711064706944",
  appId: "1:711064706944:web:25d7173846e803e1efeb65",
  databaseURL: "https://studio-288338678-646a3-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// If you want to handle background messages, you can do so here.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Example: focus the app if it's open
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
