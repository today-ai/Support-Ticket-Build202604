import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, orderBy } from '../firebase';
import { Ticket } from '../types';
import TicketList from './TicketList';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Ticket as TicketIcon, Activity, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface UserDashboardProps {
  onSelectTicket: (id: string) => void;
  userId: string;
  userEmail?: string;
}

export default function UserDashboard({ onSelectTicket, userId, userEmail }: UserDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: Due to limitations of Firestore OR queries on multiple fields without index,
    // we fetch user's created tickets and assigned tickets separately if we can't reliably "or" them easily.
    // However, since we just have a small app, we can fetch tickets they own.
    // Wait, let's fetch all tickets the user has access to.
    // We'll create two queries: one for created tracking, one for assigned tracking.

    const createdQuery = query(collection(db, 'tickets'), where('creatorId', '==', userId));
    
    // We also need to fetch assigned tickets if userEmail is provided.
    // In Firebase SDK (v9+), we can use `or` but it requires setup. Let's just subscribe to both and merge.
    
    let createdTickets: Ticket[] = [];
    let assignedTickets: Ticket[] = [];

    const mergeAndSet = () => {
      const mergedMap = new Map<string, Ticket>();
      [...createdTickets, ...assignedTickets].forEach(t => mergedMap.set(t.id, t));
      const sorted = Array.from(mergedMap.values()).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setTickets(sorted);
      setLoading(false);
    };

    const unsubCreated = onSnapshot(createdQuery, (snapshot) => {
      createdTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];
      mergeAndSet();
    });

    let unsubAssigned = () => {};
    if (userEmail) {
      const assignedQuery = query(collection(db, 'tickets'), where('assigneeEmail', '==', userEmail));
      unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
        assignedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];
        mergeAndSet();
      });
    } else {
       // if no email just set
       mergeAndSet();
    }

    return () => {
      unsubCreated();
      unsubAssigned();
    };
  }, [userId, userEmail]);

  if (loading) return <div className="text-center py-20 text-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">Loading Your Workspace...</div>;

  const createdByMe = tickets.filter(t => t.creatorId === userId);
  const assignedToMe = tickets.filter(t => t.assigneeEmail === userEmail || t.assigneeId === userId);

  const openTickets = tickets.filter(t => t.status !== 'closed').length;
  const closedTickets = tickets.filter(t => t.status === 'closed').length;

  const priorityData = [
    { name: 'Low', value: tickets.filter(t => t.priority === 'low').length, color: '#94a3b8' },
    { name: 'Medium', value: tickets.filter(t => t.priority === 'medium').length, color: '#3b82f6' },
    { name: 'High', value: tickets.filter(t => t.priority === 'high').length, color: '#f97316' },
    { name: 'Urgent', value: tickets.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My Active Tickets" value={openTickets} icon={<Activity size={20} />} color="indigo" />
        <StatCard title="Assigned Tasks" value={assignedToMe.length} icon={<TicketIcon size={20} />} color="amber" />
        <StatCard title="My Submissions" value={createdByMe.length} icon={<Clock size={20} />} color="blue" />
        <StatCard title="Resolved" value={closedTickets} icon={<CheckCircle2 size={20} />} color="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-white shadow-sm flex flex-col overflow-hidden lg:col-span-2">
           <div className="flex items-center justify-between border-b border-border bg-white p-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-main">My Active Workspace</h3>
           </div>
           <div className="flex-1 overflow-y-auto max-h-[500px] p-4 bg-app-bg">
              {tickets.length === 0 ? (
                 <div className="py-20 text-center text-text-muted flex flex-col items-center justify-center">
                    <AlertCircle size={40} className="mb-4 text-text-muted/50" />
                    <p className="text-sm font-bold">No Records Found</p>
                    <p className="text-xs">You have no tickets created or assigned to you.</p>
                 </div>
              ) : (
                 <div className="space-y-4">
                   {tickets.map(ticket => (
                      <div 
                        key={ticket.id} 
                        onClick={() => onSelectTicket(ticket.id!)}
                        className="group flex cursor-pointer flex-col md:flex-row gap-4 justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                      >
                         <div>
                            <div className="flex items-center gap-2 mb-2">
                               <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest
                                  ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : 
                                    ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' : 
                                    ticket.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 
                                    'bg-slate-100 text-slate-700'}`}
                               >
                                  {ticket.priority}
                               </span>
                               <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border
                                  ${ticket.status === 'open' ? 'border-amber-200 bg-amber-50 text-amber-700' : 
                                    ticket.status === 'in-process' ? 'border-blue-200 bg-blue-50 text-blue-700' : 
                                    'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                               >
                                  {ticket.status.replace('-', ' ')}
                               </span>
                            </div>
                            <h4 className="font-semibold text-text-main group-hover:text-primary transition-colors mb-1">{ticket.title}</h4>
                            <p className="text-xs text-text-muted mb-2 line-clamp-1">{ticket.description}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex gap-2">
                               {ticket.assigneeEmail === userEmail ? <span className="text-primary">Assigned to you</span> : <span>Created by you</span>}
                               <span>•</span>
                               <span>{ticket.createdAt?.toDate().toLocaleDateString()}</span>
                            </p>
                         </div>
                      </div>
                   ))}
                 </div>
              )}
           </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-6">Distribution by Priority</h3>
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
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="stat-label text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
        {icon} {title}
      </div>
      <div className="stat-val text-2xl font-bold text-text-main tabular-nums mt-2">{value}</div>
    </motion.div>
  );
}
