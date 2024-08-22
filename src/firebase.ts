// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDM3395x2bbY5qD7c0pE74HdTXGzugvwVA",
  authDomain: "stickpazzle.firebaseapp.com",
  projectId: "stickpazzle",
  storageBucket: "stickpazzle.appspot.com",
  messagingSenderId: "79402500446",
  appId: "1:79402500446:web:e4b8841762d5976545cfcf",
  measurementId: "G-EEH6C882TQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);