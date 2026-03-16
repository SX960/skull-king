// ---- BOOT ----
(function () {
  if (!loadState()) STATE.phase = 'SETUP';
  render();
})();
