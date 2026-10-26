import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Star,
  Download,
  Calendar,
  CheckCircle2,
  Printer,
  X,
  CreditCard,
  MapPin,
} from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { RideBooking } from '../../types';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const RideHistory: React.FC = () => {
  const { bookings, submitReview } = useRide();
  const completed = bookings.filter((b) => b.status === 'completed');

  const [receiptBooking, setReceiptBooking] = useState<RideBooking | null>(null);
  const [reviewModalBooking, setReviewModalBooking] = useState<RideBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleDownloadInvoice = (b: RideBooking) => {
    const content = `=====================================================
RIDEBLUE TRANSPORT SERVICES — OFFICIAL TAX INVOICE
=====================================================
Invoice / Trip Ref: ${b.bookingCode}
Date: ${new Date(b.createdAt).toLocaleDateString('en-IN')}
GSTIN: 19AAECR4912K1Z9
Jurisdiction: Kolkata, West Bengal (State Code: 19)

RIDER DETAILS:
Name: ${b.riderName}
Phone: ${b.riderPhone}

DRIVER PARTNER:
Name: ${b.driverName || 'No driver assigned'}
Vehicle: ${b.vehicleModel || 'Unavailable'}${b.vehiclePlate ? ` (${b.vehiclePlate})` : ''}

ROUTE:
Pickup: ${b.pickup.address}
Destination: ${b.destination.address}
Distance: ${b.distanceKm} km
Duration: ${b.estimatedDurationMin} mins

ITEMIZED FARE BREAKDOWN:
Base Fare: Rs. ${b.fareBreakdown.baseFare}
Distance Charge: Rs. ${b.fareBreakdown.distanceCharge}
Time Charge: Rs. ${b.fareBreakdown.timeCharge}
Tolls & Airport Levies: ${b.fareBreakdown.tollCharges == null ? 'Not included / not configured' : `Rs. ${b.fareBreakdown.tollCharges}`}
Configured taxes: Rs. ${b.fareBreakdown.taxes}
Discount Applied: -Rs. ${b.fareBreakdown.discount}
-----------------------------------------------------
TOTAL FARE: Rs. ${b.fareBreakdown.total}
Settlement Mode: ${b.paymentMethod.toUpperCase()} (Status: ${b.paymentStatus.toUpperCase()})
=====================================================
Thank you for riding with RideBlue West Bengal!
Support contact information has not been configured.
=====================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RideBlue_Invoice_${b.bookingCode}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReviewSubmit = () => {
    if (reviewModalBooking) {
      submitReview(reviewModalBooking.id, rating, comment);
      setReviewModalBooking(null);
      setComment('');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading text-slate-900">Ride History &amp; Receipts</h1>
            <p className="body-text text-slate-500 mt-0.5">
              Review completed trips, download official GST tax invoices, and rate drivers.
            </p>
          </div>
          <Link
            to="/rider/book"
            className="px-4 py-2 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-sm"
          >
            + Book New Ride
          </Link>
        </div>

        {completed.length > 0 ? (
          <div className="space-y-4">
            {completed.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{b.bookingCode}</span>
                    <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-bold">
                      Completed
                    </span>
                    <span className="text-xs text-slate-400 capitalize">· RideBlue {b.vehicleCategory}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(b.completedAt || b.createdAt)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Pickup</div>
                        <div className="font-semibold text-slate-800">{b.pickup.address}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Destination</div>
                        <div className="font-semibold text-slate-800">{b.destination.address}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Driver &amp; Vehicle:</span>
                      <span className="font-bold text-slate-800">{b.driverName} ({b.vehiclePlate})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Distance Travelled:</span>
                      <span className="font-bold text-slate-800">{b.distanceKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Final Paid Fare:</span>
                      <span className="font-extrabold text-[#102A43] tabular-nums">
                        {formatINR(b.fareBreakdown.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating or Review Status */}
                {b.review ? (
                  <div className="p-3 bg-[#FFF8E7]/60 rounded-xl border border-amber-200/60 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex text-amber-500 font-bold">
                        {'★'.repeat(b.review.rating)}
                      </div>
                      <span className="text-slate-700 italic">"{b.review.comment || 'Rated 5 stars'}"</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Feedback Submitted</span>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => setReviewModalBooking(b)}
                      className="text-xs font-bold text-[#0798F2] hover:underline flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Leave Driver Review</span>
                    </button>
                  </div>
                )}

                {/* Action: Receipt download modal trigger */}
                <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(b)}
                    className="px-4 py-2 bg-[#E5F4FF] hover:bg-[#d0ebff] text-[#0798F2] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptBooking(b)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="card-heading text-slate-800">No Completed Rides Yet</h3>
            <p className="body-text text-slate-500 max-w-sm mx-auto">
              Once you complete trips with RideBlue, your journey receipts and driver rating options will show up here.
            </p>
          </div>
        )}

        {/* OFFICIAL TAX INVOICE RECEIPT MODAL */}
        {receiptBooking && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setReceiptBooking(null)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Receipt Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0798F2] text-white flex items-center justify-center font-bold text-sm">
                    RB
                  </div>
                  <div>
                    <h2 className="card-heading text-slate-900">RideBlue Tax Invoice</h2>
                    <p className="helper-text text-slate-400">GSTIN: 19AAACR4412Q1ZX · Kolkata</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">{receiptBooking.bookingCode}</div>
                  <div className="text-[10px] text-slate-400">{formatDateTime(receiptBooking.createdAt)}</div>
                </div>
              </div>

              {/* Passenger & Driver Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Passenger</span>
                  <div className="font-bold text-slate-900">{receiptBooking.riderName}</div>
                  <div className="text-slate-500">{receiptBooking.riderPhone}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Driver Partner</span>
                  <div className="font-bold text-slate-900">{receiptBooking.driverName}</div>
                  <div className="text-slate-500">{receiptBooking.vehiclePlate}</div>
                </div>
              </div>

              {/* Trip Route */}
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Pickup Location</span>
                  <div className="font-medium text-slate-800">{receiptBooking.pickup.address}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Drop-off Destination</span>
                  <div className="font-medium text-slate-800">{receiptBooking.destination.address}</div>
                </div>
              </div>

              {/* Itemized Charges */}
              <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base Vehicle Fare ({receiptBooking.vehicleCategory})</span>
                  <span className="tabular-nums">{formatINR(receiptBooking.fareBreakdown.baseFare)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Distance Charge ({receiptBooking.distanceKm} km)</span>
                  <span className="tabular-nums">{formatINR(receiptBooking.fareBreakdown.distanceCharge)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Time Charge ({receiptBooking.estimatedDurationMin} mins)</span>
                  <span className="tabular-nums">{formatINR(receiptBooking.fareBreakdown.timeCharge)}</span>
                </div>
                {(receiptBooking.fareBreakdown.tollCharges ?? 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Toll / Airport Charge</span>
                    <span className="tabular-nums">{formatINR(receiptBooking.fareBreakdown.tollCharges ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Configured taxes</span>
                  <span className="tabular-nums">{formatINR(receiptBooking.fareBreakdown.taxes)}</span>
                </div>
                {receiptBooking.fareBreakdown.tollCharges == null && <p className="text-[11px] text-amber-700">Toll and airport levies were not included; toll pricing was not configured for this booking.</p>}
                {receiptBooking.fareBreakdown.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Promo Coupon Discount</span>
                    <span className="tabular-nums">- {formatINR(receiptBooking.fareBreakdown.discount)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Total Fare</span>
                  <span className="text-base font-black text-[#102A43] tabular-nums">
                    {formatINR(receiptBooking.fareBreakdown.total)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(receiptBooking)}
                  className="flex-1 py-2.5 bg-[#0798F2] hover:bg-[#057ecb] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (.txt)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptBooking(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW MODAL */}
        {reviewModalBooking && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="card-heading text-slate-900">
                Rate Driver {reviewModalBooking.driverName}
              </h3>
              <p className="helper-text text-slate-500">
                How was your ride in {reviewModalBooking.vehiclePlate}?
              </p>

              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-125 transition-transform"
                  >
                    <Star
                      className="w-8 h-8"
                      fill={star <= rating ? '#FBBF24' : 'none'}
                      stroke="#FBBF24"
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your driving and vehicle experience..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-800"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalBooking(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 btn-text rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  className="flex-1 py-2 bg-[#0798F2] text-white btn-text rounded-xl shadow-sm"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
