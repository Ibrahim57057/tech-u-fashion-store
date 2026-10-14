import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { normalizeEmail, toCanonicalEmail } from '../../utils/emailValidation.js';

// One active refresh session. Only the SHA-256 of the cookie value is stored,
// so a database dump cannot be replayed as a login.
const refreshTokenSchema = new mongoose.Schema(
    {
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true, _id: false },
);

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // The same mailbox written differently: john.doe@gmail.com,
        // johndoe@gmail.com and johndoe+shop@gmail.com all land here as
        // johndoe@gmail.com. The unique index on this field is what actually
        // stops two people sharing one Gmail account — `unique` on `email`
        // alone would happily let all three through.
        canonicalEmail: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        phone: { type: String, required: true, trim: true },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false, // never returned in queries unless explicitly asked for
        },
        role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },

        // Suspended accounts. Set instead of deleting the row, because every
        // past order references this user: a hard delete would leave
        // Order.user pointing at nothing and quietly rewrite the customer's
        // order history as orphaned documents.
        //
        // `false` means no login and no use of an existing session. `undefined`
        // (a document saved before this field existed) is treated as active, so
        // adding this does not lock anyone out on deploy.
        isActive: { type: Boolean, default: true },

        // Bumped on logout so every cookie issued before it stops being
        // accepted (see middleware/auth.js). JWTs are stateless, so without
        // this a logout only clears the browser's copy — a stolen cookie would
        // keep working for its full 30 days.
        tokenVersion: { type: Number, default: 0, select: false },

        // Failed sign-in tracking. After MAX_LOGIN_ATTEMPTS the account is
        // locked for a cooling-off window, which the per-IP limiter alone
        // cannot do: an attacker with a pool of addresses is not slowed by it.
        failedLoginAttempts: { type: Number, default: 0, select: false },
        lockUntil: { type: Date, select: false },

        // --- Password reset ------------------------------------------------
        // Only the SHA-256 of the token is stored, never the token itself.
        // A leaked database dump must not be enough to take over accounts:
        // the raw token exists only in the link we emailed.
        //
        // select: false so it cannot come back on an ordinary query and land
        // in a response body by accident.
        passwordResetToken: { type: String, select: false },
        passwordResetExpires: { type: Date, select: false },

        // When the password last changed, in milliseconds.
        //
        // Sessions are stateless JWTs, so changing a password does not by
        // itself invalidate anything — a token minted before the reset keeps
        // working until it expires (30 days here). This timestamp is what
        // makes `protect` able to reject those, which matters most for the
        // reset flow: proving you own the mailbox should end the other
        // person's session too.
        //
        // Not set on registration, because there is no earlier session to
        // invalidate and undefined is treated as "always valid".
        passwordChangedAt: { type: Date },

        // --- Email confirmation --------------------------------------------
        // False until the address is confirmed from the emailed link. Existing
        // rows have no field at all; treat undefined as unverified so the
        // account page still nags until they confirm.
        isEmailVerified: { type: Boolean, default: false },
        emailVerificationToken: { type: String, select: false },
        emailVerificationExpires: { type: Date, select: false },

        // A requested email change, held until the NEW address confirms it.
        // The current email stays the login identifier until then, so a
        // mistyped change can never lock anyone out.
        pendingEmail: { type: String, lowercase: true, trim: true },
        pendingEmailToken: { type: String, select: false },
        pendingEmailExpires: { type: Date, select: false },

        // --- Two-factor authentication -------------------------------------
        twoFactorEnabled: { type: Boolean, default: false },
        twoFactorSecret: { type: String, select: false },
        // SHA-256 of each single-use recovery code. Plaintext exists only in
        // the one response that generates them.
        twoFactorRecoveryCodes: { type: [String], select: false, default: undefined },

        // --- Refresh sessions ----------------------------------------------
        // Rotated on every refresh. Capped at five so old devices do not
        // accumulate forever.
        refreshTokens: { type: [refreshTokenSchema], select: false, default: [] },
    },
    { timestamps: true },
);

// Keep the canonical form in step with the address on every save.
userSchema.pre('validate', function () {
    if (this.isModified('email') || !this.canonicalEmail) {
        this.email = normalizeEmail(this.email);
        this.canonicalEmail = toCanonicalEmail(this.email);
    }
});

// Hash the password automatically before saving — but only if it was
// actually changed, so updating a user's name doesn't re-hash an
// already-hashed password (which would break login entirely).
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);

    // Minus a second: JWT `iat` has whole-second resolution, so a token
    // issued in the same second as this change has to still count as issued
    // after it. Without the fudge the token we hand back from a password
    // reset would be rejected by `protect` on its very first request.
    //
    // Skipped for a brand-new document — there is no earlier session to
    // invalidate, and registration never had one.
    if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

// Instance method — available on any user document fetched from the
// database, e.g. `user.comparePassword('typedPassword')`.
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;