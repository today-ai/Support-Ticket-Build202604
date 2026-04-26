import { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from '../firebase';
import { UserProfile } from '../hooks/useAuth';
import { Users, Mail, Shield, Trash2, UserCog, Search, ShieldCheck, ShieldAlert, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
    setUpdatingId(userId);
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      // allow some time for UI to finish transitioning
      setTimeout(() => setUpdatingId(null), 500);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will not remove their authentication account, only their database profile.')) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="text-center py-20 text-text-muted">Loading user registry...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-main uppercase">User Governance</h2>
          <p className="text-xs font-medium text-text-muted">Manage system roles and access control</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/40" size={14} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 pl-9 text-[13px] placeholder:text-text-muted/30 focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-app-bg/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Identity</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Email Hash</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Access Level</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-text-muted italic">
                    No matching identities found in core database
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-app-bg/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="h-8 w-8 rounded-md bg-border shadow-sm border border-border" />
                        ) : (
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase border border-primary/20">
                            {user.displayName[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-text-main leading-tight">{user.displayName}</p>
                          <p className="text-[10px] font-mono text-text-muted uppercase">UID: {user.uid.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[13px] font-medium text-text-muted">
                        <Mail size={12} className="opacity-40" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                        user.role === 'admin' 
                          ? 'bg-blue-50 border-blue-100 text-blue-700' 
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}>
                        {user.role === 'admin' ? <ShieldCheck size={10} /> : <Shield size={10} />}
                        {user.role}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleRole(user.uid, user.role)}
                          disabled={updatingId === user.uid}
                          title={`Change role to ${user.role === 'admin' ? 'user' : 'admin'}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-text-muted transition-all hover:bg-primary hover:border-primary hover:text-white group-hover:shadow-sm"
                        >
                          {updatingId === user.uid ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <UserCog size={14} />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.uid)}
                          title="Purge Identity"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-text-muted transition-all hover:bg-red-500 hover:border-red-500 hover:text-white group-hover:shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Access Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-blue-50/50 p-4 flex gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-800">Administrator Access</h4>
            <p className="text-[11px] font-medium text-blue-600/80 leading-relaxed">Full system governance including ticket resolution, agent assignment, and audit logs.</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-slate-50/50 p-4 flex gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
            <Shield size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Standard User</h4>
            <p className="text-[11px] font-medium text-slate-600/80 leading-relaxed">Basic ticket creation and inquiry status. Subject to organizational visibility limits.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
