/**
 * SEO Manager Module
 * 
 * Handles dynamic updates of document title, meta tags, Open Graph tags,
 * and JSON-LD structured data for improved SEO in a SPA environment.
 */

export class SeoManager {
    constructor() {
        this.defaultTitle = 'CodeEngage - Share Code. Ignite Innovation.';
        this.defaultDescription = 'The enterprise-grade platform for developers to share snippets, discover solutions, and collaborate in real-time.';
        this.defaultImage = '/assets/images/og-default.png'; // Ensure this exists or use a placeholder
        this.siteName = 'CodeEngage';
        this.baseUrl = window.location.origin;
    }

    /**
     * Update SEO tags for the current page
     * @param {Object} config - SEO configuration object
     */
    update(config = {}) {
        this.updateTitle(config.title);
        this.updateMetaTags(config);
        this.updateOpenGraph(config);
        this.updateTwitterCard(config);
        this.updateCanonical(config.url);

        if (config.structuredData) {
            this.setStructuredData(config.structuredData);
        } else {
            this.clearStructuredData();
        }
    }

    updateTitle(title) {
        document.title = title ? `${title} | ${this.siteName}` : this.defaultTitle;
    }

    updateMetaTags({ description, keywords, author }) {
        this.setMetaTag('name', 'description', description || this.defaultDescription);
        this.setMetaTag('name', 'keywords', keywords || 'code, snippets, developer, collaboration, programming');
        this.setMetaTag('name', 'author', author || 'CodeEngage');
    }

    updateOpenGraph({ title, description, image, url, type }) {
        this.setMetaTag('property', 'og:site_name', this.siteName);
        this.setMetaTag('property', 'og:title', title || this.defaultTitle);
        this.setMetaTag('property', 'og:description', description || this.defaultDescription);
        this.setMetaTag('property', 'og:image', image ? this.resolveUrl(image) : this.resolveUrl(this.defaultImage));
        this.setMetaTag('property', 'og:url', url ? this.resolveUrl(url) : window.location.href);
        this.setMetaTag('property', 'og:type', type || 'website');
    }

    updateTwitterCard({ title, description, image }) {
        this.setMetaTag('name', 'twitter:card', 'summary_large_image');
        this.setMetaTag('name', 'twitter:title', title || this.defaultTitle);
        this.setMetaTag('name', 'twitter:description', description || this.defaultDescription);
        this.setMetaTag('name', 'twitter:image', image ? this.resolveUrl(image) : this.resolveUrl(this.defaultImage));
    }

    updateCanonical(url) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = url ? this.resolveUrl(url) : window.location.href;
    }

    /**
     * Inject JSON-LD Structured Data
     * @param {Object} data - Schema.org data object
     */
    setStructuredData(data) {
        this.clearStructuredData();

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'seo-structured-data';
        script.text = JSON.stringify(data);
        document.head.appendChild(script);
    }

    clearStructuredData() {
        const existing = document.getElementById('seo-structured-data');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Helper to set or create a meta tag
     */
    setMetaTag(attrName, attrValue, content) {
        let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attrName, attrValue);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    }

    resolveUrl(path) {
        if (path.startsWith('http')) return path;
        return `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    }
}

export default new SeoManager();
