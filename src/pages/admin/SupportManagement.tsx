import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Search, MessageSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { formatDateTime } from '../../utils/formatters';

export const SupportManagement: React.FC = () => {
  const { supportTickets, updateTicketStatus, addTicketMessage } = useRide();
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState('');

  const filtered = supportTickets.filter((t) => filter === 'all' || t.status === filter);
  const activeTicket = supportTickets.find((t) => t.id === selectedTicketId) || null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTicket && adminReply.trim()) {
      addTicketMessage(activeTicket.id, adminReply.trim(), 'admin');
      setAdminReply('');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Ticket Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolve rider billing inquiries, lost luggage, and driver partner disputes.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          {['all', 'open', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === st
                  ? 'bg-[#102A43] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Ticket List */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 px-2">Support Tickets Queue</h2>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-colors space-y-1 ${
                    selectedTicketId === t.id ? 'bg-[#E5F4FF]/50 border border-[#0798F2]/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{t.ticketNumber}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 line-clamp-1">{t.subject}</div>
                  <div className="text-[11px] text-slate-500">
                    From: {t.userName} ({t.userRole}) · {t.category}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Discussion & Action Details */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            {activeTicket ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Ticket #{activeTicket.ticketNumber} · {activeTicket.category}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{activeTicket.subject}</h2>
                    <p className="text-xs text-slate-500">
                      Opened by {activeTicket.userName} on {formatDateTime(activeTicket.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={activeTicket.status}
                      onChange={(e) => updateTicketStatus(activeTicket.id, e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="space-y-3 max-h-80 overflow-y-auto p-2">
                  {activeTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                        m.senderRole === 'admin'
                          ? 'bg-[#E5F4FF] text-slate-900 ml-6 border border-[#0798F2]/20'
                          : 'bg-slate-50 text-slate-800 mr-6 border border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span>{m.senderName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {formatDateTime(m.createdAt)}
                        </span>
                      </div>
                      <p className="leading-relaxed">{m.message}</p>
                    </div>
                  ))}
                </div>

                {/* Admin Reply Input */}
                <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-slate-200">
                  <textarea
                    rows={3}
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Type official response to passenger / driver..."
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#0798F2] hover:bg-[#0570B5] text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                    >
                      Post Response
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Select a ticket from the left queue to inspect details and respond.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
