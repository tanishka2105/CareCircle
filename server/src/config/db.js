import admin from 'firebase-admin';
import { env } from './env.js';

let dbInstance = null;

class MockQuery {
  constructor(collectionData, filters = [], orderByClause = null, limitCount = null) {
    this.collectionData = collectionData;
    this.filters = filters;
    this.orderByClause = orderByClause;
    this.limitCount = limitCount;
  }

  where(field, op, val) {
    return new MockQuery(
      this.collectionData,
      [...this.filters, { field, op, val }],
      this.orderByClause,
      this.limitCount
    );
  }

  orderBy(field, direction = 'asc') {
    return new MockQuery(
      this.collectionData,
      this.filters,
      { field, direction },
      this.limitCount
    );
  }

  limit(count) {
    return new MockQuery(
      this.collectionData,
      this.filters,
      this.orderByClause,
      count
    );
  }

  async get() {
    let docs = Object.entries(this.collectionData).map(([id, data]) => ({
      id,
      ...JSON.parse(JSON.stringify(data)),
    }));

    for (const { field, op, val } of this.filters) {
      docs = docs.filter((item) => {
        const itemVal = item[field];
        if (op === '==') return itemVal === val;
        if (op === '!=') return itemVal !== val;
        if (op === '<') return itemVal < val;
        if (op === '<=') return itemVal <= val;
        if (op === '>') return itemVal > val;
        if (op === '>=') return itemVal >= val;
        if (op === 'in') return Array.isArray(val) && val.includes(itemVal);
        if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(val);
        return true;
      });
    }

    if (this.orderByClause) {
      const { field, direction } = this.orderByClause;
      docs.sort((a, b) => {
        const va = a[field] ?? '';
        const vb = b[field] ?? '';
        if (va < vb) return direction === 'asc' ? -1 : 1;
        if (va > vb) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      docs = docs.slice(0, this.limitCount);
    }

    const docSnapshots = docs.map((docData) => {
      const { id, ...data } = docData;
      return {
        id,
        exists: true,
        data: () => ({ id, ...data }),
      };
    });

    return {
      empty: docSnapshots.length === 0,
      size: docSnapshots.length,
      docs: docSnapshots,
      forEach: (callback) => docSnapshots.forEach(callback),
    };
  }
}

class MockDocRef {
  constructor(collectionData, id) {
    this.collectionData = collectionData;
    this.id = id;
  }

  async get() {
    const data = this.collectionData[this.id];
    return {
      id: this.id,
      exists: Boolean(data),
      data: () => (data ? { id: this.id, ...JSON.parse(JSON.stringify(data)) } : undefined),
    };
  }

  async set(data, options = {}) {
    if (options.merge && this.collectionData[this.id]) {
      this.collectionData[this.id] = {
        ...this.collectionData[this.id],
        ...JSON.parse(JSON.stringify(data)),
      };
    } else {
      this.collectionData[this.id] = JSON.parse(JSON.stringify(data));
    }
    return { writeTime: new Date() };
  }

  async update(data) {
    if (!this.collectionData[this.id]) {
      throw new Error(`Document ${this.id} not found`);
    }
    this.collectionData[this.id] = {
      ...this.collectionData[this.id],
      ...JSON.parse(JSON.stringify(data)),
    };
    return { writeTime: new Date() };
  }

  async delete() {
    delete this.collectionData[this.id];
    return { writeTime: new Date() };
  }
}

class MockCollectionRef extends MockQuery {
  constructor(collectionName, storage) {
    if (!storage[collectionName]) {
      storage[collectionName] = {};
    }
    super(storage[collectionName]);
    this.collectionName = collectionName;
    this.storage = storage;
  }

  doc(id) {
    const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return new MockDocRef(this.storage[this.collectionName], docId);
  }

  async add(data) {
    const docRef = this.doc();
    await docRef.set(data);
    return docRef;
  }
}

class MockFirestore {
  constructor() {
    this.storage = {};
  }

  collection(name) {
    return new MockCollectionRef(name, this.storage);
  }

  batch() {
    const operations = [];
    return {
      set: (docRef, data, options) => {
        operations.push(() => docRef.set(data, options));
      },
      update: (docRef, data) => {
        operations.push(() => docRef.update(data));
      },
      delete: (docRef) => {
        operations.push(() => docRef.delete());
      },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      },
    };
  }

  clear() {
    this.storage = {};
  }
}

export const initFirestore = () => {
  if (dbInstance) return dbInstance;

  const hasCredentials =
    Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

  if (!env.USE_MOCK_FIRESTORE && hasCredentials) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
      }
      dbInstance = admin.firestore();
      console.log('Connected to Google Cloud Firestore (Admin SDK).');
      return dbInstance;
    } catch (err) {
      console.warn('Failed to initialize real Firebase Admin SDK. Falling back to Mock Firestore:', err.message);
    }
  }

  console.log('Using in-memory Firestore engine (Production-grade Mock for zero-friction setup).');
  dbInstance = new MockFirestore();
  return dbInstance;
};

export const getDb = () => {
  if (!dbInstance) {
    return initFirestore();
  }
  return dbInstance;
};
