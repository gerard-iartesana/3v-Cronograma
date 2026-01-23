
import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ChatView } from './components/ChatView';
import { CalendarView } from './components/CalendarView';
import { ProjectListView } from './components/ProjectListView';
import { ProfileView } from './components/ProfileView';
import { LoginView } from './components/LoginView';
import { Loader2 } from 'lucide-react';

const ContentSwitcher: React.FC = () => {
  const { currentSection, isLoading } = useApp();
  const { user, loading: authLoading } = useAuth();

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white gap-4">
        <Loader2 className="animate-spin text-[#dc0014]" size={48} />
        <p className="text-gray-400 tracking-wider text-xs font-medium">
          {authLoading ? 'Verificando sesión...' : 'Sincronizando hub...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  switch (currentSection) {
    case 'chat':
      return <ChatView />;
    case 'calendar':
      return <CalendarView />;
    case 'projects':
      return <ProjectListView />;
    case 'profile':
      return <ProfileView />;
    default:
      return <ChatView />;
  }
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <Layout>
          <ContentSwitcher />
        </Layout>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
