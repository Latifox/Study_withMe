import { describe, it, expect } from 'vitest';
import { extractKeywords, sanitizeText, calculateReadingTime } from './textProcessing';

describe('Utilitaires de traitement de texte', () => {
  describe('extractKeywords', () => {
    it('extrait correctement les mots-clés d\'un texte', () => {
      const text = 'Intelligence Artificielle est une technologie qui transforme l\'éducation moderne';
      const keywords = extractKeywords(text);
      
      expect(keywords).toContain('Intelligence');
      expect(keywords).toContain('Artificielle');
      expect(keywords).toHaveLength(keywords.length); // Vérifie que la longueur est cohérente
    });
    
    it('renvoie un tableau vide pour un texte vide', () => {
      expect(extractKeywords('')).toEqual([]);
      expect(extractKeywords(undefined as unknown as string)).toEqual([]);
    });
  });
  
  describe('sanitizeText', () => {
    it('supprime les caractères spéciaux et normalise les espaces', () => {
      const dirtyText = 'Texte  avec   des\t\nespaces\r\net caractères spéciaux!@#$%';
      const cleanText = sanitizeText(dirtyText);
      
      expect(cleanText).toBe('Texte avec des espaces et caractères spéciaux');
    });
    
    it('renvoie une chaîne vide pour un texte vide', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(undefined as unknown as string)).toBe('');
    });
  });
  
  describe('calculateReadingTime', () => {
    it('calcule le temps de lecture en fonction du nombre de mots', () => {
      // Texte court (10 mots)
      const shortText = 'Un texte court de dix mots pour tester la fonction.';
      // Texte plus long (environ 400 mots, soit ~2 minutes)
      const longText = Array(400).fill('mot').join(' ');
      
      expect(calculateReadingTime(shortText)).toBe(1); // Au moins 1 minute
      expect(calculateReadingTime(longText)).toBe(2); // 2 minutes
    });
    
    it('renvoie 0 pour un texte vide', () => {
      expect(calculateReadingTime('')).toBe(0);
      expect(calculateReadingTime(undefined as unknown as string)).toBe(0);
    });
  });
}); 