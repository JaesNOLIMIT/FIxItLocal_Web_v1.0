import { useMemo, useState } from 'react';
import { Calendar, MapPin, Route, User, Users2 } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const assignments = [
  {
    id: 1,
    title: 'Pothole Repair - DRT Highway',
    assignee: 'Mike Johnson',
    team: 'Road Maintenance Alpha',
    status: 'in-progress',
    dueDate: 'Mar 30, 2026',
    location: 'Brgy. Pagala, Baliuag',
    destination: 'North Cluster',
    priority: 'High',
    progress: 65,
  },
  {
    id: 2,
    title: 'Street Light Restoration - B.S. Aquino Ave',
    assignee: 'Sarah Williams',
    team: 'Electrical Unit 2',
    status: 'pending',
    dueDate: 'Apr 1, 2026',
    location: 'Brgy. Tangos, Baliuag',
    destination: 'East Cluster',
    priority: 'Medium',
    progress: 0,
  },
  {
    id: 3,
    title: 'Water Line Inspection - Villarica Road',
    assignee: 'James Chen',
    team: 'Water Services Mobile',
    status: 'completed',
    dueDate: 'Mar 28, 2026',
    location: 'Brgy. Santo Cristo, Baliuag',
    destination: 'Central Cluster',
    priority: 'Medium',
    progress: 100,
  },
  {
    id: 4,
    title: 'Flood Mitigation Setup - Doa Rosario',
    assignee: 'Alex Martinez',
    team: 'Drainage Response Team',
    status: 'in-progress',
    dueDate: 'Mar 31, 2026',
    location: 'Brgy. Poblacion, Baliuag',
    destination: 'Central Cluster',
    priority: 'High',
    progress: 44,
  },
  {
    id: 5,
    title: 'Barrier Replacement - Pagala Link',
    assignee: 'Emma Davis',
    team: 'Traffic Control West',
    status: 'pending',
    dueDate: 'Apr 2, 2026',
    location: 'Brgy. Tangos, Baliuag',
    destination: 'East Cluster',
    priority: 'Medium',
    progress: 0,
  },
  {
    id: 6,
    title: 'Canal Clearing - Sabang Riverbank',
    assignee: 'Robert Garcia',
    team: 'Drainage Response Team',
    status: 'completed',
    dueDate: 'Mar 27, 2026',
    location: 'Brgy. Sabang, Baliuag',
    destination: 'West Cluster',
    priority: 'Low',
    progress: 100,
  },
  {
    id: 7,
    title: 'Road Edge Stabilization - Santo Cristo',
    assignee: 'Liam Cruz',
    team: 'Road Maintenance Alpha',
    status: 'in-progress',
    dueDate: 'Apr 1, 2026',
    location: 'Brgy. Santo Cristo, Baliuag',
    destination: 'South Cluster',
    priority: 'High',
    progress: 58,
  },
  {
    id: 8,
    title: 'Signage Reinstallation - Cagayan Valley Rd',
    assignee: 'Noel Reyes',
    team: 'Traffic Control West',
    status: 'pending',
    dueDate: 'Apr 3, 2026',
    location: 'Brgy. San Jose, Baliuag',
    destination: 'West Cluster',
    priority: 'Low',
    progress: 0,
  },
  {
    id: 9,
    title: 'Drain Slab Reconstruction - F. Gonzales',
    assignee: 'Aira Santos',
    team: 'Road Maintenance Bravo',
    status: 'in-progress',
    dueDate: 'Mar 31, 2026',
    location: 'Brgy. Poblacion, Baliuag',
    destination: 'Central Cluster',
    priority: 'High',
    progress: 36,
  },
  {
    id: 10,
    title: 'Subsidence Survey - Pinagbarilan Road',
    assignee: 'Ken Bautista',
    team: 'Survey and Safety Unit',
    status: 'completed',
    dueDate: 'Mar 26, 2026',
    location: 'Brgy. Pinagbarilan, Baliuag',
    destination: 'North Cluster',
    priority: 'Low',
    progress: 100,
  },
  {
    id: 11,
    title: 'Shoulder Repair - Tibag Connector',
    assignee: 'Marie Lim',
    team: 'Road Maintenance Bravo',
    status: 'pending',
    dueDate: 'Apr 4, 2026',
    location: 'Brgy. Tibag, Baliuag',
    destination: 'North Cluster',
    priority: 'Medium',
    progress: 0,
  },
  {
    id: 12,
    title: 'Pooling Control - Bypass Access',
    assignee: 'Jon Dellos',
    team: 'Drainage Response Team',
    status: 'in-progress',
    dueDate: 'Apr 2, 2026',
    location: 'Brgy. Santo Nino, Baliuag',
    destination: 'South Cluster',
    priority: 'Medium',
    progress: 52,
  },
];

const workflowTabs = ['All Assignments', 'Active Routes', 'Unassigned Queue', 'Completed'];

const statusConfig = {
  'in-progress': { label: 'In Progress', class: 'bg-blue-50 text-blue-700' },
  pending: { label: 'Pending', class: 'bg-yellow-50 text-yellow-700' },
  completed: { label: 'Completed', class: 'bg-green-50 text-green-700' },
};

const teamOptions = [
  'Road Maintenance Alpha',
  'Road Maintenance Bravo',
  'Electrical Unit 2',
  'Water Services Mobile',
  'Drainage Response Team',
  'Traffic Control West',
  'Survey and Safety Unit',
];

function AssignmentsPage() {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('All Assignments');
  const [activeDestinationTab, setActiveDestinationTab] = useState('All Destinations');
  const [teamPlan, setTeamPlan] = useState(
    Object.fromEntries(assignments.map((assignment) => [assignment.id, assignment.team]))
  );

  const destinationTabs = useMemo(() => {
    const uniqueDestinations = [...new Set(assignments.map((assignment) => assignment.destination))];
    return ['All Destinations', ...uniqueDestinations];
  }, []);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const workflowMatch =
        activeWorkflowTab === 'All Assignments' ||
        (activeWorkflowTab === 'Active Routes' && assignment.status === 'in-progress') ||
        (activeWorkflowTab === 'Unassigned Queue' && assignment.status === 'pending') ||
        (activeWorkflowTab === 'Completed' && assignment.status === 'completed');

      const destinationMatch =
        activeDestinationTab === 'All Destinations' || assignment.destination === activeDestinationTab;

      return workflowMatch && destinationMatch;
    });
  }, [activeDestinationTab, activeWorkflowTab]);

  const destinationSummary = useMemo(() => {
    return destinationTabs
      .filter((destination) => destination !== 'All Destinations')
      .map((destination) => {
        const rows = assignments.filter((assignment) => assignment.destination === destination);
        const pendingCount = rows.filter((assignment) => assignment.status === 'pending').length;
        const activeCount = rows.filter((assignment) => assignment.status === 'in-progress').length;

        return {
          destination,
          total: rows.length,
          pendingCount,
          activeCount,
        };
      });
  }, [destinationTabs]);

  return (
    <div className="relative min-h-screen bg-background text-on-background">
      <Sidebar />
      <main className="flex min-h-screen flex-col lg:ml-64">
        <Header />

        <div className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="mb-2 font-display text-3xl font-bold text-primary">Assignments</h1>
            <p className="text-on-surface-variant">Assign teams by destination and track who is going where.</p>
          </div>

          <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
            {workflowTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveWorkflowTab(tab)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  activeWorkflowTab === tab ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-primary-container">Filtered Tasks</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{filteredAssignments.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-primary-container">Active Routes</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{assignments.filter((row) => row.status === 'in-progress').length}</p>
            </article>
            <article className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-primary-container">Unassigned Queue</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{assignments.filter((row) => row.status === 'pending').length}</p>
            </article>
            <article className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-primary-container">Completed</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{assignments.filter((row) => row.status === 'completed').length}</p>
            </article>
          </div>

          <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
            {destinationTabs.map((destination) => (
              <button
                key={destination}
                type="button"
                onClick={() => setActiveDestinationTab(destination)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  activeDestinationTab === destination
                    ? 'bg-secondary text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {destination}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">Assignment Board</h2>
                <span className="text-xs font-semibold text-on-primary-container">
                  {filteredAssignments.length} items shown
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredAssignments.map((assignment) => {
                  const statusInfo = statusConfig[assignment.status];
                  return (
                    <article
                      key={assignment.id}
                      className="overflow-hidden rounded-xl border border-slate-200/50 bg-surface-container-lowest shadow-soft transition hover:shadow-md"
                    >
                      <div className="p-5">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-sm font-bold text-primary">{assignment.title}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${statusInfo.class}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="mb-4 space-y-2 text-xs text-on-surface-variant">
                          <div className="flex items-center gap-2">
                            <User size={14} />
                            <span>{assignment.assignee}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>{assignment.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Route size={14} />
                            <span>{assignment.destination}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{assignment.dueDate}</span>
                          </div>
                        </div>

                        <label className="mb-1 block text-xs font-semibold text-on-primary-container" htmlFor={`team-${assignment.id}`}>
                          Assigned Team
                        </label>
                        <select
                          id={`team-${assignment.id}`}
                          value={teamPlan[assignment.id]}
                          onChange={(event) =>
                            setTeamPlan((previous) => ({
                              ...previous,
                              [assignment.id]: event.target.value,
                            }))
                          }
                          className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-on-surface outline-none focus:ring-2 focus:ring-secondary/20"
                        >
                          {teamOptions.map((team) => (
                            <option key={`${assignment.id}-${team}`} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>

                        <div className="mb-3">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-on-primary-container">Route Progress</span>
                            <span className="font-bold text-primary">{assignment.progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-gradient-to-r from-secondary to-primary transition-all"
                              style={{ width: `${assignment.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`rounded px-2 py-1 font-bold ${
                              assignment.priority === 'High'
                                ? 'bg-red-50 text-red-700'
                                : assignment.priority === 'Medium'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {assignment.priority} Priority
                          </span>
                          <span className="text-on-primary-container">{teamPlan[assignment.id]}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                        <button className="text-xs font-semibold text-secondary hover:underline">Assign Route →</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-5 shadow-soft">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
                  <Users2 size={16} />
                  Team Destination Planner
                </h3>
                <div className="space-y-3">
                  {destinationSummary.map((zone) => (
                    <article key={zone.destination} className="rounded-lg border border-slate-100 bg-white p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-primary">{zone.destination}</h4>
                        <span className="text-[10px] font-semibold text-on-primary-container">{zone.total} tasks</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        {zone.activeCount} active • {zone.pendingCount} waiting assignment
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-5 shadow-soft">
                <h3 className="mb-4 text-sm font-bold text-primary">Unassigned Quick Queue</h3>
                <div className="space-y-2">
                  {assignments
                    .filter((assignment) => assignment.status === 'pending')
                    .slice(0, 4)
                    .map((assignment) => (
                      <article key={`queue-${assignment.id}`} className="rounded-lg border border-slate-100 bg-white p-3">
                        <p className="line-clamp-2 text-xs font-bold text-primary">{assignment.title}</p>
                        <p className="mt-1 text-[10px] text-on-surface-variant">{assignment.destination}</p>
                      </article>
                    ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AssignmentsPage;
