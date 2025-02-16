/**
 * @file memento-editor.ts
 * @copyright 2024, Firaxis Games
 * @description Allows selection of mementos
 */
import FxsActivatable from "/core/ui/components/fxs-activatable.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import FocusManager from "/core/ui/input/focus-manager.js";
import NavTray from "/core/ui/navigation-tray/model-navigation-tray.js";
import Panel from "/core/ui/panel-support.js";
import { CreateGameModel } from "/core/ui/shell/create-panels/create-game-model.js";
import { getMementoData } from "/core/ui/shell/create-panels/leader-select-model.js";
import Databind from "/core/ui/utilities/utilities-core-databinding.js";

export class Memento extends FxsActivatable {
    set mementoData(value) {
        this._mementoData = value;
        this.updateData();
    }
    get mementoData() {
        return this._mementoData;
    }
    set selected(value) {
        this._selected = value;
        this.selectionRing.classList.toggle("img-circle-selected", value);
    }
    get selected() {
        return this._selected;
    }
    constructor(root) {
        super(root);
        this.iconEle = document.createElement("div");
        this.focusRing = document.createElement("div");
        this.selectionRing = document.createElement("div");
        this._selected = false;
        this.Root.classList.add("w-19", "h-19", "m-1\\.25", "relative", "group");
        this.iconEle.classList.add("absolute", "bg-cover", "inset-1");
        this.Root.appendChild(this.iconEle);
        this.selectionRing.classList.add("absolute", "-inset-1");
        this.Root.appendChild(this.selectionRing);
        this.focusRing.classList.add("absolute", "inset-1", "memento-circle-focus", "opacity-0", "group-focus\\:opacity-100", "group-hover\\:opacity-100");
        this.Root.appendChild(this.focusRing);
        this.Root.setAttribute("data-audio-group-ref", "memento-item");
        this.Root.setAttribute("data-audio-activate-ref", "data-audio-memento-selected");
    }
    setHidden(isHidden) {
        this.Root.classList.toggle('hidden', isHidden);
    }
    setAvailable(isAvailable) {
        this.Root.classList.toggle('opacity-50', !isAvailable);
    }
    updateData() {
        if (this._mementoData) {
            if (this._mementoData.mementoIcon) {
                this.iconEle.style.backgroundImage = `url("fs://game/${this._mementoData.mementoIcon}")`;
            }
            else {
                this.iconEle.style.backgroundImage = `url("fs://game/mem_min_leader.png")`;
            }
            const name = Locale.stylize(this._mementoData.mementoName);
            const desc = Locale.compose(this._mementoData.functionalTextDesc);
            const flavor = Locale.stylize(this._mementoData.flavorTextDesc);
            const unlock = Locale.stylize(this._mementoData.unlockReason);
            if (this._mementoData.displayType == DisplayType.DISPLAY_LOCKED) {
                this.Root.setAttribute("data-tooltip-content", `[n][style:font-title-lg]${name}[/style][n][style:font-body-base]${desc}[/style][n][style:font-body-sm]${flavor}[/style][n][style:font-body-sm]${unlock}[/style]`);
            }
            else if (this._mementoData.displayType == DisplayType.DISPLAY_UNLOCKED) {
                this.Root.setAttribute("data-tooltip-content", `[n][style:font-title-lg]${name}[/style][n][style:font-body-base]${desc}[/style][n][style:font-body-sm]${flavor}[/style]`);
            }
            // Display hidden
            else { }
        }
    }
}
Controls.define('memento-item', {
    createInstance: Memento,
    description: 'A selectable mementos',
    tabIndex: -1
});
export class MementoEditor extends Panel {
    constructor(root) {
        super(root);
        
        // Add CSS style for highlighted memento
        const style = document.createElement('style');
        style.textContent = `
            .img-circle-right-clicked {
                border: 2px solid #ff6b00 !important;
                box-shadow: 0 0 10px #ff6b00 !important;
            }
        `;
        document.head.appendChild(style);
        
        // Store reference to unlockFilter component
        this.unlockFilter = null;
        
        // Use the game's input system instead of DOM events
        this.engineInputListener = this.onEngineInput.bind(this);

        // Remove direct DOM event listeners
        // Add engineInput handling instead
        this.engineInputListener = this.onEngineInput.bind(this);
        
        // Add new property for unlock filter
        this.showOnlyUnlocked = false;
        this.searchQuery = '';
        
        this.headerText = document.createElement("fxs-header");
        this.mementoSlotEles = [];
        this.mementoEles = [];
        this.confirmButton = document.createElement("fxs-button");
        this.cancelButton = document.createElement("fxs-button");
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.mementosData = Online.Metaprogression.getMementosData();
        this.sortMementos();
        this.Root.classList.add("absolute", "fullscreen", "flex", "flex-col", "justify-center", "items-center");
        const fragment = document.createDocumentFragment();
        const outerFrame = document.createElement("fxs-frame");
        outerFrame.setAttribute("data-content-class", "items-center");
        outerFrame.classList.add("memento-editor-frame", "w-200", "my-16", "flex-auto");
        fragment.appendChild(outerFrame);
        this.outerSlot = document.createElement("fxs-vslot");
        this.outerSlot.classList.add("items-center", "h-full");
        outerFrame.appendChild(this.outerSlot);
        
        // First create and append header
        this.headerText.classList.add("uppercase", "font-title-xl", "leading-loose", "-mt-5", "mb-5");
        this.headerText.setAttribute("filigree-style", "h2");
        this.outerSlot.appendChild(this.headerText);

        // Create and append memento slots section with navigation
        const mementoSlotsContainer = document.createElement("fxs-hslot");
        mementoSlotsContainer.classList.add("flex", "flex-row", "items-start");
        this.outerSlot.appendChild(mementoSlotsContainer);

        const leftNav = document.createElement("fxs-nav-help");
        leftNav.classList.add("self-center");
        leftNav.setAttribute("action-key", "inline-cycle-prev");
        leftNav.textContent = "<";
        mementoSlotsContainer.appendChild(leftNav);

        // Add memento slots
        for (const mementoSlotData of getMementoData()) {
            const mementoSlot = document.createElement("memento-slot");
            mementoSlot.componentCreatedEvent.on(component => component.slotData = mementoSlotData);
            mementoSlot.addEventListener("action-activate", this.handleSlotSelected.bind(this, mementoSlot));
            mementoSlot.addEventListener("focus", this.handleSlotSelected.bind(this, mementoSlot));
            this.mementoSlotEles.push(mementoSlot);
            mementoSlotsContainer.appendChild(mementoSlot);
        }

        const rightNav = document.createElement("fxs-nav-help");
        rightNav.setAttribute("action-key", "inline-cycle-next");
        rightNav.classList.add("self-center");
        rightNav.textContent = ">";
        mementoSlotsContainer.appendChild(rightNav);

        // Add first divider
        const topDivider = document.createElement("div");
        topDivider.classList.add("memento-shell-line-divider", "h-2", "my-4");
        this.outerSlot.appendChild(topDivider);

        // Create and append search and filter container
        const searchAndFilterContainer = document.createElement('div');
        searchAndFilterContainer.classList.add('flex', 'flex-col', 'items-center', 'w-full', 'mb-2', 'gap-6'); // Changed mb-4 to mb-2 and gap-4 to gap-6

        // Add search input with reduced width and centered
        const searchInput = document.createElement('fxs-textbox');
        searchInput.classList.add('w-80', 'font-body-base'); // Kept w-60 for short width
        searchInput.setAttribute('tabindex', '-1');
        searchInput.setAttribute('placeholder', Locale.compose('Search') || 'Search mementos...');
        searchInput.setAttribute('data-audio-group-ref', 'memento-search');
        searchInput.addEventListener('component-value-changed', (event) => {
            this.searchQuery = event.detail.value.toString().toLowerCase();
            this.filterMementos();
        });
        searchAndFilterContainer.appendChild(searchInput);
        this.searchInput = searchInput;

        // Add checkbox container, centered
        const filterContainer = document.createElement('div');
        filterContainer.classList.add('flex', 'items-center', 'mt-3','gap-1'); 

        // Create checkbox and label
        const unlockFilter = document.createElement('fxs-checkbox');
        unlockFilter.classList.add('font-body-base');
        unlockFilter.setAttribute('data-audio-group-ref', 'memento-filter');
        unlockFilter.setAttribute('tabindex', '-1');
        unlockFilter.addEventListener('component-value-changed', (event) => {
            this.showOnlyUnlocked = event.detail.value;
            this.filterMementos();
        });
        this.unlockFilter = unlockFilter; // Store reference

        // Create label text element
        const filterLabel = document.createElement('span');
        filterLabel.classList.add('font-body-base', 'text-white');
        filterLabel.textContent = 'Show Unlocked Only';

        // Add checkbox and label to container
        filterContainer.appendChild(unlockFilter);
        filterContainer.appendChild(filterLabel);
        searchAndFilterContainer.appendChild(filterContainer);

        // Add search and filter container
        this.outerSlot.appendChild(searchAndFilterContainer);

        // Add second divider
        const bottomDivider = document.createElement("div");
        bottomDivider.classList.add("memento-shell-line-divider", "h-2", "my-4");
        this.outerSlot.appendChild(bottomDivider);

        // Create and append memento list container
        const innerFrame = document.createElement("fxs-inner-frame");
        innerFrame.setAttribute("data-content-class", "items-center");
        innerFrame.classList.add("w-174", "flex-auto", "relative");
        this.outerSlot.appendChild(innerFrame);

        const middleDecor = document.createElement("div");
        middleDecor.classList.add("absolute", "-top-1\\.5", "img-popup-middle-decor");
        innerFrame.appendChild(middleDecor);
        const scrollbar = document.createElement("fxs-scrollable");
        scrollbar.classList.add("ml-6", "mr-4", "absolute", "inset-0");
        innerFrame.appendChild(scrollbar);
        const mementosContainer = document.createElement("fxs-spatial-slot");
        mementosContainer.classList.add("flex", "flex-row", "flex-wrap");
        scrollbar.appendChild(mementosContainer);
        for (const mementoData of this.mementosData) {
            const memento = document.createElement("memento-item");
            memento.componentCreatedEvent.on((component) => component.mementoData = mementoData);
            memento.addEventListener("action-activate", this.handleMementoSelected.bind(this, memento));
            this.mementoEles.push(memento);
            mementosContainer.appendChild(memento);
        }
        const bottomControls = document.createElement("div");
        bottomControls.classList.add("flex", "flex-row", "mt-6");
        this.outerSlot.appendChild(bottomControls);
        this.confirmButton.classList.add("mx-4", "min-w-100");
        this.confirmButton.setAttribute("caption", "LOC_EDIT_MEMENTOS_CONFIRM");
        this.confirmButton.addEventListener("action-activate", this.confirmSelections.bind(this));
        Databind.classToggle(this.confirmButton, 'hidden', "{{g_NavTray.isTrayRequired}}");
        bottomControls.appendChild(this.confirmButton);
        this.cancelButton.classList.add("mx-4", "min-w-100");
        this.cancelButton.setAttribute("caption", "LOC_EDIT_MEMENTOS_CANCEL");
        this.cancelButton.setAttribute("action-key", "inline-cancel");
        this.cancelButton.addEventListener("action-activate", this.cancelSelections.bind(this));
        Databind.classToggle(this.cancelButton, 'hidden', "{{g_NavTray.isTrayRequired}}");
        bottomControls.appendChild(this.cancelButton);
        this.Root.appendChild(fragment);
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "memento-editor");

        // Instead of using MouseGuard, attach the contextmenu listener to the Root element
        this.Root.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            // Try different logging methods
            Engine.Debug.trace("Right Click!"); // Method 1: Engine debug
            UI.Debug.log("Right Click!");       // Method 2: UI debug
            Debug.log("Right Click!");          // Method 3: Direct debug
            Debugging.log("Right Click!");      // Method 4: Debugging utility
        });
        
        // Add property to track last highlighted memento
        this.lastHighlightedMemento = null;

        // Add property for localStorage key
        this.STORAGE_KEY = 'memento-highlights';

        // Add method to load highlighted state
        this.loadHighlightedMementos();
    }

    // Add new method to load highlighted mementos
    loadHighlightedMementos() {
        try {
            const highlightedMementos = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
            // After mementos are created, apply highlights
            waitForLayout(() => {
                this.mementoEles.forEach(memento => {
                    const mementoId = memento.component?.mementoData?.mementoTypeId;
                    if (mementoId && highlightedMementos.includes(mementoId)) {
                        memento.classList.add('img-circle-right-clicked');
                    }
                });
            });
        } catch (e) {
            console.error('Failed to load highlighted mementos:', e);
        }
    }

    // Add new method to save highlighted mementos
    saveHighlightedMementos() {
        try {
            const highlightedMementos = this.mementoEles
                .filter(memento => memento.classList.contains('img-circle-right-clicked'))
                .map(memento => memento.component?.mementoData?.mementoTypeId)
                .filter(id => id); // Remove any undefined/null values
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(highlightedMementos));
        } catch (e) {
            console.error('Failed to save highlighted mementos:', e);
        }
    }

    onAttach() {
        super.onAttach();
        
        // Add engine event listener when panel attaches
        engine.on('RightClick', (message) => {
            engine.trigger('Error', message); // Use engine.trigger('Error') to log to the game's console
        });
        
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        this.Root.addEventListener("engine-input", this.engineInputListener);
        const leaderName = CreateGameModel.selectedLeader?.name ?? "";
        this.headerText.setAttribute("title", Locale.stylize("LOC_EDIT_MEMENTOS_TITLE", leaderName));
        const closeButton = document.createElement('fxs-close-button');
        closeButton.addEventListener('action-activate', () => {
            this.playSound('data-audio-activate', 'data-audio-activate-ref');
            this.close();
        });
        waitForLayout(() => {
            this.filterMementos();
            this.applySelections();
        });
        this.Root.appendChild(closeButton);
    }
    onDetach() {
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        this.Root.removeEventListener("engine-input", this.engineInputListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericCancel();
        NavTray.addOrUpdateShellAction1("LOC_EDIT_MEMENTOS_CONFIRM");
        this.handleSlotSelected(this.mementoSlotEles[0]);
        waitForLayout(() => FocusManager.setFocus(this.mementoEles[0]));
    }
    setPanelOptions(_panelOptions) {
        waitForLayout(() => {
            const slotIndex = _panelOptions.slotIndex;
            if (slotIndex > 0 && slotIndex < this.mementoSlotEles.length) {
                this.handleSlotSelected(this.mementoSlotEles[slotIndex]);
            }
        });
    }
    sortMementos() {
        // Debug: Log first memento to see available properties
        if (this.mementosData.length > 0) {
            console.log("Memento data structure:", this.mementosData[0]);
        }

        // Current sort by display type
        this.mementosData.sort((a, b) => {
            // First sort by display type (Unlocked > Locked > Hidden)
            const displayTypeSort = a.displayType - b.displayType;
            if (displayTypeSort !== 0) return displayTypeSort;

            // Then by name for equal display types
            return (a.mementoName || '').localeCompare(b.mementoName || '');
        });
    }
    applySelections() {
        for (const slot of this.mementoSlotEles) {
            const slotMemento = slot.component.slotData?.currentMemento.value;
            if (slotMemento) {
                const matchingMemento = this.mementoEles.find(e => e.component.mementoData?.mementoTypeId == slotMemento);
                if (matchingMemento) {
                    matchingMemento.component.selected = true;
                }
            }
        }
    }
    selectNextSlot() {
        this.selectSlotOffset(1);
    }
    selectPreviousSlot() {
        this.selectSlotOffset(-1);
    }
    selectSlotOffset(offset) {
        if (this.activeSlot) {
            const offsetIndex = this.mementoSlotEles.indexOf(this.activeSlot) + offset;
            if (offsetIndex >= 0 && offset <= this.mementoSlotEles.length - 1) {
                this.handleSlotSelected(this.mementoSlotEles[offsetIndex]);
            }
        }
    }
    handleSlotSelected(slot) {
        if (slot.component.slotData?.isLocked || slot == this.activeSlot) {
            return;
        }
        if (this.activeSlot) {
            this.activeSlot.component.selected = false;
        }
        this.activeSlot = slot;
        this.activeSlot.component.selected = true;
        this.filterMementos();
    }
    handleMementoSelected(memento) {
        // Add highlight to clicked memento
        if (this.lastHighlightedMemento) {
            this.lastHighlightedMemento.classList.remove('img-circle-right-clicked');
        }
        memento.classList.add('img-circle-right-clicked');
        this.lastHighlightedMemento = memento;

        if (memento.component.selected) {
            memento.component.selected = false;
            const mementoSlot = this.mementoSlotEles.find(s => s.component.slotData?.currentMemento.value == memento.component.mementoData?.mementoTypeId);
            mementoSlot?.component.setActiveMemento("NONE");
            // Continue selection if a different slot is selected
            if (mementoSlot?.component.selected) {
                return;
            }
        }
        const mementoData = memento.maybeComponent?.mementoData;
        const selectedSlot = this.activeSlot?.maybeComponent;
        if (mementoData && selectedSlot) {
            const oldMemento = this.mementoEles.find(m => m.component.mementoData?.mementoTypeId === selectedSlot.slotData?.currentMemento.value);
            if (selectedSlot.setActiveMemento(mementoData.mementoTypeId)) {
                if (oldMemento) {
                    oldMemento.component.selected = false;
                }
                memento.component.selected = true;
            }
            ;
        }
    }
    filterMementos() {
        const activeSlotData = this.activeSlot?.maybeComponent?.slotData;
        const availableMementos = new Set();
        
        if (activeSlotData) {
            for (const memento of activeSlotData.availableMementos) {
                if (memento.value) {
                    availableMementos.add(memento.value);
                }
            }
        }

        for (const memento of this.mementoEles) {
            const mementoComponent = memento.maybeComponent;
            const memData = mementoComponent?.mementoData;
            const isHidden = memData?.displayType == DisplayType.DISPLAY_HIDDEN;
            const isLocked = memData?.displayType == DisplayType.DISPLAY_LOCKED;

            // Search filtering
            let matchesSearch = true;
            if (this.searchQuery) {
                const searchableContent = [
                    Locale.stylize(memData?.mementoName || ''),
                    Locale.compose(memData?.functionalTextDesc || ''),
                    Locale.stylize(memData?.flavorTextDesc || ''),
                    Locale.stylize(memData?.unlockReason || '')
                ].join(' ').toLowerCase();
                
                matchesSearch = searchableContent.includes(this.searchQuery);
            }

            // Add unlock filter check
            const matchesUnlockFilter = !this.showOnlyUnlocked || !isLocked;

            mementoComponent?.setHidden(isHidden || !matchesSearch || !matchesUnlockFilter);
            mementoComponent?.setAvailable(
                memData?.displayType == DisplayType.DISPLAY_UNLOCKED && 
                availableMementos.has(memData?.mementoTypeId ?? "")
            );
        }
    }
    confirmSelections() {
        for (const slot of this.mementoSlotEles) {
            const gameParameter = slot.component.slotData.gameParameter;
            const selectedMemento = slot.component.slotData.currentMemento;
            GameSetup.setPlayerParameterValue(GameContext.localPlayerID, gameParameter, selectedMemento.value);
        }
        ContextManager.pop(this.Root.tagName);
    }
    cancelSelections() {
        ContextManager.pop(this.Root.tagName);
    }
    onNavigateInput(navigationEvent) {
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        const direction = navigationEvent.getDirection();
        if (direction == InputNavigationAction.PREVIOUS) {
            this.selectPreviousSlot();
            navigationEvent.preventDefault();
            navigationEvent.stopImmediatePropagation();
        }
        else if (direction == InputNavigationAction.NEXT && !CreateGameModel.nextActionStartsGame) {
            this.selectNextSlot();
            navigationEvent.preventDefault();
            navigationEvent.stopImmediatePropagation();
        }
    }
    onEngineInput(event) {
        if (event.detail.status != InputActionStatuses.FINISH) {
            return;
        }

        switch (event.detail.name) {
            case 'cancel':
            case 'keyboard-escape':
                this.cancelSelections();
                event.preventDefault();
                event.stopPropagation();
                break;
            case 'shell-action-1':
                this.confirmSelections();
                event.preventDefault();
                event.stopPropagation();
                break;
            case 'mousebutton-right':
                // Find the memento-item under cursor using mouse position
                const x = event.detail.x;
                const y = event.detail.y;
                const elementUnderCursor = document.elementFromPoint(x, y);
                const target = elementUnderCursor?.closest('memento-item');
                
                if (target) {
                    // Toggle highlight state
                    if (target.classList.contains('img-circle-right-clicked')) {
                        target.classList.remove('img-circle-right-clicked');
                    } else {
                        target.classList.add('img-circle-right-clicked');
                    }
                    this.lastHighlightedMemento = target;
                    this.saveHighlightedMementos(); // Save state after toggling highlight
                }
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    }
}
Controls.define('memento-editor', {
    createInstance: MementoEditor,
    description: 'Allows selection of mementos',
    styles: ['fs://game/core/ui/shell/create-panels/memento-editor.css']
});

//# sourceMappingURL=file:///core/ui/shell/create-panels/memento-editor.js.map
