import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { normalizeEmail, toCanonicalEmail } from '../../utils/emailValidation.js';

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
});

// Instance method — available on any user document fetched from the
// database, e.g. `user.comparePassword('typedPassword')`.
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;