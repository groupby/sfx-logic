import { Plugin, PluginRegistry, PluginMetadata } from '@sfx/core';

export default class SaytDriverPlugin implements Plugin {
  get metadata(): PluginMetadata {
    return {
      name: 'sayt-driver-plugin',
      depends: ['events-browser-plugin', 'sayt-data-source-plugin']
    };
  }

  get saytDataEvent(): string {
    return 'fetch-sayt-data';
  }

  get saytProductsEvent(): string {
    return 'fetch-sayt-products';
  }

  core: PluginRegistry;

  constructor() {
    this.fetchSaytData = this.fetchSaytData.bind(this);
    this.fetchSaytProducts = this.fetchSaytProducts.bind(this);
  }

  register(plugins: PluginRegistry) {
    this.core = plugins;

    return {};
  }

  ready() {
    this.core['events-browser-plugin'].registerListener(this.saytDataEvent, this.fetchSaytData);
    this.core['events-browser-plugin'].registerListener(this.saytProductsEvent, this.fetchSaytProducts);
  }

  unregister() {
    this.core['events-browser-plugin'].unregisterListener(this.saytDataEvent, this.fetchSaytData);
    this.core['events-browser-plugin'].unregisterListener(this.saytProductsEvent, this.fetchSaytProducts);
  }

  async fetchSaytData(saytDataQuery: SaytDataPayload) {
    let response;
    try {
      response = await this.core['sayt-data-source-plugin'].autocomplete(saytDataQuery);
    } catch(e) {
      throw e;
    }

    this.core['events-browser-plugin'].dispatchEvent('sayt-data-response', response);
  }

  async fetchSaytProducts(query: SaytHoverQuery) {
    let response;
    try {
      response = await this.core['search-data-source-plugin'].fetchProducts(query);
    } catch(e) {
      throw e;
    }

    this.core['events-browser-plugin'].dispatchEvent('sayt-products-response', response);
  }
}

export interface SaytDataPayload {
  query: string;
  collection?: string;
  language?: string;
  filter?: string;
  searchItems?: number;
  navigationItems?: number;
  fuzzy?: boolean;
}

export interface SaytHoverQuery {
  query: string;
  refinements: Refinement[];
}

export interface Refinement {
  [key: string]: string;
}
