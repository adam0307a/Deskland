Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
!include "FileFunc.nsh"
!include "StrFunc.nsh"
${UnStrStr}
Name "DiyarDesk"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\DiyarDesk"
InstallDirRegKey HKCU "Software\DesklandPreview\Installer" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "DiyarDesk"
VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1033 "ProductName" "DiyarDesk"
VIAddVersionKey /LANG=1033 "FileDescription" "DiyarDesk Installer"
VIAddVersionKey /LANG=1033 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1033 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=1033 "LegalCopyright" "Copyright 2026 DiyarDesk & Deskland authors"
!define MUI_ABORTWARNING
!define MUI_ICON "${PAYLOAD}\host\bin\DesklandPreview.ico"
!define MUI_UNICON "${PAYLOAD}\host\bin\DesklandPreview.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\host\bin\Deskland.exe"
!define MUI_FINISHPAGE_RUN_TEXT "$(LaunchDeskland)"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${PAYLOAD}\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"
LangString LaunchDeskland ${LANG_SIMPCHINESE} "启动 DiyarDesk"
LangString LaunchDeskland ${LANG_ENGLISH} "Launch DiyarDesk"
LangString AppFiles ${LANG_SIMPCHINESE} "DiyarDesk 主程序与主题"
LangString AppFiles ${LANG_ENGLISH} "DiyarDesk application and themes"
LangString DesktopShortcut ${LANG_SIMPCHINESE} "桌面快捷方式"
LangString DesktopShortcut ${LANG_ENGLISH} "Desktop shortcut"
LangString NeedX64 ${LANG_SIMPCHINESE} "需要 64 位 Windows 10 或更高版本。"
LangString NeedX64 ${LANG_ENGLISH} "64-bit Windows 10 or later is required."
LangString CloseFailed ${LANG_SIMPCHINESE} "请退出正在运行的 DiyarDesk 后重试。"
LangString CloseFailed ${LANG_ENGLISH} "Please exit DiyarDesk and retry."
LangString RuntimeFailed ${LANG_SIMPCHINESE} "WebView2 安装未完成。请连接网络，安装 Microsoft Edge WebView2 Runtime 后重试。"
LangString RuntimeFailed ${LANG_ENGLISH} "WebView2 setup did not complete. Connect to the internet, install Microsoft Edge WebView2 Runtime, and retry."
LangString InstallingRuntime ${LANG_SIMPCHINESE} "正在安装 Microsoft Edge WebView2 Runtime（需要联网）..."
LangString InstallingRuntime ${LANG_ENGLISH} "Installing Microsoft Edge WebView2 Runtime (internet required)..."

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "$(NeedX64)"
    SetErrorLevel 1
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "$(NeedX64)"
    SetErrorLevel 1
    Abort
  ${EndIf}
  SetShellVarContext current
  SetRegView 64
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Function CheckRuntime
  StrCpy $0 ""
  SetRegView 32
  ReadRegStr $0 HKLM "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 == ""
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
  SetRegView 64
  ${If} $0 == ""
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
FunctionEnd

Section "$(AppFiles)" SecApp
  SectionIn RO
  Call CheckRuntime
  ${If} $0 == ""
  ${OrIf} $0 == "0.0.0.0"
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File /oname=MicrosoftEdgeWebview2Setup.exe "${BOOTSTRAPPER}"
    DetailPrint "$(InstallingRuntime)"
    ExecWait '"$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe" /silent /install' $1
    Call CheckRuntime
    ${If} $0 == ""
    ${OrIf} $0 == "0.0.0.0"
      MessageBox MB_ICONSTOP "$(RuntimeFailed)"
      SetErrorLevel 2
      Abort
    ${EndIf}
  ${EndIf}
  IfFileExists "$INSTDIR\host\bin\Deskland.exe" 0 closed
  ExecWait '"$INSTDIR\host\bin\Deskland.exe" --exit-installed' $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP "$(CloseFailed)"
    SetErrorLevel 3
    Abort
  ${EndIf}
  closed:
  !include "${FILE_LIST}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\DiyarDesk"
  CreateShortcut "$SMPROGRAMS\DiyarDesk\DiyarDesk.lnk" "$INSTDIR\host\bin\Deskland.exe"
  CreateShortcut "$SMPROGRAMS\DiyarDesk\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\DesklandPreview\Installer" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "DisplayName" "DiyarDesk"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "Publisher" "DiyarDesk contributors"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "DisplayIcon" "$INSTDIR\host\bin\Deskland.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "QuietUninstallString" '$\"$INSTDIR\Uninstall.exe$\" /S'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview" "EstimatedSize" $0
SectionEnd

Function un.onInit
  SetShellVarContext current
  SetRegView 64
FunctionEnd
Section "Uninstall"
  IfFileExists "$INSTDIR\host\bin\Deskland.exe" 0 unclosed
  ExecWait '"$INSTDIR\host\bin\Deskland.exe" --exit-installed' $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP "$(CloseFailed)"
    SetErrorLevel 3
    Abort
  ${EndIf}
  unclosed:
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DesklandPreview"
  ${UnStrStr} $1 $0 '$\"$INSTDIR\host\bin\Deskland.exe$\"'
  ${If} $1 != ""
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DesklandPreview"
  ${EndIf}
  !include "${DELETE_LIST}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\DiyarDesk\DiyarDesk.lnk"
  Delete "$SMPROGRAMS\DiyarDesk\Uninstall.lnk"
  RMDir "$SMPROGRAMS\DiyarDesk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DesklandPreview"
  DeleteRegKey HKCU "Software\DesklandPreview\Installer"
SectionEnd
