import { useState, FormEvent } from 'react';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { User } from 'firebase/auth';
import { X, Send, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { TicketPriority } from '../types';

interface CreateTicketProps {
  onClose: () => void;
  user: User;
}

export default function CreateTicket({ onClose, user }: CreateTicketProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, 'tickets'), {
        title,
        description,
        priority,
        status: 'open',
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous',
        assigneeEmail: assigneeEmail.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">New Support Ticket</h3>
          <button onClick={onClose} className="rounded-md p-1 text-text-muted hover:bg-app-bg hover:text-text-main">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-xs font-bold text-red-600 border border-red-100 uppercase tracking-tight">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-text-muted">Issue Subject</label>
              <input 
                autoFocus
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Briefly describe the issue..."
                className="w-full rounded-lg border border-border bg-app-bg px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium placeholder:text-text-muted/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-text-muted">Impact Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-lg py-2 text-[10px] font-bold uppercase transition-all border ${
                      priority === p 
                        ? 'bg-primary border-primary text-white shadow-sm' 
                        : 'bg-white border-border text-text-muted hover:border-primary/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-text-muted">Assign To (Email) <span className="lowercase font-normal tracking-normal">- Optional</span></label>
              <input 
                type="email" 
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                placeholder="agent@example.com"
                className="w-full rounded-lg border border-border bg-app-bg px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium placeholder:text-text-muted/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-text-muted">Detailed Description</label>
              <textarea 
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include error codes, IDs, and clear steps to reproduce..."
                className="w-full rounded-lg border border-border bg-app-bg px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none font-medium placeholder:text-text-muted/30"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white border border-border px-4 py-2.5 text-[11px] font-bold uppercase text-text-muted transition-colors hover:bg-app-bg hover:text-text-main"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[11px] font-bold uppercase text-white shadow-sm transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send size={16} />
                  Initiate Resolution
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
