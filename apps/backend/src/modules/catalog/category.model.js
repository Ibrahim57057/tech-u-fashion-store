import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
    },
    { timestamps: true, toJSON: { virtuals: true } },
);

const Category = mongoose.model('Category', categorySchema);
export default Category;