# Automatisation du Projet myLectureSass

## Introduction

Ce document décrit la mise en place d'un système d'automatisation complet pour le projet myLectureSass, comprenant la configuration du gestionnaire de paquets, les tests automatisés, l'analyse de code et l'intégration continue. Bien que notre projet utilise JavaScript/TypeScript plutôt que Java, nous avons mis en place des équivalents fonctionnels pour chaque aspect mentionné dans les exigences.

## 1. Système de Build Automatisé

### Équivalent de Maven/Gradle pour JavaScript/TypeScript

Pour notre projet TypeScript, nous utilisons **npm** (Node Package Manager) comme système de gestion de dépendances et de build, complété par **Vite** comme outil de build performant.

#### Configuration du package.json

```json
{
  "name": "mylecturesass",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky install"
  },
  "dependencies": {
    // Liste des dépendances du projet
  },
  "devDependencies": {
    // Liste des dépendances de développement
  }
}
```

#### Configuration de Vite (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/setup.ts'],
    },
  }
});
```

### Automatisation des Tâches de Développement

Nous avons configuré plusieurs scripts npm pour automatiser les tâches courantes:

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile le TypeScript et construit l'application pour la production
- `npm run lint` - Exécute ESLint pour vérifier la qualité du code
- `npm run test` - Exécute les tests unitaires
- `npm run test:coverage` - Exécute les tests avec rapport de couverture

## 2. Tests Automatisés

### Tests Unitaires avec Vitest et Testing Library

Nous utilisons **Vitest** (comparable à Jest) pour les tests unitaires, avec **React Testing Library** pour tester les composants React.

#### Structure des Tests

```
src/
  components/
    PDFViewer.tsx
    PDFViewer.test.tsx
  hooks/
    useDocumentExtraction.ts
    useDocumentExtraction.test.ts
  utils/
    textProcessing.ts
    textProcessing.test.ts
```

#### Exemple de Test Unitaire pour un Composant React

```typescript
// src/components/PDFViewer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PDFViewer from './PDFViewer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock des dépendances
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { pdf_path: 'sample-path.pdf' }
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/sample.pdf' }
        })
      })
    }
  }
}));

describe('PDFViewer Component', () => {
  const queryClient = new QueryClient();
  
  it('displays loading state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PDFViewer lectureId="1" />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
  });
  
  it('renders PDF viewer after loading', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PDFViewer lectureId="1" />
      </QueryClientProvider>
    );
    
    // Attendre que le chargement soit terminé
    await waitFor(() => {
      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
    });
    
    // Vérifier que le conteneur du PDF est présent
    const pdfContainer = document.querySelector('[data-testid="pdf-container"]');
    expect(pdfContainer).toBeInTheDocument();
  });
  
  it('shows error message when PDF cannot be loaded', async () => {
    // Modifier le mock pour simuler une erreur
    vi.mocked(supabase.from).mockImplementationOnce(() => {
      throw new Error('PDF not found');
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <PDFViewer lectureId="999" />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load the PDF/i)).toBeInTheDocument();
    });
  });
});
```

#### Exemple de Test Unitaire pour les Fonctions Utilitaires

```typescript
// src/utils/textProcessing.test.ts
import { describe, it, expect } from 'vitest';
import { extractKeywords, sanitizeText, calculateReadingTime } from './textProcessing';

describe('Text Processing Utilities', () => {
  describe('extractKeywords', () => {
    it('extracts keywords from text correctly', () => {
      const text = 'Intelligence Artificielle est une technologie qui transforme l\'éducation moderne';
      const keywords = extractKeywords(text);
      
      expect(keywords).toContain('Intelligence Artificielle');
      expect(keywords).toContain('éducation');
      expect(keywords).toHaveLength(3); // Vérifie le nombre de mots-clés extraits
    });
    
    it('returns empty array for empty text', () => {
      expect(extractKeywords('')).toEqual([]);
    });
  });
  
  describe('sanitizeText', () => {
    it('removes special characters and normalizes spaces', () => {
      const dirtyText = 'Texte  avec   des\t\nespaces\r\net caractères spéciaux!@#$%';
      const cleanText = sanitizeText(dirtyText);
      
      expect(cleanText).toBe('Texte avec des espaces et caractères spéciaux');
    });
  });
  
  describe('calculateReadingTime', () => {
    it('calculates reading time based on word count', () => {
      const shortText = 'Un texte court de dix mots pour tester la fonction.';
      const longText = 'A'.repeat(2000); // Texte plus long
      
      expect(calculateReadingTime(shortText)).toBe(1); // 1 minute minimum
      expect(calculateReadingTime(longText)).toBeGreaterThan(1); // Plus de 1 minute
    });
  });
});
```

### Tests d'Intégration avec Cypress

Pour les tests d'intégration qui vérifient les interactions entre composants et les flux utilisateur, nous utilisons **Cypress**.

#### Configuration de Cypress (cypress.config.ts)

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

#### Exemple de Test d'Intégration

```typescript
// cypress/e2e/upload-and-generate.cy.ts
describe('PDF Upload and Content Generation', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.login('testuser@example.com', 'password123');
  });

  it('should upload PDF and generate summary', () => {
    // Visiter la page d'upload
    cy.visit('/dashboard');
    cy.get('[data-testid="upload-button"]').click();
    
    // Simuler l'upload d'un fichier
    cy.get('input[type=file]').selectFile('cypress/fixtures/sample.pdf', { force: true });
    cy.get('[data-testid="upload-submit"]').click();
    
    // Vérifier le succès de l'upload
    cy.get('[data-testid="upload-success"]').should('be.visible');
    
    // Naviguer vers la page de génération de résumé
    cy.get('[data-testid="generate-summary"]').click();
    
    // Vérifier que le processus de génération démarre
    cy.get('[data-testid="generating-indicator"]').should('be.visible');
    
    // Attendre que le résumé soit généré (peut prendre du temps)
    cy.get('[data-testid="summary-content"]', { timeout: 30000 }).should('be.visible');
    
    // Vérifier que le contenu du résumé n'est pas vide
    cy.get('[data-testid="summary-content"]').invoke('text').should('have.length.gt', 50);
  });
});
```

## 3. Couverture des Tests

### Configuration de la Couverture de Tests avec Vitest et Istanbul

Nous utilisons **Istanbul** intégré à Vitest pour générer des rapports de couverture de tests, l'équivalent de JaCoCo en Java.

#### Script de Couverture

```bash
npm run test:coverage
```

#### Configuration dans le package.json

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  },
  "vitest": {
    "coverage": {
      "reporter": ["text", "json", "html", "lcov"],
      "exclude": ["node_modules/", "dist/", "**/*.d.ts", "**/*.test.ts", "**/*.test.tsx"]
    }
  }
}
```

### Intégration avec SonarQube

Nous avons également configuré SonarQube pour analyser la qualité du code et la couverture des tests.

#### Configuration SonarQube (sonar-project.properties)

```properties
sonar.projectKey=myLectureSass
sonar.projectName=myLectureSass
sonar.projectVersion=1.0.0

sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx
sonar.exclusions=**/node_modules/**,**/*.test.ts,**/*.test.tsx,**/dist/**

sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json

sonar.sourceEncoding=UTF-8
```

## 4. Intégration Continue (CI/CD)

### Configuration GitHub Actions

Nous avons mis en place GitHub Actions pour automatiser l'exécution des tests après chaque commit, équivalent à Jenkins pour Java. Voici notre configuration:

#### Workflow GitHub Actions (.github/workflows/ci.yml)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint code
      run: npm run lint
    
    - name: Run tests with coverage
      run: npm run test:coverage
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
        directory: ./coverage/
        flags: unittests
    
    - name: SonarQube Scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: dist/

  deploy-preview:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-files
        path: dist/
    
    - name: Deploy to Preview Environment
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: mylecturesass-dev
        channelId: preview
        
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-files
        path: dist/
    
    - name: Deploy to Production
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: mylecturesass
        channelId: live
```

### Hooks Git Pre-commit avec Husky

Pour assurer la qualité du code avant même le commit, nous avons configuré Husky pour exécuter des hooks Git:

#### Configuration Husky

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

#### Configuration lint-staged dans package.json

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ],
    "*.{js,json,md}": [
      "prettier --write"
    ]
  }
}
```

## 5. Mise en Place Pas à Pas

Pour implémenter ce système d'automatisation dans votre projet, suivez ces étapes:

1. **Installer les dépendances nécessaires**:
   ```bash
   npm install --save-dev vitest @vitest/coverage-c8 @testing-library/react @testing-library/jest-dom cypress eslint prettier husky lint-staged
   ```

2. **Configurer les scripts dans package.json** comme décrit ci-dessus.

3. **Créer les fichiers de configuration**:
   - `vite.config.ts`
   - `cypress.config.ts`
   - `sonar-project.properties`

4. **Configurer GitHub Actions**:
   - Créer le dossier `.github/workflows/`
   - Ajouter le fichier `ci.yml` avec la configuration décrite plus haut

5. **Configurer Husky pour les hooks Git**:
   ```bash
   npx husky install
   npx husky add .husky/pre-commit "npx lint-staged"
   ```

6. **Ajouter les secrets nécessaires** dans les paramètres du repository GitHub:
   - `CODECOV_TOKEN`
   - `SONAR_TOKEN`
   - `FIREBASE_SERVICE_ACCOUNT` (si vous utilisez Firebase pour le déploiement)

7. **Commencer à écrire des tests** dans les dossiers correspondants suivant la structure recommandée.

## Conclusion

Cette configuration d'automatisation complète garantit:

1. Un processus de build standardisé et reproductible
2. L'exécution automatique des tests à chaque modification
3. L'analyse de la qualité du code et de la couverture des tests
4. Un pipeline CI/CD complet qui vérifie, teste, construit et déploie l'application

Bien que notre technologie soit différente de Java, nous avons mis en place des équivalents pour chaque exigence, offrant ainsi le même niveau de robustesse et d'automatisation que ce qui aurait été attendu avec Maven/Gradle, JUnit, JaCoCo et Jenkins. 