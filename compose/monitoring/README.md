# Monitoring stack (Grafana + Prometheus)

This Compose project runs **Grafana**, **Prometheus**, **node_exporter** (Raspberry Pi host metrics), **pihole-exporter**, and **nextcloud-exporter**. Pi-hole and Nextcloud stay in their own Compose stacks; exporters talk to them through **host-published ports** using `host.docker.internal`.

## Prerequisites

- Docker Engine and Compose plugin on the Pi (same as the rest of the homelab).
- **Pi-hole** and **Nextcloud** stacks running so **8080** (Pi-hole admin) and **8081** (Nextcloud) are listening on the host.
- **Nextcloud** must allow the hostname you use in `NEXTCLOUD_SERVER`. If that URL uses `host.docker.internal`, add `host.docker.internal` to `NEXTCLOUD_TRUSTED_DOMAINS` in the Nextcloud `.env` (see [nextcloud/.env.example](../nextcloud/.env.example)).

## Quick start

```bash
cd ~/homelab/monitoring   # or this repo path: compose/monitoring
cp .env.example .env
# Edit .env: Grafana password, PIHOLE_PASSWORD, NEXTCLOUD_* (see below)
docker compose up -d
```

- **Grafana**: `http://<pi-tailscale-ip>:3000` (default; override with `GRAFANA_HTTP_PORT`).
- **Prometheus** is **not** published to the host by default; Grafana reaches it at `http://prometheus:9090` inside the stack.

## Secrets and Nextcloud auth

| Variable | Purpose |
|----------|---------|
| `PIHOLE_PASSWORD` | Same value as Pi-hole `WEBPASSWORD` in `compose/pihole/.env` (or Pi-hole API token per [pihole-exporter](https://github.com/eko/pihole-exporter)). |
| `NEXTCLOUD_SERVER` | Base URL for Nextcloud, e.g. `http://host.docker.internal:8081` or `http://100.x.x.x:8081`. |
| `NEXTCLOUD_AUTH_TOKEN` | **Recommended** on Nextcloud 22+: serverinfo token (see below). |
| `NEXTCLOUD_USERNAME` / `NEXTCLOUD_PASSWORD` | Alternative: admin (or dedicated) user and **app password**; leave token empty. |

### Nextcloud serverinfo token (recommended)

On the Pi (or wherever Nextcloud runs), with the Nextcloud app container name `nextcloud` as in this repo:

```bash
docker exec -u www-data -it nextcloud php occ config:app:set serverinfo token --value "$(openssl rand -hex 32)"
docker exec -u www-data -it nextcloud php occ config:app:get serverinfo token
```

Copy the token into `NEXTCLOUD_AUTH_TOKEN` in `compose/monitoring/.env`. Leave `NEXTCLOUD_USERNAME` and `NEXTCLOUD_PASSWORD` empty.

See also: [nextcloud-exporter README](https://github.com/xperimental/nextcloud-exporter/blob/master/README.md).

## Grafana dashboards

The `grafana/provisioning/dashboards/json` folder is for optional JSON dashboards. By default, import community dashboards ( **+ → Import** in Grafana ):

| Dashboard | Grafana.com ID | Notes |
|-----------|------------------|--------|
| Node Exporter Full | [1860](https://grafana.com/grafana/dashboards/1860) | Host CPU, memory, disk |
| Pi-hole Exporter | [10176](https://grafana.com/grafana/dashboards/10176) | DNS / block stats |
| Nextcloud | [20716](https://grafana.com/grafana/dashboards/20716) | Matches nextcloud-exporter metrics |

Select the **Prometheus** datasource when prompted.

An example JSON is also published with the exporter: [contrib/grafana-dashboard.json](https://raw.githubusercontent.com/xperimental/nextcloud-exporter/master/contrib/grafana-dashboard.json).

## Tailscale ACLs

Allow only trusted devices to reach Grafana on **3000** (and optionally restrict who can reach the Pi at all). Prometheus does not need to be exposed on the tailnet if you only use Grafana.

## Troubleshooting

- **`nextcloud_up` is 0**: Wrong URL, token, or trusted domain; confirm `NEXTCLOUD_SERVER` matches `trusted_domains` and the serverinfo token or app password.
- **Pi-hole exporter errors**: Confirm `PIHOLE_API_PORT` matches the host port mapped to Pi-hole’s web UI (8080 in this repo’s Pi-hole Compose).
- **node_exporter looks wrong**: Ensure the stack runs on the Pi host with `/` mounted read-only as documented in Compose (host metrics, not only the container).
