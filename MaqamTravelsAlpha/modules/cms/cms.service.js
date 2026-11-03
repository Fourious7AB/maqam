const CMSPage = require('./cms.model');
const logger = require('../../utils/logger');
const cloudinaryService = require('../../services/cloudinary.service');
const { AppError } = require('../../middleware/errorHandler');

/**
 * ─── CMS SERVICE ───────────────────────────────────────
 * Business logic: manage static content
 */

const getPageBySlug = async (slug) => {
  try {
    return await CMSPage.findOne({ slug, isPublished: true });
  } catch (error) {
    logger.error(`Get page failed: ${error.message}`);
    throw error;
  }
};

const getFAQs = async ({ category, page = 1, limit = 10 }) => {
  try {
    const query = { type: 'faq', isPublished: true };
    if (category) query.category = category;
    
    const skip = (page - 1) * limit;
    const faqs = await CMSPage.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ order: 1 });
    
    const total = await CMSPage.countDocuments(query);
    
    return {
      faqs,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error(`Get FAQs failed: ${error.message}`);
    throw error;
  }
};

const listBlogPosts = async ({ page = 1, limit = 10 }) => {
  try {
    const skip = (page - 1) * limit;
    const posts = await CMSPage.find({ type: 'blog', isPublished: true })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await CMSPage.countDocuments({ type: 'blog', isPublished: true });
    
    return {
      posts,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error(`List blog posts failed: ${error.message}`);
    throw error;
  }
};

const getBlogPostBySlug = async (slug) => {
  try {
    return await CMSPage.findOne({ slug, type: 'blog', isPublished: true });
  } catch (error) {
    logger.error(`Get blog post failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get current active hero banner picture for frontend
 */
const getHeroPic = async () => {
  try {
    const hero = await CMSPage.findOne({ type: 'hero', slug: 'main-hero-banner' });  
    return hero;
  } catch (error) {
    logger.error(`Get hero picture failed: ${error.message}`);
    throw error;
  }
};

/**
 * Change or update hero banner picture (Admin only)
 * Accepts a file buffer (from Multer memoryStorage) or direct imageUrl.
 * Automatically removes the replaced image from Cloudinary to prevent orphaned files.
 */
const changeHeroPic = async ({ file, imageUrl, title, subTitle, adminId }) => {
  try {
    let finalImageUrl = imageUrl;
    let finalPublicId = null;

    if (file && file.buffer) {
      const uploadResult = await cloudinaryService.uploadBuffer(file.buffer, {
        folder: 'travel-agency/cms/hero',
      });
      finalImageUrl = uploadResult.url;
      finalPublicId = uploadResult.publicId;
    }

    if (!finalImageUrl) {
      throw new AppError('Please provide an image file or imageUrl', 400);
    }

    // Check for existing hero banner to clean up old Cloudinary asset
    const existingHero = await CMSPage.findOne({ type: 'hero', slug: 'main-hero-banner' });
    if (existingHero && existingHero.publicId && existingHero.publicId !== finalPublicId) {
      try {
        await cloudinaryService.deleteByPublicId(existingHero.publicId);
      } catch (err) {
        logger.warn(`Failed to delete old hero image from Cloudinary: ${err.message}`);
      }
    }

    const updatedHero = await CMSPage.findOneAndUpdate(
      { type: 'hero', slug: 'main-hero-banner' },
      {
        $set: {
          title: title || existingHero?.title || 'Main Hero Banner',
          subTitle: subTitle || existingHero?.subTitle || '',
          content: '',
          imageUrl: finalImageUrl,
          publicId: finalPublicId || null,
          updatedBy: adminId,
          isPublished: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    logger.info(`Hero banner updated successfully by admin ${adminId || 'system'}`);
    return updatedHero;
  } catch (error) {
    logger.error(`Change hero picture failed: ${error.message}`);
    throw error;
  }
};

/**
 * Edit hero banner properties (title, subTitle, isPublished) or replace image (Admin only)
 */
const editHeroPicture = async ({ file, imageUrl, title, subTitle, isPublished, adminId }) => {
  try {
    const existingHero = await CMSPage.findOne({ type: 'hero', slug: 'main-hero-banner' });
    if (!existingHero) {
      throw new AppError('Hero banner not found. Please create one first', 404);
    }

    let finalImageUrl = existingHero.imageUrl;
    let finalPublicId = existingHero.publicId;

    if (file && file.buffer) {
      const uploadResult = await cloudinaryService.uploadBuffer(file.buffer, {
        folder: 'travel-agency/cms/hero',
      });
      finalImageUrl = uploadResult.url;
      finalPublicId = uploadResult.publicId;

      if (existingHero.publicId && existingHero.publicId !== finalPublicId) {
        try {
          await cloudinaryService.deleteByPublicId(existingHero.publicId);
        } catch (err) {
          logger.warn(`Failed to delete old hero image from Cloudinary: ${err.message}`);
        }
      }
    } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      finalImageUrl = imageUrl.trim();
      if (existingHero.publicId) {
        try {
          await cloudinaryService.deleteByPublicId(existingHero.publicId);
        } catch (err) {
          logger.warn(`Failed to delete old hero image from Cloudinary: ${err.message}`);
        }
      }
      finalPublicId = null;
    }

    const updateFields = {
      updatedBy: adminId,
    };

    if (title !== undefined && title !== null) updateFields.title = title;
    if (subTitle !== undefined && subTitle !== null) updateFields.subTitle = subTitle;
    if (isPublished !== undefined && isPublished !== null) updateFields.isPublished = Boolean(isPublished);
    if (finalImageUrl) updateFields.imageUrl = finalImageUrl;
    updateFields.publicId = finalPublicId || null;

    const updatedHero = await CMSPage.findOneAndUpdate(
      { type: 'hero', slug: 'main-hero-banner' },
      { $set: updateFields },
      { new: true }
    );

    logger.info(`Hero banner edited successfully by admin ${adminId || 'system'}`);
    return updatedHero;
  } catch (error) {
    logger.error(`Edit hero picture failed: ${error.message}`);
    throw error;
  }
};

/**
 * Permanently delete hero banner record and delete asset from Cloudinary (Admin only)
 */
const deleteHeroPicture = async () => {
  try {
    const existingHero = await CMSPage.findOne({ type: 'hero', slug: 'main-hero-banner' });
    if (!existingHero) {
      throw new AppError('Hero banner not found', 404);
    }

    if (existingHero.publicId) {
      try {
        await cloudinaryService.deleteByPublicId(existingHero.publicId);
      } catch (err) {
        logger.warn(`Failed to delete hero image from Cloudinary: ${err.message}`);
      }
    }

    await CMSPage.deleteOne({ type: 'hero', slug: 'main-hero-banner' });
    logger.info('Hero banner deleted successfully');

    return {
      deleted: true,
      herorId: existingHero._id,
    };
  } catch (error) {
    logger.error(`Delete hero picture failed: ${error.message}`);
    throw error;
  }
};

// TODO: Admin methods
// const createPage = async (data) => { ... };
// const updatePage = async (pageId, updates) => { ... };
// const deletePage = async (pageId) => { ... };

module.exports = {
  getPageBySlug,
  getFAQs,
  listBlogPosts,
  getBlogPostBySlug,
  getHeroPic,
  changeHeroPic,
  editHeroPicture,
  deleteHeroPicture,
};
