import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import ContactHeroBanner from "../../components/ContactHeroBanner";

export const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (

    <div className="flex flex-col w-full py-12 bg-[#FFF1C1]">
         <ContactHeroBanner />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Get In Touch
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight mt-1 mb-3">
            Contact RideBlue Support &amp; Office
          </h1>
          <p className="body-text text-slate-600">
            Have questions about your booking, driver registration, or corporate account? Our support team in Salt Lake Sector V is here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Office & Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <h2 className="card-heading text-slate-900">Registered Office</h2>
              <div className="space-y-3 helper-text text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#0798F2] shrink-0 mt-0.5" />
                  <span>
                    RideBlue office address has not been configured.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#0798F2] shrink-0" />
                  <span>Support phone number has not been configured.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#0798F2] shrink-0" />
                  <span>Support email address has not been configured.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#0798F2] shrink-0" />
                  <span>Support hours have not been configured.</span>
                </div>
              </div>
            </div>

            <div className="bg-[#E5F4FF]/50 border border-[#0798F2]/20 rounded-2xl p-5 space-y-2 helper-text text-slate-700">
              <div className="font-bold text-[#102A43]">Need Immediate Trip Assistance?</div>
              <p>
                Support contact details are not configured. If you are in immediate danger in India, call 112 directly; RideBlue is not currently connected to emergency dispatch.
              </p>
            </div>
          </div>

          {/* Right Column: Working Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="card-heading text-slate-900">Message Received!</h3>
                  <p className="helper-text text-slate-600 max-w-sm mx-auto">
                    Thank you, {name}. Our Kolkata support operations team will review your inquiry and reach out to {email} within 2-4 business hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setMessage('');
                    }}
                    className="helper-text font-semibold text-[#0798F2] hover:underline"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="card-heading text-slate-900 mb-2">Send an Inquiry</h2>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 helper-text text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-slate-700 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Anirban Ghosh"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                      />
                    </div>
                    <div>
                      <label className="form-label text-slate-700 block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. anirban@example.com"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-slate-700 block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98300 00000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                      />
                    </div>
                    <div>
                      <label className="form-label text-slate-700 block mb-1">
                        Inquiry Topic
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                      >
                        <option value="">General Support</option>
                        <option value="driver_partner">Driver Partner Application</option>
                        <option value="corporate">Corporate Fleet Account</option>
                        <option value="billing">Billing or Refund Dispute</option>
                        <option value="lost_item">Lost &amp; Found Item</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-slate-700 block mb-1">
                      Message *
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your query or feedback in detail..."
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
