# Configuração do Firebase Admin SDK

Para permitir a eliminação de usuários do Firebase Authentication, é necessário configurar o Firebase Admin SDK.

## Passos para Configuração

### 1. Gerar Service Account Key

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **sistema-gestao-condomini-9aac1**
3. Vá em **Project Settings** (ícone de engrenagem) > **Service Accounts**
4. Clique em **Generate new private key**
5. Confirme e baixe o arquivo JSON

### 2. Configurar Variáveis de Ambiente

Abra o arquivo `.env` e adicione as seguintes variáveis com os valores do arquivo JSON baixado:

```env
FIREBASE_ADMIN_PROJECT_ID="sistema-gestao-condomini-9aac1"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@sistema-gestao-condomini-9aac1.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
```

**Importante:**
- O `FIREBASE_ADMIN_CLIENT_EMAIL` está no campo `client_email` do JSON
- O `FIREBASE_ADMIN_PRIVATE_KEY` está no campo `private_key` do JSON
- Mantenha os `\n` na chave privada (eles representam quebras de linha)

### 3. Exemplo do arquivo JSON

O arquivo JSON baixado terá esta estrutura:

```json
{
  "type": "service_account",
  "project_id": "sistema-gestao-condomini-9aac1",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@sistema-gestao-condomini-9aac1.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 4. Reiniciar o Servidor

Após configurar as variáveis, reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Funcionalidade

Com o Firebase Admin SDK configurado, quando um usuário for eliminado:

1. ✅ O documento será removido do Firestore (`usuarios` collection)
2. ✅ O usuário será removido do Firebase Authentication
3. ✅ O pré-registro será limpo (se existir)
4. ✅ Um log de auditoria será criado

## Segurança

⚠️ **IMPORTANTE:**
- Nunca commite o arquivo `.env` com as credenciais reais
- Mantenha o arquivo JSON do service account em local seguro
- Não compartilhe as credenciais publicamente
- Em produção, use variáveis de ambiente do seu provedor de hosting

## Troubleshooting

Se encontrar erros:

1. Verifique se as variáveis estão corretas no `.env`
2. Certifique-se de que a chave privada mantém os `\n`
3. Verifique os logs do servidor para mensagens de erro
4. Confirme que o service account tem permissões adequadas no Firebase
