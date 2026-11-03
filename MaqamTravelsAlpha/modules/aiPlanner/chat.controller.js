const chatService = require('../../modules/aiPlanner/chat.service');
const {sendSuccess}=require('../../utils/apiResponse')

class ChatController {
  async handleChat(req, res, next) {
    try {
      const { userMessage } = req.body;

      // 1. HTTP Input validation
      if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "A non-empty 'userMessage' string is required."
        });
      }

      // 2. Delegate to Service
      const result = await chatService.searchPackages(userMessage);

      // 3. Return HTTP Response
      const responseMessage =
        result.packages.length > 1
          ? 'Packages are retrieved successfully'
          : result.packages.length === 1
          ? 'Package retrieved successfully'
          : "Package doesn't exist";

      return sendSuccess(res, { message: responseMessage, data: result }); 
    } catch (error) {
      // Forward unexpected errors to Express error handler
      next(error);
    }
  } 
}

module.exports = new ChatController();