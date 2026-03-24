#!/usr/bin/env node
// Populates demo interview simulator sessions on top of the existing demo data.
// Run AFTER seed-demo: npm run seed-demo-simulator
//
// Adds:
//   - Prep notes + stage notes for Google, Stripe, Spotify
//   - 3 completed sessions for Google (shows sparkline score trend)
//   - 1 completed session for Stripe
//   - 1 completed session for Spotify
//   - 1 in-progress session for Google (shows active state)

const path = require('path');
const fs = require('fs');

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const Database = require('better-sqlite3');
const dbPath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.join(process.cwd(), 'recruitify.db');

console.log(`Database: ${dbPath}`);
if (!fs.existsSync(dbPath)) {
  console.error('Database not found. Run `npm run seed-demo` first.');
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Ensure simulator tables exist ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    stage_id TEXT REFERENCES interviews_roadmap(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'configuring',
    num_questions INTEGER NOT NULL DEFAULT 5,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    feedback_mode TEXT NOT NULL DEFAULT 'immediate',
    interviewer_persona TEXT,
    focus_areas TEXT NOT NULL DEFAULT '[]',
    overall_score REAL,
    debrief_summary TEXT,
    debrief_strengths TEXT NOT NULL DEFAULT '[]',
    debrief_improvements TEXT NOT NULL DEFAULT '[]',
    debrief_resources TEXT NOT NULL DEFAULT '[]',
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS session_questions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_transcript TEXT,
    score REAL,
    feedback_strengths TEXT,
    feedback_improvements TEXT,
    feedback_suggested_answer TEXT,
    duration_seconds INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
`);

// ── IDs ───────────────────────────────────────────────────────────────────────
const GOOGLE_ID    = 'aaaaaaaa-0001-0000-0000-000000000000';
const STRIPE_ID    = 'aaaaaaaa-0002-0000-0000-000000000000';
const SPOTIFY_ID   = 'aaaaaaaa-0013-0000-0000-000000000000';

// Stage IDs from seed-demo
const GOOGLE_SYSDESIGN  = 'bbbbbbbb-0001-0003-0000-000000000000'; // System design interview
const STRIPE_TECHNICAL  = 'bbbbbbbb-0002-0003-0000-000000000000'; // Technical interview
const SPOTIFY_TECHNICAL = 'bbbbbbbb-0013-0002-0000-000000000000'; // Technical screen

const seed = db.transaction(() => {

  // ── Prep notes & stage notes ────────────────────────────────────────────────
  db.prepare(`UPDATE companies SET prep_notes = ? WHERE id = ?`).run(
    `Role: Senior Software Engineer, Distributed Systems team.
Recruiter: Sarah Chen (sarah.chen@google.com)
Focus: System design is the key round — this is where most candidates fail.
Tips: Think out loud throughout. Start every design with requirements clarification and capacity estimation. Google values scalability, reliability, and clear trade-off reasoning.
Resources: DDIA book, Google SRE book, Grokking System Design.`,
    GOOGLE_ID,
  );

  db.prepare(`UPDATE companies SET prep_notes = ? WHERE id = ?`).run(
    `Role: Senior Software Engineer, Payments Infrastructure.
Recruiter: Maria Reyes (maria.reyes@stripe.com)
Comp discussed: $220-280k base.
Focus: Strong on reliability, distributed systems, and API design. Stripe cares a lot about correctness — idempotency, atomicity, consistency.
Tips: Be ready to discuss failure modes in depth. They love the "how would you debug this in production" angle.`,
    STRIPE_ID,
  );

  db.prepare(`UPDATE companies SET prep_notes = ? WHERE id = ?`).run(
    `Role: Staff Engineer, Backend Platform.
Focus: Backend systems, API design, data modeling. Culture fit matters — they value engineers who can work across teams.
Tips: Prepare a strong system design for a music streaming scenario. Talk about trade-offs between latency and consistency.`,
    SPOTIFY_ID,
  );

  // Stage notes
  db.prepare(`UPDATE interviews_roadmap SET notes = ? WHERE id = ?`).run(
    `This is the hardest round. 45 min. Expect: design a large-scale distributed system from scratch.
Common topics: CDNs, distributed caching, rate limiting, message queues.
Prep: Review consistent hashing, CAP theorem, database sharding, and write detailed capacity estimates.`,
    GOOGLE_SYSDESIGN,
  );

  db.prepare(`UPDATE interviews_roadmap SET notes = ? WHERE id = ?`).run(
    `60 min with a senior engineer. Mix of system design and behavioral.
Likely covers: payments, idempotency, API design, distributed systems.
Past candidates report questions about rate limiting, webhook delivery, and handling partial failures.`,
    STRIPE_TECHNICAL,
  );

  // ── Prepared statements ─────────────────────────────────────────────────────
  const insertSession = db.prepare(`
    INSERT OR IGNORE INTO interview_sessions
      (id, company_id, stage_id, status, num_questions, difficulty, feedback_mode,
       interviewer_persona, focus_areas, overall_score, debrief_summary,
       debrief_strengths, debrief_improvements, debrief_resources,
       started_at, completed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuestion = db.prepare(`
    INSERT OR IGNORE INTO session_questions
      (id, session_id, question_number, question_text, answer_transcript,
       score, feedback_strengths, feedback_improvements, feedback_suggested_answer,
       duration_seconds, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // ── Google — Session 1: 3 weeks ago, score 6.2 (weak) ───────────────────────
  const g1id = 'dddddddd-0001-0001-0000-000000000000';
  insertSession.run(
    g1id, GOOGLE_ID, GOOGLE_SYSDESIGN, 'completed', 5, 'medium', 'simulation',
    'A senior Google L5 software engineer',
    JSON.stringify(['System design', 'Scalability', 'Distributed systems']),
    6.2,
    "Solid foundational knowledge but answers lacked depth and specificity. You covered the 'what' but often missed the 'why' behind design choices. Google interviewers want to hear your reasoning process, not just your conclusions. Practice capacity estimation and lead with requirements before jumping to solutions.",
    JSON.stringify([
      'Clear and organized communication style throughout',
      'Correctly identified key components like caching and load balancing',
      'Made concrete technology choices rather than being vague',
    ]),
    JSON.stringify([
      'Start every design by clarifying requirements and estimating scale — you skipped this step',
      'Go deeper on trade-offs: why SQL vs NoSQL, why 301 vs 302, why LRU vs LFU',
      'Missed discussing failure modes and how the system degrades gracefully',
    ]),
    JSON.stringify([
      'Designing Data-Intensive Applications by Martin Kleppmann',
      'System Design Interview Vol 1 & 2 by Alex Xu',
      'High Scalability blog (highscalability.com)',
    ]),
    '2026-03-01T14:00:00Z', '2026-03-01T14:52:00Z', '2026-03-01T14:00:00Z',
  );

  const g1qs = [
    ['dddddddd-0001-0001-q1', g1id, 1,
      "To kick things off — could you walk me through your background and what draws you to systems work?",
      "Sure! I've been a software engineer for about 5 years, mostly working on backend systems. I've worked on payment processing pipelines and microservices. I'm drawn to systems because I like thinking about scalability and reliability.",
      7.0,
      'Good personal narrative with concrete technical experience mentioned.',
      'Could add quantified scale to make it more compelling — how large were the systems you worked on?',
      "Try: 'Our payment pipeline processed $2B annually and handled 10k TPS at peak — this is what got me excited about distributed systems.'",
      185, '2026-03-01T14:00:00Z'],
    ['dddddddd-0001-0001-q2', g1id, 2,
      "Let's dive in. Design a URL shortening service like bit.ly. Walk me through your approach.",
      "I'd start with a REST API — POST /shorten to create a short link and GET /{code} to redirect. For storage, I'd use a SQL database with a table mapping codes to URLs. For generating codes, I'd use a random 6-character alphanumeric string. For the redirect, I'd do a 301 redirect.",
      5.0,
      'Correctly identified the core endpoints and basic data model.',
      'Missed discussing hash collisions, read/write ratio, caching for hot URLs, and why 302 is usually better than 301 for analytics.',
      "Start with requirements: 'Are we optimizing for reads? Do we need click analytics?' Then discuss 302 vs 301, base62 encoding, and how to prevent collision.",
      312, '2026-03-01T14:04:00Z'],
    ['dddddddd-0001-0001-q3', g1id, 3,
      "How would you scale this to handle 100 million redirects per day?",
      "I'd add horizontal scaling with a load balancer. For the database, I'd add read replicas since this is mostly read traffic. I'd also add Redis caching so popular links don't hit the database every time.",
      6.5,
      'Correctly identified read replicas and caching as key strategies for a read-heavy workload.',
      'Needed more depth: cache eviction policies, what percentage of URLs to cache, and how to handle cache stampede on popular links.',
      "Estimate first: 100M/day ≈ 1,200 RPS. Then discuss: 80% of traffic hits 20% of URLs, so a cache with LRU eviction covering that 20% eliminates most DB load.",
      287, '2026-03-01T14:09:00Z'],
    ['dddddddd-0001-0001-q4', g1id, 4,
      "What database would you choose and why?",
      "I'd use PostgreSQL. It's reliable, has good indexing, and I know it well. You could also use MySQL.",
      4.5,
      'Made a concrete choice rather than being vague.',
      'For a pure key-value lookup at massive scale, NoSQL (DynamoDB, Cassandra) is often a better fit. The answer also lacked any trade-off reasoning.',
      "Say: 'For a URL shortener, reads are simple key-value lookups — no joins needed. That makes Cassandra or DynamoDB compelling for horizontal scaling. I'd choose DynamoDB for its managed scaling and predictable latency.'",
      198, '2026-03-01T14:14:00Z'],
    ['dddddddd-0001-0001-q5', g1id, 5,
      "How would you ensure high availability?",
      "I'd deploy across multiple availability zones and use a load balancer. If one server goes down, the load balancer routes to healthy ones. I'd also have database backups.",
      7.5,
      'Multi-AZ deployment is correct and shows infrastructure awareness. Backup strategy shows operational thinking.',
      'Should discuss RTO/RPO targets, health checks at the application level, and what happens to in-flight requests during a failover.',
      "Add: 'Our RTO target is <30 seconds. I'd use active health checks with a 5s interval, route around unhealthy nodes immediately, and test failover quarterly in a game day.'",
      234, '2026-03-01T14:18:00Z'],
  ];
  for (const q of g1qs) insertQuestion.run(...q);

  // ── Google — Session 2: 2 weeks ago, score 7.4 (improving) ──────────────────
  const g2id = 'dddddddd-0001-0002-0000-000000000000';
  insertSession.run(
    g2id, GOOGLE_ID, GOOGLE_SYSDESIGN, 'completed', 5, 'medium', 'simulation',
    'A senior Google L5 software engineer',
    JSON.stringify(['System design', 'Distributed systems', 'Rate limiting']),
    7.4,
    "Significant improvement over last session. You're now leading with requirements and showing stronger trade-off reasoning. The rate limiter design was particularly strong. Keep building depth on edge cases — what breaks at extreme scale, what happens during network partitions, and how failures cascade through a system.",
    JSON.stringify([
      'Excellent use of clarifying questions at the start of each design',
      'Strong on distributed algorithms — consistent hashing and token bucket were well explained',
      'Good use of real-world analogies to ground abstract concepts',
    ]),
    JSON.stringify([
      'Deepen knowledge of failure scenarios — split-brain, thundering herd, and how to mitigate them',
      'Learn the PACELC model as an evolution beyond CAP theorem',
      'Practice back-of-envelope estimation out loud — make your math visible',
    ]),
    JSON.stringify([
      'The Google SRE Book (free at sre.google)',
      'DDIA Chapter 9: Consistency and Consensus',
      'Grokking the System Design Interview',
    ]),
    '2026-03-08T10:00:00Z', '2026-03-08T10:58:00Z', '2026-03-08T10:00:00Z',
  );

  const g2qs = [
    ['dddddddd-0001-0002-q1', g2id, 1,
      "Design a distributed rate limiter. Walk me through your approach from scratch.",
      "I'd start by clarifying what we're rate limiting — per user, per IP, per API key? Assuming per API key at 1000 requests per minute. I'd use a token bucket algorithm stored in Redis with a Lua script for atomicity. Each API key has a bucket. Tokens refill at a fixed rate. Each request consumes one. If empty, return 429. The Lua script checks and decrements in a single round-trip — critical for correctness with multiple limiter instances.",
      9.0,
      'Excellent: started with clarifying questions, picked a specific algorithm with clear reasoning, and correctly identified Redis + Lua for atomic operations.',
      'Could also discuss sliding window vs fixed window trade-offs and multi-region rate limiting.',
      "Mention failure mode: if Redis is down, do you fail open (allow traffic) or closed (block all)? This trade-off shows operational maturity.",
      298, '2026-03-08T10:00:00Z'],
    ['dddddddd-0001-0002-q2', g2id, 2,
      "How would you design a distributed cache from scratch?",
      "I'd use consistent hashing to distribute entries across nodes. Each node owns a range of the hash ring. When a node is added or removed, only a fraction of keys migrate — no full cache invalidation. I'd replicate each key to N neighbors for fault tolerance. LRU eviction. The client hashes the key to find the right node.",
      8.0,
      'Strong: consistent hashing, replication, and LRU are all correct and clearly explained.',
      'Should discuss virtual nodes to prevent hot spots and write strategies like write-through vs write-around.',
      "Add: 'Without virtual nodes, uneven key distribution creates hot spots. With 150 virtual nodes per physical node, load is statistically well-distributed.'",
      267, '2026-03-08T10:05:00Z'],
    ['dddddddd-0001-0002-q3', g2id, 3,
      "What's the hardest part of cache invalidation, and how do you handle it?",
      "Two main problems. First, cache stampede: when a popular key expires, thousands of requests hit the database simultaneously. Fix: probabilistic early expiration or a distributed lock so only one request refreshes the cache. Second, write invalidation: when you update the DB, you need to invalidate or update the cache. Cache-aside lets the app handle this explicitly. Write-through keeps cache always current but adds write latency.",
      7.5,
      'Good depth: covered stampede, distributed locks, and write strategies with clear trade-offs.',
      'Could discuss the double-delete pattern for distributed invalidation and acceptable staleness windows.',
      "Reference the Facebook Memcache paper — their lease mechanism is the canonical solution to cache stampede at scale.",
      311, '2026-03-08T10:10:00Z'],
    ['dddddddd-0001-0002-q4', g2id, 4,
      "Design a system to send 10 million push notifications per day.",
      "That's about 115 per second on average. I'd build an async pipeline: a producer accepts requests and pushes to Kafka, partitioned by device type. Consumer workers pull from Kafka and call APNs (iOS) or FCM (Android). Failed notifications go to a dead-letter queue with exponential backoff — 1s, 2s, 4s, up to 24 hours. Each worker maintains a connection pool to the providers.",
      7.0,
      'Solid async architecture with correct Kafka partitioning and dead-letter queue handling.',
      'Should address provider rate limits (APNs throttles aggressively), priority queues for urgent notifications, and deduplication.',
      "Also discuss: how do you handle invalid tokens (uninstalled apps)? Leaving them in the queue wastes capacity and risks getting blacklisted by providers.",
      289, '2026-03-08T10:15:00Z'],
    ['dddddddd-0001-0002-q5', g2id, 5,
      "Walk me through CAP theorem with a concrete production example of when you'd sacrifice consistency.",
      "CAP says a distributed system can only guarantee two of: Consistency, Availability, Partition tolerance. Since partitions happen, you really choose CP vs AP. CP: during a partition, return an error rather than stale data — banking. AP: serve potentially stale data but stay up — social media. Real example: Netflix viewing history doesn't need perfect consistency. Seeing a slightly different 'continue watching' list on two devices for a few seconds is fine — they choose AP. Banks choose CP because stale balance data is dangerous.",
      8.0,
      'Clear explanation with an excellent real-world example. Netflix vs bank is the perfect contrast.',
      'PACELC extends CAP to include latency vs consistency trade-offs even when no partition exists — worth knowing for Google.',
      "Add: 'DynamoDB lets you tune consistency per-read — strong consistency for financial records, eventual for user preferences. This gives you the best of both worlds.'",
      341, '2026-03-08T10:20:00Z'],
  ];
  for (const q of g2qs) insertQuestion.run(...q);

  // ── Google — Session 3: 1 week ago, score 8.1 (strong) ──────────────────────
  const g3id = 'dddddddd-0001-0003-0000-000000000000';
  insertSession.run(
    g3id, GOOGLE_ID, GOOGLE_SYSDESIGN, 'completed', 5, 'hard', 'simulation',
    'A senior Google L6 software engineer known for rigorous system design interviews',
    JSON.stringify(['System design', 'Real-time collaboration', 'Distributed systems']),
    8.1,
    "Your strongest session yet. You demonstrated clear growth in structuring designs from first principles, articulating trade-offs, and handling follow-up pressure. The Google Docs design showed real depth. One area to sharpen: when asked about failure modes, go further into recovery procedures and how you'd monitor and alert on them in production.",
    JSON.stringify([
      'Strong opening with requirements clarification and capacity estimation on every question',
      'Demonstrated deep knowledge of operational transformation and CRDTs for collaborative editing',
      'Excellent handling of follow-up questions — showed you can think on your feet',
    ]),
    JSON.stringify([
      'Expand on observability: how would you monitor these systems and what alerts would you set?',
      'Discuss recovery procedures more explicitly — MTTR, runbooks, on-call escalation paths',
      'Practice the "what would you do differently now" reflection — shows engineering maturity',
    ]),
    JSON.stringify([
      'Real-Time Collaboration and Operational Transformation papers',
      'Google Spanner paper (OSDI 2012)',
      'The morning paper blog for distributed systems research',
    ]),
    '2026-03-15T15:00:00Z', '2026-03-15T16:05:00Z', '2026-03-15T15:00:00Z',
  );

  const g3qs = [
    ['dddddddd-0001-0003-q1', g3id, 1,
      "Design Google Docs — real-time collaborative document editing for millions of concurrent users.",
      "Core challenge: handling concurrent edits. I'd use Operational Transformation — each client sends ops like 'insert char X at position 5'. The server serializes and transforms concurrent ops. Architecture: WebSocket connections to editor nodes, each node owns a set of documents via consistent hashing on doc ID. This lets us serialize ops per-document easily. Ops are appended to a persistent log in Spanner for durability. Periodic snapshots reduce replay time on cold start. For scale: hot documents stay in-memory on dedicated nodes. Cold documents loaded from blob storage on access.",
      9.0,
      'Excellent: immediately identified OT as the core challenge, proposed a sound architecture with dedicated editor nodes, and addressed persistence and cold-start.',
      'Could mention CRDTs as an alternative to OT — simpler to implement correctly but with larger data size.',
      "Mention: 'Google Docs actually moved from OT to a wave-based protocol. CRDTs like Automerge are now popular for offline-first scenarios.'",
      387, '2026-03-15T15:00:00Z'],
    ['dddddddd-0001-0003-q2', g3id, 2,
      "A user goes offline for 20 minutes and comes back with local edits. How do you handle that?",
      "The client queues ops locally while offline with vector clocks to track causality. On reconnect, it sends all queued ops to the server. The server runs OT to reconcile against ops that happened during the outage — OT is associative, so convergence is guaranteed. The client also receives a diff of all changes that happened while it was offline. If there's a true semantic conflict — like two users deleted the same paragraph — we surface it for manual resolution, similar to a Git merge conflict. The client applies the server-resolved state and shows a diff highlighting changes.",
      8.5,
      'Strong: correct use of OT for reconciliation, vector clocks for causality, and a good analogy to Git merge conflicts.',
      'Should discuss the reconnection UX — how do you notify the user that their edits were merged vs conflicted?',
      "Add: 'We'd show a banner: your document was updated while offline. Here are the changes. This avoids silent data loss which would erode user trust.'",
      298, '2026-03-15T15:06:00Z'],
    ['dddddddd-0001-0003-q3', g3id, 3,
      "How would you design the permission system — owner, editor, commenter, viewer — at scale?",
      "RBAC at the document level. Permissions stored in an ACL table: (document_id, principal_id, principal_type, role). Principal can be a user or a group. Effective permissions are the max across all principals. For sharing links, I'd issue signed tokens embedding the role and expiry — no database lookup needed for validation. ACLs are cached in a distributed cache with a short TTL since they're read on every operation. For org-wide sharing, group membership is resolved at query time and cached per-user with a 5-minute TTL.",
      8.0,
      'Solid RBAC design with correct group resolution, token-based link sharing, and smart caching strategy.',
      'Should discuss cache invalidation when permissions change — if you revoke access, how quickly does it take effect?',
      "Add: 'On permission revoke, we publish a revocation event to a pub/sub topic. Cache subscribers invalidate the affected entries immediately, bounding staleness to seconds.'",
      334, '2026-03-15T15:12:00Z'],
    ['dddddddd-0001-0003-q4', g3id, 4,
      "How do you scale this to 100 million daily active users and 1 billion documents?",
      "Tier documents by access pattern. Hot: actively edited — dedicated editor node, kept in memory. Warm: viewed frequently — served from read replicas, cached. Cold: not accessed in 30 days — serialized to GCS, loaded on access with a few hundred ms latency. The WebSocket layer is stateful so I'd use a session router that maps document IDs to editor nodes. Auto-scale editor nodes based on active document count. For the ops log, Spanner partitioned by document ID gives us global consistency and horizontal scale. We'd target 99th percentile latency of <50ms for op round-trips.",
      8.5,
      'Excellent tiering strategy with concrete latency targets. Spanner partitioning and session routing show operational depth.',
      'Should quantify the tier boundaries — what defines "hot" vs "warm"? Is it access frequency, last-access time, or editor count?',
      "Define it concretely: 'Hot = has at least one active WebSocket connection. Warm = accessed in the last 7 days. Cold = everything else. Promotion/demotion happens in real-time as connections open and close.'",
      356, '2026-03-15T15:18:00Z'],
    ['dddddddd-0001-0003-q5', g3id, 5,
      "What keeps you up at night about this design? What's the hardest failure mode?",
      "The editor node is a single point of serialization per document — if it goes down, all clients for that doc are disconnected. Recovery: clients reconnect, the new node replays the ops log to reconstruct state. This takes 1-2 seconds for small docs, potentially 10+ seconds for large docs with a long history — that's why snapshots are critical. I'd limit each node to 500 active documents, monitor memory pressure, and proactively migrate documents away before a node becomes unhealthy. A secondary concern: OT bugs. OT is notoriously hard to implement correctly. I'd use a battle-tested library and rely heavily on fuzz testing for the transform functions.",
      8.0,
      'Excellent: identified the real failure mode, quantified recovery time, and showed operational awareness with proactive migration.',
      'Should mention circuit breakers and what the client UX looks like during a node failure — does the user see a spinner, an error, or a notification?',
      "Add: 'The client shows a non-blocking reconnecting... banner. We target full recovery within 5 seconds for 99% of documents. If it exceeds 10s, we alert on-call.'",
      378, '2026-03-15T15:24:00Z'],
  ];
  for (const q of g3qs) insertQuestion.run(...q);

  // ── Google — Session 4: in_progress (shows active state) ────────────────────
  const g4id = 'dddddddd-0001-0004-0000-000000000000';
  insertSession.run(
    g4id, GOOGLE_ID, GOOGLE_SYSDESIGN, 'in_progress', 5, 'hard', 'simulation',
    'A senior Google L6 software engineer',
    JSON.stringify(['System design', 'Storage systems']),
    null, null,
    JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
    '2026-03-22T12:00:00Z', null, '2026-03-22T12:00:00Z',
  );

  insertQuestion.run(
    'dddddddd-0001-0004-q1', g4id, 1,
    "Design a distributed key-value store like DynamoDB. Where would you start?",
    "I'd start with the API: simple get(key), put(key, value), delete(key). For distribution I'd use consistent hashing with virtual nodes to partition data across nodes evenly. Replication factor of 3 using the next N nodes on the hash ring. For consistency, I'd use quorum reads and writes — R + W > N. With N=3, R=2, W=2 we get strong consistency at the cost of one node failure tolerance.",
    null, null, null, null, 420,
    '2026-03-22T12:00:00Z',
  );

  // ── Stripe — Session 1: 1 week ago, score 7.5 ───────────────────────────────
  const s1id = 'dddddddd-0002-0001-0000-000000000000';
  insertSession.run(
    s1id, STRIPE_ID, STRIPE_TECHNICAL, 'completed', 5, 'medium', 'immediate',
    'A senior Stripe engineer on the Payments Infrastructure team',
    JSON.stringify(['Payments', 'Reliability', 'API design', 'Distributed systems']),
    7.5,
    "Strong overall performance with notable depth on payments-specific patterns like idempotency and the transactional outbox. You demonstrated solid debugging instincts. The Luhn implementation was clean and well-considered. To elevate to the next level: develop sharper instincts around failure mode analysis — Stripe engineers obsess over what happens when things go wrong.",
    JSON.stringify([
      'Deep knowledge of idempotency patterns and the transactional outbox — exactly what Stripe cares about',
      'Clean and correct Luhn algorithm implementation with edge cases covered',
      'Strong debugging methodology: mitigation first, then investigation, then remediation',
    ]),
    JSON.stringify([
      'Go deeper on distributed transaction patterns: two-phase commit, saga pattern',
      'Practice talking through observability — what metrics and alerts would you add?',
      'Prepare more examples of trade-offs you have made in production payment systems',
    ]),
    JSON.stringify([
      'Stripe Engineering Blog (stripe.com/blog/engineering)',
      'Pattern: Idempotency Keys (REST API design)',
      'Designing Distributed Systems by Brendan Burns',
    ]),
    '2026-03-14T11:00:00Z', '2026-03-14T12:05:00Z', '2026-03-14T11:00:00Z',
  );

  const s1qs = [
    ['dddddddd-0002-0001-q1', s1id, 1,
      "Tell me about a time you designed or improved a payment or financial system. What were the hardest engineering challenges?",
      "At my current company I built a recurring billing engine for monthly subscriptions. Two hard problems: idempotency and atomicity. For idempotency: if a charge request is retried due to a network failure, we can't double-charge. We solved this with idempotency keys — the client generates a UUID per charge attempt, the server stores the result. If the same key arrives again, return the stored result immediately. For atomicity: updating payment status and sending a receipt had to be atomic. We used a transactional outbox: write both the payment record and an event to the outbox table in one transaction, then a separate worker delivers the event.",
      8.5,
      'Excellent: idempotency keys and the transactional outbox are exactly the patterns Stripe uses. Showed deep practical experience.',
      'Could quantify the impact — how often did retries happen, what was the volume this handled?',
      "Add: 'We processed about 50k subscriptions monthly. Without idempotency, our retry rate of ~2% would have caused ~1k double charges per month.'",
      342, '2026-03-14T11:00:00Z'],
    ['dddddddd-0002-0001-q2', s1id, 2,
      "Design an API rate limiter at Stripe's scale — millions of API calls per second across thousands of merchants.",
      "I'd use a sliding window counter stored in Redis, sharded by API key. For each key: maintain a sorted set of request timestamps, remove entries older than the window, count remaining. If under limit, add current timestamp and allow. Else reject with 429 and a Retry-After header. For millions of RPS: shard Redis by API key using consistent hashing. Add a local in-memory first check — if clearly under limit (less than 80% of quota), skip Redis entirely. This dramatically reduces Redis calls. Near-limit cases go to Redis for precise counting.",
      8.0,
      'Smart two-tier approach with local short-circuit is exactly right for high-throughput rate limiting. Retry-After header shows API design awareness.',
      'Should discuss what happens when Redis is unavailable — fail open or closed? And how to handle burst traffic.',
      "Add: 'We fail open if Redis is down — better to allow some extra traffic than to block all legitimate merchants. We alert immediately and have a 60-second SLA to restore.'",
      298, '2026-03-14T11:06:00Z'],
    ['dddddddd-0002-0001-q3', s1id, 3,
      "A bug is causing some payments to be charged twice. You get paged at 2am. Walk me through your response.",
      "First, can I stop the bleeding? Deploy a feature flag to pause the affected charge flow, or roll back the deploy if there was a recent one. Then assess scope: pull logs for the last 24 hours, look for duplicate payment IDs or duplicate charge amounts for the same customer within a short window. Estimate how many customers are affected and the total dollar amount. Issue refunds immediately, starting with largest amounts. For root cause: review recent code changes, check if idempotency keys are being generated correctly or reused. Add a monitoring alert for duplicate payments going forward. Send a customer communication within 24 hours.",
      7.5,
      'Correct priority ordering: contain first, then investigate. Good instinct to start with largest refunds. Solid root cause analysis process.',
      'Should mention internal stakeholder communication — engineering lead, on-call manager, customer support team — so they can prepare for inbound.',
      "Add: 'I'd open a war room Slack channel immediately and page the on-call manager so leadership is aware. Support needs to know before customers start calling.'",
      387, '2026-03-14T11:13:00Z'],
    ['dddddddd-0002-0001-q4', s1id, 4,
      "Write a function to validate a credit card number using the Luhn algorithm.",
      "The Luhn algorithm: from the right, double every second digit. If doubling gives more than 9, subtract 9. Sum all digits. Valid if sum mod 10 equals 0. Here's my implementation: function luhn(cardNumber) { const digits = cardNumber.replace(/\\D/g, '').split('').reverse().map(Number); let sum = 0; for (let i = 0; i < digits.length; i++) { let d = digits[i]; if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } sum += d; } return sum % 10 === 0; } Edge cases I'm handling: strip non-numeric characters, return false for empty input.",
      8.0,
      'Correct implementation, clean code, and good edge case coverage. Reversing the array to simplify the alternating logic is a nice touch.',
      'Could also add a minimum length check — valid card numbers are at least 13 digits.',
      "Add: `if (digits.length < 13) return false;` after stripping non-numeric chars to catch obviously invalid inputs early.",
      265, '2026-03-14T11:19:00Z'],
    ['dddddddd-0002-0001-q5', s1id, 5,
      "Design Stripe's webhook delivery system to guarantee at-least-once delivery to merchant endpoints.",
      "Webhooks need at-least-once because exactly-once delivery across network boundaries is impossible. When an event occurs, write it to an events table and an outbox queue atomically — one transaction. A delivery worker POSTs to the merchant's endpoint. On failure or timeout, retry with exponential backoff: 1s, 2s, 4s, up to 72 hours. Track delivery attempts in a delivery_log. Merchants must make their endpoints idempotent — we include an event ID they can use to deduplicate. After max retries, mark as permanently failed and notify the merchant in the dashboard.",
      6.5,
      'Solid foundation with correct at-least-once semantics, exponential backoff, and idempotency guidance for merchants.',
      'Should discuss how to handle slow merchant endpoints (timeouts), connection pooling, and ordering guarantees within an account.',
      "Address ordering: 'We guarantee ordering within a merchant account by delivering one event at a time per account and only advancing after a successful ack.'",
      312, '2026-03-14T11:25:00Z'],
  ];
  for (const q of s1qs) insertQuestion.run(...q);

  // ── Spotify — Session 1: 5 days ago, score 7.8 ──────────────────────────────
  const sp1id = 'dddddddd-0013-0001-0000-000000000000';
  insertSession.run(
    sp1id, SPOTIFY_ID, SPOTIFY_TECHNICAL, 'completed', 5, 'medium', 'immediate',
    'A senior Spotify backend engineer on the Platform team',
    JSON.stringify(['Backend systems', 'API design', 'Music streaming']),
    7.8,
    "Very strong session. You showed good product intuition alongside solid engineering fundamentals — a combination Spotify values highly. Your answers were well-structured and you handled ambiguity well by asking clarifying questions. The music recommendation system design was creative and technically sound.",
    JSON.stringify([
      'Strong product intuition combined with solid engineering — you thought about the user experience, not just the system',
      'Excellent clarifying questions that reframed problems effectively',
      'Clean, readable code with good edge case handling',
    ]),
    JSON.stringify([
      'Go deeper on event-driven architecture patterns — Spotify uses Kafka extensively',
      'Study data pipeline design: batch vs streaming processing trade-offs',
      'Prepare more specific examples from your work that relate to media or content delivery',
    ]),
    JSON.stringify([
      'Spotify Engineering Blog (engineering.atspotify.com)',
      'Kafka: The Definitive Guide (free PDF available)',
      'Streaming Systems by Tyler Akidau et al.',
    ]),
    '2026-03-17T14:00:00Z', '2026-03-17T14:55:00Z', '2026-03-17T14:00:00Z',
  );

  const sp1qs = [
    ['dddddddd-0013-0001-q1', sp1id, 1,
      "Walk me through how you'd design the backend for Spotify's song recommendation feature — the 'Daily Mix' playlists.",
      "I'd think about this as a pipeline. Offline: a batch job runs nightly using collaborative filtering and audio feature analysis to pre-compute recommendations for each user. Results stored in a recommendations table keyed by user ID. Online: when the user opens the app, fetch their pre-computed list and apply real-time adjustments — boost songs they've been listening to recently, demote ones they've skipped. For the audio features, I'd use a vector embedding per song and compute cosine similarity to find tracks with similar acoustic characteristics. This hybrid approach gives good coverage with fast response times.",
      8.5,
      'Strong: hybrid offline + online approach is exactly right. Mentioned collaborative filtering, audio embeddings, and real-time adjustment — all key signals.',
      'Should discuss how to handle new users with no history — the cold start problem.',
      "Add: 'For new users, I'd fall back to popularity-based recommendations within their chosen genres, then transition to personalized as we gather listening history.'",
      356, '2026-03-17T14:00:00Z'],
    ['dddddddd-0013-0001-q2', sp1id, 2,
      "How would you design the API for a feature that lets artists see real-time listener counts for their songs?",
      "Two concerns: real-time freshness and scale. Artists need to see counts update every few seconds, but we're potentially aggregating hundreds of millions of events per day. I'd use a streaming pipeline: client events (play, pause, skip) go to Kafka, a Flink job aggregates play counts per song in 10-second tumbling windows, results land in a low-latency store like Redis. The artist dashboard polls a REST endpoint that reads from Redis. For very popular artists, I'd consider Server-Sent Events to push updates rather than polling. The API: GET /artists/{id}/songs/{songId}/stats — returns current listeners, total plays today, play trend.",
      8.0,
      'Excellent stack: Kafka → Flink → Redis is the right choice for real-time aggregation at Spotify scale. SSE as an optimization for high-traffic use cases shows good thinking.',
      'Should discuss data accuracy vs latency trade-off: do artists want exactly-correct counts or good-enough-real-time?',
      "Add: 'I'd be transparent in the UI: Approx. listener count, updated every 30 seconds. Exact counts are in the daily report. This sets correct expectations.'",
      312, '2026-03-17T14:07:00Z'],
    ['dddddddd-0013-0001-q3', sp1id, 3,
      "Spotify has a feature where if you're listening with friends, everyone hears the same song at the same time. How would you build that?",
      "This is a synchronized playback problem. One user is the 'host', others are 'listeners'. The host's client sends its playback position to a coordination server every few seconds. Listener clients receive the host's position and seek to match. The tricky part is network latency — if a listener is 200ms behind, do we seek or let it drift? I'd tolerate small drift and only hard-seek if the gap exceeds 1 second. The coordination server holds session state: who is the host, current track, position. On host disconnect, promote another user. Use WebSockets for low-latency bidirectional communication.",
      7.5,
      'Good overall architecture with the host/listener model, drift tolerance, and failover handling. WebSockets is the right transport.',
      'Should discuss what happens when a listener has poor connectivity — do they get dropped from the session or fall back gracefully?',
      "Add: 'A listener on poor connectivity gets a degraded experience indicator, not a session drop. We reduce sync frequency from 2s to 5s to adapt to their conditions.'",
      334, '2026-03-17T14:14:00Z'],
    ['dddddddd-0013-0001-q4', sp1id, 4,
      "Write a function that, given a playlist of songs with durations, returns the minimum number of songs needed to fill exactly N minutes.",
      "This is essentially a subset sum / knapsack problem. If we need exact match, it's NP-hard in general but we can use dynamic programming. Let me write a DP solution: function minSongsForDuration(songs, targetMinutes) { const targetSecs = targetMinutes * 60; const dp = new Array(targetSecs + 1).fill(Infinity); dp[0] = 0; for (const song of songs) { for (let t = song.duration; t <= targetSecs; t++) { if (dp[t - song.duration] !== Infinity) { dp[t] = Math.min(dp[t], dp[t - song.duration] + 1); } } } return dp[targetSecs] === Infinity ? -1 : dp[targetSecs]; } Returns -1 if exact fill is impossible.",
      8.0,
      'Correct DP solution with right complexity analysis. Recognized it as knapsack variant, handled the impossible case cleanly.',
      'Good to mention time complexity O(n * target) and space O(target). Also worth discussing whether we need exact or approximate fill in a real product context.',
      "In a real Spotify context: exact fill is probably too strict. You might want 'fill at least N minutes using fewest songs' which is a simpler greedy problem.",
      398, '2026-03-17T14:21:00Z'],
    ['dddddddd-0013-0001-q5', sp1id, 5,
      "Tell me about a time you had to make a technical decision under significant uncertainty. How did you approach it?",
      "At my last job we were choosing between PostgreSQL and Cassandra for a new feature. We had significant write volume but uncertain read patterns — we didn't know yet how users would query the data. I ran a two-week experiment: built the same feature against both databases with production-like load tests. The results surprised us — Postgres performed better for our actual query patterns despite the higher write volume. We picked Postgres. Six months later I revisited: I was right to test rather than assume, but I should have involved the team earlier. I made the DB choice mostly alone when a broader discussion would have surfaced edge cases faster.",
      7.0,
      'Strong answer with a concrete example, quantified timeline, and honest self-reflection on what you would do differently.',
      'Could add the specific metric that made the decision clear — was it latency, cost, or operational complexity?',
      "Add the decisive metric: 'Cassandra had 40% lower write latency but 3x higher read latency for our query patterns. Since our reads were 5x more frequent, Postgres won on overall system latency.'",
      267, '2026-03-17T14:28:00Z'],
  ];
  for (const q of sp1qs) insertQuestion.run(...q);

  console.log('✓ Prep notes added to Google, Stripe, Spotify');
  console.log('✓ Stage notes added to Google System Design and Stripe Technical Interview');
  console.log('✓ Google: 3 completed sessions (6.2 → 7.4 → 8.1) + 1 in-progress');
  console.log('✓ Stripe: 1 completed session (7.5)');
  console.log('✓ Spotify: 1 completed session (7.8)');
});

seed();
db.close();
console.log('\nDone. Run `npm run dev` to see the data.');
