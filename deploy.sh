#!/bin/sh
# Install or update every snn_* module on the Odoo server, then restart Odoo.
# Run on the server:  cd /tmp/snn && git pull && sh deploy.sh
set -e
DEST=$(ls -d /var/lib/docker/volumes/*odoo-extra-addons/_data | head -1)
if [ -z "$DEST" ]; then
    echo "Could not find the Odoo extra-addons folder"; exit 1
fi
for module in /tmp/snn/snn_*; do
    # Replace the whole folder so deleted files don't linger on the server.
    rm -rf "$DEST/$(basename "$module")"
    cp -r "$module" "$DEST/"
    echo "Copied $(basename "$module") to $DEST"
done
CONTAINER=$(docker ps -q --filter ancestor=odoo:18 | head -1)
docker restart "$CONTAINER"
echo "DONE - now upgrade the module in Odoo (Apps > snn > Upgrade)"
