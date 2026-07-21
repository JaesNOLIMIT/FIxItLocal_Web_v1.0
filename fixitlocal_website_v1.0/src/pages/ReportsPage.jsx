import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ReportsFeedTabs from '../components/ReportsFeedTabs';

function ReportsPage() {
  return (
    <div className="relative min-h-screen bg-background text-on-background">
      <Sidebar />
      <main className="flex min-h-screen flex-col lg:ml-64">
        <Header />
        <div className="flex-1 overflow-hidden bg-surface">
          <ReportsFeedTabs className="h-[calc(100vh-82px)]" />
        </div>
      </main>
    </div>
  );
}

export default ReportsPage;
