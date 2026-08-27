'use client';
// src/app/farmer/notifications/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { ChevronLeft, LogOut, Bell, TreePine, CheckCircle, XCircle, Clock } from 'lucide-react';

const TYPE_ICON: Record<string, any> = {
  PLANTATION_ASSIGNED: TreePine, MONITORING_SCHEDULED: Clock, UPDATE_APPROVED: CheckCircle,
  UPDATE_REJECTED: XCircle, ACTIVITY_REMINDER: Bell, MONITORING_DUE: Clock, PENDING_REVIEW: Clock,
};

export default function FarmerNotificationsPage() {
  const org    = useOrgConfig();
  const router = useRouter();
  const primaryColor = org.primaryColor || '#2d5a1b';

  const [farmerId, setFarmerId] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('farmerId');
    if (!id) { router.push('/farmer/login'); return; }
    setFarmerId(id);
    load(id);
  }, []);

  async function load(id: string) {
    setLoading(true);
    const res = await fetch(`/api/farmer/notifications?farmerId=${id}`);
    const data = await res.json();
    setNotifications(data.notifications || []);
    setLoading(false);
    if ((data.unreadCount || 0) > 0) {
      fetch('/api/farmer/notifications', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId: id, markAllRead: true }),
      });
    }
  }

  function logout() {
    localStorage.removeItem('farmerId');
    localStorage.removeItem('farmerMobile');
    router.push('/farmer/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="text-white px-4 py-4 sticky top-0 z-40" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/farmer/dashboard')} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div className="font-bold text-sm">Notifications</div>
          <button onClick={logout} aria-label="Sign Out"
            className="ml-auto text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
            <p className="text-gray-500 text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: any) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              return (
                <a key={n.id} href={n.link || '#'}
                  className={`block bg-white rounded-2xl border p-4 hover:shadow-sm transition-shadow ${!n.read ? 'border-sage-200' : 'border-gray-100'}`}>
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: primaryColor + '15' }}>
                      <Icon className="w-4 h-4" style={{ color: primaryColor }}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{n.title}</div>
                      {n.message && <div className="text-gray-500 text-xs mt-0.5">{n.message}</div>}
                      <div className="text-gray-400 text-[10px] mt-1">
                        {new Date(n.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
