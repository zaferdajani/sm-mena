/** Validate only the implementation-plan structure. Never claims application CI passed. */
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../docs/upgrades/collaboration-v2/', import.meta.url);
const required = ['README.md', 'RESEARCH.md', 'PRODUCT.md', 'ARCHITECTURE.md', 'ACCEPTANCE.md', 'DEPLOYMENT.md', 'backlog.json', 'CLAUDE_HANDOFF.txt', 'release-evidence.template.json'];

export function validatePlan(plan, acceptanceText) {
  assert.equal(plan.schema_version, 1, 'Unsupported plan schema');
  assert.equal(plan.package_kind, 'implementation_plan_not_product_implementation');
  assert.equal(plan.repository, 'zaferdajani/sm-mena');
  assert.equal(plan.branch, 'plan/collaboration-v2-upgrade');
  assert.match(plan.inspected_main_sha, /^[a-f0-9]{40}$/);
  assert.deepEqual(plan.release_order, ['R0', 'R1', 'R2', 'R3']);
  assert.deepEqual(plan.application_checks, ['npm run lint', 'npm run typecheck', 'npm test', 'npm run build', 'npm run e2e']);
  const allowed = new Set(['planned', 'in_progress', 'implemented', 'verified', 'blocked']);
  const headings = [...acceptanceText.matchAll(/^### (AC\d{2})\b/gm)].map((match) => match[1]);
  assert.equal(headings.length, 36, 'Acceptance criteria count changed; review validator and plan together');
  assert.equal(new Set(headings).size, headings.length, 'Duplicate acceptance ID');
  const acceptance = new Set(headings);
  const covered = new Set();
  assert.ok(Array.isArray(plan.tasks) && plan.tasks.length > 0, 'Missing tasks');
  const tasks = new Map();
  for (const task of plan.tasks) {
    assert.match(task.id, /^COL\d{2}$/);
    assert.ok(!tasks.has(task.id), `Duplicate task ${task.id}`);
    tasks.set(task.id, task);
    assert.ok(plan.release_order.includes(task.release), `Unknown release ${task.id}`);
    assert.ok(allowed.has(task.status), `Unknown status ${task.id}`);
    assert.ok(typeof task.title === 'string' && task.title.trim(), `Missing title ${task.id}`);
    assert.ok(typeof task.deliverable === 'string' && task.deliverable.trim(), `Missing deliverable ${task.id}`);
    assert.ok(Array.isArray(task.depends_on), `Missing dependencies ${task.id}`);
    assert.ok(Array.isArray(task.evidence), `Missing evidence list ${task.id}`);
    assert.ok(Array.isArray(task.acceptance_ids) && task.acceptance_ids.length, `Missing acceptance ${task.id}`);
    assert.ok(Array.isArray(task.path_hints) && task.path_hints.length, `Missing source hints ${task.id}`);
    for (const id of task.acceptance_ids) {
      assert.ok(acceptance.has(id), `Unknown acceptance ${id} in ${task.id}`);
      covered.add(id);
    }
    if (task.implementation_commit !== null) assert.match(task.implementation_commit, /^[a-f0-9]{40}$/);
    if (['implemented', 'verified'].includes(task.status)) {
      assert.ok(task.implementation_commit && task.evidence.length > 0, `No implementation evidence for ${task.id}`);
    }
  }
  for (const id of acceptance) assert.ok(covered.has(id), `Unassigned acceptance ${id}`);
  for (const release of plan.release_order) assert.ok(plan.tasks.some((task) => task.release === release), `Empty release ${release}`);
  const active = new Set();
  const visited = new Set();
  function visit(id) {
    assert.ok(!active.has(id), `Dependency cycle at ${id}`);
    if (visited.has(id)) return;
    const task = tasks.get(id);
    assert.ok(task, `Missing dependency ${id}`);
    active.add(id);
    for (const dependencyId of task.depends_on) {
      const dependency = tasks.get(dependencyId);
      assert.ok(dependency, `Missing dependency ${dependencyId}`);
      assert.ok(plan.release_order.indexOf(dependency.release) <= plan.release_order.indexOf(task.release), `Future-release dependency ${id}`);
      if (task.status === 'verified') assert.equal(dependency.status, 'verified', `Unverified dependency for ${id}`);
      visit(dependencyId);
    }
    active.delete(id);
    visited.add(id);
  }
  for (const id of tasks.keys()) visit(id);
  for (const item of ['new_real_money_activation', 'fee_or_founder_economics_changes', 'paid_vendor_signup', 'new_legal_enforceability_claims', 'automatic_commitments_or_renewals', 'bulk_outreach']) {
    assert.ok(plan.hold_items.includes(item), `Missing HOLD boundary ${item}`);
  }
  return { tasks: tasks.size, acceptance: acceptance.size };
}

function selfTest(plan, text) {
  const mutations = [
    (p) => p.tasks.push(structuredClone(p.tasks[0])),
    (p) => { p.tasks[0].depends_on = ['COL99']; },
    (p) => { p.tasks[1].depends_on = [p.tasks[1].id]; },
    (p) => { p.tasks[0].release = 'R9'; },
    (p) => { p.tasks[0].status = 'verified'; },
    (p) => { p.tasks[0].acceptance_ids = ['AC99']; },
    (p) => { p.tasks[0].acceptance_ids = []; },
    (p) => { p.hold_items = []; },
    (p) => { p.application_checks = ['npm run build']; },
    (p) => { p.tasks[0].depends_on = [p.tasks.at(-1).id]; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(plan);
    mutate(changed);
    assert.throws(() => validatePlan(changed, text), 'Invalid plan unexpectedly passed');
  }
  assert.throws(() => validatePlan(plan, text + '\n### AC01 — duplicate\n'));
  return mutations.length + 1;
}

async function main() {
  for (const name of required) await access(new URL(name, root));
  const plan = JSON.parse(await readFile(new URL('backlog.json', root), 'utf8'));
  const text = await readFile(new URL('ACCEPTANCE.md', root), 'utf8');
  const prompt = (await readFile(new URL('CLAUDE_HANDOFF.txt', root), 'utf8')).trim();
  assert.ok(prompt && !prompt.includes('\n'), 'Handoff must be a single paragraph');
  const evidence = JSON.parse(await readFile(new URL('release-evidence.template.json', root), 'utf8'));
  assert.equal(evidence.template, true);
  assert.equal(evidence.status, 'not_run');
  assert.equal(evidence.decision, 'not_verified');
  assert.equal(evidence.deployment.source_sha, null);
  const result = validatePlan(plan, text);
  const tested = process.argv.includes('--self-test') ? selfTest(plan, text) : 0;
  console.log(`PASS: planning package only; ${result.tasks} tasks, ${result.acceptance} acceptance criteria, ${required.length} required files; ${tested} invalid-plan self-tests rejected.`);
  console.log('NOT application lint/typecheck/build/tests, not implemented features, and not production/deployment verification.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Plan validation failed: ${error.message}`); process.exitCode = 1; });
}
