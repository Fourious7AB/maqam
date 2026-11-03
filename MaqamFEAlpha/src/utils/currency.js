/**
 * Currency formatting utilities
 * Formats prices in Indian Rupees (INR) with crore support
 */

export const formatCurrency = (amount) => {
  if (!amount) return '₹0';

  const num = Math.abs(amount);

  // Format with crore (1 crore = 10,000,000)
  if (num >= 10000000) {
    const crores = (num / 10000000).toFixed(2);
    return `₹${crores}Cr`;
  }

  // Format with lakh (1 lakh = 100,000)
  if (num >= 100000) {
    const lakhs = (num / 100000).toFixed(2);
    return `₹${lakhs}L`;
  }

  // Standard format with thousand separator
  return `₹${num.toLocaleString('en-IN')}`;
};

export const formatPrice = (price) => {
  if (!price) return '₹0';
  return `₹${Math.round(price).toLocaleString('en-IN')}`;
};

export const parseCurrency = (text) => {
  if (!text) return 0;

  const num = parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;

  if (text.includes('Cr')) return num * 10000000;
  if (text.includes('L')) return num * 100000;

  return num;
};

export const calculateDiscount = (basePrice, discountPercent) => {
  return basePrice - (basePrice * discountPercent / 100);
};

export const getDiscountedPrice = (basePrice, discount) => {
  if (typeof discount === 'number' && discount > 0 && discount <= 100) {
    return basePrice * (1 - discount / 100);
  }
  return basePrice;
};

export const calculateTotalPrice = (services) => {
  return services.reduce((total, service) => {
    if (service.enabled) {
      const price = getDiscountedPrice(service.basePrice, service.discount);
      return total + (price * (service.quantity || 1));
    }
    return total;
  }, 0);
};

export default {
  formatCurrency,
  formatPrice,
  parseCurrency,
  calculateDiscount,
  getDiscountedPrice,
  calculateTotalPrice,
};
