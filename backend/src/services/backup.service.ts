import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store';
import { BackupMetadata, RestoreResult } from '../types';

export class BackupService {
  private backupDir: string;
  private maxRetainedBackups: number = 24;

  constructor(customBackupDir?: string) {
    this.backupDir = customBackupDir || path.join(__dirname, '../../backups');
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create an atomic hot backup snapshot of the master database
   */
  createBackup(tag: string = 'manual'): BackupMetadata {
    this.ensureBackupDir();

    const dbPath = store.getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Master database file not found at: ${dbPath}`);
    }

    const uncompressedData = fs.readFileSync(dbPath, 'utf-8');
    const uncompressedSizeBytes = Buffer.byteLength(uncompressedData, 'utf-8');

    // Compress using gzip
    const compressedBuffer = zlib.gzipSync(Buffer.from(uncompressedData, 'utf-8'));
    const sizeBytes = compressedBuffer.length;

    // Compute SHA-256 integrity hash of compressed snapshot
    const sha256Checksum = crypto.createHash('sha256').update(compressedBuffer).digest('hex');

    const backupId = 'bck_' + uuidv4().slice(0, 10);
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `restopulse-${tag}-${timestampStr}.json.gz`;
    const filepath = path.join(this.backupDir, filename);

    // Write compressed archive
    fs.writeFileSync(filepath, compressedBuffer);

    // Retrieve high-level summary counts for auditing
    const orders = store.getOrders();
    const bills = store.getBills();
    const menuItems = store.getMenuItems();
    const outlets = store.getOutlets();
    const customers = store.getCustomers();
    const inventory = store.getInventory();

    const metadata: BackupMetadata = {
      id: backupId,
      filename,
      filepath,
      createdAt: new Date().toISOString(),
      sizeBytes,
      uncompressedSizeBytes,
      sha256Checksum,
      tag,
      recordCounts: {
        orders: orders.length,
        bills: bills.length,
        menuItems: menuItems.length,
        outlets: outlets.length,
        customers: customers.length,
        inventory: inventory.length
      }
    };

    // Save metadata JSON alongside archive
    const metaPath = filepath.replace(/\.json\.gz$/, '.meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // Prune old snapshots exceeding retention policy
    this.pruneOldBackups();

    return metadata;
  }

  /**
   * List all available backup archives sorted newest to oldest
   */
  listBackups(): BackupMetadata[] {
    this.ensureBackupDir();
    const files = fs.readdirSync(this.backupDir);
    const metaFiles = files.filter(f => f.endsWith('.meta.json'));

    const list: BackupMetadata[] = [];
    for (const mf of metaFiles) {
      try {
        const content = fs.readFileSync(path.join(this.backupDir, mf), 'utf-8');
        const parsed: BackupMetadata = JSON.parse(content);
        list.push(parsed);
      } catch (err) {
        console.warn(`Failed reading metadata file ${mf}:`, err);
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Retrieve latest backup metadata
   */
  getLatestBackup(): BackupMetadata | undefined {
    const list = this.listBackups();
    return list[0];
  }

  /**
   * Restore a backup archive into active production database
   */
  restoreBackup(backupIdOrFilename: string): RestoreResult {
    const startTime = Date.now();
    this.ensureBackupDir();

    const allBackups = this.listBackups();
    const targetMeta = allBackups.find(b =>
      b.id === backupIdOrFilename ||
      b.filename === backupIdOrFilename ||
      path.basename(b.filepath) === backupIdOrFilename
    );

    if (!targetMeta) {
      throw new Error(`Backup snapshot not found: ${backupIdOrFilename}`);
    }

    if (!fs.existsSync(targetMeta.filepath)) {
      throw new Error(`Backup archive file is missing from disk: ${targetMeta.filepath}`);
    }

    const compressedBuffer = fs.readFileSync(targetMeta.filepath);

    // 1. Verify SHA-256 integrity hash
    const computedHash = crypto.createHash('sha256').update(compressedBuffer).digest('hex');
    const sha256Verified = computedHash.toLowerCase() === targetMeta.sha256Checksum.toLowerCase();

    if (!sha256Verified) {
      throw new Error(
        `Integrity check failed! Archive SHA-256 hash (${computedHash}) does not match metadata (${targetMeta.sha256Checksum}). Possible file corruption.`
      );
    }

    // 2. Decompress archive
    let decompressedJson: string;
    try {
      const decompressedBuffer = zlib.gunzipSync(compressedBuffer);
      decompressedJson = decompressedBuffer.toString('utf-8');
    } catch (err: any) {
      throw new Error(`Decompression error: ${err.message}`);
    }

    // 3. Validate JSON integrity before overwriting live database
    let parsed: any;
    try {
      parsed = JSON.parse(decompressedJson);
      if (!parsed.profile || !parsed.menuItems || !parsed.tables) {
        throw new Error('Database schema invalid: missing required root entities');
      }
    } catch (err: any) {
      throw new Error(`Corrupted JSON contents: ${err.message}`);
    }

    // 4. Atomically overwrite target database
    const dbPath = store.getDatabasePath();
    const tempFile = `${dbPath}.restore.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(parsed, null, 2), 'utf-8');

    try {
      fs.renameSync(tempFile, dbPath);
    } catch (err: any) {
      if (err.code === 'EEXIST' || err.code === 'EPERM') {
        fs.copyFileSync(tempFile, dbPath);
        try { fs.unlinkSync(tempFile); } catch {}
      } else {
        throw err;
      }
    }

    // 5. Reload in-memory store
    store.reload();

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      restoredFrom: targetMeta.filename,
      sha256Verified: true,
      restoredAt: new Date().toISOString(),
      durationMs,
      message: `Database successfully restored from ${targetMeta.filename} in ${durationMs}ms.`
    };
  }

  /**
   * Delete specific backup archive
   */
  deleteBackup(backupId: string): boolean {
    const list = this.listBackups();
    const target = list.find(b => b.id === backupId || b.filename === backupId);
    if (!target) return false;

    try {
      if (fs.existsSync(target.filepath)) {
        fs.unlinkSync(target.filepath);
      }
      const metaPath = target.filepath.replace(/\.json\.gz$/, '.meta.json');
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prune oldest backups exceeding the retention threshold
   */
  private pruneOldBackups() {
    try {
      const list = this.listBackups();
      if (list.length > this.maxRetainedBackups) {
        const toPrune = list.slice(this.maxRetainedBackups);
        for (const item of toPrune) {
          this.deleteBackup(item.id);
        }
      }
    } catch (err) {
      console.warn('Backup pruning encountered an error:', err);
    }
  }
}

export const backupService = new BackupService();
