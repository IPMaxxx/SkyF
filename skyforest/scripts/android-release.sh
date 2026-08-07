#!/usr/bin/env bash
#
# Релизный AAB нативной оболочки (Capacitor). Запускать из каталога приложения:
# skyforest/ (SkyForest), apps/mushroom-checker/, apps/wayback/ — у всех трёх
# проект Gradle лежит в ./android, поэтому скрипт один на все флейворы.
#
# Смысл обёртки — JDK. Capacitor 8 (AGP 8.13) собирается только на Java 21+, а в
# PATH и в JAVA_HOME на машине разработки стоит 17 от Homebrew: Gradle падает на
# конфигурации с «Unsupported class file major version». Штатный
# /usr/libexec/java_home тут не помогает — JDK из Homebrew не зарегистрированы в
# /Library/Java/JavaVirtualMachines, и он отвечает «Unable to locate a Java
# Runtime». Поэтому подбираем JDK сами и не полагаемся на окружение.
set -euo pipefail

android_dir="${1:-android}"

# Мажорная версия JDK по пути его установки; пусто, если java там не запускается.
java_major() {
  local home="$1"
  [ -x "$home/bin/java" ] || return 0
  "$home/bin/java" -version 2>&1 |
    awk -F'"' '/version "/ { split($2, v, "."); print v[1]; exit }'
}

pick_jdk() {
  # Уважаем уже настроенное окружение, но только если там ровно 21. «21 и новее»
  # тут не годится: Gradle 8.14 из этого репозитория не запускается на слишком
  # свежих JDK (на машине рядом лежит и openjdk@26), и подхватить его молча —
  # ровно та же неотлаживаемая ошибка, от которой скрипт и написан. При переезде
  # на новый Gradle поднять версию здесь.
  local current="${JAVA_HOME:-}" from_java_home
  if [ "$(java_major "$current")" = "21" ]; then
    echo "$current"
    return
  fi
  from_java_home="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
  if [ -n "$from_java_home" ]; then
    echo "$from_java_home"
    return
  fi
  echo "/opt/homebrew/opt/openjdk@21"
}

JAVA_HOME="$(pick_jdk)"
export JAVA_HOME

if [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "Нужен JDK 21: не нашёл его ни в JAVA_HOME, ни через java_home, ни в $JAVA_HOME." >&2
  echo "Поставьте его: brew install openjdk@21" >&2
  exit 1
fi

echo "JAVA_HOME=$JAVA_HOME (java $(java_major "$JAVA_HOME"))"
exec "$android_dir/gradlew" -p "$android_dir" bundleRelease
