# Plan de acción: integración con Google Docs y Google Sheets

Fecha: 7 de octubre de 2026.

Base: Human Typer 0.9.0.

Estado: etapas 1 y 2 implementadas con verificaciones automáticas; validación manual de la extensión pendiente. Preparación de solicitudes para Docs y Sheets implementada; conexión OAuth y ejecución de API pendientes de configuración.

## Objetivo y orden acordado

Ampliar la integración manteniendo la escritura humana actual y agregando un modo opcional de transferencia mediante las APIs de Google.

1. Envío desde la app a la extensión.
2. Vista previa de importación.
3. Integración con la API de Google Docs.
4. Integración con la API de Google Sheets.

Cada etapa debe quedar usable y verificada antes de pasar a la siguiente. El desarrollo fue autorizado en el chat. Publicación autorizada: 0.11.0. La versión 1.0.0 queda reservada para cuando esté terminada la configuración e integración de Google.

## Situación inicial (antes de este desarrollo)

- La app tiene editor con encabezados 1–6 y énfasis; importa DOCX y TXT.
- El subtítulo se representa como encabezado 2. Las tablas y listas importadas se simplifican a texto.
- El motor nativo aplica estilos mediante atajos. El script de consola incluye formato, pero el navegador puede ignorar eventos sintéticos.
- La extensión tiene su propio campo de texto y no recibe el contenido del editor de escritorio.
- El importador XLSX/CSV toma solo la primera hoja y transforma los valores en texto.
- Los errores de importación de planillas actualmente descartan la selección anterior.
- Los contenidos permanecen en memoria; las preferencias se guardan localmente.

## Etapa 1 — Envío a la extensión

### Resultado para el usuario

Elegir una pestaña de destino y enviar el contenido preparado desde Human Typer, con sus formatos y ajustes, sin copiar código en la consola. El envío prepara el trabajo; el usuario inicia la escritura con un control explícito.

### Tareas

- [x] Definir un contrato de trabajo versionado: identificador, texto, rangos de formato, ajustes, límites y estados.
- [ ] Hacer una prueba técnica de comunicación entre Tauri y la extensión, antes de construir la interfaz completa.
- [ ] Evaluar Native Messaging como primera opción: requiere un host registrado y el permiso `nativeMessaging` de la extensión. Validar instalación, identificadores de extensión y compatibilidad por navegador. [Documentación oficial](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging).
- [ ] Resolver cómo el host se comunica con la instancia abierta de Human Typer; no asumir que el proceso del host es la aplicación gráfica.
- [x] Limitar el mensaje completo serializado a 8 MB, además del límite de 250.000 caracteres. El transporte elegido admite ese tamaño sin fragmentación.
- [x] Registrar en el plan técnico la elección final del transporte. Si Native Messaging resulta inviable, evaluar un puente local con emparejamiento y acceso restringido a la extensión.
- [x] Agregar recepción y coordinación de trabajos fuera del popup, para que cerrar el popup no pierda el trabajo.
- [x] Agregar “Enviar a la extensión”, estado de conexión y selector de pestaña con nombre, URL y tipo de editor.
- [x] Mostrar confirmación de recepción y distinguir “enviado”, “preparado”, “escribiendo”, “pausado”, “cancelado” y “error”.
- [x] Llevar inicio, pausa, cancelación y progreso de vuelta a la app, evitando trabajos simultáneos o duplicados.
- [x] Compartir la lógica de escritura web para evitar divergencias entre script de consola y extensión.
- [ ] Validar formatos en Docs; mostrar las limitaciones comprobadas del modo de escritura por eventos.
- [ ] Preparar instalación, actualización y desinstalación del puente en macOS y Windows.

### Criterios de aceptación

- [ ] El texto recibido coincide con el enviado, incluidos acentos, emoji, saltos y rangos de formato.
- [ ] Se conserva la configuración de velocidad, variación y pausas.
- [ ] Cerrar el popup no descarta el trabajo ni interrumpe su coordinación.
- [ ] Cambiar de pestaña no redirige la escritura a un destino diferente.
- [ ] Desconexión, extensión ausente, versión incompatible y recepción duplicada tienen un comportamiento definido y un mensaje útil.
- [ ] El contenido no se guarda permanentemente ni aparece en registros.
- [ ] La ruta completa se prueba en Chrome y Edge; Firefox se valida antes de anunciar compatibilidad con el puente.

### Archivos y componentes previstos

`chrome-extension/manifest.json`, `popup.js`, `popup.html`, nuevo coordinador de extensión, `src/components/WebCompanionModal.tsx`, `src/lib/webCompanion.ts`, contratos TypeScript y puente nativo en `src-tauri/`.

La prueba automatizada cubre el socket real, emparejamiento, recepción, progreso y controles. La aceptación completa con una extensión instalada en cada navegador sigue pendiente.

## Etapa 2 — Vista previa de importación

### Resultado para el usuario

Revisar qué se va a importar y elegir el contenido antes de reemplazar el editor o preparar una planilla.

### Tareas

- [x] Separar lectura del archivo, preparación de la vista previa y confirmación de importación.
- [x] Para DOCX/TXT, mostrar vista previa, cantidad de caracteres y explicación de estilos conservados u omitidos.
- [x] Advertir antes de reemplazar contenido existente; cancelar debe conservarlo intacto.
- [x] Para XLSX, listar las hojas del libro y permitir seleccionar cualquiera.
- [x] Mostrar una grilla con encabezados de filas y columnas y navegación para archivos grandes, sin renderizar todas las celdas de una vez.
- [x] Permitir seleccionar un rango de origen y mostrar sus dimensiones y cantidad de celdas.
- [x] Ofrecer incluir u omitir la fila de encabezados, conservando la posición de celdas vacías dentro del rango.
- [x] Separar valor original, fórmula, tipo y texto visible de cada celda; conservar estos datos para la futura API de Sheets.
- [x] Mantener el modo actual de transcripción como texto y explicar las conversiones, incluidos saltos dentro de celdas.
- [x] Validar límites sobre el archivo y el rango elegido antes de confirmar; definir un límite de tamaño para planillas.
- [x] Ante errores, conservar el documento o la planilla que ya estaban preparados.
- [ ] Incorporar estados de carga, cancelación y errores en español e inglés.

### Criterios de aceptación

- [x] Se puede importar un rango de la segunda o tercera hoja de un XLSX.
- [ ] La vista previa y el contenido confirmado coinciden, incluidas filas y celdas vacías.
- [ ] Cancelar o intentar importar un archivo corrupto no elimina el contenido anterior.
- [x] Números, fechas, fórmulas y ceros iniciales siguen disponibles en el modelo, aunque el modo de escritura use su representación textual.
- [ ] Archivos grandes tienen una vista previa fluida y no bloquean los controles.
- [ ] La importación confirmada puede enviarse por el canal de la etapa 1 cuando ese tipo de trabajo esté soportado; no presentar la escritura web de Sheets como implementada todavía.

### Archivos y componentes previstos

`src/lib/document.ts`, `src/lib/spreadsheet.ts`, `src/components/TextComposer.tsx`, `src/components/SpreadsheetImporter.tsx`, nuevos componentes de vista previa y modelo de importación.

Se comprobó en la interfaz la cancelación de DOCX sin reemplazar el editor y la importación de `Ventas!A2:C4` desde la segunda hoja, conservando códigos con ceros iniciales.

## Etapa 3 — API de Google Docs

### Resultado para el usuario

Conectar su cuenta, seleccionar o crear un documento y transferir contenido con estilos mediante Google, sin depender del foco de la ventana ni de atajos. Este modo se presenta como transferencia directa; la escritura humana continúa disponible por separado.

### Dependencias y decisiones

- Completar las etapas 1 y 2 y definir un modelo común de contenido.
- Configurar proyecto de Google Cloud, cliente OAuth de escritorio, pantalla de consentimiento y acceso de prueba.
- Determinar los requisitos de distribución y verificación antes de habilitar la conexión para todos los usuarios.
- Diseñar selección de archivos autorizados; pegar una URL no concede acceso automáticamente.

### Tareas

- [ ] Implementar autorización mediante navegador del sistema, PKCE y callback apropiado para escritorio. Evitar almacenar un secreto como si una app distribuida pudiera mantenerlo privado. [OAuth para apps de escritorio](https://developers.google.com/identity/protocols/oauth2/native-app).
- [ ] Implementar conexión, renovación de sesión, desconexión y manejo de permisos revocados.
- [ ] Guardar credenciales en el almacén seguro del sistema operativo; no compartir tokens con la extensión ni guardarlos en `localStorage`.
- [ ] Solicitar inicialmente acceso por archivo mediante `drive.file`, recomendado y admitido por la API de Docs, con un flujo para seleccionar o crear los archivos usados con la app. [Permisos de Docs](https://developers.google.com/workspace/docs/api/auth).
- [ ] Mostrar cuenta, documento y pestaña de documento elegidos, además de la operación prevista.
- [ ] Implementar primero crear documento nuevo y agregar contenido al final. Dejar reemplazo de contenido existente para una operación separada con vista previa del alcance.
- [ ] Traducir el modelo del editor a inserción de texto y actualización de estilos de texto y párrafo. La API admite estas operaciones mediante `batchUpdate`. [Formato de texto](https://developers.google.com/workspace/docs/api/how-tos/format-text).
- [ ] Incorporar título y subtítulo semánticos reales, conservando la compatibilidad del modo de atajos que usa encabezados 1 y 2.
- [ ] Definir conversión de posiciones por motor y verificar específicamente emoji, caracteres combinados y límites de rangos.
- [ ] Aplicar control de revisión para detectar ediciones concurrentes y evitar sobrescribir cambios ajenos. [Control de escritura](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate).
- [ ] Mostrar progreso por bloques, manejar cuotas y distinguir un fallo confirmado de una respuesta perdida tras una escritura potencialmente exitosa.
- [ ] Verificar el contenido insertado antes de reintentar una operación que pudiera duplicarlo.
- [ ] Leer el resultado y comprobar texto y estilos principales. Si faltan permisos para verificar, informar ese estado.
- [ ] Actualizar los avisos de privacidad: este modo transmite el contenido seleccionado a Google.

### Criterios de aceptación

- [ ] Se puede conectar y desconectar una cuenta sin dejar credenciales en almacenamiento inseguro.
- [ ] Crear o agregar contenido preserva encabezados y énfasis soportados, con Unicode correcto.
- [ ] La operación se dirige a la pestaña de documento seleccionada.
- [ ] Un conflicto de revisión detiene la operación y permite revisar el documento antes de continuar.
- [ ] Una falla de conexión y su recuperación no insertan bloques duplicados.
- [ ] La interfaz distingue transferencia directa, escritura humana y verificación pendiente.
- [ ] Se prueba con documentos de ensayo autorizados, sin modificar documentos personales durante las pruebas.

### Alcance posterior a esta etapa

Tablas, listas, enlaces, imágenes y perfiles de formato avanzados se incorporarán después de validar la transferencia básica. No forman parte del primer entregable de la API de Docs.

## Etapa 4 — API de Google Sheets

### Resultado para el usuario

Elegir una planilla, una hoja y una celda de destino; revisar el rango afectado y transferir el contenido importado preservando los tipos de datos acordados.

### Tareas

- [ ] Reutilizar la autorización y el almacenamiento seguro de la etapa 3; habilitar Sheets en el proyecto de Google Cloud.
- [ ] Mantener acceso por archivo con `drive.file`, también admitido por Sheets. Recordar que el permiso se aplica al archivo completo: la restricción al rango elegido debe implementarse en la app. [Permisos de Sheets](https://developers.google.com/workspace/sheets/api/scopes).
- [ ] Permitir seleccionar el archivo y listar las hojas de destino, con sus identificadores estables.
- [ ] Elegir una celda inicial, por ejemplo `Ventas!C5`, y calcular el rango afectado antes de escribir.
- [ ] Mostrar contenido existente dentro de ese rango y ofrecer escribir en un rango vacío, agregar después de los datos o reemplazar un rango explícitamente revisado.
- [ ] Definir tratamiento de celdas vacías: conservar las del destino o borrarlas expresamente; no confundir ambas operaciones.
- [ ] Implementar primero escritura a un rango fijo con lectura de verificación; incorporar después el agregado de filas con recuperación que evite duplicados.
- [ ] Permitir elegir valores o fórmulas y cómo interpretar los datos. `RAW` conserva valores sin interpretación de entrada; `USER_ENTERED` usa la interpretación de Sheets. Probar fechas, decimales y fórmulas con la configuración regional del archivo. [Lectura y escritura de valores](https://developers.google.com/workspace/sheets/api/guides/values).
- [ ] Conservar texto con ceros iniciales y distinguir números, porcentajes, fechas y resultados de fórmulas en la vista previa.
- [ ] Aplicar un conjunto inicial de formatos: encabezados, negrita y formatos numéricos. Usar operaciones de formato separadas de la escritura de valores. [Actualización de planillas](https://developers.google.com/workspace/sheets/api/guides/batchupdate).
- [ ] Manejar rangos protegidos, celdas combinadas, permisos insuficientes y necesidad de ampliar la grilla; informar el alcance antes de cambios estructurales.
- [ ] Dividir transferencias grandes en bloques y registrar el avance de la sesión en memoria.
- [ ] Ante una respuesta incierta, leer el rango antes de reintentar; no asumir que reintentar un agregado de filas es seguro.
- [ ] Leer los rangos escritos y comparar valores o fórmulas según el modo elegido, considerando normalizaciones legítimas de Sheets.

### Criterios de aceptación

- [ ] Se transfiere un rango de cualquier hoja del XLSX a una celda distinta de A1.
- [ ] La vista previa predice exactamente qué rango se modificará.
- [ ] Texto, números, fechas, porcentajes, fórmulas y ceros iniciales tienen resultados comprobados.
- [ ] Se respeta la política elegida para celdas vacías y contenido existente.
- [ ] Fuera del rango confirmado no se cambian valores ni formatos.
- [ ] Los errores de permisos, protección o conflicto no se presentan como éxito.
- [ ] Una interrupción permite revisar el avance y retomar sin duplicar filas.

## Validación y entregas

- [ ] Añadir pruebas de contratos, selección de rangos, conversión de posiciones, tipado de celdas y recuperación de fallos; usar dobles de API para los casos automáticos.
- [ ] Ejecutar `npm run check`, `npm run build` y las pruebas Rust correspondientes en cada etapa.
- [ ] Verificar manualmente los recorridos de navegador y Google con archivos de prueba, incluyendo cambios de foco, pérdida de conexión y ediciones concurrentes.
- [ ] Mantener español e inglés y comprobar que los controles se bloquean durante operaciones incompatibles.
- [ ] Documentar formatos soportados, límites, permisos y diferencias entre escritura humana y transferencia directa.
- [ ] Entregar una versión funcional por etapa, con notas de release que describan únicamente lo implementado y probado.
- [ ] Publicar versiones cuando se solicite, después de las verificaciones de la etapa; no fijar números o fechas antes de cerrar el alcance.

## Próximo paso de implementación

La prueba del puente se implementó con WebSocket en `127.0.0.1`, puerto dinámico y código de emparejamiento por sesión. Native Messaging se reemplazó por este transporte para evitar registrar hosts por navegador y fijar identificadores de extensiones instaladas como ZIP. El servidor solo acepta orígenes de extensión y verifica el código antes de admitir mensajes; no publica un puerto en la red.

Las pruebas automáticas cubren emparejamiento, rechazo de códigos incorrectos, entrega, duplicados y controles. Queda probar la extensión instalada con macOS/Windows y Chrome/Edge/Firefox; no se considera certificada esa compatibilidad todavía.

La importación ahora requiere confirmación y permite seleccionar hojas y rangos. Las solicitudes de API están preparadas como funciones puras, sin acceso a cuentas.

El responsable todavía no tiene un cliente OAuth: se acordó preparar la integración y documentar su configuración. Ver [Configuración de Google](CONFIGURACION_GOOGLE.md). Cada usuario final utilizará su propia cuenta desde la app; no deberá configurar Google Cloud. El siguiente paso de las etapas de API es incorporar OAuth, almacenamiento seguro y selección autorizada de archivos, primero para Docs y luego para Sheets.
