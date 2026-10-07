# Configuración de Google para Human Typer

## Experiencia prevista del usuario final

Cada usuario conecta su propia cuenta de Google desde la app y selecciona los archivos de su Drive que desea usar. No necesita crear proyectos, ingresar claves API ni compartir contraseñas. No se utilizará una cuenta de servicio ni una cuenta de Google compartida por todos los usuarios.

La escritura humana local continúa disponible sin conectar una cuenta. La transferencia por API es un modo opcional que envía el contenido seleccionado a Google.

## Estado de implementación

- El puente app–extensión y la vista previa de importación están implementados; su validación real por navegador y plataforma sigue pendiente.
- `src/lib/google/docs.ts` prepara las solicitudes de inserción y formato, con destino por pestaña, conversión de posiciones Unicode a UTF-16 y control de revisión.
- `src/lib/google/sheets.ts` prepara rangos fijos, valores o fórmulas y tratamiento explícito de celdas vacías.
- Estos módulos son preparadores de solicitudes: no hacen llamadas de red ni inician sesión.
- Falta el cliente OAuth de escritorio, la autorización nativa, el almacenamiento seguro de credenciales, el selector de Drive y la ejecución/verificación de las APIs. El botón de conexión no se presenta como funcional mientras estos componentes falten.

## Configuración a cargo del responsable de la aplicación

1. Crear un proyecto de Google Cloud para Human Typer.
2. Habilitar Google Drive API y Google Docs API. Habilitar Google Sheets API cuando comience la etapa correspondiente.
3. Configurar Google Auth Platform: nombre de la aplicación, correo de soporte, audiencia y datos de contacto.
4. Crear un cliente OAuth de tipo **Aplicación de escritorio** y conservar su Client ID público para integrarlo a la distribución de Human Typer.
5. Durante desarrollo, agregar las cuentas de ensayo como usuarios de prueba y trabajar con archivos de prueba.
6. Para seleccionar documentos existentes con permisos por archivo, habilitar Google Picker API y preparar la configuración de Picker y las restricciones de la clave correspondiente. Confirmar el recorrido de Picker para la app de escritorio antes de elegir sus orígenes definitivos.
7. Revisar requisitos de verificación y publicación de OAuth antes de distribuir el inicio de sesión al público.

El Client ID identifica la app y puede incluirse en su distribución. No se deben pedir contraseñas ni tokens al usuario por chat. La configuración del desarrollador no debe aparecer como una obligación del usuario final.

Referencias: [configuración de consentimiento](https://developers.google.com/workspace/guides/configure-oauth-consent), [OAuth para escritorio](https://developers.google.com/identity/protocols/oauth2/native-app), [Google Picker](https://developers.google.com/drive/picker/guides/overview).

## Autorización prevista

- Abrir el navegador del sistema para iniciar sesión; usar PKCE, estado aleatorio, verificación del callback y expiración del intento.
- Solicitar `https://www.googleapis.com/auth/drive.file` para los archivos creados o autorizados para Human Typer. Este permiso no permite listar automáticamente todo el Drive: los documentos existentes deben autorizarse mediante un selector adecuado; pegar una URL no concede acceso.
- Las acciones con Docs y Sheets requieren permisos de edición del archivo elegido. Se puede conectar una cuenta con documentos de solo lectura, pero las escrituras deben explicar esa restricción.
- Si se pretende limitar estrictamente la selección a archivos propiedad del usuario, verificar la propiedad en el selector/cliente además del permiso OAuth. No asumir que iniciar sesión excluye los documentos compartidos.
- Guardar los tokens mediante el almacén seguro de macOS o Windows. No guardarlos en `localStorage`, archivos de texto ni registros; no enviarlos a la extensión.
- Mostrar la cuenta conectada y permitir desconexión, borrado local de credenciales y revocación cuando corresponda.

Referencias: [permisos de Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [permisos de Docs](https://developers.google.com/workspace/docs/api/auth), [permisos de Sheets](https://developers.google.com/workspace/sheets/api/scopes).

## Trabajo siguiente, en orden

1. Completar el registro del cliente OAuth y la prueba de inicio de sesión en macOS y Windows.
2. Implementar selección/autorización de archivos y creación o inserción al final de un Google Doc.
3. Ejecutar y verificar solicitudes de Docs con control de revisión, gestionando respuestas inciertas sin duplicar contenido.
4. Agregar selección de planilla, hoja y rango de destino en Sheets.
5. Ejecutar y verificar valores/fórmulas; agregar después formatos numéricos y recuperación de transferencias grandes.

No activar operaciones de reemplazo ni reintentos automáticos de escritura hasta comprobar su alcance y recuperación con archivos de ensayo.
