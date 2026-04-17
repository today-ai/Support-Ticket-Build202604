import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, query, where, onSnapshot, orderBy, addDoc, updateDoc, serverTimestamp, Timestamp, getDocFromServer, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  getDocFromServer,
  getDocs
};

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
