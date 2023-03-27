#!/bin/bash

dir_path=$(dirname $(realpath $0))
export GLOBAL_CONF_PATH="$dir_path/wag-deploy.json"
python3 "$dir_path/wag-update.py" "$@"
ret=$?
if [ $ret -eq 0 ]; then
    echo "new version installed, now going to restart the services..."
    sudo bash -c 'systemctl restart wag-all.target && systemctl restart nginx'
    echo "...done"
elif [ $ret -eq 2 ]; then
    printf "\nfailed to install latest WaG - the services won't be restarted\n\n"
fi