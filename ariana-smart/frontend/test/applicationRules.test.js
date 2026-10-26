import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplication, parseDate } from '../src/lib/applicationRules.js';

const NOW = new Date('2026-10-18T12:00:00Z');
const good = {
  fullName: '  Test   Passenger ', dateOfBirth: '1990-05-20', nationality: 'Testland', email: ' Test@Example.com ',
  phone: '+93 70 123 4567', idDocumentNumber: 'TP-12345', origin: 'KBL', destination: 'DXB', tripType: 'return',
  departDate: '2026-11-01', returnDate: '2026-11-10', passengers: 2, consent: true, idempotencyKey: 'a'.repeat(36)
};
const errs = (o) => validateApplication({ ...good, ...o }, NOW).errors;

test('valid application passes and is normalised', () => {
  const r = validateApplication(good, NOW);
  assert.deepEqual(r.errors, {});
  assert.equal(r.value.fullName, 'Test Passenger');
  assert.equal(r.value.email, 'test@example.com');
});
test('only known fields survive (user_id / status / reference are dropped)', () => {
  const r = validateApplication({ ...good, user_id: 'evil', status: 'approved_demo', reference: 'ASM-X', sheet_sync_status: 'synced' }, NOW);
  const keys = Object.keys(r.value);
  for (const bad of ['user_id', 'status', 'reference', 'sheet_sync_status']) assert.ok(!keys.includes(bad));
});
test('field rules', () => {
  assert.equal(errs({ fullName: 'A' }).fullName, 'nameShort');
  assert.equal(errs({ dateOfBirth: '2999-01-01' }).dateOfBirth, 'dobFuture');
  assert.equal(errs({ dateOfBirth: '1800-01-01' }).dateOfBirth, 'dobOld');
  assert.equal(errs({ dateOfBirth: '2025-02-31' }).dateOfBirth, 'dateInvalid');
  assert.equal(errs({ email: 'bad' }).email, 'emailInvalid');
  assert.equal(errs({ phone: 'abc' }).phone, 'phoneInvalid');
  assert.equal(errs({ phone: '' }).phone, undefined);
  assert.equal(errs({ idDocumentNumber: 'x y!' }).idDocumentNumber, 'docInvalid');
  assert.equal(errs({ origin: 'XXX' }).origin, 'required');
  assert.equal(errs({ destination: 'KBL' }).destination, 'sameAirport');
  assert.equal(errs({ tripType: 'multi' }).tripType, 'required');
  assert.equal(errs({ departDate: '2026-10-17' }).departDate, 'datePast');
  assert.equal(errs({ departDate: '2026-10-18' }).departDate, undefined); // today is allowed
  assert.equal(errs({ returnDate: '2026-10-30' }).returnDate, 'returnBeforeDepart');
  assert.equal(errs({ returnDate: '' }).returnDate, 'required');
  assert.equal(errs({ passengers: 0 }).passengers, 'passengersRange');
  assert.equal(errs({ passengers: 10 }).passengers, 'passengersRange');
  assert.equal(errs({ passengers: 1.5 }).passengers, 'passengersRange');
  assert.equal(errs({ consent: false }).consent, 'consentRequired');
  assert.equal(errs({ consent: 'true' }).consent, 'consentRequired');
  assert.equal(errs({ idempotencyKey: 'short' }).idempotencyKey, 'badKey');
});
test('one-way ignores any return date', () => {
  const r = validateApplication({ ...good, tripType: 'one_way', returnDate: '2020-01-01' }, NOW);
  assert.deepEqual(r.errors, {});
  assert.equal(r.value.returnDate, null);
});
test('garbage input does not throw', () => {
  for (const x of [null, undefined, 5, 'str', []]) assert.ok(Object.keys(validateApplication(x, NOW).errors).length > 0);
  assert.equal(parseDate('2026-13-01'), null);
});
