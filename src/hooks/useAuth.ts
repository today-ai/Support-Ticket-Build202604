import { useState, useEffect } from 'react';
import { auth, db, doc, getDoc, setDoc, serverTimestamp } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Create default profile for new users
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Anonymous',
            photoURL: firebaseUser.photoURL || '',
            role: 'user', // Default is user
          };
          
          // Special case for initial admin
          if (firebaseUser.email === 'shakeelsaeedofficial@gmail.com') {
            newProfile.role = 'admin';
          }
          
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            ...newProfile,
            createdAt: serverTimestamp()
          });
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, profile, loading, isAdmin: profile?.role === 'admin' };
}
