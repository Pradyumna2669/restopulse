import { backupService } from '../services/backup.service';

async function main() {
  console.log('====================================================');
  console.log('🔄 RESTOPULSE DISASTER RECOVERY & HOT RESTORE ENGINE');
  console.log('====================================================\n');

  const args = process.argv.slice(2);
  let targetBackup = args[0];

  const backups = backupService.listBackups();
  if (backups.length === 0) {
    console.error('❌ No backup archives found in backups directory!');
    process.exit(1);
  }

  if (!targetBackup) {
    const latest = backups[0];
    console.log(`ℹ️ No backup specified. Selecting latest snapshot:`);
    console.log(`   - Filename: ${latest.filename}`);
    console.log(`   - Created At: ${latest.createdAt}`);
    console.log(`   - SHA-256: ${latest.sha256Checksum}`);
    console.log(`   - Size: ${(latest.sizeBytes / 1024).toFixed(2)} KB\n`);
    targetBackup = latest.id;
  }

  try {
    console.log(`⏳ Restoring database from snapshot '${targetBackup}'...`);
    const result = backupService.restoreBackup(targetBackup);
    console.log('✅ ' + result.message);
    console.log(`🔐 SHA-256 Checksum Verified: ${result.sha256Verified}`);
    console.log(`⏱️ Duration: ${result.durationMs}ms`);
    console.log('\n🎉 Disaster recovery restore completed successfully!');
  } catch (err: any) {
    console.error('❌ Restore failed:', err.message);
    process.exit(1);
  }
}

main();
