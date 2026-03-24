
import { Message, Task, Position, WatchlistItem } from '../types';

const DB_NAME = 'TitanBoardDB';
const STORE_NAME_CHAT = 'chat_history';
const STORE_NAME_TASKS = 'tasks';
const STORE_NAME_POSITIONS = 'positions';
const STORE_NAME_WATCHLIST = 'watchlist'; // New store
const DB_VERSION = 5; // Bump version for new store

/**
 * 产生高强度的随机 ID 避免碰撞
 */
const generateId = (prefix: string = 'id') => {
  const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return `${prefix}-${Date.now()}-${randomPart}`;
};

class StorageService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB critical error:", request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME_CHAT)) {
          db.createObjectStore(STORE_NAME_CHAT, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(STORE_NAME_TASKS)) {
          db.createObjectStore(STORE_NAME_TASKS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_NAME_POSITIONS)) {
          db.createObjectStore(STORE_NAME_POSITIONS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_NAME_WATCHLIST)) {
          db.createObjectStore(STORE_NAME_WATCHLIST, { keyPath: 'id' });
        }
      };
    });
  }

  // --- Unified Backup System ---

  async createFullBackup(): Promise<{ messages: Message[], tasks: Task[], positions: Position[], watchlist: WatchlistItem[] }> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME_CHAT, STORE_NAME_TASKS, STORE_NAME_POSITIONS, STORE_NAME_WATCHLIST], 'readonly');
        
        const chatRequest = transaction.objectStore(STORE_NAME_CHAT).getAll();
        const taskRequest = transaction.objectStore(STORE_NAME_TASKS).getAll();
        const posRequest = transaction.objectStore(STORE_NAME_POSITIONS).getAll();
        const watchRequest = transaction.objectStore(STORE_NAME_WATCHLIST).getAll();

        transaction.oncomplete = () => {
          resolve({
            messages: chatRequest.result || [],
            tasks: taskRequest.result || [],
            positions: posRequest.result || [],
            watchlist: watchRequest.result || []
          });
        };

        transaction.onerror = (e) => {
          console.error("Backup transaction failed:", e);
          reject(transaction.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async restoreFullBackup(data: { messages?: Message[], tasks?: Task[], positions?: Position[], watchlist?: WatchlistItem[] }): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const positions = Array.isArray(data.positions) ? data.positions : [];
      const watchlist = Array.isArray(data.watchlist) ? data.watchlist : [];

      console.log(`[Restore] Starting restore: ${messages.length} msgs, ${tasks.length} tasks, ${positions.length} positions, ${watchlist.length} watchlist items.`);

      const transaction = db.transaction([STORE_NAME_CHAT, STORE_NAME_TASKS, STORE_NAME_POSITIONS, STORE_NAME_WATCHLIST], 'readwrite');
      
      transaction.onerror = (e) => {
        console.error("Transaction Error during restore:", transaction.error);
        reject(transaction.error);
      };

      try {
        // 1. Clear all stores
        transaction.objectStore(STORE_NAME_CHAT).clear();
        transaction.objectStore(STORE_NAME_TASKS).clear();
        transaction.objectStore(STORE_NAME_POSITIONS).clear();
        transaction.objectStore(STORE_NAME_WATCHLIST).clear();

        // 2. Repopulate
        const chatStore = transaction.objectStore(STORE_NAME_CHAT);
        messages.forEach(m => {
          const item = { ...m };
          if (!item.id) item.id = generateId('msg');
          chatStore.put(item);
        });

        const taskStore = transaction.objectStore(STORE_NAME_TASKS);
        tasks.forEach(t => {
          const item = { ...t };
          if (!item.id) item.id = generateId('task');
          taskStore.put(item);
        });

        const posStore = transaction.objectStore(STORE_NAME_POSITIONS);
        positions.forEach(p => {
          const item = { ...p };
          if (!item.id) item.id = generateId('pos');
          posStore.put(item);
        });

        const watchStore = transaction.objectStore(STORE_NAME_WATCHLIST);
        watchlist.forEach(w => {
          const item = { ...w };
          if (!item.id) item.id = generateId('watch');
          watchStore.put(item);
        });

      } catch (err) {
        console.error("Error putting data into stores:", err);
        transaction.abort();
        reject(err);
        return;
      }

      transaction.oncomplete = () => {
        console.log("[Restore] Transaction completed successfully.");
        resolve();
      };
    });
  }

  // --- Watchlist Methods ---
  async saveWatchlistItem(item: WatchlistItem): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_WATCHLIST, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_WATCHLIST);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getWatchlistItems(): Promise<WatchlistItem[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_WATCHLIST, 'readonly');
      const store = transaction.objectStore(STORE_NAME_WATCHLIST);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWatchlistItem(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_WATCHLIST, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_WATCHLIST);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Position Methods (Unchanged interface) ---
  async savePosition(position: Position): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_POSITIONS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_POSITIONS);
      const request = store.put(position);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPositions(): Promise<Position[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_POSITIONS, 'readonly');
      const store = transaction.objectStore(STORE_NAME_POSITIONS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePosition(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_POSITIONS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_POSITIONS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearPositions(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_POSITIONS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_POSITIONS);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async importPositions(positions: Position[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_POSITIONS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_POSITIONS);
      
      store.clear();
      
      positions.forEach(pos => {
        if (!pos.id) pos.id = generateId('pos');
        store.put(pos);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- Task Methods (Unchanged interface) ---
  async saveTask(task: Task): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_TASKS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_TASKS);
      const request = store.put(task);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async importTasks(tasks: Task[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_TASKS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_TASKS);
      
      tasks.forEach(task => {
        if (!task.id) task.id = generateId('task');
        store.put(task);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTasks(): Promise<Task[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_TASKS, 'readonly');
      const store = transaction.objectStore(STORE_NAME_TASKS);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = (request.result || []) as Task[];
        result.sort((a, b) => {
           if (a.completed !== b.completed) return a.completed ? 1 : -1;
           return b.timestamp - a.timestamp;
        });
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async deleteTask(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_TASKS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_TASKS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMultipleTasks(ids: string[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_TASKS, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_TASKS);
      ids.forEach(id => { if (id) store.delete(id); });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- Message Methods (Unchanged interface) ---
  async saveMessage(message: Message): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_CHAT, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_CHAT);
      const request = store.put(message);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMessages(): Promise<Message[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_CHAT, 'readonly');
      const store = transaction.objectStore(STORE_NAME_CHAT);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = (request.result || []) as Message[];
        result.sort((a, b) => a.timestamp - b.timestamp);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearMessages(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_CHAT, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_CHAT);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async importMessages(messages: Message[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME_CHAT, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_CHAT);
      store.clear();
      messages.forEach(msg => {
        if (!msg.id) msg.id = generateId('msg');
        store.put(msg);
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearHistory(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_CHAT, STORE_NAME_TASKS, STORE_NAME_POSITIONS, STORE_NAME_WATCHLIST], 'readwrite');
      transaction.objectStore(STORE_NAME_CHAT).clear();
      transaction.objectStore(STORE_NAME_TASKS).clear();
      transaction.objectStore(STORE_NAME_POSITIONS).clear();
      transaction.objectStore(STORE_NAME_WATCHLIST).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const storageService = new StorageService();
