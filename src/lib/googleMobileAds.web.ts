const stub = () => ({
  initialize: () => Promise.resolve(),
});

export default stub;

export const TestIds = { REWARDED: "" };
export const RewardedAd = {
  createForAdRequest: () => ({
    addAdEventListener: () => {},
    load: () => {},
    show: () => {},
  }),
};
export const RewardedAdEventType = { LOADED: "loaded", EARNED_REWARD: "earned_reward" };
export const AdEventType = { CLOSED: "closed", ERROR: "error" };