
import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { ChatView } from './components/ChatView';
import { CalendarView } from './components/CalendarView';
import { ProjectListView } from './components/ProjectListView';
import { ProfileView } from './components/ProfileView';
import { Loader2 } from 'lucide-react';

const ContentSwitcher: React.FC = () => {
  const { currentSection, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black gap-4">
        <Loader2 className="animate-spin text-[#00E5FF]" size={48} />
        <p className="text-gray-500 uppercase tracking-[0.3em] text-xs font-bold">Sincronizando Hub...</p>
      </div>
    );
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
    <AppProvider>
      <Layout>
        <ContentSwitcher />
      </Layout>
    </AppProvider>
  );
};

export default App;
