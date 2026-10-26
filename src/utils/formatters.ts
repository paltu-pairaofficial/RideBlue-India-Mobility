import { RideStatus, PaymentStatus, DriverApprovalStatus } from '../types';

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function getRideStatusConfig(status: RideStatus): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  switch (status) {
    case 'requested':
      return {
        label: 'Searching Driver',
        badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
        dotColor: 'bg-amber-500',
      };
    case 'accepted':
      return {
        label: 'Driver Assigned',
        badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200',
        dotColor: 'bg-blue-500',
      };
    case 'driver_arriving':
      return {
        label: 'Driver Arriving',
        badgeClass: 'text-indigo-700 bg-indigo-50 border border-indigo-200',
        dotColor: 'bg-indigo-500',
      };
    case 'in_progress':
      return {
        label: 'Trip In Progress',
        badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    case 'completed':
      return {
        label: 'Completed',
        badgeClass: 'text-slate-700 bg-slate-100 border border-slate-200',
        dotColor: 'bg-slate-500',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200',
        dotColor: 'bg-rose-500',
      };
    default:
      return {
        label: status,
        badgeClass: 'text-slate-600 bg-slate-50 border border-slate-200',
        dotColor: 'bg-slate-400',
      };
  }
}

export function getDriverApprovalConfig(status: DriverApprovalStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'approved':
      return {
        label: 'Verified & Approved',
        badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
      };
    case 'pending':
      return {
        label: 'Verification Pending',
        badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
      };
    case 'rejected':
      return {
        label: 'Application Rejected',
        badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200',
      };
    case 'correction_required':
      return {
        label: 'Correction Required',
        badgeClass: 'text-orange-700 bg-orange-50 border border-orange-200',
      };
  }
}

export function getPaymentStatusConfig(status: PaymentStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'paid':
      return {
        label: 'Paid',
        badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
      };
    case 'pending':
      return {
        label: 'Payment Pending',
        badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
      };
    case 'failed':
      return {
        label: 'Payment Failed',
        badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        badgeClass: 'text-purple-700 bg-purple-50 border border-purple-200',
      };
  }
}
