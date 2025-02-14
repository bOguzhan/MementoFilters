export class MementoFavorites {
    static FAVORITES_FILE = 'memento_favorites.json';
    static favorites = new Set();

    static initialize() {
        try {
            const data = localStorage.getItem(this.FAVORITES_FILE);
            if (data) {
                this.favorites = new Set(JSON.parse(data));
            }
        } catch (e) {
            console.error('Failed to load favorites:', e);
        }
    }

    static saveFavorites() {
        try {
            localStorage.setItem(
                this.FAVORITES_FILE, 
                JSON.stringify(Array.from(this.favorites))
            );
        } catch (e) {
            console.error('Failed to save favorites:', e);
        }
    }

    static saveFavorite(mementoId, isFavorite) {
        if (isFavorite) {
            this.favorites.add(mementoId);
        } else {
            this.favorites.delete(mementoId);
        }
        this.saveFavorites();
    }

    static isFavorite(mementoId) {
        return this.favorites.has(mementoId);
    }
}

// Initialize favorites on module load
MementoFavorites.initialize();

// Add to the filter container creation:
// Add favorites filter checkbox
const favoritesFilter = document.createElement('fxs-checkbox');
favoritesFilter.classList.add('font-body-base', 'ml-4');
favoritesFilter.setAttribute('data-audio-group-ref', 'memento-filter');
favoritesFilter.setAttribute('tabindex', '-1');

const favoritesLabel = document.createElement('span');
favoritesLabel.classList.add('font-body-base', 'text-white', 'ml-2');
favoritesLabel.textContent = 'Favorites Only';

favoritesFilter.addEventListener('component-value-changed', (event) => {
    this.showOnlyFavorites = event.detail.value;
    this.filterMementos();
});

filterContainer.appendChild(favoritesFilter);
filterContainer.appendChild(favoritesLabel);