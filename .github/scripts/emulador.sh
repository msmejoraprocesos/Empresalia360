#!/usr/bin/env bash
# Arranca un emulador Android en el runner de GitHub y corre diag-emulador.sh. Todo queda en diag/.
OUT="$GITHUB_WORKSPACE/diag"; mkdir -p "$OUT"
exec > >(tee "$OUT/arranque.txt") 2>&1
set -x
SDK="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
ls -la /dev/kvm
SDKM="$SDK/cmdline-tools/latest/bin/sdkmanager"; AVDM="$SDK/cmdline-tools/latest/bin/avdmanager"
IMG="system-images;android-34;google_apis;x86_64"
yes | "$SDKM" --install "emulator" "platform-tools" "$IMG" > "$OUT/sdkmanager.txt" 2>&1 || true
# Crear el teléfono virtual a mano (avdmanager del runner es viejo para este sistema)
export ANDROID_AVD_HOME="$HOME/.android/avd"; mkdir -p "$ANDROID_AVD_HOME/prueba.avd"
export ANDROID_SDK_ROOT="$SDK"
cat > "$ANDROID_AVD_HOME/prueba.ini" <<INI
avd.ini.encoding=UTF-8
path=$ANDROID_AVD_HOME/prueba.avd
target=android-34
INI
cat > "$ANDROID_AVD_HOME/prueba.avd/config.ini" <<INI
avd.ini.encoding=UTF-8
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=2
image.sysdir.1=system-images/android-34/google_apis/x86_64/
tag.id=google_apis
hw.ramSize=3072
disk.dataPartition.size=4G
hw.lcd.width=1080
hw.lcd.height=2400
hw.lcd.density=420
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader_indirect
hw.keyboard=yes
PlayStore.enabled=false
INI
ls -la "$SDK/system-images/android-34/google_apis/x86_64/" | head
"$SDK/emulator/emulator" -avd prueba -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim -no-metrics > "$OUT/emulador-proceso.txt" 2>&1 &
export PATH="$SDK/platform-tools:$PATH"
timeout 600 adb wait-for-device
for i in $(seq 1 120); do
  [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break
  sleep 5
done
adb shell getprop sys.boot_completed
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
bash "$GITHUB_WORKSPACE/.github/scripts/diag-emulador.sh"
exit 0
