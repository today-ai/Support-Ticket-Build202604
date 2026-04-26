import { useState, useEffect, FormEvent } from 'react';
import { db, doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, where, getDocs } from '../firebase';
import { Ticket, Comment, TicketStatus } from '../types';
import { UserProfile } from '../hooks/useAuth';
import { auth } from '../firebase';
import { ArrowLeft, Send, MessageSquare, Clock, CheckCircle2, Circle, AlertCircle, Save, UserPlus, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
  isAdmin: boolean;
}

export default function TicketDetail({ ticketId, onBack, isAdmin }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAssigneeEmail, setCommentAssigneeEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const unsubTicket = onSnapshot(doc(db, 'tickets', ticketId), (doc) => {
      if (doc.exists()) {
        setTicket({ id: doc.id, ...doc.data() } as Ticket);
      }
      setLoading(false);
    });

    const q = query(collection(db, 'tickets', ticketId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubComments = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[]);
    });

    // Fetch admins for assignment dropdown
    if (isAdmin) {
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      getDocs(adminQuery).then(snapshot => {
        setAdmins(snapshot.docs.map(doc => doc.data() as UserProfile));
      });
    }

    return () => {
      unsubTicket();
      unsubComments();
    };
  }, [ticketId, isAdmin]);

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!ticket || !isAdmin) return;
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      
      if (newStatus === 'closed') {
        updateData.closedAt = serverTimestamp();
      } else {
        // If re-opening, we might want to clear closedAt
        updateData.closedAt = null;
      }

      await updateDoc(doc(db, 'tickets', ticketId), updateData);
      
      // Add a system notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: ticket.creatorId,
        message: `Your ticket "${ticket.title}" status has been updated to ${newStatus}.`,
        link: `/tickets/${ticketId}`,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (adminUid: string, adminName: string) => {
    if (!ticket || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        assigneeId: adminUid,
        assigneeName: adminName,
        updatedAt: serverTimestamp()
      });

      // Notify the assignee
      await addDoc(collection(db, 'notifications'), {
        userId: adminUid,
        message: `Ticket assigned to you: "${ticket.title}"`,
        link: `/tickets/${ticketId}`,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!newComment.trim() || !user || !ticket) return;

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'tickets', ticketId, 'comments'), {
        ticketId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        text: newComment,
        assigneeEmail: commentAssigneeEmail.trim() || null,
        createdAt: serverTimestamp()
      });
      
      // Update the ticket's assigneeEmail if it was provided
      if (commentAssigneeEmail.trim()) {
        await updateDoc(doc(db, 'tickets', ticketId), {
          assigneeEmail: commentAssigneeEmail.trim(),
          updatedAt: serverTimestamp()
        });
      }

      // Notify the other party
      const recipientId = isAdmin ? ticket.creatorId : ticket.assigneeId;
      if (recipientId) {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          message: `New comment on ticket: ${ticket.title}`,
          link: `/tickets/${ticketId}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading ticket details...</div>;
  if (!ticket) return <div className="text-center py-20 text-gray-400">Ticket not found</div>;

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in h-64 duration-500 py-6 h-full overflow-y-auto pr-2 custom-scrollbar">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} />
        Dashboard / Ticket Details
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
             <div className="mb-6 flex items-center justify-between">
               <span className="text-xs font-bold font-mono text-text-muted">#{ticket.id.slice(-8).toUpperCase()}</span>
               <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${getPriorityColor(ticket.priority)}`}>
                 {ticket.priority} Priority
               </span>
             </div>
             <h1 className="mb-4 text-2xl font-bold tracking-tight text-text-main leading-tight">{ticket.title}</h1>
             <p className="mb-6 text-sm leading-relaxed text-text-muted whitespace-pre-wrap">{ticket.description}</p>
             
             <div className="flex items-center gap-3 border-t border-border pt-6">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-app-bg flex items-center justify-center text-primary font-bold uppercase text-xs border border-border">
                  {ticket.creatorName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-main leading-none mb-1">{ticket.creatorName}</p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Requester</p>
                </div>
             </div>
          </section>

          {/* Comments */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" />
              Collaboration History
            </h3>
            
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className={`flex ${comment.authorId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-4 ${
                    comment.authorId === auth.currentUser?.uid 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'bg-white border border-border shadow-sm text-text-main'
                  }`}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${comment.authorId === auth.currentUser?.uid ? 'text-white/70' : 'text-text-muted'}`}>
                    {comment.authorName}
                  </span>
                  <span className={`text-[9px] font-medium ${comment.authorId === auth.currentUser?.uid ? 'text-white/50' : 'text-text-muted/50'}`}>
                    {comment.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm leading-snug">{comment.text}</p>
                {comment.assigneeEmail && (
                  <p className={`mt-3 border-t pt-2 text-[10px] font-bold text-opacity-80 uppercase tracking-widest ${comment.authorId === auth.currentUser?.uid ? 'border-white/20 text-white' : 'border-border text-primary'}`}>
                    Assigned to: {comment.assigneeEmail}
                  </p>
                )}
              </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="relative mt-6 space-y-3">
              <textarea 
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Reply with sync to CRM..."
                className="w-full rounded-xl border border-border bg-white p-4 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none placeholder:text-text-muted/40"
              />
              <div className="flex items-center gap-3">
                <input 
                  type="email" 
                  value={commentAssigneeEmail}
                  onChange={(e) => setCommentAssigneeEmail(e.target.value)}
                  placeholder="Assign to (email) - Optional"
                  className="flex-1 rounded-lg border border-border bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted/40"
                />
                <button 
                  disabled={submittingComment || !newComment.trim()}
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-50"
                >
                  {submittingComment ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (
                    <>
                      <Send size={16} /> Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Agent Assignment</h4>
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-app-bg p-3">
               {ticket.assigneeId || ticket.assigneeEmail ? (
                 <>
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                     <UserCheck size={20} />
                   </div>
                   <div className="overflow-hidden">
                     <p className="truncate text-sm font-bold text-text-main leading-tight" title={ticket.assigneeEmail || ticket.assigneeName}>{ticket.assigneeEmail || ticket.assigneeName}</p>
                     <p className="text-[10px] text-text-muted font-bold uppercase">Active Agent</p>
                   </div>
                 </>
               ) : (
                 <>
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                     <UserPlus size={20} />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-400">Waiting...</p>
                     <p className="text-[10px] text-slate-300 font-bold uppercase">No Assignment</p>
                   </div>
                 </>
               )}
            </div>

            {isAdmin && (
              <div className="space-y-3">
                <select 
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  value={ticket.assigneeId || ''}
                  onChange={(e) => {
                    const selectedAdmin = admins.find(a => a.uid === e.target.value);
                    if (selectedAdmin) handleAssign(selectedAdmin.uid, selectedAdmin.displayName);
                  }}
                >
                  <option value="" disabled>Select internal agent...</option>
                  {admins.map(admin => (
                    <option key={admin.uid} value={admin.uid}>{admin.displayName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">System Status</h4>
            <div className={`mb-6 flex items-center justify-center rounded-lg py-2 border ${getStatusPillColor(ticket.status)}`}>
               <span className="font-bold uppercase tracking-widest text-[11px]">{ticket.status}</span>
            </div>

            {isAdmin && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <StatusBtn active={ticket.status === 'open'} onClick={() => handleUpdateStatus('open')} label="Re-open" color="indigo" />
                  <StatusBtn active={ticket.status === 'in-process'} onClick={() => handleUpdateStatus('in-process')} label="In Process" color="amber" />
                  <StatusBtn active={ticket.status === 'closed'} onClick={() => handleUpdateStatus('closed')} label="Closed" color="emerald" />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
             <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Lifecycle Data</h4>
             <div className="space-y-3 text-[12px] font-medium">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-text-muted">Opened</span>
                  <span className="text-text-main tabular-nums">{ticket.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Last Sync</span>
                  <span className="text-text-main tabular-nums">{ticket.updatedAt?.toDate().toLocaleDateString()}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBtn({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color: string }) {
  const base = "w-full rounded-lg px-4 py-2 text-[11px] font-bold uppercase transition-all border tracking-widest";
  const colors: Record<string, string> = {
    indigo: active ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-transparent border-gray-100 text-gray-400 hover:border-amber-100 hover:text-amber-600',
    amber: active ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-transparent border-gray-100 text-gray-400 hover:border-blue-100 hover:text-blue-600',
    emerald: active ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-transparent border-gray-100 text-gray-400 hover:border-emerald-100 hover:text-emerald-600',
  };

  return (
    <button onClick={onClick} className={`${base} ${colors[color]}`}>
      {label}
    </button>
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

function getStatusPillColor(status: string) {
  switch (status) {
    case 'open': return 'bg-amber-100 border-amber-200 text-amber-800';
    case 'in-process': return 'bg-blue-100 border-blue-200 text-blue-800';
    case 'closed': return 'bg-emerald-100 border-emerald-200 text-emerald-800';
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
