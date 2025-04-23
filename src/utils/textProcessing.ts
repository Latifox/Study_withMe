/**
 * Extrait les mots-clés d'un texte donné
 * @param text Le texte à analyser
 * @returns Un tableau de mots-clés
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Cette implémentation est simplifiée pour l'exemple
  // Une vraie implémentation utiliserait des algorithmes plus sophistiqués
  const words = text.split(/\s+/);
  const longWords = words.filter(word => word.length > 5);
  const uniqueWords = [...new Set(longWords)];
  
  return uniqueWords.slice(0, 5); // Retourne les 5 premiers mots-clés
}

/**
 * Nettoie un texte en supprimant les caractères spéciaux et en normalisant les espaces
 * @param text Le texte à nettoyer
 * @returns Le texte nettoyé
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Supprime les caractères spéciaux et normalise les espaces
  return text
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ') // Garde les lettres, chiffres, espaces et accents
    .replace(/\s+/g, ' ')                  // Normalise les espaces
    .trim();
}

/**
 * Calcule le temps de lecture estimé en minutes
 * @param text Le texte à analyser
 * @returns Le temps de lecture estimé en minutes
 */
export function calculateReadingTime(text: string): number {
  if (!text) return 0;
  
  // On considère qu'une personne lit en moyenne 200 mots par minute
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  
  // Renvoie au moins 1 minute
  return Math.max(1, minutes);
} 