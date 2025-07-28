/* extension.js */
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import GObject from 'gi://GObject';
import St from 'gi://St';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const ANIMATION_TIME = 250; // milisegundos
const SIDEBAR_WIDTH = 250;
const WINDOW_SPACING = 20;

class StageManagerExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._stageManager = null;
        this._settings = null;
        this._enabled = false;
        this._sidebar = null;
        this._currentStage = 0;
        this._stages = [];
        this._signals = [];
        this._timeouts = [];
        this._isUpdating = false;
    }

    enable() {
        try {
            console.log('Stage Manager: Habilitando extensión');
            
            // Inicializar configuración
            this._settings = this.getSettings();
            
            // Inicializar stages vacíos
            this._initializeStages();
            
            // Crear UI
            this._createStageManager();
            
            // Conectar señales de manera segura
            this._connectSignals();
            
            this._enabled = true;
            console.log('Stage Manager: Extensión habilitada correctamente');
            
        } catch (error) {
            console.error('Stage Manager: Error al habilitar:', error);
            this.disable();
        }
    }

    disable() {
        try {
            console.log('Stage Manager: Deshabilitando extensión');
            
            this._enabled = false;
            
            // Limpiar timeouts
            this._clearTimeouts();
            
            // Desconectar señales
            this._disconnectSignals();
            
            // Restaurar ventanas
            this._restoreAllWindows();
            
            // Destruir UI
            if (this._sidebar) {
                this._sidebar.destroy();
                this._sidebar = null;
            }
            
            if (this._stageManager) {
                this._stageManager.destroy();
                this._stageManager = null;
            }
            
            // Limpiar datos
            this._stages = [];
            this._currentStage = 0;
            
            console.log('Stage Manager: Extensión deshabilitada correctamente');
            
        } catch (error) {
            console.error('Stage Manager: Error al deshabilitar:', error);
        }
    }

    _initializeStages() {
        this._stages = [];
        this._currentStage = 0;
        
        // Crear stage inicial
        this._stages.push([]);
        
        // Obtener ventanas existentes de manera segura
        try {
            let windows = global.get_window_actors()
                .map(actor => actor.get_meta_window())
                .filter(window => this._shouldManageWindow(window));
            
            // Si hay ventanas, ponerlas en el primer stage
            if (windows.length > 0) {
                this._stages[0] = windows.slice();
            }
            
        } catch (error) {
            console.warn('Stage Manager: Error inicializando stages:', error);
        }
    }

    _shouldManageWindow(window) {
        if (!window) return false;
        
        try {
            return window.get_window_type() === Meta.WindowType.NORMAL &&
                   !window.is_skip_taskbar() &&
                   !window.is_override_redirect() &&
                   window.get_workspace() !== null;
        } catch (error) {
            console.warn('Stage Manager: Error verificando ventana:', error);
            return false;
        }
    }

    _createStageManager() {
        try {
            let monitor = Main.layoutManager.primaryMonitor;
            let topMargin = Math.floor(monitor.height * 0.1); // 10% margin top
            
            // Crear la barra lateral
            this._sidebar = new St.ScrollView({
                name: 'stage-sidebar',
                width: SIDEBAR_WIDTH,
                height: monitor.height - topMargin,
                x: 0,
                y: topMargin,
                style_class: 'stage-sidebar',
                overlay_scrollbars: true,
                can_focus: false
            });

            this._sidebarBox = new St.BoxLayout({
                vertical: true,
                style_class: 'stage-sidebar-box'
            });

            this._sidebar.add_child(this._sidebarBox);
            
            // Agregar a la UI principal
            Main.layoutManager.addChrome(this._sidebar, {
                affectsStruts: true,
                trackFullscreen: false
            });

            // Actualizar UI inicial
            this._scheduleUpdate();
            
        } catch (error) {
            console.error('Stage Manager: Error creando UI:', error);
        }
    }

    _connectSignals() {
        try {
            // Desconectar señales anteriores
            this._disconnectSignals();
            
            // Conectar señal de ventana creada
            let windowCreatedId = global.display.connect('window-created', (display, window) => {
                this._safeCallback(() => this._onWindowCreated(window));
            });
            this._signals.push([global.display, windowCreatedId]);
            
            // Conectar señal de ventana destruida
            let windowDestroyedId = global.window_manager.connect('destroy', (wm, windowActor) => {
                this._safeCallback(() => this._onWindowDestroyed(windowActor));
            });
            this._signals.push([global.window_manager, windowDestroyedId]);
            
            console.log('Stage Manager: Señales conectadas');
            
        } catch (error) {
            console.error('Stage Manager: Error conectando señales:', error);
        }
    }

    _disconnectSignals() {
        this._signals.forEach(([obj, id]) => {
            try {
                if (obj && id) {
                    obj.disconnect(id);
                }
            } catch (error) {
                console.warn('Stage Manager: Error desconectando señal:', error);
            }
        });
        this._signals = [];
    }

    _safeCallback(callback) {
        if (!this._enabled) return;
        
        try {
            callback();
        } catch (error) {
            console.error('Stage Manager: Error en callback:', error);
        }
    }

    _onWindowCreated(window) {
        if (!this._shouldManageWindow(window)) return;
        
        console.log('Stage Manager: Nueva ventana creada:', window.get_title());
        
        // Agregar al stage actual de manera segura
        if (!this._stages[this._currentStage]) {
            this._stages[this._currentStage] = [];
        }
        
        // Verificar que no esté ya en la lista
        if (!this._stages[this._currentStage].includes(window)) {
            this._stages[this._currentStage].push(window);
        }
        
        this._scheduleUpdate();
    }

    _onWindowDestroyed(windowActor) {
        try {
            let window = windowActor.get_meta_window();
            
            // Remover de todos los stages
            this._stages.forEach(stage => {
                let index = stage.indexOf(window);
                if (index > -1) {
                    stage.splice(index, 1);
                }
            });
            
            this._scheduleUpdate();
            
        } catch (error) {
            console.warn('Stage Manager: Error manejando destrucción de ventana:', error);
        }
    }

    _scheduleUpdate() {
        if (this._isUpdating) return;
        
        // Programar actualización para el próximo frame
        let timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (this._enabled) {
                this._updateUI();
            }
            return false; // No repetir
        });
        
        this._timeouts.push(timeoutId);
    }

    _updateUI() {
        if (!this._enabled || this._isUpdating) return;
        
        this._isUpdating = true;
        
        try {
            this._updateSidebar();
            this._applyStageLayout();
        } catch (error) {
            console.error('Stage Manager: Error actualizando UI:', error);
        } finally {
            this._isUpdating = false;
        }
    }

    _applyStageLayout() {
        try {
            let currentStageWindows = this._stages[this._currentStage] || [];
            
            // Procesar ventanas de manera segura
            global.get_window_actors().forEach(windowActor => {
                try {
                    let window = windowActor.get_meta_window();
                    if (this._shouldManageWindow(window)) {
                        if (!currentStageWindows.includes(window)) {
                            this._hideWindowSafe(windowActor);
                        } else {
                            this._showWindowSafe(windowActor);
                        }
                    }
                } catch (error) {
                    console.warn('Stage Manager: Error procesando ventana:', error);
                }
            });

            // Organizar ventanas visibles
            if (currentStageWindows.length > 0) {
                this._arrangeStageWindows(currentStageWindows);
            }
            
        } catch (error) {
            console.error('Stage Manager: Error aplicando layout:', error);
        }
    }

    _arrangeStageWindows(windows) {
        try {
            let monitor = Main.layoutManager.primaryMonitor;
            let topMargin = Math.floor(monitor.height * 0.1); // 10% margin top
            let workArea = {
                x: monitor.x + SIDEBAR_WIDTH,
                y: monitor.y + topMargin,
                width: monitor.width - SIDEBAR_WIDTH,
                height: monitor.height - topMargin
            };

            if (windows.length === 1) {
                // Una sola ventana
                let window = windows[0];
                this._moveWindowSafe(window, workArea.x, workArea.y, workArea.width, workArea.height);
            } else if (windows.length > 1) {
                // Múltiples ventanas en grid
                this._arrangeWindowsInGrid(windows, workArea);
            }
            
        } catch (error) {
            console.error('Stage Manager: Error organizando ventanas:', error);
        }
    }

    _arrangeWindowsInGrid(windows, workArea) {
        try {
            let cols = Math.ceil(Math.sqrt(windows.length));
            let rows = Math.ceil(windows.length / cols);
            
            let windowWidth = Math.floor((workArea.width - (cols + 1) * WINDOW_SPACING) / cols);
            let windowHeight = Math.floor((workArea.height - (rows + 1) * WINDOW_SPACING) / rows);

            windows.forEach((window, index) => {
                try {
                    let col = index % cols;
                    let row = Math.floor(index / cols);
                    
                    let x = workArea.x + WINDOW_SPACING + col * (windowWidth + WINDOW_SPACING);
                    let y = workArea.y + WINDOW_SPACING + row * (windowHeight + WINDOW_SPACING);
                    
                    this._moveWindowSafe(window, x, y, windowWidth, windowHeight);
                    
                } catch (error) {
                    console.warn('Stage Manager: Error posicionando ventana:', error);
                }
            });
            
        } catch (error) {
            console.error('Stage Manager: Error en grid:', error);
        }
    }

    _moveWindowSafe(window, x, y, width, height) {
        try {
            window.move_resize_frame(false, x, y, width, height);
        } catch (error) {
            console.warn('Stage Manager: Error moviendo ventana:', error);
        }
    }

    _hideWindowSafe(windowActor) {
        try {
            if (!windowActor.visible) return;
            
            windowActor.ease({
                opacity: 0,
                duration: ANIMATION_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    try {
                        windowActor.hide();
                    } catch (error) {
                        console.warn('Stage Manager: Error ocultando ventana:', error);
                    }
                }
            });
            
        } catch (error) {
            console.warn('Stage Manager: Error en animación de ocultar:', error);
        }
    }

    _showWindowSafe(windowActor) {
        try {
            if (windowActor.visible) return;
            
            windowActor.show();
            windowActor.opacity = 0;
            
            windowActor.ease({
                opacity: 255,
                duration: ANIMATION_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });
            
        } catch (error) {
            console.warn('Stage Manager: Error en animación de mostrar:', error);
        }
    }

    _switchToStage(stageIndex) {
        if (stageIndex < 0 || stageIndex >= this._stages.length) return;
        if (stageIndex === this._currentStage) return;
        
        console.log(`Stage Manager: Cambiando a stage ${stageIndex}`);
        
        this._currentStage = stageIndex;
        this._updateUI();
    }

    _createNewStage() {
        try {
            this._stages.push([]);
            this._switchToStage(this._stages.length - 1);
            console.log('Stage Manager: Nuevo stage creado');
        } catch (error) {
            console.error('Stage Manager: Error creando stage:', error);
        }
    }

    _updateSidebar() {
        if (!this._sidebarBox) return;
        
        try {
            this._sidebarBox.destroy_all_children();
            
            // Botón para nuevo stage
            let newStageButton = new St.Button({
                label: '+ Nuevo Stage',
                style_class: 'stage-button new-stage',
                can_focus: true
            });
            
            newStageButton.connect('clicked', () => {
                this._safeCallback(() => this._createNewStage());
            });
            
            this._sidebarBox.add_child(newStageButton);

            // Items de stages
            this._stages.forEach((stage, index) => {
                let stageItem = this._createStageItem(stage, index);
                this._sidebarBox.add_child(stageItem);
            });
            
        } catch (error) {
            console.error('Stage Manager: Error actualizando sidebar:', error);
        }
    }

    _createStageItem(stageWindows, stageIndex) {
        try {
            let stageItem = new St.Button({
                style_class: `stage-item ${stageIndex === this._currentStage ? 'active' : ''}`,
                can_focus: true,
                track_hover: true
            });

            let stageBox = new St.BoxLayout({
                vertical: true,
                style_class: 'stage-item-box'
            });

            // Título del stage
            let stageLabel = new St.Label({
                text: `Stage ${stageIndex + 1}`,
                style_class: 'stage-label'
            });
            stageBox.add_child(stageLabel);

            // Crear miniaturas de las ventanas/aplicaciones
            if (stageWindows.length > 0) {
                let thumbnailsBox = new St.BoxLayout({
                    vertical: true,
                    style_class: 'stage-thumbnails'
                });

                stageWindows.forEach(window => {
                    let thumbnail = this._createWindowThumbnail(window);
                    if (thumbnail) {
                        thumbnailsBox.add_child(thumbnail);
                    }
                });

                stageBox.add_child(thumbnailsBox);
            } else {
                // Stage vacío
                let emptyLabel = new St.Label({
                    text: 'Vacío',
                    style_class: 'stage-empty-label'
                });
                stageBox.add_child(emptyLabel);
            }

            stageItem.set_child(stageBox);

            // Click para cambiar stage
            stageItem.connect('clicked', () => {
                this._safeCallback(() => this._switchToStage(stageIndex));
            });

            return stageItem;
            
        } catch (error) {
            console.error('Stage Manager: Error creando item de stage:', error);
            return new St.Label({ text: `Stage ${stageIndex + 1}` });
        }
    }

    _createWindowThumbnail(window) {
        try {
            if (!window || !this._shouldManageWindow(window)) {
                return null;
            }

            let app = Shell.WindowTracker.get_default().get_window_app(window);
            if (!app) return null;

            let thumbnail = new St.Button({
                style_class: 'window-thumbnail',
                can_focus: true,
                track_hover: true
            });

            // Crear miniatura con solo el icono de la aplicación
            let thumbnailBox = new St.BoxLayout({
                vertical: true,
                style_class: 'window-thumbnail-box'
            });

            // Icono de la aplicación más grande para ser visible
            let icon = app.create_icon_texture(48);
            if (icon) {
                icon.set_style_class('window-thumbnail-icon');
                thumbnailBox.add_child(icon);
            }

            thumbnail.set_child(thumbnailBox);

            // Click para activar la ventana
            thumbnail.connect('clicked', () => {
                this._safeCallback(() => {
                    try {
                        window.activate(global.get_current_time());
                    } catch (error) {
                        console.warn('Stage Manager: Error activando ventana:', error);
                    }
                });
            });

            return thumbnail;
            
        } catch (error) {
            console.warn('Stage Manager: Error creando thumbnail:', error);
            return null;
        }
    }

    _clearTimeouts() {
        this._timeouts.forEach(id => {
            try {
                GLib.source_remove(id);
            } catch (error) {
                console.warn('Stage Manager: Error limpiando timeout:', error);
            }
        });
        this._timeouts = [];
    }

    _restoreAllWindows() {
        try {
            global.get_window_actors().forEach(windowActor => {
                try {
                    windowActor.show();
                    windowActor.opacity = 255;
                    windowActor.scale_x = 1.0;
                    windowActor.scale_y = 1.0;
                } catch (error) {
                    console.warn('Stage Manager: Error restaurando ventana:', error);
                }
            });
        } catch (error) {
            console.error('Stage Manager: Error restaurando ventanas:', error);
        }
    }
}

export default class StageManagerGnomeExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._extension = null;
    }

    enable() {
        try {
            this._extension = new StageManagerExtension(this.metadata);
            this._extension.enable();
        } catch (error) {
            console.error('Stage Manager: Error crítico al habilitar:', error);
            if (this._extension) {
                this._extension.disable();
                this._extension = null;
            }
        }
    }

    disable() {
        try {
            if (this._extension) {
                this._extension.disable();
                this._extension = null;
            }
        } catch (error) {
            console.error('Stage Manager: Error al deshabilitar:', error);
        }
    }
}