---
description: Flujo de desarrollo diario recomendado
---

Sigue estos pasos para desarrollar nuevas funcionalidades de forma segura:

1. **Sincronizar cambios remotos** (siempre antes de empezar):
```powershell
git pull origin main
```

2. **Crear una rama para la tarea** (opcional pero recomendado):
```powershell
git checkout -b feature/nombre-de-la-tarea
```

3. **Ejecutar servidor local**:
```powershell
npm run dev
```

4. **Realizar cambios y verificar**:
   - Revisa que no haya errores en la consola.
   - Verifica que el diseño sea responsive.

5. **Preparar cambios**:
```powershell
git add .
git commit -m "feat: descripción clara de lo que hiciste"
```

6. **Subir a GitHub**:
```powershell
git push origin main
```
// turbo
Nota: Al hacer push a `main`, el despliegue a Firebase se iniciará automáticamente.
