import { useState, useEffect, ReactNode } from 'react';
import { db, collection, query, onSnapshot, orderBy } from '../firebase';
import { Ticket } from '../types';
import TicketList from './TicketList';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { Users, CheckCircle2, Clock, ListFilter, TrendingUp, Activity, UserPlus, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistance } from 'date-fns';

interface AdminDashboardProps {
  onSelectTicket: (id: string) => void;
}

export default function AdminDashboard({ onSelectTicket }: AdminDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading metrics...</div>;

  // Stats calculation
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProcessTickets = tickets.filter(t => t.status === 'in-process').length;
  const closedTickets = tickets.filter(t => t.status === 'closed').length;
  const unassignedTickets = tickets.filter(t => !t.assigneeId).length;

  // Resolution Time Calculation
  const closedWithTiming = tickets.filter(t => t.status === 'closed' && t.closedAt && t.createdAt);
  const totalResolutionTime = closedWithTiming.reduce((acc, t) => {
    return acc + (t.closedAt!.toMillis() - t.createdAt.toMillis());
  }, 0);
  const avgResolutionTimeMs = closedWithTiming.length > 0 ? totalResolutionTime / closedWithTiming.length : 0;
  
  const formatTime = (ms: number) => {
    if (ms === 0) return 'N/A';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  const priorityData = [
    { name: 'Low', value: tickets.filter(t => t.priority === 'low').length, color: '#94a3b8' },
    { name: 'Medium', value: tickets.filter(t => t.priority === 'medium').length, color: '#3b82f6' },
    { name: 'High', value: tickets.filter(t => t.priority === 'high').length, color: '#f97316' },
    { name: 'Urgent', value: tickets.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
  ];

  // Agent Performance (Actual assigned agents)
  const agents = Array.from(new Set(tickets.map(t => t.assigneeName).filter(Boolean)));
  const agentPerformance = agents.map(name => ({
    name: name!,
    resolved: tickets.filter(t => t.assigneeName === name && t.status === 'closed').length,
    active: tickets.filter(t => t.assigneeName === name && t.status !== 'closed').length,
  })).sort((a,b) => b.resolved - a.resolved);

  const assignmentData = [
    { name: 'Assigned', value: totalTickets - unassignedTickets, color: '#4f46e5' },
    { name: 'Unassigned', value: unassignedTickets, color: '#e2e8f0' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full overflow-y-auto pr-2 custom-scrollbar">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Open Tickets" value={openTickets} icon={<Activity size={20} />} color="amber" secondary={`${Math.round((openTickets/totalTickets)*100)}% of queue`} />
        <StatCard title="Avg. Response" value={formatTime(avgResolutionTimeMs)} icon={<Clock size={20} />} color="blue" isSmall />
        <StatCard title="Agent Happiness" value="98%" icon={<Award size={20} />} color="emerald" secondary="Stable" />
        <StatCard title="CRM Health" value="Syncing" icon={<Activity size={20} />} color="indigo" secondary="Sync: 2m ago" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priority Volume Chart */}
        <section className="lg:col-span-2 rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Tickets by Priority</h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase">
               <span className="flex items-center gap-1 text-red-500"><ShieldAlert size={12}/> {tickets.filter(t => t.priority === 'urgent').length} Urgent</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Resource Allocation */}
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h3 className="mb-8 text-xs font-bold uppercase tracking-widest text-text-muted">Resource Allocation</h3>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assignmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assignmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-text-main tabular-nums">
                 {Math.round(((totalTickets - unassignedTickets) / (totalTickets || 1)) * 100)}%
               </span>
               <span className="text-[10px] uppercase font-bold text-text-muted">Assigned</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket List Panel */}
        <section className="lg:col-span-2 rounded-xl border border-border bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-white p-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-main">Recent Active Tickets</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] p-4">
            <TicketList onSelectTicket={onSelectTicket} isAdmin={true} userId="admin" />
          </div>
        </section>

        {/* Agent Performance Panel */}
        <section className="rounded-xl border border-border bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-white p-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-main">Agent Performance</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="h-32 w-full flex items-end gap-2 pb-2 border-b border-border">
              {priorityData.map((p, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${(p.value / totalTickets) * 100}%` }}
                  className="flex-1 bg-primary rounded-t-sm min-h-[4px]"
                />
              ))}
            </div>
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">Top Agents</h4>
              {agentPerformance.length === 0 ? (
                <p className="text-xs text-text-muted italic">No data</p>
              ) : (
                agentPerformance.map((agent) => (
                  <div key={agent.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-main">{agent.name}</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {Math.round((agent.resolved / (agent.resolved + agent.active || 1)) * 100)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, secondary, isSmall }: { title: string, value: string | number, icon: ReactNode, color: string, secondary?: string, isSmall?: boolean }) {
  const bgPill: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="stat-label text-[11px] font-bold uppercase tracking-wider text-text-muted">{title}</div>
      <div className={`stat-val ${isSmall ? 'text-xl' : 'text-2xl'} font-bold text-text-main tabular-nums`}>{value}</div>
      {secondary && (
        <div className={`text-[10px] font-medium flex items-center gap-1 opacity-80`}>
          {secondary}
        </div>
      )}
    </motion.div>
  );
}
