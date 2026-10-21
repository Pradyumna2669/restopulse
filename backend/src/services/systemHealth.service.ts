import fs from 'fs';
import path from 'path';
import { store } from '../data/store';
import { backupService } from './backup.service';
import { hardwareService } from './hardwarePeripheral.service';
import { SystemHealthReport } from '../types';

export class SystemHealthService {
  /**
   * Run deep diagnostics across database, memory, outlets, hardware, and backup status
   */
  getDeepHealthReport(): SystemHealthReport {
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
    const heapTotalMb = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
    const rssMb = Math.round((mem.rss / 1024 / 1024) * 100) / 100;

    // Check Database File & Writability
    const dbPath = store.getDatabasePath();
    let fileSizeBytes = 0;
    let writable = false;
    let dbStatus: 'connected' | 'error' = 'connected';
    let lastWriteTime: string | undefined;

    try {
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        fileSizeBytes = stats.size;
        lastWriteTime = stats.mtime.toISOString();

        // Test writability by touching a canary temp file in database folder
        const canaryPath = path.join(path.dirname(dbPath), `.health-canary.${process.pid}.${Date.now()}`);
        fs.writeFileSync(canaryPath, 'ok', 'utf-8');
        fs.unlinkSync(canaryPath);
        writable = true;
      } else {
        dbStatus = 'error';
      }
    } catch {
      writable = false;
      dbStatus = 'error';
    }

    const orders = store.getOrders();
    const bills = store.getBills();
    const menuItems = store.getMenuItems();
    const outlets = store.getOutlets();

    const latestBackup = backupService.getLatestBackup();
    const allBackups = backupService.listBackups();

    const hardwareStatus = hardwareService.getHardwareStatus();

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbStatus === 'error' || !writable) {
      status = 'unhealthy';
    } else if (heapUsedMb > 1024) {
      status = 'degraded';
    }

    return {
      status,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'production',
      memory: {
        heapUsedMb,
        heapTotalMb,
        rssMb
      },
      database: {
        status: dbStatus,
        fileSizeBytes,
        writable,
        totalOrders: orders.length,
        totalBills: bills.length,
        totalMenuItems: menuItems.length,
        lastWriteTime
      },
      outlets: {
        totalCount: outlets.length,
        activeCount: outlets.filter(o => o.active).length,
        franchiseCount: outlets.filter(o => o.isFranchise).length
      },
      hardware: {
        scaleAvailable: hardwareStatus.scale.connected,
        scannerActive: hardwareStatus.scanner.active,
        vfdReady: hardwareStatus.vfd.connected
      },
      backups: {
        availableBackupsCount: allBackups.length,
        latestBackupTimestamp: latestBackup?.createdAt,
        latestBackupId: latestBackup?.id
      },
      security: {
        rateLimitingActive: true,
        helmetHeadersEnforced: true,
        corsOrigin: '*'
      }
    };
  }
}

export const systemHealthService = new SystemHealthService();
