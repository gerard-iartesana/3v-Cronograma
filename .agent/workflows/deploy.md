---
description: Gestión de despliegues a Firebase
---

El proyecto está configurado para desplegarse automáticamente a Firebase mediante GitHub Actions.

### Requisitos Previos (IMPORTANTE)
Para que el despliegue funcione, debes configurar estos 2 Secretos en tu repo de GitHub (**Settings > Secrets and variables > Actions**):

1. **`FIREBASE_SERVICE_ACCOUNT`**:
   - Ve a [Firebase Console](https://console.firebase.google.com/) > Project Settings > Service Accounts.
   - Genera una nueva clave privada JSON.
   - Copia TODO el contenido del JSON y pégalo en este secreto.

2. **`VITE_GEMINI_API_KEY`**:
   - Tu clave de API de Gemini para que la IA funcione en la versión publicada.

### Flujo de Despliegue Automático
1. Haz `git push origin main`.
2. Ve a la pestaña **Actions** en GitHub para ver el progreso.

### Despliegue Manual (Si fallara GitHub Actions)
Si necesitas desplegar rápido desde tu PC:
// turbo
```powershell
npm run build
firebase deploy
```
