#!/usr/bin/env node
// One-off script: adds stages + simulator sessions for the Anthropic company.
// Safe to re-run (INSERT OR IGNORE).

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
const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'recruitify.db');
console.log('Database:', dbPath);
const db = new Database(dbPath);

// ── IDs ────────────────────────────────────────────────────────────────────
const ANTHROPIC_ID   = 'aaaaaaaa-0011-0000-0000-000000000000';

const STAGE_RECRUITER  = 'aaaa0011-5101-0000-0000-000000000000';
const STAGE_TECHNICAL  = 'aaaa0011-5102-0000-0000-000000000000';
const STAGE_SYSDESIGN  = 'aaaa0011-5103-0000-0000-000000000000';
const STAGE_VALUES     = 'aaaa0011-5104-0000-0000-000000000000';

const SESSION_1 = 'aaaa0011-9901-0000-0000-000000000000';
const SESSION_2 = 'aaaa0011-9902-0000-0000-000000000000';
const SESSION_3 = 'aaaa0011-9903-0000-0000-000000000000';
const SESSION_4 = 'aaaa0011-9904-0000-0000-000000000000';

// ── Helpers ────────────────────────────────────────────────────────────────
const run = (sql, params = []) => db.prepare(sql).run(...params);

// ── Ensure tables exist ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    company_id TEXT NOT NULL,
    stage_id TEXT,
    status TEXT NOT NULL DEFAULT 'configuring',
    feedback_mode TEXT,
    num_questions INTEGER,
    interviewer_persona TEXT,
    difficulty TEXT,
    focus_areas TEXT,
    overall_score REAL,
    debrief_summary TEXT,
    debrief_strengths TEXT,
    debrief_improvements TEXT,
    debrief_resources TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS session_questions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_transcript TEXT,
    score REAL,
    feedback_strengths TEXT,
    feedback_improvements TEXT,
    feedback_suggested_answer TEXT,
    duration_seconds INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Update company prep notes ──────────────────────────────────────────────
run(
  `UPDATE companies SET prep_notes = ? WHERE id = ?`,
  [
    `# Anthropic – Interview Prep

## Company context
Anthropic builds AI systems with a focus on safety and interpretability. Their mission is the responsible development and maintenance of advanced AI for the long-term benefit of humanity.

## Interview process (5 stages)
1. Recruiter Screen (~30 min) — motivation, background, logistics
2. Technical Phone Screen (~60 min) — Python / algorithms, ML fundamentals
3. System Design (~90 min) — large-scale ML systems, distributed infra
4. Values & Mission (~60 min) — AI safety alignment, ethical reasoning
5. Team fit / final round — domain-specific with hiring manager

## Key themes to prepare
- Constitutional AI, RLHF, model alignment techniques
- Python proficiency: data structures, async, performance
- Distributed systems for ML: training pipelines, serving infra
- Anthropic's Responsible Scaling Policy (RSP)
- Trade-offs in AI capability vs. safety

## Resources
- https://anthropic.com/research — published papers (Constitutional AI, Model Cards)
- https://www.anthropic.com/responsible-scaling-policy — RSP document
- Leetcode: focus on graph problems, dynamic programming, system design`,
    ANTHROPIC_ID,
  ]
);

// ── Add roadmap stages ─────────────────────────────────────────────────────
const insertStage = db.prepare(`
  INSERT OR IGNORE INTO interviews_roadmap
    (id, company_id, stage_name, is_completed, order_index, notes)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertStage.run(STAGE_RECRUITER, ANTHROPIC_ID, 'Recruiter screen',    1, 1, 'Went well — recruiter confirmed strong alignment on mission. Next: technical screen.');
insertStage.run(STAGE_TECHNICAL, ANTHROPIC_ID, 'Technical phone screen', 0, 2, 'Focus: Python, ML fundamentals, one coding question. Study async patterns and transformer internals.');
insertStage.run(STAGE_SYSDESIGN, ANTHROPIC_ID, 'System design',         0, 3, 'Design a distributed LLM inference serving system. Prepare: batching, autoscaling, caching strategies.');
insertStage.run(STAGE_VALUES,    ANTHROPIC_ID, 'Values & mission interview', 0, 4, 'AI safety reasoning, Anthropic RSP, Constitutional AI. Be ready to discuss concrete trade-offs.');

console.log('✓ Roadmap stages added (Recruiter ✅, Technical, System Design, Values)');

// ── Session 1 — Recruiter Screen prep (completed, score 7.1) ──────────────
// columns: id, user_id, company_id, stage_id, status, feedback_mode, num_questions,
//          interviewer_persona, difficulty, focus_areas, overall_score,
//          debrief_summary, debrief_strengths, debrief_improvements, debrief_resources,
//          started_at, completed_at, created_at
run(`INSERT OR IGNORE INTO interview_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
  SESSION_1, null, ANTHROPIC_ID, STAGE_RECRUITER, 'completed',
  'after_each', 4, 'professional', 'medium',
  JSON.stringify(['motivation', 'background', 'AI safety awareness']),
  7.1,
  "Strong overall performance. You demonstrated genuine enthusiasm for Anthropic's mission and showed clear awareness of AI safety challenges. Your answers were structured and concise. With a bit more specificity on why Anthropic over other AI labs, and stronger examples of past ownership, this round should be a clear pass.",
  JSON.stringify([
    'Authentic passion for AI safety came through clearly',
    'Good STAR structure on the team conflict question',
    'Solid awareness of Anthropic\'s research focus',
  ]),
  JSON.stringify([
    'Differentiate more specifically why Anthropic vs. OpenAI/DeepMind',
    'Add metrics or scope to ownership examples ("led a team of X", "reduced Y by Z%")',
    'Prepare a sharper "why now" for the career transition narrative',
  ]),
  JSON.stringify([
    'Anthropic Responsible Scaling Policy — read the full document',
    'Constitutional AI paper (Bai et al.) — understand the core idea in 2 sentences',
  ]),
  '2026-03-10T10:00:00Z', '2026-03-10T10:28:00Z',
  '2026-03-10T10:00:00Z',
]);

const q1 = [
  {
    idx: 0,
    q: "Tell me about yourself and why you're interested in Anthropic specifically.",
    a: "I'm a software engineer with 5 years of backend experience, the last 2 focused on ML infrastructure. I've been following Anthropic's research since the Constitutional AI paper — the idea of using AI feedback to reduce harmful outputs rather than relying solely on human labeling resonated with me deeply. I want to work on systems that are not just capable but reliably aligned, and I think Anthropic is doing the most rigorous work on that frontier.",
    score: 7.5,
    strengths: "Clear narrative arc, shows genuine research familiarity, connects personal experience to company mission",
    improvements: "Could name a second piece of Anthropic research to show breadth; 'resonated deeply' is vague — specify which aspect",
    suggested: "Lead with the specific problem you want to work on, then trace your background backward to show why you're positioned to solve it. Mention 2 concrete Anthropic papers or initiatives by name.",
  },
  {
    idx: 1,
    q: "Describe a time you took ownership of a project that wasn't going well.",
    a: "At my last company, a key data pipeline was failing silently — dashboards showed stale data for days before anyone noticed. I wasn't the owner but I diagnosed the root cause (a silent exception in the ETL), fixed it, added alerting, and then drafted a post-mortem that became our team's incident response template. My manager later formally transferred ownership of that pipeline to me.",
    score: 7.8,
    strengths: "Clear problem-action-outcome structure, shows initiative beyond role, concrete deliverable (the template)",
    improvements: "Add scale context: how many downstream users? What was the business impact of stale data? This would make the outcome stronger",
    suggested: "Quantify impact: '~200 internal users were affected, costing ~3 days of stale reporting per incident.' Then the fix scope becomes self-evidently important.",
  },
  {
    idx: 2,
    q: "What's your understanding of Anthropic's approach to AI safety?",
    a: "Anthropic focuses on interpretability — understanding what's actually happening inside the model — and alignment techniques like Constitutional AI and RLHF. Their RSP sets concrete thresholds before scaling further. What I find differentiated is the emphasis on publishing the research even when it might help competitors, because they believe the field as a whole needs this knowledge to be safe.",
    score: 7.0,
    strengths: "Accurately describes Constitutional AI and RSP, good point about open research philosophy",
    improvements: "Interpretability is one thread but Anthropic's safety work is broader — mention model evals and dangerous capabilities assessments",
    suggested: "Structure as: (1) empirical safety research — interpretability, evals; (2) alignment techniques — RLHF, Constitutional AI; (3) policy — RSP. Demonstrates you see the full picture.",
  },
  {
    idx: 3,
    q: "Where do you see AI heading in the next 5 years, and what worries you most?",
    a: "I think we'll see general-purpose agents become much more capable and more widely deployed in agentic settings — autonomous code execution, web browsing, decision-making. What worries me most is the gap between capability and our ability to audit what these systems are actually doing. We're deploying systems we can't fully explain, at scale, in high-stakes domains. The interpretability research isn't keeping pace with capability growth.",
    score: 6.0,
    strengths: "Identifies a real and relevant concern, shows systems-level thinking",
    improvements: "The answer is generic enough that it could apply to any AI company. Ground it in Anthropic's specific work on evals and why their approach addresses (or struggles with) this gap",
    suggested: "After naming the concern, show you're already thinking about solutions: 'That's part of why Anthropic's mechanistic interpretability work matters to me — sparse autoencoders identifying features in Claude are a concrete step toward the audit capability we need.'",
  },
];

for (const question of q1) {
  // columns: id, session_id, question_number, question_text, answer_transcript,
  //          score, feedback_strengths, feedback_improvements, feedback_suggested_answer,
  //          duration_seconds, created_at
  run(`INSERT OR IGNORE INTO session_questions VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
    `${SESSION_1}-q${question.idx}`, SESSION_1, question.idx + 1,
    question.q, question.a, question.score,
    question.strengths, question.improvements, question.suggested,
    420, '2026-03-10T10:00:00Z',
  ]);
}

console.log('✓ Session 1: Recruiter screen prep (score 7.1)');

// ── Session 2 — Technical Phone Screen prep (completed, score 6.5) ─────────
run(`INSERT OR IGNORE INTO interview_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
  SESSION_2, null, ANTHROPIC_ID, STAGE_TECHNICAL, 'completed',
  'after_each', 5, 'professional', 'hard',
  JSON.stringify(['Python', 'ML fundamentals', 'algorithms', 'transformers']),
  6.5,
  "Decent technical foundation but some gaps in ML depth. Your Python and algorithms answers were solid. The transformer architecture question revealed that your understanding is mostly high-level — you need to go deeper on attention mechanics and training dynamics before the real interview. Prioritize reading the Attention Is All You Need paper and implementing a small transformer from scratch.",
  JSON.stringify([
    'Strong Python idioms — generators, context managers, dataclasses used correctly',
    'Good intuition on time complexity trade-offs for the sliding window problem',
    'Correctly identified the vanishing gradient problem in the RNN comparison',
  ]),
  JSON.stringify([
    'Transformer attention mechanism: couldn\'t explain multi-head attention precisely',
    'Confused RLHF reward model with the policy model — clarify these roles',
    'System design for a training pipeline was too high-level; no mention of data parallelism or gradient checkpointing',
  ]),
  JSON.stringify([
    '"Attention Is All You Need" — Vaswani et al. (2017), read sections 3-4 carefully',
    'Andrej Karpathy\'s "Let\'s build GPT from scratch" (YouTube) — implement attention end-to-end',
    'Lilian Weng\'s "RLHF blog post" — clearest explanation of reward model vs. policy',
  ]),
  '2026-03-13T14:00:00Z', '2026-03-13T15:05:00Z',
  '2026-03-13T14:00:00Z',
]);

const q2 = [
  {
    idx: 0,
    q: "Write a Python function that finds all pairs in an array that sum to a target value. What's the time complexity?",
    a: "I'd use a set to track complements. Iterate through the array, check if the current element exists in the seen set, if yes record the pair, otherwise add the complement. This gives O(n) time and O(n) space. Edge cases: duplicates need a check so we don't pair an element with itself unless it appears twice.",
    score: 8.2,
    strengths: "Correct O(n) solution, immediately identified the space-time trade-off, called out the duplicate edge case unprompted",
    improvements: "Could show the actual code rather than just describing it; mention that the naive O(n²) approach exists for comparison",
    suggested: "Always write the code first, then explain complexity. Showing the implementation demonstrates fluency beyond just knowing the algorithm.",
  },
  {
    idx: 1,
    q: "Explain how the attention mechanism works in transformer models.",
    a: "Attention allows each token to look at all other tokens in the sequence to compute its representation. You have queries, keys, and values — the dot product of a query with all keys gives attention scores, which are softmaxed and used to weight the values. Multi-head attention runs this in parallel with different learned projections.",
    score: 6.0,
    strengths: "Correct high-level description of Q/K/V and softmax weighting",
    improvements: "Missing: the 1/√d_k scaling factor and why it matters (prevents softmax saturation); didn't explain what multi-head attention actually learns differently in each head; no mention of causal masking for decoder models",
    suggested: "After the basic mechanism, add: 'The scores are scaled by 1/√d_k to keep gradients stable as dimension grows. Each head learns different relationship patterns — some heads attend to syntax, others to semantics. In decoder-only models like Claude, a causal mask prevents attending to future tokens.'",
  },
  {
    idx: 2,
    q: "What is RLHF and how does it improve language model outputs?",
    a: "RLHF stands for Reinforcement Learning from Human Feedback. You train a reward model on human preference pairs — which of two outputs is better — and then use PPO to fine-tune the language model to maximize that reward. It helps the model produce outputs that humans rate as more helpful and less harmful.",
    score: 6.5,
    strengths: "Correct definition, correctly named PPO, understands the preference pair setup",
    improvements: "Confused the reward model's role slightly — it scores individual outputs, it's not trained on 'which is better' directly but on a margin loss over pairs. Also didn't mention the KL penalty to prevent reward hacking",
    suggested: "Add: 'A KL divergence penalty against the original model prevents the policy from gaming the reward model by drifting too far — this is critical for stability.' Show you know the failure modes, not just the happy path.",
  },
  {
    idx: 3,
    q: "How would you design a system to serve a large language model at scale with low latency?",
    a: "I'd use a model serving framework like TensorRT or vLLM for the inference engine. For scaling, I'd put a load balancer in front of multiple GPU instances. Cache common prompts with a KV cache. Use async batching to pack requests and maximize GPU utilization.",
    score: 5.5,
    strengths: "Named vLLM (relevant), mentioned async batching which is key",
    improvements: "Too high-level — no mention of continuous batching vs. static batching trade-offs, no discussion of quantization (INT8/INT4), no mention of tensor parallelism for large models, nothing about SLOs or p99 latency targets",
    suggested: "Structure as: (1) inference engine — vLLM with continuous batching, (2) model optimization — quantization and tensor parallelism for multi-GPU, (3) routing — request prioritization and SLO-aware scheduling, (4) observability — token throughput and p99 TTFT/ITL metrics.",
  },
  {
    idx: 4,
    q: "Describe a situation where you had to learn something complex quickly. How did you approach it?",
    a: "When my team decided to migrate from a monolith to microservices, I had two weeks to become the team's expert on Kubernetes before we started. I blocked my calendar, found the best book on the topic, built a small cluster on my laptop, and made mistakes in a safe environment. By the end of the first week I was the one answering questions in Slack.",
    score: 6.8,
    strengths: "Concrete timeline, shows learning by doing, demonstrates teaching others as a signal of mastery",
    improvements: "Lacks specifics on what 'mistakes' you made and what you learned from them — that's where the real insight is",
    suggested: "Name one specific mistake and what it taught you: 'I misconfigured pod resource limits and took down the cluster — that forced me to really understand QoS classes and eviction behavior, which turned out to be exactly what I needed for production.'",
  },
];

for (const question of q2) {
  run(`INSERT OR IGNORE INTO session_questions VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
    `${SESSION_2}-q${question.idx}`, SESSION_2, question.idx + 1,
    question.q, question.a, question.score,
    question.strengths, question.improvements, question.suggested,
    480, '2026-03-13T14:00:00Z',
  ]);
}

console.log('✓ Session 2: Technical phone screen prep (score 6.5)');

// ── Session 3 — Technical Screen (round 2, improved, score 7.8) ───────────
run(`INSERT OR IGNORE INTO interview_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
  SESSION_3, null, ANTHROPIC_ID, STAGE_TECHNICAL, 'completed',
  'after_each', 5, 'professional', 'hard',
  JSON.stringify(['transformers', 'ML systems', 'Python', 'algorithms']),
  7.8,
  "Significant improvement over the previous session. Your transformer knowledge is now solid — the attention scaling explanation was particularly strong. The system design answer showed clear depth on ML-specific infrastructure. The main remaining gap is in theoretical ML: brush up on bias-variance trade-off, regularization techniques, and gradient flow through deep networks before the real interview.",
  JSON.stringify([
    'Multi-head attention explanation was accurate and included the scaling factor',
    'System design answer covered continuous batching, quantization, and tensor parallelism',
    'RLHF answer correctly described the KL penalty and reward hacking prevention',
    'Python async/await question handled with confidence',
  ]),
  JSON.stringify([
    'Bias-variance trade-off not explained precisely enough',
    'Didn\'t mention layer normalization when discussing transformer stability',
    'Complexity analysis for the graph question was slightly off — revisit BFS/DFS trade-offs',
  ]),
  JSON.stringify([
    '"Deep Learning" — Goodfellow et al., Chapter 7 (regularization) and Chapter 8 (optimization)',
    'Jay Alammar\'s "The Illustrated Transformer" — best visual explanation of layer norm placement',
  ]),
  '2026-03-17T10:00:00Z', '2026-03-17T11:10:00Z',
  '2026-03-17T10:00:00Z',
]);

const q3 = [
  {
    idx: 0,
    q: "Explain multi-head attention and why multiple heads are used instead of just one.",
    a: "Each attention head learns to focus on different types of relationships in the sequence. One head might specialize in syntactic relationships — subject-verb agreement — while another tracks long-range semantic dependencies. Single-head attention collapses all of this into one representation and loses that diversity. The heads run in parallel with different learned Q/K/V projection matrices, so the cost is manageable. The outputs are concatenated and projected back down. The 1/√d_k scaling prevents the dot products from growing so large that softmax saturates and gradients vanish.",
    score: 8.5,
    strengths: "Excellent — covered the specialization rationale, the scaling factor and why it matters, correct description of concat-then-project",
    improvements: "Could mention that the number of heads is a hyperparameter (8 in the original paper) and that d_k = d_model / num_heads, showing you understand the dimensional accounting",
    suggested: "A strong follow-up signal: mention that interpretability research (like Anthropic's own work) has found that individual attention heads are interpretable circuits — e.g. induction heads that implement in-context copying.",
  },
  {
    idx: 1,
    q: "You have a list of log entries with timestamps and user IDs. Find the user with the longest consecutive active streak (active = at least one log entry per day).",
    a: "Group log entries by user, then for each user extract the set of unique dates. Sort the dates and scan for consecutive days — increment a counter when the next date is exactly one day after the previous, reset otherwise. Track the max. Time complexity O(n log n) for the sort, O(n) for the scan. Space O(n) for the grouping.",
    score: 8.0,
    strengths: "Correct approach, right complexity analysis, clean O(n log n) reasoning",
    improvements: "Didn't handle timezone edge cases — if logs come from users in different timezones, 'same day' is ambiguous. A senior candidate would flag this",
    suggested: "Always ask clarifying questions about ambiguous inputs: 'Are timestamps in UTC or local time? Does a streak break if a user logs in at 11:59pm and 12:01am on consecutive calendar days?'",
  },
  {
    idx: 2,
    q: "How would you now design that LLM serving system — what would you do differently from a traditional web service?",
    a: "The key difference is that LLM inference is stateful and variable-length in a way web requests aren't. I'd use continuous batching — rather than waiting for a fixed batch, new requests join the running batch as slots open when sequences complete. For large models I'd use tensor parallelism across GPUs, and for memory I'd use paged attention (what vLLM does) to handle the KV cache without fragmentation. I'd also apply INT8 or INT4 quantization on weights. SLOs would be defined in terms of time-to-first-token and inter-token latency separately, since users perceive these very differently.",
    score: 8.2,
    strengths: "Strong — continuous batching, paged attention, tensor parallelism, quantization, and TTFT/ITL distinction all correctly described",
    improvements: "Could mention speculative decoding as a latency optimization for high-priority requests",
    suggested: "Add speculative decoding: 'For latency-sensitive requests, speculative decoding with a smaller draft model can reduce ITL by 2-3x with no quality loss, at the cost of some throughput.'",
  },
  {
    idx: 3,
    q: "Explain the bias-variance trade-off in the context of a neural network.",
    a: "Bias is error from wrong assumptions in the model — high bias means underfitting. Variance is sensitivity to fluctuations in training data — high variance means overfitting. In neural networks, a larger model has lower bias but higher variance. Regularization techniques like dropout and weight decay help reduce variance.",
    score: 6.5,
    strengths: "Correct basic definitions, named relevant regularization techniques",
    improvements: "Didn't explain why large models can sometimes escape the bias-variance trade-off (double descent, benign overfitting) — this is directly relevant to modern LLMs and Anthropic would expect awareness of it",
    suggested: "Add: 'Interestingly, very large overparameterized models can re-enter a low-variance regime — the double descent phenomenon. Modern LLMs operate well past the classical interpolation threshold, which is part of why scaling laws don't show the variance blow-up classical theory predicts.'",
  },
  {
    idx: 4,
    q: "What's a recent development in AI that you find technically interesting and why?",
    a: "I've been following Anthropic's mechanistic interpretability work — specifically the sparse autoencoder approach for identifying monosemantic features inside Claude. The idea that you can decompose a superposition of features into interpretable directions and find things like 'the Inner Conflict token' is genuinely exciting. It suggests we might eventually be able to audit what a model is 'thinking' before it acts — which matters enormously for safety.",
    score: 8.8,
    strengths: "Excellent choice for an Anthropic interview — directly relevant, shows you've read the research, correctly describes the SAE approach and its safety implications",
    improvements: "Very strong answer. Only nitpick: briefly acknowledge the current limitations — SAEs capture structure but whether the features are 'real' cognitive units is still an open question",
    suggested: "Already excellent. Adding one sentence of epistemic humility ('though the field is still debating whether these features correspond to meaningful computational units or are post-hoc artifacts') would make it perfect.",
  },
];

for (const question of q3) {
  run(`INSERT OR IGNORE INTO session_questions VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
    `${SESSION_3}-q${question.idx}`, SESSION_3, question.idx + 1,
    question.q, question.a, question.score,
    question.strengths, question.improvements, question.suggested,
    500, '2026-03-17T10:00:00Z',
  ]);
}

console.log('✓ Session 3: Technical screen round 2 (score 7.8)');

// ── Session 4 — System Design prep (in_progress) ──────────────────────────
run(`INSERT OR IGNORE INTO interview_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
  SESSION_4, null, ANTHROPIC_ID, STAGE_SYSDESIGN, 'in_progress',
  'after_each', 5, 'professional', 'hard',
  JSON.stringify(['distributed systems', 'ML infrastructure', 'LLM serving']),
  null,
  null, '[]', '[]', '[]',
  '2026-03-22T09:00:00Z', null,
  '2026-03-22T09:00:00Z',
]);

// Add 2 answered questions to show partial progress
run(`INSERT OR IGNORE INTO session_questions VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
  `${SESSION_4}-q0`, SESSION_4, 1,
  "Design a system that can fine-tune a 70B parameter language model on customer data without exposing that data to other customers.",
  "I'd use a federated or isolated training approach. Each customer gets their own training job in an isolated compute environment — separate GPU cluster or at minimum separate Kubernetes namespace with strict network policies. The base model weights are shared (read-only), but the LoRA adapter weights trained on customer data are stored in customer-isolated object storage. The training pipeline runs in a VPC with no egress except to the customer's own data source. For orchestration I'd use something like Argo Workflows with per-customer service accounts.",
  null, null, null, null, 480, '2026-03-22T09:00:00Z',
]);

run(`INSERT OR IGNORE INTO session_questions VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
  `${SESSION_4}-q1`, SESSION_4, 2,
  "How would you handle a situation where one customer's fine-tuned model starts producing harmful outputs at inference time?",
  "I'd want multiple layers. First, a content filter at the inference layer that's evaluated before the response is returned — ideally using a separate classification model rather than the fine-tuned one itself, since you can't trust the model to self-report its own harmful outputs. Second, rate limiting and anomaly detection on inference patterns — a sudden spike in certain query types could be an early signal. Third, the ability to instantly roll back to the base model checkpoint for that customer while we investigate. Audit logging of all inputs and outputs with a retention policy so we can analyze what went wrong.",
  null, null, null, null, 510, '2026-03-22T09:10:00Z',
]);

console.log('✓ Session 4: System design (in_progress, 2 questions answered)');
console.log('\nDone. Run `npm run dev` to see Anthropic simulator data.');

db.close();
