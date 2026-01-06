{
  "site": {
    "name": "KrySearch",
    "description": "Privacy-first search router for open and privacy-focused engines",
    "url": "https://krysearch.io",
    "logo": "assets/logo.png",
    "theme": "dark",
    "language": "en-US"
  },
  "search": {
    "defaultEngine": "startpage",
    "maxResults": 50,
    "safeSearch": true,
    "autocomplete": true,
    "highlightTerms": true
  },
  "engines": {
    "open_source": {
      "searxng": {
        "name": "SearXNG",
        "description": "Open-source metasearch engine aggregating results privately",
        "url": "https://searx.space/?q={query}",
        "requiresAPI": false
      },
      "yacy": {
        "name": "YaCy",
        "description": "Decentralized, peer-to-peer search engine",
        "url": "http://search.yacy.net/Search?query={query}",
        "requiresAPI": false
      },
      "mojeek": {
        "name": "Mojeek",
        "description": "Independent crawler and index, no tracking",
        "url": "https://www.mojeek.com/search?q={query}",
        "requiresAPI": false
      },
      "metager": {
        "name": "MetaGer",
        "description": "Open-source privacy-oriented metasearch from Germany",
        "url": "https://metager.org/search?q={query}",
        "requiresAPI": false
      }
    },
    "closed_source": {
      "duckduckgo": {
        "name": "DuckDuckGo",
        "description": "Privacy-focused search engine",
        "url": "https://duckduckgo.com/?q={query}",
        "requiresAPI": false
      },
      "startpage": {
        "name": "Startpage",
        "description": "Google results without tracking",
        "url": "https://www.startpage.com/sp/search?q={query}",
        "requiresAPI": false
      },
      "swisscows": {
        "name": "Swisscows",
        "description": "Family-friendly privacy-first search",
        "url": "https://swisscows.com/web?query={query}",
        "requiresAPI": false
      },
      "brave": {
        "name": "Brave Search",
        "description": "Independent privacy-focused search by Brave",
        "url": "https://search.brave.com/search?q={query}",
        "requiresAPI": false
      },
      "presearch": {
        "name": "Presearch",
        "description": "Decentralized privacy search engine",
        "url": "https://presearch.com/search?q={query}",
        "requiresAPI": false
      }
    }
  },
  "appearance": {
    "font": "Inter, sans-serif",
    "colors": {
      "primary": "#4b8df8",
      "secondary": "#1f1f1f",
      "accent": "#f8c848"
    },
    "customCSS": "UI/styles.css",
    "enableDarkModeSwitch": true
  }
}
