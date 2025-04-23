# Conception (Sprint)

## Introduction
Ce document présente la conception détaillée pour une user story sélectionnée dans un sprint du projet myLectureSass. Nous allons nous concentrer sur la fonctionnalité de "Génération de Quiz Interactifs" qui permet aux utilisateurs de créer automatiquement des questionnaires basés sur le contenu de leurs documents PDF.

## Cas d'Utilisation: Génération de Quiz Interactifs

### Nom
Génération et utilisation de quiz interactifs basés sur le contenu d'un document PDF.

### Acteur Principal
Utilisateur étudiant ou enseignant.

### Préconditions
- L'utilisateur est authentifié sur la plateforme.
- L'utilisateur a téléchargé au moins un document PDF.
- Le texte du PDF a été extrait et traité par le système.

### Post-conditions
- Un quiz interactif est généré et sauvegardé dans le compte de l'utilisateur.
- L'utilisateur peut accéder, modifier et partager le quiz.
- Les statistiques de performance sur le quiz sont enregistrées.

### Description du Scénario Nominal
1. L'utilisateur accède à la section "Quiz" depuis son tableau de bord.
2. L'utilisateur sélectionne un document PDF déjà téléchargé dans sa bibliothèque.
3. L'utilisateur configure les paramètres du quiz (nombre de questions, type de questions, niveau de difficulté).
4. L'utilisateur clique sur "Générer le Quiz".
5. Le système traite la demande et analyse le contenu du document.
6. Le système utilise l'IA pour générer des questions pertinentes basées sur le contenu.
7. Le système présente un aperçu du quiz généré à l'utilisateur.
8. L'utilisateur révise le quiz et apporte des modifications si nécessaire.
9. L'utilisateur sauvegarde le quiz dans sa bibliothèque.
10. L'utilisateur peut commencer à répondre au quiz ou le partager avec d'autres utilisateurs.

### Description du Scénario Alternatif
1. À l'étape 7, si l'utilisateur n'est pas satisfait des questions générées:
   - L'utilisateur peut cliquer sur "Régénérer" pour obtenir un nouveau jeu de questions.
   - L'utilisateur peut ajuster les paramètres du quiz pour mieux cibler le contenu.
   - L'utilisateur peut éditer manuellement chaque question ou réponse.

2. À l'étape 3, si l'utilisateur souhaite un quiz sur une section spécifique du document:
   - L'utilisateur peut sélectionner des pages ou des sections spécifiques du document.
   - Le système génère des questions uniquement à partir du contenu sélectionné.

### Description du Scénario d'Exception
1. À l'étape 5-6, si le système ne parvient pas à générer un quiz en raison de la complexité ou de l'insuffisance du contenu:
   - Le système affiche un message d'erreur explicatif.
   - Le système propose des solutions alternatives (sélectionner un document plus complet, ajuster les paramètres, etc.).
   - L'utilisateur est redirigé vers la page de configuration pour modifier ses choix.

2. À l'étape 4, si la connexion internet est interrompue pendant la génération:
   - Le système sauvegarde l'état de la demande.
   - Une notification est envoyée à l'utilisateur lorsque la connexion est rétablie.
   - L'utilisateur peut reprendre le processus de génération.

## Conception des IHM (Prototypes)

### Écran 1: Sélection du Document et Configuration du Quiz
![Sélection du Document et Configuration]

**Description de l'interface:**
- En-tête avec le logo myLectureSass et navigation principale
- Barre latérale avec les différentes fonctionnalités (Résumés, Quiz, Flashcards, etc.)
- Section centrale avec:
  - Liste des documents PDF de l'utilisateur avec vignettes
  - Formulaire de configuration du quiz:
    - Sélecteur de nombre de questions (5-50)
    - Types de questions (QCM, Vrai/Faux, Réponse courte)
    - Niveau de difficulté (Facile, Moyen, Difficile)
    - Option pour cibler des pages spécifiques
    - Bouton "Générer le Quiz" (bleu, en évidence)

### Écran 2: Aperçu et Édition du Quiz Généré
![Aperçu et Édition]

**Description de l'interface:**
- En-tête avec le titre du document et du quiz
- Panneau latéral avec la liste des questions numérotées
- Section principale affichant:
  - La question actuelle
  - Les options de réponse
  - Interface d'édition pour modifier la question et les réponses
  - Indicateur de réponse correcte
  - Boutons pour ajouter/supprimer des questions
- Barre inférieure avec:
  - Bouton "Sauvegarder"
  - Bouton "Tester le Quiz"
  - Option "Partager"

### Écran 3: Mode Quiz Interactif
![Quiz Interactif]

**Description de l'interface:**
- En-tête avec progression (ex: Question 3/15)
- Timer optionnel en haut à droite
- Affichage de la question en grand format
- Options de réponse clairement différenciées
- Boutons de navigation (Précédent, Suivant)
- Barre de progression en bas
- Option pour mettre en pause ou terminer le quiz

### Écran 4: Résultats et Analyse
![Résultats et Analyse]

**Description de l'interface:**
- Score global mis en évidence (ex: 85%)
- Répartition des réponses (correctes, incorrectes, sautées)
- Liste des questions avec indications visuelles des réponses correctes/incorrectes
- Explication des réponses incorrectes avec référence au contenu du document
- Graphique montrant les domaines de connaissance maîtrisés/à améliorer
- Options pour:
  - Refaire le quiz
  - Réviser les questions manquées
  - Partager les résultats
  - Exporter le quiz

## Diagrammes

### Diagramme de Séquence: Génération de Quiz

```
Utilisateur                   Interface                   Service Quiz                 Service IA                  Base de Données
    |                             |                             |                            |                             |
    |--Sélectionne document------>|                             |                            |                             |
    |--Configure quiz------------>|                             |                            |                             |
    |--Demande génération-------->|                             |                            |                             |
    |                             |--Requête génération--------->|                            |                             |
    |                             |                             |--Récupère contenu PDF----->|                             |
    |                             |                             |<-------Renvoie contenu-----|                             |
    |                             |                             |--Demande génération quiz-->|                             |
    |                             |                             |                            |--Analyse le contenu-------->|
    |                             |                             |                            |--Génère les questions------>|
    |                             |                             |<-----Retourne questions----|                             |
    |                             |<------Retourne questions----|                             |                             |
    |<-----Affiche aperçu---------|                             |                             |                             |
    |--Modifie si nécessaire----->|                             |                             |                             |
    |--Sauvegarde le quiz-------->|                             |                             |                             |
    |                             |--Demande sauvegarde-------->|                             |                             |
    |                             |                             |--Enregistre quiz----------->|                             |
    |                             |                             |<------Confirmation----------|                             |
    |<-----Confirmation-----------|                             |                             |                             |
```

### Diagramme de Classes

```
+------------------------+       +-------------------------+       +----------------------+
|       Document         |       |          Quiz           |       |       Question       |
+------------------------+       +-------------------------+       +----------------------+
| - id: string           |       | - id: string            |       | - id: string         |
| - userId: string       |       | - documentId: string    |       | - quizId: string     |
| - title: string        |       | - title: string         |       | - content: string    |
| - filePath: string     |       | - description: string   |       | - type: QuestionType |
| - extractedText: string|       | - difficulty: string    |       | - options: string[]  |
| - createdAt: Date      |<----->| - questionCount: number |<----->| - correctAnswer: any |
| - updatedAt: Date      |       | - createdAt: Date       |       | - explanation: string|
+------------------------+       | - updatedAt: Date       |       | - points: number     |
                                 +-------------------------+       +----------------------+
                                                  ^
                                                  |
                         +------------------------+-------------------------+
                         |                                                  |
               +-----------------+                                +-------------------+
               |   QuizAttempt   |                                |  QuizSetting      |
               +-----------------+                                +-------------------+
               | - id: string    |                                | - id: string      |
               | - userId: string|                                | - quizId: string  |
               | - quizId: string|                                | - timeLimit: number|
               | - score: number |                                | - shuffleQuestions|
               | - startedAt    |                                | - showExplanations|
               | - completedAt  |                                | - passScore: number|
               | - answers: any[]|                                +-------------------+
               +-----------------+
```

## Discussion de la Conception et Corrections

### Points Forts
1. **Flexibilité de la génération**: Le système permet une personnalisation du quiz selon différents paramètres (nombre de questions, difficulté, type).
2. **Possibilité d'édition**: L'utilisateur peut modifier les questions générées automatiquement pour plus de pertinence.
3. **Analyse des résultats**: L'interface de résultats offre une vision détaillée des performances et des domaines à améliorer.

### Points à Améliorer
1. **Performance de génération**: Pour les documents volumineux, le temps de génération pourrait être optimisé.
   - Solution: Implémenter un système de génération asynchrone avec notification.

2. **Qualité des questions**: La pertinence des questions générées dépend fortement de la qualité de l'extraction du texte.
   - Solution: Ajouter une phase de pré-traitement optimisée pour identifier les concepts clés.

3. **Accessibilité**: L'interface actuelle pourrait être améliorée pour les utilisateurs malvoyants.
   - Solution: Ajouter des attributs ARIA et assurer la compatibilité avec les lecteurs d'écran.

### Modifications Apportées Suite aux Discussions
1. Ajout d'une option pour enregistrer des modèles de quiz réutilisables.
2. Intégration d'un système de tags pour catégoriser les questions et faciliter la révision ciblée.
3. Amélioration du système de feedback pour les réponses incorrectes avec des explications plus détaillées.
4. Intégration d'un mode collaboratif permettant à plusieurs utilisateurs de créer un quiz ensemble.

## Conclusion
La conception du module de génération de quiz interactifs répond aux besoins des utilisateurs en offrant une expérience personnalisée et enrichissante. Les interfaces proposées sont intuitives et l'architecture technique est évolutive. Les discussions d'équipe ont permis d'améliorer la conception initiale, notamment en renforçant les aspects collaboratifs et l'accessibilité.

Cette fonctionnalité s'intègre parfaitement dans l'écosystème myLectureSass et contribue à l'objectif global de transformer les documents passifs en expériences d'apprentissage actives et efficaces. 