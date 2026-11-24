import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  CityId,
  Incident,
  IncidentCategory,
  IncidentStatus,
  Language,
  NotificationItem,
  SeverityLevel,
  UserProfile,
  UserRole,
  WorkOrder,
} from '../types.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
  };
}

export const ADMIN_EMAIL = 'nertondz@gmail.com';

const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or network connection.');
    }
    return { ok: false, error: msg };
  }
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || `id_${Date.now()}`;
}

export function generateId(prefix = 'qq'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'seconds' in val) {
    return new Date(Number((val as { seconds: number }).seconds) * 1000).toISOString();
  }
  return new Date().toISOString();
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  if (!cred.user.emailVerified) {
    await sendEmailVerification(cred.user);
  }
  return cred.user;
}

export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function observeAuth(cb: (user: FirebaseUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb);
}

export async function ensureUserDocs(
  fbUser: FirebaseUser,
  language: Language,
  cityId: CityId
): Promise<UserProfile> {
  const isDefaultAdmin = fbUser.email === ADMIN_EMAIL;
  const fallbackProfile: UserProfile = {
    uid: fbUser.uid,
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Qala User',
    email: fbUser.email || '',
    role: isDefaultAdmin ? 'platform_admin' : 'citizen',
    cityId,
    emailVerified: fbUser.emailVerified,
  };

  if (!fbUser.emailVerified) {
    return fallbackProfile;
  }

  const userRef = doc(db, 'users', fbUser.uid);
  const privateRef = doc(db, 'users', fbUser.uid, 'private', 'info');

  try {
    const snap = await getDoc(userRef);
    let role: UserRole = fallbackProfile.role;
    let resolvedName = fallbackProfile.displayName;
    let resolvedCity: CityId = cityId;

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: fbUser.uid,
        displayName: resolvedName.slice(0, 120),
        role,
        cityId: resolvedCity,
        language,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const data = snap.data();
      role = (data.role as UserRole) || role;
      resolvedName = (data.displayName as string) || resolvedName;
      resolvedCity = (data.cityId as CityId) || resolvedCity;
    }

    const privateSnap = await getDoc(privateRef);
    if (!privateSnap.exists() && fbUser.email) {
      await setDoc(privateRef, {
        uid: fbUser.uid,
        email: fbUser.email,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      uid: fbUser.uid,
      displayName: resolvedName,
      email: fbUser.email || '',
      role,
      cityId: resolvedCity,
      emailVerified: fbUser.emailVerified,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
    return fallbackProfile;
  }
}

export async function updateUserLanguagePref(uid: string, displayName: string, language: Language): Promise<void> {
  if (!auth.currentUser?.emailVerified) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: displayName.slice(0, 120),
      language,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

function mapIncidentDoc(docId: string, data: Record<string, unknown>): Incident {
  return {
    id: (data.id as string) || docId,
    trackingNumber: (data.trackingNumber as string) || `SHY-${docId.slice(-5).toUpperCase()}`,
    cityId: ((data.cityId as CityId) || 'shymkent'),
    district: (data.district as string) || 'alfarabi',
    category: (data.category as IncidentCategory) || 'infrastructure_damage',
    severity: (data.severity as SeverityLevel) || 'medium',
    status: (data.status as IncidentStatus) || 'detected',
    title: (data.title as string) || 'Incident',
    description: (data.description as string) || '',
    lat: Number(data.lat ?? 42.3417),
    lng: Number(data.lng ?? 69.5901),
    address: (data.address as string) || '',
    source: (data.source as Incident['source']) || 'operator',
    reporterUid: (data.reporterUid as string) || '',
    assignedDepartmentId: data.assignedDepartmentId as string | undefined,
    assignedStaffName: data.assignedStaffUid as string | undefined,
    operatorVerified: Boolean(data.operatorVerified),
    aiSummary: data.aiSummary as string | undefined,
    dueAt: data.dueAt ? toIsoString(data.dueAt) : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    history: [],
    comments: [],
  };
}

export function subscribeIncidents(
  cityId: CityId,
  user: UserProfile | null,
  onUpdate: (incidents: Incident[]) => void,
  onError?: (err: FirestoreErrorInfo) => void
): Unsubscribe {
  const merged = new Map<string, Incident>();
  const emit = () => {
    const sorted = Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    onUpdate(sorted);
  };

  const unsubs: Unsubscribe[] = [];

  if (user?.email === ADMIN_EMAIL && user.emailVerified) {
    const qAll = query(collection(db, 'incidents'), where('cityId', '==', cityId));
    unsubs.push(
      onSnapshot(
        qAll,
        (snap) => {
          merged.clear();
          snap.forEach((d) => merged.set(d.id, mapIncidentDoc(d.id, d.data())));
          emit();
        },
        (err) => onError?.(handleFirestoreError(err, OperationType.LIST, 'incidents'))
      )
    );
  } else {
    const qPublic = query(
      collection(db, 'incidents'),
      where('cityId', '==', cityId),
      where('operatorVerified', '==', true)
    );
    unsubs.push(
      onSnapshot(
        qPublic,
        (snap) => {
          for (const [k, v] of merged.entries()) {
            if (v.operatorVerified) merged.delete(k);
          }
          snap.forEach((d) => merged.set(d.id, mapIncidentDoc(d.id, d.data())));
          emit();
        },
        (err) => onError?.(handleFirestoreError(err, OperationType.LIST, 'incidents'))
      )
    );

    if (user?.uid) {
      const qMine = query(
        collection(db, 'incidents'),
        where('cityId', '==', cityId),
        where('reporterUid', '==', user.uid)
      );
      unsubs.push(
        onSnapshot(
          qMine,
          (snap) => {
            snap.forEach((d) => merged.set(d.id, mapIncidentDoc(d.id, d.data())));
            emit();
          },
          (err) => onError?.(handleFirestoreError(err, OperationType.LIST, 'incidents'))
        )
      );
    }
  }

  return () => unsubs.forEach((u) => u());
}

export function subscribeWorkOrders(
  cityId: CityId,
  user: UserProfile | null,
  onUpdate: (orders: WorkOrder[]) => void
): Unsubscribe {
  if (!user?.uid) {
    onUpdate([]);
    return () => undefined;
  }
  const q = query(
    collection(db, 'workOrders'),
    where('cityId', '==', cityId),
    where('creatorUid', '==', user.uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: WorkOrder[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          id: (data.id as string) || d.id,
          cityId: (data.cityId as CityId) || cityId,
          assetId: data.assetId as string | undefined,
          incidentId: data.incidentId as string | undefined,
          departmentId: (data.departmentId as string) || '',
          title: (data.title as string) || '',
          priority: (data.priority as WorkOrder['priority']) || 'medium',
          status: (data.status as WorkOrder['status']) || 'open',
          createdAt: toIsoString(data.createdAt),
        });
      });
      onUpdate(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'workOrders');
    }
  );
}

export function subscribeNotifications(
  user: UserProfile | null,
  onUpdate: (items: NotificationItem[]) => void
): Unsubscribe {
  if (!user?.uid) {
    onUpdate([]);
    return () => undefined;
  }
  const q = query(collection(db, 'notifications'), where('recipientUid', '==', user.uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: NotificationItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: (data.id as string) || d.id,
          title: (data.title as string) || '',
          body: (data.body as string) || '',
          severity: 'medium',
          createdAt: toIsoString(data.createdAt),
          read: Boolean(data.read),
        });
      });
      onUpdate(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    }
  );
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findDuplicateIncident(
  incidents: Incident[],
  category: IncidentCategory,
  lat: number,
  lng: number
): Incident | undefined {
  return incidents.find(
    (inc) =>
      !inc.isDemo &&
      inc.category === category &&
      inc.status !== 'resolved' &&
      inc.status !== 'closed' &&
      haversineKm(inc.lat, inc.lng, lat, lng) < 0.25
  );
}

export async function createIncidentRecord(params: {
  cityId: CityId;
  district: string;
  category: IncidentCategory;
  severity: SeverityLevel;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  address?: string;
  source: Incident['source'];
  assignedDepartmentId?: string;
  aiSummary?: string;
  operatorVerified?: boolean;
  status?: IncidentStatus;
}): Promise<{ savedToFirestore: boolean; incident: Incident; error?: string }> {
  const id = generateId('inc');
  const trackingNumber = `SHY-${Math.floor(10000 + Math.random() * 89999)}`;
  const currentUser = auth.currentUser;
  const nowIso = new Date().toISOString();

  const localIncident: Incident = {
    id,
    trackingNumber,
    cityId: params.cityId,
    district: params.district,
    category: params.category,
    severity: params.severity,
    status: params.status || 'detected',
    title: params.title.slice(0, 200),
    description: (params.description || '').slice(0, 2000),
    lat: params.lat,
    lng: params.lng,
    address: (params.address || '').slice(0, 240),
    source: params.source,
    reporterUid: currentUser?.uid || 'local_session',
    assignedDepartmentId: params.assignedDepartmentId,
    operatorVerified: Boolean(params.operatorVerified),
    aiSummary: params.aiSummary?.slice(0, 1500),
    createdAt: nowIso,
    updatedAt: nowIso,
    history: [
      {
        id: generateId('hist'),
        toStatus: params.status || 'detected',
        note: 'Initial registration',
        actorName: currentUser?.displayName || 'QalaQauip Operator',
        timestamp: nowIso,
      },
    ],
    comments: [],
  };

  if (!currentUser || !currentUser.emailVerified) {
    return {
      savedToFirestore: false,
      incident: localIncident,
      error: 'Authentication required for Firestore persistence; stored in current session.',
    };
  }

  const isPrivileged = currentUser.email === ADMIN_EMAIL;
  const statusToWrite: IncidentStatus = isPrivileged ? localIncident.status : 'detected';
  const verifiedToWrite = isPrivileged ? localIncident.operatorVerified : false;

  const docPayload: Record<string, unknown> = {
    id,
    trackingNumber,
    cityId: params.cityId,
    district: params.district,
    category: params.category,
    severity: params.severity,
    status: statusToWrite,
    title: localIncident.title,
    lat: params.lat,
    lng: params.lng,
    source: params.source,
    reporterUid: currentUser.uid,
    operatorVerified: verifiedToWrite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (localIncident.description) docPayload.description = localIncident.description;
  if (localIncident.address) docPayload.address = localIncident.address;
  if (params.assignedDepartmentId) docPayload.assignedDepartmentId = params.assignedDepartmentId;
  if (localIncident.aiSummary) docPayload.aiSummary = localIncident.aiSummary;

  try {
    await setDoc(doc(db, 'incidents', id), docPayload);
    await addIncidentHistoryRecord(id, undefined, statusToWrite, 'Incident registered');
    return {
      savedToFirestore: true,
      incident: { ...localIncident, status: statusToWrite, operatorVerified: verifiedToWrite },
    };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.CREATE, `incidents/${id}`);
    return { savedToFirestore: false, incident: localIncident, error: info.error };
  }
}

export async function updateIncidentRecord(
  incidentId: string,
  updates: Partial<{
    status: IncidentStatus;
    severity: SeverityLevel;
    assignedDepartmentId: string;
    operatorVerified: boolean;
    aiSummary: string;
  }>
): Promise<{ ok: boolean; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { ok: false, error: 'Sign in with a verified account to update Firestore incidents.' };
  }

  try {
    await updateDoc(doc(db, 'incidents', incidentId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.UPDATE, `incidents/${incidentId}`);
    return { ok: false, error: info.error };
  }
}

export async function addIncidentHistoryRecord(
  incidentId: string,
  fromStatus: IncidentStatus | undefined,
  toStatus: IncidentStatus,
  note: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;
  const histId = generateId('hist');
  const payload: Record<string, unknown> = {
    id: histId,
    incidentId,
    actorUid: currentUser.uid,
    toStatus,
    note: note.slice(0, 300),
    createdAt: serverTimestamp(),
  };
  if (fromStatus) payload.fromStatus = fromStatus;
  try {
    await setDoc(doc(db, 'incidentHistory', histId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `incidentHistory/${histId}`);
  }
}

export async function createCitizenReportRecord(params: {
  cityId: CityId;
  category: IncidentCategory;
  description: string;
  lat: number;
  lng: number;
  linkedIncidentId?: string;
}): Promise<{ ok: boolean; id: string; error?: string }> {
  const id = generateId('rep');
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { ok: false, id, error: 'Sign in required to store report in Firestore.' };
  }
  const payload: Record<string, unknown> = {
    id,
    cityId: params.cityId,
    reporterUid: currentUser.uid,
    category: params.category,
    description: params.description.slice(0, 1500),
    lat: params.lat,
    lng: params.lng,
    status: 'submitted',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (params.linkedIncidentId) payload.linkedIncidentId = params.linkedIncidentId;

  try {
    await setDoc(doc(db, 'citizenReports', id), payload);
    return { ok: true, id };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.CREATE, `citizenReports/${id}`);
    return { ok: false, id, error: info.error };
  }
}

export async function createVisionDetectionRecord(params: {
  cityId: CityId;
  hazardType: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  operatorStatus: 'pending' | 'confirmed' | 'dismissed';
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;
  const id = generateId('vis');
  try {
    await setDoc(doc(db, 'visionDetections', id), {
      id,
      cityId: params.cityId,
      operatorUid: currentUser.uid,
      hazardType: params.hazardType.slice(0, 64),
      severity: params.severity,
      confidence: Math.max(0, Math.min(1, Number(params.confidence) || 0.5)),
      explanation: params.explanation.slice(0, 1500),
      operatorStatus: params.operatorStatus,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `visionDetections/${id}`);
  }
}

export async function createWorkOrderRecord(params: {
  cityId: CityId;
  assetId?: string;
  incidentId?: string;
  departmentId?: string;
  title: string;
  priority: WorkOrder['priority'];
}): Promise<{ ok: boolean; order: WorkOrder; error?: string }> {
  const id = generateId('wo');
  const nowIso = new Date().toISOString();
  const order: WorkOrder = {
    id,
    cityId: params.cityId,
    assetId: params.assetId,
    incidentId: params.incidentId,
    departmentId: params.departmentId || 'qala-joldary',
    title: params.title.slice(0, 200),
    priority: params.priority,
    status: 'open',
    createdAt: nowIso,
  };
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { ok: false, order, error: 'Sign in required to persist work order.' };
  }

  const payload: Record<string, unknown> = {
    id,
    cityId: params.cityId,
    creatorUid: currentUser.uid,
    title: order.title,
    priority: order.priority,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (params.assetId) payload.assetId = params.assetId;
  if (params.incidentId) payload.incidentId = params.incidentId;
  if (params.departmentId) payload.departmentId = params.departmentId;

  try {
    await setDoc(doc(db, 'workOrders', id), payload);
    return { ok: true, order };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.CREATE, `workOrders/${id}`);
    return { ok: false, order, error: info.error };
  }
}

export async function saveAiAnalysisRecord(
  cityId: CityId,
  prompt: string,
  summary: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;
  const id = generateId('ai');
  try {
    await setDoc(doc(db, 'aiAnalysis', id), {
      id,
      cityId,
      authorUid: currentUser.uid,
      prompt: prompt.slice(0, 1000),
      summary: summary.slice(0, 3000),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `aiAnalysis/${id}`);
  }
}

export async function saveGeneratedReportRecord(
  cityId: CityId,
  period: 'daily' | 'weekly' | 'monthly',
  title: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;
  const id = generateId('rpt');
  try {
    await setDoc(doc(db, 'generatedReports', id), {
      id,
      cityId,
      authorUid: currentUser.uid,
      period,
      title: title.slice(0, 200),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `generatedReports/${id}`);
  }
}

export async function saveSimulationSessionRecord(cityId: CityId, scenario: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;
  const id = generateId('sim');
  try {
    await setDoc(doc(db, 'simulationSessions', id), {
      id,
      cityId,
      authorUid: currentUser.uid,
      scenario: scenario.slice(0, 80),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `simulationSessions/${id}`);
  }
}

export async function createPartnershipRequestRecord(params: {
  organization: string;
  contactName: string;
  city: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { ok: false, error: 'AUTH_REQUIRED' };
  }
  const id = generateId('partner');
  try {
    await setDoc(doc(db, 'partnershipRequests', id), {
      id,
      organization: params.organization.slice(0, 160),
      contactName: params.contactName.slice(0, 120),
      city: params.city.slice(0, 80),
      message: params.message.slice(0, 1500),
      submitterUid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.CREATE, `partnershipRequests/${id}`);
    return { ok: false, error: info.error };
  }
}

export async function createAuditLogRecord(action: string, targetPath: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;
  const id = generateId('log');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      id,
      actorUid: currentUser.uid,
      action: action.slice(0, 120),
      targetPath: targetPath.slice(0, 200),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditLogs/${id}`);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
  }
}
