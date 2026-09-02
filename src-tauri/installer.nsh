!macro customInstall
  ; Registrar la extensión de Human Typer en Google Chrome y Microsoft Edge
  WriteRegStr HKCU "Software\Google\Chrome\Extensions\humantyper" "path" "$INSTDIR\resources\chrome-extension"
  WriteRegStr HKCU "Software\Microsoft\Edge\Extensions\humantyper" "path" "$INSTDIR\resources\chrome-extension"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Google\Chrome\Extensions\humantyper"
  DeleteRegKey HKCU "Software\Microsoft\Edge\Extensions\humantyper"
!macroend
