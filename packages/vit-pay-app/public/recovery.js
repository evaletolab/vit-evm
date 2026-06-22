(function() {
  if (!('serviceWorker' in navigator)) return;
  var hashPattern = /\.[a-f0-9]{8,}\.(js|css|mjs)$/i;
  var recovering = false;
  function fullReset() {
    navigator.serviceWorker.getRegistrations()
      .then(function(regs) { return Promise.all(regs.map(function(r) { return r.unregister(); })); })
      .then(function() { return caches.keys(); })
      .then(function(names) { return Promise.all(names.map(function(n) { return caches.delete(n); })); })
      .then(function() { window.location.reload(); })
      .catch(function() { window.location.reload(); });
  }
  window.addEventListener('error', function(event) {
    if (recovering) return;
    var t = event.target;
    var src = t && (t.src || t.href);
    if (src && hashPattern.test(src)) { recovering = true; fullReset(); }
  }, true);
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'UNRECOVERABLE_STATE' && !recovering) {
      recovering = true; fullReset();
    }
  });
})();
