export const SceneKey = {
  Boot: 'boot',
  Title: 'title',
  Map: 'map',
  Battle: 'battle',
  Hud: 'hud',
  Dialogue: 'dialogue',
  DebugOverlay: 'debug-overlay',
  Generation: 'generation',
  Book: 'book',
} as const;

/** Scenes that `?scene=` may start directly. */
export const startableScenes: readonly string[] = [SceneKey.Title, SceneKey.Map, SceneKey.Battle, SceneKey.Generation, SceneKey.Book];
