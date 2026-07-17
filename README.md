Desarrollo del proyecto

Este sistema fue desarrollado como proyecto académico para la carrera de Ingeniería en Informática.

El proceso de desarrollo combinó programación tradicional con herramientas de inteligencia artificial generativa. ChatGPT fue utilizado como apoyo durante la construcción inicial de diversas funcionalidades, mientras que OpenAI Codex colaboró posteriormente en tareas de análisis del código, refactorización, optimización de la experiencia de usuario, documentación técnica y mejoras de mantenibilidad.

La utilización de estas herramientas formó parte del flujo de desarrollo del proyecto, manteniendo en todo momento la supervisión humana sobre las decisiones de arquitectura, implementación, pruebas e integración de las funcionalidades.

La inteligencia artificial fue utilizada como una herramienta de asistencia al desarrollo, no como un reemplazo del proceso de ingeniería de software.

# MasAgua

Aplicación web para gestionar pedidos, planes empresariales, clientes, flota, choferes, zonas operativas y asignación de entregas de MasAgua.

El proyecto está construido con Node.js, Express, EJS, sesiones de usuario y PostgreSQL.

## Funcionalidades principales

- Registro e inicio de sesión con roles.
- Cliente natural: crear pedidos y revisar historial.
- Empresa: contratar planes y revisar planes contratados.
- Administrador: revisar dashboard, clientes, reportes, pedidos, planes, flota, choferes y entregas.
- Dashboard administrativo con métricas, accesos principales y actividad reciente.
- Módulo de clientes con listado de clientes naturales y empresas existentes en la base de datos.
- Módulo de reportes con estados, ingresos estimados, productos más vendidos, clientes destacados, ingresos mensuales y entregas por zona.
- Gestión de flota con formulario mejorado para agregar y editar vehículos.
- Gestión de choferes con zona base y comunas de cobertura coherentes.
- Zonas operativas para evitar asignaciones ilógicas entre comunas lejanas.
- Asignación de pedidos pendientes a choferes compatibles por comuna y zona operativa.
- Scripts de mantenimiento para precios, comunas duplicadas, cobertura de choferes y zonas operativas.

## Requisitos

- Node.js 18 o superior.
- PostgreSQL instalado y ejecutándose localmente.
- Una base de datos PostgreSQL para el proyecto.

## Instalación

1. Instalar dependencias:

```bash
npm install
```

2. Crear una base de datos en PostgreSQL:

```sql
CREATE DATABASE masagua;
```

3. Copiar el archivo de variables de entorno:

```bash
copy .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

4. Ajustar `.env` con tus credenciales locales:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=masagua
DB_PASSWORD=postgres
DB_PORT=5432
SESSION_SECRET=cambia-este-secreto-en-desarrollo
```

5. Crear las tablas:

```bash
psql -U postgres -d masagua -f schema.sql
```

6. Cargar datos demo:

```bash
psql -U postgres -d masagua -f seed.sql
```

7. Aplicar reparaciones o datos de apoyo cuando corresponda:

```bash
npm run fix:products
npm run fix:communes
npm run fix:zones
npm run fix:drivers
```

Estos comandos son idempotentes y se pueden ejecutar más de una vez.

- `fix:products`: corrige precios de productos antiguos o faltantes.
- `fix:communes`: fusiona comunas duplicadas por acentos o variantes de escritura.
- `fix:zones`: crea o repara zonas operativas y reconstruye coberturas coherentes.
- `fix:drivers`: repara la cobertura de choferes usando la lógica actual de zonas operativas.

8. Levantar el servidor:

```bash
npm start
```

La aplicación queda disponible en:

```text
http://localhost:3000
```

> En Windows, si PowerShell bloquea `npm`, se puede usar `npm.cmd` en su lugar. Ejemplo: `npm.cmd run fix:zones`.

## Cuentas demo

Todas las cuentas usan datos ficticios y correos `.local`.

| Rol | Email | Password |
| --- | --- | --- |
| Admin | admin.demo@masagua.local | DemoMasAgua2026! |
| Cliente | cliente.demo@masagua.local | DemoMasAgua2026! |
| Empresa | empresa.demo@masagua.local | DemoMasAgua2026! |

> La password demo no se almacena en texto plano en la base de datos. `seed.sql` inserta un hash bcrypt.

## Zonas operativas

El sistema usa zonas operativas para evitar que un chofer cubra comunas demasiado lejanas entre sí. Cada chofer tiene una zona base y solo puede cubrir comunas pertenecientes a esa zona.

Zonas principales:

- Centro.
- Oriente.
- Norte.
- Poniente.
- Sur.
- Sur Oriente.
- Exterior Rural.

Ejemplo: Talagante, Peñaflor y El Monte pertenecen a `Exterior Rural`, por lo que no deberían quedar mezcladas con comunas como Conchalí o Huechuraba.

## Rutas administrativas relevantes

- `/admin`: dashboard principal.
- `/admin/clientes`: listado de clientes naturales y empresas.
- `/admin/reportes`: reportes de gestión e ingresos estimados.
- `/admin/pedidos`: revisión y cambio de estado de pedidos.
- `/admin/planes`: revisión y cambio de estado de planes contratados.
- `/admin/rutas`: asignación de entregas por comuna y zona compatible.
- `/choferes`: gestión de choferes, zona base y comunas de cobertura.
- `/flota`: gestión de vehículos.

## Guion recomendado para demostración

1. Iniciar sesión como administrador.
2. Mostrar el dashboard con métricas, actividad reciente y accesos principales.
3. Entrar a `Clientes` para mostrar clientes naturales y empresas registrados.
4. Entrar a `Reportes` para mostrar estados, ingresos estimados, productos vendidos y entregas por zona.
5. Revisar `Choferes` y explicar la lógica de zonas operativas.
6. Iniciar sesión como cliente demo o registrar un cliente nuevo.
7. Crear un pedido seleccionando productos, dirección y comuna.
8. Volver al administrador y entrar a `Entregas`.
9. Asignar el pedido pendiente a un chofer compatible por comuna y zona.
10. Revisar que el pedido quede en estado `asignado`.
11. Mostrar flota, planes y reportes para cerrar el recorrido operativo.

## Estructura del proyecto

```text
controllers/      Lógica de cada módulo
middlewares/      Validaciones de autenticación y roles
routes/           Rutas Express por módulo
views/            Vistas EJS
views/partials/   Header, head y footer compartidos
public/           HTML público, CSS e imágenes
scripts/          Scripts de mantenimiento y reportes técnicos
schema.sql        Estructura de la base de datos
seed.sql          Datos demo idempotentes
index.js          Configuración principal de Express
```

## Scripts disponibles

```bash
npm start
npm run fix:products
npm run fix:communes
npm run fix:zones
npm run fix:drivers
```

También existen scripts de reporte técnico en `scripts/`, útiles para revisar cobertura de comunas, duplicados y zonas operativas durante mantenimiento.

## Notas de seguridad

- Cambiar `SESSION_SECRET` antes de usar el proyecto fuera de desarrollo.
- No subir `.env` al repositorio.
- Las cuentas demo son solo para presentación local.
- Para producción, usar HTTPS y configurar cookies seguras.
- Los ingresos mostrados en reportes son estimaciones calculadas desde precios y cantidades registradas, no una integración contable real.

## Verificación rápida

Puedes verificar sintaxis JavaScript con:

```bash
node --check index.js
node --check controllers/adminController.js
node --check controllers/clienteController.js
node --check controllers/empresaController.js
node --check controllers/choferesController.js
node --check controllers/flotaController.js
node --check scripts/fixProductPrices.js
node --check scripts/fixCommuneDuplicates.js
node --check scripts/fixOperationalZones.js
node --check scripts/fixDriverCoverage.js
```

También puedes compilar vistas EJS principales con Node si necesitas revisar cambios de interfaz antes de una presentación.
