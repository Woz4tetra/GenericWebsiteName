#!/usr/bin/env bash
if [ "$EUID" -ne 0 ]
    then echo "Please run as root"
    exit
fi

echo "Running genericwebsitename systemd service uninstall script"

BASE_DIR=$(realpath "$(dirname $0)")

SERVICE_NAME=genericwebsitename.service

rm -r /etc/systemd/system/${SERVICE_NAME}

echo "Disabling systemd services"
systemctl stop ${SERVICE_NAME}
systemctl disable ${SERVICE_NAME}

echo "genericwebsitename systemd service uninstallation complete"
