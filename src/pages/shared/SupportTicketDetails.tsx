import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LifeBuoy, ArrowLeft, Send, CheckCircle2, Clock } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatters';

export const SupportTicketDetails: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { supportTickets, addTicketMessage, updateTicketStatus } = useRide();
  const { currentRole } = useAuth();
  const [replyText, setReplyText] = useState('');

  const ticket = supportTickets.find((t) => t.id === ticketId) || supportTickets[0];

  if (!ticket) {
    return (
      <div className="flex-1 p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Ticket not found</h2>
        <Link to="/support" className="text-xs text-[#0798F2] underline mt-2 block">
          Return to Support Desk
        </Link>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      addTicketMessage(ticket.id, replyText.trim(), currentRole || undefined);
      setReplyText('');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <Link to="/support" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Tickets</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Ticket #{ticket.ticketNumber} · {ticket.category}
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">{ticket.subject}</h1>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-3 py-1 rounded-full w-fit">
              Status: {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
            {ticket.messages.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                  m.senderRole === 'admin'
                    ? 'bg-[#E5F4FF] text-slate-900 ml-6 sm:ml-12 border border-[#0798F2]/20'
                    : 'bg-slate-50 text-slate-800 mr-6 sm:mr-12 border border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span>{m.senderName} ({m.senderRole})</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {formatDateTime(m.createdAt)}
                  </span>
                </div>
                <p className="leading-relaxed text-slate-700">{m.message}</p>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSend} className="pt-4 border-t border-slate-100 space-y-3">
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply or additional details..."
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Replies are notified immediately in the Notifications Centre.
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0798F2] hover:bg-[#0570B5] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reply</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
