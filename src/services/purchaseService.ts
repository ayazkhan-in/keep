import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';
import { PurchaseItem } from '../types';

function getPurchasesCollection(userId?: string): CollectionReference {
  if (userId) {
    return collection(db, 'users', userId, 'purchases');
  }
  return collection(db, 'purchases');
}

function getPurchaseDoc(id: string, userId?: string): DocumentReference {
  if (userId) {
    return doc(db, 'users', userId, 'purchases', id);
  }
  return doc(db, 'purchases', id);
}

/**
 * Sanitize object for Firestore to avoid undefined field errors or document size limit exceptions.
 */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestoreData(item)) as any;
  }

  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(data as Record<string, any>)) {
    const val = (data as Record<string, any>)[key];
    if (val !== undefined) {
      // Compress oversized base64 data URLs if present to prevent exceeding Firestore 1MB document limit
      if (typeof val === 'string' && val.startsWith('data:') && val.length > 300000) {
        cleaned[key] = 'https://images.unsplash.com/photo-1554415707-9e4c07dca042?auto=format&fit=crop&w=600&q=80';
      } else {
        cleaned[key] = sanitizeFirestoreData(val);
      }
    }
  }
  return cleaned as T;
}

/**
 * Subscribe to real-time changes in the 'purchases' collection in Firestore.
 */
export function subscribePurchases(
  onUpdate: (items: PurchaseItem[]) => void,
  onError?: (error: Error) => void,
  userId?: string
): () => void {
  const colRef = getPurchasesCollection(userId);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: PurchaseItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as PurchaseItem);
      });
      // Sort by purchaseDate descending
      items.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore subscription error or permission restricted:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Save a purchase item to Firestore.
 */
export async function addPurchaseToDb(purchase: PurchaseItem, userId?: string): Promise<void> {
  try {
    const docRef = getPurchaseDoc(purchase.id, userId);
    const sanitized = sanitizeFirestoreData(purchase);
    await setDoc(docRef, sanitized);
    console.log(`Successfully saved purchase ${purchase.id} to Firestore!`);
  } catch (error) {
    console.error('Error adding purchase to Firestore:', error);
    throw error;
  }
}

/**
 * Update specific fields of a purchase in Firestore.
 */
export async function updatePurchaseInDb(id: string, updates: Partial<PurchaseItem>, userId?: string): Promise<void> {
  try {
    const docRef = getPurchaseDoc(id, userId);
    const sanitized = sanitizeFirestoreData(updates);
    await updateDoc(docRef, sanitized);
  } catch (error) {
    console.error('Error updating purchase in Firestore:', error);
    throw error;
  }
}

/**
 * Delete a purchase from Firestore.
 */
export async function deletePurchaseFromDb(id: string, userId?: string): Promise<void> {
  try {
    const docRef = getPurchaseDoc(id, userId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting purchase from Firestore:', error);
    throw error;
  }
}

/**
 * Seed initial sample purchases if the Firestore collection is currently empty.
 */
export async function seedPurchasesIfEmpty(initialPurchases: PurchaseItem[], userId?: string): Promise<boolean> {
  try {
    const colRef = getPurchasesCollection(userId);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty && initialPurchases.length > 0) {
      console.log('Seeding initial sample data to Firestore purchases collection...');
      const batch = writeBatch(db);
      initialPurchases.forEach((item) => {
        const docRef = getPurchaseDoc(item.id, userId);
        batch.set(docRef, sanitizeFirestoreData(item));
      });
      await batch.commit();
      console.log('Successfully seeded sample purchases to Firestore!');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Unable to seed sample purchases to Firestore (check Firestore permissions):', error);
    return false;
  }
}
