
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AppState, AppSection, MarketingEvent, Project, Budget, ChatMessage, AIStateUpdate } from '../types';
import { db, messaging, getToken, onMessage, functions } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { expandRecurringEvents } from '../utils/recurrence';
import { useAuth } from './AuthContext';

interface AppContextType extends AppState {
  currentSection: AppSection;
  setCurrentSection: (section: AppSection) => void;
  addChatMessage: (msg: ChatMessage) => void;
  applyStateUpdate: (update: AIStateUpdate) => void;
  toggleProjectItem: (projectId: string, itemId: string) => void;
  toggleEventTask: (eventId: string, taskId: string) => void;
  updateEvent: (eventId: string, updates: Partial<MarketingEvent>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteEvent: (eventId: string) => void;
  deleteProject: (projectId: string) => void;
  addProject: (project: Project) => void;
  addDocument: (name: string) => void;
  setTagColor: (tag: string, color: string) => void;
  setAssigneeColor: (assignee: string, color: string) => void;
  clearChat: () => void;
  isLoading: boolean;
  enableNotifications: () => Promise<boolean>;
  fcmToken?: string;
  logActivity: (action: string, details: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSection, setCurrentSection] = useState<AppSection>('chat');
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budget, setBudget] = useState<Budget>({ assigned: 10000, estimated: 0 });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<Record<string, string>>({});
  const [assigneeColors, setAssigneeColors] = useState<Record<string, string>>({});
  const [sentNotifications, setSentNotifications] = useState<Record<string, boolean>>({});
  const [fcmToken, setFcmToken] = useState<string | undefined>(undefined);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();


  // Firebase Sync Effect (Restored)
  useEffect(() => {
    const stateDoc = doc(db, "marketing_hub", "global_state");
    const unsubscribe = onSnapshot(stateDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppState;
        setEvents(data.events || []);
        setProjects(data.projects || []);
        setBudget(data.budget || { assigned: 10000, estimated: 0 });
        setChatHistory(data.chatHistory || []);
        setDocuments(data.documents || []);
        setDocuments(data.documents || []);
        setTagColors(data.tagColors || {});
        setAssigneeColors(data.assigneeColors || {});
        setSentNotifications(data.sentNotifications || {});
        setFcmToken(data.fcmToken);
        setActivityLog(data.activityLog || []);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase Sync Error:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);



  const persistState = useCallback(async (updates: Partial<AppState>) => {
    const stateDoc = doc(db, "marketing_hub", "global_state");
    try {
      console.log("Persisting to Firestore:", Object.keys(updates));
      await setDoc(stateDoc, updates, { merge: true });
    } catch (e) {
      console.error("Persistence Error:", e);
    }
  }, []);

  // Notification Check Effect (Moved here to avoid lint error)
  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const checkNotifications = () => {
      const now = new Date();
      const updates: string[] = [];

      const startRange = new Date(now);
      startRange.setHours(0, 0, 0, 0);
      const endRange = new Date(now);
      endRange.setDate(now.getDate() + 2);

      const allPossibleEvents = expandRecurringEvents(events, startRange, endRange);

      allPossibleEvents.forEach(event => {
        if (!event.notifications) return;

        event.notifications.forEach(notif => {
          const instanceKey = `${event.masterId || event.id}_${notif.id}_${event.date}`;
          if (sentNotifications[instanceKey]) return;

          const eventDate = new Date(event.date);
          let triggerTime = new Date(eventDate);
          let offsetMs = 0;

          if (notif.unit === 'minutes') offsetMs = notif.timeBefore * 60 * 1000;
          else if (notif.unit === 'hours') offsetMs = notif.timeBefore * 60 * 60 * 1000;
          else if (notif.unit === 'days') offsetMs = notif.timeBefore * 24 * 60 * 60 * 1000;

          triggerTime = new Date(eventDate.getTime() - offsetMs);
          const diff = now.getTime() - triggerTime.getTime();

          if (diff >= 0 && diff < 120 * 1000) {
            new Notification(event.title, {
              body: `Tu actividad comienza en ${notif.timeBefore} ${notif.unit}`,
              icon: 'https://i.imgur.com/5kjeq84.png',
              badge: 'https://i.imgur.com/5kjeq84.png',
              tag: instanceKey
            });
            updates.push(instanceKey);
          }
        });
      });

      if (updates.length > 0) {
        setSentNotifications(prev => {
          const next = { ...prev };
          updates.forEach(k => next[k] = true);
          persistState({ sentNotifications: next });
          return next;
        });
      }
    };

    const intervalId = setInterval(checkNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [events, sentNotifications, persistState]);

  // FCM Integration (Manual Trigger) - Moved here to use persistState
  const enableNotifications = useCallback(async () => {
    if (!messaging) return false;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered with scope:', registration.scope);
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Necesitas dar permiso para recibir notificaciones.");
        return false;
      }

      console.log("Solicitando Token FCM...");
      const token = await getToken(messaging, {
        vapidKey: 'BCGI4AbSz62vZCAJKeNiOl4314KdBGpha743NeODLAVlaSYvu7N3h2zetGna4w9wb94Qa0RlYjAVcqjbouXwZKs'
      });

      if (token) {
        console.log("FCM Token obtenido:", token);
        setFcmToken(token);
        // Explicit save to be sure
        const stateDoc = doc(db, "marketing_hub", "global_state");
        await setDoc(stateDoc, { fcmToken: token }, { merge: true });
        console.log("Token guardado en Firestore (explícito)");
        alert("¡Notificaciones vinculadas con éxito!");
        return true;
      } else {
        alert("No se pudo obtener el token de notificación. Inténtalo de nuevo.");
      }
    } catch (err) {
      console.error("FCM Error:", err);
      alert("Error al activar notificaciones: " + (err instanceof Error ? err.message : "Error desconocido"));
      return false;
    }
    return false;
  }, [messaging]);

  const logActivity = useCallback((action: string, details: string) => {
    if (!user) return;
    const newEntry = {
      id: crypto.randomUUID(),
      userId: user.uid,
      userName: user.displayName || user.email || 'Usuario',
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setActivityLog(prev => {
      const next = [newEntry, ...prev].slice(0, 100); // Keep last 100
      persistState({ activityLog: next });
      return next;
    });
  }, [user, persistState]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatHistory(prev => {
      const next = [...prev, msg];
      persistState({ chatHistory: next });
      return next;
    });
  }, [persistState]);

  const applyStateUpdate = useCallback((update: AIStateUpdate) => {
    setEvents(prev => {
      let next = [...prev];
      if (update.newEvents) next = [...next, ...update.newEvents];
      if (update.updatedEvents) {
        const updateMap = new Map(update.updatedEvents.map(ev => [ev.id, ev]));
        next = next.map(ev => updateMap.has(ev.id) ? { ...ev, ...updateMap.get(ev.id) } : ev);
      }
      if (update.deletedEvents) {
        const toDelete = new Set(update.deletedEvents);
        next = next.filter(ev => !toDelete.has(ev.id));
      }

      // Add metadata to NEW events
      if (update.newEvents && user) {
        const eventIds = new Set(update.newEvents.map(e => e.id));
        next = next.map(ev => {
          if (eventIds.has(ev.id) && !ev.createdBy) {
            return {
              ...ev,
              createdBy: { uid: user.uid, displayName: user.displayName || 'IA Assistant', photoURL: user.photoURL || undefined },
              createdAt: new Date().toISOString()
            };
          }
          return ev;
        });
      }

      if (JSON.stringify(prev) !== JSON.stringify(next)) persistState({ events: next });
      return next;
    });

    if (update.newProjects || update.updatedProjects || update.deletedProjects) {
      setProjects(prev => {
        let next = [...prev];
        if (update.newProjects) next = [...next, ...update.newProjects];
        if (update.updatedProjects) {
          const updateMap = new Map(update.updatedProjects.map(p => [p.id, p]));
          next = next.map(p => updateMap.has(p.id) ? { ...p, ...updateMap.get(p.id) } : p);
        }
        if (update.deletedProjects) {
          const toDelete = new Set(update.deletedProjects);
          next = next.filter(p => !toDelete.has(p.id));
        }
        persistState({ projects: next });
        return next;
      });
    }

    if (update.budgetUpdate) {
      setBudget(prev => {
        const next = { ...prev, ...update.budgetUpdate };
        persistState({ budget: next });
        return next;
      });
    }
  }, [persistState]);

  const deleteProject = useCallback((projectId: string) => {
    // 1. Unlink activities first
    setEvents(prev => {
      const next = prev.map(ev => ev.projectId === projectId ? { ...ev, projectId: undefined } : ev);
      if (JSON.stringify(prev) !== JSON.stringify(next)) persistState({ events: next });
      return next;
    });
    // 2. Delete project
    setProjects(prev => {
      const next = prev.filter(p => p.id !== projectId);
      persistState({ projects: next });
      return next;
    });
  }, [persistState]);

  const toggleProjectItem = useCallback((projectId: string, itemId: string) => {
    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id !== projectId) return p;
        const newChecklist = p.checklist.map(item =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        const allDone = newChecklist.length > 0 && newChecklist.every(item => item.done);
        return {
          ...p,
          checklist: newChecklist,
          status: (allDone ? 'completed' : p.status === 'completed' ? 'ongoing' : p.status) as Project['status']
        };
      });
      persistState({ projects: next });
      return next;
    });
  }, [persistState]);

  const toggleEventTask = useCallback((eventId: string, taskId: string) => {
    setEvents(prev => {
      const next = prev.map(ev => {
        if (ev.id !== eventId) return ev;
        const newTasks = ev.tasks?.map(t => t.id === taskId ? { ...t, done: !t.done } : t) || [];
        const allDone = newTasks.length > 0 && newTasks.every(t => t.done);
        return { ...ev, tasks: newTasks, completed: allDone };
      });
      persistState({ events: next });
      return next;
    });
    logActivity('task_toggled', `Tarea actualizada en evento`);
  }, [persistState, logActivity]);

  const updateEvent = useCallback((eventId: string, updates: Partial<MarketingEvent>) => {
    setEvents(prev => {
      const next = prev.map(ev => ev.id === eventId ? { ...ev, ...updates } : ev);
      persistState({ events: next });
      return next;
    });
    const updatedEv = events.find(e => e.id === eventId);
    logActivity('updated_event', `Evento actualizado: ${updatedEv?.title || eventId}`);
  }, [persistState, events, logActivity]);

  const deleteEvent = useCallback((eventId: string) => {
    setEvents(prev => {
      const next = prev.filter(ev => ev.id !== eventId);
      persistState({ events: next });
      return next;
    });
    logActivity('deleted_event', `Evento eliminado: ${eventId}`);
  }, [persistState, logActivity]);

  const addProject = useCallback((project: Project) => {
    const projectWithMeta = user ? {
      ...project,
      createdBy: { uid: user.uid, displayName: user.displayName || 'Usuario' },
      createdAt: new Date().toISOString()
    } : project;

    setProjects(prev => {
      const next = [...prev, projectWithMeta];
      persistState({ projects: next });
      return next;
    });
    logActivity('created_project', `Proyecto creado: ${project.title}`);
  }, [persistState, user, logActivity]);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === projectId ? { ...p, ...updates } : p);
      persistState({ projects: next });
      return next;
    });
  }, [persistState]);

  const clearChat = useCallback(() => {
    setChatHistory([]);
    persistState({ chatHistory: [] });
  }, [persistState]);

  const addDocument = useCallback((name: string) => {
    setDocuments(prev => {
      const next = [...prev, name];
      persistState({ documents: next });
      return next;
    });
  }, [persistState]);

  const setTagColor = useCallback((tag: string, color: string) => {
    setTagColors(prev => {
      const next = { ...prev, [tag]: color };
      persistState({ tagColors: next });
      return next;
    });
  }, [persistState]);

  const setAssigneeColor = useCallback((assignee: string, color: string) => {
    setAssigneeColors(prev => {
      const next = { ...prev, [assignee]: color };
      persistState({ assigneeColors: next });
      return next;
    });
  }, [persistState]);

  const debugState = async () => {
    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/debugGetState`);
      const data = await response.json();
      console.log("FIRESTORE ACTUAL STATE:", data);
      alert("Revisa la consola del navegador para ver el estado de Firestore.");
    } catch (error) {
      console.error("Error:", error);
      alert("Error al obtener el estado: " + error);
    }
  };

  const sendTestNotification = useCallback(async () => {
    if (!fcmToken) {
      alert("No hay token de notificaciones registrado. Asegúrate de haberlas activado primero.");
      return;
    }

    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/notifyImmediateV1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: fcmToken,
          title: "🔔 Prueba de Notificación",
          body: "Si ves esto, ¡las notificaciones funcionan perfectamente!"
        })
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Notificación de prueba enviada. Revisa tu dispositivo.");
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      alert("Error al enviar la notificación de prueba: " + error);
    }
  }, [fcmToken]);

  return (
    <AppContext.Provider value={{
      currentSection, setCurrentSection,
      events, projects, budget, chatHistory, documents, tagColors, assigneeColors, sentNotifications, activityLog,
      addChatMessage, applyStateUpdate, toggleProjectItem, toggleEventTask, updateEvent, deleteEvent, updateProject, deleteProject, addProject, addDocument, setTagColor, setAssigneeColor, clearChat,
      isLoading, enableNotifications, fcmToken, logActivity
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
