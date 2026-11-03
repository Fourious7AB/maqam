// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/* @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MaqamTravels Developer Portal',
  tagline: 'Enterprise Travel Booking System Architecture & Reference Guides',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.maqamtravels.com',
  baseUrl: '/',

  organizationName: 'maqamtravels',
  projectName: 'travel-platform-docs',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/', // Serve docs at the site root instead of /docs/
        },
        blog: false, // Disable blog for clean developer documentation
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'MaqamTravels DevDocs',
        logo: {
          alt: 'MaqamTravels Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Guides',
          },
          {
            href: 'http://localhost:5000/api/docs',
            label: 'API Reference (Swagger)',
            position: 'left',
          },
          {
            href: 'https://github.com/maqamtravels/travel-platform-server',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Introduction',
                to: '/',
              },
              {
                label: 'Getting Started',
                to: '/getting-started',
              },
            ],
          },
          {
            title: 'Platform Gateways',
            items: [
              {
                label: 'API Server',
                href: 'http://localhost:5000/health',
              },
              {
                label: 'Interactive Swagger UI',
                href: 'http://localhost:5000/api/docs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} MaqamTravels, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
