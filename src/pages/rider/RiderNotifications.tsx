import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { formatDateTime } from '../../utils/formatters';

export const RiderNotifications: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, clearAll, loading, error } = useNotifications();
  const riderNotifs = notifications.filter((n) => n.targetRole === 'rider' || n.targetRole === 'all');
  const navigate = useNavigate();

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {loading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading notifications…</div>}
        {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading text-slate-900">Passenger Notifications</h1>
            <p className="body-text text-slate-500 mt-0.5">
              Updates regarding driver assignment, trip arrivals, and receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-3 py-1.5 bg-white border border-slate-200 btn-text text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              Mark all read
            </button>
          </div>
        </div>

        {riderNotifs.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 overflow-hidden shadow-sm">
            {riderNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markAsRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                  !n.read ? 'bg-[#E5F4FF]/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-[#0798F2]' : 'bg-slate-200'}`} />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">{n.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                    <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(n.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {n.link && (
                  <span className="text-xs font-bold text-[#0798F2] shrink-0 hover:underline">
                    View &rarr;
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <Bell className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="card-heading text-slate-800">No Notifications</h3>
            <p className="body-text text-slate-500 max-w-sm mx-auto">
              You are all caught up! Trip updates and booking confirmations will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
