#!/usr/bin/env bash
# Corre dentro del emulador (lo llama diagnostico-android.yml). Nunca falla: todo queda en diag/.
OUT="$GITHUB_WORKSPACE/diag"
APK="$RUNNER_TEMP/app-release.apk"
LOG="$OUT/emulador.txt"
mkdir -p "$OUT"
{
  echo "== dispositivo"; adb devices; adb shell getprop ro.product.cpu.abilist
  echo "== apk"; ls -la "$APK"
  echo "== instalar"; adb install -r "$APK" 2>&1
  adb logcat -c
  echo "== abrir"; adb shell monkey -p mx.expertalia360.app -c android.intent.category.LAUNCHER 1 2>&1
  sleep 45
  echo "== proceso"; adb shell pidof mx.expertalia360.app && echo "LA APP SIGUE ABIERTA" || echo "LA APP SE CERRÓ"
} > "$LOG" 2>&1
adb exec-out screencap -p > "$OUT/pantalla.png" 2>/dev/null
adb logcat -d -b crash > "$OUT/crash.txt" 2>&1
adb logcat -d > "$OUT/logcat.txt" 2>&1
exit 0
