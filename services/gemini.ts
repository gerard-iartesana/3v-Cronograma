
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
Eres el Asistente de 3V Villas para la gestión del cronograma, ejecutando bajo el modelo Gemini 3 Flash Preview.
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
- "budgetUpdate": Para modificar el presupuesto o gastos.
- "knowledgeBaseUpdate": (OBLIGATORIO para guardar permanentemente) Cadena de texto con el contenido acumulado de la base de conocimiento.
- "documents": (Opcional) Array de nombres de archivos guardados.
- "deletedDocuments": (Opcional) Array de nombres de archivos a eliminar.

- REGLAS CRÍTICAS: 
- SIEMPRE debes incluir un campo "message" en tu JSON de respuesta con una confirmación amigable.
- INTENCIÓN "PERSONAL" / "SALUDO": Si el usuario saluda ("Hola", "Buenos días") o hace preguntas generales, responde ÚNICAMENTE con el campo "message" de forma amable y servicial, ofreciendo tu ayuda para gestionar proyectos. NO inventes datos de presupuestos si no existen.
- NO INVENTAR DATOS: Si no tienes el presupuesto global ("globalValue" o "budgetedValue") o costes definidos, NO digas "tienes un presupuesto de 10.000€". Di "no hay presupuesto definido" o simplemente no lo menciones.
- INTENCIÓN "CAMPAÑA": Si el usuario pide crear una campaña que dura un tiempo (ej: "Campaña de rebajas del 5 al 10"), crea un newEvent con type="campaign", date="...-05", endDate="...-10". NO crees un proyecto para esto a menos que se pida gestionar sus tareas.
- PRECISIÓN TEMPORAL: Si el usuario indica una duración específica (ej: "30 min", "15 min"), refléjalo EXACTAMENTE en el campo "duration". No redondees a horas si no es necesario.
- PROYECTO: { id, title, description, tags: string[], assignees: string[], budgetedCost, realCost, deadline, checklist: {id, label, done}[], status: "template"|"ongoing"|"completed" }
- Puedes EDITAR cualquier propiedad de un evento o proyecto a través de "updatedEvents" o "updatedProjects".
- Puedes ELIMINAR elementos si el usuario lo solicita, devolviendo sus IDs en "deletedEvents" o "deletedProjects". Recuerda el PROTOCOLO DE CONFIRMACIÓN.
- REGLA FINANCIERA OBLIGATORIA:
  1. "budgetedCost": Coste Estimado (Valor de Mercado). ESTIMALO siempre usando 80€ por hora de trabajo multiplicado por el número de responsables.
  2. "realCost": Coste Real Total. Representa la suma de "realProductionCost" (gastos externos/materiales) y "realTimeCost" (coste de horas internas usando 20€ por hora). Si el usuario proporciona un precio global de coste real, actualiza "realCost". Si el usuario diferencia entre gastos y horas, puedes actualizar "realProductionCost" y "realTimeCost" específicamente.
  3. En tu mensaje, puedes mencionar que el "Coste Estimado" refleja el valor de un profesional Senior en el mercado, mientras que el "Coste Real" es el optimizado (20€/h).
  4. NO desgloses los cálculos matemáticos exactos en el texto, solo da los totales.
- GESTIÓN DE GASTOS ANUALES:
  - Si el usuario menciona "gastos anuales", "costes fijos", "suscripción", "alquiler", MODIFICA la lista de gastos en "budgetUpdate.expenses".
- TIPOS DE ACTIVIDAD:
  - Por defecto, usa "type": "event".
  - SOLO usa "type": "campaign" si el usuario explícitamente habla de una "Campaña".
  - SOLO usa "type": "holiday" para festivos.
- PROTOCOLO DE CONFIRMACIÓN (OBLIGATORIO):
  1. Si el usuario pide BORRAR u EDITAR MÚLTIPLE: Responde pidiendo confirmación.
  2. SI Y SOLO SI confirma, ejecuta.
- REGLA DE RESPUESTA: 
  1. Proporciona SIEMPRE una respuesta descriptiva en el campo "message".
  2. Usa formato Markdown.
- REGLA DE PRIVACIDAD: JAMÁS incluyas IDs internos.
- ETIQUETAS AUTOMÁTICAS:
  - Para type="holiday", incluye SIEMPRE la etiqueta "Festivo".
  - Para type="campaign", incluye SIEMPRE la etiqueta "Campaña".
- REGLA DE VISIÓN Y DOCUMENTOS:
  - Eres capaz de analizar imágenes (JPG, PNG) y documentos PDF.
  - Al recibir un documento, extrae automáticamente fechas, hitos, tareas y presupuestos relevantes para integrarlos en el cronograma si el usuario lo solicita.
  - Puedes "leer" capturas de pantalla de otros calendarios, excels o notas manuscritas para digitalizarlas en el sistema 3V Villas.
- Tono profesional y ejecutivo.
`;

// ... (imports remain)

export async function processChatMessage(
  userInput: string,
  history: { role: 'user' | 'assistant', content: string, attachments?: { name: string, mimeType: string, data: string }[] }[],
  currentEvents: MarketingEvent[],
  currentProjects: Project[],
  currentBudget: any,
  knowledgeBase?: string,
  tempFiles?: { name: string, content: string, mimeType?: string, data?: string }[],
  knowledgeBaseDocs?: Record<string, string>
): Promise<AIStateUpdate> {
  try {
    const now = new Date();

    let textContext = knowledgeBase || '';
    if (knowledgeBaseDocs && Object.keys(knowledgeBaseDocs).length > 0) {
      textContext += "\n\n[DOCUMENTOS GUARDADOS EN REPOSITORIO]:\n" +
        Object.entries(knowledgeBaseDocs).map(([name, content]) => `--- ${name} ---\n${content}`).join('\n');
    }

    // Add temporary text-based files to context
    if (tempFiles) {
      const textFiles = tempFiles.filter(f => !f.data && f.content && f.content !== "[Archivo no legible como texto plano]");
      if (textFiles.length > 0) {
        textContext += "\n\n[ARCHIVOS DE SESIÓN (SIN GUARDAR)]:\n" +
          textFiles.map(f => `--- ${f.name} ---\n${f.content}`).join('\n');
      }
    }

    const stateContext = `
[FECHA UTC: ${now.toISOString()}]
[FECHA LOCAL ESPAÑA: ${now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}]
[PROYECTOS ACTUALES]: ${JSON.stringify(currentProjects)}
[PRESUPUESTO Y GASTOS]: ${JSON.stringify(currentBudget)}
[EVENTOS CALENDARIO]: ${JSON.stringify(currentEvents)}
[CONTEXTO DE EMPRESA Y REPOSITORIO]:
${textContext || 'No hay documentos guardados.'}
    `;

    const model = ai.getGenerativeModel({
      model: "gemini-3-flash-preview", // Using Gemini 3 Flash Preview
      systemInstruction: SYSTEM_INSTRUCTION + `
        REGLA MULTIMODAL Y CONTEXTO:
        - Si el usuario envía imágenes o PDFs, analízalos para responder basándote en ellos.
        - Si el usuario pide guardar el contenido de un PDF, imagen o archivo de texto permanentemente, extrae el texto/datos clave y devuélvelo en 'knowledgeBaseDocsUpdate' como un objeto { "nombre_archivo.md": "contenido..." }.
        - Utiliza SIEMPRE la información de [CONTEXTO DE EMPRESA Y DOCUMENTOS] para responder preguntas sobre la empresa, normas, guías o histórico.
      `,
    });

    console.log("🚀 Enviando solicitud a Gemini 3 Flash Preview...");

    // Handle current user input parts (text + files)
    const currentParts: any[] = [{ text: `${stateContext}\n\nUsuario: ${userInput}` }];

    // Include current session's binary temp files if they haven't been sent in history
    if (tempFiles) {
      tempFiles.filter(f => f.data && f.mimeType).forEach(f => {
        currentParts.push({
          inlineData: {
            mimeType: f.mimeType,
            data: f.data
          }
        });
      });
    }

    const contents = history.map(h => {
      const parts: any[] = [{ text: h.content }];
      if (h.attachments) {
        h.attachments.forEach(a => {
          parts.push({
            inlineData: {
              mimeType: a.mimeType,
              data: a.data
            }
          });
        });
      }
      return {
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: parts
      };
    });

    contents.push({ role: 'user', parts: currentParts });

    const aiResult = await model.generateContent({
      contents,
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
      const hasChanges = (result.newProjects?.length || 0) > 0 ||
        (result.updatedProjects?.length || 0) > 0 ||
        (result.deletedProjects?.length || 0) > 0 ||
        (result.newEvents?.length || 0) > 0 ||
        (result.updatedEvents?.length || 0) > 0 ||
        (result.deletedEvents?.length || 0) > 0 ||
        result.budgetUpdate;

      result.message = hasChanges
        ? "Entendido, he procesado tus cambios en el cronograma."
        : "¿Podrías darme datos más concretos para poder ayudarte con tu cronograma?";
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

