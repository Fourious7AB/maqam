/**
 * Helper to parse numerical strings with shorthand multipliers (e.g. "50k" -> 50000, "1.5lakh" -> 150000)
 */
function parseNumberValue(str) {
  if (!str) return 0;
  let clean = str.toLowerCase().replace(/,/g, '').replace(/[₹$]/g, '').trim();
  let multiplier = 1;

  if (clean.endsWith('k')) {
    multiplier = 1000;
    clean = clean.replace(/k$/, '').trim();
  } else if (clean.endsWith('lakh') || clean.endsWith('lac') || clean.endsWith('l')) {
    multiplier = 100000;
    clean = clean.replace(/(?:lakh|lac|l)$/, '').trim();
  }

  const val = parseFloat(clean);
  return isNaN(val) ? 0 : Math.round(val * multiplier);
}

/**
 * Extracts destination, budget, and duration constraints from user text.
 */
function extractQueryFilters(userMessage, knownDestinations = []) {
  if (!userMessage || typeof userMessage !== 'string') return {};
  const text = userMessage.toLowerCase().trim();
  const filters = {};

  // 1. Detect Destination
  // 1a. Check known destinations from DB (case-insensitive word boundary)
  for (const place of knownDestinations) {
    if (!place || typeof place !== 'string') continue;
    const escapedPlace = place.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\b)${escapedPlace}(\\b|$)`, 'i');
    if (regex.test(text)) {
      filters.destination = place.trim();
      break;
    }
  }

  // 1b. Explicit destination labels: "destination: Dubai", "destination Dubai", "place: Dubai", "city: Dubai"
  if (!filters.destination) {
    const explicitDestRegex = /(?:destination|place|location|city|country)\s*[:=-]?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i;
    const expMatch = text.match(explicitDestRegex);
    if (expMatch && expMatch[1]) {
      const candidate = expMatch[1].trim();
      const stopWords = new Set(['is', 'are', 'for', 'in', 'under', 'below', 'price', 'cost', 'day', 'days', 'budget']);
      if (!stopWords.has(candidate.toLowerCase())) {
        filters.destination = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  // 1c. Preposition patterns: "trip to Dubai", "packages for Dubai", "visit Dubai", etc.
  if (!filters.destination) {
    const destRegex = /(?:trip to|travel to|packages?\s+for|tour\s+of|holiday\s+in|flight\s+to|visit|explore|in|for|to)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i;
    const match = text.match(destRegex);
    if (match && match[1]) {
      const words = match[1].trim().split(/\s+/);
      const stopWords = new Set([
        'a', 'an', 'the', 'my', 'me', 'us', 'any', 'some', 'cheap', 'best', 'good',
        'affordable', 'luxury', 'package', 'packages', 'tour', 'tours', 'trip', 'trips',
        'vacation', 'holiday', 'under', 'below', 'less', 'within', 'budget', 'price',
        'cost', 'for', 'in', 'to', 'with', 'from', 'between', 'around', 'days', 'day',
        'nights', 'night', 'approx', 'max', 'min'
      ]);
      const validWords = [];
      for (const w of words) {
        if (stopWords.has(w.toLowerCase())) break;
        validWords.push(w);
      }
      if (validWords.length > 0) {
        const candidate = validWords.join(' ');
        filters.destination = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  // 1d. Leading word pattern before price or day (e.g. "Dubai price 40000", "Dubai 50k 5 days")
  if (!filters.destination) {
    const leadingDestRegex = /^(?:find|search|get|show|view|explore)?\s*(?:packages?|tours?|trips?)?\s*(?:for\s+)?([a-zA-Z]{3,25})\s+(?:package\s*price|price|cost|budget|under|below|\d+k|\d{4,}|\d+\s*days?|day\s*\d+)/i;
    const leadMatch = text.match(leadingDestRegex);
    if (leadMatch && leadMatch[1]) {
      const candidate = leadMatch[1].trim();
      const ignoreWords = new Set([
        'find', 'search', 'get', 'show', 'all', 'any', 'some', 'cheap', 'best', 'good',
        'package', 'packages', 'tour', 'tours', 'trip', 'trips', 'under', 'below', 'within',
        'budget', 'price', 'cost', 'for', 'in', 'to', 'from'
      ]);
      if (!ignoreWords.has(candidate.toLowerCase())) {
        filters.destination = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  // 2. Detect Duration / Days
  // 2a. Label followed by number: "day 7", "day: 7", "days 5", "duration 5"
  const labelDaysRegex = /(?:day|days|nights?|duration)\s*[:=-]?\s*(\d{1,2})\b/i;
  const labelDaysMatch = text.match(labelDaysRegex);

  // 2b. Range: "between 3 and 5 days", "from 3 to 5 days"
  const rangeDaysRegex = /(?:between|from)\s*(\d{1,2})\s*(?:to|-|and)\s*(\d{1,2})\s*(?:days?|nights?)\b/i;
  const rangeDaysMatch = text.match(rangeDaysRegex);

  // 2c. Number followed by day/night: "5 days", "7 nights", "for 5 days", "5d", "7n"
  const numDaysRegex = /(?:for\s+)?(\d{1,2})\s*(?:days?|nights?|d|n)\b/i;
  const numDaysMatch = text.match(numDaysRegex);

  if (rangeDaysMatch) {
    filters.minDays = parseInt(rangeDaysMatch[1], 10);
    filters.days = parseInt(rangeDaysMatch[2], 10);
    filters.maxDays = filters.days;
  } else if (labelDaysMatch && parseInt(labelDaysMatch[1], 10) <= 90) {
    filters.days = parseInt(labelDaysMatch[1], 10);
    filters.maxDays = filters.days;
  } else if (numDaysMatch && parseInt(numDaysMatch[1], 10) <= 90) {
    filters.days = parseInt(numDaysMatch[1], 10);
    filters.maxDays = filters.days;
  }

  // Check if max duration modifier is present ("under 5 days", "max 5 days", "within 5 days", "up to 5 days")
  if (filters.days) {
    const isMaxDaysRegex = new RegExp(`(?:under|below|less than|max|up to|within|at most)\\s*(?:for\\s+)?${filters.days}\\s*(?:days?|nights?)?`, 'i');
    filters.isMaxDays = isMaxDaysRegex.test(text);
  }

  // 3. Detect Price
  // 3a. Range: "between 20k and 50k", "from 30000 to 60000"
  const rangePriceRegex = /(?:between|from)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+[\d,]*(?:\.\d+)?\s*(?:k|lakh|lac|l)?)\s*(?:and|to|-)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+[\d,]*(?:\.\d+)?\s*(?:k|lakh|lac|l)?)/i;
  const rangePriceMatch = text.match(rangePriceRegex);

  if (rangePriceMatch) {
    filters.minPrice = parseNumberValue(rangePriceMatch[1]);
    filters.maxPrice = parseNumberValue(rangePriceMatch[2]);
  } else {
    // 3b. Keyword prefixes: "package price 50000", "price 50000", "price: 50000", "cost 50000", "budget 50000", "under 50k", etc.
    const pricePrefixRegex = /(?:package\s*price|price(?:\s*is)?|cost(?:\s*is)?|budget(?:\s*of)?|max(?:\s*budget)?|rate|under|below|less than|within|up to|around|approx|₹|\$|rs\.?|inr|<|<=)\s*[:=-]?\s*(?:₹|\$|rs\.?|inr)?\s*(\d+[\d,]*(?:\.\d+)?\s*(?:k|lakh|lac|l)?)/i;
    const priceMatch = text.match(pricePrefixRegex);

    if (priceMatch) {
      filters.maxPrice = parseNumberValue(priceMatch[1]);
    } else {
      // 3c. Suffix currency: "50000 rs", "50000 inr", "50k/-"
      const suffixPriceRegex = /(\d+[\d,]*(?:\.\d+)?\s*(?:k|lakh|lac|l)?)\s*(?:rs\.?|inr|₹|\$|\/-)\b/i;
      const suffixMatch = text.match(suffixPriceRegex);
      if (suffixMatch) {
        filters.maxPrice = parseNumberValue(suffixMatch[1]);
      } else {
        // 3d. Standalone numbers with k/lakh (e.g. "62k", "1.5lakh")
        const shorthandRegex = /\b(\d+(?:\.\d+)?\s*(?:k|lakh|lac|l))\b/i;
        const shorthandMatch = text.match(shorthandRegex);
        if (shorthandMatch) {
          filters.maxPrice = parseNumberValue(shorthandMatch[1]);
        } else {
          // 3e. Standalone large numbers (>= 1000) that are not days
          const largeNumberRegex = /\b(\d{4,7})\b/g;
          let m;
          while ((m = largeNumberRegex.exec(text)) !== null) {
            const num = parseInt(m[1], 10);
            if (num !== filters.days && num !== filters.minDays) {
              filters.maxPrice = num;
              break;
            }
          }
        }
      }
    }
  }

  return filters;
}

module.exports = { extractQueryFilters };