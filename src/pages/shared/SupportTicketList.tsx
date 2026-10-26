import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LifeBuoy, Plus, MessageSquare, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatters';

export const SupportTicketList: React.FC = () => {
  const { supportTickets, createSupportTicket } = useRide();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Billing & Fare Dispute');
  const [description, setDescription] = useState('');
  const [bookingRef, setBookingRef] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() && description.trim()) {
      const ticket = await createSupportTicket(subject.trim(), category, description.trim(), bookingRef.trim() || undefined);
      setIsCreating(false);
      setSubject('');
      setDescription('');
      navigate(`/support/${ticket.id}`);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Help &amp; Support Desk</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit support tickets, dispute fares, or report lost luggage.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2 bg-[#FFE600] text-slate-950 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Open New Ticket</span>
          </button>
        </div>

        {/* Create Ticket Modal / Inline form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Create New Support Request</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Inquiry Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Billing & Fare Dispute">Billing &amp; Fare Dispute</option>
                  <option value="Airport Toll Question">Airport Toll Question</option>
                  <option value="Lost Luggage & Items">Lost Luggage &amp; Belongings</option>
                  <option value="Driver Behaviour">Driver Conduct or Safety</option>
                  <option value="App or Geolocation Bug">App or Geolocation Bug</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Optional Booking Ref</label>
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  placeholder="e.g. RB-9842"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Subject Title *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what occurred, dates, and what assistance you require..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0798F2] text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Submit Ticket
              </button>
            </div>
          </form>
        )}

        {/* Tickets List */}
        <div className="space-y-3">
          {supportTickets.map((t) => (
            <Link
              key={t.id}
              to={`/support/${t.id}`}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-[#0798F2] transition-colors block group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{t.ticketNumber}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {t.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400">· {t.category}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {formatDateTime(t.updatedAt || t.createdAt)}
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0798F2] transition-colors">
                {t.subject}
              </h3>
              <p className="text-xs text-slate-600 line-clamp-1 mt-1">{t.description}</p>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{t.messages.length} message(s) in thread</span>
                <span className="text-[#0798F2] font-semibold flex items-center gap-1">
                  <span>View Thread</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
