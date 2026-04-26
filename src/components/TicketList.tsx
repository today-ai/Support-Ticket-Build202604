import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, orderBy } from '../firebase';
import { Ticket } from '../types';
import { Search, Filter, Clock, CheckCircle2, Circle, AlertCircle, ChevronRight, Hash } from 'lucide-react';
import { motion } from 'motion/react';

interface TicketListProps {
  onSelectTicket: (id: string) => void;
  isAdmin: boolean;
  userId: string;
}

export default function TicketList({ onSelectTicket, isAdmin, userId }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = isAdmin 
      ? query(collection(db, 'tickets'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'tickets'), where('creatorId', '==', userId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];
      setTickets(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, userId]);

  useEffect(() => {
    let result = tickets;

    if (search) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(search.toLowerCase()) || 
        t.id.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter(t => t.priority === priorityFilter);
    }

    setFilteredTickets(result);
  }, [search, statusFilter, priorityFilter, tickets]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading tickets...</div>;

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-50/50"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-50/50"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-process">In Process</option>
            <option value="closed">Closed</option>
          </select>
          <select 
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-50/50"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-100 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <Hash size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-tight">No tickets found</h3>
            <p className="max-w-xs text-sm text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        ) : (
          filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectTicket(ticket.id)}
              className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md md:flex-row md:items-center"
            >
              <div className="flex flex-1 items-start gap-4">
                <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getStatusBg(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono tracking-wider text-text-muted">#{ticket.id.slice(-6)}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <h4 className="truncate font-semibold text-text-main group-hover:text-primary transition-colors">{ticket.title}</h4>
                  <p className="truncate text-xs text-text-muted truncate">
                    {ticket.assigneeId || ticket.assigneeEmail ? (
                       <span className="inline-flex items-center gap-1 text-primary-dark font-medium mr-2">
                         Assigned: {ticket.assigneeEmail || ticket.assigneeName}
                       </span>
                    ) : (
                       <span className="text-text-muted italic mr-2">Unassigned</span>
                    )}
                    {ticket.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-border pt-4 md:border-t-0 md:pt-0">
                <div className="text-left md:text-right">
                  <p className="text-xs font-bold text-text-main uppercase tracking-tight">{ticket.creatorName}</p>
                  <p className="flex items-center gap-1 text-[10px] text-text-muted uppercase">
                    <Clock size={12} />
                    {ticket.createdAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
                <div className={`ml-6 flex h-8 w-24 items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusPillColor(ticket.status)}`}>
                  {ticket.status}
                </div>
                <ChevronRight className="ml-4 text-border group-hover:text-primary" size={20} />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'open': return <Circle size={18} className="text-status-open" />;
    case 'in-process': return <Clock size={18} className="text-status-progress" />;
    case 'closed': return <CheckCircle2 size={18} className="text-emerald-600" />;
    default: return <AlertCircle size={18} />;
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case 'open': return 'bg-amber-100';
    case 'in-process': return 'bg-blue-100';
    case 'closed': return 'bg-emerald-100';
    default: return 'bg-gray-100';
  }
}

function getStatusPillColor(status: string) {
  switch (status) {
    case 'open': return 'bg-amber-100 text-amber-800';
    case 'in-process': return 'bg-blue-100 text-blue-800';
    case 'closed': return 'bg-emerald-100 text-emerald-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'low': return 'bg-slate-100 text-slate-500';
    case 'medium': return 'bg-primary/10 text-primary';
    case 'high': return 'bg-orange-100 text-orange-600';
    case 'urgent': return 'bg-red-100 text-red-600';
    default: return 'bg-slate-100 text-slate-500';
  }
}
