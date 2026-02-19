/**
 * Rate Card Service Stub (Community Edition)
 */

const stubError = () => {
  throw new Error('PREMIUM_REQUIRED: This feature requires Sprintiva Premium.');
};

export default {
  getRateCards: stubError,
  createRateCard: stubError,
  updateRateCard: stubError,
  deleteRateCard: stubError,
};

export type RateCard = any;
export type CreateRateCardData = any;
