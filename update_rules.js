const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// We need a service account key to programmatically update rules using the REST API easily,
// OR simpler: we can just inform the user to update their rules in the Firebase Console.
