import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Inicializa o Firebase Admin SDK
 * Usado para operações administrativas como deletar usuários do Authentication
 */

// Verifica se já existe uma instância do Admin SDK
if (!getApps().length) {
  try {
    // Inicializa com as credenciais do service account
    // As credenciais devem estar nas variáveis de ambiente
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin SDK:', error);
  }
}

export const adminAuth = getAuth();
