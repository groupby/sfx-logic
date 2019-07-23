import { Plugin, PluginRegistry, PluginMetadata } from '@sfx/core';
import { Request } from '@sfx/search-plugin';
import { SEARCH_REQUEST_EVENT, SEARCH_RESPONSE_EVENT } from './events';
// import { Sayt, SaytConfig } from 'sayt';

/**
 * This plugin is responsible for exposing events that allow
 * for interacting with GroupBy's Search API.
 */
export default class SearchDriverPlugin implements Plugin {
  get metadata(): PluginMetadata {
    return {
      name: 'search_driver',
      depends: ['dom_events', 'search'],
    };
  }

  /**
   * A reference to the registry of plugins for later use.
   */
  core: PluginRegistry;

  /**
   * Name of the events plugin.
   */
  eventsPluginName: string = 'dom_events';

  /**
   * Event name to listen for Search requests.
   */
  searchDataEvent: string = 'sfx::search_fetch_data';

  /**
   * This method needs to exist for compatibility with Core.
   */
  constructor() {
    this.fetchSearchData = this.fetchSearchData.bind(this);
  }

  /**
   * Accepts the exposed values of all plugins and saves them for later.
   */
  register(plugins: PluginRegistry): void {
    this.core = plugins;
  }

  /**
   * 
   */
  ready() {
    // @TODO Attach listeners for events
    this.core[this.eventsPluginName].registerListener(SEARCH_REQUEST_EVENT, this.fetchSearchData);
  }

  /**
   * @TODO Remove event listeners
   */
  unregister(): void {
    this.core[this.eventsPluginName].unregisterListener(SEARCH_REQUEST_EVENT, this.fetchSearchData);
  }

  /**
   * @TODO Ensure `event` is of the correct interface.
   */
  fetchSearchData(event: CustomEvent<SearchRequestPayload>): void {
    const searchTerm = event.detail.searchTerm;
    this.core.search.search(searchTerm)
      .then((results) => {
        this.core[this.eventsPluginName].dispatchEvent(SEARCH_RESPONSE_EVENT, results);
      })
    //  .catch((e) => {
    //    this.core[this.eventsPluginName].dispatchEvent(this.searchErrorEvent, e);
    //  });

    // @TODO Get search term from data
    // @TODO Ask search API for results
    // @TODO Transform data on promise fulfillment (or by passing callback)
    // @TODO Emit event with final data
  }
}

export interface SearchRequestPayload {
  searchTerm: string;
}
