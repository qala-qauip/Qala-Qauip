/**
 * Phase 0 Payload-First Security Test Specification for QalaQauip Firestore Rules.
 * Verifies that all 12 "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: string;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Role Escalation on User Create',
    operation: 'create',
    path: '/users/attacker1',
    auth: { uid: 'attacker1', email: 'a@example.com', email_verified: true },
    payload: {
      uid: 'attacker1',
      displayName: 'Attacker',
      role: 'platform_admin',
      cityId: 'shymkent',
      language: 'kk',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    name: 'Role Escalation on User Update',
    operation: 'update',
    path: '/users/citizen1',
    auth: { uid: 'citizen1', email: 'c@example.com', email_verified: true },
    payload: { role: 'city_admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    name: 'Reporter UID Spoofing',
    operation: 'create',
    path: '/citizenReports/rep1',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'rep1',
      cityId: 'shymkent',
      reporterUid: 'userB',
      category: 'road_pothole',
      description: 'Spoofed report',
      lat: 42.34,
      lng: 69.59,
      status: 'submitted',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    name: 'Shadow Field Injection on Incident',
    operation: 'create',
    path: '/incidents/inc_shadow',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'inc_shadow',
      trackingNumber: 'QQ-999',
      cityId: 'shymkent',
      district: 'Abay',
      category: 'flooding',
      severity: 'high',
      status: 'detected',
      title: 'Shadow test',
      lat: 42.34,
      lng: 69.59,
      source: 'citizen',
      reporterUid: 'userA',
      operatorVerified: false,
      shadowAdminFlag: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    name: 'Document ID Poisoning',
    operation: 'create',
    path: '/incidents/' + 'x'.repeat(160),
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { id: 'x'.repeat(160) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    name: 'Oversized Description Payload',
    operation: 'create',
    path: '/citizenReports/rep_huge',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'rep_huge',
      cityId: 'shymkent',
      reporterUid: 'userA',
      category: 'flooding',
      description: 'A'.repeat(2500),
      lat: 42.34,
      lng: 69.59,
      status: 'submitted',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/incidents/inc_time',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'inc_time',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    name: 'Immutable Field Mutation',
    operation: 'update',
    path: '/incidents/inc1',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { reporterUid: 'someone_else' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    name: 'Terminal State Reopening by Non-Admin',
    operation: 'update',
    path: '/incidents/inc_closed',
    auth: { uid: 'staff1', email: 's@example.com', email_verified: true },
    payload: { status: 'in_progress' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    name: 'Cross-User PII Read',
    operation: 'get',
    path: '/users/victim_uid/private/info',
    auth: { uid: 'attacker1', email: 'a@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    name: 'Unverified Email Write Rejection',
    operation: 'create',
    path: '/citizenReports/rep_unverified',
    auth: { uid: 'userU', email: 'u@example.com', email_verified: false },
    payload: {
      id: 'rep_unverified',
      cityId: 'shymkent',
      reporterUid: 'userU',
      category: 'flooding',
      description: 'Test',
      lat: 42.34,
      lng: 69.59,
      status: 'submitted',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    name: 'Audit Log Tampering',
    operation: 'delete',
    path: '/auditLogs/log1',
    auth: { uid: 'staff1', email: 's@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
