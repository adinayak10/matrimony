// window.esc: escape a value before it is interpolated into innerHTML (D1.14).
//   el.innerHTML = '<b>' + esc(user.name) + '</b>';
// scripts/check-ejs-raw-web.js flags any ${...} inside an innerHTML template
// literal that does not go through esc().
(function (w) {
  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  w.esc = function (s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return MAP[c]; });
  };
})(window);
