/**
 * ─── PAYMENT GATEWAY ROUTER ───────────────────────────
 * Production-level gateway abstraction
 * Supports: Razorpay, PayPal, PhonePe
 * 
 * Usage:
 * const gateway = require('./paymentGateway');
 * const razorpayClient = gateway.getGateway('razorpay');
 */

const logger = require('../../utils/logger');

// Gateway registry
const gateways = {
    razorpay: {
        name: 'Razorpay',
        adapter: null,
        service: null,
        webhook: null,
    },
    paypal: {
        name: 'PayPal',
        adapter: null,
        service: null,
        webhook: null,
    },
    phonepe: {
        name: 'PhonePe',
        adapter: null,
        service: null,
        webhook: null,
    },
};

/**
 * Initialize gateway adapters (lazy loading)
 */
const initializeGateway = (gatewayName) => {
    if (!gateways[gatewayName]) {
        throw new Error(`Unknown gateway: ${gatewayName}`);
    }

    const gateway = gateways[gatewayName];

    // Lazy load based on gateway name
    try {
        switch (gatewayName) {
            case 'razorpay':
                if (!gateway.adapter) {
                    gateway.adapter = require('./gateways/razorpay/razorpay.adapter');
                    gateway.service = require('./gateways/razorpay/razorpay.service');
                    gateway.webhook = require('./gateways/razorpay/razorpay.webhook');
                }
                break;

            case 'paypal':
                if (!gateway.adapter) {
                    gateway.adapter = require('./gateways/paypal/paypal.adapter');
                    gateway.service = require('./gateways/paypal/paypal.service');
                    gateway.webhook = require('./gateways/paypal/paypal.webhook');
                }
                break;

            case 'phonepe':
                if (!gateway.adapter) {
                    gateway.adapter = require('./gateways/phonepe/phonepe.adapter');
                    gateway.service = require('./gateways/phonepe/phonepe.service');
                    gateway.webhook = require('./gateways/phonepe/phonepe.webhook');
                }
                break;
        }

        logger.info(`Gateway initialized: ${gatewayName}`);
        return gateway;
    } catch (error) {
        logger.warn(`Gateway not available: ${gatewayName} - ${error.message}`);
        throw new Error(`Failed to initialize gateway: ${gatewayName}`);
    }
};

/**
 * Get gateway adapter
 * @param {string} gatewayName - 'razorpay', 'paypal', 'phonepe'
 * @returns {object} Gateway adapter
 */
const getGateway = (gatewayName) => {
    const gateway = initializeGateway(gatewayName);
    return {
        name: gateway.name,
        adapter: gateway.adapter,
        service: gateway.service,
        webhook: gateway.webhook,
    };
};

/**
 * Get available gateways
 * @returns {array} List of available gateway names
 */
const getAvailableGateways = () => {
    return Object.keys(gateways).filter((name) => {
        try {
            initializeGateway(name);
            return true;
        } catch {
            return false;
        }
    });
};

/**
 * Check if gateway is available
 * @param {string} gatewayName
 * @returns {boolean}
 */
const isGatewayAvailable = (gatewayName) => {
    try {
        initializeGateway(gatewayName);
        return true;
    } catch {
        return false;
    }
};

module.exports = {
    getGateway,
    getAvailableGateways,
    isGatewayAvailable,
    initializeGateway,
};


//