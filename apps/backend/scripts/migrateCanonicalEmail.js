/**
 * Backfills `canonicalEmail` and creates the unique index that enforces
 * "one person, one account".
 *
 * Order matters. A unique index treats every document that lacks the field as
 * null, so with three users all missing `canonicalEmail` MongoDB refuses to
 * build the index at all (E11000). The backfill has to happen first.
 *
 * Run with:  npm run migrate:email
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import User from '../src/modules/auth/user.model.js';
import Subscriber from '../src/modules/newsletter/subscriber.model.js';
import { normalizeEmail, toCanonicalEmail, isValidEmailFormat } from '../src/utils/emailValidation.js';

await mongoose.connect(env.mongoUri);

async function backfill(label, Model) {
    const docs = await Model.find({});
    let changed = 0;
    const bad = [];
    const seen = new Map();

    for (const doc of docs) {
        const email = normalizeEmail(doc.email);
        const canonical = toCanonicalEmail(email);

        // Two rows that collapse onto one canonical value are a genuine
        // clash. We cannot merge them automatically — that is a decision for
        // a human — so we report instead of silently deleting an account.
        if (seen.has(canonical) && seen.get(canonical) !== String(doc._id)) {
            bad.push({
                clash: canonical,
                kept: seen.get(canonical),
                other: String(doc._id),
                emails: [email, normalizeEmail(doc.email)],
            });
        }
        seen.set(canonical, String(doc._id));

        if (doc.email !== email || doc.canonicalEmail !== canonical) {
            doc.email = email;
            doc.canonicalEmail = canonical;
            await doc.save({ validateBeforeSave: false });
            changed += 1;
        }
        if (!isValidEmailFormat(email)) {
            bad.push({ invalid: email, id: String(doc._id) });
        }
    }

    console.log(`\n${label}: ${docs.length} row(s), ${changed} updated`);
    if (bad.length) {
        console.log('  needs a human decision:');
        bad.forEach((b) => console.log('   ', JSON.stringify(b)));
    } else {
        console.log('  no clashes, no malformed addresses');
    }
    return bad.length === 0;
}

const usersClean = await backfill('users', User);
const subsClean = await backfill('subscribers', Subscriber);

if (!usersClean || !subsClean) {
    console.log('\nNot building the indexes — resolve the clashes above first.');
    await mongoose.disconnect();
    process.exit(1);
}

for (const [label, Model] of [['users', User], ['subscribers', Subscriber]]) {
    await Model.syncIndexes();
    const idx = await Model.collection.indexes();
    const emailIdx = idx.find((i) => i.key.email === 1);
    const canonicalIdx = idx.find((i) => i.key.canonicalEmail === 1);
    console.log(
        `${label}: email unique=${!!emailIdx?.unique}  canonicalEmail unique=${!!canonicalIdx?.unique}`,
    );
}

console.log('\nDone. canonicalEmail is populated and unique on both collections.');
await mongoose.disconnect();