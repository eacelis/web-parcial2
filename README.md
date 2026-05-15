# Library Loans API

API de préstamos de biblioteca para el parcial del curso **ISIS 3710 — Programación con Tecnologías Web**.

## Arranque rápido

```bash
# 1) Variables de entorno
cp .env.example .env

# 2) Base de datos
docker compose up -d

# 3) Dependencias
npm install

# 4) Migraciones
npm run migration:run

# 5) Arrancar en modo desarrollo
npm run start:dev
```

## Swagger UI

Disponible en [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

Para probar endpoints protegidos:
1. Regístrate con `POST /api/auth/register` o haz login con `POST /api/auth/login`.
2. Copia el `accessToken` de la respuesta.
3. Haz clic en **Authorize** (candado) en Swagger y pega el token.

## Crear un usuario

```bash
# Register (crea rol member por defecto)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@correo.com","password":"Password1!","firstName":"Admin","lastName":"Biblioteca"}'
```

> **Nota:** `POST /auth/register` siempre asigna el rol `member`. Si necesitas un usuario con rol `admin` o `librarian` para pruebas, puedes cambiarlo directamente en la base de datos:
>
> ```sql
> UPDATE users SET role = 'admin' WHERE email = 'admin@correo.com';
> ```
>
> Conecta a la BD con: `docker exec -it library-loans-db psql -U loans -d loans`

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Registrar usuario (role: member) |
| `POST` | `/auth/login` | Público | Login → JWT |
| `GET` | `/auth/me` | JWT | Usuario autenticado |
| `POST` | `/items` | JWT | Crear item |
| `GET` | `/items?type=` | JWT | Listar items activos |
| `GET` | `/items/:id` | JWT | Detalle + isAvailable |
| `PATCH` | `/items/:id` | JWT | Actualizar item |
| `DELETE` | `/items/:id` | JWT | Soft delete (204) |
| `POST` | `/loans` | JWT | Crear préstamo (R1-R3) |
| `GET` | `/loans?userId=&itemId=&status=` | JWT | Listar préstamos |
| `GET` | `/loans/:id` | JWT | Detalle de préstamo |
| `PATCH` | `/loans/:id/return` | JWT | Devolver + multa (R4) |
| `PATCH` | `/loans/:id/mark-lost` | JWT | Marcar perdido (R5) |
| `GET` | `/health/live` | Público | Liveness probe |
| `GET` | `/health/ready` | Público | Readiness probe |

## Reglas de negocio

- **R1** — `dueAt` debe ser posterior a ahora y no exceder `MAX_LOAN_DAYS` (default 30).
- **R2** — Un item no puede tener más de un préstamo `active`/`overdue` simultáneo.
- **R3** — Un usuario no puede tener más de `MAX_ACTIVE_LOANS` (default 3) préstamos `active`/`overdue`.
- **R4** — Al devolver: `fineAmount = daysOverdue × DAILY_FINE_RATE` (default 0.50).
- **R5** — Los estados `returned` y `lost` son terminales; no se puede devolver ni marcar perdido dos veces.

## Decisión de diseño: préstamos overdue

`GET /loans?status=overdue` **no usa un job cron** para actualizar estados. En su lugar, filtra en tiempo real los préstamos con:

- `status = active`
- `dueAt < now`
- `returnedAt IS NULL`

Esto significa que un préstamo vencido sigue con `status = active` en la base de datos, pero aparece como overdue al consultar con el filtro. Si se desea sincronizar el estado en la BD, se puede ejecutar periódicamente:

```sql
UPDATE loans SET status = 'overdue'
WHERE status = 'active' AND due_at < NOW() AND returned_at IS NULL;
```

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run start:dev` | Arranca con hot reload |
| `npm run start:prod` | Arranca el build de producción |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run lint` | ESLint con autofix |
| `npm run format` | Prettier |
| `npm test` | Tests unitarios |
| `npm run test:cov` | Tests con coverage |
| `npm run test:e2e` | Tests e2e |
| `npm run migration:generate -- <path>` | Genera migración desde diff |
| `npm run migration:run` | Aplica migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración |

## Estructura

```
src/
├── main.ts                          # Bootstrap: ValidationPipe + Swagger + prefix
├── app.module.ts                    # ConfigModule + TypeOrmModule + módulos
├── common/
│   └── decorators/
│       └── public.decorator.ts      # @Public() bypass de JWT
├── config/
│   ├── configuration.ts             # AppConfig interface + factory
│   └── validation.schema.ts         # Joi schema
├── database/
│   ├── data-source.ts               # DataSource para CLI de TypeORM
│   └── migrations/                  # Migraciones generadas
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── guards/
    │   │   └── jwt-auth.guard.ts
    │   ├── strategies/
    │   │   └── jwt.strategy.ts
    │   └── dto/
    │       ├── register.dto.ts
    │       └── login.dto.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.service.ts
    │   └── entities/
    │       └── user.entity.ts
    ├── items/
    │   ├── items.module.ts
    │   ├── items.controller.ts
    │   ├── items.service.ts
    │   ├── entities/
    │   │   └── item.entity.ts
    │   └── dto/
    │       ├── create-item.dto.ts
    │       ├── update-item.dto.ts
    │       └── query-items.dto.ts
    ├── loans/
    │   ├── loans.module.ts
    │   ├── loans.controller.ts
    │   ├── loans.service.ts
    │   ├── loans.service.spec.ts
    │   ├── entities/
    │   │   └── loan.entity.ts
    │   └── dto/
    │       ├── create-loan.dto.ts
    │       └── query-loans.dto.ts
    └── health/
        ├── health.module.ts
        └── health.controller.ts
```

## Aliases de path

Configurados en `tsconfig.json` y `package.json` (jest `moduleNameMapper`):

```typescript
import { ItemsModule } from '@modules/items/items.module';
import { Public } from '@common/decorators/public.decorator';
import configuration from '@config/configuration';
import { AppDataSource } from '@database/data-source';
```

## Configuración: variables de entorno

El `validationSchema` de Joi exige al arranque:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (requeridas).
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (mínimo 32 caracteres).
- `BCRYPT_SALT_ROUNDS` (4-15, default 10).
- `MAX_ACTIVE_LOANS` (default 3), `DAILY_FINE_RATE` (default 0.50), `MAX_LOAN_DAYS` (default 30).

Si falta alguna requerida o no cumple el formato, la app **falla al arrancar** con un mensaje claro.

## Validación final

```bash
# Lint
npm run lint

# Tests
npm test

# Reset completo de la BD y verificación end-to-end
docker compose down -v
docker compose up -d
npm run migration:run
npm run start:dev
```

## Bonos implementados

Ninguno.
