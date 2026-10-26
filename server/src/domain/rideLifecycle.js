export function canAdminTransitionBooking(from, to) {
  const transitions = {
    requested: ['rejected', 'cancelled'],
    accepted: ['cancelled'],
    driver_assigned: ['cancelled'],
    in_progress: [],
    completed: [],
    cancelled: [],
    rejected: [],
  };
  return Boolean(transitions[from]?.includes(to));
}

export function canDriverTransitionBooking(from, to) {
  const transitions = {
    driver_assigned: ['in_progress'],
    in_progress: ['completed'],
    requested: [],
    accepted: [],
    completed: [],
    cancelled: [],
    rejected: [],
  };
  return Boolean(transitions[from]?.includes(to));
}

export function canRiderCancelBooking(status) {
  return ['requested', 'accepted'].includes(status);
}

export function canDriverAcceptBooking({ status, driverId, approved, available }) {
  return status === 'requested' && !driverId && approved === true && available === true;
}
