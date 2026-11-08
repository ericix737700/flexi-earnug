export function canCountVideoWatch(active: boolean, visible: boolean, playing: boolean, started: boolean, waiting: boolean) {
  return active && visible && playing && started && !waiting;
}