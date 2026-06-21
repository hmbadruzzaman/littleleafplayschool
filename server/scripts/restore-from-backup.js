#!/usr/bin/env node
/**
 * restore-from-backup.js
 *
 * List and restore Little Leaf DynamoDB tables from AWS Backup recovery points.
 * Always runs against real AWS — never local mode.
 *
 * Usage:
 *   node scripts/restore-from-backup.js list
 *   node scripts/restore-from-backup.js restore <Table> [--to <NewName>] [--arn <rpArn>]
 *   node scripts/restore-from-backup.js restore-all [--suffix _restored]
 *
 * <Table> accepts the short key ("Students") or the full name ("LittleLeaf_Students").
 *
 * Options:
 *   --vault <name>   Backup vault to read       (default: $BACKUP_VAULT or "Default")
 *   --role  <arn>    IAM role AWS Backup assumes (default: $BACKUP_ROLE_ARN or the
 *                    account's service-role/AWSBackupDefaultServiceRole)
 *   --to    <name>   Restore a single table under a different name
 *   --suffix <s>     (restore-all) append to each restored table name
 *   --arn   <arn>    Restore a specific recovery point instead of the latest
 *   --no-wait        Start the job(s) without polling for completion
 *   --yes            Skip the confirmation prompt
 *   --region <r>     Override AWS region
 *
 * Notes:
 *   - DynamoDB restores ALWAYS create a NEW table; this script refuses to restore
 *     onto a name that already exists. To recover a deleted table to its original
 *     name, just restore once the old one is gone.
 *   - Run `list` first — it is read-only and confirms your creds/region/vault.
 */

require('dotenv').config();

if (process.env.USE_LOCAL_DB === 'true') {
    console.error('✗ USE_LOCAL_DB is true. Restore runs against real AWS — unset it and provide AWS credentials.');
    process.exit(1);
}

const readline = require('readline');
const AWS = require('aws-sdk');
const { TABLES } = require('../config/dynamodb');

// ---- arg parsing -------------------------------------------------------
const argv = process.argv.slice(2);
const command = argv[0];
const opts = {};
const positionals = [];
for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) { opts[key] = next; i++; }
        else { opts[key] = true; }
    } else {
        positionals.push(a);
    }
}

const REGION = opts.region || process.env.AWS_REGION || 'us-east-1';
AWS.config.update({
    region: REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const backup = new AWS.Backup();
const dynamodb = new AWS.DynamoDB();
const sts = new AWS.STS();

const VAULT = opts.vault || process.env.BACKUP_VAULT || 'Default';
const ALL_TABLES = Object.values(TABLES);

// ---- helpers -----------------------------------------------------------

// Resolve a user token ("Students" / "LittleLeaf_Students") to a full name.
function resolveTableName(token) {
    if (!token) return null;
    if (ALL_TABLES.includes(token)) return token;
    const prefixed = `LittleLeaf_${token}`;
    if (ALL_TABLES.includes(prefixed)) return prefixed;
    const hit = ALL_TABLES.find(t =>
        t.toLowerCase() === token.toLowerCase() ||
        t.toLowerCase() === prefixed.toLowerCase());
    return hit || token; // fall back to the raw token (non-standard table)
}

function tableFromResourceArn(arn) {
    const marker = ':table/';
    const idx = arn.indexOf(marker);
    return idx >= 0 ? arn.slice(idx + marker.length) : arn;
}

async function getAccountId() {
    const { Account } = await sts.getCallerIdentity().promise();
    return Account;
}

async function resolveRoleArn() {
    if (opts.role) return opts.role;
    if (process.env.BACKUP_ROLE_ARN) return process.env.BACKUP_ROLE_ARN;
    const acct = await getAccountId();
    return `arn:aws:iam::${acct}:role/service-role/AWSBackupDefaultServiceRole`;
}

// Every DynamoDB recovery point in the vault, newest first.
async function listRecoveryPoints() {
    const points = [];
    let token;
    do {
        const res = await backup.listRecoveryPointsByBackupVault({
            BackupVaultName: VAULT,
            MaxResults: 1000,
            NextToken: token,
        }).promise();
        for (const rp of res.RecoveryPoints || []) {
            if (rp.ResourceType !== 'DynamoDB') continue;
            points.push({
                table: tableFromResourceArn(rp.ResourceArn),
                arn: rp.RecoveryPointArn,
                created: rp.CreationDate,
                status: rp.Status,
            });
        }
        token = res.NextToken;
    } while (token);
    points.sort((a, b) => new Date(b.created) - new Date(a.created));
    return points;
}

// table name -> newest recovery point (points are already newest-first).
function latestByTable(points) {
    const map = new Map();
    for (const p of points) if (!map.has(p.table)) map.set(p.table, p);
    return map;
}

async function tableExists(name) {
    try {
        await dynamodb.describeTable({ TableName: name }).promise();
        return true;
    } catch (e) {
        if (e.code === 'ResourceNotFoundException') return false;
        throw e;
    }
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

// Build restore metadata from the recovery point's own template, overriding only
// the target table name. Preserving the template keeps any backup-specific keys
// (encryption, billing mode, indexes) intact across standard/advanced backups.
async function buildMetadata(recoveryPointArn, targetTableName) {
    const res = await backup.getRecoveryPointRestoreMetadata({
        BackupVaultName: VAULT,
        RecoveryPointArn: recoveryPointArn,
    }).promise();
    const meta = { ...(res.RestoreMetadata || {}) };
    const key = Object.keys(meta).find(k => /target.?table.?name/i.test(k));
    if (key) meta[key] = targetTableName;
    else meta.targetTableName = targetTableName;
    return meta;
}

async function startRestore(recoveryPointArn, targetTableName, roleArn) {
    const Metadata = await buildMetadata(recoveryPointArn, targetTableName);
    const res = await backup.startRestoreJob({
        RecoveryPointArn: recoveryPointArn,
        Metadata,
        IamRoleArn: roleArn,
        ResourceType: 'DynamoDB',
    }).promise();
    return res.RestoreJobId;
}

async function waitForRestore(jobId) {
    for (;;) {
        const res = await backup.describeRestoreJob({ RestoreJobId: jobId }).promise();
        const s = res.Status;
        if (s === 'COMPLETED') { console.log(`   ✓ completed (${res.CreatedResourceArn || ''})`); return res; }
        if (s === 'ABORTED' || s === 'FAILED') { console.log(`   ✗ ${s}: ${res.StatusMessage || ''}`); return res; }
        await new Promise(r => setTimeout(r, 10000));
    }
}

async function confirm(message) {
    if (opts.yes) return true;
    const ans = await ask(`${message} (y/N) `);
    return /^y(es)?$/i.test(ans.trim());
}

// ---- commands ----------------------------------------------------------

async function cmdList() {
    const points = await listRecoveryPoints();
    if (points.length === 0) {
        console.log(`No DynamoDB recovery points found in vault "${VAULT}" (region ${REGION}).`);
        return;
    }
    console.log(`Recovery points in vault "${VAULT}" (region ${REGION}):\n`);
    const latest = latestByTable(points);
    const byTable = {};
    for (const p of points) (byTable[p.table] = byTable[p.table] || []).push(p);
    for (const table of Object.keys(byTable).sort()) {
        console.log(table);
        for (const p of byTable[table]) {
            const tag = latest.get(table).arn === p.arn ? '   (latest)' : '';
            console.log(`   ${new Date(p.created).toISOString()}  ${p.status}${tag}`);
            console.log(`      ${p.arn}`);
        }
        console.log('');
    }
}

async function cmdRestore() {
    const token = positionals[0];
    if (!token) {
        console.error('Usage: restore <Table> [--to <NewName>] [--arn <recoveryPointArn>]');
        process.exit(1);
    }
    const source = resolveTableName(token);
    const target = opts.to || source;

    const points = await listRecoveryPoints();
    const rp = opts.arn ? points.find(p => p.arn === opts.arn) : latestByTable(points).get(source);
    if (!rp) {
        console.error(`✗ No recovery point found for ${source} in vault "${VAULT}".`);
        process.exit(1);
    }
    if (await tableExists(target)) {
        console.error(`✗ Target table "${target}" already exists. Restore creates a NEW table — `
            + `use --to <name> to restore alongside it, or delete the existing table first.`);
        process.exit(1);
    }

    const roleArn = await resolveRoleArn();
    console.log('Restore plan:');
    console.log(`   source table   : ${source}`);
    console.log(`   recovery point : ${new Date(rp.created).toISOString()}`);
    console.log(`   new table name : ${target}`);
    console.log(`   role           : ${roleArn}\n`);
    if (!(await confirm('Proceed?'))) { console.log('Aborted.'); return; }

    const jobId = await startRestore(rp.arn, target, roleArn);
    console.log(`Started restore job: ${jobId}`);
    if (!opts['no-wait']) await waitForRestore(jobId);
}

async function cmdRestoreAll() {
    const suffix = typeof opts.suffix === 'string' ? opts.suffix : '';
    const points = await listRecoveryPoints();
    const latest = latestByTable(points);

    const plan = [];
    for (const source of ALL_TABLES) {
        const rp = latest.get(source);
        const target = `${source}${suffix}`;
        if (!rp) { plan.push({ source, target, skip: 'no recovery point' }); continue; }
        if (await tableExists(target)) { plan.push({ source, target, rp, skip: 'target exists' }); continue; }
        plan.push({ source, target, rp });
    }

    console.log(`Restore-all from vault "${VAULT}" (region ${REGION}):\n`);
    for (const p of plan) {
        const when = p.rp ? new Date(p.rp.created).toISOString() : '—';
        console.log(`   ${p.source}  →  ${p.target}   [${when}]${p.skip ? '   SKIP: ' + p.skip : ''}`);
    }
    const doable = plan.filter(p => !p.skip);
    if (doable.length === 0) { console.log('\nNothing to restore.'); return; }

    console.log('');
    if (!(await confirm(`Restore ${doable.length} table(s)?`))) { console.log('Aborted.'); return; }

    const roleArn = await resolveRoleArn();
    const jobs = [];
    for (const p of doable) {
        const jobId = await startRestore(p.rp.arn, p.target, roleArn);
        console.log(`   ${p.target}: job ${jobId}`);
        jobs.push({ target: p.target, jobId });
    }
    if (!opts['no-wait']) {
        console.log('\nWaiting for completion…');
        for (const j of jobs) { console.log(`   ${j.target}`); await waitForRestore(j.jobId); }
    }
}

async function main() {
    try {
        if (command === 'list') await cmdList();
        else if (command === 'restore') await cmdRestore();
        else if (command === 'restore-all') await cmdRestoreAll();
        else {
            console.log('Little Leaf — DynamoDB restore from AWS Backup\n');
            console.log('Usage:');
            console.log('  node scripts/restore-from-backup.js list');
            console.log('  node scripts/restore-from-backup.js restore <Table> [--to <NewName>] [--arn <rpArn>]');
            console.log('  node scripts/restore-from-backup.js restore-all [--suffix _restored]');
            console.log('\nOptions: --vault, --role, --region, --no-wait, --yes');
            console.log('<Table> accepts "Students" or "LittleLeaf_Students".');
            process.exit(command ? 1 : 0);
        }
    } catch (err) {
        console.error(`\n✗ ${err.code || 'Error'}: ${err.message}`);
        process.exit(1);
    }
}

main();
