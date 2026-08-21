import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardView } from '@/views/DashboardView';
import { AIBuyerView } from '@/views/AIBuyerView';
import { GrowthView } from '@/views/GrowthView';
import { ActivityView } from '@/views/ActivityView';
import { PaymentApprovalView } from '@/views/PaymentApprovalView';
import { PaymentFailureView } from '@/views/PaymentFailureView';
import type { ViewKey } from '@/types';

function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (v: ViewKey) => {
    setView(v);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar current={view} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar view={view} onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <div key={view} className="animate-fade-in">
            {view === 'dashboard' && <DashboardView onNavigate={navigate} />}
            {view === 'ai-buyer' && <AIBuyerView onNavigate={navigate} />}
            {view === 'growth' && <GrowthView />}
            {view === 'activity' && <ActivityView />}
            {view === 'payment-approval' && <PaymentApprovalView onNavigate={navigate} />}
            {view === 'payment-failure' && <PaymentFailureView onNavigate={navigate} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
