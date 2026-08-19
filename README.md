# Human Typer

Human Typer es una utilidad de escritorio liviana que reproduce un texto carácter por carácter en el campo activo de otra aplicación. El ritmo base, su variación aleatoria y las pausas de puntuación son configurables para producir una cadencia natural sin introducir errores deliberados.

Está construida con Tauri 2, React 19, TypeScript y Rust. Funciona completamente en el dispositivo: no hay servidor, cuenta, telemetría ni almacenamiento permanente del texto.

> Usá la automatización únicamente en aplicaciones y campos donde tengas autorización. `Esc` detiene la escritura desde cualquier aplicación.

## Estado del proyecto

La versión inicial incluye:

- escritura individual de cada carácter, incluidos Unicode, acentos, `ñ`, `¿`, `¡`, símbolos, espacios, tabulaciones y saltos de línea;
- velocidades predefinidas y ajuste fino entre 15 y 350 ms desde la interfaz;
- variación aleatoria y pequeñas oscilaciones naturales;
- pausas opcionales después de `. , ; : ? !` y saltos de línea;
- cuenta regresiva configurable de 1 a 30 segundos;
- progreso, porcentaje y estados visibles;
- pausa/reanudación con `F8` y cancelación inmediata con `Esc`, aun sin foco;
- botones equivalentes dentro de la aplicación;
- temas claro, oscuro y automático según el sistema;
- preferencias locales; el contenido escrito no se persiste;
- límites de seguridad de 250.000 caracteres y ocho horas por ejecución.

## Capturas

El espacio para capturas está preparado en [`docs/screenshots`](docs/screenshots). Las imágenes finales deben capturarse desde los binarios firmados de macOS y Windows para reflejar la decoración nativa de cada plataforma.

## Requisitos

- Node.js 22 LTS (Vite también admite Node 20.19 o superior);
- npm 10 o superior;
- Rust 1.85 o superior;
- [prerrequisitos de Tauri 2](https://v2.tauri.app/start/prerequisites/) para el sistema operativo.

En Linux también se necesitan las bibliotecas de desarrollo indicadas por Tauri para WebKitGTK.

## Instalación y desarrollo

```bash
npm install
npm run tauri dev
```

El primer arranque descarga y compila las dependencias Rust, por lo que puede tardar algunos minutos.

### Scripts útiles

```bash
npm run dev           # frontend Vite en el navegador (sin motor nativo)
npm run typecheck     # comprobación TypeScript estricta
npm run lint          # ESLint
npm test              # tests unitarios del frontend
npm run check         # typecheck + lint + tests
cargo test --manifest-path src-tauri/Cargo.toml
```

## Compilación

```bash
npm run tauri build
```

Los instaladores se generan en `src-tauri/target/release/bundle/`. Para distribuirlos públicamente conviene configurar firma y notarización en macOS y firma de código en Windows.

## Uso

1. Pegá o escribí el contenido en **Tu texto**.
2. Elegí una velocidad o ajustá el deslizador en milisegundos.
3. Configurá la variación, la cuenta regresiva y las pausas de puntuación.
4. Presioná **Comenzar**.
5. Durante la cuenta regresiva, enfocá el campo de texto de destino.
6. Usá `F8` para pausar/reanudar o `Esc` para cancelar.

La aplicación bloquea la edición y los ajustes mientras una ejecución está activa, evitando que el progreso deje de corresponder con el texto enviado.

## Atajos y mecanismos de seguridad

| Acción | Atajo global | Alternativa |
| --- | --- | --- |
| Pausar / reanudar | `F8` | Botón **Pausar / Reanudar** |
| Cancelar | `Esc` | Botón **Cancelar** |

Los atajos se registran al iniciar. Si otro programa ya reservó alguno, Human Typer muestra una advertencia y mantiene disponibles los botones. El motor consulta la cancelación cada 25 ms, incluso durante pausas largas. Además, una ejecución se detiene ante el primer error de entrada, al superar ocho horas o al cerrar el proceso.

`Esc` es un atajo global intencional mientras Human Typer está abierto. Si interfiere con otra utilidad, cerrá Human Typer cuando no lo uses.

## Permisos de macOS

macOS requiere autorización para generar eventos de teclado:

1. Abrí **Configuración del Sistema**.
2. Entrá en **Privacidad y seguridad → Accesibilidad**.
3. Activá **Human Typer**.
4. Si estaba abierta, cerrá y volvé a abrir la aplicación.

Durante desarrollo puede aparecer `Terminal`, `iTerm`, tu IDE o el binario de depuración en lugar de Human Typer. Autorizá el proceso que ejecuta `npm run tauri dev`. La aplicación comprueba este permiso antes de empezar y muestra instrucciones si falta.

## Compatibilidad

| Sistema | Estado | Notas |
| --- | --- | --- |
| macOS 12+ | Objetivo principal | Requiere Accesibilidad. Los binarios distribuidos deben firmarse. |
| Windows 11 | Objetivo principal | Algunas aplicaciones elevadas no aceptan eventos de procesos sin elevar. |
| Linux X11 | Compatible | Requiere una sesión gráfica y las dependencias de Tauri. |
| Linux Wayland | Experimental | La inyección y los atajos globales dependen del compositor y sus políticas. |

En campos protegidos, aplicaciones con privilegios elevados, juegos o escritorios remotos, el sistema operativo o la aplicación de destino puede bloquear eventos simulados.

## Arquitectura

```text
src/
├── components/            # interfaz y controles pequeños
├── hooks/                 # preferencias, tema y puente con Tauri
├── lib/                   # lógica pura y tests
├── types/                 # contratos TypeScript
├── App.tsx
└── main.tsx
src-tauri/
├── src/
│   ├── lib.rs             # comandos, estado y atajos globales
│   ├── platform.rs        # permisos específicos del sistema
│   └── typing_engine.rs   # cuenta regresiva, ritmo y entrada Unicode
├── capabilities/          # permisos mínimos de Tauri
├── Cargo.toml
└── tauri.conf.json
```

React invoca comandos Tauri y escucha eventos de estado. Un worker nativo mantiene la cuenta regresiva y el bucle de escritura; `enigo` genera cada carácter por separado. El estado sincronizado del worker permite que los atajos globales pausen o cancelen sin depender del foco del WebView.

## Persistencia y privacidad

Solo se guardan velocidad, variación, cuenta regresiva, tema y preferencia de puntuación mediante `localStorage`. El área de texto vive exclusivamente en memoria y se pierde al cerrar o recargar la aplicación.

- no se realizan solicitudes con el contenido;
- no se incluyen analytics, crash reporting ni cuentas;
- no se guardan logs del texto;
- la política de contenido de Tauri restringe recursos externos.

## Pruebas

La lógica pura cubre conteo Unicode, progreso, persistencia y estimaciones. Rust prueba los componentes de retraso, el límite mínimo, la puntuación y las transiciones principales de control. Las pulsaciones reales se validan manualmente por plataforma porque automatizarlas produciría tests frágiles y podría escribir en aplicaciones equivocadas.

```bash
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
```

## Licencia

Todavía no se definió una licencia de distribución. Agregá una antes de publicar el repositorio como software abierto.
