import { EnvironmentProviders } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBG3q34Nzp3JYw09eXwf5hjJvfKey6hHl4',
  authDomain: 'estudiarbarato.firebaseapp.com',
  projectId: 'estudiarbarato',
  storageBucket: 'estudiarbarato.firebasestorage.app',
  messagingSenderId: '94280676835',
  appId: '1:94280676835:web:dd383c20a9534f83685cd6',
  measurementId: 'G-VFR1FJFTKJ',
};

export const firebaseProviders: EnvironmentProviders[] = [
  provideFirebaseApp(() => initializeApp(firebaseConfig)),
  provideAuth(() => getAuth()),
  provideFirestore(() => getFirestore()),
  provideStorage(() => getStorage()),
];
