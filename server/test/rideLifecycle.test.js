import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdminTransitionBooking,
  canDriverTransitionBooking,
  canRiderCancelBooking,
  canDriverAcceptBooking,
} from '../src/domain/rideLifecycle.js';

test('admin can reject or cancel a pending request but cannot assign a driver by status alone', () => {
  assert.equal(canAdminTransitionBooking('requested', 'rejected'), true);
  assert.equal(canAdminTransitionBooking('requested', 'cancelled'), true);
  assert.equal(canAdminTransitionBooking('requested', 'driver_assigned'), false);
  assert.equal(canAdminTransitionBooking('completed', 'cancelled'), false);
});

test('driver trip transitions follow the permitted lifecycle', () => {
  assert.equal(canDriverTransitionBooking('driver_assigned', 'in_progress'), true);
  assert.equal(canDriverTransitionBooking('in_progress', 'completed'), true);
  assert.equal(canDriverTransitionBooking('requested', 'completed'), false);
  assert.equal(canDriverTransitionBooking('completed', 'in_progress'), false);
});

test('riders can only cancel eligible booking states', () => {
  assert.equal(canRiderCancelBooking('requested'), true);
  assert.equal(canRiderCancelBooking('accepted'), true);
  assert.equal(canRiderCancelBooking('driver_assigned'), false);
  assert.equal(canRiderCancelBooking('completed'), false);
});

test('only approved online drivers can accept unassigned requested rides', () => {
  assert.equal(canDriverAcceptBooking({status:'requested',driverId:null,approved:true,available:true}), true);
  assert.equal(canDriverAcceptBooking({status:'requested',driverId:null,approved:false,available:true}), false);
  assert.equal(canDriverAcceptBooking({status:'requested',driverId:null,approved:true,available:false}), false);
  assert.equal(canDriverAcceptBooking({status:'requested',driverId:'driver-1',approved:true,available:true}), false);
  assert.equal(canDriverAcceptBooking({status:'completed',driverId:null,approved:true,available:true}), false);
});
