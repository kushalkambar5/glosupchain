// Cleanup script to remove assignments with missing routes
import { createClient } from '@vercel/postgres';

async function cleanup() {
  const client = createClient();
  
  try {
    await client.connect();
    
    // Delete assignments where route_id doesn't exist
    const result = await client.sql`
      DELETE FROM assignments 
      WHERE route_id NOT IN (SELECT id FROM routes)
    `;
    
    console.log(`Deleted ${result.rowCount} orphaned assignments`);
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanup();
