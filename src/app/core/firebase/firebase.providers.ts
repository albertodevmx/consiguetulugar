import { EnvironmentProviders } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB3Cbzk0mmao6SaCLuhdiDc0GRsD9ql7BU',
  authDomain: 'consiguetulugar.firebaseapp.com',
  projectId: 'consiguetulugar',
  storageBucket: 'consiguetulugar.firebasestorage.app',
  messagingSenderId: '540106876976',
  appId: '1:540106876976:web:d77f785eb73c4cdc9325f5',
  measurementId: 'G-M70Y9WTJEN',
};

export const firebaseProviders: EnvironmentProviders[] = [
  provideFirebaseApp(() => initializeApp(firebaseConfig)),
  provideAuth(() => getAuth()),
  provideFirestore(() => getFirestore()),
  provideStorage(() => getStorage()),
];
