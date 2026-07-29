/**
 * Shared game-feel values. Keeping these separate from fighter frame data makes
 * movement and input changes easy to tune without creating character-specific
 * exceptions.
 */
export const combatTuning = {
  gravityY: 1650,
  groundAcceleration: 7.2,
  airAcceleration: 4.1,
  groundBraking: 1700,
  airBraking: 230,
  activeMoveDrag: 520,
  attackGroundDrag: 1800,
  attackAirDrag: 440,
  hitGroundDrag: 850,
  hitAirDrag: 230,
  coyoteMs: 120,
  jumpBufferMs: 140,
  attackBufferMs: 130,
  slowMoveScale: 0.78,
  meadowGroundTop: 580,
  meadowGroundHeight: 140,
  swordSlamLaunchVelocity: -600,
  swordSlamAscentGravityOffset: -750,
  swordSlamDiveVelocity: 820,
  voidFallDamage: 15,
  voidRespawnInvulnerabilityMs: 1000,
} as const;
