const mongoose = require('mongoose');

/**
 * ─── CMS MODEL (CMS Page Schema) ────────────────────────
 * Stores static content: pages, FAQs, blog posts, etc.
 */

const cmsPageSchema = new mongoose.Schema(
  {
    // Content type
    type: {
      type: String,
      enum: ['page', 'faq', 'blog', 'hero'],
      required: true,
    },
    // Basic info
    title: {
      type: String,
      required: true,
      default: 'Hero Banner',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    // Content
    content: {
      type: String,
      default: '',
    },
    // For Hero Banners
    imageUrl: String,
    publicId: String,
    subTitle: String,
    // For FAQs
    answer: String,
    category: String,
    order: Number,
    // For blog posts
    excerpt: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [String],
    coverImage: String,
    // Status
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
cmsPageSchema.index({ type: 1, isPublished: 1 });
cmsPageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CMSPage', cmsPageSchema);
