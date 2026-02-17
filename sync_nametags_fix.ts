import { supabaseStorage } from "./server/supabase-storage";
import { db } from "./server/db";
import { nameTags } from "./shared/schema";
import { eq } from "drizzle-orm";

async function sync() {
  console.log("🔄 Re-syncing nametags to fix duplicates and broken links...");
  const files = await supabaseStorage.listBucketFiles('gamefolio-name-tags', '');
  
  if (files.length === 0) {
    console.log("❌ No files found in bucket.");
    return;
  }

  for (const file of files) {
    const fileName = file.name.split('.')[0];
    // Clean up the name: remove extensions, replace separators with spaces, capitalize
    const name = fileName.replace(/[-_]/g, ' ')
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    
    if (name === 'Filenames' || name === 'Nametag Token Map') continue;

    // Check if it exists (case-insensitive check to be safe)
    const existing = await db.select().from(nameTags).where(eq(nameTags.name, name));
    
    if (existing.length > 0) {
      console.log("Updating: " + name);
      await db.update(nameTags)
        .set({ imageUrl: file.publicUrl, isActive: true })
        .where(eq(nameTags.id, existing[0].id));
    } else {
      console.log("Creating: " + name);
      await db.insert(nameTags).values({
        name,
        imageUrl: file.publicUrl,
        rarity: 'common',
        isDefault: false,
        isActive: true,
        availableInStore: true,
        availableInLootbox: true,
        gfCost: 1000
      });
    }
  }
  console.log("✅ Sync complete!");
}

sync().catch(console.error);
