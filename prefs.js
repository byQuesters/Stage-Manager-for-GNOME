/* prefs.js */
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk';

export default class StageManagerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Página General
        const generalPage = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(generalPage);

        // Grupo de Apariencia
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Apariencia',
            description: 'Configuración visual del Stage Manager',
        });
        generalPage.add(appearanceGroup);

        // Ancho de la barra lateral
        const sidebarWidthRow = new Adw.SpinRow({
            title: 'Ancho de la barra lateral',
            subtitle: 'Ancho en píxeles de la barra lateral',
            adjustment: new Gtk.Adjustment({
                lower: 200,
                upper: 400,
                step_increment: 10,
            }),
        });
        settings.bind('sidebar-width', sidebarWidthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(sidebarWidthRow);

        // Posición de la barra lateral
        const sidebarPositionRow = new Adw.ComboRow({
            title: 'Posición de la barra lateral',
            subtitle: 'Dónde mostrar la barra lateral',
            model: Gtk.StringList.new(['Izquierda', 'Derecha']),
            selected: settings.get_string('sidebar-position') === 'left' ? 0 : 1,
        });
        sidebarPositionRow.connect('notify::selected', (row) => {
            settings.set_string('sidebar-position', row.selected === 0 ? 'left' : 'right');
        });
        appearanceGroup.add(sidebarPositionRow);

        // Transparencia de la barra lateral
        const sidebarTransparencyRow = new Adw.SpinRow({
            title: 'Transparencia de la barra lateral',
            subtitle: '0.3 = muy transparente, 1.0 = opaco',
            adjustment: new Gtk.Adjustment({
                lower: 0.0,
                upper: 1.0,
                step_increment: 0.1,
            }),
            digits: 1,
        });
        settings.bind('sidebar-transparency', sidebarTransparencyRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(sidebarTransparencyRow);

        // Auto-ocultar barra lateral
        const autoHideRow = new Adw.SwitchRow({
            title: 'Ocultar automáticamente',
            subtitle: 'Ocultar la barra lateral cuando no se use',
        });
        settings.bind('sidebar-auto-hide', autoHideRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(autoHideRow);

        // Grupo de Comportamiento
        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Comportamiento',
            description: 'Configuración del comportamiento del Stage Manager',
        });
        generalPage.add(behaviorGroup);

        // Duración de animaciones
        const animationDurationRow = new Adw.SpinRow({
            title: 'Duración de animaciones',
            subtitle: 'Duración en segundos de las animaciones',
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: 1.0,
                step_increment: 0.05,
            }),
            digits: 2,
        });
        settings.bind('animation-duration', animationDurationRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(animationDurationRow);

        // Espaciado entre ventanas
        const windowSpacingRow = new Adw.SpinRow({
            title: 'Espaciado entre ventanas',
            subtitle: 'Espaciado en píxeles entre ventanas',
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 50,
                step_increment: 5,
            }),
        });
        settings.bind('window-spacing', windowSpacingRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(windowSpacingRow);

        // Agrupar automáticamente por aplicación
        const autoGroupRow = new Adw.SwitchRow({
            title: 'Agrupar por aplicación',
            subtitle: 'Agrupar automáticamente ventanas de la misma aplicación',
        });
        settings.bind('auto-group-by-app', autoGroupRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(autoGroupRow);

        // Número máximo de stages
        const maxStagesRow = new Adw.SpinRow({
            title: 'Máximo de stages',
            subtitle: 'Número máximo de stages que se pueden crear',
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 20,
                step_increment: 1,
            }),
        });
        settings.bind('max-stages', maxStagesRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(maxStagesRow);

        // Página de Atajos de Teclado
        const shortcutsPage = new Adw.PreferencesPage({
            title: 'Atajos de Teclado',
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        });
        window.add(shortcutsPage);

        // Grupo de atajos
        const shortcutsGroup = new Adw.PreferencesGroup({
            title: 'Atajos de Teclado',
            description: 'Configurar combinaciones de teclas para controlar Stage Manager',
        });
        shortcutsPage.add(shortcutsGroup);

        // Atajo para cambiar entre stages
        const switchStageRow = new Adw.ActionRow({
            title: 'Cambiar entre stages',
            subtitle: 'Navegar entre diferentes stages',
        });
        const switchStageButton = new Gtk.Button({
            label: settings.get_strv('hotkey-switch-stage')[0] || 'No asignado',
            valign: Gtk.Align.CENTER,
        });
        switchStageButton.connect('clicked', () => {
            this._showShortcutDialog(window, 'hotkey-switch-stage', switchStageButton, settings);
        });
        switchStageRow.add_suffix(switchStageButton);
        shortcutsGroup.add(switchStageRow);

        // Atajo para crear nuevo stage
        const newStageRow = new Adw.ActionRow({
            title: 'Crear nuevo stage',
            subtitle: 'Crear un nuevo stage vacío',
        });
        const newStageButton = new Gtk.Button({
            label: settings.get_strv('hotkey-new-stage')[0] || 'No asignado',
            valign: Gtk.Align.CENTER,
        });
        newStageButton.connect('clicked', () => {
            this._showShortcutDialog(window, 'hotkey-new-stage', newStageButton, settings);
        });
        newStageRow.add_suffix(newStageButton);
        shortcutsGroup.add(newStageRow);

        // Atajo para mover ventana
        const moveWindowRow = new Adw.ActionRow({
            title: 'Mover ventana activa',
            subtitle: 'Mover la ventana activa a otro stage',
        });
        const moveWindowButton = new Gtk.Button({
            label: settings.get_strv('hotkey-move-window')[0] || 'No asignado',
            valign: Gtk.Align.CENTER,
        });
        moveWindowButton.connect('clicked', () => {
            this._showShortcutDialog(window, 'hotkey-move-window', moveWindowButton, settings);
        });
        moveWindowRow.add_suffix(moveWindowButton);
        shortcutsGroup.add(moveWindowRow);

        // Página Avanzada
        const advancedPage = new Adw.PreferencesPage({
            title: 'Avanzado',
            icon_name: 'applications-system-symbolic',
        });
        window.add(advancedPage);

        // Grupo de características avanzadas
        const advancedGroup = new Adw.PreferencesGroup({
            title: 'Características Avanzadas',
            description: 'Opciones avanzadas y experimentales',
        });
        advancedPage.add(advancedGroup);

        // Mostrar iconos de aplicación
        const showIconsRow = new Adw.SwitchRow({
            title: 'Mostrar iconos de aplicación',
            subtitle: 'Mostrar iconos en los thumbnails de ventanas',
        });
        settings.bind('show-app-icons', showIconsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        advancedGroup.add(showIconsRow);

        // Difuminar stages inactivos
        const blurInactiveRow = new Adw.SwitchRow({
            title: 'Difuminar stages inactivos',
            subtitle: 'Aplicar efecto de difuminado a stages no activos (experimental)',
        });
        settings.bind('blur-inactive-stages', blurInactiveRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        advancedGroup.add(blurInactiveRow);

        // Integración con espacios de trabajo
        const workspaceIntegrationRow = new Adw.SwitchRow({
            title: 'Integración con espacios de trabajo',
            subtitle: 'Integrar con los espacios de trabajo de GNOME',
        });
        settings.bind('enable-workspace-integration', workspaceIntegrationRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        advancedGroup.add(workspaceIntegrationRow);

        // Tamaño de thumbnails
        const thumbnailSizeRow = new Adw.SpinRow({
            title: 'Tamaño de thumbnails',
            subtitle: 'Tamaño de los thumbnails de ventanas en píxeles',
            adjustment: new Gtk.Adjustment({
                lower: 150,
                upper: 300,
                step_increment: 25,
            }),
        });
        settings.bind('thumbnail-size', thumbnailSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        advancedGroup.add(thumbnailSizeRow);

        // Grupo de información
        const infoGroup = new Adw.PreferencesGroup({
            title: 'Información',
        });
        advancedPage.add(infoGroup);

        const aboutRow = new Adw.ActionRow({
            title: 'Stage Manager para GNOME',
            subtitle: 'Replica la funcionalidad del Stage Manager de macOS\nVersión 1.0',
        });
        
        const githubButton = new Gtk.Button({
            label: 'GitHub',
            valign: Gtk.Align.CENTER,
        });
        githubButton.connect('clicked', () => {
            Gtk.show_uri(null, 'https://github.com/questers/stage-manager-gnome', Gdk.CURRENT_TIME);
        });
        aboutRow.add_suffix(githubButton);
        infoGroup.add(aboutRow);
    }

    _showShortcutDialog(parent, settingKey, button, settings) {
        const dialog = new Gtk.Dialog({
            title: 'Configurar atajo de teclado',
            transient_for: parent,
            modal: true,
            use_header_bar: 1,
        });

        const content = dialog.get_content_area();
        content.set_spacing(12);
        content.set_margin_top(12);
        content.set_margin_bottom(12);
        content.set_margin_start(12);
        content.set_margin_end(12);

        const label = new Gtk.Label({
            label: 'Presiona la combinación de teclas deseada',
            wrap: true,
        });
        content.append(label);

        const shortcutLabel = new Gtk.Label({
            label: 'Esperando...',
            css_classes: ['title-2'],
        });
        content.append(shortcutLabel);

        const eventController = new Gtk.EventControllerKey();
        dialog.add_controller(eventController);

        eventController.connect('key-pressed', (controller, keyval, keycode, state) => {
            const mask = state & Gtk.accelerator_get_default_mod_mask();
            
            if (mask === 0 && (keyval === Gdk.KEY_Escape || keyval === Gdk.KEY_BackSpace)) {
                // Limpiar atajo
                settings.set_strv(settingKey, []);
                button.set_label('No asignado');
                dialog.close();
                return true;
            }

            if (keyval !== 0) {
                const accelerator = Gtk.accelerator_name(keyval, mask);
                if (accelerator && accelerator !== '') {
                    shortcutLabel.set_label(accelerator);
                    
                    // Configurar timeout para confirmar
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                        settings.set_strv(settingKey, [accelerator]);
                        button.set_label(accelerator);
                        dialog.close();
                        return false;
                    });
                }
            }
            return true;
        });

        // Botones del diálogo
        dialog.add_button('Cancelar', Gtk.ResponseType.CANCEL);
        const clearButton = dialog.add_button('Limpiar', Gtk.ResponseType.REJECT);
        clearButton.connect('clicked', () => {
            settings.set_strv(settingKey, []);
            button.set_label('No asignado');
            dialog.close();
        });

        dialog.show();
    }
}