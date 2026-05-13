/**
 * reset-and-seed.mjs
 *
 * Apaga TUDO do Firebase Auth, Firestore e Cloudflare R2,
 * depois cria o super_admin inicial.
 *
 * Uso:
 *   node scripts/reset-and-seed.mjs
 *
 * Requer:
 *   npm install firebase-admin @aws-sdk/client-s3 dotenv --save-dev
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { config } from 'dotenv';

config({ path: '.env' });

// ─── Imports dinâmicos (ESM) ──────────────────────────────────────────────────
const { initializeApp, cert, getApps } = await import('firebase-admin/app');
const { getAuth }                       = await import('firebase-admin/auth');
const { getFirestore }                  = await import('firebase-admin/firestore');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

// ─── Confirmação interactiva ──────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

console.log('\n⚠️  ATENÇÃO — OPERAÇÃO DESTRUTIVA E IRREVERSÍVEL ⚠️');
console.log('Este script vai apagar:');
console.log('  • Todos os utilizadores do Firebase Auth');
console.log('  • Todas as colecções do Firestore');
console.log('  • Todos os ficheiros do bucket R2');
console.log('  • E criar o super_admin inicial\n');

const confirm = await ask('Escreve "CONFIRMAR" para continuar: ');
if (confirm.trim() !== 'CONFIRMAR') {
  console.log('Operação cancelada.');
  rl.close();
  process.exit(0);
}
rl.close();

// ─── Inicializar Firebase Admin ───────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db   = getFirestore();

// ─── 1. Apagar Firebase Auth ──────────────────────────────────────────────────
console.log('\n[1/4] A apagar utilizadores do Firebase Auth...');
let deletedAuth = 0;
let pageToken;
do {
  const result = await auth.listUsers(1000, pageToken);
  if (result.users.length > 0) {
    const uids = result.users.map(u => u.uid);
    await auth.deleteUsers(uids);
    deletedAuth += uids.length;
    console.log(`  Apagados ${deletedAuth} utilizadores...`);
  }
  pageToken = result.pageToken;
} while (pageToken);
console.log(`  ✓ ${deletedAuth} utilizadores apagados do Auth.`);

// ─── 2. Apagar Firestore ──────────────────────────────────────────────────────
console.log('\n[2/4] A apagar colecções do Firestore...');

const COLECOES = [
  'usuarios',
  'usuarios_pre_registro',
  'condominios',
  'unidades',
  'moradores',
  'quotas',
  'pagamentos',
  'despesas',
  'financeiro',
  'inadimplencia',
  'ocorrencias',
  'manutencao',
  'tarefas',
  'visitantes',
  'comunicados',
  'documentos',
  'assembleias',
  'votacoes',
  'audit_logs',
  'user_preferences',
  'avaliacoes',
];

async function deleteCollection(colName) {
  let total = 0;
  let snap;
  do {
    snap = await db.collection(colName).limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.docs.length;
  } while (!snap.empty);
  return total;
}

for (const col of COLECOES) {
  const n = await deleteCollection(col);
  if (n > 0) console.log(`  ✓ ${col}: ${n} documentos apagados`);
}
console.log('  ✓ Firestore limpo.');

// ─── 3. Apagar R2 ─────────────────────────────────────────────────────────────
console.log('\n[3/4] A apagar ficheiros do Cloudflare R2...');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.R2_BUCKET_NAME;
let deletedR2 = 0;
let continuationToken;

do {
  const list = await s3.send(new ListObjectsV2Command({
    Bucket:            bucket,
    ContinuationToken: continuationToken,
  }));

  if (list.Contents?.length) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: list.Contents.map(o => ({ Key: o.Key })) },
    }));
    deletedR2 += list.Contents.length;
  }

  continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
} while (continuationToken);

console.log(`  ✓ ${deletedR2} ficheiros apagados do R2.`);

// ─── 4. Criar super_admin ─────────────────────────────────────────────────────
console.log('\n[4/4] A criar super_admin...');

const SUPER_ADMIN_EMAIL = 'admin@netsulcondo.com';
const SUPER_ADMIN_NOME  = 'Ekctiandro Gonçalo';
const SUPER_ADMIN_PASS  = 'NetsulCondo@2025!'; // senha temporária — deve ser alterada no 1º login

// Criar no Firebase Auth
const authUser = await auth.createUser({
  email:         SUPER_ADMIN_EMAIL,
  password:      SUPER_ADMIN_PASS,
  displayName:   SUPER_ADMIN_NOME,
  emailVerified: true,
});

console.log(`  ✓ Auth criado: uid=${authUser.uid}`);

// Criar documento em Firestore
await db.collection('usuarios').doc(authUser.uid).set({
  uid:                   authUser.uid,
  nome:                  SUPER_ADMIN_NOME,
  email:                 SUPER_ADMIN_EMAIL,
  telefone:              '',
  role:                  'super_admin',
  status:                'ativo',
  mustChangeCredentials: false,
  createdAt:             new Date(),
  updatedAt:             new Date(),
});

console.log(`  ✓ Documento Firestore criado em usuarios/${authUser.uid}`);

// ─── Resumo ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════');
console.log('✅  Reset e seed concluídos com sucesso!');
console.log('════════════════════════════════════════════════');
console.log(`\nSuper Admin criado:`);
console.log(`  Nome:  ${SUPER_ADMIN_NOME}`);
console.log(`  Email: ${SUPER_ADMIN_EMAIL}`);
console.log(`  Senha: ${SUPER_ADMIN_PASS}`);
console.log('\n⚠️  Altera a senha no primeiro login!');
console.log('════════════════════════════════════════════════\n');

process.exit(0);
