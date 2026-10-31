/**
 * Social features kill-switch (Yoav 31.10.26): the Friends hub, crowd wisdom,
 * trade rooms, anonymous advice and the friends list are hidden in production.
 * Nothing is deleted. The friends tab leaves the bottom bar (4 tabs), and every
 * social route redirects to the learning map, deep links included.
 * Flip to `true` to bring all of it back.
 */
export const SOCIAL_FEATURES_ENABLED = false;
