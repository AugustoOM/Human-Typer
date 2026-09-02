!macro customInstall
  ; Registrar la extensión de Human Typer en Google Chrome, Microsoft Edge y Mozilla Firefox
  WriteRegStr HKCU "Software\Google\Chrome\Extensions\humantyper" "path" "$INSTDIR\resources\chrome-extension"
  WriteRegStr HKCU "Software\Microsoft\Edge\Extensions\humantyper" "path" "$INSTDIR\resources\chrome-extension"
  WriteRegStr HKCU "Software\Mozilla\Firefox\Extensions" "humantyper@desktop.app" "$INSTDIR\resources\chrome-extension"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Google\Chrome\Extensions\humantyper"
  DeleteRegKey HKCU "Software\Microsoft\Edge\Extensions\humantyper"
  DeleteRegValue HKCU "Software\Mozilla\Firefox\Extensions" "humantyper@desktop.app"
!macroend
