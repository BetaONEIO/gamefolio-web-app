const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DUMMY = [
  {
    template: {
      name: 'Nightfall Protocol', slug: 'nightfall-protocol-demo', category: 'action',
      description: 'A cyberpunk stealth-action game set in a dystopian megacity. Infiltrate high-security facilities using hacking, parkour, and tactical combat.',
      best_use_case: 'Great for streamers and content creators who love stealth games with deep mechanics.',
      duration: 14, participant_capacity: 50,
      completion_reward: 'full_game_key', completion_reward_description: 'Full Steam key on completion',
      estimated_clips: 3, estimated_screenshots: 3, estimated_feedback: 1,
      featured: true, recommended: true,
    },
    bounties: [
      { title: 'First Infiltration Clip', description: 'Upload a gameplay clip showing any infiltration mission.', mandatory: true, quantity: 2, content_type: 'clip', xp_reward: 250, completion_order: 1 },
      { title: 'Environment Screenshots', description: 'Capture 3 atmospheric screenshots from different districts.', mandatory: true, quantity: 3, content_type: 'screenshot', xp_reward: 150, completion_order: 2 },
      { title: 'Feedback Form', description: 'Share your thoughts on the demo experience.', mandatory: true, quantity: 1, content_type: 'feedback', xp_reward: 300, completion_order: 3 },
      { title: 'Bug Reports', description: 'Report any bugs you encounter during gameplay.', mandatory: false, quantity: 2, content_type: 'bug', xp_reward: 200, completion_order: 4 },
    ],
    instance: {
      game_name: 'Nightfall Protocol',
      game_artwork_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
      demo_keys_remaining: 24, full_keys_remaining: 50, developer_user_id: null,
    },
  },
  {
    template: {
      name: 'Aether Drift', slug: 'aether-drift-demo', category: 'racing',
      description: 'High-velocity anti-gravity racing through ethereal dimensions. Customise your ship, master the drift, and compete in online time trials.',
      best_use_case: 'Perfect for racing game enthusiasts and competitive players.',
      duration: 21, participant_capacity: 80,
      completion_reward: 'full_game_key', completion_reward_description: 'Full Steam key + exclusive ship skin',
      estimated_clips: 3, estimated_screenshots: 2, estimated_feedback: 1,
      featured: true, recommended: true,
    },
    bounties: [
      { title: 'Race Replay Upload', description: 'Upload gameplay clips from time-trial or multiplayer races.', mandatory: true, quantity: 3, content_type: 'clip', xp_reward: 200, completion_order: 1 },
      { title: 'Screenshot Showcase', description: 'Capture 2 screenshots showing the most spectacular tracks.', mandatory: true, quantity: 2, content_type: 'screenshot', xp_reward: 150, completion_order: 2 },
      { title: 'Ship Customisation Reel', description: 'Create a reel showing off your custom ship designs.', mandatory: false, quantity: 1, content_type: 'reel', xp_reward: 400, completion_order: 3 },
    ],
    instance: {
      game_name: 'Aether Drift',
      game_artwork_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
      demo_keys_remaining: 45, full_keys_remaining: 80, developer_user_id: null,
    },
  },
  {
    template: {
      name: 'The Hollow Crown', slug: 'hollow-crown-demo', category: 'rpg',
      description: 'A dark fantasy RPG where every choice reshapes the kingdom. Recruit allies, forge alliances, and decide the fate of a fractured realm.',
      best_use_case: 'For RPG fans who love branching narratives and deep character systems.',
      duration: 30, participant_capacity: 40,
      completion_reward: 'full_game_key', completion_reward_description: 'Full Epic Games key + Digital artbook',
      estimated_clips: 2, estimated_screenshots: 4, estimated_feedback: 1,
      featured: true, recommended: false,
    },
    bounties: [
      { title: 'Story Clip', description: 'Upload a clip showing a key story moment or battle.', mandatory: true, quantity: 2, content_type: 'clip', xp_reward: 300, completion_order: 1 },
      { title: 'Character Portraits', description: 'Take 4 screenshots of your favourite characters or locations.', mandatory: true, quantity: 4, content_type: 'screenshot', xp_reward: 100, completion_order: 2 },
      { title: 'Narrative Feedback', description: 'Share your thoughts on the story, characters, and pacing.', mandatory: true, quantity: 1, content_type: 'feedback', xp_reward: 350, completion_order: 3 },
    ],
    instance: {
      game_name: 'The Hollow Crown',
      game_artwork_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80',
      demo_keys_remaining: 8, full_keys_remaining: 40, developer_user_id: null,
    },
  },
  {
    template: {
      name: 'Solar Siege', slug: 'solar-siege-demo', category: 'strategy',
      description: 'Real-time strategy set across procedurally generated solar systems. Build fleets, colonise planets, and wage interstellar war.',
      best_use_case: 'Ideal for strategy game veterans who enjoy macro-scale management.',
      duration: 14, participant_capacity: 60,
      completion_reward: 'full_game_key', completion_reward_description: 'Full Steam key',
      estimated_clips: 2, estimated_screenshots: 3, estimated_feedback: 1,
      featured: false, recommended: true,
    },
    bounties: [
      { title: 'Battle Footage', description: 'Upload a clip showing a large fleet engagement or planetary siege.', mandatory: true, quantity: 2, content_type: 'clip', xp_reward: 250, completion_order: 1 },
      { title: 'System Screenshots', description: 'Capture 3 screenshots showing your empire or key battles.', mandatory: true, quantity: 3, content_type: 'screenshot', xp_reward: 120, completion_order: 2 },
      { title: 'Strategy Review', description: 'Write feedback on the strategic depth, UI, and pacing.', mandatory: true, quantity: 1, content_type: 'feedback', xp_reward: 300, completion_order: 3 },
    ],
    instance: {
      game_name: 'Solar Siege',
      game_artwork_url: 'https://images.unsplash.com/photo-1614728853913-1e22ba0e981b?w=800&q=80',
      demo_keys_remaining: 35, full_keys_remaining: 60, developer_user_id: null,
    },
  },
  {
    template: {
      name: 'Echoes of the Deep', slug: 'echoes-deep-demo', category: 'horror',
      description: 'Underwater horror survival. Navigate a sunken research vessel, manage oxygen, and uncover what happened to the crew.',
      best_use_case: 'For horror streamers and players who love atmospheric tension.',
      duration: 10, participant_capacity: 30,
      completion_reward: 'full_game_key', completion_reward_description: 'Full Steam key + Soundtrack DLC',
      estimated_clips: 3, estimated_screenshots: 2, estimated_feedback: 1,
      featured: false, recommended: false,
    },
    bounties: [
      { title: 'Tension Clip', description: 'Upload clips showing the most tense or terrifying moments.', mandatory: true, quantity: 3, content_type: 'clip', xp_reward: 280, completion_order: 1 },
      { title: 'Atmospheric Shots', description: 'Take 2 screenshots capturing the underwater atmosphere.', mandatory: true, quantity: 2, content_type: 'screenshot', xp_reward: 140, completion_order: 2 },
      { title: 'Fear Feedback', description: 'Rate the horror elements and share what worked or did not.', mandatory: true, quantity: 1, content_type: 'feedback', xp_reward: 280, completion_order: 3 },
    ],
    instance: {
      game_name: 'Echoes of the Deep',
      game_artwork_url: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80',
      demo_keys_remaining: 12, full_keys_remaining: 30, developer_user_id: null,
    },
  },
  {
    template: {
      name: 'Puzzleforge', slug: 'puzzleforge-demo', category: 'puzzle',
      description: 'Mind-bending puzzle-platformer where you build the levels to solve them. Create, share, and rate community puzzles.',
      best_use_case: 'For puzzle enthusiasts and creative players who enjoy building and sharing.',
      duration: 21, participant_capacity: 100,
      completion_reward: 'full_game_key', completion_reward_description: 'Full itch.io key + Featured creator badge',
      estimated_clips: 1, estimated_screenshots: 3, estimated_feedback: 1,
      featured: false, recommended: true,
    },
    bounties: [
      { title: 'Puzzle Solution Clip', description: 'Upload a clip showing you solving a community puzzle.', mandatory: true, quantity: 1, content_type: 'clip', xp_reward: 200, completion_order: 1 },
      { title: 'Creative Screenshots', description: 'Take 3 screenshots of your favourite puzzle designs.', mandatory: true, quantity: 3, content_type: 'screenshot', xp_reward: 100, completion_order: 2 },
      { title: 'Build Mode Reel', description: 'Create a reel showing your level-building process.', mandatory: false, quantity: 1, content_type: 'reel', xp_reward: 350, completion_order: 3 },
    ],
    instance: {
      game_name: 'Puzzleforge',
      game_artwork_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
      demo_keys_remaining: 62, full_keys_remaining: 100, developer_user_id: null,
    },
  },
];

async function seed() {
  let seeded = 0;
  for (const camp of DUMMY) {
    const t = camp.template;
    const inst = camp.instance;

    const { rows: [template] } = await pool.query(`
      INSERT INTO campaign_templates
        (name, slug, category, description, best_use_case, duration,
         participant_capacity, demo_keys_required, full_keys_required,
         completion_reward, completion_reward_description,
         estimated_clips, estimated_screenshots, estimated_feedback,
         featured, recommended, status, gamefolio_managed)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'available',false)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [t.name, t.slug, t.category, t.description, t.best_use_case, t.duration,
        t.participant_capacity, inst.demo_keys_remaining, inst.full_keys_remaining,
        t.completion_reward, t.completion_reward_description,
        t.estimated_clips, t.estimated_screenshots, t.estimated_feedback,
        t.featured, t.recommended]);

    const templateId = template.id;

    for (const b of camp.bounties) {
      await pool.query(`
        INSERT INTO campaign_template_bounties
          (template_id, title, description, mandatory, quantity, content_type, xp_reward, completion_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [templateId, b.title, b.description, b.mandatory, b.quantity, b.content_type, b.xp_reward, b.completion_order]);
    }

    const { rows: [instance] } = await pool.query(`
      INSERT INTO campaign_instances
        (template_id, developer_user_id, game_name, game_artwork_url,
         status, actual_start, gamefolio_managed, start_type,
         demo_keys_remaining, full_keys_remaining, participant_count)
      VALUES ($1, $2, $3, $4, 'live', NOW(), false, 'asap', $5, $6, 0)
      RETURNING id
    `, [templateId, inst.developer_user_id, inst.game_name, inst.game_artwork_url,
        inst.demo_keys_remaining, inst.full_keys_remaining]);

    console.log(`  ✓ Seeded: ${t.name} (instance #${instance.id})`);
    seeded++;
  }
  console.log(`✅ Seeded ${seeded} dummy indie campaigns`);
  await pool.end();
}

seed().catch(e => { console.error(e); pool.end(); process.exit(1); });
