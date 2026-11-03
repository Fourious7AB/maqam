const Package = require("../packages/models/package.model");
const { extractQueryFilters } = require('../../utils/queryParser');

class ChatService {
  /**
   * Processes the user's text message, finds matching packages, and creates a response.
   * Checks destination and package price, and provides relative packages when exact matches are unavailable.
   */
  async searchPackages(userMessage) {
    const baseFilter = { isActive: true, isPublic: true };

    // 1. Fetch distinct destinations currently active in DB
    let activeDestinations = [];
    try {
      activeDestinations = await Package.distinct('destination', baseFilter);
    } catch (err) {
      activeDestinations = [];
    }

    // 2. Parse destination, price, and duration filters
    const filters = extractQueryFilters(userMessage, activeDestinations);

    let packages = [];
    const isRelative = false;
    const matchReason = 'EXACT';

    // 3. Check if user specified any constraint (destination, price, or days)
    const hasConstraint = Boolean(filters.destination || filters.maxPrice || filters.minPrice || filters.days);

    if (hasConstraint) {
      // Strict Match Query across destination and price
      const strictQuery = { ...baseFilter };

      if (filters.destination) {
        strictQuery.destination = { $regex: new RegExp(filters.destination.trim(), 'i') };
      }
      if (filters.maxPrice || filters.minPrice) {
        strictQuery.sellPrice = {};
        if (filters.minPrice) strictQuery.sellPrice.$gte = filters.minPrice;
        if (filters.maxPrice) strictQuery.sellPrice.$lte = filters.maxPrice;
      }

      packages = await Package.find(strictQuery)
        .sort({ sellPrice: 1 })
        .limit(10)
        .lean();

      // Check and filter by day / duration
      if (filters.days && packages.length > 0) {
        packages = packages.filter((p) => {
          const pDays = p.itinerary && Array.isArray(p.itinerary) ? p.itinerary.length : 0;
          if (filters.isMaxDays) {
            return pDays > 0 && pDays <= filters.days;
          }
          return pDays === filters.days;
        });
      }

      // If any of destination, price, or day was wrong and no package matches,
      // packages remains empty [] and bot shows that the package doesn't exist.
    } else {
      // General exploration query (no destination, price, or days specified)
      packages = await Package.find(baseFilter)
        .sort({ sellPrice: 1 })
        .limit(5)
        .lean();
    }

    // 4. Format package objects for customer presentation
    const formattedPackages = packages.map((pkg) => this._formatPackage(pkg, isRelative));

    // 5. Generate conversational bot reply
    const reply = this._generateBotReply(filters, formattedPackages, isRelative, matchReason);

    return {
      reply,
      filtersApplied: filters,
      isRelativeMatch: isRelative,
      packages: formattedPackages,
    };
  }

  /**
   * Formats a package with customer-friendly values and formatted price.
   */
  _formatPackage(pkg, isRelative = false) {
    const sellPrice = pkg.sellPrice || 0;
    return {
      _id: pkg._id,
      title: pkg.title,
      description: pkg.description,
      destination: pkg.destination,
      sellPrice,
      formattedPrice: `₹${sellPrice.toLocaleString('en-IN')}`,
      durationDays: pkg.itinerary ? pkg.itinerary.length : null,
      images: pkg.images || [],
      inclusions: pkg.inclusions || [],
      bundleDiscountPercentage: pkg.bundleDiscountPercentage || 0,
      guideActive: pkg.guideActive || false,
      guidePrice: pkg.guidePrice || 0,
      isRelativeMatch: Boolean(isRelative),
    };
  }

  /**
   * Helper to build friendly reply messages with context-aware recommendations.
   */
  _generateBotReply(filters, packages, isRelative = false, matchReason = 'EXACT') {
    if (packages.length === 0) {
      const parts = [];
      if (filters.destination) parts.push(`for ${filters.destination}`);
      if (filters.maxPrice) parts.push(`within ₹${filters.maxPrice.toLocaleString('en-IN')}`);
      if (filters.days) parts.push(`for ${filters.days} ${filters.days === 1 ? 'day' : 'days'}`);

      if (parts.length > 0) {
        return `Package doesn't exist ${parts.join(' ')}. Try exploring other destinations or adjusting your budget and days!`;
      }
      return "Package doesn't exist matching your request. Try exploring other destinations or adjusting your budget and days!";
    }

    const count = packages.length;
    const pkgWord = count > 1 ? 'Packages are' : 'Package is';
    const cheapest = packages[0].formattedPrice;

    const parts = [];
    if (filters.destination) parts.push(`in ${filters.destination}`);
    if (filters.maxPrice) parts.push(`within your budget of ₹${filters.maxPrice.toLocaleString('en-IN')}`);
    if (filters.days) parts.push(`for ${filters.days} ${filters.days === 1 ? 'day' : 'days'}`);

    const filterText = parts.length > 0 ? ` ${parts.join(' ')}` : '';
    const startText = count > 1 && !filters.maxPrice ? ` (starting at ${cheapest})` : '';

    return `${pkgWord} retrieved successfully${filterText}${startText}:`;
  }
}

module.exports = new ChatService();