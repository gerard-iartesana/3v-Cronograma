
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AIStateUpdate, MarketingEvent, Project } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERROR: VITE_GEMINI_API_KEY no detectada. Verifica que el archivo .env.local esté en la raíz y que el servidor se haya reiniciado.");
} else {
  console.log("✅ API Key detectada:", apiKey.substring(0, 6) + "...");
}

const ai = new GoogleGenerativeAI(apiKey || '');

const SYSTEM_INSTRUCTION = `
Eres el motor de inteligencia de un Hub de Marketing Premium, ejecutando bajo el modelo Gemini 3 Flash Preview.
Tu objetivo es gestionar ESTRATEGIAS basadas en "PROYECTOS".

MODELO DE DATOS:
1. PROYECTO (Project):
   - "id": Único.
   - "title": Nombre del proyecto.
   - "description": Propósito y objetivos.
   - "globalValue": Valor total estimado del proyecto en €.
   - "deadline": Fecha límite (ISO).
   - "status": "ongoing" (en curso), "template" (plantilla) o "completed".
   - "checklist": Array de objetos {id, label, done}.

2. EVENTO (MarketingEvent):
   - Sesiones de trabajo específicas en el calendario.
   - "type": "event" (sesión de trabajo normal), "campaign" (campaña que dura varios días) o "holiday" (efeméride/día señalado).
   - "date": Fecha de inicio (ISO). IMPORTANTE: Si el usuario menciona una hora específica, devuelve el ISO en formato local (ej: "2026-01-16T10:00:00" SIN la 'Z') para asegurar que coincide con su intención.
   - "endDate": Fecha de fin (ISO). OBLIGATORIO si type="campaign".
   - "duration": Duración estimada (ej: "30 min", "2h", "1.5h"). Sé PRECISO con los minutos si el usuario lo indica.
   - "assignees": Array de nombres de personas responsables (ej: ["Gerard", "Marta"]).
   - "projectId": (Opcional) ID del proyecto al que pertenece esta sesión.
   - "recurrence": { "frequency": "daily"|"weekly"|"monthly"|"yearly", "interval": number, "endDate": "ISO", "daysOfWeek": [0-6] } (Opcional).
     - "daysOfWeek": Array de números (0=Domingo, 1=Lunes, ...). ÚSALO si la frecuencia es semanal y se piden días específicos (ej: "Lunes y Miércoles" -> [1, 3], "De lunes a viernes" -> [1,2,3,4,5]).
   - "notifications": Array de { "timeBefore": minutes, "unit": "minutes"|"hours"|"days" }. Ej: "Avísame 10 min antes" -> { "timeBefore": 10, "unit": "minutes" }.

OPERACIONES:
- "newProjects", "updatedProjects", "deletedProjects": Para gestionar la cartera completa de proyectos (incluyendo plantillas).
- "newEvents", "updatedEvents", "deletedEvents": Para planificar tiempo en el calendario.
- "budgetUpdate": Para modificar el presupuesto o gastos (ej: { "expenses": [{ "id": "...", "title": "...", "amount": 100 }] }).

REGLAS CRÍTICAS: 
- SIEMPRE debes incluir un campo "message" en tu JSON de respuesta con una confirmación amigable.
- INTENCIÓN "CAMPAÑA": Si el usuario pide crear una campaña que dura un tiempo (ej: "Campaña de rebajas del 5 al 10"), crea un newEvent con type="campaign", date="...-05", endDate="...-10". NO crees un proyecto para esto a menos que se pida gestionar sus tareas.
- INTENCIÓN "RECURRENTE": Si el usuario pide "Lunes a viernes", usa frequency="weekly" y daysOfWeek=[1,2,3,4,5]. Si dice "Fines de semana", [0,6].
- INTENCIÓN "NOTIFICACIÓN": Si pide "recuérdame", "avísame", configura "notifications".
- INTENCIÓN "PROYECTO": Si se pide gestionar el "Diseño", "Producción", o "Creación" de algo, crea un PROYECTO.
- INTENCIÓN "DÍA SEÑALADO": Si se menciona "Día Mundial de...", "Festivo...", etc., crea un newEvent con type="holiday" y el nombre de la festividad en "title".
- PRECISIÓN TEMPORAL: Si el usuario indica una duración específica (ej: "30 min", "15 min"), refléjalo EXACTAMENTE en el campo "duration". No redondees a horas si no es necesario.
- PROYECTO: { id, title, description, tags: string[], assignees: string[], budgetedValue, budgetedCost, budgetedHours, deadline, checklist: {id, label, done}[], status: "template"|"ongoing"|"completed" }
- Puedes EDITAR cualquier propiedad de un evento o proyecto (incluyendo etiquetas, métricas financieras, horas estimadas, etc.) a través de "updatedEvents" o "updatedProjects".
- Puedes ELIMINAR elementos si el usuario lo solicita, devolviendo sus IDs en "deletedEvents" o "deletedProjects". Recuerda el PROTOCOLO DE CONFIRMACIÓN.
- REGLA FINANCIERA Y TEMPORAL OBLIGATORIA: Al crear o actualizar EVENTOS o PROYECTOS:
  1. "budgetedValue": Estima el valor de PRECIO DE MERCADO (PVP) en España para este tipo de servicio.
  2. "budgetedHours": ESTIMACIÓN de horas totales que requerirá el proyecto.
  3. "budgetedCost": El COSTE de esas horas (calcúlalo SIEMPRE a 80€/h o el precio por hora vigente basándote en "budgetedHours"). NO inventes costes aleatorios.
  4. "realCost": Será SIEMPRE (duración real en horas * 80€/h).
  OJO: Nunca dejes estos valores a 0 o vacíos para "newProjects".
- CÁLCULO REAL (Si "completed": true o el usuario lo pide):
  1. "realCost": Calcúlalo SIEMPRE a razón de 80€/h según la duración de la actividad.
  2. "realValue" (PROYECTOS): NO lo iguales automáticamente al "budgetedValue". Solo asígnale un valor si el usuario indica un presupuesto aceptado o una cantidad facturada. Si no, déjalo como undefined. Para ACTIVIDADES (events), sí puedes igualarlo si están completadas.
- GESTIÓN DE GASTOS ANUALES:
  - Si el usuario menciona "gastos anuales", "costes fijos", "suscripción", "alquiler", MODIFICA la lista de gastos en "budgetUpdate.expenses".
  - NO crees un proyecto para un gasto recurrente anual.
  - Ejemplo: { "budgetUpdate": { "expenses": [{ "id": "exp-1", "title": "Suscripción Adobe", "amount": 720 }] } }.
  - Conserva los gastos existentes si solo se añade uno nuevo (la IA debe leer el contexto actual).
- TIPOS DE ACTIVIDAD:
  - Por defecto, usa "type": "event". Son tareas, reuniones, trabajo puntual.
  - SOLO usa "type": "campaign" si el usuario explícitamente habla de una "Campaña".
  - SOLO usa "type": "holiday" para festivos o días especiales. Para estos, pon "duration": "Todo el día".
- INTENCIÓN "COPIAR/DUPLICAR": Si el usuario pide copiar o duplicar una actividad (ej: "Copia la sesión de ayer para el viernes"), busca la actividad original y crea una nueva en "newEvents" con los mismos datos pero la nueva fecha.
- PROTOCOLO DE CONFIRMACIÓN (OBLIGATORIO):
  1. Si el usuario pide BORRAR u EDITAR MÚLTIPLE: Responde pidiendo confirmación.
  2. SI Y SOLO SI confirma, ejecuta.
- REGLA DE RESPUESTA: 
  1. Proporciona SIEMPRE una respuesta descriptiva en el campo "message" detallando exactamente qué cambios has realizado. 
  2. Usa formato Markdown (negritas, listas, etc.) para que la información sea clara y profesional.
  3. Si la instrucción del usuario es vaga, incompleta o ambigua y NO puedes realizar una acción segura, NO respondas con mensajes genéricos de éxito. En su lugar, solicita más información (ej: "¿Puedes concretar más las instrucciones? No estoy seguro de qué actividades quieres que modifique").
- REGLA DE PRIVACIDAD: JAMÁS incluyas IDs internos (tipo "proj-123" o "ev-456") en el texto de tu respuesta. Usa los títulos.
- REGLA FINANCIERA ACTUALIZADA:
    1. "budgetedValue": Precio de Mercado (PVP).
    2. "budgetedCost": COSTE ESTIMADO A PRECIO DE MERCADO. Usa una tarifa acorde a un perfil Senior (ej: 100€/h - 150€/h) para este servicio, y NO la tarifa interna de rendimiento. Debe ser un valor FIJO estimado.
    3. "realCost": Coste Real Interno (horas_reales * 80€/h o tarifa interna configurada). ESTE SÍ ES EL COSTE DE RENDIMIENTO.
- ETIQUETAS AUTOMÁTICAS:
  - Para type="holiday", incluye SIEMPRE la etiqueta "Festivo".
  - Para type="campaign", incluye SIEMPRE la etiqueta "Campaña".
  - Para type="event", incluye etiquetas según el contenido (ej: "Reunión", "Diseño", "Estrategia").
- GESTIÓN DE RESPONSABLES (Assignees):
  - Detecta nombres de personas mencionadas como responsables de una tarea o proyecto.
  - Si el usuario dice "Asigna esto a Gerard" o "Gerard se encarga de esto", añade "Gerard" al array de assignees.
  - Puedes añadir o quitar responsables mediante "updatedEvents" o "updatedProjects".
  - REGLA FINANCIERA DE RESPONSABLES: Por cada responsable asignado, el "realCost" de la actividad se MULTIPLICA por el número de responsables (Coste = duración_h * tarifa * num_responsables). Asegúrate de que el usuario lo entienda si pregunta.
- Tono profesional y ejecutivo.
`;

export async function processChatMessage(
  userInput: string,
  history: { role: 'user' | 'assistant', content: string }[],
  currentEvents: MarketingEvent[],
  currentProjects: Project[],
  currentBudget: any // Added logic to pass budget
): Promise<AIStateUpdate> {
  try {
    const now = new Date();
    const stateContext = `
[FECHA UTC: ${now.toISOString()}]
[FECHA LOCAL ESPAÑA: ${now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}]
[IMPORTANTE: Interpreta las horas que diga el usuario como HORA LOCAL (CET/CEST). Si no especifica hora, pero sí habla de un momento del día (mañana, tarde, noche), intenta ser lógico.]
[PROYECTOS ACTUALES]: ${JSON.stringify(currentProjects)}
[PRESUPUESTO Y GASTOS]: ${JSON.stringify(currentBudget)}
[EVENTOS CALENDARIO]: ${JSON.stringify(currentEvents)}
    `;

    const model = ai.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    console.log("🚀 Enviando solicitud a Gemini 3 Flash Preview...");

    const aiResult = await model.generateContent({
      contents: [
        ...history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: `${stateContext}\n\nUsuario: ${userInput}` }] }
      ],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    if (!aiResult.response || !aiResult.response.candidates) {
      throw new Error("Respuesta inválida de la API.");
    }

    const responseText = aiResult.response.text();
    const result = JSON.parse(responseText || '{}');

    // Asegurar que siempre haya un mensaje
    if (!result.message) {
      result.message = "Entendido, he procesado tus cambios en la estrategia.";
    }

    if (result.newProjects) {
      result.newProjects = result.newProjects.map((p: any) => ({
        ...p,
        id: p.id || `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: p.status || 'ongoing',
        checklist: (p.checklist || []).map((c: any) => ({ ...c, id: c.id || `ck-${Math.random().toString(36).substr(2, 4)}`, done: c.done || false }))
      }));
    }

    if (result.newEvents) {
      result.newEvents = result.newEvents.map((ev: any) => ({
        ...ev,
        id: ev.id || `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tags: ev.tags || ['Ejecución'],
        completed: false,
        tasks: (ev.tasks || []).map((t: any) => ({ ...t, id: t.id || `st-${Math.random().toString(36).substr(2, 4)}`, done: t.done || false }))
      }));
    }

    if (result.budgetUpdate && result.budgetUpdate.expenses) {
      // Ensure IDs
      result.budgetUpdate.expenses = result.budgetUpdate.expenses.map((e: any) => ({
        ...e,
        id: e.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      }));
    }

    return result;
  } catch (error: any) {
    console.error("❌ ERROR DETALLADO DE GEMINI:", error);

    let userFriendlyMessage = "No puedo procesar tu solicitud ahora mismo.";

    if (error.message?.includes('API_KEY_INVALID')) {
      userFriendlyMessage = "La API Key configurada parece no ser válida.";
    } else if (error.message?.includes('quota')) {
      userFriendlyMessage = "Se ha agotado el límite de uso gratuito de Gemini.";
    } else if (error.message?.includes('safety')) {
      userFriendlyMessage = "La respuesta ha sido bloqueada por filtros de seguridad.";
    }

    return {
      message: `${userFriendlyMessage} (Detalle: ${error.message || 'Error desconocido'})`
    };
  }
}

