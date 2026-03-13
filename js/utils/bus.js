// js/utils/bus.js — Event Bus com Map, once() e cleanup
export const Bus = (() => {
  const _listeners = new Map();
  return {
    on(event, fn) {
      if (!_listeners.has(event)) _listeners.set(event, []);
      _listeners.get(event).push(fn);
      return () => this.off(event, fn); // retorna unsubscribe
    },
    off(event, fn) {
      if (!_listeners.has(event)) return;
      if (!fn) { _listeners.delete(event); return; }
      const fns = _listeners.get(event).filter(f => f !== fn);
      fns.length > 0 ? _listeners.set(event, fns) : _listeners.delete(event);
    },
    emit(event, data) {
      if (!_listeners.has(event)) return;
      _listeners.get(event).forEach(fn => {
        try { fn(data); } catch (e) { console.error(`[Bus] Error in "${event}" handler:`, e); }
      });
    },
    once(event, fn) {
      const wrap = (data) => { fn(data); this.off(event, wrap); };
      this.on(event, wrap);
    },
    clear() { _listeners.clear(); },
  };
})();
