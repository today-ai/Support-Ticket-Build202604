/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from './hooks/useAuth';
import { loginWithGoogle, logout, db, collection, query, where, onSnapshot, orderBy, doc, getDoc, getDocFromServer } from './firebase';
import { Layout, Ticket, Users, PieChart, LogOut, Bell, Plus, Search, Filter, CheckCircle2, Circle, Clock, ChevronRight, X, MessageSquare, ShieldCheck, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from './types';

// Components
import TicketList from './components/TicketList';
import AdminDashboard from './components/AdminDashboard';
import CreateTicket from './components/CreateTicket';
import TicketDetail from './components/TicketDetail';

export default function App() {
  const { user, profile, loading, isAdmin } = useAuth();
  const [view, setView] = useState<'tickets' | 'admin'>('tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isShowingCreate, setIsShowingCreate] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Connection validation as per guidelines
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  // Notifications listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg text-text-muted">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-widest">Resolving Session...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg p-4 flex-col text-center">
      <div className="mb-8 flex flex-col items-center">
        <div className="h-16 w-16 bg-primary rounded-xl flex items-center justify-center text-white shadow-xl shadow-primary/20 mb-4 animate-bounce">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-4xl font-black text-text-main tracking-tighter">ResolveFlow</h1>
        <p className="text-text-muted text-sm font-medium">Enterprise Unified Support Ecosystem</p>
      </div>
      <button 
        onClick={loginWithGoogle}
        className="flex items-center gap-3 rounded-lg bg-white border border-border px-8 py-4 font-bold text-text-main shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        <img src="https://www.google.com/favicon.ico" alt="" className="h-5 w-5" />
        Continue with Governance
      </button>
      <div className="mt-12 text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] opacity-30">
        System Protocol v4.0.1 • Encrypted SSL
      </div>
    </div>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex min-h-screen bg-app-bg text-text-main font-sans selection:bg-primary/20">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileMenu(false)}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-white transition-transform duration-300 lg:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
            <ShieldCheck size={18} />
          </div>
          <span className="text-lg font-black tracking-tight uppercase">ResolveFlow</span>
        </div>
        
        <div className="flex w-full flex-1 flex-col mt-4">
          <NavItem 
            active={view === 'tickets'} 
            onClick={() => { setView('tickets'); setSelectedTicketId(null); setShowMobileMenu(false); }}
            icon={<Ticket size={18} />}
            label="All Tickets"
          />
          {isAdmin && (
            <NavItem 
              active={view === 'admin'} 
              onClick={() => { setView('admin'); setSelectedTicketId(null); setShowMobileMenu(false); }}
              icon={<Users size={18} />}
              label="Dashboard"
            />
          )}
          <NavItem 
            active={false} 
            onClick={() => {}}
            icon={<PieChart size={18} />}
            label="Reporting"
          />
          <NavItem 
            active={false} 
            onClick={() => {}}
            icon={<Activity size={18} />}
            label="CRM Sync"
          />
        </div>

        <div className="mt-auto w-full px-6 mb-6">
          <div className="flex items-center gap-3 py-4 border-t border-white/10">
             <img src={profile?.photoURL} alt="" className="h-8 w-8 rounded-full bg-slate-500" />
             <div className="overflow-hidden">
               <p className="truncate text-sm font-semibold text-white">{profile?.displayName}</p>
               <p className="truncate text-[10px] text-white/50 uppercase font-bold tracking-wider">{profile?.role}</p>
             </div>
          </div>
          <button 
            onClick={logout}
            className="flex w-full items-center gap-3 py-2 text-white/50 transition-colors hover:text-white group"
          >
            <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowMobileMenu(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted hover:text-text-main lg:hidden"
            >
              <Layout size={18} />
            </button>
            <div className="relative hidden md:block w-72 lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/40" size={14} />
              <input 
                type="text" 
                placeholder="Global Registry Search..." 
                className="w-full rounded-lg border border-border bg-app-bg px-4 py-2 pl-9 text-[13px] placeholder:text-text-muted/30 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <button 
              onClick={logout}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-text-muted hover:bg-app-bg hover:text-text-main transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-8 w-8 items-center justify-center text-text-muted transition-all hover:bg-app-bg rounded-lg"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-4 ring-white" />
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-100 bg-white p-2 shadow-2xl xl:w-96"
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 mb-2">
                       <span className="text-sm font-bold text-gray-900 uppercase">Notifications</span>
                       <button onClick={() => setShowNotifications(false)}><X size={16}/></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400 italic">No new notifications</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-4 rounded-lg mb-1 transition-colors ${n.read ? 'opacity-60' : 'bg-indigo-50/50 hover:bg-indigo-50'}`}>
                             <p className="text-xs font-semibold text-gray-900 mb-1">{n.message}</p>
                             <p className="text-[10px] text-gray-400">{n.createdAt?.toDate().toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {view === 'tickets' && (
              <button 
                onClick={() => setIsShowingCreate(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100"
              >
                <Plus size={18} />
                New Ticket
              </button>
            )}
          </div>
        </header>

        {/* Dynamic View */}
        <div className="p-6">
          {selectedTicketId ? (
            <TicketDetail 
              ticketId={selectedTicketId} 
              onBack={() => setSelectedTicketId(null)} 
              isAdmin={isAdmin}
            />
          ) : (
            view === 'tickets' ? (
              <TicketList onSelectTicket={setSelectedTicketId} isAdmin={false} userId={user.uid} />
            ) : (
              <AdminDashboard onSelectTicket={setSelectedTicketId} />
            )
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isShowingCreate && (
          <CreateTicket onClose={() => setIsShowingCreate(false)} user={user} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 px-6 py-3 text-sm font-medium transition-all ${
        active 
          ? 'bg-white/10 text-white border-l-4 border-primary pl-5' 
          : 'text-white/60 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
      }`}
    >
      <span className="transition-transform group-hover:scale-110">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
