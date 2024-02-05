docker-compose run --rm frontend_builder

docker-compose run --rm backend_builder

echo 'export GRAFANA_ACCESS_POLICY_TOKEN="glc_eyJvIjoiNDU1MDgiLCJuIjoicGx1Z2luLXNpZ25pbmctdG9rZW4tZm9yLXNpZ24tcGx1Z2luIiwiayI6IjU3UTI1VDMyT21FUmNhNDJYMnpPdmg1TSIsIm0iOnsiciI6InVzIn19"' > .release_env

docker-compose run --rm plugin_signer

## Need to stap aplications that uses 3000 and 9000 ports.

docker-compose up -d grafana

docker-compose logs -f grafana # to check logs
