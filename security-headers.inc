# Included by every location that sets its own add_header: nginx stops inheriting
# from the server block the moment a location declares one.
#
# No X-Frame-Options: the visual editor shows the site in a frame. frame-ancestors
# allows exactly the site itself and the editor; any other site still cannot frame it.
# If the editor moves, change it here and in src/site.config.ts (editorUrl).
#
# HSTS is deliberately absent: Cloudflare terminates TLS, so setting it here would
# apply to plain HTTP inside the network and do nothing for a visitor.
add_header X-Content-Type-Options nosniff always;
add_header Content-Security-Policy "frame-ancestors 'self' https://grove.parti.design" always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
