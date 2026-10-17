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
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice } from '../types';
import { sanitizeFirestoreData } from './purchaseService';

function getInvoicesCollection(userId?: string): CollectionReference {
  if (userId) {
    return collection(db, 'users', userId, 'invoices');
  }
  return collection(db, 'invoices');
}

function getInvoiceDoc(id: string, userId?: string): DocumentReference {
  if (userId) {
    return doc(db, 'users', userId, 'invoices', id);
  }
  return doc(db, 'invoices', id);
}

/**
 * Subscribe to real-time changes in the 'invoices' collection in Firestore.
 */
export function subscribeInvoices(
  onUpdate: (items: Invoice[]) => void,
  onError?: (error: Error) => void,
  userId?: string
): () => void {
  const colRef = getInvoicesCollection(userId);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: Invoice[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Invoice);
      });
      // Sort by issueDate descending, then createdAt descending
      items.sort((a, b) => {
        const timeA = new Date(b.issueDate || b.createdAt).getTime();
        const timeB = new Date(a.issueDate || a.createdAt).getTime();
        return timeA - timeB;
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore invoice subscription error or permission restricted:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Save an invoice to Firestore.
 */
export async function addInvoiceToDb(invoice: Invoice, userId?: string): Promise<void> {
  try {
    const docRef = getInvoiceDoc(invoice.id, userId);
    const sanitized = sanitizeFirestoreData(invoice);
    await setDoc(docRef, sanitized);
    console.log(`Successfully saved invoice ${invoice.invoiceNumber || invoice.id} to Firestore!`);
  } catch (error) {
    console.error('Error adding invoice to Firestore:', error);
    throw error;
  }
}

/**
 * Update specific fields of an invoice in Firestore.
 */
export async function updateInvoiceInDb(
  id: string,
  updates: Partial<Invoice>,
  userId?: string
): Promise<void> {
  try {
    const docRef = getInvoiceDoc(id, userId);
    const sanitized = sanitizeFirestoreData(updates);
    await updateDoc(docRef, sanitized);
  } catch (error) {
    console.error('Error updating invoice in Firestore:', error);
    throw error;
  }
}

/**
 * Delete an invoice from Firestore.
 */
export async function deleteInvoiceFromDb(id: string, userId?: string): Promise<void> {
  try {
    const docRef = getInvoiceDoc(id, userId);
    await deleteDoc(docRef);
    console.log(`Successfully deleted invoice ${id} from Firestore!`);
  } catch (error) {
    console.error('Error deleting invoice from Firestore:', error);
    throw error;
  }
}

/**
 * Seed initial sample invoices if the Firestore collection is currently empty.
 */
export async function seedInvoicesIfEmpty(
  initialInvoices: Invoice[],
  userId?: string
): Promise<boolean> {
  try {
    const colRef = getInvoicesCollection(userId);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty && initialInvoices.length > 0) {
      console.log('Seeding initial sample data to Firestore invoices collection...');
      const batch = writeBatch(db);
      initialInvoices.forEach((item) => {
        const docRef = getInvoiceDoc(item.id, userId);
        batch.set(docRef, sanitizeFirestoreData(item));
      });
      await batch.commit();
      console.log('Successfully seeded sample invoices to Firestore!');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Unable to seed sample invoices to Firestore (check Firestore permissions):', error);
    return false;
  }
}
