// lib/services/user.service.ts
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { User, UserRole } from '@/types';

export class UserService {
  private collectionName = 'users';

  async createUser(firebaseUser: FirebaseUser, name: string, role: UserRole = 'morador') {
    try {
      const userDoc = doc(db, this.collectionName, firebaseUser.uid);
      const docSnap = await getDoc(userDoc);

      if (!docSnap.exists()) {
        await setDoc(userDoc, {
          email: firebaseUser.email,
          displayName: name,
          photoURL: firebaseUser.photoURL || null,
          role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return { success: false, error: 'Erro ao criar usuário' };
    }
  }

  async getUserData(uid: string): Promise<User | null> {
    try {
      const userDoc = doc(db, this.collectionName, uid);
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        return { uid, ...docSnap.data() } as User;
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }
}