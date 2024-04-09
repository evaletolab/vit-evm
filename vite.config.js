import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig(({ mode }) => {
  const networkConfig = {
    development: {
      CONTRACT_ADDRESS: '"DEV_CONTRACT_ADDRESS"',
    },
    production: {
      CONTRACT_ADDRESS: '"PROD_CONTRACT_ADDRESS"',
    },
  };

  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'), // Point d'entrée de votre librairie
        name: 'kng2-web3', // Nom de votre librairie
        formats: ['es', 'umd'], // Génère les formats ES Module et UMD
        fileName: (format) => `kng2-web3.${format}.js`
      },
      rollupOptions: {
        // Assurez-vous que les dépendances externes ne sont pas regroupées dans votre bundle
        external: ['vue', 'react', 'angular'],
        output: {
          // Fournir des noms globaux pour les dépendances externes dans le bundle UMD
          globals: {
            vue: 'Vue',
            react: 'React',
            angular: 'angular',
          },
        },
      },
    },
    // Utilisation du plugin Vite pour générer les déclarations TypeScript
    plugins: [
      dts({
        // options du plugin
      }),
    ],
    // Configuration spécifique à l'environnement
    define: {
      'process.env': networkConfig[mode] // Utilise les configurations de réseau basées sur le mode
    }
  };
});
