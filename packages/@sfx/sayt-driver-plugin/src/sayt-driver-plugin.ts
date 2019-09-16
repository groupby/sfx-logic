import { Plugin, PluginRegistry, PluginMetadata } from '@sfx/core';
import {
  AUTOCOMPLETE_REQUEST,
  AUTOCOMPLETE_RESPONSE,
  AUTOCOMPLETE_ERROR,
  SAYT_PRODUCTS_REQUEST,
  SAYT_PRODUCTS_RESPONSE,
  SAYT_PRODUCTS_ERROR,
  AutocompleteRequestPayload,
  AutocompleteResultGroup,
  AutocompleteSearchTermItem,
  AutocompleteResponsePayload,
} from '@sfx/events';
import {
  AutocompleteResponse,
  AutocompleteSearchTerm,
  QueryTimeAutocompleteConfig,
} from '@sfx/sayt-plugin';
import { Results, Record, Request as SearchRequest } from '@sfx/search-plugin';

/**
 * Driver plugin that serves as the link between the Sayt data source
 * and the View layer. This plugin is responsible for listening to events,
 * sending search requests to internal data source APIs,
 * and then emitting the API response back in an event.
 */
export default class SaytDriverPlugin implements Plugin {
  get metadata(): PluginMetadata {
    return {
      name: 'sayt_driver',
      depends: [
        this.eventsPluginName,
        'sayt',
        'search',
      ],
    };
  }

  /**
   * Holds reference to the plugin registry that is received in registration.
   */
  core: PluginRegistry;

  /**
   * Name of the events plugin.
   */
  eventsPluginName: string = 'dom_events';

  /**
   * Provide default configuration for SAYT product searches.
   */
  defaultSearchConfig: Partial<SearchRequest> = {
    fields: ['*'],
  }

  constructor() {
    this.fetchAutocompleteTerms = this.fetchAutocompleteTerms.bind(this);
    this.fetchProductData = this.fetchProductData.bind(this);
    this.autocompleteCallback = this.autocompleteCallback.bind(this);
    this.searchCallback = this.searchCallback.bind(this);
  }

  /**
   * Sets the plugin registry to the plugin's internal 'core' property.
   * Callback method for when the plugin is registered in Core.
   *
   * @param plugins The plugin registry object from Core.
   */
  register(plugins: PluginRegistry) {
    this.core = plugins;
  }

  /**
   * Lifecycle event where the plugin can first safely interact with the registry.
   * The method will register an event listener for Sayt and product data requests.
   */
  ready() {
    this.core[this.eventsPluginName].registerListener(AUTOCOMPLETE_REQUEST, this.fetchAutocompleteTerms);
    this.core[this.eventsPluginName].registerListener(SAYT_PRODUCTS_REQUEST, this.fetchProductData);
  }

  /**
   * Lifecycle event where the plugin will unregister all event listeners.
   */
  unregister() {
    this.core[this.eventsPluginName].unregisterListener(AUTOCOMPLETE_REQUEST, this.fetchAutocompleteTerms);
    this.core[this.eventsPluginName].unregisterListener(SAYT_PRODUCTS_REQUEST, this.fetchProductData);
  }

  /**
   * Sends a request to the Sayt API for autocomplete terms and dispatches
   * events on success and failure.
   *
   * @param event Event that contains the Sayt API request payload.
   */
  fetchAutocompleteTerms(event: CustomEvent<AutocompleteRequestConfig>) {
    const { query, group, config } = event.detail;
    this.sendAutocompleteApiRequest(query, config)
      .then((results) => {
        this.core[this.eventsPluginName].dispatchEvent(AUTOCOMPLETE_RESPONSE, { results, group });
      })
      .catch((error) => {
        this.core[this.eventsPluginName].dispatchEvent(AUTOCOMPLETE_ERROR, { error, group });
      });
  }

  /**
   * Sends a request to the Search API for product data and dispatches
   * events on success and failure.
   *
   * @param event Event that contains the Search API request payload.
   */
  fetchProductData(event: CustomEvent<SearchRequestConfig>) {
    const { query, group, config } = event.detail;
    this.sendSearchApiRequest(query, config)
      .then(results => {
        this.core[this.eventsPluginName].dispatchEvent(SAYT_PRODUCTS_RESPONSE, { results, group });
      })
      .catch(error => {
        this.core[this.eventsPluginName].dispatchEvent(SAYT_PRODUCTS_ERROR, { error, group });
      });
  }

  /**
   * Sends a request to the SAYT API with the given query and config object.
   *
   * @param query The search term to send.
   * @param config Extra query-time configuration to customize the SAYT request.
   * @returns A promise from the Sayt API that has been reformatted
   * with the passed callback.
   */
  sendAutocompleteApiRequest(query: string, config: QueryTimeAutocompleteConfig): Promise<string[]> {
    return this.core.sayt.autocomplete(query, config).then(this.autocompleteCallback);
  }

  /**
   * Sends a request to the Search API with the given query and config object.
   *
   * @param query The search term to send.
   * @param config Extra query-time configuration to customize the Search request.
   * @returns A promise from the Search API that has been reformatted
   * with the passed callback.
   */
  sendSearchApiRequest(query: string, config: QueryTimeAutocompleteConfig): Promise<ProductsResponseSection> {
    return this.core.search.search({ ...this.defaultSearchConfig, query, ...config })
      .then(this.searchCallback);
  }

  /**
   * Extracts search terms from the given response.
   *
   * @param response An array of search term strings.
   * @returns An array of search term strings.
   */
  autocompleteCallback(response: AutocompleteResponse): AutocompleteResponseSection[] {
    const searchTerms = {
      title: '',
      items: response.result.searchTerms
        ? this.constructSearchTerms(response.result.searchTerms)
        : [],
    };
    return [searchTerms];
  }

  /**
   * Extracts query and products from the given response.
   *
   * @param response An object containing the original query and product records.
   * @returns An object containing the query and an array of valid simplified products.
   */
  searchCallback({ query, records }: Results): ProductsResponseSection {
    const mappedRecords = records.map(record => {
      let filter;
      try {
        filter = this.parseRecord(record);
      } catch(error) {
        return;
      }
      const { data, firstVariant, nonvisualVariants } = filter;

      return {
        title: data.title,
        price: nonvisualVariants[0].originalPrice,
        imageSrc: firstVariant.productImage,
        imageAlt: data.title,
        productUrl: firstVariant.productImage,
        // @TODO Handle variants
      }
    }).filter(Boolean);

    return {
      query,
      products: mappedRecords,
    };
  }

  /**
   * Parses a given product record for valid data. Throws an error if data is invalid.
   *
   * @param record An object containing the product record data.
   * @returns An object containing relevant product data.
   */
  parseRecord(record: Record): any {
    const data = record.allMeta;
    const firstVariant = data.visualVariants[0];
    const nonvisualVariants = firstVariant.nonvisualVariants;
    if (!nonvisualVariants[0]) throw new Error('No nonvisual variants');

    return {
      data,
      firstVariant,
      nonvisualVariants,
    };
  }

  /**
   * Formats a given list of search terms.
   *
   * @param terms An array of search terms.
   * @returns An array of search terms that have been formatted.
   */
  constructSearchTerms(terms: AutocompleteSearchTerm[]): SearchTermItem[] {
    return terms.filter((term) => term.value)
      .map((term) => {
        return { label: term.value };
    });
  }
}

/**
 * The base configuration accepted for making search or sayt requests.
 */
//\
export interface RequestConfig<T> {
  query: string;
  group?: string;
  config?: T;
}

/**
 * The type of the sayt autocomplete request event payload.
 */
export interface AutocompleteRequestConfig extends RequestConfig<QueryTimeAutocompleteConfig> {}

/**
 * The type of the sayt products request event payload.
 */
export interface SearchRequestConfig extends RequestConfig<SearchRequest> {}

/**
 * Data section of the event payload for an autocomplete response.
 * Ex. searchTerms
 */
export interface AutocompleteResponseSection {
  title: string;
  items: any[];
}

/**
 * Sayt autocomplete item.
 */
export interface SearchTermItem {
  label: string;
}

/**
 * Data section of the event payload for a products response.
 */
export interface ProductsResponseSection {
  query: string;
  products: any[];
}
