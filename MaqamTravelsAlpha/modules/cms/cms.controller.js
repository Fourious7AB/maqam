const cmsService = require('./cms.service');
const { sendSuccess, sendNotFound, sendBadRequest } = require('../../utils/apiResponse');

/**
 * ─── CMS CONTROLLER ────────────────────────────────────
 * Thin layer: calls service, sends response
 */

const getPage = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const page = await cmsService.getPageBySlug(slug);
    if (!page) {
      return sendNotFound(res, 'Page not found');
    }
    
    return sendSuccess(res, { message: 'Page retrieved', data: page });
  } catch (error) {
    next(error);
  }
};

const getFAQs = async (req, res, next) => {
  try {
    const { category, page, limit } = req.query;
    
    const result = await cmsService.getFAQs({ category, page, limit });
    
    return sendSuccess(res, {
      message: 'FAQs retrieved',
      data: result.faqs,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const listBlogPosts = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    
    const result = await cmsService.listBlogPosts({ page, limit });
    
    return sendSuccess(res, {
      message: 'Blog posts retrieved',
      data: result.posts,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getBlogPost = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const post = await cmsService.getBlogPostBySlug(slug);
    if (!post) {
      return sendNotFound(res, 'Blog post not found');
    }
    
    return sendSuccess(res, { message: 'Blog post retrieved', data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Get current frontend hero banner picture
 */
const getHeroPic = async (req, res, next) => {
  try {
    const hero = await cmsService.getHeroPic();
    return sendSuccess(res, {
      message: 'Hero picture retrieved successfully',
      data: hero,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Change frontend hero banner picture
 * Expects multipart/form-data with file field 'heroPic' (or 'image'), or JSON body with 'imageUrl'.
 */
const changeHeroPic = async (req, res, next) => {
  try {
    const file = req.file;
    const { imageUrl, title, subTitle } = req.body;

    if (!file && !imageUrl) {
      return sendBadRequest(res, 'Please provide an image file (heroPic) or an imageUrl');
    }

    const updatedHero = await cmsService.changeHeroPic({
      file,
      imageUrl,
      title,
      subTitle,
      adminId: req.user?._id || req.user?.id,
    });

    return sendSuccess(res, {
      message: 'Hero banner picture updated successfully',
      data: updatedHero,
    });
  } catch (error) {
    next(error);
  }
};

const editHeroPic = async (req, res, next) => {
  try {
    const file = req.file;
    const { imageUrl, title, subTitle, isPublished } = req.body;

    const updatedHero = await cmsService.editHeroPicture({
      file,
      imageUrl,
      title,
      subTitle,
      isPublished,
      adminId: req.user?._id || req.user?.id,
    });

    return sendSuccess(res, {
      message: 'Hero banner updated successfully',
      data: updatedHero,
    });
  } catch (error) {
    next(error);
  }
};

const deleteHeroPic = async (req, res, next) => {
  try {
    const result = await cmsService.deleteHeroPicture();
    return sendSuccess(res, {
      message: 'Hero banner and image deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// TODO: Admin methods for creating/editing pages
// const createPage = async (req, res, next) => { ... };
// const updatePage = async (req, res, next) => { ... };
// const deletePage = async (req, res, next) => { ... };

module.exports = {
  getPage,
  getFAQs,
  listBlogPosts,
  getBlogPost,
  getHeroPic,
  changeHeroPic,
  editHeroPic,
  deleteHeroPic,
};
