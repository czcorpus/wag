# Word at a Glance (WaG) v2

![WaG screenshot](https://github.com/czcorpus/wag/blob/master/assets/screenshot1.jpg)

WaG is a highly configurable frontend for creating word profile portals based on corpus resources compatible with the Manatee-open search engine. It provides comprehensive visualizations of linguistic data through seamless integration with our API services.

## Core Components

WaG integrates with the following backend services:

* **[MQuery](https://github.com/czcorpus/mquery)** - General corpora analysis including concordances, frequency distributions, and collocations
* **[Frodo](https://github.com/czcorpus/frodo)** - Corpus-driven dictionaries
* **[WSServer](https://github.com/czcorpus/wsserver)** - Syntax-based collocations and word similarities

WaG operates in conjunction with [APIGuard](https://github.com/czcorpus/apiguard), our specialized HTTP API proxy and virtual API endpoint provider.

## Features

With WaG, you can:

1. **Analyze linguistic data** for:
   - Single words
   - Comparative analysis of two or more words
   - Word translations

2. **Explore comprehensive linguistics insights** including:
   - Text statistics
   - Time-based trends
   - Collocations
   - Geographical data
   - And much more

3. **Combine data from multiple resources** for enriched analysis


## Getting Started with Docker

The easiest way to run WaG is using Docker Compose, which sets up all required services including WaG, APIGuard, MQuery, Frodo, Redis, MariaDB, and Nginx.

### Prerequisites

- Docker
- Docker Compose

### Quick Start (Production)

1. **Configure environment** (optional):

   The project includes a [.env](.env) file with working defaults that point to example configurations in [install/docker/](install/docker/). You can use it as-is or customize the paths if needed:

   ```bash
   WAG_CONFIG_PATH=./install/docker/conf
   APIGUARD_CONF=./install/docker/apiguard.json
   MQUERY_CONF=./install/docker/mquery.json
   FRODO_CONF=./install/docker/frodo.json
   CORPORA_CONF=./install/docker/corpora
   VERT_TAGEXTRACT_CONF=./install/docker/vert-tagextract
   ```

2. **Start all services:**

   ```bash
   docker compose up -d
   ```

3. **Access WaG** at `http://localhost:8080`

### Development Setup

For development with hot-reloading:

1. **Set up environment variables** (same as production, plus development-specific paths):

   ```bash
   export WAG_CONFIG_PATH=/path/to/wag/conf
   export APIGUARD_PATH=/path/to/apiguard
   export APIGUARD_CONF=/path/to/apiguard/conf.docker.json
   export MQUERY_PATH=/path/to/mquery
   export MQUERY_CONF=/path/to/mquery/conf.docker.json
   export FRODO_PATH=/path/to/frodo
   export FRODO_CONF=/path/to/frodo/conf.docker.json
   export VERT_TAGEXTRACT_CONF=/path/to/vert-tagextract/conf
   export CORPORA_CONF=/path/to/corpora
   ```

2. **Start development environment:**

   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

3. **Access WaG** at `http://localhost:8080` (frontend dev server at `http://localhost:9001`)

### Available Services

The Docker setup includes:

- **WaG** (main application)
- **APIGuard** (`localhost:8081`) - API proxy
- **MQuery** (`localhost:8082`) - Corpus analysis
- **Frodo** (`localhost:8083`) - Dictionary services
- **Nginx** (`localhost:8080`) - Web server
- **Redis** - Caching
- **MariaDB** - Database

### Docker Architecture

The project uses custom Dockerfiles located in the [dockerfiles/](dockerfiles/) directory:

- `Dockerfile.wag` - Production WaG build
- `Dockerfile.wag.dev` - Development build with hot-reloading
- `Dockerfile.apiguard`, `Dockerfile.mquery`, `Dockerfile.frodo` - Backend services


## How to cite WaG

Tomáš Machálek (2020): Word at a Glance: Modular Word Profile Aggregator. In: [Proceedings of LREC 2020](http://www.lrec-conf.org/proceedings/lrec2020/pdf/2020.lrec-1.866.pdf), s. 7011–7016.

```bibtex
@InProceedings{machalek2020lrec,
 author = {Tomáš Machálek},
 title = "{Word at a Glance: Modular Word Profile Aggregator.}",
 booktitle = {Proceedings of the Twelfth International Conference on Language Resources and Evaluation (LREC 2020)},
 year = {2020},
 publisher = {European Language Resources Association (ELRA)},
 language = {english}
}
```
