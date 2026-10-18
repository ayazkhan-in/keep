import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../src/firebase';
import { INITIAL_PURCHASES } from '../src/data/mockData';
import { INITIAL_INVOICES } from '../src/data/mockInvoices';
import { SYNTHETIC_EXPENSES } from '../src/data/syntheticClaims';
import { DEFAULT_ACME_POLICY } from '../src/services/policyService';
import { DEMO_EMPLOYEES } from '../src/services/employeeService';
import { sanitizeFirestoreData } from '../src/services/purchaseService';

async function getOrCreateUser(email: string, pass: string, name: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    console.log(`[SEED] Created new user: ${email} (UID: ${cred.user.uid})`);
    return cred.user;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      console.log(`[SEED] Existing user signed in: ${email} (UID: ${cred.user.uid})`);
      return cred.user;
    }
    throw err;
  }
}

async function seed() {
  console.log('========================================================');
  console.log('   KEEPR SEED SCRIPT: REAL USER ACCOUNTS & DATABASE     ');
  console.log('========================================================\n');

  // 1. Create or sign in Employee accounts
  console.log('1. Setting up Employee Account...');
  const employeeUser = await getOrCreateUser(
    'employee@keepr.com',
    'KeeprEmployee2026!',
    'Alice Walker'
  );
  // Also create alice.walker@acme.com alias
  const aliceUser = await getOrCreateUser(
    'alice.walker@acme.com',
    'KeeprEmployee2026!',
    'Alice Walker'
  );

  // 2. Create or sign in Auditor accounts
  console.log('\n2. Setting up Auditor / Finance Account...');
  const auditorUser = await getOrCreateUser(
    'auditor@keepr.com',
    'KeeprAuditor2026!',
    'Frank Castle'
  );
  // Also create frank.castle@acme.com alias
  const frankUser = await getOrCreateUser(
    'frank.castle@acme.com',
    'KeeprAuditor2026!',
    'Frank Castle'
  );

  // 3. Populate Firestore user profiles
  console.log('\n3. Creating Firestore user profiles & directory...');
  const userProfiles = [
    {
      uid: employeeUser.uid,
      email: 'employee@keepr.com',
      displayName: 'Alice Walker',
      role: 'employee',
      orgId: 'org_acme',
      department: 'Engineering',
      grade: 'L4',
      homeCity: 'Bengaluru',
      createdAt: new Date().toISOString(),
    },
    {
      uid: aliceUser.uid,
      email: 'alice.walker@acme.com',
      displayName: 'Alice Walker',
      role: 'employee',
      orgId: 'org_acme',
      department: 'Engineering',
      grade: 'L4',
      homeCity: 'Bengaluru',
      createdAt: new Date().toISOString(),
    },
    {
      uid: auditorUser.uid,
      email: 'auditor@keepr.com',
      displayName: 'Frank Castle',
      role: 'finance',
      orgId: 'org_acme',
      department: 'Finance & Audit',
      grade: 'Finance Officer',
      homeCity: 'Bengaluru',
      createdAt: new Date().toISOString(),
    },
    {
      uid: frankUser.uid,
      email: 'frank.castle@acme.com',
      displayName: 'Frank Castle',
      role: 'finance',
      orgId: 'org_acme',
      department: 'Finance & Audit',
      grade: 'Finance Officer',
      homeCity: 'Bengaluru',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const prof of userProfiles) {
    await setDoc(doc(db, 'users', prof.uid), sanitizeFirestoreData(prof));
    await setDoc(
      doc(db, 'orgs', 'org_acme', 'employees', prof.uid),
      sanitizeFirestoreData({
        id: prof.uid,
        orgId: prof.orgId,
        identity: { email: prof.email, name: prof.displayName },
        role: prof.role,
        department: prof.department,
        grade: prof.grade,
        homeCity: prof.homeCity,
      })
    );
  }

  // Also seed other demo employees in the directory
  for (const demoEmp of DEMO_EMPLOYEES) {
    await setDoc(
      doc(db, 'orgs', 'org_acme', 'employees', demoEmp.id),
      sanitizeFirestoreData(demoEmp)
    );
  }
  console.log('   User profiles and employees directory created successfully!');

  // 4. Organization & Policy
  console.log('\n4. Storing Organization and Active Expense Policy...');
  await setDoc(doc(db, 'orgs', 'org_acme'), {
    id: 'org_acme',
    name: 'Acme Enterprise',
    baseCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    reportingMonthStartDay: 1,
    activePolicyVersionId: 'pol_acme_v1',
    autoApproveRiskThreshold: 25,
    autoApproveMinConfidence: 0.8,
    createdAt: new Date().toISOString(),
  });

  await setDoc(
    doc(db, 'orgs', 'org_acme', 'policies', DEFAULT_ACME_POLICY.id),
    sanitizeFirestoreData(DEFAULT_ACME_POLICY)
  );
  await setDoc(
    doc(db, 'policies', DEFAULT_ACME_POLICY.id),
    sanitizeFirestoreData(DEFAULT_ACME_POLICY)
  );
  console.log('   Active Corporate Policy (pol_acme_v1) saved to database!');

  // 5. Seed Purchases
  console.log('\n5. Attaching Purchases & Asset Vault to Accounts...');
  const userIdsForPurchases = [employeeUser.uid, aliceUser.uid, auditorUser.uid];
  for (const uid of userIdsForPurchases) {
    for (const pur of INITIAL_PURCHASES) {
      await setDoc(
        doc(db, 'users', uid, 'purchases', pur.id),
        sanitizeFirestoreData(pur)
      );
    }
  }
  for (const pur of INITIAL_PURCHASES) {
    await setDoc(doc(db, 'purchases', pur.id), sanitizeFirestoreData(pur));
  }
  console.log(`   ${INITIAL_PURCHASES.length} purchases attached to user accounts!`);

  // 6. Seed Invoices
  console.log('\n6. Attaching Invoices to Accounts...');
  for (const uid of userIdsForPurchases) {
    for (const inv of INITIAL_INVOICES) {
      await setDoc(
        doc(db, 'users', uid, 'invoices', inv.id),
        sanitizeFirestoreData(inv)
      );
    }
  }
  for (const inv of INITIAL_INVOICES) {
    await setDoc(doc(db, 'invoices', inv.id), sanitizeFirestoreData(inv));
  }
  console.log(`   ${INITIAL_INVOICES.length} invoices attached to user accounts!`);

  // 7. Seed Corporate Expense Reimbursements (Claims)
  console.log('\n7. Storing Expense Reimbursements in Database...');
  let seededClaimsCount = 0;
  for (const claim of SYNTHETIC_EXPENSES) {
    // If the claim was authored by Alice Walker (emp_101), attach it to employeeUser.uid & aliceUser.uid
    const claimToSave: any = { ...claim };
    if (claim.employeeId === 'emp_101') {
      claimToSave.employeeId = employeeUser.uid;
      claimToSave.employeeAlias = 'emp_101';
      claimToSave.employeeName = 'Alice Walker';
      claimToSave.employeeEmail = 'employee@keepr.com';
    } else {
      const demoNames: Record<string, string> = {
        emp_102: 'Bob Martin',
        emp_103: 'Carol Danvers',
        emp_104: 'David Miller',
        emp_105: 'Elena Rostova',
        emp_106: 'Frank Castle',
      };
      claimToSave.employeeName = claim.employeeName || demoNames[claim.employeeId] || 'Alice Walker';
    }

    // Save to org expenses
    await setDoc(
      doc(db, 'orgs', 'org_acme', 'expenses', claimToSave.id),
      sanitizeFirestoreData(claimToSave)
    );
    // Also save to root expenses collection
    await setDoc(
      doc(db, 'expenses', claimToSave.id),
      sanitizeFirestoreData(claimToSave)
    );

    // Save initial audit event
    const auditEvent = {
      id: `audit_${claimToSave.id}_init`,
      orgId: 'org_acme',
      expenseId: claimToSave.id,
      timestamp: claimToSave.submittedAt || new Date().toISOString(),
      actor: {
        id: claimToSave.employeeId,
        name: claimToSave.employeeName || claimToSave.employeeId,
        role: 'employee',
      },
      action: 'CLAIM_SUBMITTED',
      entity: 'expense',
      details: {
        amountMinor: claimToSave.normalizedCurrency?.targetAmountMinor,
        currency: claimToSave.normalizedCurrency?.targetCurrency || 'INR',
      },
      changeSummary: `Reimbursement claim submitted. Initial status: ${claimToSave.status}.`,
    };

    await setDoc(
      doc(db, 'orgs', 'org_acme', 'expenses', claimToSave.id, 'audit', auditEvent.id),
      sanitizeFirestoreData(auditEvent)
    );
    seededClaimsCount++;
  }
  console.log(`   ${seededClaimsCount} expense claims seeded into database!`);

  console.log('\n========================================================');
  console.log('   SEED COMPLETED SUCCESSFULLY! CREDENTIALS:           ');
  console.log('========================================================');
  console.log('👤 EMPLOYEE ACCOUNT:');
  console.log('   Email:    employee@keepr.com (or alice.walker@acme.com)');
  console.log('   Password: KeeprEmployee2026!');
  console.log('   UID:      ' + employeeUser.uid);
  console.log('   Role:     employee (Engineering, L4)');
  console.log('--------------------------------------------------------');
  console.log('🛡️  AUDITOR / FINANCE ACCOUNT:');
  console.log('   Email:    auditor@keepr.com (or frank.castle@acme.com)');
  console.log('   Password: KeeprAuditor2026!');
  console.log('   UID:      ' + auditorUser.uid);
  console.log('   Role:     finance (Finance & Audit, Finance Officer)');
  console.log('========================================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED ERROR]:', err);
  process.exit(1);
});
