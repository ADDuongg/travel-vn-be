<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## VN Tours Backend (Travel Platform)

Backend NestJS cho nền tảng du lịch, gồm **tour**, **lưu trú (hotel/room/booking)** và **e-commerce (product/orders/payment)**, có **auth/roles/permissions**, **provinces**, **upload/media (Cloudinary)**, **realtime (Socket.IO)** và **Swagger**.

- **Project overview**: xem `docs/PROJECT-OVERVIEW.md`
- **Tour API cho FE**: xem `docs/FE-API-TOUR.md`
- **API changes (provinces/hotel/room)**: xem `docs/FE-API-CHANGES.md`
- **Tour module plan**: xem `plans/TOUR-MODULE-PLAN.md`

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment (GitLab CI/CD)

Project duoc deploy tu dong qua GitLab CI/CD pipeline khi push vao branch `staging` hoac `production`.

### Pipeline stages

1. **validate** -- lint (moi branch)
2. **test** -- unit tests (moi branch)
3. **build** -- Docker build + push len GitLab Container Registry (chi staging/production)
4. **deploy** -- Pull image + restart container tren VPS (chi staging/production)

### Ten image tren registry

- Staging: `registry.gitlab.com/<group>/<project>:staging` (them tag `staging-<sha>` de luu lich su)
- Production: `...:production` (them tag `production-<sha>`)

`CI_REGISTRY_IMAGE` trong GitLab = `registry.gitlab.com/<group>/<project>` (khong co them path con). Trong `.env` tren VPS: `CI_REGISTRY_IMAGE` + `IMAGE_TAG` (`staging` / `production`).

### Build & push thu cong (khong qua CI)

```bash
docker login registry.gitlab.com

# Staging
docker build -t registry.gitlab.com/nvduong2302/travel-vn-be:staging .
docker push registry.gitlab.com/nvduong2302/travel-vn-be:staging

# Production
docker build -t registry.gitlab.com/nvduong2302/travel-vn-be:production .
docker push registry.gitlab.com/nvduong2302/travel-vn-be:production
```

### Tech stack (runtime)

| Thanh phan          | Vai tro                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| **NestJS**          | API (`PORT` mac dinh 9001)                                                     |
| **MongoDB**         | Du lieu chinh (Mongoose) — service `mongo` trong compose                       |
| **Redis**           | BullMQ (notification queue), ioredis (OTP, permission cache) — service `redis` |
| **OpenAI / Ollama** | LLM tuy chon (`LLM_PROVIDER`, `OPENAI_*`, `OLLAMA_*`)                          |

Mongo va Redis **khong** can cai tren host: chung la service trong `docker-compose.*.yml`, du lieu nam trong volume `mongo_data` / `redis_data`.

### Cau truc tren VPS

```
/opt/travel-be/
├── staging/
│   ├── docker-compose.staging.yml   # backend + mongo + redis
│   └── .env
└── production/
    ├── docker-compose.production.yml
    └── .env
```

### Setup VPS lan dau

```bash
# 1. Tao thu muc
sudo mkdir -p /opt/travel-be/staging /opt/travel-be/production

# 2. Copy docker-compose files vao VPS
cp docker-compose.staging.yml /opt/travel-be/staging/
cp docker-compose.production.yml /opt/travel-be/production/

# 3. Tao .env (DB_URI, REDIS_HOST, JWT; va image compose: CI_REGISTRY_IMAGE + IMAGE_TAG)
cp .env.example /opt/travel-be/staging/.env
cp .env.example /opt/travel-be/production/.env
# Staging: IMAGE_TAG=staging  |  Production: IMAGE_TAG=production
# Image day du: ${CI_REGISTRY_IMAGE}:${IMAGE_TAG}
# Sua JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGINS, ...

# 4. Lan dau: khoi dong ca stack (Mongo + Redis + backend)
cd /opt/travel-be/staging
docker compose -f docker-compose.staging.yml up -d
```

Trong `.env` khi dung compose: `DB_URI=mongodb://mongo:27017/travel-vn`, `REDIS_HOST=redis`.

### Port mapping (chi API ra ngoai host)

| Environment | API (host)                      | Mongo / Redis                                 |
| ----------- | ------------------------------- | --------------------------------------------- |
| Staging     | 127.0.0.1:3001 → container 9001 | Chi trong mang Docker (khong mo port ra host) |
| Production  | 127.0.0.1:3002 → container 9001 | Tuong tu                                      |

### Deploy CI (GitLab)

Pipeline chi **pull + recreate** container backend; Mongo va Redis giu nguyen, tranh restart DB moi lan deploy.

## Ollama (LLM local, tuy chon)

Compose hien tai **chua** gom Ollama (ton RAM/GPU). Ban co the:

- Dung **OpenAI** (`LLM_PROVIDER=openai`, `OPENAI_API_KEY=...`), hoac
- Cai Ollama tren host (`curl -fsSL https://ollama.com/install.sh | sh`, `ollama pull llama3.1`) va dat `OLLAMA_BASE_URL=http://host.docker.internal:11434` — tren Linux host can cau hinh them de container goi duoc host, hoac
- Tu them service `ollama` vao compose (image `ollama/ollama`) cung network, roi `OLLAMA_BASE_URL=http://ollama:11434`, `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=llama3.1`.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
