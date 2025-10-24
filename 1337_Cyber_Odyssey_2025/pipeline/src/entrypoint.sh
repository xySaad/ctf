#!/bin/sh
# Entrypoint script to set up localhost aliases for service discovery

# Add service names to localhost
cat >> /etc/hosts <<EOF
127.0.0.1 metadata
127.0.0.1 app
127.0.0.1 proxy
EOF

# Start supervisord
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
