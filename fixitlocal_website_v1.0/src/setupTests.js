// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

class MockMap {
	constructor() {
		this.zoom = 11;
		this.sources = {};
		this.projection = 'mercator';
	}

	on(eventName, callback) {
		if ((eventName === 'load' || eventName === 'style.load') && callback) {
			callback();
		}
		return this;
	}

	addSource(id, source) {
		this.sources[id] = source;
	}

	getSource(id) {
		return this.sources[id];
	}

	addLayer() {}

	addControl() {}

	getLayer() {
		return true;
	}

	setLayoutProperty() {}

	remove() {}

	setStyle() {}

	setProjection({ type }) {
		this.projection = type;
	}

	easeTo({ zoom }) {
		if (typeof zoom === 'number') {
			this.zoom = zoom;
		}
	}

	getZoom() {
		return this.zoom;
	}

	flyTo() {}
}

jest.mock('maplibre-gl', () => ({
	__esModule: true,
	default: {
		Map: MockMap,
		NavigationControl: jest.fn(),
	},
}));
