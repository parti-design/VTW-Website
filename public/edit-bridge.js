// edit-bridge.js: copy this file into your site and load it once in the shared layout:
//   <script src="/edit-bridge.js" data-editor="https://grove.parti.design" async></script>
// For visitors it does nothing and loads nothing. Adding ?edit to any page opens it in the editor.
// Only when the editor frames the page does it load the editing layer, from the editor's origin.
(function () {
  var me = document.currentScript
  var EDITOR = ((me && me.getAttribute('data-editor')) || 'https://grove.parti.design').replace(/\/$/, '')
  if (window.parent === window) {
    if (/[?&]edit(=|&|$)/.test(location.search))
      location.href = EDITOR + '/go?url=' + encodeURIComponent(location.origin + location.pathname)
    return
  }
  addEventListener('message', function (e) {
    if (e.origin !== EDITOR || e.source !== parent || !e.data || e.data.type !== 'edit:load' || window.__editLoaded) return
    window.__editLoaded = true
    var s = document.createElement('script')
    s.type = 'module'
    s.src = EDITOR + '/assets/overlay.js?v=' + encodeURIComponent(e.data.v)
    document.head.appendChild(s)
  })
  parent.postMessage({ type: 'edit:hello', v: 1 }, EDITOR)
})()
