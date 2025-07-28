#!/bin/bash

# Pasos para completar la instalación de Stage Manager

echo "🔧 Completando instalación de Stage Manager..."

# 1. Compilar los schemas
echo "📦 Compilando schemas..."
cd ~/.local/share/gnome-shell/extensions/stage-manager@ac.extension/schemas
glib-compile-schemas .

# 2. Verificar que se creó el archivo compilado
if [ -f "gschemas.compiled" ]; then
    echo "✅ Schemas compilados correctamente"
else
    echo "❌ Error compilando schemas"
    exit 1
fi

# 3. Verificar estructura de archivos
echo "📁 Verificando estructura de archivos..."
cd ~/.local/share/gnome-shell/extensions/stage-manager@ac.extension/

echo "Archivos requeridos:"
echo "- metadata.json: $([ -f metadata.json ] && echo '✅' || echo '❌')"
echo "- extension.js: $([ -f extension.js ] && echo '✅' || echo '❌')"
echo "- stylesheet.css: $([ -f stylesheet.css ] && echo '✅' || echo '❌')"
echo "- prefs.js: $([ -f prefs.js ] && echo '✅' || echo '❌')"
echo "- schemas/gschemas.compiled: $([ -f schemas/gschemas.compiled ] && echo '✅' || echo '❌')"

# 4. Verificar que el UUID en metadata.json coincida
if [ -f metadata.json ]; then
    UUID_IN_FILE=$(grep -o '"uuid":[[:space:]]*"[^"]*"' metadata.json | cut -d'"' -f4)
    if [ "$UUID_IN_FILE" = "stage-manager@ac.extension" ]; then
        echo "✅ UUID correcto en metadata.json"
    else
        echo "⚠️  UUID en metadata.json necesita actualización"
        echo "   Actual: $UUID_IN_FILE"
        echo "   Requerido: stage-manager@ac.extension"
    fi
fi

# 5. Reiniciar GNOME Shell (solo funciona en X11)
echo "🔄 Para aplicar cambios:"
echo "   - En X11: Alt+F2 → escribir 'r' → Enter"
echo "   - En Wayland: Cerrar sesión y volver a iniciar"

# 6. Comandos para habilitar la extensión
echo ""
echo "🎛️ Para habilitar la extensión después del reinicio:"
echo "   gnome-extensions enable stage-manager@ac.extension"
echo ""
echo "⚙️ Para abrir preferencias:"
echo "   gnome-extensions prefs stage-manager@ac.extension"
echo ""
echo "📋 Para ver el estado:"
echo "   gnome-extensions list"
echo ""
echo "🔍 Para ver logs:"
echo "   journalctl -f | grep stage-manager"